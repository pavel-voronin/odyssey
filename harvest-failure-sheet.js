import {localHarvestFailure} from './modules/harvest-failure-state.js';
import {DAY_TICKS} from './calendar.js';
export function harvestFailureHTML(s){const a=s.areas[s.hero.area],e=localHarvestFailure(s,a);return e?'<p class="detail-label">СЕЗОННЫЙ НЕУРОЖАЙ</p><p>Местные поля дают половину обычного урожая. Осталось '+Math.ceil((e.until-s.tick)/DAY_TICKS)+' д. Уже собранная еда остаётся у своих владельцев; заработок, покупки и поиск другой еды продолжаются.</p>':'';}
