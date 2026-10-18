import {knownArea,knownRoad} from './actor-atlas.js';
import {spatialPassage} from './modules/spatial.js';
import {actorPartyLeader} from './actor-projection.js';
import {physicalDistance} from './geometry.js';
import {scenery,houseProfile} from './scenery.js';
const clamp=n=>Math.max(0,Math.min(1,n));
const on=s=>s.rules?.['scene-boundaries']!==false&&s.rules?.scenery!==false;
const key=(a,b)=>[a,b].sort().join('|');
const surface=a=>a&&!a.interior&&!a.temporaryCamp&&(!a.realm||a.realm==='surface')&&!['cave','dungeon','undercity','sea','dream','clockwork'].includes(a.type);
function passage(s,from,to){
 const a=s.areas[from],b=s.areas[to],edge=s.edges?.[key(from,to)];
 if(!a||!b||!edge||!knownArea(s,a)||!knownArea(s,b)||!knownRoad(s,from,to)||edge.visibility==='opaque'||edge.opaque===true)return null;
 const p=spatialPassage(s,key(from,to));return p.status==='known'?{a,b,edge,p}:null;
}
function exterior(s,a){
 const view=scenery(s.seed,a),kind=['village','port','citadel'].includes(a.type)?'settlement':a.type==='forest'?'forest':a.type==='cave'?'rock':a.type==='mountain'?'ridge':a.type==='ruins'?'ruin':null;
 if(!kind)return null;
 const profile=kind==='settlement'?(s.rules?.facades!==false&&a.facades?.profiles?.[0]||houseProfile(s.seed,a,0,view)):null;
 // Public outer shape only: no doors, inhabitants, treasures or private stock.
 return {area:a.id,kind,view,profile:profile?{id:profile.id||a.id+'-building-0',width:Math.max(24,profile.width||60),floors:Math.max(1,Math.floor(profile.floors||1)),roof:profile.roof||'gable',plaster:profile.plaster||view.plaster,roofColor:profile.roofColor||view.roof}:null};
}
export function boundaryMotifs(s,a,{width,viewportWidth=width,scroll=0}={}){
 if(!on(s)||s.hero.transit||s.hero.area!==a.id||!surface(a)||!Number.isFinite(width)||width<=48)return [];
 const candidates=[];
 for(const to of a.links||[]){
  const link=passage(s,a.id,to);if(!link)continue;const {b,edge,p}=link;
  if(b.continent!==a.continent||(b.era??0)!==(a.era??0))continue;
  const cave=b.type==='cave'&&!b.interior;
  if(!cave&&(!surface(b)||p.kind!=='road'||p.crossLayer)||cave&&!['road','stairs'].includes(edge.mode||'road'))continue;
  const end=p.ends.find(end=>end.area===a.id),gate=cave&&a.objects.find(o=>o.kind==='gate'&&o.to===to&&o.mode==='stairs');
  if(!end||cave&&!gate)continue;
  const x=gate?gate.x:end.departureX;if(!Number.isFinite(x)||!gate&&x!==0&&x!==100)continue;
  if(['forest','mountain'].includes(a.type)&&physicalDistance(a,s.hero.x,x)>18)continue;
  const at=24+x/100*(width-48);if(at<scroll-30||at>scroll+viewportWidth+30)continue;
  const descriptor=exterior(s,b);if(!descriptor)continue;
  candidates.push({...descriptor,edge:p.id,entrance:gate?.id||p.id,x:at,side:x<50?-1:1,selected:s.hero.goal?.area===to});
 }
 const result=[];for(const side of [-1,1]){const group=candidates.filter(m=>m.side===side),selected=group.filter(m=>m.selected);if(selected.length===1)result.push(selected[0]);else if(group.length===1)result.push(group[0]);}
 return result;
}
export function transitProgress(s,t=s.hero.transit){
 if(!t||t.unknown||t.dead)return null;
 let total=t.total,remaining=t.remaining;
 if(t.viewOnly){
  const leader=actorPartyLeader(s,s.hero.lineage),actual=leader?.transit;
  if(actual&&actual.from===t.from&&actual.to===t.to){total=actual.total;remaining=actual.remaining;}
  else{
   const j=s.society?.journeys.find(j=>j.person===s.hero.lineage&&j.movement==='timed'&&j.from===t.from&&j.to===t.to);
   if(!j||!Number.isFinite(j.departedAt)||!Number.isFinite(j.duration)||j.arrival!==j.departedAt+j.duration)return null;
   total=j.duration;remaining=j.arrival-s.tick;
  }
 }
 return Number.isFinite(total)&&total>0&&Number.isFinite(remaining)?clamp(1-remaining/total):null;
}
export function transitLandscape(s){
 const h=s.hero,t=h.transit;if(!t)return null;
 const legacy={...s.areas[h.area],id:`transit-${t.from}-${t.to}`,length:100,roadProfile:null,district:null,city:null,type:t.unknown?'road':t.mode==='sea'?'sea':s.areas[t.to]?.type||'road',objects:[]};
 if(!on(s)||t.mode!=='road')return {area:legacy,mix:null};
 const link=passage(s,t.from,t.to),progress=transitProgress(s,t);
 if(!link||link.p.kind!=='road'||link.p.crossLayer||!surface(link.a)||!surface(link.b)||link.a.continent!==link.b.continent||(link.a.era??0)!==(link.b.era??0)||progress===null)return {area:{...legacy,type:'road',facades:null,links:[]},mix:null};
 return {area:{...legacy,type:'road',facades:null,links:[]},mix:{from:link.a,to:link.b,progress,edge:link.p.id}};
}
export function blendColor(from,to,amount){
 if(!/^#[\da-f]{6}$/i.test(from)||!/^#[\da-f]{6}$/i.test(to))return amount<.5?from:to;
 return '#'+[1,3,5].map(i=>Math.round(parseInt(from.slice(i,i+2),16)*(1-amount)+parseInt(to.slice(i,i+2),16)*amount).toString(16).padStart(2,'0')).join('');
}
export function blendScenery(from,to,amount){
 const result={...from,district:null};for(const k of ['offset','relief','sunX','sunY'])result[k]=from[k]*(1-amount)+to[k]*amount;
 result.values=from.values.map((v,i)=>v*(1-amount)+to.values[i]*amount);result.roof=blendColor(from.roof,to.roof,amount);result.plaster=blendColor(from.plaster,to.plaster,amount);return result;
}
function silhouette(c,m,x,y,size,opacity){
 c.save();c.translate(x,y);c.scale(size,size);c.globalAlpha=opacity;
 if(m.kind==='settlement'){
  const p=m.profile,w=p.width*.55,h=22*(p.floors||1);c.fillStyle=p.plaster;c.fillRect(-w/2,-h,w,h);c.fillStyle=p.roofColor;c.beginPath();c.moveTo(-w*.6,-h);c.lineTo(0,-h-(p.roof==='flat'?0:15));c.lineTo(w*.6,-h);c.closePath();c.fill();
 }else if(m.kind==='forest'){
  for(let i=0;i<3;i++){const at=(i-1)*18,height=42+m.view.values[10+i]*22;c.fillStyle=i%2?'#294837':'#385745';c.beginPath();c.moveTo(at,-height);c.lineTo(at+16,0);c.lineTo(at-16,0);c.closePath();c.fill();c.fillRect(at-1,-12,2,12);}
 }else{
  c.fillStyle=m.kind==='ruin'?'#6d766c':'#747f7a';c.beginPath();c.moveTo(-29,0);c.lineTo(-20,-23-m.view.values[5]*12);c.lineTo(-5,-43);c.lineTo(15,-34-m.view.values[6]*8);c.lineTo(30,0);c.closePath();c.fill();
  // The cave outline surrounds the existing real stair marker; no second door.
 }
 c.restore();
}
export function paintBoundaryMotifs(c,motifs,ground){for(const m of motifs)silhouette(c,m,m.x+m.side*5,ground-5,.8,.7);}
export function paintTransitLandmarks(c,s,mix,width,ground){
 for(const [a,opacity]of [[mix.from,1-mix.progress],[mix.to,mix.progress]]){
  const m=exterior(s,a);if(!m||opacity<=0)continue;
  for(let i=0;i<3;i++)silhouette(c,m,width*(.15+i*.35),ground-8,.8+m.view.values[20+i]*.3,opacity*.65);
 }
}
