import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recordFinalSession, verifyFinalSession } from '../tools/live-archive.mjs';
test('Only confirmed final sessions can be archived',()=>{
  assert.throws(()=>verifyFinalSession({sessionId:'123',series:'sunday',finalResults:[{finish:1}],isFinal:false}),/Never archive/);
  assert.throws(()=>verifyFinalSession({sessionId:'123',series:'sunday',finalResults:[{finish:0}],isFinal:true}),/positive/);
});
test('Trusted final result creates an archive manifest',async()=>{
  const root=await mkdtemp(join(tmpdir(),'hlrn-live-'));
  try{
    const item=await recordFinalSession({sessionId:'race123',series:'sunday',track:'Test Speedway',finishedAt:'2026-09-23T19:00:00Z',isFinal:true,finalResults:[{driver:'Jane Doe',finish:1}]},root);
    assert.equal(item.file,'sunday-race123.json');
    const manifest=JSON.parse(await readFile(join(root,'data/live-archive/index.json'),'utf8'));
    assert.equal(manifest.sessions[0].sessionId,'race123');
  }finally{await rm(root,{recursive:true,force:true});}
});
