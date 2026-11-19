import type { TNumberOptions, TSchema, TSchemaOptions } from 'typebox'

import type { MapPositionType } from './constants.js'

/** 动态生成的 schema 也允许调用方直接读取常用的 JSON Schema 字段。 */
export interface ThriftSchema extends TSchema, TSchemaOptions {
	type?: string
	$ref?: string
	properties?: Record<string, ThriftSchema>
	required?: string[]
	items?: ThriftSchema
	patternProperties?: Record<string, ThriftSchema>
	anyOf?: ThriftSchema[]
}

export type MapAnySchema = Record<string, TSchema>

export interface BeingRefItemType {
	// string => fieldType.value eg:HttpPayload
	fieldValue: string
	fn: ($id: TSchema) => void
}

export type BeingRefedArrayPushType = (valueType: string, fn: ($id: TSchema) => void) => void

export type BeingRefedArrayType = [string, ($id: TSchema) => void][]
export type StructMapType = Map<string, TSchema>

export type BasicTypeBox = (options?: TNumberOptions) => TSchema

export type ParsedDslValueType = string | number | string[] | Record<string, string>

export interface BasicDslToObjType {
	key: string
	value: ParsedDslValueType
}
export interface MapTypeBasicDslToObjType extends BasicDslToObjType {
	position: MapPositionType
}
