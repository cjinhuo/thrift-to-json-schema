import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { after, before, test } from 'node:test'

const root = resolve(import.meta.dirname, '..')
const consumer = mkdtempSync(join(tmpdir(), 'trasm-consumer-'))
const pnpm = process.env.npm_execpath ?? 'pnpm'

function run(command, args, cwd = consumer) {
	return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
}

before(() => {
	const dependencies = {}
	for (const name of ['shared', 'thrift-jsma']) {
		const directory = join(root, 'packages', name)
		const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))
		run(pnpm, ['pack', '--pack-destination', consumer], directory)
		dependencies[manifest.name] = `file:./trasm-${name}-${manifest.version}.tgz`
	}
	writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, dependencies }))
	run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'])
})
after(() => rmSync(consumer, { recursive: true, force: true }))

const thrift = `struct User {
	1: string name
	# @schema maxLength:4 * 8
	# @schema title:'Display name'
	# @schema examples:['Ada', 'Lin']
}`
const expected = {
	type: 'object',
	properties: { name: { type: 'string', maxLength: 32, title: 'Display name', examples: ['Ada', 'Lin'] } },
	required: ['name'],
}

for (const format of ['module', 'commonjs']) {
	test(`a ${format} consumer can convert Thrift with the installed packages`, () => {
		const imports =
			format === 'module'
				? "import * as parser from '@trasm/thrift-jsma'; import { isString } from '@trasm/shared'"
				: "const parser = require('@trasm/thrift-jsma'); const { isString } = require('@trasm/shared')"
		const output = run(process.execPath, [
			'--input-type',
			format,
			'-e',
			`${imports}
			const json = parser.parseThriftToJsonSchema(${JSON.stringify(thrift)})
			console.log(JSON.stringify([isString(json), JSON.parse(json), parser.parseThriftToTypeBox(${JSON.stringify(thrift)})]))`,
		])
		assert.deepEqual(JSON.parse(output), [true, expected, expected])
	})
}

test('the published ESM entry points still convert Thrift', () => {
	const output = run(process.execPath, [
		'--input-type=module',
		'-e',
		`
		import { parseThriftToJsonSchema } from '@trasm/thrift-jsma/esm/index.js'
		import { parseThriftToTypeBox } from '@trasm/thrift-jsma/esm/parser.js'
		import * as bundle from '@trasm/thrift-jsma/dist/index.esm.js'
		const thrift = ${JSON.stringify(thrift)}
		console.log(JSON.stringify([JSON.parse(parseThriftToJsonSchema(thrift)), parseThriftToTypeBox(thrift), bundle.parseThriftToTypeBox(thrift)]))
	`,
	])
	assert.deepEqual(JSON.parse(output), [expected, expected, expected])
})

test('an unevaluable annotation keeps its original text without failing the conversion', () => {
	const input = `struct User {
		1: string name
		# @schema title:First and last name
	}`
	run(process.execPath, [
		'--input-type=module',
		'-e',
		`import assert from 'node:assert/strict'
		import { parseThriftToJsonSchema } from '@trasm/thrift-jsma'
		const json = parseThriftToJsonSchema(${JSON.stringify(input)}, assert.fail)
		assert.equal(JSON.parse(json).properties.name.title, 'First and last name')`,
	])
})

test('a multiline parse error reports the source line and calls the error callback', () => {
	const output = run(process.execPath, [
		'--input-type=module',
		'-e',
		`
		import { parseThriftToJsonSchema } from '@trasm/thrift-jsma'
		const input = ['struct Broken {', '  1: string', '}'].join('\\n')
		let errors = 0
		const result = parseThriftToJsonSchema(input, () => { errors++ })
		console.log(JSON.stringify({ errors, result }))
	`,
	])
	assert.match(output, /^2 \|\s+1: string$/m)
	assert.deepEqual(JSON.parse(output.trim().split('\n').pop()), { errors: 1, result: '' })
})

test('TypeScript resolves installed declarations in bundler, native ESM and CommonJS projects', () => {
	const source = `import { parseThriftToJsonSchema, parseThriftToTypeBox } from '@trasm/thrift-jsma'
import { isString } from '@trasm/shared'
const json: string = parseThriftToJsonSchema('struct User {}')
const valid: boolean = isString(json)
const schema = parseThriftToTypeBox('struct User {}')
void [valid, schema?.type]
// @ts-expect-error Thrift input must be a string
parseThriftToTypeBox(42)
`
	for (const extension of ['ts', 'mts', 'cts']) writeFileSync(join(consumer, `consumer.${extension}`), source)
	for (const resolution of ['Bundler', 'NodeNext']) {
		writeFileSync(
			join(consumer, 'tsconfig.json'),
			JSON.stringify({
				compilerOptions: {
					strict: true,
					noEmit: true,
					target: 'ES2020',
					types: [],
					module: resolution === 'Bundler' ? 'ESNext' : 'NodeNext',
					moduleResolution: resolution,
				},
			})
		)
		run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'])
	}
})
