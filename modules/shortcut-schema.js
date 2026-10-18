import {shortcutKey,layoutStair} from './shortcut-state.js';
export function validateShortcuts(s,fail){
 const tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick,fields=['version','root','near','far','bypass','key','created'];
 for(const [key,edge]of Object.entries(s.edges)){
  const r=edge.delveShortcut;if(r===undefined)continue;
  const l=s.areas[r?.root]?.dungeon?.layout,g=edge.mechanism;
  if(r?.version!==1||!l||r.near!==r.root||r.key!==key||key!==shortcutKey(r.near,r.far)||!tick(r.created)||r.created!==l.built||!l.nodes.includes(r.far)||s.areas[r.far].dungeon.layoutNode.role!=='gallery'||!l.nodes.includes(r.bypass)||!s.areas[r.near].links.includes(r.bypass)||!s.areas[r.far].links.includes(r.bypass)||!g||g.from!==r.far||g.to!==r.near||g.lever.area!==r.far||g.created!==r.created||g.sequence||g.holding||!l.shortcut||fields.some(k=>l.shortcut[k]!==r[k])||edge.mode!=='stairs'||!s.areas[r.near].links.includes(r.far)||!s.areas[r.far].links.includes(r.near))fail(key+'.delveShortcut');
  for(const [a,b]of [[r.near,r.far],[r.far,r.near]])if(!s.areas[a].objects.some(o=>o.kind==='gate'&&o.to===b&&o.layoutDoor?.kind==='shortcut'&&o.layoutDoor.root===r.root))fail(key+'.shortcut.door');
 }
 for(const a of Object.values(s.areas)){const r=a.dungeon?.layout?.shortcut;if(r!==undefined&&(!r||r.root!==a.id||!s.edges[r.key]?.delveShortcut))fail(a.id+'.shortcut.reference');}
 for(const p of Object.values(s.people))for(const r of p.navigation?.roads||[]){
  if(r.layoutRoot===undefined&&r.layoutGate===undefined)continue;
  const l=s.areas[r.layoutRoot]?.dungeon?.layout;if(!l||!(l.nodes.includes(r.from)||r.from===l.entrance)||!(l.nodes.includes(r.to)||r.to===l.entrance)||r.key!==shortcutKey(r.from,r.to)||!layoutStair(s,r.from,r.to)||!tick(r.seen)||r.layoutGate!==null&&(r.layoutGate!==r.key||!s.edges[r.key]?.mechanism))fail(p.id+'.shortcut.knowledge');
 }
}
