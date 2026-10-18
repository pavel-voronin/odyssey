import {guardiansOn,guardianNode,wardPowered} from './guardian-state.js';
import {physicalDistance} from '../geometry.js';
const visible=(s,o)=>Boolean(o&&s.areas[s.hero.area].objects.includes(o)&&physicalDistance(s.areas[s.hero.area],s.hero.x,o.x)<=30);
export function observeGuardians(s){
 const h=s.hero;if(!guardiansOn(s)||!h.alive||h.life.ended||h.actorMode==='npc'||h.transit)return;
 const a=s.areas[h.area],objects=a.objects.filter(o=>(o.kind==='guardianNode'||o.kind==='enemy'&&o.guardianWard)&&visible(s,o));if(!objects.length)return;
 const m=h.guardianNotes ||= {version:1,enemies:{},nodes:{}};
 for(const o of objects)if(o.kind==='guardianNode')m.nodes[o.id]={id:o.id,name:o.name,area:a.id,x:o.x,seen:s.tick,state:o.guardianSupply.state};else{
  const old=m.enemies[o.id];m.enemies[o.id]={enemy:o.id,name:o.name,area:a.id,seen:s.tick,shield:wardPowered(s,o)?'on':'off',node:old?.node||null,link:old?.link||null};
 }
}
export function learnGuardianLink(s,e,method,ctx){
 if(!guardiansOn(s)||!visible(s,e)||!s.hero.alive)return false;observeGuardians(s);const m=s.hero.guardianNotes,n=guardianNode(s,e),r=m?.enemies[e.id];if(!r||!visible(s,n))return false;
 if(!r.node){r.node=n.id;r.link={tick:s.tick,method};ctx.log?.(s,method==='hit'?'Щит гасит удар, а питающий камень отвечает тем же всполохом. Герой замечает связь.':'Он прослеживает пульс камня до защитного щита стража. Питание можно отключить отдельно.','knowledge');}return true;
}
export function observeGuardianHit(s,e,before,after,type,ctx){if(type==='physical'&&after<before)learnGuardianLink(s,e,'hit',ctx);}
