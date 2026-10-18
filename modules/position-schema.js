export function validatePositions(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,point=n=>Number.isFinite(n)&&n>=0&&n<=100,obj=v=>v&&typeof v==='object'&&!Array.isArray(v),records=new Map(),covers=new Map();
 for(const a of Object.values(s.areas)){
  const r=a.dungeon?.layout?.position;if(r===undefined)continue;const room=s.areas[r?.area],e=room?.objects.find(o=>o.id===r.enemy),o=room?.objects.find(o=>o.id===r.cover),c=o?.stoneCover,p=e?.positionAttack;
  if(r?.version!==1||r.created!==a.dungeon.layout.built||!tick(r.created)||!a.dungeon.layout.nodes.includes(r.area)||room.dungeon.layoutNode.role!=='gallery'||e?.kind!=='enemy'||o?.kind!=='stoneCover'||o.x!==40||c?.version!==1||c.root!==a.id||c.created!==r.created||c.anchors?.left!==34||c.anchors?.right!==46||c.channel!=='shard'||c.height!==28||p?.version!==1||p.root!==a.id||p.area!==r.area||p.cover!==r.cover||p.created!==r.created||p.range!==9||p.melee!==3||p.step!==3||p.sourceHeight!==36||!Number.isSafeInteger(p.phases)||p.phases<0||!Object.hasOwn(p,'last')||!Object.hasOwn(p,'blockedBy'))fail(a.id+'.position');
  if(p.last!==null){const l=p.last;if(!tick(l.tick)||l.tick<p.created||!s.people[l.actor]||l.area!==r.area||!['approach','prepare','blocked','shard','melee'].includes(l.kind)||!point(l.from)||!point(l.to)||!point(l.targetX)||![36,36*1.15].includes(l.sourceHeight)||!Number.isFinite(l.targetHeight)||l.targetHeight<=0||typeof l.fired!=='boolean'||l.fired!==!['approach','prepare'].includes(l.kind)||p.phases<1||l.kind==='approach'&&(l.fired||Math.abs(l.to-l.from)*(room.length/100)>p.step+1e-8)||l.kind==='prepare'&&l.fired)fail(e.id+'.position.reply');}else if(p.phases!==0)fail(e.id+'.position.phases');
  if(p.blockedBy!==null){const b=p.blockedBy;if(!p.last||b.tick>p.last.tick||b.object!==o.id||!s.people[b.actor]||!tick(b.tick)||b.tick<p.created)fail(e.id+'.position.block');}
  if(p.last?.kind==='blocked'&&(p.blockedBy?.actor!==p.last.actor||p.blockedBy?.tick!==p.last.tick))fail(e.id+'.position.blockRecord');
  records.set(e.id,{e,o,room});covers.set(o.id,{o,room});
 }
 for(const a of Object.values(s.areas))for(const o of a.objects)if(o.positionAttack&&!records.has(o.id)||o.kind==='stoneCover'&&covers.get(o.id)?.o!==o)fail(o.id+'.position.orphan');
 for(const h of [s.hero,...Object.values(s.actorStates)]){
  const m=h.positionNotes;if(m!==undefined){if(m?.version!==1||!obj(m.covers)||!obj(m.enemies))fail(h.lineage+'.positionNotes');
   for(const [id,n]of Object.entries(m.covers)){const r=covers.get(id);if(!r||n.id!==id||n.area!==r.room.id||typeof n.name!=='string'||!tick(n.seen)||n.x!==r.o.x||n.height!==r.o.stoneCover.height||n.anchors?.left!==34||n.anchors?.right!==46)fail(id+'.position.knowledge');}
   for(const [id,n]of Object.entries(m.enemies)){const r=records.get(id);if(!r||n.id!==id||n.area!==r.room.id||typeof n.name!=='string'||!tick(n.seen)||!point(n.x)||n.range!==9||n.melee!==3||![36,36*1.15].includes(n.sourceHeight))fail(id+'.position.enemyNote');}
  }
  const p=h.coverPosition;if(p!==undefined&&p!==null){const r=covers.get(p.object);if(p.version!==1||!r||p.area!==r.room.id||!['left','right'].includes(p.side)||p.anchor!==r.o.stoneCover.anchors[p.side]||!tick(p.entered)||!m?.covers[p.object])fail(h.lineage+'.coverPosition');}
  const g=h.goal;if(g?.positioning){const r=records.get(g.enemy);if(g.kind!=='takeCover'||!r||r.o.id!==g.object||g.area!==r.room.id||!['left','right'].includes(g.side)||g.x!==r.o.stoneCover.anchors[g.side]||!m?.covers[g.object]||!m?.enemies[g.enemy]||!Object.hasOwn(g,'positionTick')||g.positionTick!==null&&(!tick(g.positionTick)||g.positionTick<g.started))fail(h.lineage+'.position.goal');}
 }
}
