import {wardPowered,guardiansOn} from './modules/guardian-state.js';
export function paintGuardianShield(c,s,e,x,ground){
 if(!e.alive||!wardPowered(s,e))return;c.save();c.strokeStyle='#7ac8d4';c.globalAlpha=.65;c.lineWidth=2;c.beginPath();c.ellipse(x,ground-23,21,28,0,0,Math.PI*2);c.stroke();c.restore();
}
export function paintGuardianNode(c,s,a,node,screenX,ground){
 if(node.kind!=='guardianNode')return;const on=guardiansOn(s)&&node.guardianSupply.state==='on',x=screenX(node.x),e=a.objects.find(o=>o.id===node.guardianSupply.enemy&&o.alive);c.save();
 c.fillStyle='#586367';c.fillRect(x-8,ground-12,16,12);c.fillStyle=on?'#8bdae0':'#7d8581';c.beginPath();c.moveTo(x,ground-35);c.lineTo(x+8,ground-24);c.lineTo(x,ground-13);c.lineTo(x-8,ground-24);c.closePath();c.fill();
 if(on&&e){c.strokeStyle='#7ac8d4';c.globalAlpha=.65;c.lineWidth=2;c.beginPath();c.moveTo(x,ground-25);c.quadraticCurveTo((x+screenX(e.x))/2,ground-47,screenX(e.x),ground-28);c.stroke();}c.restore();
}
