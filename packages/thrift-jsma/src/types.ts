import { NumericOptions, TSchema } from '@sinclair/typebox'

import { MapPositionType } from './constants'

export type MapAnySchema = Record<string, TSchema>

export interface BeingRefItemType {
  // string => fieldType.value eg:HttpPayload
  fieldValue: string
  fn: ($id: TSchema) => void
}

export type BeingRefedArrayPushType = (valueType: string, fn: ($id: TSchema) => void) => void

export type BeingRefedArrayType = [string, ($id: TSchema) => void][]
export type StructMapType = Map<string, TSchema>

export type BasicTypeBox = (options?: NumericOptions) => TSchema

export type ParsedDslValueType = string | number | string[] | Record<string, string>

export interface BasicDslToObjType {
  key: string
  value: ParsedDslValueType
}
export interface MapTypeBasicDslToObjType extends BasicDslToObjType {
  position: MapPositionType
}
