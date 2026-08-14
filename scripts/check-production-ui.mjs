#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { Linter } from 'eslint';
import { build } from 'vite';

const RESTRICTED_ELEMENT_RULES = Object.freeze({
  canvas: 'extra-canvas-creation',
  form: 'html-form-creation',
  input: 'html-input-creation',
  select: 'html-select-creation',
  textarea: 'html-textarea-creation',
});

const DOM_QUERY_METHODS = new Set([
  'getElementById',
  'getElementsByClassName',
  'getElementsByName',
  'getElementsByTagName',
  'querySelector',
  'querySelectorAll',
]);

const DOM_CONSTRUCTION_METHODS = new Set([
  'createDocumentFragment',
  'createElement',
  'createElementNS',
  'createRange',
  'createTextNode',
  'write',
  'writeln',
]);

const CANVAS_CONSTRUCTORS = new Set([
  'HTMLCanvasElement',
  'OffscreenCanvas',
]);

const RESTRICTED_HTML_CONSTRUCTORS = Object.freeze({
  HTMLFormElement: 'html-form-creation',
  HTMLInputElement: 'html-input-creation',
  HTMLSelectElement: 'html-select-creation',
  HTMLTextAreaElement: 'html-textarea-creation',
});

const DEFAULT_DEV_MODULE_PREFIXES = Object.freeze(['src/dev/']);

const AUTH_DOM_EXCEPTIONS = Object.freeze({
  'src/backend/auth/managers/AuthOidcManager.js': Object.freeze({
    createElementTags: Object.freeze(['script']),
    querySelectorPrefixes: Object.freeze(['script[src="']),
  }),
  'src/backend/auth/managers/AuthMobileRedirectBridgeManager.js':
    Object.freeze({
      createElementTags: Object.freeze([
        'button',
        'div',
        'main',
        'p',
        'section',
      ]),
      querySelectorValues: Object.freeze(['#app']),
    }),
});

const SCANNABLE_MODULE_PATTERN = /\.[cm]?[jt]sx?$/i;
const PRODUCTION_HTML_ALLOWED_BODY_TAGS = new Set(['canvas', 'script']);
const BLOCKER_SENSITIVE_FILE_TOKEN_PATTERN =
  /(?:^|[./_-])(?:ads?|advert(?:ising|isement)?s?|analytics|banner|beacon|sponsors?|tracking)(?=$|[./_-])/i;

/**
 * Parses one Vite-transformed production module and returns forbidden DOM
 * operations. Vite does the TypeScript/JSX transform first, so the analyzer
 * only needs the JavaScript syntax actually sent to the bundler.
 */
export function analyzeProductionUiSource(
  source,
  { moduleId = '<unknown>' } = {},
) {
  const findings = [];
  const linter = new Linter({ configType: 'flat' });
  const rule = createProductionUiRule(findings, moduleId);
  const messages = linter.verify(String(source ?? ''), {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      'production-ui': {
        rules: {
          guard: rule,
        },
      },
    },
    rules: {
      'production-ui/guard': 'error',
    },
  });

  for (const message of messages) {
    if (!message.fatal) {
      continue;
    }
    findings.push({
      moduleId,
      ruleId: 'module-parse-error',
      method: null,
      argument: null,
      message: message.message,
      line: message.line,
      column: message.column,
    });
  }

  return findings;
}

/**
 * Applies the narrow exception contract after source analysis.
 *
 * - The emitted entry module may only look up the one authored canvas.
 * - Exact auth files may use only their listed DOM operations/tags.
 * - Explicit src/dev modules are reported as exceptions if a production
 *   configuration intentionally emits them.
 */
export function evaluateProductionUiFindings(
  findings,
  {
    root = process.cwd(),
    entryModuleIds = [],
    canvasId = null,
    devModulePrefixes = DEFAULT_DEV_MODULE_PREFIXES,
  } = {},
) {
  const normalizedRoot = path.resolve(root);
  const entryIds = new Set(
    entryModuleIds.map((moduleId) => canonicalModuleId(moduleId)),
  );
  const violations = [];
  const exceptions = [];

  for (const finding of findings) {
    const moduleId = canonicalModuleId(finding.moduleId);
    const relativePath = toProjectRelativePath(normalizedRoot, moduleId);
    const decorated = {
      ...finding,
      moduleId,
      relativePath,
    };
    const exception = resolveFindingException(decorated, {
      canvasId,
      entryIds,
      devModulePrefixes,
    });

    if (exception) {
      exceptions.push({ ...decorated, exception });
    } else {
      violations.push(decorated);
    }
  }

  return { exceptions, violations };
}

