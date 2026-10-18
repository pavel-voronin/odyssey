import {buildingPalette} from './palette.js';
import {visualRandom} from './appearance.js';
export function scenery(seed,area,enabled=true){
  if(!enabled)return {district:null,offset:area.depth||0,relief:29,sunX:.77,sunY:.23,roof:'#615f48',plaster:'#929b7d',values:Array.from({length:48},(_,i)=>(i*.37)%1)};
  const rnd=visualRandom(seed,'landscape:'+area.id+':'+area.name),values=Array.from({length:48},()=>rnd());
  const district=({'Торговые ряды':'market','Мастерские':'workshop','Жилой посад':'homes','Площадь':'square'})[area.district]||null;
  const colors=buildingPalette(seed,area,0);
  return {paletteVersion:2,district,offset:values[0]*12,relief:18+values[1]*25,sunX:.16+values[2]*.67,sunY:.15+values[3]*.16,roof:colors.roofColor,plaster:colors.plaster,values};
}
export function houseProfile(seed,area,index,view=scenery(seed,area)){
  const rnd=visualRandom(seed,`house:${area.id}:${index}`);rnd();rnd();rnd();
  const pick=list=>list[Math.floor(rnd()*list.length)];
  const colors=buildingPalette(seed,area,index);
  const profile={width:46+Math.floor(rnd()*25),floors:pick([1,1,1,2]),roof:pick(['gable','hip','flat','thatch']),material:['undercity','citadel'].includes(area.type)?'stone':pick(['plaster','timber','stone']),windows:pick([1,2,3]),door:pick([-1,0,1]),shutters:rnd()<.5,porch:rnd()<.4,chimney:area.district==='Мастерские'||rnd()<.55,plaster:pick([view.plaster,'#9ba38d','#a79b80','#82978b']),roofColor:pick([view.roof,'#65746c','#7a6656','#8e7758']),smoke:area.district==='Мастерские',...colors};
  if(profile.roof==='thatch')profile.roofColor=colors.strawColor;if(profile.material==='stone')profile.plaster=colors.stoneColor;
  return profile;
}
