import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type LibraryFormats } from 'vite'

const packagesRoot = fileURLToPath(new URL('../../packages/', import.meta.url))

export const workspaceAliases = Object.fromEntries(
	['shared', 'thrift-jsma'].map((name) => [`@trasm/${name}`, resolve(packagesRoot, name, 'src/index.ts')])
)

export const browserAliases = {
	...workspaceAliases,
	os: fileURLToPath(new URL('./browser-os.ts', import.meta.url)),
}

export function createLibraryConfig(directory: string, bundleForCommonJS: string[] = []) {
	const { name, version, dependencies = {} } = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'))
	const defaultFormats: LibraryFormats[] = bundleForCommonJS.length ? ['es'] : ['es', 'cjs']
	return defineConfig(({ mode }) => {
		const standalone = mode === 'standalone'
		const commonjs = mode === 'commonjs'
		const external = Object.keys(dependencies).filter((dep) => !commonjs || !bundleForCommonJS.includes(dep))
		return {
			resolve: { alias: standalone ? browserAliases : workspaceAliases },
			build: {
				target: 'es2015',
				minify: false,
				sourcemap: true,
				emptyOutDir: !standalone && !commonjs,
				lib: {
					entry: resolve(directory, 'src/index.ts'),
					name: '_GLOBAL_',
					formats: standalone ? ['es', 'iife'] : commonjs ? ['cjs'] : defaultFormats,
					fileName(format) {
						if (format === 'cjs') return 'index.js'
						if (format === 'iife') return 'index.min.js'
						return standalone ? 'index.esm.js' : 'index.mjs'
					},
				},
				rolldownOptions: {
					external: standalone ? [] : external,
					output: {
						exports: 'named',
						banner: `/* ${name} version:${version} */`,
					},
				},
			},
		}
	})
}
