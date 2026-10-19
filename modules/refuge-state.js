import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {migrationBody} from './migration-memory.js';
export const refugeOn=s=>enabled(s,'migrations')&&enabled(s,'migration-knowledge')&&enabled(s,'npc-knowledge');
export function rememberRefuge(s,p,n){const notes=p.refugeKnowledge ||= {};notes[n.area]={...n,witness:p.id,seen:s.tick};const keys=Object.keys(notes).sort((a,b)=>notes[a].seen-notes[b].seen||a.localeCompare(b));if(keys.length>24)delete notes[keys[0]];}
export function observeRefuge(s,p){
 if(!refugeOn(s)||!p?.alive||p.needs?.sleeping)return false;const b=migrationBody(s,p),a=s.areas[b?.area];if(!a||b.transit||a.interior)return false;
 const site=a.refugeSite,rest=a.type==='camp'&&!a.civic&&a.objects.find(o=>o.kind==='rest'&&!o.closed&&(!o.state||o.state==='intact'));
 if(site&&physicalDistance(a,b.x,site.x)<=12){rememberRefuge(s,p,{mode:'plot',occupied:Boolean(a.civic),area:a.id,site:site.id,x:site.x,water:true,food:a.forage.stock,foodKind:a.forage.localFood.kind,rest:null});return true;}
 if(rest&&physicalDistance(a,b.x,rest.x)<=12){rememberRefuge(s,p,{mode:'camp',area:a.id,site:rest.id,x:rest.x,water:false,food:0,foodKind:null,rest:rest.id});return true;}return false;
}
// An actual local three-act survey discovers a spring; no restore/constructor hook.
export function finishRefugeSurvey(s,p){
 const a=s.areas[p.area],t=p.agenda.task;if(!refugeOn(s)||t?.kind!=='refugeSurvey'||t.turns!==3||!p.alive||p.needs.sleeping||p.ailment||p.health<(p.maxHealth||100)*.75||a?.type!=='forest'||!a.forage?.localFood||physicalDistance(a,p.x,a.forage.x)>2)return false;
 let hash=s.seed>>>0;for(const c of a.id)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;
 const found=hash%3!==0;p.refugeSurvey={area:a.id,tick:s.tick,result:found?'spring':'dry'};
 if(found&&!a.refugeSite)a.refugeSite={version:1,id:a.id+'/refuge-site',area:a.id,x:a.forage.x,food:a.forage.localFood.id,water:{kind:'spring',discovered:s.tick,by:p.id},created:s.tick};
 if(found)observeRefuge(s,p);return found;
}
