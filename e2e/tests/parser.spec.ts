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
		await expect(editors.last()).toContainText('"username"')
		await editors.first().fill('struct User {\n  1: string nickname\n  # @schema maxLength:4 * 8\n}')
		await expect(editors.last()).toContainText('"nickname"')
		await expect(editors.last()).toContainText(/"maxLength":\s*32\b/)
		await editors.first().fill('struct FlexFilter { 1: string type, 5: list<FlexFilter> sub_conditions }')
		await expect(editors.last()).toContainText('"$ref"')
		const schema = JSON.parse((await editors.last().textContent()) ?? '')
		expect(schema.properties.sub_conditions.items.$ref).toBe(schema.$id)
	})
}

test('the playground switches examples, validates JSON, and keeps edits scoped to the chosen example', async ({
	page,
}) => {
	await page.goto('http://127.0.0.1:5174/')
	await page.getByRole('button', { name: /递归引用/ }).click()
	const source = page.getByRole('textbox', { name: 'Thrift 源码' })
	await expect(source).toContainText('struct FlexFilter')
	await expect(page.getByRole('textbox', { name: 'JSON Schema 输出' })).toContainText('"$ref"')
	await page.getByRole('tab', { name: '数据校验' }).click()
	await expect(page.getByRole('status').filter({ hasText: '校验通过' })).toBeVisible()
	await page.getByRole('button', { name: '无效样例' }).click()
	await expect(page.getByRole('status').filter({ hasText: '校验失败' })).toBeVisible()
	await expect(page.getByText('/sub_conditions/0/type', { exact: true })).toBeVisible()
	await page.getByRole('button', { name: '有效样例' }).click()
	await expect(page.getByRole('status').filter({ hasText: '校验通过' })).toBeVisible()

	await source.fill('struct Custom { 1: required bool enabled }')
	await page.getByRole('button', { name: /枚举与容器/ }).click()
	await expect(source).toContainText('enum Role')
	await page.getByRole('button', { name: /递归引用/ }).click()
	await expect(source).toContainText('struct Custom')
	await page.getByRole('tab', { name: 'JSON Schema' }).click()
	await expect(page.getByRole('textbox', { name: 'JSON Schema 输出' })).toContainText('"enabled"')
	await source.fill('struct Broken { 1:')
	await expect(page.getByRole('alert')).toContainText('Thrift 解析失败')
	await expect(page.getByRole('textbox', { name: 'JSON Schema 输出' })).toHaveCount(0)
	await page.getByRole('button', { name: '重置示例' }).click()
	await expect(source).toContainText('struct FlexFilter')
	await expect(page.getByRole('textbox', { name: 'JSON Schema 输出' })).toContainText('"$ref"')
})

test('the mobile production playground validates the sample constraints and shows both SDK entry points', async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await page.goto('http://127.0.0.1:4173/thrift-to-json-schema/')
	await page.getByRole('tab', { name: '数据校验' }).click()
	for (const [name, path] of [
		[/基础字段/, '/level'],
		[/枚举与容器/, '/tags'],
		[/注解约束/, '/sku'],
	] as const) {
		await page.getByRole('button', { name }).click()
		await expect(page.getByRole('status').filter({ hasText: '校验通过' })).toBeVisible()
		await page.getByRole('button', { name: '无效样例' }).click()
		await expect(page.getByRole('status').filter({ hasText: '校验失败' })).toContainText(path)
	}
	const payload = page.getByRole('textbox', { name: 'JSON 样例数据' })
	await payload.fill('invalid-json')
	await expect(page.getByRole('status').filter({ hasText: 'JSON 格式有误' })).toBeVisible()
	await page.getByRole('button', { name: /基础字段/ }).click()
	await page.getByRole('button', { name: /注解约束/ }).click()
	await expect(payload).toHaveText('invalid-json')
	await page.getByRole('button', { name: '重置示例' }).click()
	await expect(page.getByRole('status').filter({ hasText: '校验通过' })).toBeVisible()
	await page.getByRole('link', { name: 'SDK 用法' }).click()
	const snippet = page.locator('#sdk-usage pre')
	await expect(snippet).toContainText('parseThriftToJsonSchema')
	await page.getByRole('button', { name: 'TypeBox 校验' }).click()
	await expect(snippet).toContainText('Compile(schema).Check')
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
})

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
