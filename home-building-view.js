// An existing licensed building changes its fitted frontage. Its title,
// roof silhouette and facade identity are retained throughout the work.
export function paintHomeBuilding(c,r,half,height){
 if(!r||r.status==='planned')return;const x=half-25,w=22;
 c.fillStyle='#83776a';c.fillRect(x,-7,w,7);
 if(r.status==='foundation')return;
 c.fillStyle='#987750';c.fillRect(x,-35,3,29);c.fillRect(x+w-3,-35,3,29);c.fillRect(x,-37,w,4);
 if(r.status==='frame'||r.status==='fitting'){
  c.strokeStyle='#bd9d6a';c.lineWidth=2;c.beginPath();c.moveTo(x,-7);c.lineTo(x+w,-35);c.stroke();
  if(r.status==='fitting'){c.fillStyle='#9b9074';c.fillRect(x+3,-31,w-6,22);}return;
 }
 c.fillStyle='#9c9579';c.fillRect(x+2,-33,w-4,26);c.fillStyle='#bfb391';c.fillRect(x+4,-30,w-8,18);c.fillStyle='#657d78';c.fillRect(x+6,-28,w-12,14);c.fillStyle='#bfb391';c.fillRect(x+w/2-1,-29,2,16);
}
