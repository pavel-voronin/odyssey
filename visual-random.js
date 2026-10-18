// Visual choices use a separate, stateless hash. Drawing never consumes simulation randomness.
export function visualRandom(seed,key){
  let value=seed>>>0;for(const char of String(key))value=Math.imul(value^char.charCodeAt(0),16777619)>>>0;
  return()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
}
