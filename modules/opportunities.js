import {enabled} from '../rules.js';
export const OPPORTUNITIES={
  escort:{name:'Охрана караванов',requires:'escort',rank:1},raid:{name:'Налёт на караван',requires:'raid',rank:1},
  council:{name:'Место по рекомендации в совете',requires:'council',rank:2},clinic:{name:'Орденская лечебница',requires:'care',rank:1},
  academy:{name:'Учёба в закрытом архиве',requires:'study',rank:2},workshop:{name:'Гильдейская мастерская',requires:'craft',rank:1},
  garden:{name:'Общинный урожай',requires:'grow',rank:1},fleet:{name:'Право водить морские караваны',requires:'fleet',rank:2}
};
export function opportunity(s,id){
  const rule=OPPORTUNITIES[id];if(!rule)return{allowed:false,reason:'Неизвестная возможность.'};
  if(!enabled(s,'faction-paths'))return{allowed:false,reason:'Фракционное развитие отключено.'};
  const career=s.hero.affiliation,p=career?.paths[career.primary];
  if(!p)return{allowed:false,reason:'Нет действующей службы во фракции.'};
  if(p.suspended)return{allowed:false,reason:'Служба приостановлена из-за нарушения клятвы или недоверия.'};
  if(p.rank<rule.rank)return{allowed:false,reason:`Требуется ступень службы ${rule.rank}.`};
  if(!p.privileges.includes(rule.requires))return{allowed:false,reason:'Выбранная ветвь службы не даёт такого права.'};
  return{allowed:true,reason:p.office||p.branchName,source:career.primary};
}
