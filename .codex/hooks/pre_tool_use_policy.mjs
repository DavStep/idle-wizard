import { execFileSync } from 'node:child_process'
import process from 'node:process'

const DEV_PORT = '55173'
const GENERATED_BINDINGS_PATH = 'src/backend/spacetimedb/module_bindings'

function readStdin() {
  let input = ''
  process.stdin.setEncoding('utf8')
  return new Promise((resolve) => {
    process.stdin.on('data', (chunk) => {
      input += chunk
    })
    process.stdin.on('end', () => resolve(input))
  })
}

function writeDeny(reason) {
  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })}\n`,
  )
}

function normalizeCommand(command) {
  return String(command ?? '')
    .replace(/\\\s*\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getToolCommand(input) {
  const toolInput = input?.tool_input
  if (typeof toolInput === 'string') return toolInput
  return toolInput?.command ?? toolInput?.cmd ?? toolInput?.patch ?? ''
}

function isPortListening(port) {
  try {
    const output = execFileSync('lsof', [`-tiTCP:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return output.trim().length > 0
  } catch {
    return false
  }
}

function getExplicitPort(command) {
  return command.match(/(?:--port(?:=|\s+)|-p\s+)(\d{2,5})/)?.[1] ?? null
}

function startsSharedDevServer(command) {
  if (/\bnpm\s+run\s+(?:dev|stdb:dev)(?:\s|$|--)/.test(command)) return true
  if (/\bnpm\s+run\s+dev:[\w-]+/.test(command)) return false
  if (/\bvite\s+preview\b/.test(command)) return false
  return /\b(?:npx\s+)?vite\b/.test(command)
}

function isDirectViteDev(command) {
  if (/\bnpm\s+run\s+(?:dev|stdb:dev)(?:\s|$|--)/.test(command)) return false
  if (/\bvite\s+preview\b/.test(command)) return false
  return /\b(?:npx\s+)?vite\b/.test(command)
}

function commandMentionsGeneratedBindings(command) {
  return command.replaceAll('\\', '/').includes(GENERATED_BINDINGS_PATH)
}

function isAllowedGeneratedBindingsCommand(command) {
  return /\bnpm\s+run\s+stdb:generate\b/.test(command) || /\bspacetime\s+generate\b/.test(command)
}

function isLikelyWriteCommand(command) {
  return /(^|[\s;&|])(?:rm|mv|cp|touch|truncate)\s/.test(command)
    || /(^|[\s;&|])(?:sed|perl)\s+[^;&|]*\s-i(?:\s|$)/.test(command)
    || /(^|[\s;&|])tee\s+/.test(command)
    || />\s*[^&]/.test(command)
    || /\bwriteFile(?:Sync)?\b/.test(command)
}

function checkBash(command) {
  if (startsSharedDevServer(command)) {
    const explicitPort = getExplicitPort(command)
    if (explicitPort && explicitPort !== DEV_PORT) {
      return `Use shared Vite port ${DEV_PORT}; do not start dev server on ${explicitPort}.`
    }

    if (isDirectViteDev(command) && !explicitPort) {
      return `Use npm run dev or pass --port ${DEV_PORT} --strictPort for Vite.`
    }

    if (isDirectViteDev(command) && !/--strictPort\b/.test(command)) {
      return `Use --strictPort with Vite so it cannot auto-increment beyond ${DEV_PORT}.`
    }

    if (isPortListening(DEV_PORT)) {
      return `Vite port ${DEV_PORT} is already listening. Run npm run dev:status and reuse it.`
    }
  }

  if (
    commandMentionsGeneratedBindings(command)
    && isLikelyWriteCommand(command)
    && !isAllowedGeneratedBindingsCommand(command)
  ) {
    return `Generated SpacetimeDB bindings are read-only. Regenerate with npm run stdb:generate instead of editing ${GENERATED_BINDINGS_PATH}.`
  }

  return null
}

function checkPatch(command) {
  if (commandMentionsGeneratedBindings(command)) {
    return `Generated SpacetimeDB bindings are read-only. Regenerate with npm run stdb:generate instead of editing ${GENERATED_BINDINGS_PATH}.`
  }

  return null
}

const rawInput = await readStdin()
if (!rawInput.trim()) process.exit(0)

let input
try {
  input = JSON.parse(rawInput)
} catch {
  process.exit(0)
}

const toolName = String(input?.tool_name ?? '')
const command = normalizeCommand(getToolCommand(input))
let denial = null

if (toolName === 'Bash') {
  denial = checkBash(command)
} else if (/^(apply_patch|Edit|Write)$/.test(toolName)) {
  denial = checkPatch(command)
}

if (denial) {
  writeDeny(denial)
}
