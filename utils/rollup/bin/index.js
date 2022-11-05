import fg from 'fast-glob'
import { join } from 'path'
import { execa } from 'execa'
import os from 'node:os'
import { minimist } from './common/minimist.js'
import consola from 'consola'

const argv = minimist(process.argv.slice(2))
const folder = argv.f || argv.folder
const parallelArgv = argv.p || argv.parallel
const maxParallel = parallelArgv ? Number(parallelArgv) : os.cpus().length

if (!folder) {
  throw new Error('please pass correct folder')
}
const rollupRunRoot = join(process.env.PWD, folder)

runParallel(
  maxParallel,
  getAllRollupEntries(rollupRunRoot).map((url) => async () => {
    await build(url)
  })
)

function getAllRollupEntries(rootDir) {
  return fg.sync(`${rootDir}/*rollup.mjs`, { onlyFiles: true })
}

async function build(rollupEntry) {
  consola.info('rollup -c', rollupEntry)
  await execa(`rollup`, ['-c', rollupEntry], { stdio: 'inherit' })
}

async function runParallel(maxConcurrency, source) {
  const ret = []
  const executing = []
  for (const item of source) {
    const p = Promise.resolve().then(() => item())
    ret.push(p)

    if (maxConcurrency <= source.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1))
      executing.push(e)
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing)
      }
    }
  }
  return Promise.all(ret)
}
