import {
	type EnumDefinition,
	type EnumMember,
	type FieldDefinition,
	type Identifier,
	type ListType,
	type MapType,
	parse,
	type StructDefinition,
	SyntaxType,
	type ThriftDocument,
	type ThriftStatement,
} from '@creditkarma/thrift-parser'
import { type ObjectOptions, type TSchema, Type } from '@sinclair/typebox'

import { MapPositionType } from './constants.js'
import { beingRefedArrayPush, getRefedArray, resetBeingRefedArray } from './global.js'
import type { MapAnySchema, ParsedDslValueType, StructMapType } from './types.js'
import {
	getBasicTypeBoxWithSyntaxType,
	getDescriptionByComments,
	getHeaderStructDefinition,
	getRegularOptionByComments,
	getSchemaContents,
	getTypeBoxOptionWithNumericalKeyword,
	isOneOfSyntaxType,
	schemaMapTypeDslToObj,
	setOptional,
} from './utils.js'

/**
 * parse thrift to json schema
 * @param thriftString thrift content
 * @returns
 */
export function parseThriftToTypeBox(thriftString: string, errFn?: (error: unknown) => void): TSchema | undefined {
	try {
		const thriftAST = parse(thriftString) as ThriftDocument
		return traverseBody(thriftAST.body)
	} catch (error) {
		errFn?.(error)
	}
}

// enum 也算一个 struct，因为它可以被嵌套
function getStructMap(structDefinitions: (StructDefinition | EnumDefinition)[]) {
	return structDefinitions.reduce((accumulationMap, item) => {
		const commentOption = getRegularOptionByComments(item.comments)
		const structTypeBox =
			item.type === SyntaxType.StructDefinition
				? // todo 动态更改 Type.object 会导致 require 失效
					Type.Object(traverseFields(item.fields), commentOption)
				: Type.Enum(scanEnumMembers(item.members), commentOption)
		accumulationMap.set(item.name.value, structTypeBox)
		return accumulationMap
	}, new Map() as StructMapType)
}

function scanEnumMembers(enumMembers: Array<EnumMember>): Record<string, number> {
	return enumMembers.reduce<Record<string, number>>((accumulationMap, item) => {
		// 因为 enum 的值必须是 int32
		accumulationMap[item.name.value] = Number(item.initializer!.value.value)
		return accumulationMap
	}, {})
}

/**
 * only one layer
 * @param thriftASTBody
 * @returns
 */
function traverseBody(thriftASTBody: Array<ThriftStatement | FieldDefinition>) {
	resetBeingRefedArray()
	const StructDefinitions = thriftASTBody.filter(
		(item) => item.type === SyntaxType.StructDefinition || item.type === SyntaxType.EnumDefinition
	)
	if (!StructDefinitions.length) return Type.Any()
	const structMap = getStructMap(StructDefinitions)
	const headerStruct = getHeaderStructDefinition(StructDefinitions)
	const headerTSchema = structMap.get(headerStruct.name.value)
	for (const [fieldValue, fn] of getRefedArray()) {
		// it must have a cache in structMap,otherwise it is an exception
		fn(structMap.get(fieldValue)!)
	}
	return headerTSchema
}

function traverseFields(thriftAstFields: FieldDefinition[]) {
	return thriftAstFields.reduce((schemaAccumulation, fieldItem) => {
		const { fieldType } = fieldItem
		if (fieldType.type === SyntaxType.Identifier) {
			return handleStructInFields(fieldItem, schemaAccumulation)
		}
		if (fieldType.type === SyntaxType.MapType) {
			return handleMapTypeInFields(fieldItem, schemaAccumulation)
		}
		if (fieldType.type === SyntaxType.ListType) {
			return handleListTypeInFields(fieldItem, schemaAccumulation)
		}

		return handleRegularCaseInFields(fieldItem, schemaAccumulation)
	}, {} as MapAnySchema)
}

