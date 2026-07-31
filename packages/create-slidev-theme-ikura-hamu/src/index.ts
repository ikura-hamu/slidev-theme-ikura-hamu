import { spawn } from 'node:child_process'
import { access, copyFile, lstat, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

export const THEME_PACKAGE = '@ikura-hamu/slidev-theme-ikura-hamu'
export const SUPPORTED_PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const

export type PackageManager = typeof SUPPORTED_PACKAGE_MANAGERS[number]

interface Command {
  command: PackageManager
  args: string[]
}

interface CommandOptions {
  cwd: string
  env: NodeJS.ProcessEnv
  input?: string
}

interface TemplateEntry {
  type: 'directory' | 'file'
  relativePath: string
  source: string
  destination: string
}

interface CliInput {
  isTTY?: boolean
}

interface CliOutput {
  isTTY?: boolean
  write(chunk: string): unknown
}

type Execute = (command: string, args: string[], options: CommandOptions) => Promise<number>
type ConfirmStart = () => Promise<boolean>

interface RunCliOptions {
  argv?: string[]
  env?: NodeJS.ProcessEnv
  cwd?: string
  input?: CliInput
  output?: CliOutput
  execute?: Execute
  confirmStart?: ConfirmStart
  templateDirectory?: string
}

interface RunCliResult {
  packageManager: PackageManager
  targetDirectory: string
  copiedFiles: TemplateEntry[]
}

const defaultTemplateDirectory = fileURLToPath(new URL('../../template', import.meta.url))

export class CliError extends Error {
  exitCode: number

  constructor(message: string, exitCode = 1) {
    super(message)
    this.name = 'CliError'
    this.exitCode = exitCode
  }
}

export function detectPackageManager(env: NodeJS.ProcessEnv = process.env): PackageManager | undefined {
  const userAgent = env.npm_config_user_agent?.toLowerCase()
  const userAgentName = userAgent?.split('/')[0]

  if (isPackageManager(userAgentName))
    return userAgentName

  const execPath = env.npm_execpath?.toLowerCase() ?? ''
  return (['pnpm', 'yarn', 'bun', 'npm'] as const).find(manager => execPath.includes(manager))
}

export function getCreateCommand(packageManager: PackageManager, targetDirectory: string): Command {
  return {
    command: packageManager,
    args: ['create', 'slidev', targetDirectory],
  }
}

export function getInstallCommand(packageManager: PackageManager): Command {
  return {
    command: packageManager,
    args: packageManager === 'npm'
      ? ['install', THEME_PACKAGE]
      : ['add', THEME_PACKAGE],
  }
}

export function getDevCommand(packageManager: PackageManager): Command {
  return {
    command: packageManager,
    args: ['run', 'dev'],
  }
}

export async function collectTemplateEntries(
  templateDirectory: string,
  targetDirectory: string,
): Promise<TemplateEntry[]> {
  if (!await pathExists(templateDirectory))
    return []

  const entries: TemplateEntry[] = []
  await walkTemplate(templateDirectory, targetDirectory, '', entries)
  return entries
}

export async function findCopyConflicts(entries: TemplateEntry[]): Promise<string[]> {
  const conflicts: string[] = []
  const blockedDirectories: string[] = []

  for (const entry of entries) {
    if (blockedDirectories.some(directory => entry.relativePath.startsWith(`${directory}${path.sep}`)))
      continue

    const destinationStat = await tryLstat(entry.destination)
    if (!destinationStat)
      continue

    if (entry.type === 'directory' && destinationStat.isDirectory())
      continue

    if (entry.type === 'file' && destinationStat.isFile())
      continue

    conflicts.push(entry.relativePath)
    if (entry.type === 'directory')
      blockedDirectories.push(entry.relativePath)
  }

  return conflicts
}

export async function copyTemplate(
  templateDirectory: string,
  targetDirectory: string,
): Promise<TemplateEntry[]> {
  const entries = await collectTemplateEntries(templateDirectory, targetDirectory)
  const conflicts = await findCopyConflicts(entries)

  if (conflicts.length > 0)
    throw copyConflictError(conflicts)

  for (const entry of entries) {
    if (entry.type === 'directory')
      await mkdir(entry.destination, { recursive: true })
    else
      await copyFile(entry.source, entry.destination)
  }

  return entries.filter(entry => entry.type === 'file')
}

export async function executeCommand(
  command: string,
  args: string[],
  options: CommandOptions,
): Promise<number> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: [options.input === undefined ? 'inherit' : 'pipe', 'inherit', 'inherit'],
    })

    child.once('error', reject)
    child.once('close', (code, signal) => {
      resolve(signal ? 1 : (code ?? 1))
    })

    if (options.input !== undefined)
      child.stdin?.end(options.input)
  })
}

