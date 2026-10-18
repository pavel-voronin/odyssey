import {newMetricRoute} from './metric-route-state.js';
import {enabled} from '../rules.js';
import {CONTINENT_NAMES,BIOMES} from '../content.js';
import {registerSpatialArea} from './spatial.js';
const hash=(seed,key)=>{let n=seed>>>0;for(const c of key)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
const names=['Ветрогория','Луговье','Белокрай','Тальмар','Озёрье','Яснолесье'];
export function geographyPlan(seed,{capitalType='village',capitalRealm='surface'}={}){
 const dy=hash(seed,'land/offset')%17-8,point=(x,y)=>({x,y:y+dy});
 const sites={},add=(key,type,name,x,y,landmass='c0',tier='wild',realm=BIOMES[type]?.realm||'surface')=>{sites[key]={key,type,name,point:point(x,y),landmass,country:realm==='dream'||realm==='clockwork'||type==='sea'?null:landmass==='c1'?'country-1':'country-0',region:realm==='dream'||realm==='clockwork'||type==='sea'?null:landmass==='c1'?'region-1':'region-0',tier,realm,area:null};};
 add('crossroads','road','Развилка',100,140);add('capital',capitalType,'Главный город',capitalType==='port'?290:100,capitalType==='port'?80:90,'c0','city',capitalRealm);
 add('hollow','forest','Лесная ложбина',170,110);add('ruins','ruins','Старые руины',240,100);add('camp','camp','Тихая стоянка',170,180);
 add('center','village','Окружной посад',80,210,'c0','district-center');add('village-west','village','Западная деревня',40,180,'c0','village');add('village-east','village','Восточная деревня',230,210,'c0','village');
 add('port-west','port','Западная пристань',290,150,'c0','port');add('strait','sea','Пролив двух берегов',365,150,null);add('port-east','port','Восточная пристань',440,150,'c1','port');add('village-overseas','village','Заокеанская деревня',510,150,'c1','village');
 // Existing biome/connector content remains reachable in this finite first frame.
 add('mountain','mountain','Северный перевал',55,30);add('desert','desert','Сухие земли',220,235);add('island','island','Островной берег',550,200,'c1');add('citadel','citadel','Прибрежная крепость',530,85,'c1','district-center');
 add('cave','cave','Пещера под ложбиной',170,110);add('undercity','undercity','Подземный посад',130,110,'c0','district-center');add('dream','dream','Отражённая роща',240,100,null);add('clockwork','clockwork','Механический двор',240,100,null);
 sites['port-west'].berth=point(300,150);sites['port-east'].berth=point(430,150);if(capitalType==='port')sites.capital.berth=point(296,80);
 const roads=[['crossroads','capital'],['capital','hollow'],['hollow','ruins'],['hollow','camp'],['crossroads','hollow'],['crossroads','village-west'],['village-west','center'],['center','village-east'],['village-east','hollow'],['capital','port-west'],['village-east','port-west'],['port-west','strait','sea',6,3],['strait','port-east','sea',6,3],['port-east','village-overseas'],['crossroads','mountain'],['village-east','desert'],['village-overseas','island'],['village-overseas','citadel'],['hollow','cave','stairs',3],['cave','undercity'],['ruins','dream','portal',3],['dream','clockwork','portal',3]].map(([from,to,mode='road',duration=0,cost=0],i)=>({id:'planned-road/'+i,from,to,mode,duration,cost}));
 for(const r of roads)if(r.mode==='road'&&sites[r.from].realm!==sites[r.to].realm){r.mode=[sites[r.from].realm,sites[r.to].realm].includes('underground')?'stairs':'portal';r.duration=3;}
 return {version:1,revision:1,scheme:'regional-diagram-v1',unit:'diagram',seed,bounds:{left:-40,right:640,top:-40+dy,bottom:310+dy},landmasses:{c0:{id:'c0',polygon:[[0,0],[280,0],[300,100],[300,220],[250,260],[0,260]].map(([x,y])=>point(x,y))},c1:{id:'c1',polygon:[[430,50],[580,50],[590,240],[450,250],[430,180]].map(([x,y])=>point(x,y))}},countries:{'country-0':{id:'country-0',name:names[hash(seed,'country/0')%names.length],landmass:'c0',capital:'capital'},'country-1':{id:'country-1',name:names[(hash(seed,'country/0')%names.length+1)%names.length],landmass:'c1',capital:'port-east'}},regions:{'region-0':{id:'region-0',name:'Срединный округ',country:'country-0',center:'center'},'region-1':{id:'region-1',name:'Заокеанский округ',country:'country-1',center:'port-east'}},sites,roads};
}
export function createGeographyFrame(s,base,ctx){
 if(!enabled(s,'geography-frame')||s.geographyFrame||s.hero||s.observation||s.tick!==0)return;
 const town=s.areas[base.capital],frame=geographyPlan(s.seed,{capitalType:town.type,capitalRealm:town.realm});frame.created=s.tick;s.geographyFrame=frame;
 const overseas=CONTINENT_NAMES.filter(n=>n!==s.continents.c0.name);s.continents.c1={id:'c1',name:overseas[hash(s.seed,'continent/1')%overseas.length]};s.nextContinent=2;
 for(const site of Object.values(frame.sites)){
  const geography={version:1,site:site.key,landmass:site.landmass,country:site.country,region:site.region,tier:site.tier,ordinal:0};
  const id=base[site.key]||ctx.addArea(s,site.type,site.name,site.tier==='wild'?2:0,{continent:site.landmass||'c0',realm:site.realm,geography});
  const a=s.areas[id];site.area=id;a.geography=geography;a.expanded=true;registerSpatialArea(s,a);
 }
 for(const r of frame.roads){const a=frame.sites[r.from].area,b=frame.sites[r.to].area;ctx.connect(s,a,b,{mode:r.mode,duration:r.duration,cost:r.cost,...(r.mode==='road'?{metric:newMetricRoute(frame.sites[r.from],frame.sites[r.to])}:{})});}
 // Existing constructors own all stock, people, workshops and rights, exactly once.
 for(const site of Object.values(frame.sites)){const a=s.areas[site.area];ctx.openSettlement(s,a,{...ctx,log:()=>{}});}
}
