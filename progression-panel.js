const sources=new WeakMap();
// This owns only DOM presentation; clocks, goals and skill records stay with the engine.
export function renderProgressionPanel(panel,html,{force=false}={}){
 if(!force&&sources.get(panel)===html)return false;
 const opened=new Set([...panel.querySelectorAll('[data-progression-detail][open]')].map(e=>e.dataset.progressionDetail)),active=panel.ownerDocument.activeElement,focusKey=panel.contains(active)&&active.tagName==='SUMMARY'?active.closest('[data-progression-detail]')?.dataset.progressionDetail:null,scroll=panel.scrollTop;
 panel.innerHTML=html;sources.set(panel,html);
 for(const node of panel.querySelectorAll('[data-progression-detail]')){node.open=opened.has(node.dataset.progressionDetail);if(focusKey===node.dataset.progressionDetail)node.querySelector('summary')?.focus({preventScroll:true});}
 panel.scrollTop=scroll;return true;
}
