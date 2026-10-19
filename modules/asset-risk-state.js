export const assetOwner=o=>o?.owner||o?.leftBy||null;
export const assetStore=o=>o?.kind==='supplyCache'&&!o.taken&&typeof assetOwner(o)==='string';
