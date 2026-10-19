import {enabled} from '../rules.js';
import {profile,stat} from './common.js';
import {textsOn,canReadText} from './text-state.js';
import {speakingLanguage} from './literacy-state.js';
export const spellTextsOn=s=>textsOn(s)&&enabled(s,'magic');
export const spellTextMemory=p=>p.spellTexts ||= {version:1,serial:0,works:{},projects:{},active:null,courses:{},useSerial:0,uses:[],lastActionTick:-1};
export const spellTextGift=h=>Boolean(h?.alive&&h.magic?.maxMana>0&&(h.magic.spells.length||['magic','spirit','time'].includes(profile(h).skill)||stat(h,'wit')>=4));
export function understandsSpellText(s,p,w){
 if(w?.content.kind!=='spell-manual'||w.content.spell!=='ward')return false;
 return Boolean(canReadText(s,p,w.language)&&p.textCraft?.readings.some(r=>r.content===w.id)||p.literacy?.reports.some(r=>r.content===w.id&&!r.partial&&r.known.kind==='spell-manual'&&r.known.spell==='ward'&&r.known.complete===true&&speakingLanguage(s,p,r.medium)));
}
export function usableWardScroll(s,h,id){
 if(!spellTextsOn(s)||!enabled(s,'body')||!spellTextGift(h))return null;
 const p=s.people[h.lineage];for(const item of h.bag){if(id!==undefined&&item.id!==id||item.spellScroll?.version!==1)continue;const w=s.literature?.works[item.textCopy?.content];
 if(item&&item.spellScroll.spell==='ward'&&item.spellScroll.ready===true&&item.spellScroll.inkMana===1&&item.textCopy?.condition==='intact'&&item.textCopy.owner===h.lineage&&item.physical?.holder.kind==='person'&&item.physical.holder.id===h.lineage&&item.libraryLoan?.returned!==null&&item.libraryTheft?.returned!==null&&w?.content.spell==='ward'&&understandsSpellText(s,p,w))return item;}return null;
}

export const spellGiftSnapshot=h=>({maxMana:h.magic.maxMana,profession:h.profession,known:[...h.magic.spells],wit:stat(h,'wit')});
export function spellTextRevision(s,g){if(!g.kind.startsWith('spellText'))return null;const p=s.people[s.hero.lineage];return [s.rules.magic,s.rules.texts,s.rules.literacy,s.rules.equipment,s.hero.magic.mana>=1,s.hero.magic.spells,p.spellTexts,p.literacy,p.textCraft?.readings];}
