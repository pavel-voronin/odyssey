import {createDelveShortcut} from './delve-shortcuts.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {revealArea} from '../actor-atlas.js';
import {createGrate,observeGrate} from './mechanisms.js';
import {mechanismKey} from './mechanism-policy.js';
export const layoutOn=s=>enabled(s,'delve-layouts')&&enabled(s,'delves')&&enabled(s,'mechanisms');
export function createDelveLayout(s,root,entrance,ctx){
 if(!layoutOn(s)||root.dungeon?.layout||root.visited||root.dungeon?.layoutShell?.created!==s.tick||root.dungeon.layoutShell.claimed)return false;
 const labels=['Развилка под сводом','Галерея стража','Служебный ход','Боковой карман','Каменный зал'],roles=['junction','gallery','service','side','final'];
 const rooms=[root,...labels.map((label,i)=>s.areas[ctx.addArea(s,'dungeon',root.name+': '+label,root.depth+Math.min(2,i+1),{continent:root.continent,era:root.era,realm:root.realm,layoutRoom:true,layoutRoot:root.id,layoutFloor:i+2})])];
 rooms.forEach((a,i)=>{a.length=50;a.dungeon.layoutNode={version:1,root:root.id,role:i?roles[i-1]:'entry'};a.dungeon.layoutShell.claimed=true;a.dungeon.swept=false;});
 const [entry,junction,gallery,service,side,final]=rooms,links=[[entry,junction],[junction,gallery],[junction,service],[gallery,service],[gallery,final],[service,final],[service,side]];
 for(const [a,b]of links)ctx.connect(s,a.id,b.id,{mode:'stairs',duration:a===side||b===side?3:2});
 const gate=createGrate(s,junction.id,service.id,gallery.id);if(!gate)throw Error('Delve layout requires a real grate');
 const sentry=ctx.spawnEnemy(s,gallery,{requestedSpecies:'bandit',x:48}),cacheGuard=ctx.spawnEnemy(s,side,{requestedSpecies:'wolf',x:48}),boss=ctx.spawnEnemy(s,final,{requestedSpecies:'bandit',x:50});
 boss.boss=true;boss.hp=boss.maxHp=Math.ceil(boss.maxHp*1.4);boss.attack=Math.ceil(boss.attack*1.2);boss.name='Хранитель каменного зала · '+boss.name;
 side.objects.push({id:side.id+'/side-cache',kind:'loot',name:'Сундук в боковом кармане',x:84,gold:12,taken:false,layoutReward:{version:1,root:root.id,kind:'side'}});
 final.objects.push({id:final.id+'/deep-relic',kind:'relic',name:'Реликвия каменного зала',x:84,taken:false,layoutReward:{version:1,root:root.id,kind:'final'}});
 for(const a of rooms)for(const door of a.objects.filter(o=>o.kind==='gate')){const to=s.areas[door.to];door.layoutDoor={version:1,root:root.id,label:to.name,kind:to.id===entrance.id?'surface':to===side?'side':to===final?'deep':'corridor'};}
 root.dungeon.layout={version:1,built:s.tick,entrance:entrance.id,nodes:rooms.map(a=>a.id),links:links.map(([a,b])=>[a.id,b.id]),gate:mechanismKey(junction.id,service.id),guards:[sentry.id,cacheGuard.id,boss.id],rewards:[side.id+'/side-cache',final.id+'/deep-relic'],captive:root.dungeon.captive||null,finalClaimed:null};
 createDelveShortcut(s,root,ctx);return root.dungeon.layout;
}
export function layoutRoot(s,area){const id=s.areas[area]?.dungeon?.layoutNode?.root;return id&&s.areas[id]?.dungeon?.layout? id:null;}
export function layoutMemory(s,root){return s.hero.delvePaths?.places[root]||null;}
export function observeDelveLayout(s){
 const h=s.hero,a=s.areas[h.area],root=layoutRoot(s,h.area);if(!layoutOn(s)||!h.alive||h.life.ended||h.actorMode==='npc'||h.transit||!root)return null;
 const paths=h.delvePaths ||= {version:1,places:{}},m=paths.places[root] ||= {root,firstSeen:s.tick,rooms:{},gains:[],exit:null,returning:null,lastChoice:null};
 const n=m.rooms[a.id] ||= {area:a.id,name:a.name,seen:s.tick,min:h.x,max:h.x,exits:{},threats:{},finds:{}};n.name=a.name;n.seen=s.tick;n.min=Math.min(n.min,h.x);n.max=Math.max(n.max,h.x);
 if(h.delve?.root===root)h.delve.room=a.id;
 for(const door of a.objects.filter(o=>o.layoutDoor?.root===root&&physicalDistance(a,h.x,o.x)<=30)){
  const key=mechanismKey(a.id,door.to),note=observeGrate(s,s.people[h.lineage],a.id,door.to),lever=a.objects.find(o=>o.kind==='mechanismLever'&&o.key===key&&physicalDistance(a,h.x,o.x)<=30);
  n.exits[door.to]={to:door.to,label:door.layoutDoor.label,kind:door.layoutDoor.kind,seen:s.tick,gate:note?.state||null,key:note?key:null,lever:lever?{area:a.id,x:lever.x}:n.exits[door.to]?.lever||null};
  if(door.layoutDoor.kind==='surface')m.exit=door.to;revealArea(s,door.to);
 }
 for(const o of a.objects){
  if(physicalDistance(a,h.x,o.x)>30)continue;
  if(o.kind==='enemy'){
   const fresh=!n.threats[o.id],status=o.alive&&!o.resolved?'present':'quiet';n.threats[o.id]={id:o.id,name:o.name,x:o.x,boss:Boolean(o.boss),status,seen:s.tick};
   if(fresh&&status==='present'&&h.goal?.kind==='layoutSurvey')h.goal=null;
  }
  if(['loot','relic'].includes(o.kind))n.finds[o.id]={id:o.id,name:o.name,kind:o.kind,x:o.x,taken:Boolean(o.taken),seen:s.tick};
 }
 for(const t of Object.values(n.threats)){if(t.seen===s.tick||physicalDistance(a,h.x,t.x)>30)continue;t.status='not-seen';t.seen=s.tick;}
 if(n.min<=30&&n.max>=70&&!a.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved)&&!a.objects.some(o=>['loot','relic'].includes(o.kind)&&!o.taken)){
  if(!a.dungeon.swept&&h.delve?.root===root)h.delve.cleared++;a.dungeon.swept=true;
  if(a.id!==root)a.dungeon.cleared=true;
  if(!a.objects.some(o=>o.id===a.id+'/layout-rest'))a.objects.push({id:a.id+'/layout-rest',kind:'rest',name:'Осмотренный привал',x:68});
  const r=s.areas[root];r.dungeon.cleared=r.dungeon.layout.nodes.every(id=>s.areas[id].dungeon.swept);
 }
 return m;
}
export function recordLayoutCollection(s,object){
 const h=s.hero,root=object.layoutReward?.root,m=root&&layoutMemory(s,root);if(!m||!object.taken||!s.areas[h.area].objects.includes(object)||m.gains.some(g=>g.object===object.id))return false;
 m.gains.push({object:object.id,area:h.area,tick:s.tick,kind:object.kind,role:object.layoutReward.kind});
 if(object.layoutReward.kind==='final'){const r=s.areas[root].dungeon.layout;if(r.finalClaimed===null){r.finalClaimed={person:h.lineage,tick:s.tick,object:object.id};h.counters.dungeons=(h.counters.dungeons||0)+1;}}return true;
}
