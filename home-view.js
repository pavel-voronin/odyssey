export function paintHome(c,a,width,ground){
 const h=a.home;if(!h)return;const chest=a.objects.find(o=>o.id===h.chest),at=x=>24+x/100*(width-48);
 if(chest){const x=at(chest.x);c.fillStyle='#705039';c.fillRect(x-14,ground-20,29,20);c.fillStyle='#9b7850';c.fillRect(x-16,ground-24,33,6);c.fillStyle='#b2a075';c.fillRect(x-10,ground-24,3,24);c.fillRect(x+8,ground-24,3,24);c.fillStyle='#d1b66d';c.fillRect(x-2,ground-13,5,6);if(chest.library?.security?.locked){c.strokeStyle='#302b24';c.lineWidth=2;c.strokeRect(x-3,ground-17,7,9);}const books=chest.items.filter(i=>i.textCopy&&chest.library?.copies.includes(i.id)).slice(0,6);for(let n=0;n<books.length;n++){c.fillStyle=['#b8ae82','#839b90','#ac8377'][n%3];c.fillRect(x-12+n*4,ground-32,3,8);c.fillStyle='#d7ca9f';c.fillRect(x-12+n*4,ground-30,3,1);}}
 if(h.state!=='ready')return;const d=a.objects.find(o=>o.id===h.device);if(!d)return;const x=at(d.x);
 if(d.kind==='homeBench'){
  c.fillStyle='#5c422e';c.fillRect(x-23,ground-30,5,30);c.fillRect(x+18,ground-30,5,30);c.fillStyle='#b39466';c.fillRect(x-28,ground-34,57,7);c.fillStyle='#8d9a92';c.fillRect(x+5,ground-44,14,10);c.fillRect(x+9,ground-36,5,8);c.strokeStyle='#c4c6a5';c.lineWidth=2;c.beginPath();c.moveTo(x+3,ground-45);c.lineTo(x+21,ground-45);c.stroke();c.fillStyle='#76614b';c.fillRect(x-15,ground-39,16,4);
 }else{
  c.fillStyle='#766658';c.fillRect(x-24,ground-43,49,43);c.fillStyle='#292a27';c.fillRect(x-16,ground-27,33,27);c.fillStyle='#51493d';c.fillRect(x-5,ground-80,12,37);c.fillStyle='#585f51';c.fillRect(x-14,ground-52,29,11);c.fillStyle='#a2956a';c.fillRect(x-17,ground-54,35,4);
  if(['preparing','ready'].includes(a.hearthKitchen?.current?.status)){c.fillStyle='#c8863e';c.fillRect(x-9,ground-15,19,7);c.fillStyle='#e4c26a';c.fillRect(x-3,ground-19,8,11);}
 }
}
