import {positionsOn,positionedEnemy,coverBlocks,syncCoverPosition,rayHeight,crouchHeight,shotHeight} from './position-state.js';
import {physicalDistance} from '../geometry.js';
export function observePositions(s){
 const h=s.hero;syncCoverPosition(s);if(!positionsOn(s)||!h.alive||h.life.ended||h.actorMode==='npc'||h.transit)return;const a=s.areas[h.area],seen=a.objects.filter(o=>(o.kind==='stoneCover'||o.kind==='enemy'&&o.positionAttack)&&physicalDistance(a,h.x,o.x)<=30);if(!seen.length)return;
 const m=h.positionNotes ||= {version:1,covers:{},enemies:{}};
 for(const o of seen)if(o.kind==='stoneCover')m.covers[o.id]={id:o.id,name:o.name,area:a.id,x:o.x,height:o.stoneCover.height,anchors:{...o.stoneCover.anchors},seen:s.tick};else{const fresh=!m.enemies[o.id];m.enemies[o.id]={id:o.id,name:o.name,area:a.id,x:o.x,range:o.positionAttack.range,melee:o.positionAttack.melee,sourceHeight:shotHeight(s,o),seen:s.tick};if(fresh&&['layoutMove','layoutSurvey'].includes(h.goal?.kind)&&h.goal.area===a.id)h.goal=null;}
}
export function positionPlan(s,e,ctx){
 if(!positionedEnemy(s,e)||!e.alive||e.resolved)return false;const h=s.hero,m=h.positionNotes,n=m?.enemies[e.id],a=s.areas[h.area];if(!n||h.personality.courage>=.65||h.hp<h.maxHp*.55||h.energy<15||physicalDistance(a,h.x,n.x)<=n.melee)return false;
 const choices=Object.values(m.covers).filter(o=>o.area===h.area).map(o=>({o,side:n.x>o.x?'left':'right'})).map(c=>({...c,x:c.o.anchors[c.side]})).filter(c=>(h.x-n.x)*(c.x-n.x)>0&&rayHeight(n.x,c.x,n.sourceHeight,crouchHeight(s,h),c.o.x)<=c.o.height);choices.sort((a,b)=>Math.abs(a.x-h.x)-Math.abs(b.x-h.x));const choice=choices[0];if(!choice)return false;
 ctx.goal(s,'takeCover',h.area,choice.x,'Занять сторону каменного выступа','Прямой осколок можно остановить, но к нужной грани надо дойти. Страж может подойти ближе.',{positioning:true,object:choice.o.id,enemy:e.id,side:choice.side,positionTick:null});h.combat=null;ctx.cancelWeapon?.(s,'Он меняет стойку и идёт к укрытию.');return true;
}
export function positionAction(s,ctx){
 const h=s.hero,g=h.goal;if(!g?.positioning)return false;if(!positionsOn(s)){h.lastAction='idle';return true;}
 const a=s.areas[h.area],o=a.objects.find(o=>o.id===g.object&&o.kind==='stoneCover'),e=a.objects.find(o=>o.id===g.enemy);if(!o||!e?.alive||e.resolved){h.goal=null;h.coverPosition=null;return true;}
 if(g.positionTick===s.tick)return true;g.positionTick=s.tick;
 const other=a.objects.find(o=>o.kind==='enemy'&&o.id!==e.id&&o.alive&&!o.resolved&&physicalDistance(a,h.x,o.x)<=9);if(other){h.goal=null;h.coverPosition=null;h.combat=other.id;ctx.fight(s,other);return true;}
 if(h.coverPosition&&!coverBlocks(s,e,h)&&physicalDistance(a,h.x,e.x)<=e.positionAttack.range){h.goal=null;h.coverPosition=null;h.combat=e.id;ctx.fight(s,e);return true;}
 if(h.hp<h.maxHp*.4||h.energy<3){h.goal=null;h.coverPosition=null;return true;}
 if(physicalDistance(a,h.x,e.x)<=e.positionAttack.melee){h.goal=null;h.coverPosition=null;h.combat=e.id;ctx.fight(s,e);return true;}
 const moving=physicalDistance(a,h.x,g.x)>1;if(moving)ctx.move(s,g.x);else{h.energy=Math.max(0,h.energy-1);h.lastAction='cover';}
 if(physicalDistance(a,h.x,g.x)<=1){if(!h.coverPosition)h.coverPosition={version:1,area:a.id,object:o.id,side:g.side,anchor:g.x,entered:s.tick};h.lastAction='cover';}
 if(physicalDistance(a,h.x,e.x)<=e.positionAttack.range)ctx.enemyResponse(s,e);return true;
}
export function finishPositionTurn(s,respond,skipReply=false){
 const h=s.hero;if(!positionsOn(s)||!h.alive||h.life.ended||h.actorMode==='npc'||h.transit)return;
 const a=s.areas[h.area],root=a?.dungeon?.layoutNode?.root;if(!root||s.areas[root].dungeon.layout.position?.area!==a.id)return;
 if(h.goal?.positioning)h.goal.positionTick=s.tick;if(skipReply)return;
 const e=a.objects.find(e=>e.kind==='enemy'&&e.alive&&!e.resolved&&positionedEnemy(s,e)&&e.positionAttack.last?.tick!==s.tick&&(physicalDistance(a,h.x,e.x)<=e.positionAttack.range||e.positionAttack.last?.actor===h.lineage&&physicalDistance(a,h.x,e.x)<=30));if(e)respond(s,e);
}