/**
 * optional list<PerformanceServerTiming> serverTiming
 * @param  {} comments
 * @param  {} requiredness
 * @param  {} name
 * @param  {FieldDefinition} ...item}
 * @param  {MapAnySchema} schemaMap
 */
function handleListTypeInFields({ comments, requiredness, name, ...item }: FieldDefinition, schemaMap: MapAnySchema) {
	const fieldType = item.fieldType as ListType
	const valueType = fieldType.valueType as Identifier
	const hasStructAsValue = !isOneOfSyntaxType(valueType.value)
	const valueTypeBox = getBasicTypeBoxWithSyntaxType(valueType.type)
	const typeBoxWrapper = (valueTypeBoxParam = valueTypeBox()) =>
		setOptional(Type.Array(valueTypeBoxParam, getRegularOptionByComments(comments)), requiredness)
	const beingRefedFn = ($id: TSchema) => typeBoxWrapper($id)

	if (hasStructAsValue) {
		beingRefedArrayPush(valueType.value, ($id) => {
			schemaMap[name.value] = beingRefedFn($id)
		})
	} else {
		schemaMap[name.value] = typeBoxWrapper()
	}

	return schemaMap
}

function handleRegularCaseInFields(
	{ comments, fieldType, requiredness, name }: FieldDefinition,
	schemaMap: MapAnySchema
) {
	const typeBox = getBasicTypeBoxWithSyntaxType(fieldType.type)
	schemaMap[name.value] = setOptional(
		typeBox({
			...getTypeBoxOptionWithNumericalKeyword(fieldType.type),
			...getRegularOptionByComments(comments),
		}),
		requiredness
	)
	return schemaMap
}

// do nothing if typeBox is Type.Any(is a struct),just wrap it and put it in beingRefedArray
function handleStructInFields({ comments, requiredness, name, ...item }: FieldDefinition, schemaMap: MapAnySchema) {
	const fieldType = item.fieldType as Identifier
	beingRefedArrayPush(fieldType.value, ($id: TSchema) => {
		schemaMap[name.value] = setOptional($id, requiredness)
	})
	return schemaMap
}

function handleMapTypeInFields({ comments, requiredness, name, ...item }: FieldDefinition, schemaMap: MapAnySchema) {
	const fieldType = item.fieldType as MapType
	const valueType = fieldType.valueType as Identifier
	const description = getDescriptionByComments(comments)
	// String typeBox by default
	const keyTypeBox = Type.String.bind(Type)
	// Identifier
	const valueTypeBox = getBasicTypeBoxWithSyntaxType(valueType.type)
	const optionMap = getSchemaContents(comments)
		.map(schemaMapTypeDslToObj)
		.reduce(
			(result, { position, key, value }) => {
				result.set(position, {
					...result.get(position),
					...{
						[key]: value,
					},
				})
				return result
			},
			new Map<MapPositionType, Record<string, ParsedDslValueType>>([
				[MapPositionType.key, {}],
				[MapPositionType.value, {}],
				[MapPositionType.options, {}],
			])
		)
	const hasStructAsValue = !isOneOfSyntaxType(valueType.value)
	const options = {
		// set additionalProperties: true default is not working  for MapType<string,string>, because the Type.Record set it false forcedly
		...optionMap.get(MapPositionType.options),
	} as ObjectOptions
	if (description) options.description = description
	const typeBoxWrapper = (valueTypeBoxParam = valueTypeBox(optionMap.get(MapPositionType.value))) =>
		setOptional(Type.Record(keyTypeBox(optionMap.get(MapPositionType.key)), valueTypeBoxParam, options), requiredness)
	const beingRefedFn = ($id: TSchema) => typeBoxWrapper($id)
	if (hasStructAsValue) {
		beingRefedArrayPush(valueType.value, ($id) => {
			schemaMap[name.value] = beingRefedFn($id)
		})
	} else {
		schemaMap[name.value] = typeBoxWrapper()
	}
	return schemaMap
}
