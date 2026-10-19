import assert from 'node:assert/strict';
import {createWorld,serialize,restore} from '../engine.js';
import {MODULES} from '../rules.js';import {syncActiveActor,setActorMoney} from '../actor-projection.js';
import {revealArea,revealRoad} from '../actor-atlas.js';
export function authorityFixture({gold=20,initial=true}={}){
 const keep=['territorial-authorities','politics','people','npc-control','identity','districts','background-towns','geography-frame','goods-cycle','local-market','travel','npc-knowledge'],s=createWorld(4,{rules:Object.fromEntries(MODULES.map(m=>[m.id,keep.includes(m.id)&&(m.id!=='territorial-authorities'||initial)]))}),h=s.hero,p=s.people[h.lineage],b=s.authorities?.border;
 if(initial)assert.ok(b);for(const q of Object.values(s.people))if(q.id!==p.id&&q.id!==b?.guard)q.status='absent';for(const a of Object.values(s.areas))for(const o of a.objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}
 Object.assign(h,{area:b?.from||s.geographyFrame.sites.capital.area,x:b?.x||42,energy:100,hunger:0,hp:h.maxHp,goal:null,combat:null,transit:null,companions:[],quests:[],bag:[]});h.inventory.rations=0;h.inventory.potions=0;h.inventory.herbs=0;h.stories.active=null;
 const funds=Object.values(s.areas).find(a=>a.civic?.treasury>=gold&&a.id!==(b?.to||h.area));assert.ok(funds);funds.civic.treasury-=gold;setActorMoney(s,p,gold);syncActiveActor(s);
 if(b){revealArea(s,b.from);revealArea(s,b.to);revealRoad(s,b.from,b.to);h.goal={kind:'explore',area:b.to,x:50,started:s.tick};const guard=s.people[b.guard];Object.assign(guard.needs,{energy:100,hunger:0,sleeping:false});guard.health=guard.maxHealth||100;guard.ailment=null;}
 return {s,h,p,b,guard:b&&s.people[b.guard],state:b&&s.authorities.byId[b.receiver],treasury:b&&s.areas[b.to].civic};
}
export function knowAuthorityBypass(f){const {s,h,b}=f,queue=[[b.from]],seen=new Set([b.from]);let found;for(let i=0;i<queue.length&&!found;i++){const path=queue[i],last=path.at(-1);for(const next of s.areas[last].links){const key=[last,next].sort().join('|');if(seen.has(next)||key===b.edge||s.edges[key]?.mode!=='road')continue;const route=[...path,next];if(next===b.to){found=route;break;}seen.add(next);queue.push(route);}}assert.ok(found);for(const id of found)revealArea(s,id);for(let i=1;i<found.length;i++)revealRoad(s,found[i-1],found[i]);return found;}
export const exactAuthority=s=>{syncActiveActor(s);const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);};