/**
 * Validates the authored production host. The body may contain one canvas and
 * the module entry script only; Pixi receives that existing canvas.
 */
export function validateProductionHtml(source, { htmlPath = 'index.html' } = {}) {
  const html = String(source ?? '').replace(/<!--[\s\S]*?-->/g, '');
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const violations = [];
  const body = bodyMatch?.[1] ?? '';

  if (!bodyMatch) {
    violations.push(
      htmlViolation(
        htmlPath,
        'production-html-body',
        'Production HTML requires a body containing the Pixi canvas.',
      ),
    );
  }

  const elements = [];
  const tagPattern = /<\s*([a-z][\w:-]*)\b([^>]*)>/gi;
  let match;
  while ((match = tagPattern.exec(body)) !== null) {
    elements.push({
      name: match[1].toLowerCase(),
      attributes: match[2] ?? '',
      index: match.index,
    });
  }

  for (const element of elements) {
    if (PRODUCTION_HTML_ALLOWED_BODY_TAGS.has(element.name)) {
      continue;
    }
    violations.push(
      htmlViolation(
        htmlPath,
        'production-html-extra-element',
        `Production body cannot author <${element.name}>; only the Pixi canvas and module script are allowed.`,
      ),
    );
  }

  const canvases = elements.filter(({ name }) => name === 'canvas');
  if (canvases.length !== 1) {
    violations.push(
      htmlViolation(
        htmlPath,
        'production-html-canvas-count',
        `Production HTML must author exactly one canvas; found ${canvases.length}.`,
      ),
    );
  }

  const canvasId =
    canvases.length === 1
      ? readHtmlAttribute(canvases[0].attributes, 'id')
      : null;
  if (canvases.length === 1 && !canvasId) {
    violations.push(
      htmlViolation(
        htmlPath,
        'production-html-canvas-id',
        'The production canvas requires a stable id for bootstrap lookup.',
      ),
    );
  }

  const scripts = elements.filter(({ name }) => name === 'script');
  const entryScripts = [];
  for (const script of scripts) {
    const type = readHtmlAttribute(script.attributes, 'type');
    const src = readHtmlAttribute(script.attributes, 'src');
    if (type === 'module' && src) {
      entryScripts.push(src);
      continue;
    }
    violations.push(
      htmlViolation(
        htmlPath,
        'production-html-script',
        'Production body scripts must be external type="module" entry scripts.',
      ),
    );
  }

  if (entryScripts.length !== 1) {
    violations.push(
      htmlViolation(
        htmlPath,
        'production-html-entry-count',
        `Production HTML must have exactly one module entry script; found ${entryScripts.length}.`,
      ),
    );
  }

  return {
    canvasId,
    entryScripts,
    violations,
  };
}

/**
 * Rejects semantic production filenames that content blockers commonly treat
 * as advertising or tracking resources. Source filenames remain descriptive;
 * only emitted request URLs need to be opaque.
 */
export function validateProductionFileNames(fileNames) {
  return [...fileNames]
    .filter((fileName) =>
      BLOCKER_SENSITIVE_FILE_TOKEN_PATTERN.test(String(fileName ?? '')),
    )
    .map((fileName) => ({
      moduleId: String(fileName),
      relativePath: String(fileName),
      ruleId: 'blocker-sensitive-file-name',
      method: null,
      argument: null,
      message:
        'Production request URLs must not contain advertising or tracking tokens that content blockers can reject.',
      line: null,
      column: null,
    }));
}

/**
 * Runs an in-memory Vite production build and scans only modules rendered into
 * emitted entry/dynamic chunks. Unreachable legacy files and tests are outside
 * the guard by construction.
 */
