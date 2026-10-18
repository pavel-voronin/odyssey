import {placeRulesOn,placeRuleArea} from './modules/place-rule-state.js';
export function paintPlaceRule(c,s,a,screenX,ground){
 if(!placeRulesOn(s)||placeRuleArea(s,a.id)?.localRule?.version!==1)return;
 c.save();c.strokeStyle='#bfd0bd';c.globalAlpha=.65;c.lineWidth=1;
 for(const at of [12,38,64,90]){const x=screenX(at);c.beginPath();c.moveTo(x-5,ground+7);c.lineTo(x,ground+2);c.lineTo(x+5,ground+7);c.lineTo(x,ground+11);c.closePath();c.moveTo(x,ground+2);c.lineTo(x,ground+11);c.stroke();}c.restore();
}
export function placeRuleHTML(s,escape){
 const a=placeRuleArea(s,s.hero.area),n=s.hero.memory.localRules?.[a.id];if(!placeRulesOn(s)||!n)return '';
 const c=n.lastCast;return '<p class="detail-label">ТИХАЯ ЛОЖБИНА</p><p>Бледные руны ослабляют огни: заклинание требует ещё 2 маны. Обычный шаг и труд свободны. Можно подготовиться, выбрать физический способ или известный обход.</p>'+(c?'<p>Последний личный расход: '+c.base+' + 2 = '+c.total+'; мана '+c.manaBefore+' → '+c.manaAfter+(c.charge?', камень −'+c.charge:'')+'.</p>':'<p class="empty">Признак замечен лично; собственного применения чар здесь ещё не было.</p>');
}
