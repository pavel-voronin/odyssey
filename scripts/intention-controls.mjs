import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {intentionFixture,addHerbPromises} from './intention-scenarios.mjs';
import {step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {assertSameSave} from './life-save-compare.mjs';
export async function intentionControls(directory){
 await mkdir(directory,{recursive:true});const rows=[];
 const specs=[{id:'warning',options:{}},{id:'refusal',options:{method:'leave'}},{id:'combat',options:{method:'fight',enemyHp:30,enemyAttack:3,remaining:999}},{id:'guard',options:{method:'guard',enemyHp:40}},{id:'guard-declines',options:{method:'guard',guardAttack:1,guardDuty:.1}},{id:'fatal-warning',options:{enemyAttack:40,victimHp:75}},{id:'needs',options:{victimHp:70},needs:true},{id:'promise-forward',options:{},promises:true},{id:'promise-reverse',options:{},promises:true,reverse:true}];
 for(const spec of specs){
  const f=intentionFixture(spec.options);if(spec.needs)for(const id of ['npc-watch-needs','npc-needs'])setModule(f.s,id,true);if(spec.promises)addHerbPromises(f,spec.reverse);
  const before=serialize(f.s),paired=restore(before),persons=Object.keys(f.s.people).length;step(f.s);step(paired);assertSameSave(serialize(f.s),serialize(paired));assert.equal(Object.keys(f.s.people).length,persons);
  const after=serialize(f.s),last=f.h.intentions.current||f.h.intentions.last,row={id:spec.id,tick:f.s.tick,choice:last,heroAction:f.h.lastAction,goal:f.h.goal,suspended:f.h.intentions.suspended,victim:{id:f.victim.id,alive:f.victim.alive,health:f.victim.health,status:f.victim.status,x:f.victim.x,advice:f.victim.safetyAdvice},items:{rations:f.h.inventory.rations,herbs:f.h.inventory.herbs,stock:f.a.forage.stock},quests:f.h.quests.map(q=>({id:q.id,status:q.status})),events:f.s.journal.filter(e=>e.tick===f.s.tick).map(e=>({text:e.text,type:e.type})),files:{before:'control-'+spec.id+'.before.json',after:'control-'+spec.id+'.after.json'}};
  for(let i=0;i<12&&f.h.alive;i++){step(f.s);step(paired);assertSameSave(serialize(f.s),serialize(paired));}
  row.followup={tick:f.s.tick,heroAlive:f.h.alive,victimAlive:f.victim.alive,victimHealth:f.victim.health,victimStatus:f.victim.status,enemyAlive:f.enemy.alive,kills:f.h.kills,people:Object.keys(f.s.people).length,rations:f.h.inventory.rations,herbs:f.h.inventory.herbs,stock:f.a.forage.stock,action:f.h.lastAction,goal:f.h.goal?.kind};
  await writeFile(`${directory}/${row.files.before}`,before);await writeFile(`${directory}/${row.files.after}`,after);rows.push(row);
 }
 const native=intentionFixture({victimHp:70});for(const id of ['npc-watch-needs','npc-needs','animation','appearance','scenery','lighting','facades','scene-planes','color-profile','source-shadows','contour-shadows','lineage'])setModule(native.s,id,true);
 native.s.tick=10;native.h.goal.started=9;native.h.speech='';syncActiveActor(native.s);const nativeBefore=serialize(native.s),copy=restore(nativeBefore);step(copy);assert.equal(copy.hero.intentions.last.method,'warn');await writeFile(`${directory}/native-warning.before.json`,nativeBefore);
 await writeFile(`${directory}/controls.json`,JSON.stringify({rows,notes:['Prepared actual NPC combat/replies, not authored random assault quests or natural frequency.','Nine cases have paired continuations through13 ticks or genuine hero death.','Guard/warning can fail; no automatic protagonist or helper is created.','Native fixture enables graphics and ordinary watch needs at an existing10tick state; one real next step is verified to warn.']},null,2));
 return rows;
}