export async function runProductionUiGuard({
  root = process.cwd(),
  configFile,
  htmlFile = 'index.html',
  logLevel = 'silent',
  devModulePrefixes = DEFAULT_DEV_MODULE_PREFIXES,
} = {}) {
  const normalizedRoot = path.resolve(root);
  const htmlPath = path.resolve(normalizedRoot, htmlFile);
  const htmlSource = await readFile(htmlPath, 'utf8');
  const html = validateProductionHtml(htmlSource, {
    htmlPath: toProjectRelativePath(normalizedRoot, htmlPath),
  });
  const graph = await collectViteProductionGraph({
    root: normalizedRoot,
    configFile,
    logLevel,
  });
  const bootstrapModuleIds = html.entryScripts
    .map((entryScript) =>
      resolveHtmlEntryModule(normalizedRoot, entryScript),
    )
    .filter(Boolean);
  const entryModuleIds = [
    ...new Set([...graph.entryModuleIds, ...bootstrapModuleIds]),
  ].sort();
  const findings = graph.modules.flatMap(({ id, code }) =>
    analyzeProductionUiSource(code, { moduleId: id }),
  );
  const evaluated = evaluateProductionUiFindings(findings, {
    root: normalizedRoot,
    entryModuleIds,
    canvasId: html.canvasId,
    devModulePrefixes,
  });
  const fileNameViolations = validateProductionFileNames(graph.fileNames);
  const violations = [
    ...html.violations,
    ...fileNameViolations,
    ...evaluated.violations,
  ];

  return {
    ok: violations.length === 0,
    root: normalizedRoot,
    htmlFile,
    canvasId: html.canvasId,
    entryScripts: html.entryScripts,
    entryModuleIds,
    modules: graph.modules.map(({ id }) => ({
      id,
      relativePath: toProjectRelativePath(normalizedRoot, id),
    })),
    exceptions: evaluated.exceptions,
    violations,
  };
}

export function formatProductionUiGuardReport(report) {
  const violationLimit = 100;
  const exceptionLimit = 25;
  const summary =
    `${report.modules.length} emitted local modules, ` +
    `${report.exceptions.length} explicit exceptions`;
  if (report.ok) {
    return (
      `Production UI guard passed: one canvas "${report.canvasId}", ${summary}.`
    );
  }

  const lines = [
    `Production UI guard failed: ${report.violations.length} violation(s), ${summary}.`,
  ];
  for (const violation of report.violations.slice(0, violationLimit)) {
    const location =
      violation.line && violation.column
        ? `:${violation.line}:${violation.column}`
        : '';
    lines.push(
      `- ${violation.relativePath ?? violation.moduleId}${location} ` +
        `[${violation.ruleId}] ${violation.message}`,
    );
  }
  if (report.violations.length > violationLimit) {
    lines.push(
      `- ... ${report.violations.length - violationLimit} additional violation(s) omitted.`,
    );
  }
  if (report.exceptions.length > 0) {
    lines.push('Explicit exceptions encountered:');
    for (const exception of report.exceptions.slice(0, exceptionLimit)) {
      lines.push(
        `- ${exception.relativePath}:${exception.line}:${exception.column} ` +
          `[${exception.ruleId}] ${exception.exception}`,
      );
    }
    if (report.exceptions.length > exceptionLimit) {
      lines.push(
        `- ... ${report.exceptions.length - exceptionLimit} additional exception(s) omitted.`,
      );
    }
  }
  return lines.join('\n');
}

