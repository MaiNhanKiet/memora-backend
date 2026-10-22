#!/usr/bin/env node
'use strict';
// Lightweight, dependency-free, heuristic guardrail. Does NOT replace ESLint, typecheck or security review.
// Limits: no full TypeScript resolver. Template-literal specifiers, import comments, and aliases outside tsconfig.base.json paths are not resolved.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const EXCLUDE = new Set(['node_modules', 'dist', 'coverage', 'generated', '.git', '.next']);
const APPLICATIONS = [
  'api-gateway',
  'iam-service',
  'commerce-service',
  'operations-service',
  'experience-service',
];
const SHARED_ALIAS = /^@app\/(?:auth|common|config|contracts|observability|logger|cache|queue)(?:\/.*)?$/;

function norm(v) { return v.split(path.sep).join('/'); }
function getImports(source) {
  const modules = [];
  // import / import type / export-from / export type-from / side-effect import / import('...') / require('...').
  const re = /\b(?:from\s*|import\s*\(\s*|import\s*|require\s*\(\s*)["']([^"']+)["']/g;
  for (const m of source.matchAll(re)) modules.push(m[1]);
  return modules;
}
function owningApp(rel) {
  const match = rel.match(/^apps\/([^/]+)\//);
  return match && APPLICATIONS.includes(match[1]) ? match[1] : null;
}
function libraryName(rel) {
  const match = rel.match(/^libs\/([^/]+)\//);
  return match ? match[1] : null;
}
function resolveSpecifier(fromFile, specifier) {
  if (!specifier.startsWith('.')) return specifier;
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier));
}
function targetApp(candidate) {
  const fromPath = candidate.match(/(?:^|\/)apps\/([^/]+)(?:\/|$)/);
  if (fromPath && APPLICATIONS.includes(fromPath[1])) return fromPath[1];
  if (SHARED_ALIAS.test(candidate)) return null;
  const fromAlias = candidate.match(/^@app\/([^/]+)/);
  if (fromAlias && APPLICATIONS.includes(fromAlias[1])) return fromAlias[1];
  return null;
}
function isPrisma(candidate) {
  return candidate === '@prisma/client'
    || candidate.startsWith('@prisma/client/')
    || /(?:^|\/)generated\/prisma(?:\/|$)/.test(candidate);
}
function finding(file, rule, imported, message) {
  return { file, rule, import: imported, message };
}
function checkSource(rel, source) {
  const errors = [];
  const normalized = norm(rel).replace(/^\.\//, '');
  if (!/\.(?:[cm]?ts|[cm]?js)$/.test(normalized) || /\.(?:spec|test)\.[cm]?[jt]s$/.test(normalized)) return errors;
  const owner = owningApp(normalized);
  const library = libraryName(normalized);
  if (!owner && !library) return errors;
  for (const imported of getImports(source)) {
    const candidate = resolveSpecifier(normalized, imported);
    const other = targetApp(candidate);
    const prisma = isPrisma(candidate);
    if (owner && other && other !== owner) {
      errors.push(finding(
        normalized,
        'application-must-not-import-other-application',
        imported,
        `${owner} must not import ${other} application code.`,
      ));
    }
    if (owner === 'api-gateway' && prisma) {
      errors.push(finding(
        normalized,
        'gateway-must-not-import-persistence',
        imported,
        'Gateway must use owning-service RPC client; do not import Prisma or generated clients.',
      ));
    }
    if (library && (other || prisma)) {
      const rule = library === 'contracts'
        ? 'contracts-must-not-import-applications'
        : library === 'auth'
          ? 'auth-library-must-not-own-iam-data'
          : 'shared-library-must-not-import-applications';
      const message = library === 'contracts'
        ? 'Cross-process contracts must not import application or persistence implementation.'
        : library === 'auth'
          ? 'Reusable auth library must not import an application or Prisma.'
          : 'Shared libraries must not import application or persistence implementation.';
      errors.push(finding(normalized, rule, imported, message));
    }
  }
  return errors;
}
function walk(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE.has(d.name)) continue;
    const loc = path.join(dir, d.name);
    if (d.isDirectory()) walk(loc, result);
    else if (d.isFile() && /\.(?:ts|tsx|js|mjs|cjs)$/.test(d.name)) result.push(loc);
  }
  return result;
}
function checkFile(full) {
  const abs = path.resolve(full);
  const rel = norm(path.relative(ROOT, abs));
  if (rel.startsWith('../') || path.isAbsolute(rel)) throw Error('Path outside repository is not accepted');
  if (fs.statSync(abs).size > 1024 * 1024) return [];
  return checkSource(rel, fs.readFileSync(abs, 'utf8'));
}
function run(argv) {
  const fArg = argv.indexOf('--file');
  if (fArg !== -1 && !argv[fArg + 1]) throw Error('--file requires a path');
  let files = [];
  if (fArg !== -1) {
    if (!fs.existsSync(argv[fArg + 1])) throw Error(`File does not exist: ${argv[fArg + 1]}`);
    files = [argv[fArg + 1]];
  } else if (argv.includes('--all')) {
    files = ['apps', 'libs'].flatMap((entry) => walk(path.join(ROOT, entry)));
    if (files.length === 0) throw Error('No MEMORA application/library sources found. Install kit at repository root before --all.');
  } else {
    process.stdout.write('Use --all or --file <path>\n');
    return 2;
  }
  const problems = [];
  for (const file of files) if (fs.existsSync(file)) problems.push(...checkFile(file));
  for (const problem of problems) process.stderr.write(`[${problem.rule}] ${problem.file}: ${problem.import} — ${problem.message}\n`);
  process.stdout.write(`MEMORA boundary check: ${files.length} files, ${problems.length} finding(s)\n`);
  return problems.length ? 1 : 0;
}
if (require.main === module) {
  try { process.exitCode = run(process.argv.slice(2)); }
  catch (e) { process.stderr.write(String(e.message) + '\n'); process.exitCode = 2; }
}
module.exports = { checkSource, getImports };
