import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { browserAliases } from '../../utils/vite/library.ts'

// https://vitejs.dev/config/
export default defineConfig(({ command, isPreview }) => ({
	base: command === 'build' || isPreview ? '/thrift-to-json-schema/' : '/',
	build: { outDir: '../../dist', emptyOutDir: true },
	plugins: [react()],
	resolve: { alias: browserAliases },
}))
