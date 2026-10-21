import {formulaDefinition} from './formula-source.js';
import {petPack} from './pack-pet-state.js';
import {SPELLS} from '../content.js';
import {WAYSTONE} from './waystone-state.js';
export function validateWaystones(s,fail){
 const origin=s.waystoneOrigin,tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,integer=n=>Number.isSafeInteger(n)&&n>=0,object=o=>o&&typeof o==='object'&&!Array.isArray(o),seen=new Set(),live=new Map();
 if(origin!==undefined){const source=s.areas[origin?.area]?.objects.find(o=>o.id===origin.object);if(origin?.version!==1||origin.item!==`waystone/${origin.area}/${origin.object}`||!tick(origin.found)||!s.people[origin.finder]||source?.kind!=='relic'||!source.taken)fail('waystoneOrigin');}
 function check(item,physical=true){
  const w=item?.waystone;if(w===undefined)return;if(!origin||item.id!==origin.item||item.kind!=='waystone'||item.slot!=='charm'||item.stat!=='magic'||item.power!==0||w?.version!==1||w.capacity!==WAYSTONE.capacity||w.foundCharge!==WAYSTONE.initial||!integer(w.charge)||w.charge>w.capacity||!integer(w.filled)||!integer(w.spent)||w.foundCharge+w.filled-w.spent!==w.charge||!w.origin||['version','item','area','object','found','finder'].some(k=>w.origin[k]!==origin[k])||!Array.isArray(w.moves)||w.moves.length>16||!object(w.choices)||!Object.hasOwn(w,'lastFill')||!Object.hasOwn(w,'lastUse'))fail('waystone.balance');
  if(physical){if(live.has(item.id)&&live.get(item.id)!==item)fail('waystone.duplicate');live.set(item.id,item);}
  if(w.lastFill!==null){const r=w.lastFill;if(!tick(r.tick)||!s.people[r.actor]||!integer(r.before)||r.after!==r.before+1||r.after>w.capacity||!Number.isFinite(r.manaBefore)||r.manaBefore<WAYSTONE.fillMana||r.manaAfter!==r.manaBefore-WAYSTONE.fillMana||w.filled<1)fail('waystone.fill');}
  if(w.lastUse!==null){const r=w.lastUse;if(!tick(r.tick)||!s.people[r.actor]||!SPELLS.some(sp=>sp.id===r.spell)&&!formulaDefinition(s,r.spell)||!integer(r.cast)||r.cast<1||!integer(r.total)||r.total<1||!integer(r.mana)||r.mana<1||!integer(r.charge)||r.charge<1||r.charge>WAYSTONE.perCast||r.mana+r.charge!==r.total||!integer(r.before)||r.before>w.capacity||r.after!==r.before-r.charge||r.after<0||w.spent<r.charge)fail('waystone.use');}
  for(const r of w.moves)if(!tick(r.tick)||r.tick<origin.found||!s.people[r.from]||!s.people[r.to]||r.from===r.to||!['sale','gift'].includes(r.mode)||!integer(r.charge)||r.charge>w.capacity||r.price!==(r.mode==='sale'?WAYSTONE.price+r.charge:0))fail('waystone.move');
  for(const [id,c]of Object.entries(w.choices))if(!s.people[id]||!tick(c?.tick)||!['keep','gift','sale','wait'].includes(c.kind)||typeof c.reason!=='string')fail('waystone.choice');
 }
 function visit(item,physical=true){if(!item||seen.has(item))return;seen.add(item);check(item,physical);}
 const actors=new Map(Object.values(s.actorStates||{}).map(h=>[h.lineage,h]));actors.set(s.hero.lineage,s.hero);
 const pets=new Set();function pet(c){if(!c?.uid||pets.has(c.uid))return;pets.add(c.uid);for(const i of petPack(c)?.items||[])visit(i);}
 for(const h of actors.values()){for(const i of [...h.bag,...Object.values(h.equipment).filter(Boolean)])visit(i);for(const c of h.companions)pet(c);}
 for(const p of Object.values(s.people)){if(!actors.has(p.id))for(const i of [...(p.looseItems||[]),...(p.legacy?.keepsakes||[])])visit(i);for(const c of [...(p.pets||[]),...(p.petBoarding?[p.petBoarding.pet]:[])])pet(c);}
 for(const a of Object.values(s.areas))for(const o of a.objects){for(const i of [...(o.items||[]),...(o.paymentItems||[])])visit(i);pet(o.existingPet||o.packPetBody);}
 for(const i of s.merchant.items||[])visit(i);for(const i of Object.values(s.itemArchive||{}))visit(i,false);
 }
