import { LEADS0 } from './leads_data';
import { stg } from './utils';
import { TODAY } from './utils';

export const LS_KEY = "crm_indicacoes_v1";

// INIT_RULES must be declared BEFORE loadState() uses it
export const INIT_RULES = [
  {id:"r1",name:"Pós-venda → Time pós-venda",condition:"captacao_pos_venda",action:"team:pos_venda",showIndicator:true,active:true},
  {id:"r2",name:"Indicação c/ nome → Mesa (Round-robin)",condition:"indicacao_com_nome",action:"round_robin:mesa",showIndicator:true,active:true},
  {id:"r3",name:"Indicação s/ nome → Mesa (Round-robin)",condition:"indicacao_sem_nome",action:"round_robin:mesa",showIndicator:false,active:true},
];

function loadState() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { leads: parsed.leads ?? LEADS0, rules: parsed.rules ?? INIT_RULES };
    }
  } catch(e) {}
  return { leads: LEADS0, rules: INIT_RULES };
}

const { leads: savedLeads, rules: savedRules } = loadState();

export const INIT = {
  leads: savedLeads, view:"dashboard", sel:null, newOpen:false, dragId:null,
  filters:{search:"",product:"",operator:"",stage:"",orgao:""},
  rules: savedRules,
};

export function R(s,{type:t,...a}){
  switch(t){
    case"VIEW":       return{...s,view:a.v,sel:null};
    case"SEL":        return{...s,sel:a.id};
    case"CLOSE":      return{...s,sel:null};
    case"TNEW":       return{...s,newOpen:!s.newOpen};
    case"FILT":       return{...s,filters:{...s.filters,[a.k]:a.v}};
    case"DRAG":       return{...s,dragId:a.id};
    case"MOVE":       return{...s,leads:s.leads.map(l=>l.id!==a.lid?l:{...l,statusComercial:a.st,activities:[...l.activities,{id:Math.random().toString(36).slice(2,9),type:"stage_change",date:TODAY,user:"Usuário",text:`Movido para "${stg(a.st).label}"`}]})};
    case"NOTE":       return{...s,leads:s.leads.map(l=>l.id!==a.lid?l:{...l,ultimoContato:TODAY,activities:[...l.activities,a.act]})};
    case"UPD":        return{...s,leads:s.leads.map(l=>l.id!==a.lead.id?l:{...l,...a.lead})};
    case"ADD":        return{...s,newOpen:false,leads:[{...a.lead,id:Math.random().toString(36).slice(2,9),activities:[{id:Math.random().toString(36).slice(2,9),type:"stage_change",date:TODAY,user:"Sistema",text:"Lead criado e distribuído"}]},...s.leads]};
    case"TRULE":      return{...s,rules:s.rules.map(r=>r.id!==a.id?r:{...r,active:!r.active})};
    case"SET_LEADS":  return{...s,leads:a.leads};
    case"__SAVE_HOOK__": return s;
    default:          return s;
  }
}