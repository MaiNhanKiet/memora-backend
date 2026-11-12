#!/usr/bin/env node
'use strict';

const { readdirSync } = require('node:fs');
const { join, relative, sep } = require('node:path');
const { loadSync } = require('@grpc/proto-loader');

const root = process.cwd();
const loader = {
  includeDirs: [join(root, 'proto')],
  keepCase: false,
  longs: String,
  defaults: true,
  oneofs: true,
};

function collectProtoFiles(directory) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectProtoFiles(full));
    } else if (entry.name.endsWith('.proto')) {
      found.push(relative(root, full).split(sep).join('/'));
    }
  }
  return found.sort();
}

// Every proto under proto/ is loaded, so a new domain proto needs no edit here.
const files = collectProtoFiles(join(root, 'proto'));
if (files.length === 0) {
  throw new Error('No .proto files found under proto/');
}

for (const relativePath of files) {
  loadSync(join(root, relativePath), loader);
}

process.stdout.write(`proto load ok: ${files.join(', ')}\n`);
