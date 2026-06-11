import process from 'node:process'

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

function writeContext(additionalContext) {
  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext,
      },
    })}\n`,
  )
}

const rawInput = await readStdin()
if (!rawInput.trim()) process.exit(0)

let input
try {
  input = JSON.parse(rawInput)
} catch {
  process.exit(0)
}

const prompt = String(input?.prompt ?? '').toLowerCase()
const gameplayTerms = [
  'gameplay',
  'seed',
  'seeds',
  'herb',
  'herbs',
  'potion',
  'potions',
  'selling',
  'economy',
  'inventory',
  'progression',
]
const implementationVerbs = /\b(add|build|change|create|enable|implement|make|refactor|wire)\b/

if (implementationVerbs.test(prompt) && gameplayTerms.some((term) => prompt.includes(term))) {
  writeContext(
    'Idle Wizard project rule: if requested gameplay behavior is unclear, ask before implementing. Do not invent seed, herb, potion, selling, economy, inventory, or progression behavior beyond the explicit user request.',
  )
}
