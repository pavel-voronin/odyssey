import {worldDate} from '../calendar.js';
import {enabled} from '../rules.js';

const profile=(choices,harvest=1,growth=1)=>({choices:choices.split(' '),harvest,growth});
export const CLIMATE_WEATHER={
  'temperate:spring':profile('clear clear cloud cloud rain rain rain fog heat storm'),
  'temperate:summer':profile('clear clear clear clear cloud rain fog heat heat storm',1.1),
  'temperate:autumn':profile('clear cloud cloud cloud rain rain rain fog fog storm',.95,.9),
  'temperate:winter':profile('clear clear cloud cloud snow snow snow snow fog storm',.65,.5),
  'tropical:wet':profile('clear cloud cloud rain rain rain rain storm storm fog',1.1,1.2),
  'tropical:dry':profile('clear clear clear clear cloud heat heat heat heat fog',.75,.5),
  'arid:summer':profile('clear clear clear clear cloud heat heat heat heat heat',.7,.5),
  'arid:cool':profile('clear clear clear cloud cloud cloud fog fog rain heat'),
  'alpine:thaw':profile('clear cloud cloud snow snow rain rain fog fog storm',.8,.8),
  'alpine:summer':profile('clear clear clear clear cloud cloud rain rain fog storm'),
  'alpine:autumn':profile('clear cloud cloud cloud snow snow snow fog fog fog',.7,.7),
  'alpine:winter':profile('snow snow snow snow snow snow cloud cloud fog storm',.45,.5),
  'underground:deep':profile('clear')
};
const neutral=profile('clear clear clear cloud cloud rain rain fog snow heat storm');
export function climateWeather(s,a,tick=s.tick){
  const d=worldDate(s,tick,a),p=enabled(s,'climate')?CLIMATE_WEATHER[d.climate+':'+d.season]||neutral:neutral;
  return{...p,climate:d.climate,season:d.season};
}
