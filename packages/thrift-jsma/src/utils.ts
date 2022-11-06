import { SyntaxType, Comment, StructDefinition } from '@creditkarma/thrift-parser'
import { TSchema, Type } from '@sinclair/typebox'

import { FlagTypes, MapPositionType } from './constants'
import { BasicTypeBox, BasicDslToObjType, MapTypeBasicDslToObjType } from './types'

export const getBasicTypeBoxWithSyntaxType = (syntaxType: SyntaxType): BasicTypeBox => {
  switch (syntaxType) {
    case SyntaxType.I8Keyword:
    case SyntaxType.I16Keyword:
    case SyntaxType.I32Keyword:
    case SyntaxType.I64Keyword:
    case SyntaxType.DoubleKeyword:
      return Type.Number.bind(Type)
    case SyntaxType.StringKeyword:
      return Type.String.bind(Type)
    case SyntaxType.BoolKeyword:
      return Type.Boolean.bind(Type)
    case SyntaxType.Identifier:
    default:
      return Type.Any.bind(Type)
  }
}

export const isOneOfSyntaxType = (type: string | undefined) => {
  if (!type) return true
  return Object.keys(SyntaxType).includes(type)
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
  return comments.some((item) => item.value.includes(getFlagComment(FlagTypes.header)))
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
  let evalRes: any
  try {
    evalRes = eval(value)
  } catch (error) {
    console.log('eval error', error)
  }
  return evalRes
}

/**
 * only has one header in the whole file.
 * take the first one that has [@flag header] when there have multiple [@flag header]
 * @param structDefinitions
 * @returns
 */
export function getHeaderStructDefinition(structDefinitions: StructDefinition[]) {
  const headerFlagStruct = structDefinitions.find((item) => isHeaderOfFlag(item.comments))
  return headerFlagStruct || structDefinitions[0]
}

/**
 * minimum:0 => key:minimum value:Number(0)
 */
export function schemaDslToObj(str: string): BasicDslToObjType {
  const [key, value] = str.split(':')
  return {
    key,
    value: safeParseValueDslValue(value),
  }
}

/**
 * value.maxLength:10 => position:value key:maxLength value:Number(10)
 */
export function schemaMapTypeDslToObj(str: string): MapTypeBasicDslToObjType {
  const [position, content] = str.split('.')
  return {
    position: position as MapPositionType,
    ...schemaDslToObj(content),
  }
}

export function getDescriptionByComments(comments: Comment[]) {
  return comments
    .filter(
      (item) => !isSchemaComment(item.value as string) && !isFlagComment(item.value as string)
    )
    .map((item) => item.value as string)
    .join('/n')
}

export function getRegularOptionByComments(comments: Comment[]) {
  const description = getDescriptionByComments(comments)
  const option = getSchemaContents(comments)
    .map(schemaDslToObj)
    .reduce((result, item) => {
      result[item.key] = item.value
      return result
    }, {} as any)

  return {
    ...option,
    description,
  }
}
