import {attachedRope} from './modules/navigation-tool-state.js';
export function drawDescent(c,o,x,bottomX,ground){
 c.fillStyle='#6e6b54';c.beginPath();c.moveTo(x-9,ground);c.lineTo(x-4,ground-8);c.lineTo(x+5,ground-3);c.lineTo(x+8,ground);c.fill();
 c.strokeStyle='#756d56';c.lineWidth=2;c.beginPath();c.moveTo(x+3,ground-2);c.lineTo(bottomX,ground+5);c.stroke();
 c.fillStyle=o.descent.anchor.intact?'#8d6b42':'#514734';c.fillRect(x-3,ground-14,5,14);
 const rope=attachedRope(o);if(rope){c.strokeStyle='#d5bd86';c.lineWidth=1.5;c.beginPath();c.moveTo(x,ground-10);c.lineTo(bottomX,ground-1);c.stroke();c.beginPath();c.arc(x,ground-10,3,0,7);c.stroke();}
}
