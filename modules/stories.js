import {invitationAllowed,startInvitation} from './invitation-rhythm.js';
import {initializeStoryRarity,canStartPersonalLine,claimPersonalLine} from './story-rarity.js';
import {selfDrivenActor} from '../actor-projection.js';
import {enabled,moduleRandom} from '../rules.js';
import {isTown} from './common.js';
import * as pacts from './pacts.js';
import * as mysteries from './mysteries.js';
import * as expeditions from './expeditions.js';
const handlers={pact:pacts,mystery:mysteries,expedition:expeditions};
const modules={pact:'pacts',mystery:'mysteries',expedition:'expeditions'};
export const STORY_NAMES={pact:'Договор за мелким шрифтом',mystery:'Дело о чужом имени',expedition:'Экспедиция к невозможному'};
export function initializeStories(s,h){s.storyCases ||= [];initializeStoryRarity(s,h);s.nextStory ||= 0;h.stories ||= {active:null,nextOffer:h.born+500+Math.floor(moduleRandom(s,'stories')*500),completed:[]};}
function wrapped(s,ctx,kind){return {...ctx,random:()=>moduleRandom(s,modules[kind]),storyFinish:finishStory};}
export function finishStory(s,c,ctx,outcome,text){
  if(c.status!=='active')return;
  handlers[c.kind]?.closed?.(s,c);
  c.status=outcome;c.ended=s.tick;c.summary=text;
  s.hero.stories.completed.push(c.id);s.hero.stories.active=null;s.hero.stories.nextOffer=s.tick+700+Math.floor(moduleRandom(s,'stories')*500);s.hero.goal=null;
  for(const ref of c.refs){const o=s.areas[ref.area]?.objects.find(o=>o.id===ref.id);if(o?.kind==='story')o.resolved=true;}
  ctx.log(s,text,'story');
}
export function storyTick(s,ctx){
  if(!enabled(s,'stories'))return;
  for(const c of s.storyCases){
    if(c.status!=='active'||!enabled(s,modules[c.kind]))continue;
    if(c.owner!==s.hero.lineage){const owner=s.actorStates?.[c.owner];if(selfDrivenActor(s,owner))continue;handlers[c.kind]?.closed?.(s,c);c.status='abandoned';c.summary='Прежний путник закончил странствия. Следы незавершённого дела остаются в мире.';continue;}
    if(c.kind!=='pact'&&s.tick-c.started>2400){finishStory(s,c,ctx,'abandoned','Дело затянулось на недели. Герой оставляет его незавершённым и выбирает другую жизнь.');continue;}
    handlers[c.kind].tick?.(s,c,wrapped(s,ctx,c.kind));
  }
}
export function storyPlan(s,ctx){
  if(!enabled(s,'stories'))return false;
  const h=s.hero;
  const active=s.storyCases.find(c=>c.id===h.stories.active&&c.status==='active');
  if(active)return enabled(s,modules[active.kind])?Boolean(handlers[active.kind].plan(s,active,wrapped(s,ctx,active.kind))):false;
  if(s.tick<h.stories.nextOffer||h.quests.some(q=>q.status==='active')||h.life.motive)return false;
  const a=s.areas[h.area];
  const kinds=Object.keys(handlers).filter(kind=>enabled(s,modules[kind])&&canStartPersonalLine(s,kind)&&invitationAllowed(s,'story',kind+':'+a.id)&&!s.storyCases.some(c=>c.kind===kind&&c.source===a.id&&c.owner===h.lineage)&&(kind!=='mystery'||isTown(a))&&(kind!=='expedition'||!isTown(a)&&h.personality.curiosity>.45));
  if(!kinds.length){h.stories.nextOffer=s.tick+96;return false;}
  const kind=kinds[Math.floor(moduleRandom(s,'stories')*kinds.length)];
  const c={id:'story-'+s.nextStory++,kind,status:'active',owner:h.lineage,source:a.id,started:s.tick,stage:'opening',choices:[],effects:[],refs:[]};
  claimPersonalLine(s);startInvitation(s,'story',kind+':'+a.id);s.storyCases.push(c);h.stories.active=c.id;
  handlers[kind].start(s,c,wrapped(s,ctx,kind));
  return Boolean(handlers[kind].plan(s,c,wrapped(s,ctx,kind)));
}
export function storyAction(s,id,ctx){
  const c=s.storyCases.find(c=>c.id===id&&c.status==='active'&&c.owner===s.hero.lineage);
  if(!c||!enabled(s,'stories')||!enabled(s,modules[c.kind])){s.hero.goal=null;return;}
  handlers[c.kind].act(s,c,wrapped(s,ctx,c.kind));
}
export function isStoryActive(s,id){const c=s.storyCases.find(c=>c.id===id);return Boolean(c&&c.status==='active'&&c.owner===s.hero.lineage&&enabled(s,'stories')&&enabled(s,modules[c.kind]));}
export function storyCombatChoice(s,enemy,ctx){
  const c=s.storyCases.find(c=>c.id===enemy.story&&c.status==='active'&&c.owner===s.hero.lineage);
  return Boolean(c&&enabled(s,'stories')&&enabled(s,modules[c.kind])&&handlers[c.kind].combat?.(s,c,enemy,wrapped(s,ctx,c.kind)));
}
export function storyThreatAvoided(s,enemy,ctx){const c=s.storyCases.find(c=>c.id===enemy.story&&c.status==='active'&&c.owner===s.hero.lineage);if(c&&enabled(s,'stories')&&enabled(s,modules[c.kind]))handlers[c.kind].avoided?.(s,c,enemy,wrapped(s,ctx,c.kind));}
