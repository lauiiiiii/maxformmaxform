import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const isWindows = process.platform === 'win32'

function createNpmInvocation(args) {
  if (isWindows) {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', ['npm', ...args].join(' ')]
    }
  }

  return {
    command: 'npm',
    args
  }
}

const suites = {
  backend: {
    label: 'backend unit tests',
    ...createNpmInvocation(['--prefix', 'backend', 'test']),
    cwd: repoRoot
  },
  'frontend-build': {
    label: 'frontend typecheck + build',
    ...createNpmInvocation(['--prefix', 'frontend', 'run', 'build']),
    cwd: repoRoot
  },
  'smoke-root': {
    label: 'repo-root smoke',
    command: process.execPath,
    args: ['scripts/system-smoke.mjs'],
    cwd: repoRoot
  },
  'smoke-frontend': {
    label: 'frontend smoke alias',
    ...createNpmInvocation(['--prefix', 'frontend', 'run', 'smoke:system']),
    cwd: repoRoot
  },
  e2e: {
    label: 'playwright e2e',
    ...createNpmInvocation(['--prefix', 'frontend', 'run', 'test:e2e']),
    cwd: repoRoot
  }
}

const presets = {
  quick: ['backend', 'frontend-build'],
  smoke: ['smoke-root', 'smoke-frontend'],
  full: ['backend', 'frontend-build', 'smoke-root', 'smoke-frontend', 'e2e']
}

function expandTargets(argv) {
  const requested = argv.length > 0 ? argv : ['quick']
  const resolved = []

  for (const name of requested) {
    if (presets[name]) {
      resolved.push(...presets[name])
      continue
    }
    if (suites[name]) {
      resolved.push(name)
      continue
    }
    throw new Error(`unknown test target: ${name}`)
  }

  return [...new Set(resolved)]
}

function formatDuration(startTime) {
  const durationMs = Date.now() - startTime
  return `${(durationMs / 1000).toFixed(1)}s`
}

function runSuite(name) {
  const suite = suites[name]
  if (!suite) {
    return Promise.reject(new Error(`missing suite configuration: ${name}`))
  }

  return new Promise(resolve => {
    const startTime = Date.now()
    const child = spawn(suite.command, suite.args, {
      cwd: suite.cwd,
      env: process.env,
      stdio: 'inherit'
    })

    child.on('exit', (code, signal) => {
      resolve({
        name,
        label: suite.label,
        code: code ?? 1,
        signal: signal ?? null,
        duration: formatDuration(startTime)
      })
    })

    child.on('error', error => {
      resolve({
        name,
        label: suite.label,
        code: 1,
        signal: null,
        duration: formatDuration(startTime),
        error: String(error)
      })
    })
  })
}

async function main() {
  const targets = expandTargets(process.argv.slice(2))
  const results = []

  console.log(
    JSON.stringify(
      {
        mode: 'test-suite',
        targets
      },
      null,
      2
    )
  )

  for (const name of targets) {
    const suite = suites[name]
    console.log(`\n[test-suite] start ${suite.label}`)
    const result = await runSuite(name)
    results.push(result)

    if (result.code === 0) {
      console.log(`[test-suite] pass ${result.label} (${result.duration})`)
      continue
    }

    if (result.error) {
      console.error(`[test-suite] error ${result.label}: ${result.error}`)
    } else if (result.signal) {
      console.error(`[test-suite] fail ${result.label}: signal=${result.signal} (${result.duration})`)
    } else {
      console.error(`[test-suite] fail ${result.label}: exit=${result.code} (${result.duration})`)
    }
    break
  }

  const failed = results.find(result => result.code !== 0)
  console.log(
    `\n[test-suite] summary ${results
      .map(result => `${result.name}=${result.code === 0 ? 'pass' : 'fail'}@${result.duration}`)
      .join(', ')}`
  )

  if (failed) {
    process.exitCode = failed.code || 1
  }
}

main().catch(error => {
  console.error(`[test-suite] fatal ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
