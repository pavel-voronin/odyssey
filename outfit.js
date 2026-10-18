import {visualRandom} from './visual-random.js';

// Frozen v1 visual recipe. Identity belongs to the physical item, never to its
// wearer, current profession, world clock or simulation random stream.
export function itemOutfit(item){
 if(!item||item.slot!=='armor')return null;
 const base=item.base||String(item.name||'').split(':')[0],metal=['mail','доспех'].includes(base);
 const rnd=visualRandom(0,`outfit.v1:${item.id||item.name||base}:${base}`),pick=a=>a[Math.floor(rnd()*a.length)];
 const cloak=pick(metal?['#819eaa','#b89b70','#94a88a','#a09ab9']:['#ad614b','#598f9e','#9673a3','#92964e','#507861','#b08a52']);
 return {garmentVersion:1,garmentId:item.id||null,garmentName:item.name||'Одежда',material:metal?'metal':'cloth',coat:metal?'cuirass':pick(['mantle','long']),armored:metal,cloak,trim:pick(['#e8c88f','#cee0d2','#ddc0ce']),plateColor:metal?cloak:null,edgeColor:metal?'#d1d8c6':'#382f32'};
}

// Shared painter: scene, portrait, and the recorded scene contour use exactly
// the same garment commands. No separately maintained costume shadow.
export function drawGarment(c,look={},color=look.cloak||'#a9c686',lower=0){
 c.fillStyle=color;c.beginPath();c.moveTo(-5,-30);c.lineTo(6,-30);c.lineTo(9,-11);c.lineTo(-8,-11);c.fill();
 if(['long','robe'].includes(look.coat)){c.beginPath();c.moveTo(-6,-25);c.lineTo(7,-25);c.lineTo(11,lower?-11:-4);c.lineTo(-10,lower?-11:-4);c.fill();}
 if(look.coat==='mantle'){c.beginPath();c.moveTo(-7,-31);c.lineTo(8,-31);c.lineTo(13,-10);c.lineTo(5,-13);c.lineTo(2,-21);c.lineTo(-4,-12);c.lineTo(-12,-9);c.closePath();c.fill();}
 if(look.coat==='vest'){c.fillStyle=look.trousers;c.fillRect(-4,-28,4,16);c.fillRect(3,-28,4,16);}
 c.fillStyle='#b9a17c';c.fillRect(-6,-15,14,2);c.fillRect(2,-16,3,4);
 if(look.armored){c.fillStyle=look.plateColor||'#a7b5ac';c.fillRect(-8,-29,5,7);c.fillRect(4,-29,5,7);c.fillStyle=look.plateColor||'#798c82';c.fillRect(-3,-28,7,10);}
 if(look.garmentVersion===1){
  if(look.material==='metal'){c.fillStyle=look.plateColor;c.beginPath();c.moveTo(-9,-31);c.lineTo(-3,-31);c.lineTo(-2,-24);c.lineTo(-10,-24);c.closePath();c.fill();c.beginPath();c.moveTo(4,-31);c.lineTo(9,-31);c.lineTo(11,-24);c.lineTo(4,-24);c.fill();c.strokeStyle=look.edgeColor;c.lineWidth=1;c.beginPath();c.moveTo(-3,-27);c.lineTo(4,-27);c.moveTo(-3,-23);c.lineTo(4,-23);c.stroke();}
  c.fillStyle=look.trim;c.fillRect(-6,-31,14,3);c.fillRect(1,-28,2,10);
 }
}
