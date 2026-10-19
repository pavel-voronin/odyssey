import assert from 'node:assert/strict';
import {createWorld,createNextStory,serialize,restore,createEnemy} from '../engine.js';
import {MODULES} from '../rules.js';
import {syncActiveActor,setActorMoney} from '../actor-projection.js';
import {marketWallet} from '../modules/market.js';
import {teachSpell} from '../modules/spell-learning.js';
import {buyTextPaper,giveText,readText} from '../modules/texts.js';
import {writeSpellText} from '../modules/spell-texts.js';
export const spellTextContext={log(){},gainXp(){},defeatEnemy(){},random:()=>.99};
export function spellTextFixture(){
 const keep=['texts','equipment','identity','magic','body','goods-cycle','containers','item-originals','people','npc-control','npc-knowledge','districts','background-towns'],s=createWorld(4,{rules:Object.fromEntries(MODULES.map(m=>[m.id,keep.includes(m.id)]))}),author=s.hero,a=s.areas.a1,writer=s.people[author.lineage];
 Object.assign(author,{area:a.id,x:42,profession:'clockmaker',culture:'deep',hp:author.maxHp,energy:100,hunger:0,combat:null,transit:null,goal:null,conditions:[],companions:[],quests:[],habits:[]});writer.culture='deep';author.career.path='peaceful';author.personality.curiosity=.9;author.personality.generosity=.9;author.stories.active=null;const add=Math.max(0,12-author.gold);a.civic.treasury-=add;author.gold+=add;assert.equal(teachSpell(s,'ward',spellTextContext,'Подготовленный существующий урок'),true);syncActiveActor(s);
 assert.equal(createNextStory(s,{allowLiving:true}),true);const h=s.hero,p=s.people[h.lineage];assert.equal(h.magic.spells.includes('ward'),false);Object.assign(h,{area:a.id,x:42,profession:'clockmaker',culture:'deep',hp:h.maxHp,energy:100,hunger:0,combat:null,transit:null,goal:null,conditions:[],companions:[],quests:[],habits:[]});p.culture='deep';h.stories.active=null;h.personality.curiosity=.9;h.career.path='peaceful';syncActiveActor(s);
 const helper=Object.values(s.people).find(q=>q.alive&&q.agenda?.job==='scholar');assert.ok(helper);for(const q of Object.values(s.people))if(![writer,p,helper].includes(q))q.status='absent';Object.assign(helper,{area:a.id,x:42,status:'resident',health:helper.maxHealth||100,ailment:null});Object.assign(helper.needs,{energy:100,hunger:0,sleeping:false});Object.assign(helper.agenda,{task:null,due:1e9,duty:.9,curiosity:.9});const cash=Math.max(0,8-marketWallet(s,helper.id));a.civic.treasury-=cash;setActorMoney(s,helper,marketWallet(s,helper.id)+cash);
 for(const area of Object.values(s.areas))for(const e of area.objects)if(e.kind==='enemy'){e.alive=false;e.resolved=true;}
 return {s,h,p,author,writer,a,helper};
}
export function makeSpellText(f=spellTextFixture(),kind='book',{steps=3}={}){const {s,writer}=f;s.tick++;const paper=buyTextPaper(s,writer);assert.ok(paper);for(let i=0;i<steps;i++){s.tick++;assert.equal(writeSpellText(s,writer,paper.id,kind),paper);}f[kind]=paper;return f;}
export function receiveSpellText(f=makeSpellText(),kind='book',{read=true}={}){const {s,writer,p}=f;s.tick++;assert.equal(giveText(s,writer,p,f[kind].id),true);if(read){s.tick++;assert.equal(readText(s,p,f[kind].id),true);}return f;}
export function spellThreat(f){const {s,h,a}=f,e=createEnemy(s,a,{species:'wolf',hp:30,maxHp:30,attack:3,patrol:0,x:42});Object.assign(e,{hidden:false,resolved:false,alive:true,tactic:'simple',element:'normal',mutation:'none',powers:[],patrol:0});h.combat=e.id;h.goal=null;h.hp=h.maxHp*.7;h.conditions=[];syncActiveActor(s);return e;}
export const exactSpell=s=>{syncActiveActor(s);const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);};
