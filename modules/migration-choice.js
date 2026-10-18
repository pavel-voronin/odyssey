import {DAY_TICKS} from '../calendar.js';
import {npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
import {carriedFood} from './stores.js';
import {migrationBody} from './migration-memory.js';
export const migrationKnownPath=(s,p,from,to)=>npcKnownRoute(p,from,to,knownNPCHazards(s,p));
export function migrationBelief(p,area){
 const report=p.migrationKnowledge?.places[area];if(report)return report;
 const market=p.navigation?.markets?.find(e=>e.area===area);if(market)return {area,name:market.name,observed:market.seen,food:market.food,safety:null,work:market.treasury>=12,habitable:null,damage:false,mode:'own-market-note',witness:p.id,from:p.id,received:market.seen};
 return null;
}
export function knownMigrationDestination(s,source,members,from,exclude=null){
 const leader=members[0];if(!leader)return null;const start=migrationBody(s,leader).area||from,known=new Map((leader.navigation?.places||[]).map(p=>[p.area,{name:p.name}]));
 for(const r of Object.values(leader.migrationKnowledge?.places||{}))known.set(r.area,{name:r.name});
 const relatives=(leader.navigation?.contacts||[]).filter(c=>c.relative&&c.missingAt==null);for(const c of relatives)known.set(c.area,{name:c.place||known.get(c.area)?.name});
 return [...known].map(([id,k])=>{
  const a=s.areas[id];if(id===exclude||!a||!a.civic||a.interior||id===source.id||source.city&&a.city===source.city||a.era!==source.era)return null;
  const path=migrationKnownPath(s,leader,start,id);if(!path.length||path.length>9)return null;
  const note=migrationBelief(leader,id),fresh=note&&s.tick-note.observed<=DAY_TICKS*2;
  if(fresh&&(note.food<22||note.safety!==null&&note.safety<30||note.habitable===false))return null;
  const kin=relatives.filter(c=>c.area===id).length,artisan=members.some(p=>['artisan','merchant'].includes(p.agenda?.job));
  const value=Math.min(3,kin)*35+(note?Math.min(100,note.food)*.3:0)+(artisan&&note?.work?15:0)-(note?.damage?20:0)-(fresh?0:12)-path.length*12;
  return {a,path,note,name:k.name||a.name,value};
 }).filter(Boolean).sort((a,b)=>b.value-a.value||a.a.id.localeCompare(b.a.id))[0]||null;
}
export function migrationHasFood(s,source,members,path){
 const need=Math.max(1,Math.ceil((path.length-1)/3)),missing=members.reduce((n,p)=>n+Math.max(0,need-carriedFood(p,s.actorStates?.[p.id]?.inventory)),0);
 return Math.min(members.length*2,Math.max(0,source.civic.food-4))>=missing;
}
export function shareFamilyRoute(s,members,path){
 for(const p of members){p.navigation ||= {version:1,places:[],roads:[]};for(let i=1;i<path.length;i++){
  const from=path[i-1],to=path[i],key=[from,to].sort().join('|');if(!p.navigation.roads.some(r=>r.key===key))p.navigation.roads.push({key,from,to,seen:s.tick});
 }if(p.navigation.roads.length>96)p.navigation.roads.splice(0,p.navigation.roads.length-96);}
}
export function migrationTravelFood(s,g,members,path){const need=Math.max(1,Math.ceil((path.length-1)/3)),missing=members.reduce((n,p)=>n+Math.max(0,need-carriedFood(p,s.actorStates?.[p.id]?.inventory)),0);return (!g.cargoLost&&s.people[g.carrier]?.alive?g.cargo.food:0)>=missing;}
