import {billboardFrame} from './camera-perspective.js';
import {cookingEnabled,actualHearth,kitchenBatch} from './modules/hearth-food.js';
export function paintHearthMeal(c,s,a,screenX,ground,{camera,dpr=1}={}){
 if(!cookingEnabled(s)||s.hero.transit)return;const fire=actualHearth(s,a),b=kitchenBatch(s,a.id);if(!fire||!b||!['preparing','ready'].includes(b.status))return;
 const x=screenX(fire.x)+13,restore=billboardFrame(c,camera,x,ground,dpr);c.save();c.translate(x,ground);c.strokeStyle='#403d32';c.lineWidth=2;c.beginPath();c.moveTo(-7,0);c.lineTo(-6,-8);c.moveTo(7,0);c.lineTo(6,-8);c.stroke();c.fillStyle='#454e47';c.beginPath();c.ellipse(0,-8,9,3,0,0,7);c.fill();c.fillRect(-8,-8,16,5);c.beginPath();c.ellipse(0,-3,8,3,0,0,Math.PI);c.fill();c.strokeStyle='#b6a87e';c.lineWidth=1;c.beginPath();c.ellipse(0,-8,8,2.5,0,0,7);c.stroke();
 if(b.status==='preparing'||s.tick<b.warmUntil){c.strokeStyle='#c8cbb1';c.globalAlpha=.65;for(const dx of [-4,3]){c.beginPath();c.moveTo(dx,-12);c.bezierCurveTo(dx-3,-15,dx+3,-18,dx,-21);c.stroke();}}
 c.restore();restore();
}
