import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    express: 'src/express/index.ts',
    koa: 'src/koa/index.ts',
    hono: 'src/hono/index.ts',
  },
})
