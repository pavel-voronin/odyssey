import {mechanismKey} from './mechanism-policy.js';
export function validateDelveLayouts(s,fail){
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick;
 const layouts=new Map();
 for(const a of Object.values(s.areas)){
  const d=a.dungeon,l=d?.layout;
  if(d?.layoutShell!==undefined&&(!obj(d.layoutShell)||d.layoutShell.version!==1||!tick(d.layoutShell.created)||typeof d.layoutShell.claimed!=='boolean'))fail(a.id+'.layoutShell');
  if(l===undefined)continue;
  if(l?.version!==1||!tick(l.built)||!s.areas[l.entrance]||!Array.isArray(l.nodes)||l.nodes.length!==6||new Set(l.nodes).size!==6||l.nodes[0]!==a.id||!Array.isArray(l.links)||l.links.length!==(l.shortcut?8:7)||!Array.isArray(l.guards)||l.guards.length!==3||!Array.isArray(l.rewards)||l.rewards.length!==2||!Object.hasOwn(l,'finalClaimed'))fail(a.id+'.layout');
  const roles=new Set();for(const id of l.nodes){const r=s.areas[id],n=r?.dungeon?.layoutNode;if(n?.version!==1||n.root!==a.id||!['entry','junction','gallery','service','side','final'].includes(n.role)||roles.has(n.role)||r.dungeon.layoutShell?.claimed!==true||typeof r.dungeon.swept!=='boolean')fail(a.id+'.layout.node');roles.add(n.role);}
  const edges=new Set();for(const pair of l.links){if(!Array.isArray(pair)||pair.length!==2||pair[0]===pair[1]||pair.some(id=>!l.nodes.includes(id)))fail(a.id+'.layout.link');const key=mechanismKey(...pair);if(edges.has(key)||!s.edges[key]||!s.areas[pair[0]].links.includes(pair[1]))fail(a.id+'.layout.edge');edges.add(key);}
  if(!edges.has(l.gate)||!s.edges[l.gate].mechanism)fail(a.id+'.layout.grate');
  const objects=l.nodes.flatMap(id=>s.areas[id].objects);for(const id of l.guards)if(objects.find(o=>o.id===id)?.kind!=='enemy')fail(a.id+'.layout.guard');
  for(const id of l.rewards){const o=objects.find(o=>o.id===id);if(o?.layoutReward?.version!==1||o.layoutReward.root!==a.id||!['side','final'].includes(o.layoutReward.kind))fail(a.id+'.layout.reward');}
  if(l.captive!==null&&!a.objects.some(o=>o.id===l.captive&&o.kind==='captive'))fail(a.id+'.layout.captive');
  if(l.finalClaimed!==null){const r=l.finalClaimed,o=objects.find(o=>o.id===r.object);if(!tick(r.tick)||r.tick<l.built||!s.people[r.person]||!o?.taken||o.layoutReward?.kind!=='final')fail(a.id+'.layout.claim');}
  layouts.set(a.id,l);
 }
 for(const a of Object.values(s.areas))if(a.dungeon?.layoutNode&&!layouts.get(a.dungeon.layoutNode.root)?.nodes.includes(a.id))fail(a.id+'.layout.orphan');
 for(const h of [s.hero,...Object.values(s.actorStates)]){
  const p=h.delvePaths;if(h.delve&&layouts.has(h.delve.root)&&(!Number.isSafeInteger(h.delve.layoutGainStart)||h.delve.layoutGainStart<0||h.delve.layoutGainStart>(p?.places?.[h.delve.root]?.gains.length||0)))fail(h.lineage+'.layoutGainStart');if(p===undefined)continue;if(p?.version!==1||!obj(p.places))fail(h.lineage+'.delvePaths');
  for(const [root,m]of Object.entries(p.places)){
   const l=layouts.get(root);if(!l||m?.root!==root||!tick(m.firstSeen)||!obj(m.rooms)||!Array.isArray(m.gains)||m.gains.length>2||m.exit!==null&&m.exit!==l.entrance||m.returning!==null&&typeof m.returning!=='string')fail(root+'.delvePaths');
   for(const [id,n]of Object.entries(m.rooms)){if(!l.nodes.includes(id)||n.area!==id||typeof n.name!=='string'||!tick(n.seen)||!Number.isFinite(n.min)||!Number.isFinite(n.max)||n.min>n.max||!obj(n.exits)||!obj(n.threats)||!obj(n.finds))fail(id+'.delvePaths.room');
    for(const [to,e]of Object.entries(n.exits))if(e.to!==to||!s.areas[id].objects.some(o=>o.kind==='gate'&&o.to===to&&o.layoutDoor?.root===root)||!tick(e.seen)||typeof e.label!=='string'||!['surface','side','deep','corridor','shortcut'].includes(e.kind)||![null,'open','closed'].includes(e.gate)||e.key!==null&&!s.edges[e.key]?.mechanism||e.lever!==null&&(!Number.isFinite(e.lever?.x)||e.lever.area!==id))fail(id+'.delvePaths.exit');
    for(const t of Object.values(n.threats))if(typeof t.id!=='string'||!tick(t.seen)||!Number.isFinite(t.x)||!['present','quiet','not-seen'].includes(t.status))fail(id+'.delvePaths.threat');
    for(const f of Object.values(n.finds))if(typeof f.id!=='string'||!tick(f.seen)||!Number.isFinite(f.x)||!['loot','relic'].includes(f.kind)||typeof f.taken!=='boolean')fail(id+'.delvePaths.find');
   }
   const seen=new Set();for(const g of m.gains){const o=s.areas[g.area]?.objects.find(o=>o.id===g.object);if(seen.has(g.object)||!l.rewards.includes(g.object)||!o?.taken||o.layoutReward?.root!==root||g.role!==o.layoutReward.kind||g.kind!==o.kind||!tick(g.tick))fail(root+'.delvePaths.gain');seen.add(g.object);}
   if(m.lastChoice!==null&&(!tick(m.lastChoice?.tick)||!l.nodes.includes(m.lastChoice.from)||!s.areas[m.lastChoice.toward]||!m.rooms[m.lastChoice.via]?.exits[m.lastChoice.toward]))fail(root+'.delvePaths.choice');
  }
  if(h.delve&&layouts.has(h.delve.root)&&(!Number.isSafeInteger(h.delve.layoutGainStart)||h.delve.layoutGainStart<0||h.delve.layoutGainStart>(p.places[h.delve.root]?.gains.length||0)))fail(h.lineage+'.layoutGainStart');
 }
}
