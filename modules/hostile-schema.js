import {carriedFood} from './stores.js';
export function validateHostiles(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,int=(n,a=0,b=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=a&&n<=b,x=n=>Number.isFinite(n)&&n>=0&&n<=100;
 for(const p of Object.values(s.people)){
  if(p.raidDefenseTick!==undefined&&!tick(p.raidDefenseTick))fail(p.id+'.raidDefense');
  const q=p.hostileLife;if(q!==undefined){
   const b=p.enemyBody;if(q?.version!==1||!b||!tick(q.created)||q.created!==b.created||!tick(q.lastTick)||q.lastTick<q.created||!int(q.lastActionTick,-1,s.tick)||!['active','spared','dead'].includes(q.stage)||!(q.stage==='active'?b.stage==='hostile':q.stage==='dead'?b.stage==='dead':['spared','dead'].includes(b.stage)&&Boolean(b.mercy))||!['watch','walk','eat','rest','forage','search','camp','raid','fight','wake','dead','leave-cargo'].includes(q.action)||!int(q.search)||!int(q.raids)||!q.camp||q.camp.area!==b.origin||!x(q.camp.x)||!tick(q.camp.established)||s.areas[b.origin]?.objects.filter(o=>o.kind==='hostileCamp'&&o.person===p.id).length!==1||!s.areas[b.origin]?.objects.some(o=>o.id==='hostile-camp/'+p.id&&o.kind==='hostileCamp'&&o.person===p.id&&o.x===q.camp.x&&o.established===q.camp.established))fail(p.id+'.hostileLife');
   const stock=q.supplies;if(!stock||!p.roadSupplies||!int(p.roadSupplies.food)||!int(p.roadSupplies.medicine)||!int(stock.initial,0,2)||!['gathered','raided','eaten'].every(k=>int(stock[k]))||q.stage==='active'&&stock.initial+stock.gathered+stock.raided-stock.eaten!==carriedFood(p,p.actorLink?.inventory))fail(p.id+'.hostileFood');
   const k=q.known;if(!k||!Array.isArray(k.people)||k.people.length>8||new Set(k.people.map(t=>t.person)).size!==k.people.length||k.people.some(t=>!s.people[t.person]||typeof t.name!=='string'||!x(t.x)||!tick(t.seen)||!int(t.after,0,s.tick+64)))fail(p.id+'.hostileKnowledge');
   if(k.forage!==null&&(!k.forage||k.forage.area!==b.origin||!x(k.forage.x)||!tick(k.forage.seen)||!int(k.forage.stock)||typeof k.forage.available!=='boolean'))fail(p.id+'.hostileForage');
   if(k.danger!==null&&(!s.people[k.danger?.person]||!x(k.danger.x)||!tick(k.danger.seen)))fail(p.id+'.hostileDanger');
   const g=q.goal;if(g!==null&&(!['camp','forage','raid','relocate','search'].includes(g?.kind)||!x(g.x)||q.stage!=='active'||g.kind==='raid'&&!k.people.some(t=>t.person===g.person)))fail(p.id+'.hostileGoal');
   if(g?.foodWork){const w=g.foodWork;if(g.kind!=='forage'||!int(g.required,2,3)||!int(w.turns,1,g.required-1)||g.remaining!==g.required-w.turns||w.source!==g.foodSource||w.source!==s.areas[b.origin].forage?.localFood?.id||!['mushroom','fish'].includes(w.kind)||typeof w.tool!=='string'||!tick(w.lastTick)||p.localFood?.lastFoodWork!==w.lastTick||w.kind!==s.areas[b.origin].forage?.localFood?.kind)fail(p.id+'.hostileFoodWork');}
   if(!Array.isArray(q.history)||q.history.length>8)fail(p.id+'.hostileHistory');
   for(const e of q.history){if(!tick(e.tick)||e.tick<q.created||!['meal','hunger','defended','searched','camp-moved','gathered','missed','raid','cargo-left'].includes(e.kind))fail(p.id+'.hostileEvent');
    if(e.kind==='camp-moved'&&(!x(e.from)||!x(e.to))||e.kind==='searched'&&!x(e.x)||['defended','missed'].includes(e.kind)&&!s.people[e.person])fail(p.id+'.hostileSource');
    if(['hunger','defended'].includes(e.kind)&&(!Number.isFinite(e.before)||!Number.isFinite(e.after)||e.after<0||e.before>p.maxHealth||e.after>=e.before))fail(p.id+'.hostileDamage');
    if(e.kind==='raid'&&(!s.people[e.person]||!x(e.x)||e.area!==b.origin||!int(e.before)||!int(e.after)||!int(e.amount,0,1)||e.before-e.after!==e.amount||!Array.isArray(e.witnesses)||e.witnesses.length>16||e.witnesses.some(id=>!s.people[id])||typeof e.id!=='string'||!e.id.startsWith(p.id+'/raid/')||!int(Number(e.id.split('/').at(-1)),1,q.raids)))fail(p.id+'.hostileRaid');
    if(e.kind==='gathered'&&(typeof e.source!=='string'||!int(e.quantity,0,3)||!int(e.portions,0,12)))fail(p.id+'.hostileGather');
   }
  }
  if(p.raidWitnesses!==undefined){if(!Array.isArray(p.raidWitnesses)||p.raidWitnesses.length>8)fail(p.id+'.raidWitnesses');for(const w of p.raidWitnesses){const a=s.people[w.actor];if(w.mode!=='witness'||!a?.hostileLife||!s.people[w.victim]||!tick(w.tick)||w.area!==a.enemyBody.origin||!x(w.x)||!int(w.amount,0,1)||typeof w.id!=='string'||!w.id.startsWith(w.actor+'/raid/')||!int(Number(w.id.split('/').at(-1)),1,a.hostileLife.raids))fail(p.id+'.raidWitness');}}
 }
 for(const a of Object.values(s.areas))for(const o of a.objects)if(o.kind==='hostileCamp'){const q=s.people[o.person]?.hostileLife;if(!q||q.camp.area!==a.id||o.id!=='hostile-camp/'+o.person||o.x!==q.camp.x)fail(o.id+'.hostileCamp');}
}

