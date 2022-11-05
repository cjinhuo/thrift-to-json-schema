import commonjs from '@rollup/plugin-commonjs'
import cleanup from 'rollup-plugin-cleanup'
import size from 'rollup-plugin-sizes'
import alias from '@rollup/plugin-alias'
import json from '@rollup/plugin-json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { join, resolve, dirname } from 'path'
import url from 'url'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packagesRoot = resolve(__dirname, '../../../packages')
const aliasConfig = alias({
  entries: [{ find: /^@trasm\/core$/, replacement: join(packagesRoot, 'core', 'esm') }],
  entries: [{ find: /^@trasm\/web$/, replacement: join(packagesRoot, 'web', 'esm') }],
  entries: [{ find: /^@trasm\/react$/, replacement: join(packagesRoot, 'react', 'esm') }],
  entries: [{ find: /^@trasm\/shared$/, replacement: join(packagesRoot, 'shared', 'esm') }],
})

export function getBasicPlugins(aliasPlguin = aliasConfig) {
  return [
    aliasPlguin,
    nodeResolve(),
    size(),
    commonjs({
      exclude: 'node_modules',
    }),
    json(),
    cleanup({
      comments: 'none',
    }),
  ]
  // 外部依赖，也是防止重复打包的配置
  // external: [],
}