function createProductionUiRule(findings, moduleId) {
  return {
    meta: {
      type: 'problem',
      schema: [],
    },
    create() {
      const addFinding = (node, finding) => {
        findings.push({
          moduleId,
          ruleId: finding.ruleId,
          method: finding.method ?? null,
          argument: finding.argument ?? null,
          message: finding.message,
          line: node.loc?.start.line ?? 1,
          column: (node.loc?.start.column ?? 0) + 1,
        });
      };

      return {
        CallExpression(node) {
          const callee = unwrapChain(node.callee);
          const method = getMemberPropertyName(callee);
          const directName =
            callee?.type === 'Identifier' ? callee.name : null;

          if (method === 'createElement' || method === 'createElementNS') {
            const tagArgumentIndex = method === 'createElementNS' ? 1 : 0;
            const tag = readStaticArgument(node.arguments[tagArgumentIndex]);
            const normalizedTag = tag?.toLowerCase() ?? null;
            const ruleId =
              RESTRICTED_ELEMENT_RULES[normalizedTag] ??
              'dom-create-element';
            addFinding(node, {
              ruleId,
              method,
              argument: normalizedTag,
              message: normalizedTag
                ? `${method}("${normalizedTag}") is not allowed in the production UI graph.`
                : `${method}(...) is not allowed in the production UI graph.`,
            });
            return;
          }

          if (DOM_CONSTRUCTION_METHODS.has(method)) {
            addFinding(node, {
              ruleId: 'dom-construction',
              method,
              argument: readStaticArgument(node.arguments[0]),
              message: `${method}(...) is not allowed in the production UI graph.`,
            });
            return;
          }

          if (DOM_QUERY_METHODS.has(method)) {
            const argument = readStaticArgument(node.arguments[0]);
            addFinding(node, {
              ruleId: 'dom-query',
              method,
              argument,
              message: `${method}(${formatArgument(argument)}) is not allowed outside the canvas bootstrap/auth exceptions.`,
            });
            return;
          }

          if (
            method === 'getComputedStyle' ||
            directName === 'getComputedStyle'
          ) {
            addFinding(node, {
              ruleId: 'computed-style-read',
              method: 'getComputedStyle',
              message:
                'getComputedStyle(...) is not allowed in the production UI graph.',
            });
            return;
          }

          if (
            method === 'insertAdjacentHTML' ||
            method === 'insertAdjacentElement'
          ) {
            addFinding(node, {
              ruleId: 'dom-html-injection',
              method,
              message: `${method}(...) is not allowed in the production UI graph.`,
            });
          }
        },
        NewExpression(node) {
          const name = getCalleeName(node.callee);
          if (name === 'MutationObserver') {
            addFinding(node, {
              ruleId: 'mutation-observer',
              method: name,
              message:
                'MutationObserver is not allowed in the production UI graph.',
            });
            return;
          }
          if (CANVAS_CONSTRUCTORS.has(name)) {
            addFinding(node, {
              ruleId: 'extra-canvas-creation',
              method: name,
              message: `${name} construction would create an extra production canvas.`,
            });
            return;
          }
          const restrictedRule = RESTRICTED_HTML_CONSTRUCTORS[name];
          if (restrictedRule) {
            addFinding(node, {
              ruleId: restrictedRule,
              method: name,
              message: `${name} construction is not allowed in the production UI graph.`,
            });
          }
        },
        AssignmentExpression(node) {
          const property = getMemberPropertyName(
            unwrapChain(node.left),
          );
          if (property !== 'innerHTML' && property !== 'outerHTML') {
            return;
          }
          addFinding(node, {
            ruleId: 'dom-html-injection',
            method: property,
            message: `${property} assignment is not allowed in the production UI graph.`,
          });
        },
      };
    },
  };
}

async function collectViteProductionGraph({
  root,
  configFile,
  logLevel,
}) {
  const transformedModules = new Map();
  const emittedModuleIds = new Set();
  const entryModuleIds = new Set();
  const fileNames = new Set();
  const collectorPlugin = {
    name: 'idle-wizard-production-ui-graph',
    apply: 'build',
    enforce: 'post',
    transform(code, id) {
      const canonicalId = canonicalModuleId(id);
      if (!isLocalScannableModule(root, canonicalId)) {
        return null;
      }
      transformedModules.set(canonicalId, code);
      return null;
    },
    generateBundle(_outputOptions, bundle) {
      for (const output of Object.values(bundle)) {
        fileNames.add(output.fileName);
        if (output.type !== 'chunk') {
          continue;
        }
        for (const moduleId of Object.keys(output.modules)) {
          const canonicalId = canonicalModuleId(moduleId);
          if (isLocalScannableModule(root, canonicalId)) {
            emittedModuleIds.add(canonicalId);
          }
        }
        if (output.isEntry && output.facadeModuleId) {
          entryModuleIds.add(canonicalModuleId(output.facadeModuleId));
        }
      }
    },
  };
  const inlineConfig = {
    root,
    mode: 'production',
    logLevel,
    plugins: [collectorPlugin],
    build: {
      emptyOutDir: false,
      minify: false,
      write: false,
    },
  };
  if (configFile !== undefined) {
    inlineConfig.configFile = configFile;
  }

  await build(inlineConfig);

  const modules = [];
  for (const id of [...emittedModuleIds].sort()) {
    const code = transformedModules.get(id);
    if (typeof code !== 'string') {
      throw new Error(
        `Production UI guard could not inspect emitted module ${id}.`,
      );
    }
    modules.push({ id, code });
  }

  return {
    entryModuleIds: [...entryModuleIds].sort(),
    fileNames: [...fileNames].sort(),
    modules,
  };
}

