import {horseCargoLoad} from './horse-state.js';
export function validateHorses(s,fail){
 if(!s.horses)return;const q=s.horses,riders=new Set();if(q.version!==1||!q.byId||Array.isArray(q.byId)||Object.keys(q.byId).length>1)fail('horses');
 const time=(n,min=0)=>Number.isInteger(n)&&n>=min&&n<=s.tick;
 for(const [id,m]of Object.entries(q.byId)){const key='horse.'+id;if(m.version!==1||m.id!==id||m.species!=='horse'||typeof m.name!=='string'||!m.name||!Array.isArray(m.history)||m.history.length>12)fail(key);
  for(const ref of ['owner','keeper','previousOwner','leader','rider'])if(m[ref]!==null&&!s.people[m[ref]])fail(key+'.'+ref);
  for(const k of ['hp','maxHp','energy','hunger','fodder','offset'])if(!Number.isFinite(m[k]))fail(key+'.'+k);
  if(m.maxHp!==45||m.hp<0||m.hp>m.maxHp||m.energy<0||m.energy>100||m.hunger<0||m.hunger>100||!Number.isInteger(m.fodder)||m.fodder<0||m.fodder>2||m.rider&&(m.rider!==m.leader||m.keeper!==m.rider||riders.has(m.rider))||m.leader&&m.leader!==m.keeper||m.hp===0&&(m.rider||m.leader))fail(key+'.body');
  if(m.rider)riders.add(m.rider);for(const k of ['lastMove','lastAction'])if(!time(m[k],-1))fail(key+'.'+k);if(!time(m.lastUpkeep)||!Number.isInteger(m.fearUntil)||m.fearUntil<0)fail(key+'.clock');
  const b=m.body;if(b?.kind==='area'){if(!s.areas[b.area]||!Number.isFinite(b.x)||b.x<0||b.x>100)fail(key+'.position');}else if(b?.kind==='edge'){const t=b.journey;if(!s.areas[t?.from]||!s.areas[t?.to]||!Number.isFinite(t?.metric?.travelled)||t.metric.travelled<0||t.metric.travelled>t.metric.distance)fail(key+'.edge');}else fail(key+'.position');
  const o=m.source;if(o?.kind!=='stable-constructor'||!s.people[o.person]||!s.areas[o.area]||!time(o.at)||o.food!==2||o.foodBefore-o.foodAfter!==2||o.foodAfter<0||m.ageOrigin?.years!==4||m.ageOrigin.at!==o.at)fail(key+'.source');
  for(const e of m.history)if(!time(e.tick)||typeof e.kind!=='string'||e.from!==null&&!s.people[e.from]&&e.from!==m.id||e.to!==null&&!s.people[e.to]&&e.to!==m.id)fail(key+'.history');
  if(m.cargo){const c=m.cargo,o=c.source;if(c.version!==1||c.capacity!==6||!Array.isArray(c.items)||horseCargoLoad(m)>6||o?.kind!=='merchant-stock'||!s.areas[o.area]||!time(o.at)||o.before-o.after!==1||o.after<0||o.price!==12)fail(key+'.cargo');}
 }
 for(const h of [s.hero,...Object.values(s.actorStates)])for(const [id,k]of Object.entries(h.memory.horses||{}))if(!q.byId[id]||k.version!==1||k.id!==id||!time(k.seen)||!s.areas[k.area]||!Number.isFinite(k.x)||!Array.isArray(k.cargo))fail('horse.memory');
}
