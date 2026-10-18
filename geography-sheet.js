import {currentGeography} from './modules/geography-anchor.js';
export function geographyHTML(s,escape){const g=currentGeography(s),names=g&&[g.landmass?.name,g.country?.name,g.region?.name].filter(Boolean);return names?.length?'<p class="detail-label">СТРАНА И ОКРУГ</p><p>'+names.map(escape).join(' · ')+'</p>':'';}
