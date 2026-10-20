import {DAY_TICKS,DAYS_PER_YEAR} from '../calendar-units.js';
import {beginWorldChange,finishWorldChange,registerEraDomain} from './world-changes.js';
import {worldNetwork,assessGeography} from './world-change-network.js';
import {areaObservation} from './background-towns.js';
import {damageStructure,structurallySound} from './building-condition.js';
import {quakeBlocked,quakeKey} from './quake-state.js';
const on=s=>s.rules.earthquakes!==false;
const hash=(seed,key)=>{let n=seed>>>0;for(const c of key)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
const zoneOf=a=>a?.geography?.region||a?.continent||a?.id;
registerEraDomain('geography',{capture:s=>({...worldNetwork(s,{blocked:quakeBlocked}),tick:s.tick}),assess(before,now,q){const r=assessGeography(before,now,q);if(r.world&&q.source.kind==='earthquake'&&now.tick-q.causeTick<DAY_TICKS)return {...r,world:false,reason:'Раскол ещё не подтверждён в течение физического дня.'};return r;}});
export function quakeCandidates(s,zone){return Object.entries(s.edges).filter(([,e])=>!e.rupture||e.rupture.state==='repaired').filter(([,e])=>[s.areas[e.a],s.areas[e.b]].some(a=>zoneOf(a)===zone)&&['road','sea'].includes(e.mode)&&!e.lift&&!e.mechanism).sort(([ka,a],[kb,b])=>Number(b.mode==='sea')-Number(a.mode==='sea')||Number(b.metric?.terrain==='mountain')-Number(a.metric?.terrain==='mountain')||ka.localeCompare(kb)).slice(0,3).map(([key])=>key);}
export function triggerEarthquake(s,zone,{keys=quakeCandidates(s,zone),ctx=null}={}){
 if(!on(s)||typeof zone!=='string'||!keys.length||keys.length>3||new Set(keys).size!==keys.length||keys.some(key=>!s.edges[key]||!['road','sea'].includes(s.edges[key].mode)||s.edges[key].lift||s.edges[key].mechanism||s.edges[key].rupture?.state==='broken'||![s.areas[s.edges[key].a],s.areas[s.edges[key].b]].some(a=>zoneOf(a)===zone)))return null;
 const t=s.seismic ||= {version:1,created:s.tick,nextAt:s.tick+DAY_TICKS*DAYS_PER_YEAR,serial:0,events:[]},id='earthquake/'+s.seed+'/'+(++t.serial),areas=[...new Set(keys.flatMap(key=>[s.edges[key].a,s.edges[key].b]))],source=s.areas[areas.find(id=>s.areas[id].civic)||areas[0]],buildings=[];
 const sites=[...new Set(areas.flatMap(id=>[id,...(s.areas[id].districts||[])]))];for(const area of sites){const a=s.areas[area];if(!a.civic||!a.facades)continue;const profiles=a.facades.profiles.filter(p=>structurallySound(p));const profile=profiles.find(p=>a.objects.some(o=>o.building===p.id&&o.kind==='workshop'&&s.people[o.owner]?.alive))||profiles.find(p=>s.people[p.owner]?.alive);if(profile)buildings.push({area,id:profile.id});if(buildings.length>=2)break;}
 const notices=sites.map(id=>areaObservation(s,s.areas[id],'earthquake')),witnesses=[...new Set(notices.flatMap(n=>n.witnesses))].slice(0,64),knownBy=[...new Set(notices.flatMap(n=>n.knownBy))];
 const zoneName=s.geographyFrame?.regions[zone]?.name||s.continents[zone]?.name||s.areas[zone]?.name||zone;const event={id,tick:s.tick,area:source.id,kind:'earthquake',text:'Землетрясение повреждает опорные пути и уязвимые строения области «'+zoneName+'».',knownBy,witnesses};s.changes.push(event);for(const person of witnesses)s.people[person].quakeNotice={cause:id,at:s.tick,area:s.people[person].area};
 const record=beginWorldChange(s,{event,recordOnly:true,domain:'geography',oldLimit:'Существовала прежняя опорная связь и доступные строения',name:'Раскол '+zoneName,shortName:'Раскол '+[...zoneName].slice(0,16).join(''),effects:[...keys.map(id=>({root:'edges',id,path:['rupture']})),...buildings.map(b=>({root:'areas',id:b.area,path:['facades','profiles']}))]});
 const q={id,at:s.tick,zone,area:source.id,keys:[...keys],buildings,shockUntil:s.tick+8,nextAssessment:s.tick+DAY_TICKS,recorded:false};t.events.push(q);if(t.events.length>16)t.events.shift();
 for(const key of keys){const e=s.edges[key];e.rupture={version:1,cause:id,at:s.tick,state:'broken',position:.5,kind:e.mode==='sea'?'channel':e.metric?.terrain==='mountain'?'pass':'bridge',repair:null};
  for(const [from,to]of [[e.a,e.b],[e.b,e.a]]){const a=s.areas[from],marker={id:'rupture/'+key+'/'+from,kind:'roadRupture',name:'Разрушенный участок пути',x:Number(to.slice(1))>Number(from.slice(1))?90:10,key,cause:id};const old=a.objects.findIndex(o=>o.id===marker.id);if(old<0)a.objects.push(marker);else a.objects[old]=marker;}
 }
 for(const b of buildings){const a=s.areas[b.area],p=a.facades.profiles.find(p=>p.id===b.id);if(damageStructure(s,a,p,'earthquake'))a.civic.earthquake={cause:id,at:s.tick};}
 s.graphRevision=(s.graphRevision||0)+1;if(ctx&&event.knownBy.includes(s.hero?.lineage))ctx.log?.(s,event.text,'earthquake');if(record)finishWorldChange(s,id,{recordOnly:true,newState:'Реальные участки разрушены; доступ и пригодность строений изменились'});return q;
}
export function earthquakesTick(s,ctx={}){
 if(!on(s))return;const t=s.seismic ||= {version:1,created:s.tick,nextAt:s.tick+DAY_TICKS*DAYS_PER_YEAR,serial:0,events:[]};
 if(s.tick>=t.nextAt){const zones=[...new Set(Object.values(s.areas).filter(a=>a.realm==='surface'&&a.era===0&&!a.interior&&!a.temporaryCamp).map(zoneOf))].sort(),eligible=zones.filter(z=>quakeCandidates(s,z).length);if(eligible.length)triggerEarthquake(s,eligible[hash(s.seed,'quake/'+t.serial)%eligible.length],{ctx});t.nextAt=s.tick+DAY_TICKS*DAYS_PER_YEAR;}
 for(const q of t.events){if(q.recorded||s.tick<q.nextAssessment)continue;const r=finishWorldChange(s,q.id,{newState:'Сохранились настоящие последствия землетрясения и нынешняя опорная сеть'});q.recorded=Boolean(r?.period);q.nextAssessment=s.tick+(r?.status==='stability-pending'?1:DAY_TICKS);}
}
