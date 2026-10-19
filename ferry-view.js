export function paintFerry(c,x,y,width,f){
 c.save();c.translate(x,y);const scale=width/300;c.scale(scale,scale);
 c.fillStyle='#654d36';c.beginPath();c.moveTo(-150,0);c.lineTo(150,0);c.lineTo(126,28);c.lineTo(-116,28);c.closePath();c.fill();c.strokeStyle='#b79c6c';c.lineWidth=2;c.beginPath();c.moveTo(-146,1);c.lineTo(144,1);c.moveTo(-128,15);c.lineTo(134,15);c.stroke();
 c.fillStyle='#9c8962';c.fillRect(-144,-3,288,5);c.strokeStyle='#c4b78b';c.lineWidth=3;c.beginPath();c.moveTo(70,0);c.lineTo(70,-100);c.stroke();c.fillStyle='#ded4ad';c.beginPath();c.moveTo(66,-95);c.lineTo(-12,-26);c.lineTo(66,-26);c.closePath();c.fill();
 c.strokeStyle='#74634b';c.lineWidth=1;c.beginPath();c.moveTo(-20,-26);c.lineTo(-110,0);c.moveTo(70,-95);c.lineTo(140,0);c.stroke();
 for(let i=0;i<Math.ceil(f.food/2);i++){c.fillStyle='#91815a';c.fillRect(-130+i*18,-17,15,14);c.strokeStyle='#c4b17a';c.strokeRect(-130+i*18,-17,15,14);}
 c.restore();
}
