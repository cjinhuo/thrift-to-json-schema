import { cpSync, readFileSync, statSync, writeFileSync } from 'node:fs'

// Keep the per-module ESM files and declarations shipped by earlier versions.
writeFileSync('esm/package.json', JSON.stringify({ type: 'module' }))
cpSync('esm', 'dist', {
	recursive: true,
	filter: (file) => statSync(file).isDirectory() || /\.d\.ts(?:\.map)?$/.test(file),
})

const declaration = readFileSync('dist/index.d.ts', 'utf8')
const declarationMap = JSON.parse(readFileSync('dist/index.d.ts.map', 'utf8'))
for (const extension of ['mts', 'cts']) {
	const filename = `index.d.${extension}`
	writeFileSync(
		`dist/${filename}`,
		declaration.replace('sourceMappingURL=index.d.ts.map', `sourceMappingURL=${filename}.map`)
	)
	writeFileSync(`dist/${filename}.map`, JSON.stringify({ ...declarationMap, file: filename }))
}