function resolveFindingException(
  finding,
  { canvasId, entryIds, devModulePrefixes },
) {
  if (
    devModulePrefixes.some((prefix) =>
      finding.relativePath.startsWith(prefix),
    )
  ) {
    return `explicit development-only module prefix ${finding.relativePath}`;
  }

  if (
    entryIds.has(finding.moduleId) &&
    finding.ruleId === 'dom-query' &&
    isCanvasHostLookup(finding, canvasId)
  ) {
    return `production entry lookup for canvas #${canvasId}`;
  }

  const authException = AUTH_DOM_EXCEPTIONS[finding.relativePath];
  if (!authException) {
    return null;
  }
  if (
    finding.ruleId === 'dom-create-element' &&
    authException.createElementTags?.includes(finding.argument)
  ) {
    return `auth creates <${finding.argument}>`;
  }
  if (
    finding.ruleId === 'dom-query' &&
    authException.querySelectorValues?.includes(finding.argument)
  ) {
    return `auth query ${finding.argument}`;
  }
  if (
    finding.ruleId === 'dom-query' &&
    authException.querySelectorPrefixes?.some((prefix) =>
      finding.argument?.startsWith(prefix),
    )
  ) {
    return `auth script query ${finding.argument}`;
  }
  return null;
}

function isCanvasHostLookup(finding, canvasId) {
  if (!canvasId || typeof finding.argument !== 'string') {
    return false;
  }
  if (finding.method === 'getElementById') {
    return finding.argument === canvasId;
  }
  if (finding.method !== 'querySelector') {
    return false;
  }
  return (
    finding.argument === `#${canvasId}` ||
    finding.argument === `canvas#${canvasId}`
  );
}

function readStaticArgument(node) {
  const unwrapped = unwrapChain(node);
  if (!unwrapped) {
    return null;
  }
  if (
    unwrapped.type === 'Literal' &&
    typeof unwrapped.value === 'string'
  ) {
    return unwrapped.value;
  }
  if (unwrapped.type !== 'TemplateLiteral') {
    return null;
  }
  let result = '';
  for (let index = 0; index < unwrapped.quasis.length; index += 1) {
    result += unwrapped.quasis[index].value.cooked ?? '';
    if (index < unwrapped.expressions.length) {
      result += '${…}';
    }
  }
  return result;
}

function unwrapChain(node) {
  return node?.type === 'ChainExpression' ? node.expression : node;
}

function getMemberPropertyName(node) {
  if (node?.type !== 'MemberExpression') {
    return null;
  }
  if (!node.computed && node.property.type === 'Identifier') {
    return node.property.name;
  }
  if (
    node.computed &&
    node.property.type === 'Literal' &&
    typeof node.property.value === 'string'
  ) {
    return node.property.value;
  }
  return null;
}

function getCalleeName(node) {
  const unwrapped = unwrapChain(node);
  if (unwrapped?.type === 'Identifier') {
    return unwrapped.name;
  }
  return getMemberPropertyName(unwrapped);
}

function canonicalModuleId(moduleId) {
  const raw = String(moduleId ?? '');
  if (!raw || raw.startsWith('\0')) {
    return raw;
  }
  const withoutQuery = raw.split(/[?#]/, 1)[0];
  const filePath = withoutQuery.startsWith('/@fs/')
    ? withoutQuery.slice('/@fs'.length)
    : withoutQuery;
  return path.resolve(filePath);
}

function isLocalScannableModule(root, moduleId) {
  if (
    !moduleId ||
    moduleId.startsWith('\0') ||
    !SCANNABLE_MODULE_PATTERN.test(moduleId)
  ) {
    return false;
  }
  const relativePath = path.relative(root, moduleId);
  return (
    relativePath !== '' &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath) &&
    !relativePath.split(path.sep).includes('node_modules')
  );
}

function toProjectRelativePath(root, filePath) {
  const relativePath = path.relative(root, filePath);
  return relativePath.split(path.sep).join('/');
}

function readHtmlAttribute(attributes, name) {
  const pattern = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\\x60]+))`,
    'i',
  );
  const match = String(attributes ?? '').match(pattern);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function resolveHtmlEntryModule(root, entryScript) {
  const source = String(entryScript ?? '').split(/[?#]/, 1)[0];
  if (!source || /^[a-z][a-z\d+.-]*:/i.test(source)) {
    return null;
  }
  return path.resolve(root, source.replace(/^\/+/, ''));
}

function htmlViolation(relativePath, ruleId, message) {
  return {
    moduleId: relativePath,
    relativePath,
    ruleId,
    method: null,
    argument: null,
    message,
    line: null,
    column: null,
  };
}

function formatArgument(value) {
  return value === null ? '...' : JSON.stringify(value);
}

async function main() {
  try {
    const report = await runProductionUiGuard();
    process.stdout.write(`${formatProductionUiGuardReport(report)}\n`);
    if (!report.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(
      `Production UI guard could not run: ${error?.stack ?? error}\n`,
    );
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1]
  ? path.resolve(process.argv[1])
  : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}
