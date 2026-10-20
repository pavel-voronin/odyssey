import {dateNewDocument} from './period-date.js';
import {SPELLS} from '../content.js';
import {spellTextsOn,spellTextMemory,spellTextGift,spellGiftSnapshot,understandsSpellText} from './spell-text-state.js';
import {textActor,heldTexts,canWriteText,canReadText,textMemory} from './text-state.js';
import {registerLiteracy} from './literacy-state.js';
import {teachSpell} from './spell-learning.js';
import {actorView} from '../actor-view.js';
import {actorItemLocation} from './item-originals.js';
import {giveText} from './texts.js';
import {physicalDistance} from '../geometry.js';
import {marketWallet} from './market.js';
import {goodsEnabled} from './goods.js';
import {fitsPack} from './container-state.js';
const ready=(s,p)=>{const h=textActor(s,p?.id);return spellTextsOn(s)&&p?.alive&&h&&spellTextGift(h)&&!h.combat&&!h.transit&&!p.needs.sleeping&&!p.ailment&&h.energy>=30&&h.hunger<60&&h.hp>=h.maxHp*.75&&(p.textCraft?.lastActionTick??-1)<s.tick&&(p.spellTexts?.lastActionTick??-1)<s.tick?h:null;};
function spend(s,p,h){h.energy--;h.lastAction='work';spellTextMemory(p).lastActionTick=s.tick;textMemory(p).lastActionTick=s.tick;}
const paperAt=(s,p,id)=>heldTexts(s,p.id).find(i=>i.id===id);
const at=(s,h,o)=>h.area===o.area&&physicalDistance(s.areas[h.area],h.x,o.x)<=3;
export function writeSpellText(s,p,paperID,kind='book'){
 const h=ready(s,p),paper=paperAt(s,p,paperID),m=p.spellTexts,a=h&&s.areas[h.area],existing=m?.active&&m.projects[m.active],lang=existing?s.literature.works[existing.content].language:m?.works.ward?s.literature.works[m.works.ward].language:p.culture||a?.culture||'river';if(!h||!paper||!['book','scroll'].includes(kind)||!h.magic.spells.includes('ward')||!canWriteText(s,p,lang)||!canReadText(s,p,lang))return null;
 let project=m?.active&&m.projects[m.active];
 if(!project){
  if(paper.kind!=='writingPaper'||!a.civic||a.interior||physicalDistance(a,h.x,42)>3||Object.values(m?.projects||{}).some(o=>o.kind===kind)||kind==='scroll'&&h.magic.mana<1)return null;
  const memory=spellTextMemory(p),id=p.id+'/spell-text/'+(++memory.serial);project={version:1,id,author:p.id,paper:paper.id,kind,spell:'ward',area:a.id,x:42,started:s.tick,last:-1,progress:0,status:'writing',known:[...h.magic.spells],ink:kind==='scroll'?{at:s.tick,before:h.magic.mana,after:h.magic.mana-1,spent:1}:null,history:[]};
  if(project.ink)h.magic.mana--;memory.projects[id]=project;memory.active=id;
  let work=memory.works.ward&&s.literature.works[memory.works.ward];if(!work){const lib=s.literature ||= {version:1,serial:0,works:{}},wid='text-work/'+p.id+'/'+(++lib.serial),spell=SPELLS.find(sp=>sp.id==='ward');work={version:1,id:wid,author:p.id,editor:p.id,revision:1,parent:null,written:s.tick,language:lang,title:'Рукописное слово укрытия',source:{kind:'known-spell',observer:p.id,area:a.id,at:s.tick,project:id,spell:'ward'},content:{kind:'spell-manual',spell:spell.id,area:a.id,name:a.name,observed:s.tick,text:'Запись известного автору слова укрытия. Требует понимания, магической способности и настоящей маны. Одно чтение не заменяет освоения приёма.'}};lib.works[wid]=dateNewDocument(s,work);memory.works.ward=wid;}
  project.content=work.id;registerLiteracy(s,p,h,'written-text',work.id);paper.kind='textCopy';paper.base='booklet';paper.name=kind==='scroll'?'Незавершённый свиток укрытия':'Незавершённая книга укрытия';paper.value=0;paper.textCopy={version:1,content:work.id,revision:work.revision,owner:p.id,writer:p.id,written:s.tick,sourceCopy:null,condition:'draft',damage:null};paper.spellManuscript={version:1,project:id,author:p.id,kind,progress:0};if(kind==='scroll')paper.spellScroll={version:1,spell:'ward',author:p.id,project:id,prepared:s.tick,inkMana:1,ready:false};
 }
 if(project.paper!==paper.id||project.kind!==kind||project.status!=='writing'||project.last>=s.tick||!at(s,h,project)||paper.textCopy?.owner!==p.id||paper.textCopy.condition!=='draft'||paper.spellManuscript?.project!==project.id)return null;
 project.progress++;project.last=s.tick;project.history.push({at:s.tick,actor:p.id,energy:1,progress:project.progress});paper.spellManuscript.progress=project.progress;spend(s,p,h);
 if(project.progress===3){project.status='completed';project.finished=s.tick;p.spellTexts.active=null;paper.name=kind==='scroll'?'Свиток слова укрытия':'Книга слова укрытия';paper.value=kind==='scroll'?5:4;paper.textCopy.condition='intact';paper.textCopy.written=s.tick;dateNewDocument(s,paper.textCopy);if(paper.spellScroll)paper.spellScroll.ready=true;paper.history.push({tick:s.tick,text:kind==='scroll'?'Письмена связаны настоящей маной автора. Свиток даёт однократный доступ к формуле, но её применение оплачивается отдельно.':'Три действия завершили настоящую рукопись. Чтение не равно магическому дару или мгновенному обучению.'});}
 actorItemLocation(s,paper,p.id);return paper;
}
export function studySpellText(s,p,id,ctx={log(){}}){ctx ||= {log(){}};
 const h=ready(s,p),item=paperAt(s,p,id),w=s.literature?.works[item?.textCopy?.content];if(!h||!item||item.textCopy?.condition!=='intact'||w?.content.kind!=='spell-manual'||!understandsSpellText(s,p,w)||h.magic.spells.includes('ward')||h.magic.mana<1)return false;
 const m=spellTextMemory(p),course=m.courses.ward ||= {spell:'ward',started:s.tick,status:'learning',gift:spellGiftSnapshot(h),steps:[]};if(course.status==='learned'||course.steps.length>=3)return false;
 const before=h.magic.mana;h.magic.mana--;course.steps.push({at:s.tick,item:item.id,content:w.id,manaBefore:before,manaAfter:h.magic.mana,mana:1,energy:1});spend(s,p,h);
 if(course.steps.length===3){const view=h===s.hero?s:actorView(s,h);if(!teachSpell(view,'ward',ctx,'Рукописная книга'))return false;course.status='learned';course.finished=s.tick;course.maxManaAfter=h.magic.maxMana;course.maxManaBefore=h.magic.maxMana-3;}
 return true;
}
function paperPlan(s,p,h){const a=s.areas[h.area],owner=s.areas[a.city]||a;return a.civic&&!a.interior&&physicalDistance(a,h.x,42)<=3&&goodsEnabled(s)&&owner.goods?.sources?.materials.stock>0&&marketWallet(s,p.id)>=5&&fitsPack(s,p.id,{items:[...h.bag,{slot:'document'}]})?{kind:'textPaper',target:a.id,x:42,remaining:1}:null;}
export function spellTextTask(s,p){
 const h=ready(s,p);if(!h)return null;const m=p.spellTexts,items=heldTexts(s,p.id),active=m?.projects[m.active];
 if(active){if(!h.magic.spells.includes('ward')||!canReadText(s,p,s.literature.works[active.content].language)||!canWriteText(s,p,s.literature.works[active.content].language))return null;const paper=items.find(i=>i.id===active.paper);return paper?.textCopy?.condition==='draft'&&paper.textCopy.owner===p.id?{kind:'spellTextWrite',target:active.area,x:active.x,item:paper.id,manuscript:active.kind,remaining:1}:null;}
 const book=items.find(i=>i.textCopy?.condition==='intact'&&s.literature?.works[i.textCopy.content]?.content.kind==='spell-manual'&&!i.spellScroll&&understandsSpellText(s,p,s.literature.works[i.textCopy.content]));if(!h.magic.spells.includes('ward'))return book&&h.magic.mana>=1?{kind:'spellTextStudy',target:h.area,x:h.x,item:book.id,remaining:1}:null;
 const gift=items.find(i=>i.spellScroll?.ready&&i.textCopy?.owner===p.id&&i.textCopy.condition==='intact');if(gift&&h.personality.generosity>=.7)for(const q of Object.values(s.people)){const recipient=textActor(s,q.id);if(q.id===p.id||!spellTextGift(recipient)||recipient.magic.spells.includes('ward')||recipient.combat||recipient.transit||recipient.area!==h.area||physicalDistance(s.areas[h.area],h.x,recipient.x)>12||!canReadText(s,q,s.literature.works[gift.textCopy.content].language)||heldTexts(s,q.id).some(i=>s.literature?.works[i.textCopy?.content]?.content.spell==='ward'))continue;return {kind:'spellTextGift',target:h.area,x:recipient.x,person:q.id,item:gift.id,remaining:1};}
 if(!s.areas[h.area].civic||s.areas[h.area].interior)return null;
 if(h.personality.curiosity<.75||h.career.path!=='peaceful'||!canWriteText(s,p))return null;
 const projects=Object.values(m?.projects||{}),kind=!projects.some(o=>o.kind==='book')?'book':h.personality.generosity>=.7&&!projects.some(o=>o.kind==='scroll')?'scroll':null;if(!kind||kind==='scroll'&&h.magic.mana<1)return null;
 const paper=items.find(i=>i.kind==='writingPaper');if(!paper)return paperPlan(s,p,h);return {kind:'spellTextWrite',target:h.area,x:42,item:paper.id,manuscript:kind,remaining:1};
}
export function spellTextAction(s,p,g,ctx){if(g.kind==='spellTextWrite')return writeSpellText(s,p,g.item,g.manuscript);if(g.kind==='spellTextStudy')return studySpellText(s,p,g.item,ctx);if(g.kind==='spellTextGift')return giveText(s,p,s.people[g.person],g.item);return false;}
