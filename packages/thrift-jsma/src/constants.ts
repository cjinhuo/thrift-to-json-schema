import { SyntaxType } from '@creditkarma/thrift-parser'

export enum MapPositionType {
  key = 'key',
  value = 'value',
  options = 'options',
}

export enum FlagTypes {
  header = 'header',
}

export const NumericalKeywordMap = {
  [SyntaxType.I8Keyword]: {
    minimum: 0,
    maximum: 255,
  },
  [SyntaxType.I16Keyword]: {
    minimum: -32768,
    maximum: 32767,
  },
  [SyntaxType.I32Keyword]: {
    minimum: -2147483648,
    maximum: 2147483647,
  },
  [SyntaxType.I64Keyword]: {
    // so large that throw error if set forcedly
    // minimum: -9223372036854775808,
    // maximum: 9223372036854775807,
  },
  [SyntaxType.DoubleKeyword]: {
    // so large that throw error if set forcedly
  },
}
