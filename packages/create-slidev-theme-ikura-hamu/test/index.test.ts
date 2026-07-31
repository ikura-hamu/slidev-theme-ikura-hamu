import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  CliError,
  THEME_PACKAGE,
  collectTemplateEntries,
  copyTemplate,
  detectPackageManager,
  getCreateCommand,
  getDevCommand,
  getInstallCommand,
  runCli,
} from '../src/index.js'

test('detects the invoking package manager from the user agent', () => {
  for (const packageManager of ['npm', 'pnpm', 'yarn', 'bun'] as const) {
    assert.equal(
      detectPackageManager({ npm_config_user_agent: `${packageManager}/1.0.0 node/v24` }),
      packageManager,
    )
  }
})

test('falls back to npm_execpath and rejects unknown launchers', () => {
  assert.equal(detectPackageManager({ npm_execpath: '/tools/pnpm/bin/pnpm.cjs' }), 'pnpm')
  assert.equal(detectPackageManager({ npm_config_user_agent: 'unknown/1.0.0' }), undefined)
})

test('builds create and install commands for every supported manager', () => {
  for (const packageManager of ['npm', 'pnpm', 'yarn', 'bun'] as const) {
    assert.deepEqual(getCreateCommand(packageManager, 'talk'), {
      command: packageManager,
      args: ['create', 'slidev', 'talk'],
    })
    assert.deepEqual(getInstallCommand(packageManager), {
      command: packageManager,
      args: packageManager === 'npm'
        ? ['install', THEME_PACKAGE]
        : ['add', THEME_PACKAGE],
    })
    assert.deepEqual(getDevCommand(packageManager), {
      command: packageManager,
      args: ['run', 'dev'],
    })
  }
})

test('treats a missing or placeholder-only template as empty', async () => {
  const temporaryDirectory = await makeTemporaryDirectory()
  const missingTemplate = path.join(temporaryDirectory, 'missing')
  const template = path.join(temporaryDirectory, 'template')
  const target = path.join(temporaryDirectory, 'target')
  await mkdir(template)
  await writeFile(path.join(template, '.gitkeep'), '')

  assert.deepEqual(await collectTemplateEntries(missingTemplate, target), [])
  assert.deepEqual(await copyTemplate(template, target), [])
})

test('recursively copies files into existing directories', async () => {
  const temporaryDirectory = await makeTemporaryDirectory()
  const template = path.join(temporaryDirectory, 'template')
  const target = path.join(temporaryDirectory, 'target')
  await mkdir(path.join(template, 'components'), { recursive: true })
  await mkdir(path.join(target, 'components'), { recursive: true })
  await writeFile(path.join(template, 'components', 'Example.vue'), '<template />')

  const copied = await copyTemplate(template, target)

  assert.equal(copied.length, 1)
  assert.equal(
    await readFile(path.join(target, 'components', 'Example.vue'), 'utf8'),
    '<template />',
  )
})

test('overwrites existing files and copies new files', async () => {
  const temporaryDirectory = await makeTemporaryDirectory()
  const template = path.join(temporaryDirectory, 'template')
  const target = path.join(temporaryDirectory, 'target')
  await mkdir(template)
  await mkdir(target)
  await writeFile(path.join(template, 'existing.txt'), 'template')
  await writeFile(path.join(template, 'new.txt'), 'new')
  await writeFile(path.join(target, 'existing.txt'), 'generated')

  const copied = await copyTemplate(template, target)

  assert.equal(copied.length, 2)
  assert.equal(await readFile(path.join(target, 'existing.txt'), 'utf8'), 'template')
  assert.equal(await readFile(path.join(target, 'new.txt'), 'utf8'), 'new')
})

test('rejects a template directory that collides with a destination file', async () => {
  const temporaryDirectory = await makeTemporaryDirectory()
  const template = path.join(temporaryDirectory, 'template')
  const target = path.join(temporaryDirectory, 'target')
  await mkdir(path.join(template, 'components'), { recursive: true })
  await mkdir(target)
  await writeFile(path.join(template, 'components', 'Example.vue'), '<template />')
  await writeFile(path.join(template, 'safe.txt'), 'must not be copied')
  await writeFile(path.join(target, 'components'), 'not a directory')

  await assert.rejects(
    copyTemplate(template, target),
    error => error instanceof CliError && error.message.includes('components'),
  )
  await assert.rejects(readFile(path.join(target, 'safe.txt')), { code: 'ENOENT' })
})

