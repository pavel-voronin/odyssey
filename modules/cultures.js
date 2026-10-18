import {enabled} from '../rules.js';
import {visualRandom} from '../appearance.js';
const words=text=>text.split('|');
const randomFor=(s,key)=>{const rnd=visualRandom(s.seed,key);rnd();rnd();rnd();return rnd;};
export const CULTURES=[
  {id:'river',name:'Речные земли',style:'Имя и родовая фамилия',first:words('Ал|Бер|Вел|Дар|Ел|Ил|Кор|Лад|Мир|Нер|Ол|Рад|Рен|Сев|Тар|Яр'),last:words('ана|ен|ия|ис|о|ея|ин|ада|эль|ай|ора|ун|ена|ар|ав|ина')},
  {id:'coast',name:'Вольные берега',style:'Имя и берег происхождения',first:words('Ма|Те|Ни|Са|Ле|О|Ва|Ра|Ай|Но|Пе|Се|Э|Ю|Ла|И'),last:words('рис|вель|на|ри|ла|сса|рен|ди|сар|ми|ора|но|ай|ве|тта|эль')},
  {id:'steppe',name:'Дальние кочевья',style:'Имя и родовое прозвание',first:words('Ар|Бат|Джа|Ка|Мер|Но|Ор|Са|Ту|Ур|Ха|Ша|Эр|Юр|Ял|Зу'),last:words('ан|га|ри|май|ша|й|хар|ла|дай|ту|ра|жан|ай|кир|на|хан')},
  {id:'deep',name:'Каменные дома',style:'Имя и принадлежность к дому',first:words('Бор|Дур|Кер|Тор|Грум|Вар|Нар|Зер|Рок|Хар|Ур|Даг|Мор|Гар|Брум|Траг'),last:words('дан|грим|рик|да|на|ум|гор|дис|вар|нир|ра|бор|ки|ри|дор|гин')},
  {id:'grove',name:'Корневые союзы',style:'Имя и родовая ветвь',first:words('Иль|Эл|Ли|Ти|Си|Фа|Аэ|Ни|Тэ|Оэ|Эри|Сэ|Ви|Иа|Уи|Лю'),last:words('эна|риэль|ви|ан|эли|сия|наэ|ин|лэй|ара|ти|мэ|ора|си|эль|на')},
  {id:'glass',name:'Стеклянные круги',style:'Созвучие и контур',first:words('Кса|Ом|Ир|Ара|Ти|Ло|Нем|Эс|Ри|Ун|Вей|Ха|Аф|Ке|Оро|Икс'),last:words('Кси|Лам|Орт|Ва|Рей|Са|Ни|Эм|Ко|Ра|Ио|Тек|Ур|Фи|Ом|Сей')},
  {id:'ember',name:'Пепельные очаги',style:'Имя и имя родителя',first:words('Аш|Зар|Эш|Вир|Ка|Иш|Ру|Да|Ше|Нар|Ме|Тар|Уш|Сор|Ша|Ар'),last:words('ира|ан|еш|ми|ар|уна|ши|дар|са|и|ва|ай|ен|ра|ин|ана')},
  {id:'dream',name:'Путники сновидений',style:'Образ вместо родовой фамилии',first:words('Эхо|Сон|Шёпот|Отблеск|Память|Свет|Вздох|Тень|Отзвук|Поворот|Осколок|Нить'),last:words('Дождя|Глубин|Пепла|Мостов|Оттепели|Луны|Колоколен|Рассвета|Прилива|Песка|Тумана|Огня')}
];
export const culture=id=>CULTURES.find(c=>c.id===id)||CULTURES[0];
export function areaCulture(s,a){
  if(a?.culture)return a.culture;
  const root=a?.city&&s.areas[a.city];if(root?.culture)return root.culture;
  const rnd=randomFor(s,`culture:${a?.continent||'c0'}:${a?.city||a?.id||'origin'}`);
  return CULTURES[Math.floor(rnd()*CULTURES.length)].id;
}
export function personCulture(s,record,id){
  if(record.culture)return record.culture;
  const parent=(record.parents||[]).map(p=>s.people?.[p]).find(p=>p?.culture);if(parent)return parent.culture;
  const local=areaCulture(s,s.areas[record.area]),rnd=randomFor(s,'culture-mix:'+id);
  if(rnd()<.68)return local;
  const others=CULTURES.filter(c=>c.id!==local);return others[Math.floor(rnd()*others.length)].id;
}
export function makeName(s,record){
  const id=record.id||'unnamed',c=culture(record.culture||personCulture(s,record,id));
  const rnd=randomFor(s,'name:'+id),pick=list=>list[Math.floor(rnd()*list.length)];
  let given=(pick(c.first)+(c.id==='glass'?'·':c.id==='dream'?' ':'')+pick(c.last)).replace(/([аеёиоуыэюя])\1/gi,'$1'),family='';
  if(c.id==='river')family=pick(words('Вереск|Ив|Лип|Орех|Ясен|Камыш|Ручь|Рябин|Мельник|Ткач|Озер|Лугов|Лес|Ольх|Кедр|Долин'))+pick(words('ов|ин|ич|ский|енко|ан|ец|ев'));
  if(c.id==='coast')family='с '+pick(words('Медных Причалов|Белых Песков|Семи Волн|Северного Рейда|Янтарных Отмелей|Птичьих Скал|Тихих Верфей|Синего Мыса|Дальней Косы|Лунного Берега|Зелёных Бухт|Сухих Доков|Треснувшего Маяка|Рыбачьих Крыш|Парусного Двора|Южной Кромки'));
  if(c.id==='steppe')family=pick(words('Ясный|Тихий|Рыжий|Серый|Стальной|Вольный|Дальний|Лунный|Старый|Белый|Медный|Упрямый|Золотой|Последний|Сонный|Пыльный'))+' '+pick(words('Ветер|Клык|Сокол|Брод|След|Колос|Таран|Шорох|Ручей|Камень|Шатёр|Конь|Рассвет|Звон|Тростник|Огонь'));
  if(c.id==='deep')family='из дома '+pick(words('Гран|Мор|Верх|Керн|Таль|Дур|Ост|Мед|Холм|Рун|Квар|Скол|Тор|Баз|Свод|Крем'))+pick(words('гора|молота|свода|клина|жилы|порога|ключа|огня|зубца|гранита|колодца|камня|света|пласта|звона|руды'));
  if(c.id==='grove')family='ветвь '+pick(words('Серебряной|Тихой|Древней|Янтарной|Синей|Лунной|Северной|Высокой|Весенней|Речной|Белой|Звонкой'))+' '+pick(words('Ивы|Сосны|Рябины|Ольхи|Липы|Берёзы|Ели|Лозы|Осоки|Черёмухи|Вербы|Лиственницы'));
  if(c.id==='glass')family='контур '+pick(c.first)+pick(c.last).toLowerCase()+pick(words('а|и|о|э|у|ей|ай|ом'));
  if(c.id==='ember'){
    const parent=(record.parents||[]).map(id=>s.people?.[id]).find(Boolean);
    family='дитя '+(parent?.naming?.given||parent?.name.split(' ')[0]||pick(c.first)+pick(c.last));
  }
  if(c.id==='dream')family=pick(words('до рассвета|за последней дверью|между приливами|после тишины|у края сна|перед дождём|из забытых дней|без отражения|на изнанке света|за поворотом|в пустом зеркале|над тёплой водой'));
  if(record.family!==undefined&&!(c.id==='ember'&&record.parents?.length))family=record.family;
  return {given,family,full:[given,family].filter(Boolean).join(' '),culture:c.id,style:c.style};
}
export function initializeCultures(s,h){
  if(h)h.culture ||= s.people?.[h.lineage]?.culture||areaCulture(s,s.areas[h.area]);
}
export function nameRecord(s,record,id){
  const data={...record};delete data.procedural;
  data.culture ||= personCulture(s,record,id);
  if(record.procedural&&enabled(s,'cultures')){
    const naming=makeName(s,{...data,id});data.name=naming.full;data.naming=naming;data.family=naming.family;
  }else data.family ??=data.name?.split(' ').slice(1).join(' ')||'';
  return data;
}
