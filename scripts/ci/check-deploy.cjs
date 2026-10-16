#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = process.cwd();
const required = [
  'deploy/infra/compose.yaml',
  'deploy/infra/compose.local.yaml',
  'deploy/infra/.env.example',
  'deploy/backend/compose.yaml',
  'deploy/backend/.env.example',
  'deploy/scripts/lib.sh',
  'deploy/host/memora-deploy.sh',
  'deploy/host/install-host-prerequisites.sh',
  'deploy/host/install-docker.sh',
  'deploy/host/install-deploy-helper.sh',
  'deploy/host/sudoers.memora-deploy.example',
  'docker/iam-migrate.Dockerfile',
  '.github/workflows/ci.yml',
  '.github/workflows/bootstrap.yml',
  'docs/deployment/how-it-works.md',
];

const missing = required.filter((file) => !existsSync(join(root, file)));
if (missing.length > 0) {
  process.stderr.write(`FAIL missing deploy files:\n${missing.join('\n')}\n`);
  process.exit(1);
}

for (const file of required.filter((item) => item.endsWith('.sh'))) {
  const abs = join(root, file);
  const bash = spawnSync('bash', ['-n', abs], { encoding: 'utf8' });
  if (bash.status !== 0) {
    process.stderr.write(`FAIL bash -n ${file}\n${bash.stderr}\n`);
    process.exit(1);
  }
}

const helper = readFileSync(join(root, 'deploy/host/memora-deploy.sh'), 'utf8');
if (helper.includes('set -x')) {
  process.stderr.write('FAIL memora-deploy.sh must not use set -x\n');
  process.exit(1);
}
if (helper.includes('compose down')) {
  process.stderr.write('FAIL helper must not docker compose down\n');
  process.exit(1);
}

const ci = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');
const bootstrap = readFileSync(
  join(root, '.github/workflows/bootstrap.yml'),
  'utf8',
);
if (!ci.includes('packages: read')) {
  process.stderr.write(
    'FAIL ci.yml Mini PC deploy must request packages: read\n',
  );
  process.exit(1);
}
if (!ci.includes('--from-sha-tags')) {
  process.stderr.write('FAIL ci.yml deploy must pull GHCR by git SHA tags\n');
  process.exit(1);
}
if (!bootstrap.includes('workflow_dispatch')) {
  process.stderr.write('FAIL bootstrap.yml must be workflow_dispatch\n');
  process.exit(1);
}
if (bootstrap.includes('pull_request:')) {
  process.stderr.write('FAIL bootstrap.yml must not run on pull_request\n');
  process.exit(1);
}
if (!bootstrap.includes('self-hosted') || !bootstrap.includes('Linux')) {
  process.stderr.write(
    'FAIL bootstrap.yml must pin the Mini PC self-hosted runner\n',
  );
  process.exit(1);
}
if (bootstrap.includes('npm ci') || bootstrap.includes('nest build')) {
  process.stderr.write('FAIL bootstrap.yml must not build source on Mini PC\n');
  process.exit(1);
}
if (!bootstrap.includes('--from-sha-tags')) {
  process.stderr.write(
    'FAIL bootstrap.yml must resolve images from SHA tags (no digest form)\n',
  );
  process.exit(1);
}

const sudoers = readFileSync(
  join(root, 'deploy/host/sudoers.memora-deploy.example'),
  'utf8',
);
if (!sudoers.includes('env_keep+="GITHUB_TOKEN GITHUB_ACTOR"')) {
  process.stderr.write('FAIL sudoers must env_keep GITHUB_TOKEN for GHCR pull\n');
  process.exit(1);
}

if (existsSync(join(root, '.github/workflows/deploy.yml'))) {
  process.stderr.write(
    'FAIL extra .github/workflows/deploy.yml; use ci.yml Deploy Mini PC\n',
  );
  process.exit(1);
}

process.stdout.write('deploy layout and shell syntax ok\n');
