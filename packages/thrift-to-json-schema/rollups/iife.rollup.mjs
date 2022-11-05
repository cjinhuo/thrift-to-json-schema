import { getBasicPlugins, getBasicOutput, getDirName } from '@trasm/rollup'
import { join, resolve } from 'path'
import { createRequire } from 'node:module'

const currentPackageDir = getDirName()
const input = resolve(currentPackageDir, 'esm/index.js')
const packageDirDist = `${currentPackageDir}/dist`

const { name, version } = createRequire(import.meta.url)('../package.json')

const config = {
  input,
  external: [],
  output: {
    file: `${packageDirDist}/index.min.js`,
    format: 'iife',
    sourcemap: true,
    name: '_GLOBAL_',
    exports: 'named',
    ...getBasicOutput({ name, version }),
  },
  plugins: getBasicPlugins(),
}
export default config
