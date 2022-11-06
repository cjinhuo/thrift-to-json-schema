import { Type } from '@sinclair/typebox'

import { parseThriftToTypeBox } from '../parser'

test('parseThriftToJsonSchema should work with empty struct in thrift', () => {
  const structString = `
  struct EmptyStruct {

  }
  `
  const typeBox = parseThriftToTypeBox(structString)
  const expectedTypeBox = Type.Object({})
  expect(typeBox).toEqual(expectedTypeBox)
})

test('should work with single struct', () => {
  const structString = `
  # @flag header
  # @schema additionalProperties:true
  struct EmptyStruct {
    string field_string
    double field_double
    i32 field_i32
    i64 field_i64
    bool field_bool
    optional string field_optional_string
  }
  `
  const typeBox = parseThriftToTypeBox(structString)
  const expectedTypeBox = Type.Object(
    {
      field_string: Type.String(),
      field_double: Type.Number(),
      field_i32: Type.Number(),
      field_i64: Type.Number(),
      field_bool: Type.Boolean(),
      field_optional_string: Type.Optional(Type.String()),
    },
    {
      additionalProperties: true,
    }
  )
  console.log('typeBox', typeBox, expectedTypeBox)

  expect(typeBox).toEqual(expectedTypeBox)
})
