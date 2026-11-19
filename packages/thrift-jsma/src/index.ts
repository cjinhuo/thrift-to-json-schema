import { parseThriftToTypeBox } from './parser.js'

export type { ThriftSchema } from './types.js'
export { parseThriftToTypeBox }
export function parseThriftToJsonSchema(thriftString: string, errFn?: (error: unknown) => void) {
	const typeBox = parseThriftToTypeBox(thriftString, errFn)
	if (typeBox) return JSON.stringify(typeBox)
	return ''
}
