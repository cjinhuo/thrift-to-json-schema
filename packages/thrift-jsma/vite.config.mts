import { createLibraryConfig } from '../../utils/vite/library.ts'

// TypeBox 1 只发布 ESM，CommonJS 产物内联它，原生 ESM 入口继续共享消费者的依赖。
export default createLibraryConfig(import.meta.dirname, ['typebox'])
