'use strict';

const { readFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

const schema = readFileSync(join(__dirname, 'schema.prisma'), 'utf8');
if (!/^model\s+\w+/m.test(schema)) {
  process.stderr.write(
    'Experience Prisma Client generation is pending: schema.prisma has no models yet. Do not add placeholder models.\n',
  );
  process.exit(1);
}

const repoRoot = join(__dirname, '../../..');
const prismaCli = join(repoRoot, 'node_modules/prisma/build/index.js');
const result = spawnSync(
  process.execPath,
  [
    prismaCli,
    'generate',
    '--config',
    'apps/experience-service/prisma.config.ts',
  ],
  {
    cwd: repoRoot,
    stdio: 'inherit',
  },
);

process.exit(result.status === null ? 1 : result.status);
