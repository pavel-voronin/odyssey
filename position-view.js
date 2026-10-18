import {positionsOn,rayHeight} from './modules/position-state.js';
export function paintStoneCover(c,s,o,screenX,ground){
 if(o.kind!=='stoneCover')return;const x=screenX(o.x);c.save();c.fillStyle='#66706d';c.beginPath();c.moveTo(x-10,ground);c.lineTo(x-9,ground-25);c.lineTo(x+4,ground-28);c.lineTo(x+11,ground-22);c.lineTo(x+10,ground);c.closePath();c.fill();c.strokeStyle='#9ca298';c.beginPath();c.moveTo(x-8,ground-24);c.lineTo(x+4,ground-27);c.lineTo(x+9,ground-21);c.stroke();c.restore();
}
export function paintPositionRay(c,s,e,screenX,ground){
 const p=e.positionAttack,l=p?.last;if(!positionsOn(s)||!l||l.tick!==s.tick||!l.fired||!['shard','blocked'].includes(l.kind))return;
 const height=l.kind==='blocked'?rayHeight(l.from,l.targetX,l.sourceHeight,l.targetHeight,l.to):l.targetHeight;c.save();c.strokeStyle='#d8c79a';c.lineWidth=2;c.beginPath();c.moveTo(screenX(l.from),ground-l.sourceHeight);c.lineTo(screenX(l.to),ground-height);c.stroke();if(l.kind==='blocked'){const x=screenX(l.to),y=ground-height;c.fillStyle='#e7dbc0';c.fillRect(x-2,y-2,4,4);}c.restore();
}
