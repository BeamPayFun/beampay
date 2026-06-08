#!/usr/bin/env node
/**
 * Sync the API reference from the beampay-api source of truth.
 *
 *   1. run `pnpm openapi` in ../beampay-api → docs/api/openapi.json (the committed,
 *      machine-consumable spec; the generator also fails if its route table has
 *      drifted from the live Hono app).
 *   2. render docs/api/openapi.json → docs/api/reference.md (human-readable).
 *
 * Assumes the sibling-clone layout (beampay-api checked out next to this repo). The
 * spec + reference are committed; a CI drift-guard can re-run this and `git diff
 * --exit-code`.
 *
 * Usage:  node scripts/sync-api-docs.mjs
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const apiRepo = resolve(repoRoot, '..', 'beampay-api')
const specOut = join(repoRoot, 'docs', 'api', 'openapi.json')
const refOut = join(repoRoot, 'docs', 'api', 'reference.md')

if (!existsSync(apiRepo)) {
  console.error(`beampay-api not found at ${apiRepo} (expected sibling-clone layout)`)
  process.exit(1)
}

const run = (cmd, args, opts) =>
  execFileSync(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'], ...opts })

console.error(`> generating spec via ${apiRepo}`)
run('pnpm', ['--dir', apiRepo, 'openapi', specOut])

console.error('> rendering reference.md')
run('node', [join(repoRoot, 'scripts', 'render-openapi.mjs'), specOut, refOut])

console.error('API docs synced.')
