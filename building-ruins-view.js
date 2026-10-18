import {recordSilhouette,paintRoof} from './silhouette.js';
// Geometry and shadow share these same surviving wall/roof pieces. No scene
// query creates a building or repairs the stored condition.
function pieces(c,p,width,height,roofHeight){
 const r=p.structure,half=width/2;
 if(r.walls>=2)c.fillRect(-half,-height,width,height);
 else {c.fillRect(-half,-height*.55,7,height*.55);c.fillRect(half-8,-height*.36,8,height*.36);c.fillRect(-half,-9,width,9);c.beginPath();c.moveTo(-half+6,-height*.54);c.lineTo(-half+19,-height*.31);c.lineTo(-half+19,0);c.lineTo(-half+6,0);c.fill();}
 if(r.roof>=2){paintRoof(c,p,width,height,roofHeight);if(p.chimney)c.fillRect(width*.25,-height-24,8,26);}
 else if(r.walls>=2){c.fillRect(-half,-height-6,width*.28,6);c.fillRect(half*.35,-height-6,width*.32,6);}
}
const shells=new Map();
export function ruinedSilhouette(p,w,h,r){const key=[p.structure.roof,p.structure.walls,p.roof,p.chimney,w,h,r].join('/');if(shells.has(key))return shells.get(key);const shape=recordSilhouette(c=>pieces(c,p,w,h,r)).polygons;if(shells.size>=64)shells.delete(shells.keys().next().value);shells.set(key,shape);return shape;}
export function paintRuinedHouse(c,p,width,height,roofHeight){
 const r=p.structure;c.fillStyle=r.history.at(-1)?.kind==='fire'?'#4c4940':'#697160';pieces(c,p,width,height,roofHeight);
 c.strokeStyle='#3e4a3e';c.lineWidth=2;
 if(r.walls>=2){for(let i=0;i<3;i++){const x=-width*.3+i*width*.28;c.strokeRect(x,-height*.65,8,13);c.beginPath();c.moveTo(x,-height*.65);c.lineTo(x+8,-height*.65+13);c.stroke();}c.fillStyle='#293b32';c.fillRect(-7,-29,14,29);}
 c.strokeStyle='#555643';c.lineWidth=3;c.beginPath();c.moveTo(-width*.3,-8);c.lineTo(width*.27,-21);c.moveTo(-width*.1,-27);c.lineTo(width*.35,-4);c.stroke();
 if(r.roof===2){c.strokeStyle='#879174';c.lineWidth=5;c.beginPath();c.moveTo(-width*.2,-height-6);c.lineTo(width*.2,-height-roofHeight*.6);c.stroke();}
}
