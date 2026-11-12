#!/usr/bin/env node
'use strict';
// Claude Code PreToolUse(Read) hook; blocks likely credential paths from AI reads.
const fs=require('node:fs');
let input={};
try{input=JSON.parse(fs.readFileSync(0,'utf8')||'{}');}catch{}
const ti=input.tool_input||{};
const raw=typeof ti.file_path==='string'?ti.file_path:'';
const parts=raw.replace(/\\/g,'/').toLowerCase().split('/');
const base=parts[parts.length-1]||'';
const deny=(base==='.env'||(/^\.env\./.test(base)&&base!=='.env.example')||
             /\.(?:pem|key)$/.test(base)||['id_rsa','id_ed25519','credentials.json','secrets.json'].includes(base)||
             /^client_secret.*\.json$/.test(base)||parts.includes('.secrets'));
process.stdout.write(JSON.stringify(deny?{hookSpecificOutput:{
 hookEventName:'PreToolUse',permissionDecision:'deny',
 permissionDecisionReason:'MEMORA: credential files are not available to the AI; inspect .env.example and ask the developer for needed configuration facts.'
}}:{})+'\n');
