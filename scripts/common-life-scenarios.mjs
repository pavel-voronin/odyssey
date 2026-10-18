import {createWorld,route,knownRoute,log} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {workshopAt,observeProperty} from '../modules/property.js';
import {revealArea} from '../actor-atlas.js';
export const commonContext={log,route,knownRoute,gainXp:()=>{},goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,started:s.tick,...extra};s.hero.intent=intent;s.hero.reason=reason;},closest(s,p){return Object.values(s.areas).filter(a=>p(a)&&knownRoute(s,s.hero.area,a.id).length).sort((a,b)=>knownRoute(s,s.hero.area,a.id).length-knownRoute(s,s.hero.area,b.id).length)[0];}};
// Prepared compatibility situations, not a frequency or longevity sample.
export function commonFixture(){
 const s=createWorld(0);for(const m of MODULES)setModule(s,m.id,false);for(const id of ['work','identity','property'])setModule(s,id,true);
 const h=s.hero,a=Object.values(s.areas).find(a=>a.district==='Мастерские');Object.assign(h,{area:a.id,x:42,profession:'clockmaker',gold:200,energy:100,hp:h.maxHp,goal:null,workAfter:0,weapon:3,armor:1});h.inventory.potions=3;h.career.path='peaceful';h.career.rank=3;h.habits=['homebody'];h.personality.curiosity=.1;h.personality.generosity=.8;h.quests=[];h.companions=[];h.commitments.personal=null;s.storyCases=[];h.life.home=a.id;h.life.residence={since:0};h.destiny.completed=true;h.memory.shopAfter=1000000;h.conditions=[];h.life.nextMastery=null;
 const o=workshopAt(s,a);o.owner=h.lineage;observeProperty(s,a);revealArea(s,a.id);return {s,h,a,o};
}
