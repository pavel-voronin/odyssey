import {safeCampActivity,campActivityAvailable,reserveCampActivity} from './camp-session.js';
import {enabled} from '../rules.js';
import {clamp} from './common.js';
export function initializeCampLife(h){h.campLife ||= {lastCamp:null,history:[]};}
export function rememberRescue(s,q){
  if(!enabled(s,'camp-life'))return;
  q.rescuedAt ??=s.tick;
  q.rescueWitnesses ??=[...new Set([s.hero.lineage,q.person,...(enabled(s,'companions')?s.hero.companions:[]).filter(c=>c.person&&c.hp>0&&s.people[c.person]?.alive&&s.people[c.person].area===s.hero.area).map(c=>c.person)])];
}
export function campConversation(s,ctx){
  if(!enabled(s,'camp-life')||!enabled(s,'companions')||!enabled(s,'relationships'))return false;
  const h=s.hero,a=s.areas[h.area];
  if(!safeCampActivity(s)||!campActivityAvailable(h))return false;
  initializeCampLife(h);const life=h.campLife;
  if(life.lastCamp===h.counters.camps)return false;
  const companions=h.companions.filter(c=>c.person&&c.hp>=c.maxHp*.8&&s.people[c.person]?.alive&&s.people[c.person]?.area===h.area&&(!enabled(s,'npc-needs')||((s.people[c.person].needs?.energy??100)>=30&&!s.people[c.person].needs?.sleeping)));
  let topic,companion;
  for(const q of h.quests.slice().reverse()){
    if(q.kind!=='rescue'||!q.rescued)continue;
    const known=companions.find(c=>(q.person===c.person||q.rescueWitnesses?.includes(c.person))&&!q.campTalks?.[c.person]);
    if(known){topic=q;companion=known;break;}
  }
  if(!topic)return false;
  const p=s.people[companion.person],name=s.people[topic.person]?.name||'путника';
  const silent=companion.person!==topic.person&&(p.agenda?.sociability??.5)<.25;
  const grateful=companion.person===topic.person||companion.ethics>0;
  const cautious=companion.ethics<0||((p.agenda?.duty??0)>.7&&h.hp<h.maxHp*.95);
  const outcome=silent?'quiet':grateful?'thanks':cautious?'caution':'quiet',delta=outcome==='thanks'?2:outcome==='caution'?-1:0;
  reserveCampActivity(h,'conversation');
  const relation=h.relations[p.id],beforeTrust=relation?.trust??0,beforeLoyalty=companion.loyalty;
  if(relation)relation.trust=clamp(relation.trust+delta,-100,100);
  companion.loyalty=clamp(companion.loyalty+delta,0,100);
  const changes={delta:(relation?.trust??0)-beforeTrust,loyalty:companion.loyalty-beforeLoyalty};
  topic.campTalks ||= {};topic.campTalks[p.id]={tick:s.tick,outcome,...changes};life.lastCamp=h.counters.camps;
  const record={tick:s.tick,area:h.area,quest:topic.id,person:p.id,rescued:topic.person,outcome,...changes};life.history.push(record);if(life.history.length>16)life.history.shift();
  h.energy=Math.max(0,h.energy-1);h.lastAction='talk';
  const reply=outcome==='thanks'?(companion.person===topic.person?'Спасибо, что вытащил меня. Я это помню.':'Хорошо, что мы не прошли мимо. Я рад идти рядом с тобой.'):outcome==='caution'?'Мы помогли, но рисковали всеми. Я не хочу, чтобы каждая чужая беда становилась нашей последней дорогой.':'Я помню. Но сейчас не хочу об этом говорить.';
  ctx.log(s,`У костра вспоминают спасение ${name}. ${p.name}: «${reply}» ${delta>0?'Доверие между ними крепнет.':delta<0?'В споре обнаружилось разногласие.':'Они оставляют тему; молчание не требует платы дружбой.'}`,'relationship');
  return true;
}
