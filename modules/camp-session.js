// One optional activity per pitched camp; individual activities own their content.
export function campActivityAvailable(h){
  if(h.campSession&&h.campSession.number===h.counters.camps)return !h.campSession.activity;
  return !(h.campLife?.lastCamp!=null&&h.campLife.lastCamp===h.counters.camps);
}
export function reserveCampActivity(h,kind){
  if(!campActivityAvailable(h))return false;
  h.campSession={number:h.counters.camps,activity:kind};return true;
}
export function safeCampActivity(s){
  const h=s.hero,a=s.areas[h.area];
  return Boolean(a.temporaryCamp&&!h.combat&&!h.transit&&h.hp>=h.maxHp*.8&&h.energy>=40&&h.hunger<65&&(s.rules?.magic===false||h.magic.mana>=(h.goal?.preparation?.mana||0)));
}