test('runs create with an automatic No response, then installs and copies', async () => {
  const temporaryDirectory = await makeTemporaryDirectory()
  const template = path.join(temporaryDirectory, 'template')
  const target = path.join(temporaryDirectory, 'talk')
  const calls: Array<{
    command: string
    args: string[]
    cwd: string
    input: string | undefined
    npmConfigYes: string | undefined
  }> = []
  await mkdir(template)
  await writeFile(path.join(template, 'custom.md'), 'custom')

  const result = await runCli({
    argv: ['talk'],
    cwd: temporaryDirectory,
    env: { npm_config_user_agent: 'pnpm/11.0.0' },
    output: outputBuffer(),
    templateDirectory: template,
    execute: async (command, args, options) => {
      calls.push({
        command,
        args,
        cwd: options.cwd,
        input: options.input,
        npmConfigYes: options.env.npm_config_yes,
      })
      if (calls.length === 1) {
        await mkdir(target)
        await writeFile(path.join(target, 'package.json'), '{}')
      }
      return 0
    },
  })

  assert.deepEqual(calls, [
    {
      command: 'pnpm',
      args: ['create', 'slidev', 'talk'],
      cwd: temporaryDirectory,
      input: 'n\n',
      npmConfigYes: 'true',
    },
    {
      command: 'pnpm',
      args: ['add', THEME_PACKAGE],
      cwd: target,
      input: undefined,
      npmConfigYes: undefined,
    },
  ])
  assert.equal(await readFile(path.join(target, 'custom.md'), 'utf8'), 'custom')
  assert.equal(result.copiedFiles.length, 1)
})

test('starts the development server only after explicit confirmation', async () => {
  const temporaryDirectory = await makeTemporaryDirectory()
  const target = path.join(temporaryDirectory, 'talk')
  const calls: string[][] = []

  await runCli({
    argv: ['talk'],
    cwd: temporaryDirectory,
    env: { npm_config_user_agent: 'npm/11.0.0' },
    output: outputBuffer(),
    templateDirectory: path.join(temporaryDirectory, 'template'),
    confirmStart: async () => true,
    execute: async (command, args) => {
      calls.push([command, ...args])
      if (calls.length === 1) {
        await mkdir(target)
        await writeFile(path.join(target, 'package.json'), '{}')
      }
      return 0
    },
  })

  assert.deepEqual(calls, [
    ['npm', 'create', 'slidev', 'talk'],
    ['npm', 'install', THEME_PACKAGE],
    ['npm', 'run', 'dev'],
  ])
})

test('rejects non-empty targets before running create-slidev', async () => {
  const temporaryDirectory = await makeTemporaryDirectory()
  const target = path.join(temporaryDirectory, 'talk')
  let callCount = 0
  await mkdir(target)
  await writeFile(path.join(target, 'existing.txt'), 'existing')

  await assert.rejects(
    runCli({
      argv: ['talk'],
      cwd: temporaryDirectory,
      env: { npm_config_user_agent: 'pnpm/11.0.0' },
      output: outputBuffer(),
      execute: async () => {
        callCount += 1
        return 0
      },
    }),
    error => error instanceof CliError && error.message.includes('not empty'),
  )
  assert.equal(callCount, 0)
})

test('does not install or copy when create-slidev fails', async () => {
  const temporaryDirectory = await makeTemporaryDirectory()
  let callCount = 0

  await assert.rejects(
    runCli({
      argv: ['talk'],
      cwd: temporaryDirectory,
      env: { npm_config_user_agent: 'npm/11.0.0' },
      output: outputBuffer(),
      templateDirectory: path.join(temporaryDirectory, 'template'),
      execute: async () => {
        callCount += 1
        return 7
      },
    }),
    error => error instanceof CliError && error.exitCode === 7,
  )
  assert.equal(callCount, 1)
})

test('does not copy when theme installation fails', async () => {
  const temporaryDirectory = await makeTemporaryDirectory()
  const template = path.join(temporaryDirectory, 'template')
  const target = path.join(temporaryDirectory, 'talk')
  let callCount = 0
  await mkdir(template)
  await writeFile(path.join(template, 'custom.md'), 'custom')

  await assert.rejects(
    runCli({
      argv: ['talk'],
      cwd: temporaryDirectory,
      env: { npm_config_user_agent: 'bun/1.0.0' },
      output: outputBuffer(),
      templateDirectory: template,
      execute: async () => {
        callCount += 1
        if (callCount === 1) {
          await mkdir(target)
          await writeFile(path.join(target, 'package.json'), '{}')
          return 0
        }
        return 9
      },
    }),
    error => error instanceof CliError && error.exitCode === 9,
  )
  await assert.rejects(readFile(path.join(target, 'custom.md')), { code: 'ENOENT' })
})

test('requires a target in a non-interactive terminal', async () => {
  await assert.rejects(
    runCli({
      argv: [],
      input: { isTTY: false },
      output: outputBuffer(),
    }),
    error => error instanceof CliError && error.message.includes('required'),
  )
})

function outputBuffer(): { isTTY: boolean, text: string, write: (chunk: string) => void } {
  return {
    isTTY: false,
    text: '',
    write(chunk: string) {
      this.text += chunk
    },
  }
}

async function makeTemporaryDirectory(): Promise<string> {
  return await mkdtemp(path.join(os.tmpdir(), 'create-slidev-theme-'))
}
