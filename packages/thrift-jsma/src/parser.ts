import {
  FieldDefinition,
  Identifier,
  MapType,
  parse,
  SyntaxType,
  ThriftDocument,
  ThriftStatement,
  ListType,
  StructDefinition,
} from '@creditkarma/thrift-parser'
import { TSchema, Type } from '@sinclair/typebox'

import { MapPositionType } from './constants'
import { beingRefedArrayPush, getRefedArray, resetBeingRefedArray } from './global'
import { StructMapType, MapAnySchema, ParsedDslValueType } from './types'
import {
  getRegularOptionByComments,
  getBasicTypeBoxWithSyntaxType,
  setOptional,
  getDescriptionByComments,
  getSchemaContents,
  schemaMapTypeDslToObj,
  isOneOfSyntaxType,
  getHeaderStructDefinition,
} from './utils'

/**
 * parse thrift to json schema
 * @param thriftString thrift content
 * @returns
 */
export function parseThriftToTypeBox(thriftString: string, errFn?: (error: unknown) => void) {
  try {
    const thriftAST = parse(thriftString) as ThriftDocument
    return traverseBody(thriftAST.body)
  } catch (error) {
    errFn && errFn(error)
  }
}

function getStructMap(structDefinitions: StructDefinition[]) {
  return structDefinitions.reduce((accumulationMap, item) => {
    const structTypeBox = Type.Object(
      traverseFields(item.fields),
      getRegularOptionByComments(item.comments)
    )
    accumulationMap.set(item.name.value, structTypeBox)
    return accumulationMap
  }, new Map() as StructMapType)
}

/**
 * only one layer
 * @param thriftASTBody
 * @returns
 */
function traverseBody(thriftASTBody: Array<ThriftStatement | FieldDefinition>) {
  resetBeingRefedArray()
  const StructDefinitions = thriftASTBody.filter(
    (item) => item.type === SyntaxType.StructDefinition
  ) as StructDefinition[]
  if (!StructDefinitions.length) return Type.Any()
  const structMap = getStructMap(StructDefinitions)
  const headerStruct = getHeaderStructDefinition(StructDefinitions)
  const headerTSchema = structMap.get(headerStruct.name.value)!
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
    } else if (fieldType.type === SyntaxType.MapType) {
      return handleMapTypeInFields(fieldItem, schemaAccumulation)
    } else if (fieldType.type === SyntaxType.ListType) {
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
function handleListTypeInFields(
  { comments, requiredness, name, ...item }: FieldDefinition,
  schemaMap: MapAnySchema
) {
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
  schemaMap[name.value] = setOptional(typeBox(getRegularOptionByComments(comments)), requiredness)
  return schemaMap
}

// do nothing if typeBox is Type.Any(is a struct),just wrap it and put it in beingRefedArray
function handleStructInFields(
  { comments, requiredness, name, ...item }: FieldDefinition,
  schemaMap: MapAnySchema
) {
  const fieldType = item.fieldType as Identifier
  beingRefedArrayPush(fieldType.value, ($id: TSchema) => {
    schemaMap[name.value] = setOptional($id, requiredness)
  })
  return schemaMap
}

function handleMapTypeInFields(
  { comments, requiredness, name, ...item }: FieldDefinition,
  schemaMap: MapAnySchema
) {
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
  const typeBoxWrapper = (valueTypeBoxParam = valueTypeBox(optionMap.get(MapPositionType.key))) =>
    setOptional(
      Type.Record(
        keyTypeBox(optionMap.get(MapPositionType.key)),
        valueTypeBoxParam,
        description
          ? {
              description,
              ...optionMap.get(MapPositionType.options),
            }
          : optionMap.get(MapPositionType.options)
      ),
      requiredness
    )
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
