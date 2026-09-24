import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

function adminApiPlugin(env: Record<string, string>) {
  return {
    name: 'admin-api',
    async configureServer(server: {
      middlewares: { use: (path: string, fn: (req: unknown, res: unknown) => void) => void }
    }) {
      process.env.SUPABASE_URL ||= env.SUPABASE_URL || env.VITE_SUPABASE_URL || ''
      process.env.SUPABASE_SERVICE_ROLE_KEY ||= env.SUPABASE_SERVICE_ROLE_KEY || ''
      const mod = await import(pathToFileURL(resolve(process.cwd(), 'api/admin.js')).href)
      const handler = mod.default as (req: unknown, res: unknown) => Promise<void>
      server.middlewares.use('/api/admin', (req, res) => {
        void handler(req, res)
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), adminApiPlugin(env)],
  }
})
