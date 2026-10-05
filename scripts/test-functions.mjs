// Runs all Edge Function tests with Deno using the shared functions import map.
import { spawnSync } from 'node:child_process'

const r = spawnSync('deno', ['test', '-A', '--config', 'supabase/functions/deno.json', 'supabase/functions'], { stdio: 'inherit', shell: process.platform === 'win32' })
process.exit(r.status ?? 1)
