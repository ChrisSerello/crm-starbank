import { STAGES, OPERATORS } from './constants';

export const gid    = () => Math.random().toString(36).slice(2,9);
export const ago    = n  => new Date(Date.now()-n*86400000).toISOString().split("T")[0];
export const TODAY  = new Date().toISOString().split("T")[0];
export const fmtD   = d  => { if(!d)return"—"; const[y,m,day]=d.split("-"); return`${day}/${m}/${y}`; };
export const sinceD = d  => d ? Math.floor((Date.now()-new Date(d))/86400000) : 0;
export const inits  = n  => n ? n.trim().split(" ").slice(0,2).map(x=>x[0]).join("").toUpperCase() : "?";
export const stg    = id => STAGES.find(s=>s.id===id)||STAGES[0];
export const opr    = id => OPERATORS.find(o=>o.id===id);