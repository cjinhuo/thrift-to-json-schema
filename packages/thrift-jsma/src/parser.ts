import {
	type Comment,
	type EnumDefinition,
	type FieldDefinition,
	type FunctionType,
	parse,
	type StructDefinition,
	SyntaxType,
} from '@creditkarma/thrift-parser'
import { type SchemaOptions, type TSchema, Type } from '@sinclair/typebox'

import { MapPositionType } from './constants.js'
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
function referencePrefix(source: string, definitions: Definition[]) {
	let hash = 2166136261
	for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619)
	const key = (hash >>> 0).toString(36)
	const declaresId = (comments: Comment[]) =>
		getSchemaContents(comments).some((annotation) => /^(?:(?:options|value)\.)?\$id\s*:/.test(annotation))
	const hasSchemaId = definitions.some(
		(definition) =>
			declaresId(definition.comments) ||
			(definition.type === SyntaxType.StructDefinition && definition.fields.some((field) => declaresId(field.comments)))
	)
	// TypeBox 0.25 将生成的标识用作函数名。若输入自带 $id，则需用绝对 URI 跨越不同的引用基址。
	return hasSchemaId ? `urn:thrift:${key}:` : `Thrift_${key}_`
}

export function parseThriftToTypeBox(thriftString: string, errFn?: (error: unknown) => void): TSchema | undefined {
	try {
		const ast = parse(thriftString)
		if (ast.type === SyntaxType.ThriftErrors) throw new Error(ast.errors.map((error) => error.message).join('\n'))
		const definitions = ast.body.filter(
			(node): node is Definition => node.type === SyntaxType.StructDefinition || node.type === SyntaxType.EnumDefinition
		)
		if (!definitions.length) return Type.Any()

		return buildSchema(definitions, thriftString)
	} catch (error) {
		errFn?.(error)
	}
}

function buildSchema(definitions: Definition[], source: string): TSchema {
	// 先索引声明，字段可以引用后面定义的类型。正在展开的结构只属于本次调用。
	const declarations = new Map(definitions.map((definition) => [definition.name.value, definition]))
	const active = new Map<string, TSchema>()
	const inline = new Map<string, TSchema>()
	const usedIds = new Set<string>()
	let scope: string | undefined
	let nextId = 0
	let scopedUses = 0

	function newId(name: string) {
		scope ??= referencePrefix(source, definitions)
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
			return Type.Ref(ancestor)
		}

		const before = scopedUses
		const options: SchemaOptions = getRegularOptionByComments(target.comments)
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
			schema = Type.Object({}, options)
			active.set(key, schema)
			const properties: Record<string, TSchema> = Object.create(null)
			for (const field of target.fields) properties[field.name.value] = buildField(field, resolve)
			active.delete(key)
			// Type.Object 在构造时计算 required，必须先解析完所有字段。
			Object.assign(schema, Type.Object(properties))
		}
		// 无环的子树可以复用；带有标识或回指祖先的子树只在当前位置有效。
		if (scopedUses === before) inline.set(key, schema)
		return schema
	}

	return resolve(getHeaderStructDefinition(definitions).name.value)
}

function buildEnum(definition: EnumDefinition, options: SchemaOptions) {
	const members: Record<string, number> = Object.create(null)
	let next = 0
	for (const member of definition.members) {
		const value = member.initializer ? Number(member.initializer.value.value) : next
		members[member.name.value] = value
		next = value + 1
	}
	return Type.Enum(members, options)
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
	options: SchemaOptions = {},
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
			const parts = new Map<MapPositionType, SchemaOptions>()
			for (const annotation of getSchemaContents(comments)) {
				const { position, key, value } = schemaMapTypeDslToObj(annotation)
				parts.set(position, { ...parts.get(position), [key]: value })
			}
			const description = getDescriptionByComments(comments)
			const key = Type.String(parts.get(MapPositionType.key))
			const value = buildType(fieldType.valueType, resolve, parts.get(MapPositionType.value))
			const recordOptions = { ...options, ...parts.get(MapPositionType.options) }
			if (description) recordOptions.description = description
			return Type.Record(key, value, recordOptions)
		}
		default:
			return getBasicTypeBoxWithSyntaxType(fieldType.type)(options)
	}
}
