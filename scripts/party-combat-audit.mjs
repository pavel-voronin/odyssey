import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from './build.mjs';
import {partyCombatFixture} from './party-combat-scenarios.mjs';
import {syncActiveActor} from '../actor-projection.js';
const dir='artifacts/party-actions-152',r=await build(),runtime=path.resolve(dir,'runtime-'+r.revision),hash=b=>createHash('sha256').update(b).digest('hex');await fs.mkdir(runtime,{recursive:true});
for(const [file,h]of Object.entries(r.manifest.files)){const bytes=await fs.readFile(path.join(r.dir,file));assert.equal(hash(bytes),h);await fs.writeFile(path.join(runtime,file),bytes);}await fs.writeFile(path.join(runtime,'release.json'),JSON.stringify(r.manifest,null,2));
async function load(root,name){const m=JSON.parse(await fs.readFile(path.join(root,'release.json'),'utf8')),file=Object.keys(m.files).find(f=>f.startsWith(name+'.')&&f.endsWith('.js'));assert.ok(file);assert.equal(hash(await fs.readFile(path.join(root,file))),m.files[file]);return import(pathToFileURL(path.join(root,file)).href);}
const current=await load(runtime,'engine'),baseline=await load(path.resolve('artifacts/material-delegation-151/runtime-71f8ea87c320cd66'),'engine'),rules=await load(runtime,'rules');
const report={revision:r.revision,baseline:'71f8ea87c320cd66',schema:'click-odyssey/144',steps:0,checks:0,rows:[],scope:'Bounded full-state OFF equality and natural replay, prepared existing guard/healer and finite town supplies moved before a combat. Eight initial-condition interventions, actual engine wounds/medicine/actions/death; same observer exact whole-state replay and cross-observer physical party comparisons. No whole-life frequency estimate.'};
const prune=raw=>{const s=JSON.parse(raw);delete s.rules['party-combat'];for(const h of [s.hero,...Object.values(s.actorStates)])delete h.ruleFlags['party-combat'];return JSON.stringify(s);};
for(const seed of [0,1,4,5]){const s=current.createWorld(seed),old=baseline.createWorld(seed);rules.setModule(s,'party-combat',false);assert.equal(prune(current.serialize(s)),baseline.serialize(old));report.checks++;for(let i=0;i<480;i++){current.step(s);baseline.step(old);report.steps+=2;if(i%48===47){assert.equal(prune(current.serialize(s)),baseline.serialize(old));report.checks++;}}report.rows.push({kind:'OFF-baseline',seed,ticks:480,equal:true});}
for(const seed of [0,1,4,5]){const s=current.createWorld(seed);let other=current.restore(current.serialize(s));for(let i=0;i<1200;i++){current.step(s);current.step(other);report.steps+=2;if(i%37===36){const raw=current.serialize(s);assert.equal(raw,current.serialize(other));other=current.restore(raw);assert.equal(current.serialize(other),raw);report.checks+=2;}}assert.equal(current.serialize(s),current.serialize(other));report.checks++;report.rows.push({kind:'natural-prefix',seed,ticks:1200,peopleWithActions:Object.values(s.people).filter(p=>p.partyCombat).length});}
function physical(s,leader,people,enemy){const h=s.actorStates[leader];return {tick:s.tick,rng:s.rng,enemy:s.areas.a2.objects.find(e=>e.id===enemy),leader:{alive:h.alive,hp:h.hp,energy:h.energy,hunger:h.hunger,round:h.partyCombat,companions:h.companions},people:people.map(id=>{const p=s.people[id];return {id,area:p.area,x:p.x,alive:p.alive,health:p.health,needs:p.needs,money:p.agenda.wealth,supplies:p.roadSupplies,action:p.partyCombat,control:p.actionControl,remainsId:p.remainsId};}),remains:s.remains};}
const modes=['regular','no-medicine','no-need','weak-guard','charged','potion','borrow','OFF'],signatures=new Set();
for(const mode of modes){
 const f=partyCombatFixture(),{s,h,e,guard,healer}=f;
 if(mode==='no-medicine')healer.person.roadSupplies.medicine=0;
 if(mode==='no-need')h.hp=h.maxHp;
 if(mode==='weak-guard'){guard.person.health=15;guard.companion.hp=Math.ceil(guard.companion.maxHp*.15);guard.person.needs.energy=5;}
 if(mode==='charged'){e.attack=40;e.tactic='charged';e.battle.intent='strike';delete h.defenseMemory;s.rng=1600;}
 if(mode==='potion')h.inventory.potions=1;
 if(mode==='borrow'){rules.setModule(s,'magic',true);h.magic.spells=['borrow'];h.magic.mana=h.magic.maxMana=100;}
 if(mode==='OFF')rules.setModule(s,'party-combat',false);
 syncActiveActor(s);const original=h.lineage,ids=[guard.person.id,healer.person.id];for(const id of ids)assert.ok(current.observeExistingPerson(s,id));assert.ok(current.observeDetailedActor(s,original));
 const initial=current.serialize(s),cross=[];
 for(const observer of [original,...ids]){const outputs=[];let first;
  for(const batch of [13,17]){let w=current.restore(initial);if(observer!==original)assert.ok(current.observeExistingPerson(w,observer));
   for(let i=0;i<640;i++){
    current.step(w);report.steps++;
    if(i===0){
     const leader=w.actorStates[original],g=w.people[ids[0]],p=w.people[ids[1]];first={leaderAlive:leader.alive,guard:g.partyCombat?.action||null,healer:p.partyCombat?.action||null,medicine:p.roadSupplies.medicine,replies:w.areas.a2.objects.find(o=>o.id===e.id).battle.turns};
     assert.equal(first.replies,mode==='borrow'?0:1);
     if(mode==='OFF'){assert.equal(g.partyCombat,undefined);assert.equal(p.partyCombat,undefined);assert.equal(first.medicine,4);}
     else if(mode==='weak-guard'){assert.equal(g.partyCombat,undefined);assert.equal(p.partyCombat.target,g.id);assert.equal(first.medicine,2);}
     else if(mode==='no-need'||mode==='potion'){assert.equal(first.guard,'attack');assert.equal(first.healer,null);assert.equal(first.medicine,4);}
     else {assert.equal(first.guard,mode==='borrow'?'attack':'cover');assert.equal(first.healer,mode==='no-medicine'?null:'heal');assert.equal(first.medicine,mode==='no-medicine'?0:2);}
     if(mode==='charged'){assert.equal(g.alive,false);assert.equal(Object.values(w.remains.byId).filter(b=>b.source.id===g.id).length,1);}
     if(mode!=='OFF')for(const id of ids){const p=w.people[id];if(p.partyCombat)assert.equal(p.actionControl.phases.filter(v=>v==='combat').length,1);}
     report.checks+=7;
    }
    if(i%batch===batch-1){const raw=current.serialize(w);w=current.restore(raw);assert.equal(current.serialize(w),raw);report.checks++;}
   }
   outputs.push(current.serialize(w));if(batch===13)cross.push(physical(w,original,ids,e.id));
   for(const id of ids){const p=w.people[id];assert.ok(p.roadSupplies.medicine>=0);if(!p.alive)assert.ok(!p.partyCombat||p.partyCombat.tick<=p.died);}report.checks+=2;
  }
  assert.equal(outputs[0],outputs[1]);report.checks++;report.rows.push({kind:'prepared',mode,observer:observer===original?'leader':observer===ids[0]?'guard':'healer',ticks:640,batches:[13,17],first,equal:true});signatures.add(JSON.stringify(first));
 }
 for(const value of cross.slice(1)){assert.deepEqual(value,cross[0],mode+' changed physical cooperation under observation');report.checks++;}
}
assert.ok(signatures.size>=4);report.checks++;report.distinctFirstOutcomes=signatures.size;
// Explicit module-composition controls: another activity has already reserved
// this person's actual turn. These are component calls, not invented world ticks.
const partyOps=await load(runtime,'modules-party-combat'),control=await load(runtime,'modules-npc-control'),upkeep=await load(runtime,'modules-party'),social=await load(runtime,'modules-social'),combat=await load(runtime,'modules-combat'),forecast=await load(runtime,'modules-combat-forecast');
report.compositionCases=0;
for(const mode of ['busy-cover','busy-healer','busy-strike','care-disable','after-spent-ON','after-spent-OFF','after-care-ON','after-care-OFF','after-aggregate-needs-on','after-aggregate-needs-off']){
 const role=/healer|care/.test(mode)?'healer':'guard',f=partyCombatFixture({roles:[role]});syncActiveActor(f.s);const w=current.restore(current.serialize(f.s)),h=w.hero,p=w.people[f.members[0].person.id],e=w.areas.a2.objects.find(e=>e.id===f.e.id);w.tick=/care/.test(mode)?8:1;
 if(mode.endsWith('OFF'))rules.setModule(w,'npc-control',false);
 if(mode.startsWith('after-aggregate')){
  partyOps.partyCombatTurn(w,e,f.ctx);assert.ok(p.partyCombat);assert.equal(p.partyCombat.action,'cover');rules.setModule(w,'party-combat',false);rules.setModule(w,'npc-party-needs',mode.endsWith('-on'));
  const amount=combat.combatAttack(w,e,10,f.ctx),range=forecast.weaponDamageRange(w,e);h.companions=[];assert.equal(amount,combat.combatAttack(w,e,10,f.ctx));assert.deepEqual(range,forecast.weaponDamageRange(w,e));assert.equal(p.needs.energy,95);
  report.checks+=5;report.compositionCases++;report.rows.push({kind:'module-composition',mode,worldSteps:0,phaseCalls:1,equal:true});continue;
 }
 if(mode.startsWith('after-')){
  if(mode.startsWith('after-care')){h.hp=h.maxHp;p.health=30;h.companions[0].hp=9;partyOps.partyCombatTurn(w,e,f.ctx);assert.equal(p.roadSupplies.medicine,2);assert.equal(p.health,45);h.combat=null;upkeep.partyTick(w,f.ctx);assert.equal(p.roadSupplies.medicine,2);assert.equal(p.health,45);assert.equal(control.npcAction(w,p,'party','camp-study'),false);}
  else {partyOps.partyCombatTurn(w,e,f.ctx);assert.ok(p.partyCombat);assert.equal(control.npcAction(w,p,'party','camp-study'),false);social.releaseParty(w,f.ctx);h.companions=[];assert.ok(p.alive);assert.equal(control.canStartNPCActivity(w,p),false);w.tick++;assert.equal(control.canStartNPCActivity(w,p),true);}
  report.checks+=5;report.compositionCases++;report.rows.push({kind:'module-composition',mode,worldSteps:0,phaseCalls:2,equal:true});continue;
 }
 if(mode==='busy-strike')h.hp=h.maxHp;
 if(mode==='care-disable'){
  h.combat=null;p.health=30;h.companions[0].hp=9;upkeep.partyTick(w,f.ctx);assert.equal(p.partyNeeds.activity,'medicine');assert.equal(p.roadSupplies.medicine,2);h.combat=e.id;rules.setModule(w,'npc-party-needs',false);report.checks+=2;
 }else assert.ok(control.npcAction(w,p,'party','camp-study'));
 const before=current.serialize(w);assert.equal(partyOps.partyCombatTurn(w,e,f.ctx),null);assert.equal(current.serialize(w),before);report.checks+=3;report.compositionCases++;report.rows.push({kind:'module-composition',mode,worldSteps:0,phaseCalls:1,equal:true});
}
await fs.writeFile(dir+'/audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({revision:r.revision,steps:report.steps,checks:report.checks,rows:report.rows.length,distinctFirstOutcomes:signatures.size,publicFiles:Object.keys(r.manifest.files).length,natural:report.rows.filter(r=>r.kind==='natural-prefix')}));
