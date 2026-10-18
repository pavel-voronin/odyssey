import {localFoodEnabled,foodSourceState} from './modules/local-food.js';
// A physical source symbol, not an interactive button. Reads state only.
export function paintFoodSource(c,s,a,screenX,ground){
 if(!localFoodEnabled(s)||s.hero.transit)return;const source=foodSourceState(s,a);if(!source)return;
 const x=screenX(source.x);c.save();c.translate(x,ground);c.globalAlpha=source.available?1:.45;
 if(source.kind==='mushroom'){
  for(let i=0;i<Math.min(4,source.stock);i++){const dx=(i-1.5)*7,dy=i%2*3;c.fillStyle='#cabd91';c.fillRect(dx-1,dy-8,2,8);c.fillStyle='#a57e53';c.beginPath();c.ellipse(dx,dy-9,5,3.5,0,Math.PI,Math.PI*2);c.fill();c.fillStyle='#e4d6ac';c.fillRect(dx-1,dy-11,1,1);}
  if(!source.stock){c.strokeStyle='#a89b74';c.beginPath();c.moveTo(-8,-2);c.lineTo(8,-2);c.moveTo(0,-2);c.lineTo(2,-5);c.stroke();}
 }else{
  c.fillStyle='#416d77';c.beginPath();c.ellipse(0,1,18,4,0,0,7);c.fill();c.strokeStyle='#b3c3b5';c.lineWidth=1;c.beginPath();c.moveTo(-13,0);c.quadraticCurveTo(-4,-2,4,0);c.moveTo(1,3);c.quadraticCurveTo(7,1,14,3);c.stroke();
  if(source.stock){c.fillStyle='#cad0ad';c.beginPath();c.ellipse(0,-5,5,2.5,-.2,0,7);c.moveTo(4,-5);c.lineTo(8,-8);c.lineTo(8,-3);c.fill();}
 }
 c.restore();
}
