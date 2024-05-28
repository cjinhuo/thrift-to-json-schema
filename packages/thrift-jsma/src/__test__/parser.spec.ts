import { SyntaxType } from '@creditkarma/thrift-parser'
import { Type } from '@sinclair/typebox'

import { NumericalKeywordMap } from '../constants'
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
      field_i32: Type.Integer(NumericalKeywordMap[SyntaxType.I32Keyword]),
      field_i64: Type.Integer(),
      field_bool: Type.Boolean(),
      field_optional_string: Type.Optional(Type.String()),
    },
    {
      additionalProperties: true,
    }
  )

  expect(typeBox).toEqual(expectedTypeBox)
})

test('should work with mapType', () => {
  const structString = `
  # @flag header
  struct MapStruct {
    map<string, string> extra
    # @schema key.pattern:'^[\S]{1,50}$'
    # @schema value.maxLength:256
  }
  `
  const typeBox = parseThriftToTypeBox(structString)
  const expectedTypeBox = Type.Object({
    extra: Type.Record(
      Type.String({
        pattern: '^[S]{1,50}$',
      }),
      Type.String({
        maxLength: 256,
      })
    ),
  })
  expect(typeBox).toEqual(expectedTypeBox)
})

test('should work with enum type', () => {
  const structString = `
  # @flag header
  struct test_struct {
    Color test_color
    map<string, Color> map_enum
  }
  enum Color {
    RED = 1
    GREEN = 2
  }
  `
  const typeBox = parseThriftToTypeBox(structString)
  const expectedTypeBox = Type.Partial(
    Type.Object({
      test_color: Type.Enum({
        RED: 1,
        GREEN: 2,
      }),
      map_enum: Type.Record(Type.String(), Type.Enum({ RED: 1, GREEN: 2 })),
    })
  )
  expect(JSON.stringify(typeBox)).toEqual(JSON.stringify(expectedTypeBox))
})
