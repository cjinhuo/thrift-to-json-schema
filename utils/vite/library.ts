import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const packagesRoot = fileURLToPath(new URL('../../packages/', import.meta.url))

export const workspaceAliases = Object.fromEntries(
	['shared', 'thrift-jsma'].map((name) => [`@trasm/${name}`, resolve(packagesRoot, name, 'src/index.ts')])
)

export const browserAliases = {
	...workspaceAliases,
	os: fileURLToPath(new URL('./browser-os.ts', import.meta.url)),
}

export function createLibraryConfig(directory: string) {
	const { name, version, dependencies = {} } = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'))
	return defineConfig(({ mode }) => {
		const standalone = mode === 'standalone'
		return {
			resolve: { alias: standalone ? browserAliases : workspaceAliases },
			build: {
				target: 'es2015',
				minify: false,
				sourcemap: true,
				emptyOutDir: !standalone,
				lib: {
					entry: resolve(directory, 'src/index.ts'),
					name: '_GLOBAL_',
					formats: standalone ? ['es', 'iife'] : ['es', 'cjs'],
					fileName(format) {
						if (format === 'cjs') return 'index.js'
						if (format === 'iife') return 'index.min.js'
						return standalone ? 'index.esm.js' : 'index.mjs'
					},
				},
				rolldownOptions: {
					external: standalone ? [] : Object.keys(dependencies),
					output: {
						exports: 'named',
						banner: `/* ${name} version:${version} */`,
					},
				},
			},
		}
	})
}
