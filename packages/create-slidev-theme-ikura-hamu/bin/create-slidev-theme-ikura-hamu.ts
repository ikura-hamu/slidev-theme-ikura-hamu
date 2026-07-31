#!/usr/bin/env node

import process from 'node:process'

import { CliError, runCli } from '../src/index.js'

runCli().catch((error: unknown) => {
  console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = error instanceof CliError ? error.exitCode : 1
})
