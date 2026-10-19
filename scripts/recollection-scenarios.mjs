import {balanceFixture} from './intention-balance-scenarios.mjs';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {commonContext} from './common-life-scenarios.mjs';
import {buryMoney} from '../modules/money-caches.js';
import {recordLocalWound} from '../modules/wound-events.js';
export const recollectionContext=commonContext;
export function recollectionFixture(){const f=balanceFixture({parcel:true});setModule(f.s,'recollection',true);setModule(f.s,'finances',true);setModule(f.s,'relationships',true);f.h.quests=[f.a];f.h.goal=null;f.h.intentions=null;syncActiveActor(f.s);return {...f,p:f.s.people[f.h.lineage]};}
const hash=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
export function headLossFixture(){const f=recollectionFixture(),{s,h,p}=f;setModule(s,'local-wounds',true);const area=Object.values(s.areas).find(a=>a.objects.some(e=>e.kind==='enemy'&&e.alive)),enemy=area.objects.find(e=>e.kind==='enemy'&&e.alive);Object.assign(h,{area:area.id,x:enemy.x,maxHp:100,hp:70});h.race=p.race='human';let tick=null;
 // Bound64 arithmetic source checks, exactly one prepared actual hit; no life simulation/rate claim.
 for(let t=100;t<164;t++)if(hash(s.seed+'/'+JSON.stringify([p.id,t,enemy.id,'actor'])+'/memory')%32===0){tick=t;break;}if(tick===null)throw Error('No selected source within64 arithmetic cases');s.tick=tick;syncActiveActor(s);
 const beforeBiography=structuredClone(h.biography),wound=recordLocalWound(s,p,enemy,{before:100,after:70,maximum:100,area:area.id,controller:'actor',scarPart:'head'},commonContext);if(!wound||!h.recollection?.losses.length)throw Error('No actual head knowledge loss');return {...f,enemy,wound,beforeBiography};}
export function cacheLossFixture(){const f=recollectionFixture(),{s,h,p,a}=f;h.quests=[];h.questCargo={};h.gold=100;h.area=a.target;h.x=42;const witness=s.people[a.recipient];Object.assign(witness,{area:h.area,x:h.x,status:'resident'});witness.needs.sleeping=false;syncActiveActor(s);const cache=buryMoney(s,p,30);if(!cache)throw Error('No actual burial');h.area=a.source;h.x=42;syncActiveActor(s);return {...f,cache,witness};}
