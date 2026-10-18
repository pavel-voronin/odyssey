import {enabled} from './rules.js';
export const lootEventKey=e=>`${e.tick}/${e.meaning?.actor?.id}/${e.meaning?.item?.id}`;
export function createLootNotice(){return {identity:null,observed:null,dropped:0,notice:null};}
export function lootNotice(memory,s,now=performance.now(),{ticks=3,batchMs=4000,batching=false}={}){
 const identity=`${s.seed}/${s.generation}/${s.hero.lineage}/${s.hero.born}`;
 if(memory.identity!==identity||memory.observed>s.tick){Object.assign(memory,createLootNotice(),{identity,observed:s.tick-1,dropped:s.hero.timelineDropped||0});}
 if(!enabled(s,'loot-results')||!enabled(s,'event-meaning')){memory.observed=s.tick;memory.notice=null;return null;}
 const previous=memory.observed,events=(s.hero.timeline||s.journal.slice().reverse()).filter(e=>e.tick>previous&&e.tick<=s.tick&&e.meaning?.version===1&&e.meaning.action==='loot-result'&&e.meaning.actor?.id===s.hero.lineage&&typeof e.meaning.item?.id==='string'&&e.meaning.result),dropped=s.hero.timelineDropped||0;
 if(events.length){
  const former=memory.notice,join=former?.batch&&now<former.untilMs,batch=batching||s.tick-previous>1||Boolean(join),count=events.length+(join?former.count:0),entries=[...(join?former.entries:[]),...events].slice(-3),truncated=Boolean(join&&former.truncated||dropped>memory.dropped&&(s.hero.timeline?.[0]?.tick??s.tick)>previous);
  memory.notice={batch,count,entries,truncated,untilTick:s.tick+ticks,untilMs:now+batchMs,key:entries.map(e=>`${e.tick}/${e.meaning.item.id}/${e.meaning.result.fate}`).join('|')+'/'+count+'/'+truncated};
 }
 memory.observed=s.tick;memory.dropped=dropped;
 const note=memory.notice;if(note&&(note.batch?now<note.untilMs:s.tick<note.untilTick))return note;
 memory.notice=null;return null;
}
export function lootNoticeText(note){const last=note.entries.at(-1)?.meaning;return `Находок: ${note.truncated?'не менее ':''}${note.count}. Последняя: ${last?.item?.label||'неизвестная вещь'}.`;}
