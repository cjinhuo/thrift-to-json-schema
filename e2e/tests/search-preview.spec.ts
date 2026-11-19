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
