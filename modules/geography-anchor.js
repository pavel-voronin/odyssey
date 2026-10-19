export function geographyAnchor(s,a){
 const g=a.geography,site=s.geographyFrame?.version===1&&s.geographyFrame.sites[g?.site];if(!site||g.version!==1)return null;
 let {x,y}=site.point;
 if(g.ordinal){const offsets=site.type==='port'?(site.landmass==='c1'?[[12,-16],[24,0],[12,16]]:[[-12,-16],[-24,0],[-12,16]]):[[12,-16],[-16,0],[8,16]],d=offsets[g.ordinal-1];if(!d)return null;x+=d[0];y+=d[1];}
 return {id:'place/'+a.id,x,y,unit:'diagram',sceneScale:.08,source:'geography-frame/'+site.key};
}
export function insideLand(point,polygon){
 let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }return inside;
}
export function shoreDistance(point,polygon){
 return Math.min(...polygon.map((a,i)=>{const b=polygon[(i+1)%polygon.length],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy);}));
}
export function currentGeography(s,id=s.hero.area){
 const seen=new Set();let a=s.areas[id];while(a&&!seen.has(a.id)){
  seen.add(a.id);if(a.geography&&s.geographyFrame?.version===1){const g=a.geography,f=s.geographyFrame;return {site:f.sites[g.site],country:f.countries[g.country]||null,region:f.regions[g.region]||null,landmass:g.landmass?s.continents[g.landmass]:null};}
  const left=s.areas[a.routeSite?.from]?.geography,right=s.areas[a.routeSite?.to]?.geography,roadParent=left&&right&&left.country===right.country&&left.region===right.region?a.routeSite.from:null;
  const parent=a.temporaryCamp?.parent||a.interior?.parent||roadParent||(a.city!==a.id?a.city:null);a=s.areas[parent];
 }return null;
}
