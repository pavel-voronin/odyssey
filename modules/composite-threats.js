import {enabled} from '../rules.js';
import {ENEMY_POWERS} from '../content.js';

// Construction only. Existing bodies retain their properties.
// No draw is added to any generator's random stream.
export function constrainThreat(s,a,e){
 if(!enabled(s,'composite-threats'))return;
 const danger=Math.max(0,a.danger??a.depth??0),budget=Math.min(6,1+Math.floor(danger)),removed=[];
 let spent=0;
 const take=(kind,id,cost,empty)=>{
  if(spent+cost<=budget){spent+=cost;return id;}
  removed.push(`${kind}:${id}`);return empty;
 };
 e.mutation=take('mutation',e.mutation,e.mutation==='none'?0:1,'none');
 e.tactic=take('tactic',e.tactic,e.tactic==='simple'?0:['charged','summoner'].includes(e.tactic)?2:1,'simple');
 e.element=take('element',e.element,e.element==='normal'?0:1,'normal');
 e.powers=(e.powers||[]).filter((id,i,all)=>{
  if(all.indexOf(id)!==i||id==='plain'&&all.some(p=>p!=='plain')||id==='temporal'&&e.mutation==='phase'){removed.push('power:'+id);return false;}
  return take('power',id,id==='plain'?0:['temporal','vampire'].includes(id)?2:1,null)!==null;
 });
 if(!e.powers.length)e.powers=['plain'];
 e.name=e.baseName+(e.powers.every(p=>p==='plain')?'':' · '+e.powers.filter(p=>p!=='plain').map(id=>ENEMY_POWERS.find(p=>p.id===id)?.name||id).join(', '));
 e.composition={version:1,budget,cost:spent,removed};
}

export function observeThreat(s,e,kind,value,ctx){
 if(!enabled(s,'composite-threats'))return;
 const h=s.hero;if(!h.alive||!s.areas[h.area]?.objects.includes(e))return;
 const m=h.threatCompositions ||= {},fact=m[e.id] ||= {name:e.name,area:h.area,seen:s.tick,facts:{},said:[]};
 fact.facts[kind]={value,tick:s.tick};fact.seen=s.tick;
 // A short aside is tied to the actual failed method, never a reward/event roll.
 if(kind==='mirror'&&!fact.said.includes('mirror')){
  fact.said.push('mirror');
  ctx.log(s,`${h.name}: «${h.profession==='mage'?'Даже собственные чары':'Свои же чары'} возвращаются сдачей. Пора сменить способ».`,'knowledge');
 }
 const entries=Object.entries(m).sort((a,b)=>a[1].seen-b[1].seen);
 for(const [id]of entries.slice(0,Math.max(0,entries.length-24)))delete m[id];
}

// These facts were earned by this body's hits/replies. Reading another enemy's
// hidden properties cannot supply them. The current visible stance still matters.
export function knownComposition(s,e){
 if(!enabled(s,'composite-threats')||!enabled(s,'tactics')||!enabled(s,'mutations'))return null;
 const f=s.hero.threatCompositions?.[e.id]?.facts;
 if(f?.warden?.value!=='guard'||e.tactic!=='warden')return null;
 if(f.shell?.value==='reduced'&&e.mutation==='shell')return 'shell-warden';
 if(f.mirror?.value==='echo'&&e.mutation==='mirror')return 'mirror-warden';
 return null;
}
