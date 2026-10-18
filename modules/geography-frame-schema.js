import {geographyAnchor,insideLand,shoreDistance} from './geography-anchor.js';
export function validateGeographyFrame(s,fail){
 const f=s.geographyFrame;if(f===undefined){if(Object.values(s.areas).some(a=>a.geography))fail('geographyFrame.absent');return;}
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v),integer=(n,min=0)=>Number.isSafeInteger(n)&&n>=min,point=p=>object(p)&&Number.isFinite(p.x)&&Number.isFinite(p.y),text=t=>typeof t==='string'&&t.length>0&&t.length<=120;
 if(!object(f)||f.version!==1||!integer(f.revision,1)||f.scheme!=='regional-diagram-v1'||f.unit!=='diagram'||f.seed!==s.seed||!integer(f.created)||f.created>s.tick||!object(f.bounds)||!['left','right','top','bottom'].every(k=>Number.isFinite(f.bounds[k]))||f.bounds.left>=f.bounds.right||f.bounds.top>=f.bounds.bottom||!object(f.landmasses)||Object.keys(f.landmasses).length!==2||!object(f.countries)||!object(f.regions)||!object(f.sites)||Object.keys(f.sites).length>32||!Array.isArray(f.roads)||f.roads.length>64)fail('geographyFrame');
 const bounded=p=>point(p)&&p.x>=f.bounds.left&&p.x<=f.bounds.right&&p.y>=f.bounds.top&&p.y<=f.bounds.bottom;
 for(const [id,l]of Object.entries(f.landmasses))if(l?.id!==id||!s.continents[id]||!Array.isArray(l.polygon)||l.polygon.length<3||l.polygon.length>12||l.polygon.some(p=>!bounded(p)))fail('geographyFrame.land');
 for(const [id,c]of Object.entries(f.countries))if(c?.id!==id||!text(c.name)||!f.landmasses[c.landmass]||f.sites[c.capital]?.country!==id)fail('geographyFrame.country');
 for(const [id,r]of Object.entries(f.regions))if(r?.id!==id||!text(r.name)||!f.countries[r.country]||f.sites[r.center]?.region!==id)fail('geographyFrame.region');
 const areas=new Set();
 for(const [key,p]of Object.entries(f.sites)){
  const a=s.areas[p?.area],g=a?.geography;if(!object(p)||p.key!==key||!a||areas.has(a.id)||!bounded(p.point)||!text(p.type)||!text(p.realm)||!['wild','city','district-center','village','port'].includes(p.tier)||g?.version!==1||g.site!==key||g.ordinal!==0||g.landmass!==p.landmass||g.country!==p.country||g.region!==p.region||g.tier!==p.tier)fail('geographyFrame.site');areas.add(a.id);
  if(p.landmass!==null&&(!f.landmasses[p.landmass]||!f.countries[p.country]||!f.regions[p.region]||f.countries[p.country].landmass!==p.landmass||f.regions[p.region].country!==p.country))fail('geographyFrame.membership');
  if(p.realm==='surface'&&p.type!=='sea'&&(!f.landmasses[p.landmass]||!insideLand(p.point,f.landmasses[p.landmass].polygon)))fail('geographyFrame.coast');
  if(p.type==='sea'&&(p.landmass!==null||Object.values(f.landmasses).some(l=>insideLand(p.point,l.polygon))))fail('geographyFrame.sea');
  if(p.type==='port'&&p.realm==='surface'&&(!bounded(p.berth)||shoreDistance(p.berth,f.landmasses[p.landmass].polygon)>.01||Math.hypot(p.berth.x-p.point.x,p.berth.y-p.point.y)>20))fail('geographyFrame.berth');
  const anchor=geographyAnchor(s,a);if(a.spatial?.anchor?.x!==anchor?.x||a.spatial?.anchor?.y!==anchor?.y)fail('geographyFrame.anchor');
 }
 for(const a of Object.values(s.areas))if(a.geography){const g=a.geography,p=f.sites[g.site];if(g.version!==1||!p||!integer(g.ordinal)||g.ordinal>3||g.landmass!==p.landmass||g.country!==p.country||g.region!==p.region||g.tier!==p.tier||g.ordinal>0&&a.city!==p.area)fail(a.id+'.geography');if(!a.spatial.attachment){const expected=geographyAnchor(s,a);if(['id','x','y','unit','sceneScale','source'].some(k=>a.spatial.anchor?.[k]!==expected?.[k]))fail(a.id+'.geographyAnchor');}}
 const ids=new Set(),links=new Map(Object.keys(f.sites).map(k=>[k,[]]));
 for(const r of f.roads){const a=f.sites[r?.from],b=f.sites[r?.to],e=a&&b&&s.edges[[a.area,b.area].sort().join('|')];if(!r||!text(r.id)||ids.has(r.id)||!a||!b||a===b||!e||!s.areas[a.area].links.includes(b.area)||!s.areas[b.area].links.includes(a.area)||!['road','sea','stairs','portal'].includes(r.mode)||!integer(r.duration)||!integer(r.cost))fail('geographyFrame.road');ids.add(r.id);links.get(r.from).push(r.to);links.get(r.to).push(r.from);
  if(e.mode==='road'&&(a.landmass!==b.landmass||a.realm!==b.realm))fail('geographyFrame.land-road');
  if(e.mode==='sea'&&(!['port','sea'].includes(a.type)||!['port','sea'].includes(b.type)))fail('geographyFrame.port');
 }
 const seen=new Set(),todo=[Object.keys(f.sites)[0]];while(todo.length){const k=todo.pop();if(seen.has(k))continue;seen.add(k);todo.push(...(links.get(k)||[]));}if(seen.size!==Object.keys(f.sites).length)fail('geographyFrame.disconnected');
 for(const e of Object.values(s.edges)){const a=s.areas[e.a],b=s.areas[e.b],ga=a?.geography,gb=b?.geography;if(e.mode==='road'&&ga&&gb&&(ga.landmass!==gb.landmass||a.realm!==b.realm||ga.ordinal===0&&a.type==='sea'||gb.ordinal===0&&b.type==='sea'))fail('geographyFrame.invalid-road');}
}
