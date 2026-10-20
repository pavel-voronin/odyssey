import {createShardStock} from './foreign-body-state.js';
import {race} from '../content.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
export const positionsOn=s=>enabled(s,'dungeon-positions')&&enabled(s,'delve-layouts')&&enabled(s,'delves');
export const positionedEnemy=(s,e)=>positionsOn(s)&&e?.positionAttack?.version===1;
export function syncCoverPosition(s){const h=s.hero,p=h.coverPosition;if(!p)return;const a=s.areas[h.area],o=a?.objects.find(o=>o.id===p.object&&o.kind==='stoneCover');if(!h.alive||h.transit||p.area!==h.area||!o||physicalDistance(a,h.x,p.anchor)>1)h.coverPosition=null;}
export const shotHeight=(s,e)=>e.positionAttack.sourceHeight*(enabled(s,'mutations')&&e.mutation==='giant'?1.15:1);
export const crouchHeight=(s,h)=>18*(enabled(s,'lineage')?(race(h.race)?.height||1):1);
export function rayHeight(from,to,sourceHeight,targetHeight,at){if(from===to)return Infinity;const t=(at-from)/(to-from);return t>0&&t<1?sourceHeight+(targetHeight-sourceHeight)*t:Infinity;}
export function occupiedCover(s,h=s.hero){if(!positionsOn(s)||!h?.alive||h.actorMode==='npc'||h.transit||h.fordCrossing||h.liftTransit)return null;const p=h.coverPosition,a=s.areas[h.area],o=a?.objects.find(o=>o.id===p?.object&&o.kind==='stoneCover');return o&&p.area===a.id&&physicalDistance(a,h.x,p.anchor)<=1&&p.anchor===o.stoneCover.anchors[p.side]?o:null;}
export const standingHeight=(s,h)=>crouchHeight(s,h)*32/18;
export function coverBlocks(s,e,actor=s.hero,{kind,exposed=false}={}){
 if(!positionedEnemy(s,e)||exposed||!actor?.alive)return null;
 const a=s.areas[actor.area],p=actor.coverPosition,o=occupiedCover(s,actor);if(!o||!a.objects.some(body=>body.kind==='enemy'&&body.id===e.id))return null;
 const distance=physicalDistance(a,e.x,actor.x),channel=kind||(distance<=e.positionAttack.melee?'melee':'shard');if(channel!=='shard'||distance>e.positionAttack.range)return null;
 const crossed=p.side==='left'&&actor.x<o.x&&e.x>o.x||p.side==='right'&&actor.x>o.x&&e.x<o.x;return crossed&&rayHeight(e.x,actor.x,shotHeight(s,e),crouchHeight(s,actor),o.x)<=o.stoneCover.height?o:null;
}
export function createPosition(s,root,room,enemy){
 if(!positionsOn(s)||root.visited||root.dungeon.layout.built!==s.tick||root.dungeon.layout.position||enemy.positionAttack)return false;
 const o={id:room.id+'/low-stone',kind:'stoneCover',name:'Низкий каменный выступ',x:40,stoneCover:{version:1,root:root.id,created:s.tick,anchors:{left:34,right:46},channel:'shard',height:28}};room.objects.push(o);enemy.x=50;enemy.name='Камнеглазый страж · '+enemy.name;
 enemy.positionAttack={version:1,root:root.id,area:room.id,cover:o.id,created:s.tick,range:9,melee:3,step:3,sourceHeight:36,phases:0,last:null,blockedBy:null};createShardStock(s,enemy);root.dungeon.layout.position={version:1,area:room.id,enemy:enemy.id,cover:o.id,created:s.tick};return o;
}
