import {combatFixture} from './combat-judgment-scenarios.mjs';
import {setModule} from '../rules.js';
export function compositionFixture(mutation='mirror'){
 const f=combatFixture({hp:100,attack:3,tactic:'warden',intent:'guard',enemyHp:100,mana:40,spells:['spark']}),{s,h,enemy}=f;
 setModule(s,'composite-threats',true);h.profession='mage';h.stats.wit=4;h.weapon=0;enemy.name='Страж проверки · '+(mutation==='shell'?'Кристальный панцирь':'Зеркальный')+', Стойка хранителя';enemy.baseName='Страж проверки';enemy.mutation=mutation;enemy.maxHp=100;
 return f;
}
