import {limbLook,withLimbLook} from './modules/limb-state.js';
import {visualRandom} from './visual-random.js';
export {visualRandom} from './visual-random.js';
import {actorPalette} from './palette.js';
import {itemOutfit} from './outfit.js';
import {injuryLook} from './modules/injury-state.js';
export function appearance(seed,actor,stored={}){
  const rnd=visualRandom(seed,'person:'+actor.id),pick=list=>list[Math.floor(rnd()*list.length)];
  const role=actor.agenda?.job||actor.profession||actor.role||'';
  const fallback=pick(['none','staff','satchel','none']);
  const prop=({farmer:'rake',artisan:'hammer',smith:'hammer',clockmaker:'hammer',healer:'satchel',alchemist:'satchel',scholar:'book',student:'book',guard:'spear',soldier:'spear',merchant:'satchel',bard:'lute',mage:'staff',undertaker:'staff',tinker:'hammer'})[role]||fallback;
  const look={skin:pick(['#bb9475','#d3b38f','#a57e61','#e0c9a5']),hair:pick(['#3c3935','#78513d','#b39c6c','#c8c2a8','#383e42','#8b6c55','#985a46']),cloak:pick(['#7b8e70','#8e725e','#6c8490','#9b9270','#856b82','#65797d','#a58b6a','#7e694f']),trousers:pick(['#424c4b','#5e564b','#3d454d','#696154']),shoes:pick(['#372d26','#574334','#504a40']),hairStyle:pick(['crop','long','curls','crest','bald','braid']),coat:pick(['tunic','long','vest','robe']),hat:pick(['none','none','none','cap','brim','hood']),glasses:rnd()<.18,earring:rnd()<.22,scarf:rnd()<.35,scarfColor:pick(['#b3a578','#9a654f','#657e8f']),width:.88+rnd()*.27,prop};
  return withLimbLook(actor,{...look,...actorPalette(seed,actor.id,actor.culture),...stored,injuryMarks:injuryLook(actor)});
}
function legacyHeroAppearance(s){
  if(s.hero.actorMode==='npc'){const p=s.people[s.hero.lineage];return appearance(s.seed,p,p.appearance);}
  const h=s.hero,look=appearance(s.seed,{id:h.lineage,profession:h.profession,culture:h.culture,paletteVersion:h.appearance?.paletteVersion},h.appearance),gear=s.rules?.equipment!==false;
  const shape=item=>item?.base||item?.name.split(':')[0],armor=gear&&h.equipment?.armor;
  look.coat=armor?(['mail','доспех'].includes(shape(armor))?'vest':'long'):'tunic';
  if(h.level<4&&h.career.rank<3)look.hat='none';
  if(h.level<3)look.scarf=false;
  const main=h.affiliation?.paths?.[h.affiliation.primary];if(main?.rank>=4&&!main.suspended)look.hat='brim';
  if(gear&&h.equipment?.weapon){const base=shape(h.equipment.weapon);look.prop=['staff','посох'].includes(base)?'staff':['axe','топор'].includes(base)?'axe':'blade';}
  else if(h.weapon>0)look.prop='blade';
  look.armored=Boolean(armor&&['mail','доспех'].includes(shape(armor)));
  look.packSize=6+Math.min(6,Math.floor((h.bag.length+h.inventory.rations)/3));
  look.width*=1+Math.min(.12,Math.max(0,h.stats.might-4)*.02);
  return look;
}
export function heroAppearance(s){
 const look=legacyHeroAppearance(s),h=s.hero;
 look.injuryMarks=injuryLook(s.people[h.lineage]);const missing=limbLook(s.people[h.lineage]);if(missing)look.missingLimbs=missing;
 if(s.rules?.['outfit-appearance']===false||s.rules?.appearance===false)return look;
 // A myconid's cap is physiology, even though old saves stored its tint in cloak.
 look.capColor=look.cloak;
 if(s.rules?.equipment!==false){const outfit=itemOutfit(h.equipment?.armor);if(outfit)Object.assign(look,outfit);
  if(h.actorMode==='npc'&&h.equipment?.weapon){const base=h.equipment.weapon.base||String(h.equipment.weapon.name||'').split(':')[0];look.prop=['staff','посох'].includes(base)?'staff':['axe','топор'].includes(base)?'axe':'blade';}
 }
 return look;
}
export function personAppearance(s,p,legacy=p?.appearance){
 const h=s.actorStates?.[p.id];
 if(s.rules?.['outfit-appearance']!==false&&h)return heroAppearance({...s,hero:h});
 return appearance(s.seed,p,legacy);
}
