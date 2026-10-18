import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {restore} from '../engine.js';
// Historical published evidence stays in place. Current loading has no reader
// that turns these old files into new people, wallets, knowledge or corpses.
for(const file of ['visual-v47.json','palette-v2.json','pact-loop-v7.json','observed-death-v21.json','legacy-settled-v66.json','legacy-settled-travel-v66.json','legacy-settled-service-v74.json','legacy-settled-dead-v66.json']){
 test('the old '+file+' file is refused by the current contract',()=>{
  const text=readFileSync(new URL('./fixtures/'+file,import.meta.url),'utf8');assert.throws(()=>restore(text),/другой формат/);
 });
}
