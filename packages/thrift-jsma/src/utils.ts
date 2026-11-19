import { type Comment, type EnumDefinition, type StructDefinition, SyntaxType } from '@creditkarma/thrift-parser'
import { type NumericOptions, type TSchema, Type } from '@sinclair/typebox'

import { FlagTypes, type MapPositionType, NumericalKeywordMap } from './constants.js'
import { getGroupsWithReg, SplitSchemaColonReg, SplitSchemaDotReg } from './reg.js'
import type { BasicDslToObjType, BasicTypeBox, MapTypeBasicDslToObjType, ParsedDslValueType } from './types.js'

export const getBasicTypeBoxWithSyntaxType = (syntaxType: SyntaxType): BasicTypeBox => {
	switch (syntaxType) {
		case SyntaxType.I8Keyword:
		case SyntaxType.I16Keyword:
		case SyntaxType.I32Keyword:
		case SyntaxType.I64Keyword:
			return Type.Integer.bind(Type)
		case SyntaxType.DoubleKeyword:
			return Type.Number.bind(Type)
		case SyntaxType.StringKeyword:
			return Type.String.bind(Type)
		case SyntaxType.BoolKeyword:
			return Type.Boolean.bind(Type)
		default:
			return Type.Any.bind(Type)
	}
}

export const getTypeBoxOptionWithNumericalKeyword = (numericalKeyword: SyntaxType) => {
	const options: Partial<Record<SyntaxType, NumericOptions>> = NumericalKeywordMap
	return options[numericalKeyword] ?? {}
}

export const isOneOfSyntaxType = (type: string | undefined) => {
	if (!type) return true
	return Object.keys(SyntaxType).indexOf(type) !== -1
}

export const setOptional = (typeBox: TSchema, requireness: string | null) => {
	if (requireness === 'optional') return Type.Optional(typeBox)
	return typeBox
}

const IdPrefix = '#'
export function setIdPrefix(id: string) {
	return `${IdPrefix}${id}`
}

const DslPrefix = '@'
const DslFlagPrefix = `${DslPrefix}flag`
const DslSchemaPrefix = `${DslPrefix}schema`

export function getFlagComment(str: string) {
	return `${DslFlagPrefix} ${str}`
}

export function isSchemaComment(comment: string) {
	return comment.includes(DslSchemaPrefix)
}

export function isFlagComment(comment: string) {
	return comment.includes(DslFlagPrefix)
}

export function getSchemaContents(comments: Comment[]) {
	return comments
		.filter((item) => isSchemaComment(item.value as string))
		.map((item) => (item.value as string).replace(DslSchemaPrefix, '').trim())
}

export function isHeaderOfFlag(comments: Comment[]) {
	return comments.some((item) => item.value.indexOf(getFlagComment(FlagTypes.header)) !== -1)
}

export function once() {
	let isRan = false
	return () => {
		if (!isRan) {
			isRan = true
			return true
		}
		return false
	}
}

export function isMapType(syntaxType: SyntaxType) {
	return syntaxType === SyntaxType.MapType
}

function safeParseValueDslValue(value: string) {
	let evalRes: ParsedDslValueType
	try {
		// biome-ignore lint/security/noGlobalEval: Trusted @schema input supports JavaScript expressions.
		evalRes = eval(value)
	} catch (error) {
		console.log('eval error', error)
		evalRes = value
	}
	return evalRes
}

/**
 * only has one header in the whole file.
 * take the first one that has [@flag header] when there have multiple [@flag header]
 * @param structDefinitions
 * @returns
 */
export function getHeaderStructDefinition<T extends StructDefinition | EnumDefinition>(structDefinitions: T[]) {
	const headerFlagStruct = structDefinitions.find((item) => isHeaderOfFlag(item.comments))
	return headerFlagStruct || structDefinitions[0]
}

/**
 * minimum:0 => key:minimum value:Number(0)
 */
export function schemaDslToObj(str: string): BasicDslToObjType {
	const [key, value] = getGroupsWithReg(str, SplitSchemaColonReg)
	return {
		key,
		value: safeParseValueDslValue(value),
	}
}

/**
 * value.maxLength:10 => position:value key:maxLength value:Number(10)
 * @param str
 * @returns
 */
export function schemaMapTypeDslToObj(str: string): MapTypeBasicDslToObjType {
	const [position, content] = getGroupsWithReg(str, SplitSchemaDotReg)
	return {
		position: position as MapPositionType,
		...schemaDslToObj(content),
	}
}

export function getDescriptionByComments(comments: Comment[]) {
	return comments
		.filter((item) => !isSchemaComment(item.value as string) && !isFlagComment(item.value as string))
		.map((item) => item.value as string)
		.join('/n')
}

export function getRegularOptionByComments(comments: Comment[]) {
	const description = getDescriptionByComments(comments)
	const option = getSchemaContents(comments)
		.map(schemaDslToObj)
		.reduce<Record<string, ParsedDslValueType>>((result, item) => {
			result[item.key] = item.value
			return result
		}, {})
	return description
		? {
				...option,
				description,
			}
		: option
}
