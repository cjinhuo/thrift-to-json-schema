import { expect, test } from '@playwright/test'

test.use({ javaScriptEnabled: false })

test('the published playground explains the conversion before the editor loads', async ({ page }) => {
	await page.goto('http://127.0.0.1:4173/thrift-to-json-schema/')
	await expect(page.getByRole('heading', { level: 1 })).toContainText('JSON Schema')
	await expect(page.locator('main')).toContainText('struct User')
	await expect(page.locator('main')).toContainText('@trasm/thrift-jsma')
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		'https://cjinhuo.github.io/thrift-to-json-schema/'
	)
})

test('the localized guides are real documents with reciprocal language links', async ({ page }) => {
	for (const [slug, language] of [
		['guide', 'zh-CN'],
		['en', 'en'],
	]) {
		const response = await page.goto(`http://127.0.0.1:4173/thrift-to-json-schema/${slug}/`)
		expect(response?.status()).toBe(200)
		await expect(page.locator('html')).toHaveAttribute('lang', language)
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			`https://cjinhuo.github.io/thrift-to-json-schema/${slug}/`
		)
		for (const [alternate, alternateSlug] of [
			['zh-CN', 'guide'],
			['en', 'en'],
		]) {
			await expect(page.locator(`link[rel="alternate"][hreflang="${alternate}"]`)).toHaveAttribute(
				'href',
				`https://cjinhuo.github.io/thrift-to-json-schema/${alternateSlug}/`
			)
		}
		await expect(page.locator('main')).toContainText('child.$ref === schema.$id')
		await expect(page.locator('main')).toContainText("validator.Check({ name: 'Ada' })")
	}
})
