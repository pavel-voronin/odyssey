import {bindBranchPact} from './branch-pacts.js';
import {pactBlocked} from './branch-pact-state.js';
import {weatherAt} from './weather.js';
import {goodsEnabled,takeGoods,goodsWorkReceipt,completeGoodsWork} from './goods.js';
import {FACTIONS,SPELLS} from '../content.js';
import {enabled,moduleRandom} from '../rules.js';
import {isTown,profile,repute} from './common.js';
import {changeProfession} from './identity.js';
const branch=(id,name,skills,privileges,service,profession,ethic=0)=>({id,name,skills,privileges,service,profession,ethic});
export const FACTION_BRANCHES={
  lantern:[branch('watch','Дорожная стража',['physical','beast'],['escort'],'guard','soldier'),branch('hospice','Дома милосердия',['healing','spirit'],['care'],'care','alchemist',1),branch('beacons','Искатели пропавших',['parley','relic'],['study'],'study','ranger')],
  crown:[branch('civil','Гражданская служба',['parley','trade'],['council'],'study','bard',1),branch('marshal','Маршальская служба',['physical','beast'],['escort','council'],'guard','soldier'),branch('treasury','Счётная палата',['trade','time'],['craft','council'],'craft','merchant')],
  tide:[branch('caravan','Караванное братство',['trade','parley'],['escort','fleet'],'trade','merchant'),branch('corsair','Вольные корсары',['steal','physical'],['raid','fleet'],'guard','thief',-1),branch('navigation','Школа штурманов',['sea','relic'],['fleet','study'],'study','sailor')],
  root:[branch('grove','Хранители рощ',['beast','physical'],['escort','grow'],'grow','ranger'),branch('hearth','Зелёные общины',['healing','parley'],['care','grow'],'care','alchemist',1),branch('spirits','Круг имён',['spirit','magic'],['study'],'study','undertaker')],
  clock:[branch('mechanics','Механические цехи',['craft','time'],['craft'],'craft','clockmaker'),branch('chronicle','Хранители хронологии',['time','relic'],['study'],'study','scholar'),branch('wayfarers','Инженеры переходов',['magic','sea'],['study','fleet'],'study','mage')]
};
export function initializeFactionPaths(s,h){h.affiliation ||= {primary:null,paths:{},after:h.born+90,changes:[]};}
export function factionPathTick(s,ctx){
  if(!enabled(s,'faction-paths')||s.tick%24!==0)return;
  const h=s.hero,c=h.affiliation;
  for(const [id,p] of Object.entries(c.paths)){
    const betrayed=(p.ethic>0&&h.alignment<-20)||(p.ethic<0&&h.alignment>45)||(h.reputation[id]||0)<-15;
    if(betrayed&&!p.suspended){p.suspended=true;p.office=null;ctx.log(s,`${p.branchName}: служба приостановлена. Поступки героя противоречат его обещаниям.`,'choice');}
    if(!betrayed&&p.suspended&&(h.reputation[id]||0)>=15){p.suspended=false;ctx.log(s,`${p.branchName}: герой заслужил возможность вернуться к службе.`,'career');}
    if(p.suspended)continue;
    const rep=h.reputation[id]||0,rank=rep>=100?4:rep>=60?3:rep>=30?2:1;
    if(rank>p.rank){p.rank=rank;p.office=rank===2?'Наставник: '+p.branchName:rank===3?'Старший: '+p.branchName:'Глава: '+p.branchName;h.titles.push(p.office);ctx.log(s,`${FACTIONS.find(f=>f.id===id).name}: ${p.office}. Новые права означают новые обязательства.`,'career');}
  }
}
export function factionPathPlan(s,ctx){
  if(!enabled(s,'faction-paths'))return false;
  const h=s.hero,a=s.areas[h.area],c=h.affiliation;if(!isTown(a)||s.tick<c.after)return false;
  const id=a.faction,rep=h.reputation[id]||0;if(rep<12)return false;
  let p=c.paths[id];
  if(!p){
    const choices=FACTION_BRANCHES[id].filter(b=>!(b.ethic>0&&h.alignment<-10)&&!(b.ethic<0&&h.alignment>10));
    const ranked=choices.map(b=>({b,score:(b.skills.includes(profile(h).skill)?4:0)+(b.ethic>0?h.personality.generosity:b.ethic<0?1-h.personality.generosity:h.personality.curiosity)+moduleRandom(s,'faction-paths')*2})).sort((a,b)=>b.score-a.score);
    if(!ranked.length)return false;
    const b=ranked[0].b;p=c.paths[id]={branch:b.id,branchName:b.name,rank:1,office:null,privileges:[...b.privileges],service:b.service,profession:b.profession,ethic:b.ethic,suspended:false,joined:s.tick,duties:0};
    ctx.log(s,`${h.name} принят в ${FACTIONS.find(f=>f.id===id).name}: ветвь «${b.name}». Иная служба в это время будет второстепенной.`,'career');
  }
  if(p.suspended||pactBlocked(s,h,id)){c.after=s.tick+180;return false;}
  if(c.primary!==id){
    if(c.primary&&(h.reputation[c.primary]||0)>rep+15){c.after=s.tick+120;return false;}
    const previous=c.primary;c.primary=id;c.changes.push({tick:s.tick,from:previous,to:id});
    if(previous){repute(s,previous,-5);ctx.log(s,'Герой оставляет прежнюю основную службу. Старые знания остаются, но должностные права теперь даёт новая фракция.','choice');}
  }
  c.after=s.tick+180;
  if(p.rank>=2&&p.profession!==h.profession&&s.tick-(h.career.lastChange||h.born)>900&&moduleRandom(s,'faction-paths')<.35)changeProfession(s,p.profession,ctx,'Служба изменила круг дел и стала новой профессией.');
  ctx.goal(s,'factionDuty',a.id,42,`Служба: ${p.branchName}`,'Герой тратит время на избранную ветвь, откладывая другие занятия.',{remaining:4,faction:id});return true;
}
export function factionDuty(s,ctx){
  const h=s.hero,g=h.goal,a=s.areas[h.area],p=h.affiliation.paths[g.faction];
  if(!enabled(s,'faction-paths')||!p||p.suspended||pactBlocked(s,h,g.faction)||h.affiliation.primary!==g.faction){h.goal=null;return;}
  bindBranchPact(s,ctx);
  if(goodsEnabled(s)&&['grow','craft'].includes(p.service))goodsWorkReceipt(s,s.people[h.lineage],g,4);
  h.energy=Math.max(0,h.energy-2);h.lastAction='work';if(--g.remaining>0)return;
  const c=a.civic;if(!c){h.goal=null;return;}
  if(p.service==='guard')c.safety=Math.min(100,c.safety+6);
  if(p.service==='care'){if(h.inventory.herbs>0){h.inventory.herbs--;c.medicine=Math.min(100,c.medicine+10);}else if(c.food>=2){takeGoods(s,a,'food',2,{reason:'faction-care',actor:h.lineage});c.medicine=Math.min(100,c.medicine+4);}}
  let output=null;
  if(p.service==='grow'){if(goodsEnabled(s))output=completeGoodsWork(s,a,g.goodsWork,{units:8});else c.food=Math.min(100,c.food+Math.round(8*weatherAt(s,a).harvest));}
  if(p.service==='craft'){if(goodsEnabled(s))output=completeGoodsWork(s,a,g.goodsWork,{kind:'tools',units:1});else if(c.treasury>=4){c.treasury-=4;c.tools=Math.min(20,c.tools+1);}}
  if(p.service==='trade')a.prosperity=Math.min(100,a.prosperity+2);
  if(p.service==='study'){
    h.counters.research=(h.counters.research||0)+1;
    if(p.rank>=2&&h.counters.research%5===0){const spell=SPELLS.find(sp=>!h.magic.spells.includes(sp.id));if(spell)ctx.teachSpell?.(s,spell.id,ctx,'Закрытый архив');}
  }
  const pay=output&&!output.quantity?0:Math.min(2,c.treasury);c.treasury-=pay;h.gold+=pay;p.duties++;repute(s,g.faction,3);ctx.gainXp(s,4);h.goal=null;
  if(output&&!output.quantity)ctx.log(s,output.reason==='exhausted-field'?'Сейчас нечего собирать. Угодьям нужно восстановиться; плата за выпуск не начислена.':'Выпуск не состоялся: нужны сырьё и доступная исправная мастерская. Плата не начислена.','work');
  ctx.log(s,`${p.branchName}: служба окончена. Выплата ◈${pay} из местной казны; репутация меняется и у союзников, и у противников.`,'career');
}
