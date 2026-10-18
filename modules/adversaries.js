import {wardDamage} from './guardian-state.js';
import {observeGuardianHit} from './guardian-knowledge.js';
import {enabled} from '../rules.js';
import {initializeElement,elementalDamage,elementImpact,elementRate,ELEMENTS} from './elements.js';
import {initializeMutation,mutatedDamage,mutationReply,MUTATIONS} from './mutations.js';
import {initializeTactic,tacticalDamage,tacticalReply,TACTICS} from './tactics.js';
import {constrainThreat,observeThreat} from './composite-threats.js';
export function initializeEnemyTraits(s,a,e,fresh=false){
  initializeElement(s,a,e);initializeMutation(s,a,e);initializeTactic(s,a,e);e.battle={turns:0,intent:'idle',summons:0,echo:0};
  if(fresh)constrainThreat(s,a,e);
  const suffix=[e.element!=='normal'?ELEMENTS[e.element]?.name:null,e.mutation!=='none'?MUTATIONS[e.mutation]?.name:null,e.tactic!=='simple'?TACTICS[e.tactic]?.name:null].filter(Boolean);
  if(suffix.length)e.name+=' · '+suffix.join(', ');
}
export function enemyDamage(s,e,amount,type,ctx,learn=true){
 e.battle ||= {turns:0,intent:'idle',summons:0,echo:0};
 const elemental=elementalDamage(s,e,amount,type,ctx,false),echo=e.battle.echo,mutated=mutatedDamage(s,e,elemental,type,ctx),unshielded=tacticalDamage(s,e,mutated,type),damage=wardDamage(s,e,unshielded,type);
 if(learn)observeGuardianHit(s,e,unshielded,damage,type,ctx);
 if(learn){
  if(type==='physical'&&enabled(s,'mutations')&&e.mutation==='shell'&&mutated<elemental)observeThreat(s,e,'shell','reduced',ctx);
  if(type==='physical'&&enabled(s,'tactics')&&e.tactic==='warden'&&unshielded<mutated)observeThreat(s,e,'warden','guard',ctx);
  if(type!=='physical'&&enabled(s,'mutations')&&e.mutation==='mirror'&&e.battle.echo>echo)observeThreat(s,e,'mirror','echo',ctx);
 }
 if(damage>0&&learn)elementalDamage(s,e,amount,type,ctx,true);return damage;
}
export function enemyReply(s,e,raw,ctx,actor=s.hero){
  e.battle ||= {turns:0,intent:'idle',summons:0,echo:0};const damage=mutationReply(s,e,tacticalReply(s,e,raw,ctx,actor),ctx,actor);if(actor===s.hero&&enabled(s,'tactics')&&e.tactic==='warden'&&e.battle.intent==='guard')observeThreat(s,e,'warden','guard',ctx);if(damage)elementImpact(s,e,ctx,actor);return damage;
}
export function knownSpellRate(s,e,type){return enabled(s,'elements')?(s.hero.memory.threats?.[e.id]?.rates[type]??1):1;}
export function expectedStrike(s,e){return e.attack*(enabled(s,'tactics')&&e.tactic==='charged'&&e.battle?.intent==='strike'?3:1)+(enabled(s,'mutations')?e.battle?.echo||0:0);}
