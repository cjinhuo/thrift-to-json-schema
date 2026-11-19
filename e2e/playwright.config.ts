import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const root = fileURLToPath(new URL('../', import.meta.url))

export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 2 : undefined,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: { trace: 'retain-on-failure' },
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'] } },
	],
	webServer: [
		{
			command: 'pnpm --filter @trasm/parser-view preview --host 127.0.0.1 --port 4173 --strictPort',
			cwd: root,
			url: 'http://127.0.0.1:4173/thrift-to-json-schema/',
			reuseExistingServer: false,
		},
		{
			command: 'pnpm --filter @trasm/parser-view dev --host 127.0.0.1 --port 5174 --strictPort',
			cwd: root,
			url: 'http://127.0.0.1:5174',
			reuseExistingServer: false,
		},
	],
})
