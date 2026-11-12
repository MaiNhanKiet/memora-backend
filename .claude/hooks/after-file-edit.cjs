#!/usr/bin/env node
'use strict';
// Advisory PostToolUse(Edit|Write) hook. Does not run npm install/build/lint.
const fs=require('node:fs');const path=require('node:path');
const {checkSource}=require('../scripts/check-boundaries.cjs');
const root=path.resolve(__dirname,'../..');
let input={};
try{input=JSON.parse(fs.readFileSync(0,'utf8')||'{}');}catch{}
const msgs=[];
try{
 const file=(input.tool_input||{}).file_path;
 if(typeof file==='string'){
  const abs=path.resolve(file),rel=path.relative(root,abs).split(path.sep).join('/');
  if(!rel.startsWith('../')&&!path.isAbsolute(rel)&&fs.existsSync(abs)&&fs.statSync(abs).size<=1024*1024){
   for(const p of checkSource(rel,fs.readFileSync(abs,'utf8')))
    msgs.push(`MEMORA warning: ${p.rule} in ${p.file} (${p.import}). Run node .claude/scripts/check-boundaries.cjs --all`);
  }
 }
}catch(e){msgs.push(`MEMORA after-edit hook warning: ${e.message}`);}
// Edits already happened: advisory only. CI scanner is the enforcement gate.
process.stdout.write(JSON.stringify(msgs.length?{hookSpecificOutput:{hookEventName:'PostToolUse',additionalContext:msgs.join('\n')}}:{})+'\n');
