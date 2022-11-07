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
  entries: [
    { find: /^@trasm\/thrift-jsma$/, replacement: join(packagesRoot, 'thrift-jsma', 'esm') },
  ],
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
