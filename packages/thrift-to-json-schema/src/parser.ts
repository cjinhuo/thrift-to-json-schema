import {
  FieldDefinition,
  Identifier,
  MapType,
  parse,
  SyntaxType,
  ThriftDocument,
  ThriftStatement,
  ListType,
} from '@creditkarma/thrift-parser'
import { TSchema, Type, TObject } from '@sinclair/typebox'

import { MapPositionType } from './constants'
import { StructMapType, MapAnySchema, BeingRefedArrayType, ParsedDslValueType } from './types'
import {
  getRegularOptionByComments,
  getBasicTypeBoxWithSyntaxType,
  isHeaderOfFlag,
  setOptional,
  once,
  getDescriptionByComments,
  getSchemaContents,
  schemaMapTypeDslToObj,
  isOneOfSyntaxType,
} from './utils'

// optional map<string, ActionRelatedDetail> metrics // 自定义数值 string 对应 ev_type, 比如 http 、js_error

/**
 * parse thrift to json schema
 * @param thriftString thrift content
 * @returns
 */
export function parseThriftToJsonSchema(thriftString: string): TObject {
  let headerTSchema: TObject

  /**
   * {
  'HttpPayload' => {
    '$id': '#HttpPayload',
    additionalProperties: false,
    type: 'object',
    properties: { api: [Object] },
    required: [ 'api' ],
    [Symbol(TypeBox.Kind)]: 'Object'
  }
}
   */
  const structMap: StructMapType = new Map()

  const beingRefedArray: BeingRefedArrayType = []
  const thriftAST = parse(thriftString) as ThriftDocument

  return traverseBody(thriftAST.body)

  /**
   * only one layer
   * @param thriftASTBody
   * @returns
   */
  function traverseBody(thriftASTBody: Array<ThriftStatement | FieldDefinition>) {
    // console.log(util.inspect(thriftASTBody, false, null, true /* enable colors */))
    const isFirstFn = once()
    thriftASTBody.forEach((item) => {
      if (item.type === SyntaxType.StructDefinition) {
        const structTypeBox = Type.Object(traverseFields(item.fields), {
          additionalProperties: true,
        })
        // only has one header in the whole file.
        // take the first one that has [@flag header] when there have multiple [@flag header]
        if (isHeaderOfFlag(item.comments) && isFirstFn()) {
          return (headerTSchema = structTypeBox)
        }
        structMap.set(item.name.value, structTypeBox)
      }
    })
    // 将头部中的类型 ref 连接上，并其余的 struct 放入 root.properties
    for (const [fieldValue, fn] of beingRefedArray) {
      // it must have a cache in structMap,otherwise it is an exception
      fn(structMap.get(fieldValue)!)
    }
    return headerTSchema
  }

  function beingRefedArrayPush(valueType: string, fn: ($id: TSchema) => void) {
    // common.Common => namespace.structName
    const specialChar = '.'
    beingRefedArray.push([
      valueType.includes(specialChar) ? valueType.split(specialChar).pop()! : valueType,
      fn,
    ])
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
    const option = getRegularOptionByComments(comments)
    const typeBoxWrapper = (valueTypeBoxParam = valueTypeBox()) =>
      setOptional(Type.Array(valueTypeBoxParam, option), requiredness)
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
        Type.Record(keyTypeBox(optionMap.get(MapPositionType.key)), valueTypeBoxParam, {
          description,
          ...optionMap.get(MapPositionType.options),
        }),
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
}
