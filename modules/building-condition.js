import {emitPaperFire} from './paper-fire-events.js';
import {enabled} from '../rules.js';
export const ruinsOn=s=>enabled(s,'building-ruins')&&enabled(s,'facades');
export const structureFor=(s,a,o)=>a?.facades?.profiles.find(p=>p.id===o?.building);
export const structurallySound=p=>!p?.structure||p.structure.roof>=2&&p.structure.walls>=2;
export function structureRecord(s,p){return p.structure ||= {version:1,created:s.tick,checked:s.tick,emptyDays:0,roof:3,walls:3,history:[]};}
export function damageStructure(s,a,p,cause){
 if(!p||!ruinsOn(s)&&!p.structure)return false;const r=structureRecord(s,p),roof=cause==='fire'?1:0,walls=cause==='fire'?2:1;
 if(r.roof<=roof&&r.walls<=walls)return false;r.roof=Math.min(r.roof,roof);r.walls=Math.min(r.walls,walls);
 r.history.push({tick:s.tick,kind:cause,roof:r.roof,walls:r.walls});if(r.history.length>16)r.history.shift();
 for(const o of a.objects)if(o.building===p.id&&['workshop','tavern'].includes(o.kind)){
  if(o.state!=='burned'){o.state='burned';o.damagedAt=s.tick;o.repair=null;}else o.damagedAt ??=s.tick;
  o.structuralDamage={version:1,building:p.id,cause,tick:s.tick};
 }
 if(cause==='fire')emitPaperFire(s,a,{kind:'building',building:p.id});
 return true;
}
export function restoreStructure(s,a,o,actor){
 const p=structureFor(s,a,o),r=p?.structure;if(!r||!o.repair?.materials||o.repair.remaining>0)return false;
 r.roof=3;r.walls=3;r.emptyDays=0;r.checked=s.tick;r.history.push({tick:s.tick,kind:'repair',roof:3,walls:3,actor,payer:o.repair.payer||actor,paidAt:o.repair.paidAt,materialCost:18});if(r.history.length>16)r.history.shift();delete o.structuralDamage;return true;
}
export function buildingRoomSound(s,a){
 if(!a?.interior)return true;const exterior=s.areas[a.interior.exterior||a.interior.parent],o=exterior?.objects.find(o=>o.id===a.interior.building);
 return structurallySound(structureFor(s,exterior,o));
}

// Local external scorching is one roof loss, not a new whole-building blaze.
export function scorchStructure(s,a,p,source){
 if(!p||!ruinsOn(s)&&!p.structure)return false;const r=structureRecord(s,p);if(r.roof<=0)return false;r.roof--;r.history.push({tick:s.tick,kind:'material-scorch',roof:r.roof,walls:r.walls,source});if(r.history.length>16)r.history.shift();
 if(!structurallySound(p))for(const o of a.objects)if(o.building===p.id&&['workshop','tavern'].includes(o.kind)){o.state='burned';o.damagedAt=s.tick;o.repair=null;o.structuralDamage={version:1,building:p.id,cause:'material-scorch',tick:s.tick};}return true;
}
