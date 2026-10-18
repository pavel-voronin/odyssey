export function validateGuardians(s,fail){
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,records=new Map(),nodes=new Map();
 for(const a of Object.values(s.areas)){
  const r=a.dungeon?.layout?.guardian;if(r===undefined)continue;const room=s.areas[r?.area],e=room?.objects.find(o=>o.id===r.enemy),node=room?.objects.find(o=>o.id===r.node),q=node?.guardianSupply;
  if(r?.version!==1||r.created!==a.dungeon.layout.built||!tick(r.created)||!a.dungeon.layout.nodes.includes(r.area)||room.dungeon.layoutNode.role!=='final'||e?.kind!=='enemy'||!e.boss||e.guardianWard?.version!==1||e.guardianWard.area!==r.area||e.guardianWard.node!==r.node||node?.kind!=='guardianNode'||node.x!==36||q?.version!==1||q.root!==a.id||q.enemy!==r.enemy||q.created!==r.created||!['on','off'].includes(q.state)||!Object.hasOwn(q,'cut'))fail(a.id+'.guardian');
  if(q.state==='on'&&q.cut!==null)fail(node.id+'.guardian.phase');
  if(q.state==='off'){const c=q.cut;if(!c||!tick(c.tick)||c.tick<q.created||!tick(c.started)||c.started>c.tick||!s.people[c.actor]||c.worked!==2||c.spent!==4)fail(node.id+'.guardian.cut');}
  records.set(e.id,{area:r.area,enemy:e,node,root:a.id});nodes.set(node.id,{node,area:r.area});
 }
 for(const a of Object.values(s.areas))for(const o of a.objects){if(o.guardianWard&&!records.has(o.id)||o.kind==='guardianNode'&&records.get(o.guardianSupply?.enemy)?.node!==o)fail(o.id+'.guardian.orphan');}
 for(const h of [s.hero,...Object.values(s.actorStates)]){
  const m=h.guardianNotes;if(m!==undefined){if(m?.version!==1||!obj(m.enemies)||!obj(m.nodes))fail(h.lineage+'.guardianNotes');
   for(const [id,n]of Object.entries(m.nodes)){const source=nodes.get(id),r=source?.node;if(!r||n.id!==id||!tick(n.seen)||typeof n.name!=='string'||!Number.isFinite(n.x)||!s.areas[n.area]?.objects.includes(r)||!['on','off'].includes(n.state))fail(id+'.guardian.note');}
   for(const [id,n]of Object.entries(m.enemies)){const r=records.get(id);if(!r||n.enemy!==id||n.area!==r.area||typeof n.name!=='string'||!tick(n.seen)||!['on','off'].includes(n.shield)||!Object.hasOwn(n,'node')||!Object.hasOwn(n,'link')||n.node!==null&&n.node!==r.node.id||Boolean(n.node)!==Boolean(n.link))fail(id+'.guardian.knowledge');if(n.link&&(!tick(n.link.tick)||n.link.tick>n.seen||!['inspection','hit'].includes(n.link.method)))fail(id+'.guardian.link');}
  }
  const g=h.goal;if(g?.guardian){const r=records.get(g.enemy);if(!r||r.node.id!==g.node||g.area!==r.area||h.area!==g.area||!['guardianInspect','guardianDisable'].includes(g.kind)||!m?.enemies[g.enemy]||!m.nodes[g.node])fail(h.lineage+'.guardian.goal');
   if(g.kind==='guardianDisable'){const w=g.wardWork;if(w?.version!==1||!tick(w.started)||!Number.isSafeInteger(w.worked)||w.worked<0||w.worked>1||w.spent!==w.worked*2||w.lastTick!==null&&(!tick(w.lastTick)||w.lastTick<w.started)||w.worked===0&&w.lastTick!==null||w.worked===1&&w.lastTick===null||m.enemies[g.enemy].node!==g.node)fail(h.lineage+'.guardian.work');}
  }
 }
}
