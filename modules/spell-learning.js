import {SPELLS} from '../content.js';
import {enabled} from '../rules.js';
export function teachSpell(s,id,ctx,source='Обучение'){
  const h=s.hero,spell=SPELLS.find(sp=>sp.id===id);if(!enabled(s,'magic')||!spell||h.magic.spells.includes(id))return false;
  h.magic.spells.push(id);h.magic.maxMana+=3;ctx.log(s,`${source} приносит знание: «${spell.name}». ${spell.text}`,'magic');return true;
}
