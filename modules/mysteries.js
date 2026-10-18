import {moduleRandom} from '../rules.js';
import {goodsEnabled,takeGoods,putGoods} from './goods.js';
import {stat,hasHabit,moral,repute} from './common.js';
import {createPerson} from './lineage.js';
import {storyObject,storyGoal,chronicleChoice,narrativeChange} from './story-common.js';
import {noticeMisjudgment,principledClue} from './principles.js';
import {bindVerdictEvidence,isRecordedCase,closeRecordedVerdict,refundVerdictFee,verdictKnowledgeOn} from './verdict-evidence.js';
import {physicalDistance} from '../geometry.js';
export function start(s,c,ctx){
  if(isRecordedCase(c))return;
  const a=s.areas[c.source];a.population ||= [];const residents=a.population.map(id=>s.people[id]).filter(p=>p?.alive&&p.status==='resident'&&!p.child&&(!verdictKnowledgeOn(s)||p.area===a.id&&p.role!=='ребёнок'));
  if(goodsEnabled(s)&&!c.sealedFood){const quantity=Math.min(15,a.civic.food);takeGoods(s,a,'food',quantity,{flow:'exported',reason:'sealed-stores'});c.sealedFood={owner:'civic/'+a.id,place:a.id,quantity,initial:quantity,lost:0};}
  c.accused=residents[0]?.id;
  if(!c.accused){c.accused=createPerson(s,{name:'Летописец без алиби',race:s.hero.race,role:'архивариус',alive:true,area:a.id});a.population.push(c.accused);a.objects.push({id:'resident-'+c.accused,kind:'resident',person:c.accused,name:s.people[c.accused].name,x:42});}
  c.other=residents[1]?.id||createPerson(s,{name:'Смотритель запасных ключей',race:s.hero.race,role:'смотритель',alive:true,area:a.id});
  if(!a.population.includes(c.other)){a.population.push(c.other);a.objects.push({id:'resident-'+c.other,kind:'resident',person:c.other,name:s.people[c.other].name,x:74});}
  c.culprit=moduleRandom(s,'mysteries')<.5?c.accused:c.other;c.evidence=[];c.clues=[];
  s.people[c.accused].accused=c.id;
  for(const id of [c.source,...a.links].slice(0,2)){
    const object=storyObject(s,c,id,id===c.source?'Запись о пропавшей печати':'Следы у дороги',id===c.source?26:63);c.clues.push({area:id,object,found:false});
  }
  storyObject(s,c,c.source,'Стол разбирательства',42);c.stage='evidence';
  bindVerdictEvidence(s,c);
  ctx.log(s,`${s.people[c.accused].name} обвинён в краже поселковой печати. Без неё нельзя открыть общественные запасы. Смотритель требует быстрый приговор.`,'story');
  a.civic.safety=Math.max(0,a.civic.safety-8);
}
export function plan(s,c,ctx){
  const checked=principledClue(s,c,ctx),impatient=(hasHabit(s.hero,'reckless')||s.hero.alignment< -20)&&!checked;
  const clue=checked||c.clues.find(x=>!x.found&&(!isRecordedCase(c)||x.unavailableAt===undefined));
  if(clue&&!(impatient&&c.evidence.length>=1)){c.stage='evidence';storyGoal(s,c,ctx,clue.area,isRecordedCase(c)?clue.x:s.areas[clue.area].objects.find(o=>o.id===clue.object).x,'Проверить улику',checked?(isRecordedCase(c)?'Принятый принцип побуждает проверить ещё одну известную улику, прежде чем решать чужую судьбу.':'После прежней ошибки он проверит ещё одну известную улику, прежде чем решать чужую судьбу.'):'Чужая судьба зависит от того, что действительно произошло.');}
  else {c.stage='trial';storyGoal(s,c,ctx,c.source,42,'Закончить разбирательство','Улики и предубеждения могут привести к разным выводам.');}
  return true;
}
export function act(s,c,ctx){
  if(isRecordedCase(c)&&(c.status!=='active'||c.owner!==s.hero.lineage||!s.hero.alive||s.hero.transit))return;
  const h=s.hero;h.goal=null;h.lastAction='talk';
  if(c.stage==='evidence'){
    const clue=c.clues.find(x=>!x.found&&x.area===h.area);if(!clue)return;
    if(isRecordedCase(c)){if(physicalDistance(s.areas[h.area],h.x,clue.x)>1)return;const o=s.areas[clue.area].objects.find(o=>o.id===clue.object);if(!o||o.destroyed||o.state==='burned'){clue.unavailableAt=s.tick;ctx.log(s,'По известному адресу следа больше нет. Это не ответ на вопрос о вине.','story');return;}}
    clue.found=true;s.areas[clue.area].objects.find(o=>o.id===clue.object).resolved=true;
    const reliable=stat(h,'wit')+stat(h,'guile')+moduleRandom(s,'mysteries')*4>=5;
    const pointsTo=reliable?c.culprit:(c.culprit===c.accused?c.other:c.accused);
    c.evidence.push({tick:s.tick,person:pointsTo,reliable});chronicleChoice(s,c,`Улика указывает на ${s.people[pointsTo].name}.`);
    ctx.log(s,isRecordedCase(c)?`Осмотрен след ключа. Герой считает, что он указывает на ${s.people[pointsTo].name}. Подписанный реестр ещё не прочитан.`:`Найдена улика: след ключа принадлежит ${s.people[pointsTo].name}. ${reliable?'Запись и отпечаток совпадают.':'Отпечаток смазан; герой может ошибаться.'}`,'story');return;
  }
  if(isRecordedCase(c)&&(h.area!==c.source||physicalDistance(s.areas[h.area],h.x,42)>1))return;
  const votes=c.evidence.reduce((counts,e)=>(counts[e.person]=(counts[e.person]||0)+1,counts),{});
  const guilty=(votes[c.other]||0)>(votes[c.accused]||0)?c.other:c.accused;
  const p=s.people[guilty],present=p.alive&&p.status==='resident'&&p.area===c.source;
  if(present){p.status='imprisoned';p.imprisoned=s.tick;}else if(p.alive)p.wanted=c.id;
  delete s.people[c.accused].accused;c.verdict=guilty;
  if(isRecordedCase(c)){closeRecordedVerdict(s,c,ctx,guilty,present);return;}
  const correct=guilty===c.culprit,a=s.areas[c.source];
  if(correct){h.gold+=24;moral(s,5);repute(s,a.faction,5);if(goodsEnabled(s)){const quantity=c.sealedFood?.quantity||0;putGoods(s,a,'food',quantity,{reason:'unsealed-stores'});if(c.sealedFood)c.sealedFood.quantity=0;}else a.civic.food=Math.min(100,a.civic.food+15);a.civic.safety=Math.min(100,a.civic.safety+12);}
  else {moral(s,-7);repute(s,a.faction,-4);a.civic.safety=Math.max(0,a.civic.safety-15);if(goodsEnabled(s)){if(c.sealedFood){c.sealedFood.lost+=c.sealedFood.quantity;c.sealedFood.quantity=0;}else takeGoods(s,a,'food',Math.min(10,a.civic.food),{flow:'lost',reason:'stolen-seal'});}else a.civic.food=Math.max(0,a.civic.food-10);}
  chronicleChoice(s,c,`Приговор: ${p.name}.`);narrativeChange(s,c,`${p.name} ${present?'заключён под стражу':'объявлен в розыск'}. ${correct?'Печать возвращена, запасы открыты.':'Настоящий похититель сохранил печать; запасы потеряны.'}`);
  ctx.storyFinish(s,c,ctx,correct?'done':'failed',correct?`Улики привели к ${p.name}. Печать найдена; ${guilty===c.accused?'обвинение подтвердилось':'обвинения с невиновного сняты'}. Жители платят ◈24.`:`Герой поверил неполной картине. ${p.name} оказался невиновен, но ${present?'уже лишился свободы':'теперь разыскивается'}. Поселение потеряло запасы, настоящий похититель остался рядом.`);
  if(!correct)noticeMisjudgment(s,c);
}
export function tick(s,c,ctx){if(!s.people[c.accused]?.alive){if(s.people[c.accused])delete s.people[c.accused].accused;ctx.storyFinish(s,c,ctx,'failed','Обвинённый не дожил до разбирательства. Печать и правда о ней остались среди незаконченных дел.');}}
export function closed(s,c){refundVerdictFee(s,c);}
