#!/usr/bin/env node
/**
 * Verifies local dev servers are on the expected ports with the correct apps.
 * Run after `pnpm dev` if CSS or assets fail to load.
 */
import http from 'node:http'

const EXPECTED = [
  { port: 3000, title: 'Upward', name: '@upward/web (gateway)' },
  { port: 3001, title: 'Upward Pay', name: 'upward-pay (tenant app)' },
  { port: 3002, title: 'Upward PM', name: 'upward-pm (manager app)' },
]

function fetchTitle(port, path = '/') {
  return new Promise((resolve) => {
    const req = http.get({ hostname: 'localhost', port, path, timeout: 3000 }, (res) => {
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('end', () => {
        const match = body.match(/<title>([^<]+)/i)
        resolve({ status: res.statusCode, title: match?.[1]?.trim() ?? null })
      })
    })
    req.on('error', () => resolve({ status: 0, title: null }))
    req.on('timeout', () => {
      req.destroy()
      resolve({ status: 0, title: null })
    })
  })
}

function fetchAssetStatus(port, assetPath) {
  return new Promise((resolve) => {
    const req = http.get({ hostname: 'localhost', port, path: assetPath, timeout: 3000 }, (res) => {
      res.resume()
      resolve(res.statusCode)
    })
    req.on('error', () => resolve(0))
    req.on('timeout', () => {
      req.destroy()
      resolve(0)
    })
  })
}

let failed = false

console.log('\nUpward dev port check\n')

for (const { port, title, name } of EXPECTED) {
  const { status, title: actual } = await fetchTitle(port)
  const ok = status > 0 && actual?.includes(title)

  if (ok) {
    console.log(`✅ :${port}  ${name}`)
  } else {
    failed = true
    console.log(`❌ :${port}  ${name}`)
    console.log(
      `   expected title containing "${title}", got ${status ? `"${actual}"` : 'no response'}`,
    )
  }
}

const payCss = '/_next/static/chunks/%5Broot-of-the-server%5D__0ir-pi9._.css'
const payCssStatus = await fetchAssetStatus(3001, payCss)

if (payCssStatus === 200) {
  console.log(`✅ :3001  pay CSS bundle reachable`)
} else {
  failed = true
  console.log(`❌ :3001  pay CSS bundle returned HTTP ${payCssStatus || 'error'}`)
  console.log('   Wrong app may be bound to 3001, or upward-pay needs a restart.')
}

if (failed) {
  console.log(`
Fix stale port bindings:
  lsof -ti :3000,:3001,:3002 | xargs kill -9
  rm -rf client/apps/web/.next client/apps/upward-pay/.next client/apps/upward-pm/.next
  pnpm dev
`)
  process.exit(1)
}

console.log('\nAll dev ports look correct.\n')
