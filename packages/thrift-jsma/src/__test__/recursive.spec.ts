import { TypeCompiler } from '@sinclair/typebox/compiler'
import { Value } from '@sinclair/typebox/value'
import Ajv from 'ajv'
import { expect, test } from 'vitest'

import { beingRefedArrayPush, getRefedArray, resetBeingRefedArray } from '../global'
import { parseThriftToJsonSchema, parseThriftToTypeBox } from '../index'

const flexFilter = `
struct FlexFilter {
  1: string type (field.desc = "filter type")
  5: list<FlexFilter> sub_conditions (og.recursion.depth = "7")
}`

function validators(source: string) {
	const json = parseThriftToJsonSchema(source)
	const schema = parseThriftToTypeBox(source)
	if (!schema) throw new Error('Expected a TypeBox schema')
	expect(JSON.parse(json)).toEqual(JSON.parse(JSON.stringify(schema)))
	const validateJson = new Ajv().compile(JSON.parse(json))
	return (value: unknown, expected: boolean) => {
		expect(validateJson(value)).toBe(expected)
		expect(Value.Check(schema, value)).toBe(expected)
	}
}

test('converts the recursive FlexFilter from issue #2 and validates every level', () => {
	const json = JSON.parse(parseThriftToJsonSchema(flexFilter))
	expect(json.properties.sub_conditions.items.$ref).toEqual(expect.any(String))
	const check = validators(flexFilter)
	const nest = (leaf: object) =>
		Array.from({ length: 10 }).reduce<object>((child) => ({ type: 'group', sub_conditions: [child] }), leaf)
	check(nest({ type: 'leaf' }), true)
	check(nest({ type: 3 }), false)
})

test('resolves a mutual cycle below the selected root, including repeated uses and nested list/map values', () => {
	const source = `
		struct Branch { 1: required string name, 2: optional list<map<string, Leaf>> leaves }
		# @flag header
		struct Tree { 1: required Branch left, 2: required Branch right }
		struct Leaf { 1: optional Branch parent }
	`
	const check = validators(source)
	const right = { name: 'r' }
	check({ left: { name: 'l', leaves: [{ a: { parent: right } }] }, right }, true)
	check({ left: { name: 'l', leaves: [{ a: { parent: { name: 3 } } }] }, right }, false)
	check({ left: right }, false)
})

test('supports direct self references and required fields that point to a forward declaration', () => {
	const source = 'struct Link { 1: optional Link next, 2: required Data data } struct Data { 1: string text }'
	const check = validators(source)
	check({ data: { text: 'a' }, next: { data: { text: 'b' } } }, true)
	check({ data: { text: 'a' }, next: {} }, false)
})

test('compiles generated recursive types with the TypeBox compiler shipped by the SDK', () => {
	const schema = parseThriftToTypeBox(flexFilter)
	if (!schema) throw new Error('Expected a TypeBox schema')
	const compiled = TypeCompiler.Compile(schema)
	expect(compiled.Check({ type: 'group', sub_conditions: [{ type: 'leaf' }] })).toBe(true)
	expect(compiled.Check({ type: 'group', sub_conditions: [{ type: 2 }] })).toBe(false)
})

test('validates recursive set elements reached through a map', () => {
	const check = validators('struct Node { 1: string name, 2: optional map<string, set<Node>> edges }')
	check({ name: 'root', edges: { group: [{ name: 'leaf' }] } }, true)
	check({ name: 'root', edges: { group: [{ name: 1 }] } }, false)
})

test('keeps acyclic references inline and previously returned schemas independent of later calls', () => {
	const first = parseThriftToTypeBox('struct A { 1: B child } struct B { 1: string text }')
	const before = JSON.stringify(first)
	expect(first?.properties.child.properties.text.type).toBe('string')
	expect(before).not.toContain('"$ref"')
	parseThriftToTypeBox('struct Other { 1: bool value }')
	expect(JSON.stringify(first)).toBe(before)
})

test('resolves both an outer and an inner ancestor in a cycle', () => {
	const check = validators(`
		struct Node { 1: required string label, 2: optional Child child }
		struct Child { 1: optional Node parent, 2: optional Child sibling }
	`)
	check({ label: 'root', child: { sibling: { parent: { label: 'leaf' } } } }, true)
	check({ label: 'root', child: { sibling: { parent: {} } } }, false)
})

test('respects an explicit schema ID when a recursive struct is used by two fields', () => {
	const source = `
		struct Tree { 1: required Link left, 2: required Link right }
		# @schema $id:'https://example.org/schemas/link'
		struct Link { 1: required string value, 2: optional Link next }
	`
	const schema = JSON.parse(parseThriftToJsonSchema(source))
	expect(schema.properties.left.$id).toBe('https://example.org/schemas/link')
	const check = validators(source)
	check({ left: { value: 'a' }, right: { value: 'b', next: { value: 'c' } } }, true)
	check({ left: { value: 'a' }, right: { value: 'b', next: {} } }, false)
})

test('resolves an outer ancestor across an embedded schema with its own base URI', () => {
	const check = validators(`
		struct Outer { 1: required string name, 2: optional Child child }
		# @schema $id:'https://example.org/nested/child'
		struct Child { 1: optional Outer parent }
	`)
	check({ name: 'root', child: { parent: { name: 'leaf' } } }, true)
	check({ name: 'root', child: { parent: { name: 1 } } }, false)
})

test('keeps recursive schemas with the same Thrift name distinct in one validator', () => {
	const ajv = new Ajv()
	const stringTree = ajv.compile(
		JSON.parse(parseThriftToJsonSchema('struct Tree { 1: optional Tree next, 2: string value }'))
	)
	const numberTree = ajv.compile(
		JSON.parse(parseThriftToJsonSchema('struct Tree { 1: optional Tree next, 2: i32 value }'))
	)
	expect(stringTree({ value: 'root', next: { value: 1 } })).toBe(false)
	expect(numberTree({ value: 1, next: { value: 2 } })).toBe(true)
})

test('reports missing types through the error callback without contaminating the next parse', () => {
	const errors: unknown[] = []
	expect(parseThriftToJsonSchema('struct Root { 1: Missing value }', (error) => errors.push(error))).toBe('')
	expect(errors.map(String)).toEqual(['Error: Unknown Thrift type: Missing'])
	expect(JSON.parse(parseThriftToJsonSchema('struct Root { 1: string value }')).properties.value.type).toBe('string')
})

test('increments implicit enum values from zero and from the last explicit value', () => {
	const check = validators('enum Color { RED, GREEN, BLUE = 4, WHITE }')
	for (const value of [0, 1, 4, 5]) check(value, true)
	check(2, false)
})

test('clears callbacks registered through the legacy global helper', () => {
	beingRefedArrayPush('Thing', () => {})
	resetBeingRefedArray()
	expect(getRefedArray()).toHaveLength(0)
})
