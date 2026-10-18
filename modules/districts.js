import {revealArea} from '../actor-atlas.js';
import {enabled,moduleRandom} from '../rules.js';
import {initializeAreaFacades} from '../facades.js';
import {isTown} from './common.js';
import {createPerson} from './lineage.js';
const NAMES=['Адель','Ивар','Селин','Бран','Корен','Юна','Ним','Фарен','Летта','Саф','Дорн','Вела'];
const SPECIALISTS=[['Кузнец','artisan'],['Пекарь','artisan'],['Аптекарь','healer'],['Хозяин трактира','merchant'],['Картограф','scholar'],['Караванщик','merchant'],['Писарь','scholar'],['Страж','guard'],['Огородник','farmer'],['Лодочник','merchant'],['Ткач','artisan'],['Повитуха','healer']];
function populate(s,a,count,offset=0){
  for(let i=0;i<count;i++){
    const [role,job]=SPECIALISTS[(i+offset)%SPECIALISTS.length];
    const elder=s.people[a.population[0]],name=NAMES[Math.floor(moduleRandom(s,'districts')*NAMES.length)]+' '+(elder?.name.split(' ').slice(1).join(' ')||'Путник');
    const related=moduleRandom(s,'districts')<.4;
    const id=createPerson(s,{name,race:elder?.race||'human',role,area:a.id,alive:true,parents:related?elder?.parents?.slice()||[]:[],x:14+i*15,procedural:true,family:related?elder?.family:undefined},{initialJob:job});
    a.population.push(id);a.objects.push({id:'resident-'+id,kind:'resident',person:id,name:role+' '+s.people[id].name,x:14+i*15});
  }
}
export function openSettlement(s,a,ctx){
  if(!enabled(s,'districts')||!isTown(a)||a.city)return;
  a.city=a.id;a.district='Площадь';a.districts=[a.id];populate(s,a,4,0);
  if(a.geography&&['village','district-center'].includes(a.geography.tier)){a.district=a.geography.tier==='village'?'Деревня':'Районный центр';initializeAreaFacades(s,a);return;}
  const sections=[['Торговые ряды',['trade','parley','sea'],3],['Мастерские',['craft','healing','relic','time'],0],['Жилой посад',['healing','parley'],7]];
  let previous=a.id;
  for(const [label,services,offset] of sections){
    const id=ctx.addArea(s,a.type,`${a.name}: ${label}`,a.depth,{continent:a.continent,era:a.era,danger:0,culture:a.culture,...(a.geography?{geography:{...a.geography,ordinal:a.districts.length}}:{})});
    const d=s.areas[id];d.city=a.id;d.district=label;d.services=services;d.faction=a.faction;d.expanded=true;if(s.hero)revealArea(s,d);a.districts.push(id);populate(s,d,4,offset);
    if(label==='Мастерские'&&enabled(s,'workshop-dispute'))d.workshopLayout={version:1,owners:d.population.filter(id=>s.people[id]?.agenda?.job==='artisan').slice(0,2),created:s.tick};
    initializeAreaFacades(s,d);ctx.connect(s,previous,id);previous=id;
  }
  initializeAreaFacades(s,a);
  ctx.log(s,`${a.name}: площадь, торговые ряды, мастерские и жилой посад. В каждом районе живут и работают свои люди.`,'discover');
}
