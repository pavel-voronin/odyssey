import {campPassage,physicalDistance,areaOffset} from '../geometry.js';
import {rootWorld} from '../world-ref.js';
import {registerSpatialArea} from './spatial.js';
import {enabled} from '../rules.js';
import {revealArea,revealRoad} from '../actor-atlas.js';

export const CAMP_ENTRY=52,CAMP_FIRE=68,CAMP_SIGHT=18;
const pct=x=>Number.isFinite(x)&&x>=0&&x<=100;
function bodies(input,camp){
 const s=rootWorld(input),actors=new Map(Object.values(s.actorStates||{}).map(h=>[h.lineage,h]));
 if(s.hero)actors.set(s.hero.lineage,s.hero);if(input.hero)actors.set(input.hero.lineage,input.hero);
 const result=[];for(const h of actors.values())if(h.actorMode!=='npc'&&h.area===camp.id&&!h.transit)result.push({id:h.lineage,alive:h.alive,actor:h});
 for(const p of Object.values(s.people||{}))if(p.area===camp.id&&!result.some(b=>b.id===p.id))result.push({id:p.id,alive:p.alive,actor:actors.get(p.id)?.actorMode==='npc'?null:actors.get(p.id)});
 return result;
}
function remains(camp){return camp.objects.some(o=>o.kind!=='rest'&&o.kind!=='resident'&&o.kind!=='door');}
function bind(s,camp,x,localEntry,source){
 camp.temporaryCamp.site={version:1,parent:camp.temporaryCamp.parent,parentX:x,localEntry,placedAt:s.tick,source};
 camp.temporaryCamp.mode='anchored';delete camp.temporaryCamp.returns;registerSpatialArea(s,camp);s.graphRevision=(s.graphRevision||0)+1;return camp.temporaryCamp.site;
}
// An actual visit created while camp-sites was OFF has explicit entry records.
// Enabling it may anchor that same current visit; absent old data is never guessed.
export function reconcileCampSite(input,camp){
 const s=rootWorld(input),t=camp.temporaryCamp;if(t.site||!enabled(s,'camp-sites'))return t.site?.version===1?t.site:null;
 if(t.mode!=='personal')return null;
 const occupants=bodies(input,camp),records=occupants.map(b=>t.returns[b.id]);
 if(records.length&&records.every(r=>r&&pct(r.parentX)&&r.parentX===records[0].parentX)&&!remains(camp)&&occupants.every(b=>b.alive))return bind(s,camp,records[0].parentX,68,'current-personal-visit');
 return null;
}
export function placeCampSite(input,camp,parentX){
 const s=rootWorld(input);if(camp.temporaryCamp.site)return camp.temporaryCamp.site.version===1?camp.temporaryCamp.site:null;
 if(camp.temporaryCamp.mode!=='personal')return null;
 reconcileCampSite(input,camp);
 if(camp.temporaryCamp.site)return camp.temporaryCamp.site;
 if(!enabled(s,'camp-sites')||!pct(parentX)||bodies(input,camp).length||remains(camp))return null;
 return bind(s,camp,parentX,CAMP_ENTRY,'actual-pitch');
}
export function campSiteAvailable(input,camp){return Boolean(camp.temporaryCamp.site||!bodies(input,camp).length&&!remains(camp));}
export function rememberCampSite(s,camp,h=s.hero){
 const site=camp.temporaryCamp?.site;if(site?.version!==1||h.transit||!h.alive)return false;
 const parent=s.areas[site.parent];
 if(h.area!==camp.id&&(h.area!==site.parent||physicalDistance(parent,h.x,site.parentX)>CAMP_SIGHT))return false;
 h.campSites ||= {};h.campSites[camp.id]={version:1,parent:site.parent,x:site.parentX,seen:s.tick};
 if(h===s.hero){revealArea(s,camp);revealRoad(s,site.parent,camp.id);}return true;
}
export function observeCampSites(s){
 const a=s.areas[s.hero.area],camp=a?.temporaryCamp?a:s.areas[a?.fieldCamp];if(camp?.temporaryCamp?.site)rememberCampSite(s,camp);
}
export function campApproach(s,camp,h=s.hero){
 const site=camp.temporaryCamp.site;if(!site||!h.campSites?.[camp.id]||h.campSites[camp.id].parent!==site.parent||h.campSites[camp.id].x!==site.parentX)return null;
 const parent=s.areas[site.parent];if(h.area!==parent.id)return null;
 const blocked=parent.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&o.x>=Math.min(h.x,site.parentX)-areaOffset(parent,28)&&o.x<=Math.max(h.x,site.parentX)+areaOffset(parent,28));
 return blocked?null:{parentX:site.parentX,localEntry:site.localEntry,distance:physicalDistance(parent,h.x,site.parentX)+physicalDistance(camp,site.localEntry,CAMP_FIRE)};
}