export async function runCli(options: RunCliOptions = {}): Promise<RunCliResult> {
  const argv = options.argv ?? process.argv.slice(2)
  const env = options.env ?? process.env
  const cwd = options.cwd ?? process.cwd()
  const input = options.input ?? process.stdin
  const output = options.output ?? process.stdout
  const execute = options.execute ?? executeCommand
  const templateDirectory = options.templateDirectory ?? defaultTemplateDirectory

  const targetArgument = await resolveTargetDirectory(argv, input, output)
  const packageManager = detectPackageManager(env)
  if (!packageManager) {
    throw new CliError(
      'Could not detect the package manager used to run this creator. Use npm, pnpm, Yarn, or Bun.',
    )
  }

  const targetDirectory = path.resolve(cwd, targetArgument)
  const createCommand = getCreateCommand(packageManager, targetArgument)
  await assertTargetIsEmpty(targetDirectory)

  output.write(`Using ${packageManager}.\n`)
  output.write('Creating the Slidev project without starting its development server.\n\n')

  await runStep(execute, createCommand, {
    cwd,
    env: { ...env, npm_config_yes: 'true' },
    input: 'n\n',
  }, 'create-slidev')

  if (!await pathExists(path.join(targetDirectory, 'package.json'))) {
    throw new CliError(
      `create-slidev did not create a package.json in ${targetDirectory}.`,
    )
  }

  const entries = await collectTemplateEntries(templateDirectory, targetDirectory)
  const conflicts = await findCopyConflicts(entries)
  if (conflicts.length > 0)
    throw copyConflictError(conflicts)

  const installCommand = getInstallCommand(packageManager)
  await runStep(execute, installCommand, { cwd: targetDirectory, env }, 'theme installation')

  const copiedFiles = await copyTemplate(templateDirectory, targetDirectory)
  output.write(`\nCreated Slidev project in ${targetDirectory}.\n`)
  output.write(`Installed ${THEME_PACKAGE}.\n`)
  output.write(`Copied ${copiedFiles.length} template file${copiedFiles.length === 1 ? '' : 's'}.\n`)

  const shouldStart = options.confirmStart
    ? await options.confirmStart()
    : await confirmStartDevServer(input, output)
  if (shouldStart) {
    const devCommand = getDevCommand(packageManager)
    await runStep(execute, devCommand, { cwd: targetDirectory, env }, 'development server')
  }
  else {
    output.write(`Start it later with: ${packageManager} run dev\n`)
  }

  return {
    packageManager,
    targetDirectory,
    copiedFiles,
  }
}

async function assertTargetIsEmpty(targetDirectory: string): Promise<void> {
  const targetStat = await tryLstat(targetDirectory)
  if (!targetStat)
    return

  if (!targetStat.isDirectory())
    throw new CliError(`Target path is not a directory: ${targetDirectory}`)

  const existingEntries = await readdir(targetDirectory)
  if (existingEntries.length > 0) {
    throw new CliError(
      `Target directory is not empty: ${targetDirectory}. Choose an empty directory so create-slidev can run non-interactively.`,
    )
  }
}

async function confirmStartDevServer(input: CliInput, output: CliOutput): Promise<boolean> {
  if (!input.isTTY || !output.isTTY)
    return false

  const readline = createInterface({
    input: input as NodeJS.ReadableStream,
    output: output as NodeJS.WritableStream,
  })
  try {
    const answer = (await readline.question('Start the development server now? (y/N) '))
      .trim()
      .toLowerCase()
    return answer === 'y' || answer === 'yes'
  }
  finally {
    readline.close()
  }
}

async function resolveTargetDirectory(
  argv: string[],
  input: CliInput,
  output: CliOutput,
): Promise<string> {
  if (argv.length > 1)
    throw new CliError('Expected at most one project directory argument.')

  const argument = argv[0]?.trim()
  if (argument)
    return argument

  if (!input.isTTY || !output.isTTY)
    throw new CliError('A project directory argument is required in a non-interactive terminal.')

  const readline = createInterface({
    input: input as NodeJS.ReadableStream,
    output: output as NodeJS.WritableStream,
  })
  try {
    const answer = (await readline.question('Project directory: ')).trim()
    if (!answer)
      throw new CliError('Project directory cannot be empty.')
    return answer
  }
  finally {
    readline.close()
  }
}

async function runStep(
  execute: Execute,
  command: Command,
  options: CommandOptions,
  label: string,
): Promise<void> {
  const exitCode = await execute(command.command, command.args, options)
  if (exitCode !== 0)
    throw new CliError(`${label} failed with exit code ${exitCode}.`, exitCode)
}

async function walkTemplate(
  templateDirectory: string,
  targetDirectory: string,
  relativeDirectory: string,
  entries: TemplateEntry[],
): Promise<void> {
  const currentDirectory = path.join(templateDirectory, relativeDirectory)
  const children = await readdir(currentDirectory, { withFileTypes: true })

  for (const child of children.sort((a, b) => a.name.localeCompare(b.name))) {
    if (child.name === '.gitkeep')
      continue

    const relativePath = path.join(relativeDirectory, child.name)
    const source = path.join(templateDirectory, relativePath)
    const destination = path.join(targetDirectory, relativePath)

    if (child.isSymbolicLink())
      throw new CliError(`Template symlinks are not supported: ${relativePath}`)

    if (child.isDirectory()) {
      entries.push({ type: 'directory', relativePath, source, destination })
      await walkTemplate(templateDirectory, targetDirectory, relativePath, entries)
    }
    else if (child.isFile()) {
      entries.push({ type: 'file', relativePath, source, destination })
    }
    else {
      throw new CliError(`Unsupported template entry: ${relativePath}`)
    }
  }
}

function isPackageManager(value: string | undefined): value is PackageManager {
  return SUPPORTED_PACKAGE_MANAGERS.some(packageManager => packageManager === value)
}

function copyConflictError(conflicts: string[]): CliError {
  return new CliError(
    `Template files conflict with the generated project:\n${conflicts.map(file => `  - ${file}`).join('\n')}`,
  )
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  }
  catch {
    return false
  }
}

async function tryLstat(filePath: string): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
  try {
    return await lstat(filePath)
  }
  catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT')
      return undefined
    throw error
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error
}
