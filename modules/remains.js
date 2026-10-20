import {initializeRemainsSubstance} from './remains-cycle-state.js';
import {enabled} from '../rules.js';
import {rootWorld} from '../world-ref.js';
import {heroAppearance,personAppearance} from '../appearance.js';
import {initializeBodyMaterial} from './biomaterial-state.js';

const copy=value=>value===undefined?null:JSON.parse(JSON.stringify(value));
const active=s=>enabled(s,'remains');
export function bodyRemains(s,source){
  const world=rootWorld(s),id=typeof source==='string'?source:source?.remainsId;
  const body=world.remains?.version===1?world.remains.byId?.[id]:null;
  return body?.version===1&&body.death&&body.position?body:null;
}
function position(s,area,x,transit){
  if(transit)return {kind:'transit',journey:copy(transit)};
  return s.areas[area]&&Number.isFinite(x)?{kind:'area',area,x}:{kind:'unknown'};
}
// A death event owns a body, never another inventory or another person.
// Sources and scene markers only hold references to this single record.
export function recordRemains(s,subject,{kind,id,area,x,transit=null,anchor=null,cause=null,shape=null,tick=s.tick,look,loot=[],traveller=false,facing=subject?.facing}={}){
  const world=rootWorld(s);
  if(!active(s)||!subject||typeof id!=='string'||!['person','enemy','companion'].includes(kind))return null;
  if(world.remains&&world.remains.version!==1)return null;
  if(subject.remainsId&&world.remains?.byId?.[subject.remainsId]&&!bodyRemains(s,subject))return null;
  const existing=bodyRemains(s,subject);
  if(existing){if(anchor){anchor.remainsId=existing.id;if(anchor.deathView)anchor.deathView.remainsId=existing.id;}return existing;}
  const key=`corpse:${kind}:${id}:${tick}`;
  world.remains ||= {version:1,byId:{}};
  const table=world.remains.byId;
  if(!table||typeof table!=='object'||Array.isArray(table))return null;
  if(table[key]&&table[key].version!==1)return null;
  const person=kind==='person'?world.people[id]:null,form=person?.returnEpisode?.form==='skeleton'?'skeleton':shape||subject.shape||subject.race||'unknown';
  const at=position(world,area,x,transit);
  const direction=Number.isFinite(facing)&&facing!==0?Math.sign(facing):null;
  const fresh=!table[key];
  const body=table[key] ||= {version:1,id:key,deathId:`death:${kind}:${id}:${tick}`,
    source:{kind,id},stage:form==='ghost'?'trace':'fresh',carrier:null,position:copy(at),facing:direction||1,
    death:{tick,source:{kind,id},name:subject.name||null,family:subject.family||null,
      race:subject.race||null,species:subject.species||null,shape:form,role:subject.role||null,traveller,facing:direction,fallSide:traveller&&x>80?-1:1,
      appearance:copy(look===undefined?(form==='human'?{cloak:subject.pacified?'#b2ba8a':'#a38b78'}:subject.appearance):look),
      anatomy:{form,stature:subject.role==='ребёнок'?.65:1,recorded:copy(person?.anatomy||subject.anatomy)},position:copy(at),cause:copy(cause)},
    loot:copy(loot)};
  if(fresh){initializeBodyMaterial(s,body,subject);initializeRemainsSubstance(s,body);}
  subject.remainsId=body.id;
  if(subject.deathView)subject.deathView.remainsId=body.id;
  if(anchor){anchor.remainsId=body.id;if(anchor.deathView)anchor.deathView.remainsId=body.id;}
  return body;
}
function marker(s,p){
  const area=s.areas[p.area];
  if(!area)return null;
  const ids=['npc-grave-'+p.id,'grave-'+p.id,'journey-grave-'+p.id];
  return area.objects.find(o=>o.kind==='grave'&&ids.includes(o.id))||null;
}
export function recordPersonRemains(s,p,options={}){
  if(!active(s)||!p||p.alive!==false)return null;
  if(!Number.isSafeInteger(p.died)||p.died<0||p.died>s.tick)throw new Error('Не указан момент действительной смерти');
  const h=s.actorStates?.[p.id];
  const body=recordRemains(s,p,{kind:'person',id:p.id,area:p.area,x:p.x,
    transit:p.deathJourney||p.roadTransit||null,tick:p.died,cause:p.deathCause||null,
    anchor:marker(s,p),look:h?heroAppearance({...s,hero:h}):personAppearance(s,p),traveller:Boolean(h&&h.actorMode!=='npc'),...options});
  if(body&&h)h.remainsId=body.id;
  return body;
}
export function recordCompanionRemains(s,c,anchor,{transit=s.hero.transit}={}){
  if(!active(s))return null;
  const h=s.hero,p=c.person&&s.people[c.person];
  if(p)return recordPersonRemains(s,p,{area:h.area,x:anchor?.x??h.x,transit,anchor});
  return recordRemains(s,c,{kind:'companion',id:c.uid,area:c.packCargo?.body.area||c.petCustody?.body.area||h.area,x:anchor?.x??h.x,
    transit,anchor,shape:c.id==='mushroom'?'fungus':c.id==='moth'?'ghost':c.id});
}
export function recordHeroRemains(s,h,grave,marker,cache,cause){
  if(!active(s))return null;
  const body=recordRemains(s,h,{kind:'person',id:h.lineage,area:h.area,x:h.x,transit:h.transit,
    anchor:marker,cause,shape:h.race,tick:s.tick,look:heroAppearance(s),traveller:true,
    loot:cache?[{kind:'cache',area:h.area,object:cache.id}]:[]});
  if(body){grave.remainsId=body.id;const p=s.people[h.lineage];if(p)p.remainsId=body.id;}
  return body;
}
