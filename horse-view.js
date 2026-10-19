// A horse has its own ground contact; the rider uses that same physical support.
export function paintHorse(c,x,y,m,{direction=1,walking=false,phase=0}={}){
 c.save();c.translate(x,y);c.scale(direction,1);if(m.hp<=0){c.translate(0,-8);c.rotate(-Math.PI/2);}
 c.strokeStyle='#31261f';c.lineWidth=4;c.beginPath();c.moveTo(-27,-26);c.lineTo(-39,-10);c.stroke();
 for(let i=0;i<4;i++){const x=i<2?-20:18,step=walking?Math.sin(phase*Math.PI*2+(i%2)*Math.PI)*6:0;c.strokeStyle=i%2?'#80553b':'#543a2c';c.lineWidth=4;c.beginPath();c.moveTo(x+(i%2)*5,-25);c.lineTo(x+step,-13);c.lineTo(x-step,-2);c.stroke();c.fillStyle='#242720';c.fillRect(x-step-3,-3,7,3);}
 c.fillStyle=m.hp>0?'#93633e':'#665344';c.beginPath();c.ellipse(0,-30,30,13,0,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(18,-32);c.lineTo(26,-61);c.lineTo(36,-59);c.lineTo(37,-41);c.lineTo(28,-26);c.closePath();c.fill();c.fillRect(30,-61,19,10);c.beginPath();c.moveTo(29,-59);c.lineTo(28,-70);c.lineTo(33,-62);c.fill();c.fillStyle='#302b23';c.fillRect(25,-60,4,20);c.fillRect(38,-58,2,2);
 if(m.rider){c.fillStyle='#414436';c.fillRect(-11,-44,23,7);c.strokeStyle='#baa479';c.lineWidth=1;c.beginPath();c.moveTo(47,-55);c.lineTo(4,-42);c.stroke();}
 if(m.cargo){c.fillStyle='#73684a';c.fillRect(-20,-38,12,21);c.strokeStyle='#c2ad78';c.lineWidth=1;c.strokeRect(-20,-38,12,21);}
 c.restore();
}
