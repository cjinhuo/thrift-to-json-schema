import { join, resolve } from 'path'

export function getDirName() {
  const __dirname = resolve()
  return join(__dirname)
}
