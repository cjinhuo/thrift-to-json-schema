import { parseThriftToTypeBox } from './parser'

export function parseThriftToJsonSchema(thriftString: string, errFn?: (error: unknown) => void) {
  const typeBox = parseThriftToTypeBox(thriftString, errFn)
  if (typeBox) return JSON.stringify(typeBox)
  return ''
}
