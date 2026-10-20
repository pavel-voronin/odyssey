import {detachPhysicalShard} from './foreign-body-state.js';
import {positionedEnemy,coverBlocks,occupiedCover,crouchHeight,standingHeight,shotHeight} from './position-state.js';
import {areaStep,physicalDistance} from '../geometry.js';
const actorId=h=>h.lineage||h.id;
const witness=(s,e,a)=>s.hero.area===a.id&&physicalDistance(a,s.hero.x,e.x)<=30;
export function positionBeforeReply(s,e,h,ctx){
 if(e?.positionAttack&&(!e.alive||e.resolved))return true;
 if(!positionedEnemy(s,e))return false;const p=e.positionAttack,a=s.areas[h.area];if(!a?.objects.includes(e))return true;if(p.last?.tick===s.tick)return true;
 const cover=coverBlocks(s,e,h),distance=physicalDistance(a,e.x,h.x),approach=distance>p.range||p.shards?.remaining===0&&distance>p.melee||cover&&p.blockedBy?.actor===actorId(h)&&p.blockedBy.object===cover.id;
 if(!approach)return false;const from=e.x;e.x+=areaStep(a,e.x,h.x,p.step);p.phases++;p.last={tick:s.tick,actor:actorId(h),area:a.id,kind:'approach',from,to:e.x,targetX:h.x,sourceHeight:shotHeight(s,e),targetHeight:occupiedCover(s,h)?crouchHeight(s,h):standingHeight(s,h),fired:false};const note=s.hero.positionNotes?.enemies[e.id];if(witness(s,e,a)&&note){note.x=e.x;note.seen=s.tick;}if(witness(s,e,a))ctx.log?.(s,'Страж тратит свою фазу на сближение. В этот ход он не стреляет.','combat');return true;
}
export function positionTacticalReply(s,e,h,raw,ctx){
 if(!positionedEnemy(s,e))return raw;const p=e.positionAttack,a=s.areas[h.area],cover=raw>0&&coverBlocks(s,e,h);p.phases++;
 p.last={tick:s.tick,actor:actorId(h),area:a.id,kind:raw<=0?'prepare':cover?'blocked':physicalDistance(a,e.x,h.x)<=p.melee?'melee':'shard',from:e.x,to:cover?cover.x:h.x,targetX:h.x,sourceHeight:shotHeight(s,e),targetHeight:occupiedCover(s,h)?crouchHeight(s,h):standingHeight(s,h),fired:raw>0};
 if(p.last.fired&&['shard','blocked'].includes(p.last.kind)&&!detachPhysicalShard(s,e,p.last)){p.last.kind='prepare';p.last.fired=false;return 0;}
 if(cover){p.blockedBy={object:cover.id,actor:actorId(h),tick:s.tick};if(witness(s,e,a))ctx.log?.(s,'Прямой каменный осколок разбивается о низкий выступ. Защита действует именно с этой стороны.','guard');return 0;}
 if(raw>0)p.blockedBy=null;return raw;
}
