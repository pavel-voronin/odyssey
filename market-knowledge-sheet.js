import {canBargain} from './modules/skill-branches.js';
import {marketKnowledgeEnabled,MARKET_MEMORY_LIMIT,snapshotPrice} from './modules/market-knowledge.js';
import {profile} from './modules/common.js';
export function marketKnowledgeHTML(s,escape){
 if(!marketKnowledgeEnabled(s))return '';
 const p=s.people[s.hero.lineage],entries=p?.marketKnowledge?.entries||[],trade=canBargain(s,s.hero.lineage,profile(s.hero).skill==='trade');
 if(!entries.length)return '<section><p class="detail-label">ВЕСТИ О ЦЕНАХ</p><p class="empty">Пока нет собственных котировок. Цену можно узнать у местной кладовой или от настоящего очевидца.</p></section>';
 const rows=[...entries].sort((a,b)=>b.at-a.at).slice(0,MARKET_MEMORY_LIMIT).map(e=>{
  const age=Math.max(0,s.tick-e.at),price=snapshotPrice(e,1,trade),old=age<240?'менее дня назад':`${Math.floor(age/240)} дн. назад`,portion=e.kind==='food',power=portion&&price.total?Math.min(e.available,Math.floor(s.hero.gold/price.total)):0;
  const source=e.source.person===p.id?'Личный осмотр':'Со слов '+(e.via?.name||e.source.name);
  return `<div class="known-market"><p>${escape(e.name)} · ${portion?'порция':'инструмент'}</p><div class="fact"><span>Купить / продать</span><b>${price.quantity?'◈'+escape(price.total):'нет'} / ${e.bid?'◈'+escape(e.bid):'нет'}</b></div><p class="empty">${escape(source)} · ${escape(old)}.<br>${e.closed?'Рынок больше не найден.':`Тогда на продажу ${escape(e.available)}; выкуп до ${escape(e.wanted)}.`}${portion?`<br>◈${escape(s.hero.gold)} ≈ ${escape(power)} порц. по записи.`:''}</p></div>`;
 }).join('');return `<section data-market-memory-tick="${s.tick}"><p class="detail-label">ВЕСТИ О ЦЕНАХ</p><p class="empty">Кошелёк при осмотре: ◈${escape(s.hero.gold)}. В дороге цены и запасы меняются.</p>${rows}</section>`;
}
