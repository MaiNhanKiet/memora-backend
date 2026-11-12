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
  'docker/commerce-service.Dockerfile',
  'docker/operations-service.Dockerfile',
  'docker/experience-service.Dockerfile',
  'deploy/secrets/commerce.env.example',
  'deploy/secrets/operations.env.example',
  'deploy/secrets/experience.env.example',
  'deploy/postgres/proposals/service-roles.sql',
  'deploy/postgres/proposals/service-roles-review.sql',
  'scripts/ci/check-release-state.sh',
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

const compose = readFileSync(join(root, 'deploy/backend/compose.yaml'), 'utf8');
const releaseExample = readFileSync(
  join(root, 'deploy/backend/.env.example'),
  'utf8',
);
for (const token of [
  'profiles: [\'domain-services\']',
  'memora-commerce-service',
  'memora-operations-service',
  'memora-experience-service',
  'COMMERCE_IMAGE',
  'OPERATIONS_IMAGE',
  'EXPERIENCE_IMAGE',
]) {
  if (!compose.includes(token)) {
    process.stderr.write(`FAIL compose.yaml missing ${token}\n`);
    process.exit(1);
  }
}
if (compose.includes('50052:50052') || compose.includes('50053:50053') || compose.includes('50054:50054')) {
  process.stderr.write('FAIL compose.yaml publishes a domain gRPC port\n');
  process.exit(1);
}
if (compose.includes('privileged:')) {
  process.stderr.write('FAIL compose.yaml must not use privileged containers\n');
  process.exit(1);
}
for (const token of ['GATEWAY_IMAGE', 'IAM_IMAGE', 'MIGRATE_IMAGE', 'COMMERCE_IMAGE', 'OPERATIONS_IMAGE', 'EXPERIENCE_IMAGE']) {
  if (!releaseExample.includes(token)) {
    process.stderr.write(`FAIL release example missing ${token}\n`);
    process.exit(1);
  }
}

if (!helper.includes('deploy_backend_or_restore') || !helper.includes('current-release')) {
  process.stderr.write('FAIL deploy failure must restore the last recorded release\n');
  process.exit(1);
}
if (!helper.includes('--enable-domain-services') || !helper.includes('BLOCKER: domain services stay disabled')) {
  process.stderr.write('FAIL domain services must stay opt-in and blocked until grants are verified\n');
  process.exit(1);
}
const releaseLib = readFileSync(join(root, 'deploy/scripts/lib.sh'), 'utf8');
if (
  !releaseLib.includes('--profile domain-services') ||
  !releaseLib.includes('${MEMORA_DOMAIN_SERVICES:-0}')
) {
  process.stderr.write(
    'FAIL domain profile must be gated by MEMORA_DOMAIN_SERVICES\n',
  );
  process.exit(1);
}
const installer = readFileSync(
  join(root, 'deploy/host/install-deploy-helper.sh'),
  'utf8',
);
if (
  !installer.includes('commerce.env.example') ||
  !installer.includes('[[ ! -f "$dest" ]]')
) {
  process.stderr.write(
    'FAIL installer must copy domain env examples without overwriting\n',
  );
  process.exit(1);
}
if (ci.includes('--enable-domain-services')) {
  process.stderr.write(
    'FAIL ci.yml must not enable domain services on Mini PC deploy\n',
  );
  process.exit(1);
}

const releaseState = spawnSync('bash', ['scripts/ci/check-release-state.sh'], {
  cwd: root,
  encoding: 'utf8',
});
if (releaseState.status !== 0) {
  process.stderr.write(releaseState.stdout || '');
  process.stderr.write(releaseState.stderr || '');
  process.stderr.write('FAIL release state checks\n');
  process.exit(1);
}
process.stdout.write(releaseState.stdout);

process.stdout.write('deploy layout and shell syntax ok\n');
