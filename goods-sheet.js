import {marketEnabled,quoteMarket} from './modules/market.js';
import {goodsEnabled,goodsBatch} from './modules/goods.js';
import {physicalDistance} from './geometry.js';
import {knownArea} from './actor-atlas.js';
export function goodsHTML(s,escape){
 const h=s.hero,a=s.areas[h.area];if(!goodsEnabled(s)||h.transit||!a?.civic||physicalDistance(a,h.x,42)>18)return '';
 const food=goodsBatch(s,a,'food'),tools=goodsBatch(s,a,'tools'),overflowFood=goodsBatch(s,a,'food','overflow').quantity,overflowTools=goodsBatch(s,a,'tools','overflow').quantity,home=s.areas[a.city]||a,sources=(home===a||knownArea(s,home.id))?home.goods?.sources:null;
 const prices=marketEnabled(s)?['food','tools'].map(kind=>{const ask=quoteMarket(s,a,kind,'buy',1),bid=quoteMarket(s,a,kind,'sell',1);return '<div class="fact"><span>'+ (kind==='food'?'Порция':'Инструмент') +' · купить / продать</span><b>'+escape(ask.quantity?'◈'+ask.total:'нет')+' / '+escape(bid.quantity?'◈'+bid.total:'нет')+'</b></div>';}).join('')+'<p class="empty">Резерв жителей не продаётся. Выкуп ограничен потребностью и монетами казны; цена следующей порции меняется с запасом.</p>':'';
 return `<section data-goods-tick="${s.tick}"><p class="detail-label">ОСМОТР КЛАДОВОЙ</p><div class="fact"><span>Еда · порции</span><b>${escape(food.quantity)}</b></div><div class="fact"><span>Инструменты</span><b>${escape(tools.quantity)}</b></div>${overflowFood||overflowTools?`<p class="empty">Отдельно у кладовой: ${escape(overflowFood)} порций и ${escape(overflowTools)} инструментов. Излишки остаются у поселения.</p>`:''}${prices}${sources?`<div class="fact"><span>Доступный урожай угодий</span><b>${escape(sources.field.stock)} / ${escape(sources.field.capacity)}</b></div><div class="fact"><span>Сырьё для мастерской</span><b>${escape(sources.materials.stock)}</b></div><p class="empty">Угодья восстанавливаются по сезону. Чтобы запасы выросли, жителям нужно поработать; новое сырьё придётся привезти.</p>`:''}</section>`;
}
