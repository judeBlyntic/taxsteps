// Typechecks every Edge Function entrypoint, then runs all function tests with Deno.
import { spawnSync } from 'node:child_process'
import { readdirSync, existsSync } from 'node:fs'

const opts = { stdio: 'inherit', shell: process.platform === 'win32' }
const config = ['--config', 'supabase/functions/deno.json']
const entries = readdirSync('supabase/functions', { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`supabase/functions/${d.name}/index.ts`))
  .map((d) => `supabase/functions/${d.name}/index.ts`)

const check = spawnSync('deno', ['check', '--allow-import', ...config, ...entries], opts)
if (check.status !== 0) process.exit(check.status ?? 1)
const test = spawnSync('deno', ['test', '-A', ...config, 'supabase/functions'], opts)
process.exit(test.status ?? 1)
