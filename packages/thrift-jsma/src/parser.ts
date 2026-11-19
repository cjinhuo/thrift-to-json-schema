import {
	type Comment,
	type EnumDefinition,
	type FieldDefinition,
	type FunctionType,
	parse,
	type StructDefinition,
	SyntaxType,
} from '@creditkarma/thrift-parser'
import { type TSchema, type TSchemaOptions, Type } from 'typebox'

import { MapPositionType } from './constants.js'
import type { ThriftSchema } from './types.js'
import {
	getBasicTypeBoxWithSyntaxType,
	getDescriptionByComments,
	getHeaderStructDefinition,
	getRegularOptionByComments,
	getSchemaContents,
	getTypeBoxOptionWithNumericalKeyword,
	schemaMapTypeDslToObj,
} from './utils.js'

type Definition = StructDefinition | EnumDefinition

// 引用的标识属于当前文档。相同输入生成稳定的标识，不同文件可以使用相同的结构名。
function referencePrefix(source: string) {
	let hash = 2166136261
	for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619)
	const key = (hash >>> 0).toString(36)
	// 使用绝对 URI，使跨越显式 $id 的嵌套引用仍能找到同一份定义。
	return `urn:thrift:${key}:`
}

export function parseThriftToTypeBox(thriftString: string, errFn?: (error: unknown) => void): ThriftSchema | undefined {
	try {
		const ast = parse(thriftString)
		if (ast.type === SyntaxType.ThriftErrors) throw new Error(ast.errors.map((error) => error.message).join('\n'))
		const definitions = ast.body.filter(
			(node): node is Definition => node.type === SyntaxType.StructDefinition || node.type === SyntaxType.EnumDefinition
		)
		const schema = definitions.length ? buildSchema(definitions, thriftString) : Type.Any()
		// TypeBox 1 的基础类型不声明动态字段，对外仍提供生成的 JSON Schema 字段类型。
		return schema as ThriftSchema
	} catch (error) {
		errFn?.(error)
	}
}

function buildSchema(definitions: Definition[], source: string): TSchema {
	// 先索引声明，字段可以引用后面定义的类型。正在展开的结构只属于本次调用。
	const declarations = new Map(definitions.map((definition) => [definition.name.value, definition]))
	const active = new Map<string, TSchemaOptions>()
	const inline = new Map<string, TSchema>()
	const usedIds = new Set<string>()
	let scope: string | undefined
	let nextId = 0
	let scopedUses = 0

	function newId(name: string) {
		scope ??= referencePrefix(source)
		return `${scope}${name.replace(/[^a-zA-Z0-9_]/g, '_')}_${nextId++}`
	}

	function resolve(name: string): TSchema {
		const target = declarations.get(name) ?? declarations.get(name.slice(name.lastIndexOf('.') + 1))
		if (!target) throw new Error(`Unknown Thrift type: ${name}`)
		const key = target.name.value
		const cached = inline.get(key)
		if (cached) return cached

		const ancestor = active.get(key)
		if (ancestor) {
			// 回到当前路径的祖先时，只引用它的 $id；直接嵌入对象会让 JSON.stringify 遇到环。
			scopedUses++
			ancestor.$id ??= newId(key)
			return Type.Ref(ancestor.$id)
		}

		const before = scopedUses
		const options: TSchemaOptions = getRegularOptionByComments(target.comments)
		if (typeof options.$id === 'string') {
			// 一个文档中每个 $id 只能声明一次。同一类型再次内联时使用独立标识。
			scopedUses++
			if (usedIds.has(options.$id)) options.$id = newId(key)
			usedIds.add(options.$id)
		}

		let schema: TSchema
		if (target.type === SyntaxType.EnumDefinition) {
			schema = buildEnum(target, options)
		} else {
			// 只登记普通选项，子字段回指时可补上 $id；TypeBox 对象在字段就绪后一次构造。
			active.set(key, options)
			const properties: Record<string, TSchema> = Object.create(null)
			for (const field of target.fields) properties[field.name.value] = buildField(field, resolve)
			active.delete(key)
			schema = Type.Object(properties, options)
		}
		// 无环的子树可以复用；带有标识或回指祖先的子树只在当前位置有效。
		if (scopedUses === before) inline.set(key, schema)
		return schema
	}

	return resolve(getHeaderStructDefinition(definitions).name.value)
}

function buildEnum(definition: EnumDefinition, options: TSchemaOptions) {
	const values: number[] = []
	let next = 0
	for (const member of definition.members) {
		const value = member.initializer ? Number(member.initializer.value.value) : next
		values.push(value)
		next = value + 1
	}
	// 保留公开 JSON 中的 anyOf/const 枚举结构。
	return Type.Union(
		values.map((value) => Type.Literal(value)),
		options
	)
}

function buildField(field: FieldDefinition, resolve: (name: string) => TSchema): TSchema {
	const { fieldType, comments, requiredness } = field
	const options =
		fieldType.type === SyntaxType.MapType || fieldType.type === SyntaxType.Identifier
			? {}
			: { ...getTypeBoxOptionWithNumericalKeyword(fieldType.type), ...getRegularOptionByComments(comments) }
	const schema = buildType(fieldType, resolve, options, comments)

	// 兼容旧版默认规则：未写 required 的命名类型字段及其容器允许省略。
	let item = fieldType
	while (item.type === SyntaxType.ListType || item.type === SyntaxType.MapType || item.type === SyntaxType.SetType) {
		item = item.valueType
	}
	const optional = requiredness === 'optional' || (requiredness === null && item.type === SyntaxType.Identifier)
	return optional ? Type.Optional(schema) : schema
}

function buildType(
	fieldType: FunctionType,
	resolve: (name: string) => TSchema,
	options: TSchemaOptions = {},
	comments: Comment[] = []
): TSchema {
	switch (fieldType.type) {
		case SyntaxType.Identifier:
			return resolve(fieldType.value)
		case SyntaxType.ListType:
			return Type.Array(buildType(fieldType.valueType, resolve), options)
		case SyntaxType.SetType:
			return Type.Array(buildType(fieldType.valueType, resolve), { ...options, uniqueItems: true })
		case SyntaxType.MapType: {
			const parts = new Map<MapPositionType, TSchemaOptions>()
			for (const annotation of getSchemaContents(comments)) {
				const { position, key, value } = schemaMapTypeDslToObj(annotation)
				parts.set(position, { ...parts.get(position), [key]: value })
			}
			const description = getDescriptionByComments(comments)
			const key = Type.String(parts.get(MapPositionType.key))
			const value = buildType(fieldType.valueType, resolve, parts.get(MapPositionType.value))
			const recordOptions = { ...options, ...parts.get(MapPositionType.options) }
			if (description) recordOptions.description = description
			// 旧版本的 map 始终拒绝不匹配键模式的属性。
			return Type.Record(key, value, { ...recordOptions, additionalProperties: false })
		}
		default:
			return getBasicTypeBoxWithSyntaxType(fieldType.type)(options)
	}
}
