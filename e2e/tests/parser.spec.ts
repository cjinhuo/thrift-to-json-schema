import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

for (const [mode, url] of [
	['production', 'http://127.0.0.1:4173/thrift-to-json-schema/'],
	['development', 'http://127.0.0.1:5174/'],
] as const) {
	test(`the ${mode} editor converts Thrift as the user types`, async ({ page }) => {
		await page.goto(url)
		const editors = page.locator('.cm-content')
		await expect(editors).toHaveCount(2)
		await expect(editors.last()).toContainText('"field_string"')
		await editors.first().fill('struct User {\n  1: string nickname\n  # @schema maxLength:4 * 8\n}')
		await expect(editors.last()).toContainText('"nickname"')
		await expect(editors.last()).toContainText(/"maxLength":\s*32\b/)
	})
}

test('the standalone browser bundle converts Thrift without a module loader', async ({ page }) => {
	await page.addScriptTag({
		path: fileURLToPath(new URL('../../packages/thrift-jsma/dist/index.min.js', import.meta.url)),
	})
	const schema = await page.evaluate(() => Reflect.get(window, '_GLOBAL_').parseThriftToJsonSchema('struct Empty {}'))
	expect(JSON.parse(schema)).toEqual({ type: 'object', properties: {} })
})

test('the legacy ESM bundle loads directly in a browser', async ({ page }) => {
	const bundle = await readFile(new URL('../../packages/thrift-jsma/dist/index.esm.js', import.meta.url), 'utf8')
	const schema = await page.evaluate(async (source) => {
		const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
		try {
			const { parseThriftToTypeBox } = await import(url)
			return parseThriftToTypeBox('struct Empty {}')
		} finally {
			URL.revokeObjectURL(url)
		}
	}, bundle)
	expect(schema).toEqual({ type: 'object', properties: {} })
})
