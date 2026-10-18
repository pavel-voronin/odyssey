import {billboardFrame} from './camera-perspective.js';
import {towerProfile,visibleTowers} from './modules/landmarks.js';
export function paintTower(c,x,y,height=64,distant=false,{camera,dpr=1}={}){
 const restore=billboardFrame(c,camera,x,y,dpr);c.save();c.fillStyle=distant?'#727e6b':'#838d7c';c.globalAlpha=distant?.65:1;const w=height*.33;
 c.fillRect(x-w/2,y-height,w,height);for(let i=0;i<3;i++)c.fillRect(x-w/2-2+i*w/2,y-height-5,w/3,7);
 c.fillStyle=distant?'#4b5e50':'#35483e';c.fillRect(x-2,y-height*.75,4,9);c.fillRect(x-2,y-height*.42,4,8);if(!distant)c.fillRect(x-4,y-13,8,13);c.restore();restore();
}
export function paintDistantTowers(c,s,area,width,ground,projection){if(s.hero.area!==area.id||s.hero.transit)return [];const towers=visibleTowers(s);for(const t of towers)paintTower(c,24+t.departureX/100*(width-48),ground-18,t.height*.7,true,projection);return towers;}
export function paintLocalTower(c,s,area,width,ground,projection){const t=towerProfile(s,area);if(!t)return false;paintTower(c,width*t.x/100,ground,t.height,false,projection);return true;}
export function landmarksHTML(s,escape){const list=s.hero.memory.landmarks||[];return list.length?'<p class="detail-label">ЗАМЕЧЕННЫЕ ОРИЕНТИРЫ</p>'+list.map(m=>`<div class="habit"><b>Старая башня</b><p>Замечена из «${escape(s.areas[m.from]?.name||'прежнее место')}». ${m.status==='approach'?'Подход проверен.':'Пока виден лишь силуэт.'}</p><p>Обитатели и находки становятся известны только при действительном посещении.</p></div>`).join(''):'';}
