import {interiorDoorSigns,paintSymbolPlaque} from './world-signs.js';
import {workshopSite} from './modules/workshop-place.js';
function paintWorkshop(c,a,width,ground,object){
 const burned=object?.state==='burned',x=24+(a.interior.station??68)/100*(width-48),broken=object?.workTool?.state==='broken';
 c.fillStyle=burned?'#3b3932':'#514637';c.fillRect(width*.22,ground-80,48,5);
 if(!burned){
  c.strokeStyle='#aaa58e';c.lineWidth=2;for(let i=0;i<3;i++){const rx=width*.22+8+i*14;c.beginPath();c.moveTo(rx,ground-80);c.lineTo(rx,ground-57);c.stroke();c.fillStyle=i===1?'#acb5ad':'#8d9d91';c.fillRect(rx-4,ground-76,8,i===1?5:10);}
  c.fillStyle='#3c4946';c.fillRect(width*.39,28,32,34);c.fillStyle='#93aaa1';c.fillRect(width*.39+4,32,24,26);c.strokeStyle='#645b49';c.beginPath();c.moveTo(width*.39+16,30);c.lineTo(width*.39+16,60);c.stroke();
 }else{c.strokeStyle='#4d4a3e';c.lineWidth=4;c.beginPath();c.moveTo(width*.23,ground-72);c.lineTo(width*.41,ground-23);c.stroke();}
 c.fillStyle=burned?'#454137':'#69513b';c.fillRect(x-31,ground-29,6,29);c.fillRect(x+25,ground-29,6,29);c.fillStyle=burned?'#51483b':'#a1845a';c.fillRect(x-37,ground-35,74,9);
 c.fillStyle=burned?'#625b4b':'#626e68';c.fillRect(x+3,ground-46,13,11);c.fillRect(x+7,ground-35,5,6);
 c.strokeStyle=broken?'#b68c72':'#bdc5b8';c.lineWidth=3;c.beginPath();c.moveTo(x+1,ground-46);c.lineTo(x+8,ground-46);c.moveTo(x+(broken?20:12),ground-(broken?42:46));c.lineTo(x+20,ground-(broken?38:46));c.stroke();
 if(!burned){c.strokeStyle='#a89976';c.lineWidth=2;c.beginPath();c.moveTo(x-25,ground-39);c.lineTo(x-10,ground-39);c.moveTo(x-15,ground-45);c.lineTo(x-15,ground-34);c.stroke();}
 if(burned){c.strokeStyle='#373a32';c.lineWidth=3;c.beginPath();c.moveTo(x-37,ground-30);c.lineTo(x+9,ground-8);c.moveTo(x-14,ground-2);c.lineTo(x+33,ground-9);c.stroke();}
}
// Pure room scenery. Coordinates share the scene's existing horizontal movement axis.
export function paintInterior(c,a,width,height,ground,world){
 const room=a.interior,shop=room.kind==='workshop'?workshopSite(world,a)?.object:null,wood='#76614b',dark='#302e29',wall=shop?.state==='burned'?'#48463b':'#655b4c';
 const symbols=world?.rules?.['world-signs']!==false,doors=symbols?interiorDoorSigns(world,a):null;
 c.fillStyle=wall;c.fillRect(0,0,width,height);
 c.fillStyle='#494738';c.fillRect(0,ground,width,height-ground);
 c.strokeStyle='#615b47';c.lineWidth=1;
 for(let y=ground+9;y<height;y+=13){c.beginPath();c.moveTo(0,y);c.lineTo(width,y);c.stroke();}
 for(let x=10;x<width;x+=58){c.fillStyle=wood;c.fillRect(x,0,6,ground);}
 c.fillStyle=wood;c.fillRect(0,12,width,8);c.fillRect(0,ground-7,width,7);
 if(shop?.state==='burned'){c.fillStyle='#788473';c.fillRect(width*.53,0,width*.17,23);c.fillRect(width*.73,0,width*.09,16);}
 if(symbols){for(const door of doors){const x=24+door.x/100*(width-48);c.fillStyle=dark;c.fillRect(x-12,ground-60,25,60);c.strokeStyle='#998566';c.strokeRect(x-12,ground-60,25,60);c.fillStyle='#b5a679';c.fillRect(x+5,ground-29,3,3);paintSymbolPlaque(c,door.kind,x,ground-76,28,22,door.direction);}}
 else{const doorX=24+.08*(width-48);c.fillStyle=dark;c.fillRect(doorX-12,ground-60,25,60);c.strokeStyle='#998566';c.strokeRect(doorX-12,ground-60,25,60);c.fillStyle='#b5a679';c.fillRect(doorX+5,ground-29,3,3);c.fillStyle='#b2a68a';c.font='10px monospace';c.fillText(room.kind==='room'?'В ЗАЛ':'ВЫХОД',Math.max(2,doorX-16),ground-66);}
 if(room.kind==='workshop')paintWorkshop(c,a,width,ground,shop);
 else if(room.kind==='room'){
  for(const fraction of [.35,.67]){const x=width*fraction,bedWidth=Math.min(82,width*.24);c.fillStyle='#463a2d';c.fillRect(x-bedWidth/2-4,ground-48,6,48);c.fillRect(x+bedWidth/2-2,ground-24,5,24);c.fillStyle='#9b8768';c.fillRect(x-bedWidth/2,ground-29,bedWidth,8);c.fillStyle='#7b8d84';c.fillRect(x-bedWidth/2+1,ground-34,bedWidth-2,10);c.fillStyle='#c3b99c';c.fillRect(x-bedWidth/2+2,ground-38,17,8);c.fillStyle='#514333';c.fillRect(x-bedWidth/2,ground-21,4,21);}
  c.fillStyle='#393e39';c.fillRect(width*.72,34,39,35);c.fillStyle='#899e9b';c.fillRect(width*.72+4,38,31,27);c.strokeStyle=wood;c.beginPath();c.moveTo(width*.72+19,36);c.lineTo(width*.72+19,68);c.stroke();
 }else{
 for(const fraction of [.35,.57]){const x=width*fraction;c.fillStyle='#4e4134';c.fillRect(x-20,ground-22,5,20);c.fillRect(x+15,ground-22,5,20);c.fillStyle='#998364';c.fillRect(x-26,ground-28,52,8);c.fillStyle='#c1b18b';c.fillRect(x-8,ground-35,5,7);c.fillStyle='#8f734f';c.fillRect(x+7,ground-33,8,5);}
 c.fillStyle='#514333';c.fillRect(width*.73,ground-43,width*.12,43);c.fillStyle='#a08a66';c.fillRect(width*.71,ground-47,width*.15,8);
 for(let i=0;i<3;i++){c.fillStyle=i%2?'#a9997c':'#878e72';c.fillRect(width*.74+i*10,ground-56,5,9);}
 const entry=!symbols&&a.objects.find(o=>o.kind==='door'&&o.x>60);if(entry){const x=24+entry.x/100*(width-48);c.fillStyle=dark;c.fillRect(x-10,ground-59,21,59);c.strokeStyle='#9b8868';c.strokeRect(x-10,ground-59,21,59);c.fillStyle='#d0bf8d';c.font='8px monospace';c.fillText('ГОСТЕВАЯ',x-22,ground-65);}
 }
 if(symbols)paintSymbolPlaque(c,room.kind==='tavern'?'mug':room.kind==='room'?'bed':room.kind==='workshop'?'workshop':'neutral',width*(room.kind==='room'?.28:.78),44,30,25);
 else if(room.kind==='tavern'){c.fillStyle='#332f28';c.fillRect(width*.68,28,width*.28,32);c.fillStyle='#b7a98b';c.font='10px monospace';c.fillText('ОБЩИЙ ЗАЛ',width*.69,47);}else{c.fillStyle='#b7a98b';c.font='10px monospace';c.fillText(room.kind==='workshop'?'МАСТЕРСКАЯ':'ГОСТЕВАЯ',width*.24,45);}
 c.fillStyle='#bfa478';c.fillRect(width*.46,23,2,18);c.fillStyle=shop?.state==='burned'?'#696052':'#dbc28b';c.fillRect(width*.46-4,41,10,14);c.fillStyle='#6b593e';c.fillRect(width*.46-5,54,12,3);
}
