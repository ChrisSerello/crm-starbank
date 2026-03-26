import { useState, useReducer, useMemo, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg-base:     #EDE8E1;
      --bg-surface:  #E4DED6;
      --bg-card:     #F5F1EB;
      --bg-elevated: #FAF8F4;
      --bg-hover:    #EEE9E2;

      --border:       rgba(90,70,50,0.10);
      --border-mid:   rgba(90,70,50,0.18);
      --border-bright: rgba(90,70,50,0.28);

      --accent:       #5B4FE8;
      --accent-light: #7C72F0;
      --accent-dim:   rgba(91,79,232,0.10);
      --accent-glow:  rgba(91,79,232,0.25);

      --teal:      #1A9E8A;
      --teal-dim:  rgba(26,158,138,0.10);
      --amber:     #C4720A;
      --amber-dim: rgba(196,114,10,0.10);
      --danger:    #C4423A;
      --danger-dim:rgba(196,66,58,0.10);
      --success:   #1E8F5E;
      --success-dim:rgba(30,143,94,0.10);

      --text-primary:   #1C1410;
      --text-secondary: #5C4E42;
      --text-muted:     #9C8E84;
      --text-faint:     #C4B8B0;

      --font:         'DM Sans', sans-serif;
      --font-display: 'Fraunces', serif;

      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --radius-xl: 22px;

      --shadow-sm:   0 1px 3px rgba(60,40,20,0.08), 0 1px 0 rgba(255,255,255,0.6) inset;
      --shadow-card: 0 2px 12px rgba(60,40,20,0.10), 0 1px 0 rgba(255,255,255,0.7) inset;
      --shadow-lift: 0 6px 24px rgba(60,40,20,0.14), 0 1px 0 rgba(255,255,255,0.8) inset;
      --shadow-float:0 12px 40px rgba(60,40,20,0.18);

      --transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
    }

    html, body, #root { height: 100%; background: var(--bg-base); font-family: var(--font); color: var(--text-primary); }

    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(90,70,50,0.18); border-radius: 99px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(90,70,50,0.28); }

    @keyframes fadeUp   { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideIn  { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
    @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
    @keyframes barFill  { from { width:0; } to { width:var(--bw); } }
    @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.5;transform:scale(.8);} }

    .fu  { animation: fadeUp  .38s cubic-bezier(.4,0,.2,1) both; }
    .fu1 { animation: fadeUp  .38s .06s cubic-bezier(.4,0,.2,1) both; }
    .fu2 { animation: fadeUp  .38s .12s cubic-bezier(.4,0,.2,1) both; }
    .fu3 { animation: fadeUp  .38s .18s cubic-bezier(.4,0,.2,1) both; }
    .si  { animation: slideIn .32s cubic-bezier(.4,0,.2,1) both; }

    .card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); box-shadow:var(--shadow-card); transition:var(--transition); }
    .card:hover { box-shadow:var(--shadow-lift); border-color:var(--border-mid); }

    .btn { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:var(--radius-sm); font-family:var(--font); font-size:13px; font-weight:600; cursor:pointer; border:none; transition:var(--transition); white-space:nowrap; letter-spacing:-0.01em; }
    .btn-primary { background:var(--accent); color:#fff; box-shadow:0 3px 16px var(--accent-glow), 0 1px 0 rgba(255,255,255,0.15) inset; }
    .btn-primary:hover { background:var(--accent-light); transform:translateY(-1px); box-shadow:0 6px 24px var(--accent-glow); }
    .btn-primary:active { transform:scale(0.98); }
    .btn-ghost { background:rgba(90,70,50,0.06); color:var(--text-secondary); border:1px solid var(--border-mid); }
    .btn-ghost:hover { background:rgba(90,70,50,0.1); color:var(--text-primary); }

    .inp { width:100%; background:var(--bg-elevated); border:1px solid var(--border-mid); border-radius:var(--radius-sm); padding:9px 12px; font-family:var(--font); font-size:13px; color:var(--text-primary); transition:var(--transition); outline:none; box-shadow:0 1px 3px rgba(60,40,20,0.06) inset; }
    .inp::placeholder { color:var(--text-faint); }
    .inp:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-dim), 0 1px 3px rgba(60,40,20,0.06) inset; }

    .sel { width:100%; background:var(--bg-elevated); border:1px solid var(--border-mid); border-radius:var(--radius-sm); padding:9px 32px 9px 12px; font-family:var(--font); font-size:13px; color:var(--text-primary); transition:var(--transition); outline:none; cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239C8E84' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; box-shadow:0 1px 3px rgba(60,40,20,0.06) inset; }
    .sel:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-dim); }
    .sel option { background:#F5F1EB; }

    .nav-item { display:flex; align-items:center; gap:10px; padding:10px 13px; border-radius:var(--radius-sm); font-size:13.5px; font-weight:500; cursor:pointer; border:none; background:transparent; color:var(--text-muted); width:100%; text-align:left; transition:var(--transition); position:relative; }
    .nav-item:hover { background:rgba(90,70,50,0.07); color:var(--text-primary); }
    .nav-item.active { background:var(--accent-dim); color:var(--accent); font-weight:600; }
    .nav-item.active::before { content:''; position:absolute; left:0; top:18%; bottom:18%; width:3px; background:var(--accent); border-radius:0 3px 3px 0; }

    .kcard { background:var(--bg-elevated); border:1px solid var(--border); border-radius:var(--radius-md); padding:13px 14px; margin-bottom:8px; cursor:pointer; transition:var(--transition); box-shadow:var(--shadow-sm); }
    .kcard:hover { transform:translateY(-2px); box-shadow:var(--shadow-lift); border-color:var(--border-mid); }

    .trow { transition:var(--transition); cursor:pointer; border-bottom:1px solid var(--border); }
    .trow:hover { background:var(--bg-hover); }

    .tag { display:inline-flex; align-items:center; padding:3px 9px; border-radius:99px; font-size:11px; font-weight:600; }
    .prod-pill { display:inline-flex; align-items:center; padding:3px 9px; border-radius:99px; font-size:10px; font-weight:600; background:var(--accent-dim); color:var(--accent); border:1px solid rgba(91,79,232,0.18); }

    .mcard { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px 22px; box-shadow:var(--shadow-card); transition:var(--transition); position:relative; overflow:hidden; }
    .mcard:hover { transform:translateY(-2px); box-shadow:var(--shadow-float); }

    .ptab { flex:1; padding:11px 0; background:none; border:none; font-family:var(--font); font-size:13px; font-weight:500; cursor:pointer; transition:var(--transition); border-bottom:2px solid transparent; }
    .ptab.on { color:var(--accent); border-bottom-color:var(--accent); font-weight:600; }
    .ptab:not(.on) { color:var(--text-muted); }
    .ptab:not(.on):hover { color:var(--text-secondary); }

    .kcol { min-width:210px; width:220px; flex-shrink:0; background:rgba(90,70,50,0.04); border:1px solid var(--border); border-radius:var(--radius-lg); padding:12px 10px; transition:var(--transition); overflow:visible; }
    .kcol.dover { background:var(--accent-dim); border-color:rgba(91,79,232,0.35); box-shadow:0 0 0 3px var(--accent-dim); }

    .adot { display:inline-block; border-radius:50%; animation:pulseDot 2s ease infinite; }

    .mbk { position:fixed; inset:0; background:rgba(28,20,16,0.55); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:200; animation:fadeIn .2s ease; }
    .mbox { background:var(--bg-elevated); border:1px solid var(--border-mid); border-radius:var(--radius-xl); box-shadow:var(--shadow-float), 0 1px 0 rgba(255,255,255,0.8) inset; width:540px; max-height:88vh; overflow-y:auto; padding:28px; animation:fadeUp .3s cubic-bezier(.4,0,.2,1); }

    .spanel { position:fixed; top:0; right:0; bottom:0; width:490px; background:var(--bg-elevated); border-left:1px solid var(--border-mid); display:flex; flex-direction:column; z-index:100; box-shadow:-6px 0 32px rgba(60,40,20,0.14); animation:slideIn .3s cubic-bezier(.4,0,.2,1); }

    .bar-bg { background:rgba(90,70,50,0.1); border-radius:99px; overflow:hidden; }
    .bar-fill { height:100%; border-radius:99px; width:var(--bw); animation:barFill .8s cubic-bezier(.4,0,.2,1) both; }

    .section-title { font-family:var(--font-display); font-size:24px; font-weight:600; color:var(--text-primary); letter-spacing:-0.02em; }
    .section-sub   { font-size:13px; color:var(--text-muted); margin-top:3px; }
    .eyebrow { font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.09em; }

    .search-wrap { position:relative; flex:1 1 210px; min-width:190px; }
    .search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:var(--text-faint); pointer-events:none; font-size:14px; }
    .search-wrap .inp { padding-left:34px; }

    .activity-line { width:1px; flex:1; background:linear-gradient(to bottom, var(--border-mid), transparent); margin-top:4px; min-height:14px; }
  `}</style>
);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const STAGES = [
  { id:"distribuido",   label:"Distribuído",   color:"#7B6EA8", bg:"rgba(123,110,168,0.1)" },
  { id:"novo_lead",     label:"Novo Lead",     color:"#5B4FE8", bg:"rgba(91,79,232,0.1)"  },
  { id:"qualificado",   label:"Qualificado",   color:"#C4720A", bg:"rgba(196,114,10,0.1)" },
  { id:"docs_enviados", label:"Docs Enviados", color:"#1A9E8A", bg:"rgba(26,158,138,0.1)" },
  { id:"em_negociacao", label:"Em Negociação", color:"#7C72F0", bg:"rgba(124,114,240,0.1)"},
  { id:"ganho",         label:"Ganho",         color:"#1E8F5E", bg:"rgba(30,143,94,0.1)"  },
  { id:"pedido",        label:"Pedido",        color:"#C4423A", bg:"rgba(196,66,58,0.1)"  },
];

const PRODUCTS = ["Empréstimo Consignado","Cartão Consignado","Cartão Benefício","Vale Consignado","Compra de Dívida","Auxílio Servidor","Crediário Star"];
const OPERATORS = [
  { id:"beatriz",   name:"Beatriz Queiroz",  color:"#5B4FE8" },
  { id:"joice",     name:"Joice",            color:"#7B6EA8" },
  { id:"larissa",   name:"Larissa Azevedo",  color:"#1A9E8A" },
  { id:"maria",     name:"Maria Moura",      color:"#C4720A" },
  { id:"stefanie",  name:"Stefanie",         color:"#C4423A" },
  { id:"nathalia",  name:"Nathalia Souza",   color:"#1E8F5E" },
  { id:"anasilva",  name:"Ana Silva",        color:"#7C72F0" },
];
const EQUIPES = ["Maicon","Nair"];
const OPERADORES_REPASSADOS = [
  "Talita Santana","Kemilly Santos","Manoela Jardim","Kauany Fonseca",
  "Gabriel Lima","Kelry Mourão","Adenelma França","Giovanna Silva",
  "Kayllainne Santos","Stepphanny Lima","Sara Lima",
];
const INDICATION_TYPES = [
  { id:"captacao_pos_venda",  label:"Captação Pós-venda" },
  { id:"indicacao_com_nome",  label:"Indicação / Informar nome" },
  { id:"indicacao_sem_nome",  label:"Indicação / Não informar nome" },
];
const DOC_STATUS = ["Não solicitado","Solicitado","Recebido","Validado","Aprovado"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const gid    = () => Math.random().toString(36).slice(2,9);
const ago    = n  => new Date(Date.now()-n*86400000).toISOString().split("T")[0];
const TODAY  = new Date().toISOString().split("T")[0];
const fmtD   = d  => { if(!d)return"—"; const[y,m,day]=d.split("-"); return`${day}/${m}/${y}`; };
const sinceD = d  => d ? Math.floor((Date.now()-new Date(d))/86400000) : 0;
const inits  = n  => n ? n.trim().split(" ").slice(0,2).map(x=>x[0]).join("").toUpperCase() : "?";
const stg    = id => STAGES.find(s=>s.id===id)||STAGES[0];
const opr    = id => OPERATORS.find(o=>o.id===id);

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const LEADS0 = [{"id":"r1","dataEntrada":"2026-03-20","telefone":"11 99464-1009","nomeIndicado":"JANETE MORAES DE CASTRO VAZ","cpfIndicado":"22401260862","nomeQuemIndicou":"JANETE MORAES DE CASTRO VAZ","orgaoPrefeitura":"EMBU DAS ARTES","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act1_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r2","dataEntrada":"2026-03-20","telefone":"43 9932-4873","nomeIndicado":"SEM NOME","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"CRISTINA APARECIDA DA SILVA PE","orgaoPrefeitura":"S.ANTONIO DA PLATINA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act2_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r3","dataEntrada":"2026-03-20","telefone":"41 9101-5473","nomeIndicado":"ELOINA SILVVA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"CRISTINA APARECIDA DA SILVA PE","orgaoPrefeitura":"S.ANTONIO DA PLATINA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act3_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r4","dataEntrada":"2026-03-20","telefone":"43 92002-5668","nomeIndicado":"MARISA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"CRISTINA APARECIDA DA SILVA PE","orgaoPrefeitura":"S.ANTONIO DA PLATINA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act4_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r5","dataEntrada":"2026-03-20","telefone":"43 9812-7639","nomeIndicado":"PRISCILA DE SOUZA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"CRISTINA APARECIDA DA SILVA PE","orgaoPrefeitura":"S.ANTONIO DA PLATINA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act5_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r6","dataEntrada":"2026-03-20","telefone":"43 9806-4038","nomeIndicado":"MAURA PS","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"CRISTINA APARECIDA DA SILVA PE","orgaoPrefeitura":"S.ANTONIO DA PLATINA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act6_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r7","dataEntrada":"2026-03-20","telefone":"43 9811-0742","nomeIndicado":"JU","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"CRISTINA APARECIDA DA SILVA PE","orgaoPrefeitura":"S.ANTONIO DA PLATINA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"CLIENTE SEM MARGEM OFERTADO COMPRA NAO QUIS","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act7_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"},{"id":"act7_2","type":"note","date":"2026-03-24","user":"Sistema","text":"CLIENTE SEM MARGEM OFERTADO COMPRA NAO QUIS"}]},{"id":"r8","dataEntrada":"2026-03-20","telefone":"43 9974-2863","nomeIndicado":"ROSANA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"CRISTINA APARECIDA DA SILVA PE","orgaoPrefeitura":"S.ANTONIO DA PLATINA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act8_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r9","dataEntrada":"2026-03-20","telefone":"43 9983-1424","nomeIndicado":"LUIS","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"CRISTINA APARECIDA DA SILVA PE","orgaoPrefeitura":"S.ANTONIO DA PLATINA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act9_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r10","dataEntrada":"2026-03-23","telefone":"11 98360-4291","nomeIndicado":"EDENIZ NANCI FERREIRA SANTOS","cpfIndicado":"31925427803","nomeQuemIndicou":"EDENIZ NANCI FERREIRA SANTOS","orgaoPrefeitura":"EMBU DAS ARTES","produtosInteresse":["Empréstimo Consignado"],"documentoStatus":"Recebido","statusComercial":"pedido","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-04-23","ultimoContato":"2026-04-23","operadorRepassado":"","equipe":"","resultado":"Perdido","observacoes":"SEM MARGEM","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act10_1","type":"stage_change","date":"2026-04-23","user":"Sistema","text":"Lead importado da planilha — ❌ Perdido"},{"id":"act10_2","type":"note","date":"2026-04-23","user":"Sistema","text":"SEM MARGEM"}]},{"id":"r11","dataEntrada":"2026-03-20","telefone":"(14) 98141-9045","nomeIndicado":"SORAYA MILLEO BONFANTE","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"SORAYA MILLEO BONFANTE","orgaoPrefeitura":"BAURU","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act11_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r12","dataEntrada":"2026-03-20","telefone":"11 99464-1009","nomeIndicado":"JANETE MORAES DE CASTRO VAZ","cpfIndicado":"22401260862","nomeQuemIndicou":"JANETE MORAES DE CASTRO VAZ","orgaoPrefeitura":"EMBU DAS ARTES","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"CLIENTE MARGEM NEGATIVA DE 1.000 MIL","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act12_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"},{"id":"act12_2","type":"note","date":"2026-03-24","user":"Sistema","text":"CLIENTE MARGEM NEGATIVA DE 1.000 MIL"}]},{"id":"r13","dataEntrada":"2026-03-20","telefone":"43 8486-0669","nomeIndicado":"SANDRINHA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"MARISA","orgaoPrefeitura":"S.ANTONIO DA PLATINA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act13_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r14","dataEntrada":"2026-03-20","telefone":"43 9611-5138","nomeIndicado":"MARCY","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"MARISA","orgaoPrefeitura":"S.ANTONIO DA PLATINA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act14_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r15","dataEntrada":"2026-03-20","telefone":"43 9911-9516","nomeIndicado":"LU","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"MARISA","orgaoPrefeitura":"S.ANTONIO DA PLATINA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act15_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r16","dataEntrada":"2026-03-20","telefone":"11982865030","nomeIndicado":"AGNALDO SANTOS MATOS ALVES","cpfIndicado":"13976251801","nomeQuemIndicou":"AGNALDO SANTOS MATOS ALVES","orgaoPrefeitura":"TABOA DA SERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"qualificado","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act16_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🟠 Qualificado"}]},{"id":"r17","dataEntrada":"2026-03-20","telefone":"43 9935-5872","nomeIndicado":"VIVIANE","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"CRISTINA APARECIDA DA SILVA PE","orgaoPrefeitura":"S.ANTONIO DA PLATINA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act17_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r18","dataEntrada":"2026-03-20","telefone":"43 9964-2424","nomeIndicado":"ANA CAROLINA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"CRISTINA APARECIDA DA SILVA PE","orgaoPrefeitura":"S.ANTONIO DA PLATINA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act18_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r19","dataEntrada":"2026-03-20","telefone":"43 9165-2003","nomeIndicado":"BRUNA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"CRISTINA APARECIDA DA SILVA PE","orgaoPrefeitura":"S.ANTONIO DA PLATINA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"NÃO INFORMADO","secretariaAtuacao":"","activities":[{"id":"act19_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r20","dataEntrada":"2026-03-23","telefone":"93 9155-2836","nomeIndicado":"ERIVELSON PEREIRA CASTRO","cpfIndicado":"96337265220","nomeQuemIndicou":"JAILSON SOUSA DE JESUS","orgaoPrefeitura":"PREF. BELTERRA","produtosInteresse":["Empréstimo Consignado"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"SECRETARIA MUNICIPAL DE INFRAESTRUTURAS","secretariaAtuacao":"","activities":[{"id":"act20_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r21","dataEntrada":"2026-03-23","telefone":"(14) 99703-2756","nomeIndicado":"ALINE FERNANDA DE BARROS MDIS","cpfIndicado":"342.906.628-03","nomeQuemIndicou":"ALINE FERNANDA DE BARROS MDIS","orgaoPrefeitura":"TUPÃ","produtosInteresse":["Empréstimo Consignado"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"SEM MARGEM , CARTAO QUE TEM NÃO ATUAMOS","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act21_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"},{"id":"act21_2","type":"note","date":"2026-03-24","user":"Sistema","text":"SEM MARGEM , CARTAO QUE TEM NÃO ATUAMOS"}]},{"id":"r22","dataEntrada":"2026-03-23","telefone":"(94) 99156-3847","nomeIndicado":"TRAFEGO- ADRIANO","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"TRAFEGO- ADRIANO","orgaoPrefeitura":"REDENÇÃO","produtosInteresse":["Empréstimo Consignado"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act22_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r23","dataEntrada":"2026-03-23","telefone":"91 8600-4989","nomeIndicado":"ALADIM DO SOCORRO PIRES DE ARAUJO","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"ALADIM DO SOCORRO PIRES DE ARAUJO","orgaoPrefeitura":"BARCARENA","produtosInteresse":["Empréstimo Consignado"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act23_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r24","dataEntrada":"2026-03-23","telefone":"99 8117-8211","nomeIndicado":"JULIANA DA CONCEICAO SILVAMELO TRINTA","cpfIndicado":"053107523-07","nomeQuemIndicou":"JULIANA DA CONCEICAO SILVAMELO TRINTA","orgaoPrefeitura":"IMPERATRIZ","produtosInteresse":["Compra de Dívida"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"ASSESOR TECNICO DE PLANEJAMENTO- SAUDE","secretariaAtuacao":"","activities":[{"id":"act24_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r25","dataEntrada":"2026-03-23","telefone":"61 9190-3792","nomeIndicado":"ANTONIA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"LEZENITA DE OLIVEIRA LIMA PAES LANDIM","orgaoPrefeitura":"GOVERNO DE GOIÁS","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"COORDENAÇÃO REGIONAL DE EDUCAÇÃO","secretariaAtuacao":"","activities":[{"id":"act25_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r26","dataEntrada":"2026-03-23","telefone":"91 9977-2712","nomeIndicado":"REJANE MARIA CARDOSO AMORIM","cpfIndicado":"679.143.142-34","nomeQuemIndicou":"REJANE MARIA CARDOSO AMORIM","orgaoPrefeitura":"BARCARENA","produtosInteresse":["Empréstimo Consignado"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"SEM MARGEM , CARTAO QUE TEM NÃO ATUAMOS","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act26_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"},{"id":"act26_2","type":"note","date":"2026-03-24","user":"Sistema","text":"SEM MARGEM , CARTAO QUE TEM NÃO ATUAMOS"}]},{"id":"r27","dataEntrada":"2026-03-23","telefone":"11 98959-9267","nomeIndicado":"JULIANA CRISTINA OLAIO DE BRITO","cpfIndicado":"382.988.588-16","nomeQuemIndicou":"JULIANA CRISTINA OLAIO DE BRITO","orgaoPrefeitura":"COTIA","produtosInteresse":["Empréstimo Consignado"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"SEM MARGEM , CARTAO QUE TEM NÃO ATUAMOS","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act27_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"},{"id":"act27_2","type":"note","date":"2026-03-24","user":"Sistema","text":"SEM MARGEM , CARTAO QUE TEM NÃO ATUAMOS"}]},{"id":"r28","dataEntrada":"2026-03-24","telefone":"94 9199-2213","nomeIndicado":"ANTONIA CLEOVANIA DOS SANTOS FERNANDES","cpfIndicado":"79490913200","nomeQuemIndicou":"ANTONIA CLEOVANIA DOS SANTOS FERNANDES","orgaoPrefeitura":"REDENÇÃO","produtosInteresse":["Empréstimo Consignado"],"documentoStatus":"Recebido","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act28_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r29","dataEntrada":"2026-03-24","telefone":"44 9904-3022","nomeIndicado":"NELMA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"LUCILENE MATERA","orgaoPrefeitura":"MARINGÁ","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"PASSAMOS PROPOSTA CLIENTE FICO DE DAR RETORNO","perfilCliente":"PORTAL DA INCLUSÃO","secretariaAtuacao":"","activities":[{"id":"act29_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"},{"id":"act29_2","type":"note","date":"2026-03-24","user":"Sistema","text":"PASSAMOS PROPOSTA CLIENTE FICO DE DAR RETORNO"}]},{"id":"r30","dataEntrada":"2026-03-24","telefone":"14 99705-7140","nomeIndicado":"MESSIAS LUIS FARIA","cpfIndicado":"302.067.778-50","nomeQuemIndicou":"MESSIAS LUIS FARIA","orgaoPrefeitura":"BAURU","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"PASSAMOS PROPOSTA CLIENTE FICO DE DAR RETORNO","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act30_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"},{"id":"act30_2","type":"note","date":"2026-03-24","user":"Sistema","text":"PASSAMOS PROPOSTA CLIENTE FICO DE DAR RETORNO"}]},{"id":"r31","dataEntrada":"2026-03-24","telefone":"(11) 93250-6934","nomeIndicado":"SIMONE MAGALHAES","cpfIndicado":"168.966.038-44","nomeQuemIndicou":"SIMONE MAGALHAES","orgaoPrefeitura":"EMBU DAS ARTES","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act31_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r32","dataEntrada":"2026-03-24","telefone":"11 98377 3291","nomeIndicado":"PATRICIA APARECIDA FERRAZ","cpfIndicado":"113.334.418-60","nomeQuemIndicou":"PATRICIA APARECIDA FERRAZ","orgaoPrefeitura":"EMBU DAS ARTES","produtosInteresse":["Empréstimo Consignado"],"documentoStatus":"Recebido","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act32_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r33","dataEntrada":"2026-03-24","telefone":"11954200124","nomeIndicado":"DAMARES DE OLIVEIRA GOMES","cpfIndicado":"32276473894","nomeQuemIndicou":"DAMARES DE OLIVEIRA GOMES","orgaoPrefeitura":"TABOA DA SERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act33_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r34","dataEntrada":"2026-03-24","telefone":"11997206852","nomeIndicado":"CRISTIANE CARMINATI MARICATO","cpfIndicado":"252.469.138-13","nomeQuemIndicou":"CRISTIANE CARMINATI MARICATO","orgaoPrefeitura":"TABOA DA SERRA","produtosInteresse":["Cartão Consignado"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act34_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r35","dataEntrada":"2026-03-24","telefone":"12 99727-6671","nomeIndicado":"DANIEL MOREIRA DA COSTA","cpfIndicado":"38070762802","nomeQuemIndicou":"DANIEL MOREIRA DA COSTA","orgaoPrefeitura":"CAMPOS DO JORDAO","produtosInteresse":["Empréstimo Consignado"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act35_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r36","dataEntrada":"2026-03-24","telefone":"11962523106","nomeIndicado":"FABIANA DIAS ROSA","cpfIndicado":"30230422845","nomeQuemIndicou":"FABIANA DIAS ROSA","orgaoPrefeitura":"TABOA DA SERRA","produtosInteresse":["Empréstimo Consignado"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act36_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r37","dataEntrada":"2026-03-24","telefone":"11 93355-9698","nomeIndicado":"ANA CRISTINA TELLES RODRIGUES","cpfIndicado":"33187611842","nomeQuemIndicou":"ANA CRISTINA TELLES RODRIGUES","orgaoPrefeitura":"TABOA DA SERRA","produtosInteresse":["Empréstimo Consignado"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"TELEFONE ERRADO","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act37_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"},{"id":"act37_2","type":"note","date":"2026-03-24","user":"Sistema","text":"TELEFONE ERRADO"}]},{"id":"r38","dataEntrada":"2026-03-24","telefone":"19 98766-9721","nomeIndicado":"MARIA LIDIANI GODOY","cpfIndicado":"345.325.828-22","nomeQuemIndicou":"MARIA LIDIANI GODOY","orgaoPrefeitura":"PREF. VINHEDO","produtosInteresse":["Empréstimo Consignado"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act38_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r39","dataEntrada":"2026-03-24","telefone":"11982944698","nomeIndicado":"ANA PAULA VICTOR MALOZZI","cpfIndicado":"301.096.578-88","nomeQuemIndicou":"ANA PAULA VICTOR MALOZZI","orgaoPrefeitura":"COTIA","produtosInteresse":["Empréstimo Consignado"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act39_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r40","dataEntrada":"2026-03-24","telefone":"81 9788-3729","nomeIndicado":"FABIANA VIEIRA SOBRAL DE MENEZES","cpfIndicado":"078.500.874-88","nomeQuemIndicou":"FABIANA VIEIRA SOBRAL DE MENEZES","orgaoPrefeitura":"PREF. ALTINHO","produtosInteresse":["Cartão Consignado"],"documentoStatus":"Recebido","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act40_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r41","dataEntrada":"2026-03-24","telefone":"11 95740-3860","nomeIndicado":"MARIA CLEMILDES RIBEIRO SANTOS DA SILVA","cpfIndicado":"261.913.248-71","nomeQuemIndicou":"MARIA CLEMILDES RIBEIRO SANTOS DA SILVA","orgaoPrefeitura":"PREF. POÁ","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"SEM MARGEM PRA NOVO , ESTAMOS VENDO COMPRA","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act41_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"},{"id":"act41_2","type":"note","date":"2026-03-24","user":"Sistema","text":"SEM MARGEM PRA NOVO , ESTAMOS VENDO COMPRA"}]},{"id":"r42","dataEntrada":"2026-03-24","telefone":"81 8234-4093","nomeIndicado":"JOAO DIEGO COSTA FERREIRA","cpfIndicado":"069.098.614-93","nomeQuemIndicou":"JOAO DIEGO COSTA FERREIRA","orgaoPrefeitura":"PREF. ALTINHO","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Ganho","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act42_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r43","dataEntrada":"2026-03-24","telefone":"11 91907-5290","nomeIndicado":"TATIANA NATALI DE CASTRO","cpfIndicado":"307.755.478-08","nomeQuemIndicou":"TATIANA NATALI DE CASTRO","orgaoPrefeitura":"SALTO","produtosInteresse":["Cartão Consignado"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act43_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r44","dataEntrada":"2026-03-24","telefone":"81 9741-0270","nomeIndicado":"ERIECKSON LEANDRO DE MORAIS DE SIQUEIRA","cpfIndicado":"080.562.054-03","nomeQuemIndicou":"ERIECKSON LEANDRO DE MORAIS DE SIQUEIRA","orgaoPrefeitura":"PREF. ALTINHO","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act44_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r45","dataEntrada":"2026-03-24","telefone":"(11) 95354 3890","nomeIndicado":"ADRIANA RAMOS DA SILVA","cpfIndicado":"153.087.178-69","nomeQuemIndicou":"ADRIANA RAMOS DA SILVA","orgaoPrefeitura":"EMBU DAS ARTES","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act45_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r46","dataEntrada":"2026-03-24","telefone":"11 91687-2864","nomeIndicado":"ESTELA APARECIDA SANTOS DE CAMARGO","cpfIndicado":"276.901.838-83","nomeQuemIndicou":"ESTELA APARECIDA SANTOS DE CAMARGO","orgaoPrefeitura":"EMBU DAS ARTES","produtosInteresse":["Cartão Benefício"],"documentoStatus":"Recebido","statusComercial":"docs_enviados","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act46_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔵 Docs Enviados"}]},{"id":"r47","dataEntrada":"2026-03-24","telefone":"(14) 99703-2756","nomeIndicado":"ALINE FERNANDA DE BARROS MDIS","cpfIndicado":"342.906.628-03","nomeQuemIndicou":"ALINE FERNANDA DE BARROS MDIS","orgaoPrefeitura":"PREF. TUPÃ","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act47_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r48","dataEntrada":"2026-03-24","telefone":"11 94485-9365","nomeIndicado":"JONATHAN TORQUATRO","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"TATIANA NATALI DE CASTRO","orgaoPrefeitura":"SALTO","produtosInteresse":["Compra de Dívida"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"ASSESSOR - SECRETARIA DE EDUCACAO","secretariaAtuacao":"","activities":[{"id":"act48_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r49","dataEntrada":"2026-03-24","telefone":"81 9459-4567","nomeIndicado":"CLEIDINHA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"EDNA APARECIDA DA SILVA","orgaoPrefeitura":"ALTINHO - PE","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act49_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r50","dataEntrada":"2026-03-24","telefone":"81 9669-6426","nomeIndicado":"GENIVALDO","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"EDNA APARECIDA DA SILVA","orgaoPrefeitura":"ALTINHO - PE","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act50_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r51","dataEntrada":"2026-03-24","telefone":"81 9818-9615","nomeIndicado":"MURILO","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"EDNA APARECIDA DA SILVA","orgaoPrefeitura":"ALTINHO - PE","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act51_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r52","dataEntrada":"2026-03-24","telefone":"81 9767-7705","nomeIndicado":"MARIA HELENA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"EDNA APARECIDA DA SILVA","orgaoPrefeitura":"ALTINHO - PE","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act52_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r53","dataEntrada":"2026-03-24","telefone":"81 9568-5727","nomeIndicado":"ABILIO","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"EDNA APARECIDA DA SILVA","orgaoPrefeitura":"ALTINHO - PE","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act53_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r54","dataEntrada":"2026-03-24","telefone":"81 9642-2704","nomeIndicado":"ADELSON","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"EDNA APARECIDA DA SILVA","orgaoPrefeitura":"ALTINHO - PE","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act54_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r55","dataEntrada":"2026-03-24","telefone":"81 9177-4184","nomeIndicado":"ADRIANA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"EDNA APARECIDA DA SILVA","orgaoPrefeitura":"ALTINHO - PE","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act55_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r56","dataEntrada":"2026-03-24","telefone":"81 9161-7154","nomeIndicado":"AMERSON","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"EDNA APARECIDA DA SILVA","orgaoPrefeitura":"ALTINHO - PE","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act56_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r57","dataEntrada":"2026-03-24","telefone":"81 9688-4751","nomeIndicado":"ANINHA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"EDNA APARECIDA DA SILVA","orgaoPrefeitura":"ALTINHO - PE","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act57_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r58","dataEntrada":"2026-03-24","telefone":"81 9936-3166","nomeIndicado":"ROSE","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"EDNA APARECIDA DA SILVA","orgaoPrefeitura":"ALTINHO - PE","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"SECRETARIA MUN TRANSITO E TRANSPORTE","secretariaAtuacao":"","activities":[{"id":"act58_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r59","dataEntrada":"2026-03-24","telefone":"94 9285-3003","nomeIndicado":"LOURIVAL","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"JOSEMAR GOMES DE SOUZA","orgaoPrefeitura":"REDENÇÃO","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"SECRETARIA DA ADMINISTRAÇÃO","secretariaAtuacao":"","activities":[{"id":"act59_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r60","dataEntrada":"2026-03-24","telefone":"91 8141-8357","nomeIndicado":"GLENDA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"SANDRA SUELY MORAES DA SILVA","orgaoPrefeitura":"PREFEITURA DE BARCARENA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"AG. COMUNIT. DE SAUDE","secretariaAtuacao":"","activities":[{"id":"act60_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r61","dataEntrada":"2026-03-24","telefone":"11 94394-5596","nomeIndicado":"CLEIDJANE GOMES DA SILVA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"ANA PAULA VICTOR MALOZZI","orgaoPrefeitura":"EMBU DAS ARTES","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"SEC. EDUCACAO - FUNDEB 70% (CRECHE)","secretariaAtuacao":"","activities":[{"id":"act61_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r62","dataEntrada":"2026-03-24","telefone":"91 8588-4657","nomeIndicado":"REGINA CELI SANTANA DA SILVA","cpfIndicado":"318.003.002-04","nomeQuemIndicou":"SANDRA SUELY MORAES DA SILVA","orgaoPrefeitura":"BARCARENA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"AG COMUNITARIO DA SAÚDE","secretariaAtuacao":"","activities":[{"id":"act62_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r63","dataEntrada":"2026-03-24","telefone":"65 9617-3279","nomeIndicado":"GIRNEIRE","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"CATARINA BATISTA DE PAULA","orgaoPrefeitura":"CUIABA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"SECRETARIA DA SAUDE","secretariaAtuacao":"","activities":[{"id":"act63_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r64","dataEntrada":"2026-03-24","telefone":"65 8104-6371","nomeIndicado":"JUSCINEIA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"CATARINA BATISTA DE PAULA","orgaoPrefeitura":"CUIABA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act64_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r65","dataEntrada":"2026-03-24","telefone":"65 9331-9358","nomeIndicado":"JANE BISPO","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"CATARINA BATISTA DE PAULA","orgaoPrefeitura":"CUIABA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act65_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r66","dataEntrada":"2026-03-24","telefone":"65 9338-3611","nomeIndicado":"DADA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"CATARINA BATISTA DE PAULA","orgaoPrefeitura":"CUIABA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act66_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r67","dataEntrada":"2026-03-24","telefone":"65 8135-0686","nomeIndicado":"FILHO MAX","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"CATARINA BATISTA DE PAULA","orgaoPrefeitura":"CUIABA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act67_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r68","dataEntrada":"2026-03-24","telefone":"15 99802-6507","nomeIndicado":"RUBENS DE VITORES JUNIOR","cpfIndicado":"34387318864","nomeQuemIndicou":"RUBENS DE VITORES JUNIOR","orgaoPrefeitura":"SOROCABA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Perdido","observacoes":"SAC QUER BOLETO DE QUITAÇÃO E ACEITO NOVA PROPOSTA EM 3X","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act68_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"},{"id":"act68_2","type":"note","date":"2026-03-24","user":"Sistema","text":"SAC QUER BOLETO DE QUITAÇÃO E ACEITO NOVA PROPOSTA EM 3X"}]},{"id":"r69","dataEntrada":"2026-03-24","telefone":"44 9719-1284","nomeIndicado":"ROSANA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"LUCILENE MATERA","orgaoPrefeitura":"MARINGA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"AUXILIAR DA INCLUSÃO","secretariaAtuacao":"","activities":[{"id":"act69_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r70","dataEntrada":"2026-03-24","telefone":"44 8435-0343","nomeIndicado":"LENE","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"LUCILENE MATERA","orgaoPrefeitura":"MARINGA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Perdido","observacoes":"CLIENTE SEM MARGEM AO FALAR DA COMPRA A MESMA DIZ QUE NAO TEM INTERESSE","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act70_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"},{"id":"act70_2","type":"note","date":"2026-03-24","user":"Sistema","text":"CLIENTE SEM MARGEM AO FALAR DA COMPRA A MESMA DIZ QUE NAO TEM INTERESSE"}]},{"id":"r71","dataEntrada":"2026-03-24","telefone":"44 9883-8257","nomeIndicado":"ELAINE BATISTA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"LUCILENE MATERA","orgaoPrefeitura":"MARINGA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act71_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r72","dataEntrada":"2026-03-24","telefone":"62 9437-5446","nomeIndicado":"NICE","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"KELLY LUCIA","orgaoPrefeitura":"GOIAS","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"NUMERO QUE ESTA AQUI É DA PROPRIA CLIENTE QUE INDICO","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act72_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"},{"id":"act72_2","type":"note","date":"2026-03-24","user":"Sistema","text":"NUMERO QUE ESTA AQUI É DA PROPRIA CLIENTE QUE INDICO"}]},{"id":"r73","dataEntrada":"2026-03-24","telefone":"11 95647-1765","nomeIndicado":"ANGELA","cpfIndicado":"325.907.618-21","nomeQuemIndicou":"BRUNO PIMENTA","orgaoPrefeitura":"EMBU DAS ARTES","produtosInteresse":["Empréstimo Consignado"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act73_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r74","dataEntrada":"2026-03-24","telefone":"14 99760-5167","nomeIndicado":"ELIANA BARBOSA PROCOPIO","cpfIndicado":"215.018.878-31","nomeQuemIndicou":"ELIANA BARBOSA PROCOPIO","orgaoPrefeitura":"BAURU","produtosInteresse":["Compra de Dívida"],"documentoStatus":"Não solicitado","statusComercial":"distribuido","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act74_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🔷 Distribuído"}]},{"id":"r75","dataEntrada":"2026-03-25","telefone":"93 9184-1342","nomeIndicado":"ERICA MARIA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"SEC. DA EDUCAÇÃO BASICA","secretariaAtuacao":"","activities":[{"id":"act75_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r76","dataEntrada":"2026-03-25","telefone":"93 9144-0028","nomeIndicado":"ALESSANDRO","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act76_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r77","dataEntrada":"2026-03-25","telefone":"92 9299-3528","nomeIndicado":"CARLOS MATOS","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act77_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r78","dataEntrada":"2026-03-25","telefone":"93 9129-1231","nomeIndicado":"CLEOZEMIR SOUSA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act78_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r79","dataEntrada":"2026-03-25","telefone":"93 9230-6267","nomeIndicado":"DARIA FEITOSA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Sem contato","observacoes":"TELEFONE ERRADO","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act79_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"},{"id":"act79_2","type":"note","date":"2026-03-25","user":"Sistema","text":"TELEFONE ERRADO"}]},{"id":"r80","dataEntrada":"2026-03-25","telefone":"64 9321-0844","nomeIndicado":"EDEVALDO COORDENADOR","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act80_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r81","dataEntrada":"2026-03-25","telefone":"93 9225-0542","nomeIndicado":"FERNANDA BRITO","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"NÃO ATENDE -  MENSAGEM ENVIADA","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act81_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"},{"id":"act81_2","type":"note","date":"2026-03-25","user":"Sistema","text":"NÃO ATENDE -  MENSAGEM ENVIADA"}]},{"id":"r82","dataEntrada":"2026-03-25","telefone":"93 9242-3748","nomeIndicado":"IRANEIDE","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act82_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r83","dataEntrada":"2026-03-25","telefone":"93 9164-8735","nomeIndicado":"JADILSON SOUZA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act83_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r84","dataEntrada":"2026-03-25","telefone":"11 93426-1334","nomeIndicado":"ANA PAULA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"TATIANA NATALI DE CASTRO","orgaoPrefeitura":"SALTO","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"NÃO ATENDE -  MENSAGEM ENVIADA","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act84_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"},{"id":"act84_2","type":"note","date":"2026-03-25","user":"Sistema","text":"NÃO ATENDE -  MENSAGEM ENVIADA"}]},{"id":"r85","dataEntrada":"2026-03-25","telefone":"11 94105-3645","nomeIndicado":"CARLOS PAZ","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"TATIANA NATALI DE CASTRO","orgaoPrefeitura":"SALTO","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act85_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r86","dataEntrada":"2026-03-25","telefone":"34 9960-3400","nomeIndicado":"EDSON ANTONIO DA SILVA","cpfIndicado":"446.627.696-04O","nomeQuemIndicou":"EDSON ANTONIO DA SILVA","orgaoPrefeitura":"UBERABA","produtosInteresse":["Compra de Dívida"],"documentoStatus":"Não solicitado","statusComercial":"qualificado","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act86_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟠 Qualificado"}]},{"id":"r87","dataEntrada":"2026-03-25","telefone":"11 99537-6575","nomeIndicado":"SHIRLEI","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"TATIANA NATALI DE CASTRO","orgaoPrefeitura":"SALTO","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"qualificado","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act87_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟠 Qualificado"}]},{"id":"r88","dataEntrada":"2026-03-25","telefone":"94 9224-5026","nomeIndicado":"FAGNER ROLA DA SILVA","cpfIndicado":"003.353.722-44","nomeQuemIndicou":"FAGNER ROLA DA SILVA","orgaoPrefeitura":"REDENÇÃO","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"qualificado","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-24","ultimoContato":"2026-03-24","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act88_1","type":"stage_change","date":"2026-03-24","user":"Sistema","text":"Lead importado da planilha — 🟠 Qualificado"}]},{"id":"r89","dataEntrada":"2026-03-25","telefone":"11 96328-2428","nomeIndicado":"ANA FRANCELINA DA SILVA","cpfIndicado":"307.363.808-33","nomeQuemIndicou":"ANA FRANCELINA DA SILVA","orgaoPrefeitura":"Embu das artes","produtosInteresse":["Cartão Benefício"],"documentoStatus":"Recebido","statusComercial":"qualificado","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act89_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟠 Qualificado"}]},{"id":"r90","dataEntrada":"2026-03-25","telefone":"14 99844-1572","nomeIndicado":"ELISANGELA MANTOVANO VISA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"JULIANA FERREIRA MATTOS","orgaoPrefeitura":"TUPÃ","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"qualificado","responsavelId":"","statusIndicacao":"indicacao_com_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act90_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟠 Qualificado"}]},{"id":"r91","dataEntrada":"2026-03-25","telefone":"14 99835-3473","nomeIndicado":"JANAINA CRISTINA GONCALVES","cpfIndicado":"30914896806","nomeQuemIndicou":"JANAINA CRISTINA GONCALVES","orgaoPrefeitura":"TUPÃ","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"qualificado","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act91_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟠 Qualificado"}]},{"id":"r92","dataEntrada":"2026-03-25","telefone":"44 9947-8309","nomeIndicado":"SILVIA MARIA DE AZEVEDO DOMINGOS","cpfIndicado":"035.577.109-80","nomeQuemIndicou":"SILVIA MARIA DE AZEVEDO DOMINGOS","orgaoPrefeitura":"MARINGA-PR","produtosInteresse":["Cartão Benefício"],"documentoStatus":"Não solicitado","statusComercial":"qualificado","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act92_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟠 Qualificado"}]},{"id":"r93","dataEntrada":"2026-03-25","telefone":"34 9775-6385","nomeIndicado":"THAISA CRISTINA SOUZA MARTINS","cpfIndicado":"067.073.696-10","nomeQuemIndicou":"THAISA CRISTINA SOUZA MARTINS","orgaoPrefeitura":"UBERABA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"qualificado","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act93_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟠 Qualificado"}]},{"id":"r94","dataEntrada":"2026-03-25","telefone":"94 99269-3469","nomeIndicado":"JOSE PAULO LOPES ALVES","cpfIndicado":"328.303.432-04","nomeQuemIndicou":"JOSE PAULO LOPES ALVES","orgaoPrefeitura":"REDENÇÃO","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"qualificado","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act94_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟠 Qualificado"}]},{"id":"r95","dataEntrada":"2026-03-25","telefone":"93 9115-2909","nomeIndicado":"JOSIETE DANTAS DANTAS","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act95_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r96","dataEntrada":"2026-03-25","telefone":"93 9162-1187","nomeIndicado":"JUNIOR MOTORISTA MAG COELHO","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Perdido","observacoes":"SEM INTERESSE","perfilCliente":"SEC. DA EDUCAÇÃO BASICA","secretariaAtuacao":"","activities":[{"id":"act96_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"},{"id":"act96_2","type":"note","date":"2026-03-25","user":"Sistema","text":"SEM INTERESSE"}]},{"id":"r97","dataEntrada":"2026-03-25","telefone":"93 9140-4013","nomeIndicado":"LAURA SILVA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act97_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r98","dataEntrada":"2026-03-25","telefone":"93 9104-4130","nomeIndicado":"LUCIANE PROFESSORA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act98_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r99","dataEntrada":"2026-03-25","telefone":"93 9199-5247","nomeIndicado":"MAGNO CARLOS MAGNO","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act99_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r100","dataEntrada":"2026-03-25","telefone":"93 9242-0956","nomeIndicado":"MAGNO PROF","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"NÃO ATENDE -  MENSAGEM ENVIADA","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act100_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"},{"id":"act100_2","type":"note","date":"2026-03-25","user":"Sistema","text":"NÃO ATENDE -  MENSAGEM ENVIADA"}]},{"id":"r101","dataEntrada":"2026-03-25","telefone":"93 9110-5064","nomeIndicado":"MARTA ENFERMEIRA","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act101_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r102","dataEntrada":"2026-03-25","telefone":"93 9137-7261","nomeIndicado":"MAURO POLO DUARTE","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act102_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r103","dataEntrada":"2026-03-25","telefone":"93 9100-1171","nomeIndicado":"NILDA AMOR","cpfIndicado":"CPF NÃO INFORMADO","nomeQuemIndicou":"PAULO VICTOR DOS SANTOS PINHEIRO","orgaoPrefeitura":"BELTERRA","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"novo_lead","responsavelId":"","statusIndicacao":"indicacao_sem_nome","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act103_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟡 Novo Lead"}]},{"id":"r104","dataEntrada":"2026-03-25","telefone":"11 93297-2718","nomeIndicado":"SERGIO DE OLIVEIRA CABRITO","cpfIndicado":"267.346.898-67","nomeQuemIndicou":"SERGIO DE OLIVEIRA CABRITO","orgaoPrefeitura":"EMBU DAS ARTES","produtosInteresse":[],"documentoStatus":"Não solicitado","statusComercial":"qualificado","responsavelId":"","statusIndicacao":"captacao_pos_venda","dataAtribuicao":"2026-03-25","ultimoContato":"2026-03-25","operadorRepassado":"","equipe":"","resultado":"Em andamento","observacoes":"","perfilCliente":"","secretariaAtuacao":"","activities":[{"id":"act104_1","type":"stage_change","date":"2026-03-25","user":"Sistema","text":"Lead importado da planilha — 🟠 Qualificado"}]}];

// ─── REDUCER ──────────────────────────────────────────────────────────────────

const LS_KEY = "crm_indicacoes_v1";

function loadState() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        leads: parsed.leads ?? LEADS0,
        rules: parsed.rules ?? INIT_RULES,
      };
    }
  } catch(e) {}
  return { leads: LEADS0, rules: INIT_RULES };
}

const INIT_RULES = [
  {id:"r1",name:"Pós-venda → Time pós-venda",condition:"captacao_pos_venda",action:"team:pos_venda",showIndicator:true,active:true},
  {id:"r2",name:"Indicação c/ nome → Mesa (Round-robin)",condition:"indicacao_com_nome",action:"round_robin:mesa",showIndicator:true,active:true},
  {id:"r3",name:"Indicação s/ nome → Mesa (Round-robin)",condition:"indicacao_sem_nome",action:"round_robin:mesa",showIndicator:false,active:true},
];

const { leads: savedLeads, rules: savedRules } = loadState();

const INIT = {
  leads: savedLeads, view:"dashboard", sel:null, newOpen:false, dragId:null,
  filters:{search:"",product:"",operator:"",stage:"",orgao:""},
  rules: savedRules,
};

function R(s,{type:t,...a}){
  switch(t){
    case"VIEW":  return{...s,view:a.v,sel:null};
    case"SEL":   return{...s,sel:a.id};
    case"CLOSE": return{...s,sel:null};
    case"TNEW":  return{...s,newOpen:!s.newOpen};
    case"FILT":  return{...s,filters:{...s.filters,[a.k]:a.v}};
    case"DRAG":  return{...s,dragId:a.id};
    case"MOVE":  return{...s,leads:s.leads.map(l=>l.id!==a.lid?l:{...l,statusComercial:a.st,activities:[...l.activities,{id:gid(),type:"stage_change",date:TODAY,user:"Usuário",text:`Movido para "${stg(a.st).label}"`}]})};
    case"NOTE":  return{...s,leads:s.leads.map(l=>l.id!==a.lid?l:{...l,ultimoContato:TODAY,activities:[...l.activities,a.act]})};
    case"UPD":   return{...s,leads:s.leads.map(l=>l.id!==a.lead.id?l:{...l,...a.lead})};
    case"ADD":   return{...s,newOpen:false,leads:[{...a.lead,id:gid(),activities:[{id:gid(),type:"stage_change",date:TODAY,user:"Sistema",text:"Lead criado e distribuído"}]},...s.leads]};
    case"TRULE": return{...s,rules:s.rules.map(r=>r.id!==a.id?r:{...r,active:!r.active})};
    case"SET_LEADS": return{...s,leads:a.leads};
    case"__SAVE_HOOK__": return s;
    default:     return s;
  }
}

// ─── AUTH HOOK ────────────────────────────────────────────────────────────────

function useAuth(){
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [unauthorized,setUnauthorized]=useState(false);
  const [configError,setConfigError]=useState(false);
  const [isRecovery,setIsRecovery]=useState(false);

  const loadProfile=useCallback(async(uid,email)=>{
    try {
      const emailLower = email.toLowerCase().trim();
      let {data}=await supabase.from('profiles').select('*').eq('id',uid).single();
      if(data){ setProfile(data); setAuthLoading(false); return; }
      // Use ilike for case-insensitive match — handles any capitalization in DB
      const {data:allowed}=await supabase.from('allowed_users').select('*').ilike('email',emailLower).single();
      if(allowed){
        const {data:created}=await supabase.from('profiles').insert({id:uid,email:emailLower,nome:allowed.nome,role:allowed.role}).select().single();
        setProfile(created);
      } else {
        setUnauthorized(true);
      }
    } catch(e) {
      console.error('Erro ao carregar perfil:', e);
      setConfigError(true);
    }
    setAuthLoading(false);
  },[]);

  useEffect(()=>{
    try {
      supabase.auth.getSession().then(({data:{session}})=>{
        setSession(session);
        if(session) loadProfile(session.user.id, session.user.email);
        else setAuthLoading(false);
      }).catch(e=>{
        console.error('Erro de conexão Supabase:', e);
        setConfigError(true);
        setAuthLoading(false);
      });
      const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
        if(event==='PASSWORD_RECOVERY'||event==='SIGNED_IN'&&window.location.hash.includes('type=recovery')){
          setIsRecovery(true);
          setSession(session);
          setAuthLoading(false);
          return;
        }
        setSession(session);
        if(session) loadProfile(session.user.id, session.user.email);
        else { setProfile(null); setUnauthorized(false); setAuthLoading(false); }
      });
      return ()=>subscription.unsubscribe();
    } catch(e) {
      console.error('Erro fatal Supabase:', e);
      setConfigError(true);
      setAuthLoading(false);
    }
  },[loadProfile]);

  const signOut=async()=>{ try { await supabase.auth.signOut(); } catch(e){} };

  return {session,profile,authLoading,unauthorized,signOut,configError,isRecovery};
}

// ─── ATOMS ────────────────────────────────────────────────────────────────────

function Avatar({name,size=32,color="#5B4FE8"}){
  return(
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:`${color}18`,color,border:`1.5px solid ${color}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.34,fontWeight:700,letterSpacing:"-.02em"}}>
      {inits(name)}
    </div>
  );
}

function StageTag({stageId}){
  const s=stg(stageId);
  return <span className="tag" style={{background:s.bg,color:s.color}}>{s.label}</span>;
}

function AlertDot({days}){
  if(days<3)return null;
  const c=days>=7?"var(--danger)":"var(--amber)";
  return <span className="adot" style={{width:7,height:7,background:c,marginLeft:4,flexShrink:0}} title={`${days} dias sem contato`}/>;
}

function Bar({label,val,max,color,di=0}){
  const pct=max>0?Math.round(val/max*100):0;
  return(
    <div style={{marginBottom:9}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
        <span style={{color:"var(--text-secondary)"}}>{label}</span>
        <span style={{fontWeight:600,color:"var(--text-primary)"}}>{val}</span>
      </div>
      <div className="bar-bg" style={{height:5}}>
        <div className="bar-fill" style={{"--bw":`${pct}%`,background:color,animationDelay:`${di}s`}}/>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

function Sidebar({view,dispatch,onLogout,profile}){
  const isAdmin = profile?.role === 'admin';
  const items=[
    {id:"dashboard",icon:"◈",label:"Dashboard"},
    {id:"kanban",   icon:"⊞",label:"Pipeline"},
    {id:"leads",    icon:"≡",label:"Leads"},
    {id:"attribution",icon:"⇋",label:"Atribuição"},
    ...(isAdmin ? [
      {id:"auditoria", icon:"🔍", label:"Auditoria"},
      {id:"equipe",    icon:"👥", label:"Gestão de Equipe"},
    ] : []),
  ];
  return(
    <div style={{width:228,background:"var(--bg-surface)",borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",flexShrink:0,height:"100vh",position:"sticky",top:0}}>
      <div style={{padding:"20px 18px 16px",borderBottom:"1px solid var(--border)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#5B4FE8 0%,#9B8FF5 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 4px 14px rgba(91,79,232,.3), 0 1px 0 rgba(255,255,255,.25) inset"}}>◈</div>
          <div>
            <div style={{fontFamily:"var(--font-display)",fontSize:15,fontWeight:600,color:"var(--text-primary)",letterSpacing:"-.01em"}}>CRM</div>
            <div style={{fontSize:10,fontWeight:700,color:"var(--accent)",letterSpacing:".09em",textTransform:"uppercase"}}>Indicações</div>
          </div>
        </div>
      </div>
      <nav style={{padding:"10px 8px",flex:1}}>
        <div className="eyebrow" style={{padding:"10px 8px 6px"}}>Menu</div>
        {items.map(it=>(
          <button key={it.id} className={`nav-item ${view===it.id?"active":""}`} onClick={()=>dispatch({type:"VIEW",v:it.id})}>
            <span style={{fontSize:15,width:20,textAlign:"center"}}>{it.icon}</span>{it.label}
          </button>
        ))}
      </nav>
      <div style={{padding:"13px 15px",borderTop:"1px solid var(--border)"}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <Avatar name={profile?.nome||"U"} size={30} color={profile?.role==="admin"?"#C4720A":"#5B4FE8"}/>
          <div style={{minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile?.nome||"Usuário"}</div>
            <div style={{fontSize:10,fontWeight:700,color:profile?.role==="admin"?"var(--amber)":"var(--accent)",textTransform:"uppercase",letterSpacing:".06em"}}>{profile?.role==="admin"?"Admin":"Pós-venda"}</div>
          </div>
          <div style={{marginLeft:"auto",width:7,height:7,flexShrink:0,borderRadius:"50%",background:"var(--success)",boxShadow:"0 0 5px var(--success)"}}/>
        </div>
        <button
          onClick={onLogout}
          style={{marginTop:10,width:"100%",padding:"7px 0",borderRadius:7,background:"rgba(196,66,58,.08)",border:"1px solid rgba(196,66,58,.18)",color:"var(--danger)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--font)",transition:"all .15s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(196,66,58,.14)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(196,66,58,.08)"}
        >Sair da conta</button>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function MCard({label,value,sub,accent,icon,di=0}){
  return(
    <div className="mcard fu" style={{animationDelay:`${di}s`}}>
      <div style={{position:"absolute",top:-20,right:-20,width:90,height:90,borderRadius:"50%",background:accent,filter:"blur(36px)",opacity:.18,pointerEvents:"none"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <span className="eyebrow">{label}</span>
        <div style={{width:32,height:32,borderRadius:9,background:`${accent}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,border:`1px solid ${accent}25`}}>{icon}</div>
      </div>
      <div style={{fontSize:30,fontWeight:600,fontFamily:"var(--font-display)",color:"var(--text-primary)",letterSpacing:"-.02em",lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:"var(--text-muted)",marginTop:6}}>{sub}</div>}
    </div>
  );
}

function Dashboard({leads}){
  const total=leads.length;
  const ganhos=leads.filter(l=>l.statusComercial==="ganho"||l.statusComercial==="pedido").length;
  const emNeg=leads.filter(l=>l.statusComercial==="em_negociacao").length;
  const frios=leads.filter(l=>sinceD(l.ultimoContato)>=7).length;
  const taxa=total>0?Math.round(ganhos/total*100):0;
  const byStage=STAGES.map(s=>({...s,count:leads.filter(l=>l.statusComercial===s.id).length}));
  const mxSt=Math.max(...byStage.map(s=>s.count),1);
  const byProd=PRODUCTS.map(p=>({name:p.length>19?p.slice(0,17)+"…":p,count:leads.filter(l=>l.produtosInteresse.includes(p)).length})).filter(p=>p.count>0).sort((a,b)=>b.count-a.count);
  const mxPr=Math.max(...byProd.map(p=>p.count),1);
  const byOp=OPERATORS.map(o=>({...o,count:leads.filter(l=>l.responsavelId===o.id).length}));
  const mxOp=Math.max(...byOp.map(o=>o.count),1);
  const recent=leads.flatMap(l=>l.activities.map(a=>({...a,leadName:l.nomeIndicado}))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const aIcon={stage_change:"⇄",contact:"☎",doc:"📄",note:"✎"};
  const aColor={stage_change:"var(--accent)",contact:"var(--success)",doc:"var(--amber)",note:"var(--text-muted)"};
  const aBg={stage_change:"var(--accent-dim)",contact:"var(--success-dim)",doc:"var(--amber-dim)",note:"rgba(90,70,50,.06)"};
  return(
    <div style={{padding:"28px 32px",maxWidth:1120}}>
      <div className="fu" style={{marginBottom:24}}>
        <div className="section-title">Visão Geral</div>
        <div className="section-sub">Atualizado agora · {fmtD(TODAY)}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14,marginBottom:22}}>
        <MCard label="Total de leads"  value={total}  sub="Todos os estágios"     accent="#5B4FE8" icon="◈" di={.05}/>
        <MCard label="Convertidos"     value={ganhos} sub={`${taxa}% de conversão`} accent="#1E8F5E" icon="✓" di={.1}/>
        <MCard label="Em negociação"   value={emNeg}  sub="Estágio ativo"         accent="#1A9E8A" icon="⟳" di={.15}/>
        <MCard label="Leads frios"     value={frios}  sub="Sem contato +7 dias"   accent="#C4423A" icon="❄" di={.2}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:14}}>
        {[
          {title:"Pipeline por estágio",  items:byStage.map((s,i)=>({label:s.label,val:s.count,max:mxSt,color:s.color,di:i*.04}))},
          {title:"Produtos de interesse", items:byProd.map((p,i)=>({label:p.name,val:p.count,max:mxPr,color:"var(--accent)",di:i*.04}))},
          {title:"Por operador",          items:byOp.map((o,i)=>({label:o.name,val:o.count,max:mxOp,color:o.color,di:i*.04}))},
        ].map((sec,si)=>(
          <div key={si} className="card fu" style={{padding:"18px 20px",animationDelay:`${.2+si*.06}s`}}>
            <div className="eyebrow" style={{marginBottom:14}}>{sec.title}</div>
            {sec.items.map(it=><Bar key={it.label} label={it.label} val={it.val} max={it.max} color={it.color} di={it.di}/>)}
            {sec.items.length===0&&<div style={{fontSize:12,color:"var(--text-muted)"}}>Sem dados</div>}
          </div>
        ))}
      </div>
      <div className="card fu2" style={{padding:"18px 20px"}}>
        <div className="eyebrow" style={{marginBottom:14}}>Atividade recente</div>
        {recent.map((a,i)=>(
          <div key={a.id} style={{display:"flex",gap:11,padding:"9px 0",borderBottom:i<recent.length-1?"1px solid var(--border)":"none"}}>
            <div style={{width:30,height:30,borderRadius:9,background:aBg[a.type]||aBg.note,color:aColor[a.type]||aColor.note,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{aIcon[a.type]||"✎"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>{a.leadName}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",marginTop:1}}>{a.text}</div>
            </div>
            <div style={{fontSize:11,color:"var(--text-faint)",flexShrink:0,marginTop:2}}>{fmtD(a.date)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KANBAN ───────────────────────────────────────────────────────────────────

function KCard({lead,dispatch}){
  const [menuOpen,setMenuOpen]=useState(false);
  const menuRef=useRef(null);
  const days=sinceD(lead.ultimoContato);
  const o=opr(lead.responsavelId);
  const currentStage=stg(lead.statusComercial);

  useEffect(()=>{
    if(!menuOpen) return;
    const close=(e)=>{ if(menuRef.current&&!menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown',close);
    return()=>document.removeEventListener('mousedown',close);
  },[menuOpen]);

  return(
    <div className="kcard fu" draggable onDragStart={()=>dispatch({type:"DRAG",id:lead.id})}
      onClick={e=>{ if(!menuOpen) dispatch({type:"SEL",id:lead.id}); }}
      style={{position:"relative", zIndex:menuOpen?50:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
        <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)",lineHeight:1.3,flex:1,minWidth:0,paddingRight:6}}>{lead.nomeIndicado}</div>
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
          <AlertDot days={days}/>
          {/* 3-dot menu */}
          <div ref={menuRef} style={{position:"relative"}}>
            <button
              onClick={e=>{e.stopPropagation();setMenuOpen(v=>!v);}}
              style={{
                background:"none",border:"none",cursor:"pointer",padding:"2px 4px",
                borderRadius:5,color:"var(--text-muted)",fontSize:16,lineHeight:1,
                display:"flex",alignItems:"center",justifyContent:"center",
                transition:"background .15s",
              }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(90,70,50,.1)"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}
              title="Mover para estágio"
            >⋮</button>
            {menuOpen&&(
              <div onClick={e=>e.stopPropagation()} style={{
                position:"absolute",top:"100%",right:0,zIndex:999,
                background:"var(--bg-elevated)",border:"1px solid var(--border-mid)",
                borderRadius:10,boxShadow:"0 8px 32px rgba(60,40,20,0.18)",
                minWidth:180,overflow:"hidden",marginTop:4,
                animation:"fadeUp .15s cubic-bezier(.4,0,.2,1)",
              }}>
                <div style={{padding:"8px 12px 6px",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em",borderBottom:"1px solid var(--border)"}}>
                  Mover para estágio
                </div>
                {STAGES.map(s=>{
                  const isCurrent=s.id===lead.statusComercial;
                  return(
                    <button key={s.id}
                      onClick={e=>{
                        e.stopPropagation();
                        if(!isCurrent) dispatch({type:"MOVE",lid:lead.id,st:s.id});
                        setMenuOpen(false);
                      }}
                      style={{
                        width:"100%",display:"flex",alignItems:"center",gap:9,
                        padding:"9px 12px",background:isCurrent?"rgba(90,70,50,.06)":"none",
                        border:"none",cursor:isCurrent?"default":"pointer",
                        fontFamily:"var(--font)",fontSize:12,fontWeight:isCurrent?600:400,
                        color:isCurrent?s.color:"var(--text-primary)",
                        textAlign:"left",transition:"background .12s",
                      }}
                      onMouseEnter={e=>{ if(!isCurrent) e.currentTarget.style.background="rgba(90,70,50,.06)"; }}
                      onMouseLeave={e=>{ if(!isCurrent) e.currentTarget.style.background="none"; }}
                    >
                      <div style={{width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                      {s.label}
                      {isCurrent&&<span style={{marginLeft:"auto",fontSize:10,color:s.color}}>✓ atual</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:8}}>{lead.orgaoPrefeitura}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
        {lead.produtosInteresse.slice(0,2).map(p=><span key={p} className="prod-pill" style={{fontSize:10,padding:"2px 7px"}}>{p.split(" ").slice(0,2).join(" ")}</span>)}
        {lead.produtosInteresse.length>2&&<span style={{fontSize:10,color:"var(--text-muted)",alignSelf:"center"}}>+{lead.produtosInteresse.length-2}</span>}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        {o&&<div style={{display:"flex",alignItems:"center",gap:5}}><Avatar name={o.name} size={18} color={o.color}/><span style={{fontSize:10,color:"var(--text-muted)",fontWeight:500}}>{o.name}</span></div>}
        {!o&&<div/>}
        <span style={{fontSize:10,fontWeight:600,color:lead.documentoStatus==="Aprovado"?"var(--success)":lead.documentoStatus==="Não solicitado"?"var(--text-faint)":"var(--amber)"}}>📄 {lead.documentoStatus}</span>
      </div>
    </div>
  );
}

function Kanban({leads,dispatch,dragId}){
  return(
    <div style={{padding:"28px 32px",overflowX:"auto"}}>
      <div className="fu" style={{marginBottom:20}}>
        <div className="section-title">Pipeline</div>
        <div className="section-sub">Arraste os cards para mover entre estágios</div>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"flex-start",minWidth:"max-content",paddingBottom:16}}>
        {STAGES.map((s,si)=>{
          const sl=leads.filter(l=>l.statusComercial===s.id);
          const [over,setOver]=useState(false);
          return(
            <div key={s.id} className={`kcol ${over?"dover":""}`} style={{animationDelay:`${si*.04}s`}}
              onDragOver={e=>{e.preventDefault();setOver(true)}} onDragLeave={()=>setOver(false)}
              onDrop={()=>{setOver(false);if(dragId)dispatch({type:"MOVE",lid:dragId,st:s.id});dispatch({type:"DRAG",id:null});}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:11,padding:"0 3px"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:s.color,boxShadow:`0 0 5px ${s.color}60`,flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:600,color:"var(--text-secondary)",flex:1}}>{s.label}</span>
                <span style={{fontSize:11,fontWeight:700,background:s.bg,color:s.color,borderRadius:99,padding:"1px 6px"}}>{sl.length}</span>
              </div>
              <div style={{minHeight:44}}>
                {sl.map(l=><KCard key={l.id} lead={l} dispatch={dispatch}/>)}
                {sl.length===0&&<div style={{textAlign:"center",padding:"18px 0",fontSize:11,color:"var(--text-faint)",letterSpacing:".04em"}}>Solte aqui</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LEADS TABLE ──────────────────────────────────────────────────────────────

const PER_PAGE = 100;

function LeadsTable({leads,dispatch,filters}){
  const [page,setPage]=useState(1);

  // Build unique orgão list for filter
  const orgaos=useMemo(()=>{
    const s=new Set(leads.map(l=>l.orgaoPrefeitura).filter(Boolean));
    return [...s].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  },[leads]);

  const flt=useMemo(()=>{
    const s=filters.search.toLowerCase();
    return leads.filter(l=>{
      if(s&&!l.nomeIndicado.toLowerCase().includes(s)&&!l.cpfIndicado.includes(s)&&!l.orgaoPrefeitura.toLowerCase().includes(s))return false;
      if(filters.product&&!l.produtosInteresse.includes(filters.product))return false;
      if(filters.operator&&l.responsavelId!==filters.operator)return false;
      if(filters.stage&&l.statusComercial!==filters.stage)return false;
      if(filters.orgao&&l.orgaoPrefeitura!==filters.orgao)return false;
      return true;
    });
  },[leads,filters]);

  // Reset to page 1 whenever filters change
  const prevFilters=useRef(filters);
  useEffect(()=>{
    if(JSON.stringify(prevFilters.current)!==JSON.stringify(filters)){
      setPage(1);
      prevFilters.current=filters;
    }
  },[filters]);

  const totalPages=Math.max(1,Math.ceil(flt.length/PER_PAGE));
  const paginated=flt.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const TH=({c})=><th style={{padding:"11px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em",whiteSpace:"nowrap"}}>{c}</th>;

  return(
    <div style={{padding:"28px 32px"}}>
      <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
        <div>
          <div className="section-title">Leads</div>
          <div className="section-sub">
            {flt.length} de {leads.length} registros
            {totalPages>1&&` · Página ${page} de ${totalPages}`}
          </div>
        </div>
        <button className="btn btn-primary" onClick={()=>dispatch({type:"TNEW"})}><span style={{fontSize:16,lineHeight:1}}>+</span> Novo Lead</button>
      </div>

      {/* Filters row */}
      <div className="fu1" style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input className="inp" placeholder="Buscar por nome, CPF ou órgão…" value={filters.search} onChange={e=>dispatch({type:"FILT",k:"search",v:e.target.value})}/>
        </div>
        {[
          {k:"product", ph:"Todos produtos",   opts:PRODUCTS.map(p=>({v:p,l:p}))},
          {k:"operator",ph:"Todos operadores", opts:OPERATORS.map(o=>({v:o.id,l:o.name}))},
          {k:"stage",   ph:"Todos estágios",   opts:STAGES.map(s=>({v:s.id,l:s.label}))},
        ].map(f=>(
          <select key={f.k} className="sel" style={{width:168}} value={filters[f.k]} onChange={e=>dispatch({type:"FILT",k:f.k,v:e.target.value})}>
            <option value="">{f.ph}</option>
            {f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ))}
        {/* Órgão/Prefeitura filter */}
        <select className="sel" style={{width:200}} value={filters.orgao||""} onChange={e=>dispatch({type:"FILT",k:"orgao",v:e.target.value})}>
          <option value="">Todos órgãos / prefeituras</option>
          {orgaos.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
        {/* Clear filters button */}
        {(filters.search||filters.product||filters.operator||filters.stage||filters.orgao)&&(
          <button className="btn btn-ghost" style={{fontSize:12,padding:"7px 12px"}}
            onClick={()=>{ ['search','product','operator','stage','orgao'].forEach(k=>dispatch({type:"FILT",k,v:""})); }}>
            ✕ Limpar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="fu2 card" style={{overflow:"hidden",marginBottom:16}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:"rgba(90,70,50,.04)",borderBottom:"1px solid var(--border)"}}>
                <TH c="Nome / CPF"/><TH c="Órgão / Prefeitura"/><TH c="Produtos"/><TH c="Estágio"/><TH c="Operador"/><TH c="Último contato"/><TH c="Documento"/><TH c=""/>
              </tr>
            </thead>
            <tbody>
              {paginated.map(l=>{
                const o=opr(l.responsavelId);
                const days=sinceD(l.ultimoContato);
                return(
                  <tr key={l.id} className="trow" onClick={()=>dispatch({type:"SEL",id:l.id})}>
                    <td style={{padding:"12px 14px"}}><div style={{fontWeight:600}}>{l.nomeIndicado}</div><div style={{fontSize:11,color:"var(--text-muted)",marginTop:1}}>{l.cpfIndicado}</div></td>
                    <td style={{padding:"12px 14px",color:"var(--text-secondary)",fontSize:12}}>{l.orgaoPrefeitura}</td>
                    <td style={{padding:"12px 14px"}}><div style={{display:"flex",flexWrap:"wrap",gap:3}}>{l.produtosInteresse.slice(0,2).map(p=><span key={p} className="prod-pill" style={{fontSize:10,padding:"2px 7px"}}>{p.split(" ").slice(0,2).join(" ")}</span>)}{l.produtosInteresse.length>2&&<span style={{fontSize:10,color:"var(--text-muted)"}}>+{l.produtosInteresse.length-2}</span>}</div></td>
                    <td style={{padding:"12px 14px"}}><StageTag stageId={l.statusComercial}/></td>
                    <td style={{padding:"12px 14px"}}>{o&&<div style={{display:"flex",alignItems:"center",gap:6}}><Avatar name={o.name} size={24} color={o.color}/><span style={{fontSize:12,color:"var(--text-secondary)",fontWeight:500}}>{o.name}</span></div>}{!o&&l.responsavelId&&<span style={{fontSize:12,color:"var(--text-secondary)"}}>{l.responsavelId}</span>}</td>
                    <td style={{padding:"12px 14px"}}><div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:12,color:days>=7?"var(--danger)":days>=3?"var(--amber)":"var(--text-secondary)"}}>{fmtD(l.ultimoContato)}</span><AlertDot days={days}/></div></td>
                    <td style={{padding:"12px 14px"}}><span style={{fontSize:11,fontWeight:600,color:l.documentoStatus==="Aprovado"?"var(--success)":l.documentoStatus==="Não solicitado"?"var(--text-faint)":"var(--amber)"}}>{l.documentoStatus}</span></td>
                    <td style={{padding:"12px 14px",color:"var(--text-muted)",fontSize:16}}>›</td>
                  </tr>
                );
              })}
              {paginated.length===0&&<tr><td colSpan={8} style={{padding:"40px 0",textAlign:"center",color:"var(--text-muted)",fontSize:13}}>Nenhum lead encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages>1&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setPage(1)} disabled={page===1}>«</button>
          <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹ Anterior</button>
          <div style={{display:"flex",gap:4}}>
            {Array.from({length:totalPages},(_,i)=>i+1)
              .filter(p=>p===1||p===totalPages||Math.abs(p-page)<=2)
              .reduce((acc,p,i,arr)=>{
                if(i>0&&p-arr[i-1]>1) acc.push('…');
                acc.push(p);
                return acc;
              },[])
              .map((p,i)=>
                p==='…'
                  ?<span key={`e${i}`} style={{padding:"6px 4px",fontSize:12,color:"var(--text-muted)"}}>…</span>
                  :<button key={p} onClick={()=>setPage(p)}
                    style={{
                      width:32,height:32,borderRadius:8,border:"none",cursor:"pointer",
                      fontSize:12,fontWeight:p===page?600:400,
                      background:p===page?"var(--accent)":"transparent",
                      color:p===page?"#fff":"var(--text-secondary)",
                      transition:"all .15s",
                    }}>{p}</button>
              )
            }
          </div>
          <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Próxima ›</button>
          <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setPage(totalPages)} disabled={page===totalPages}>»</button>
        </div>
      )}
    </div>
  );
}

// ─── DETAIL PANEL ─────────────────────────────────────────────────────────────

function Detail({lead,dispatch}){
  const [tab,setTab]=useState("info");
  const [note,setNote]=useState("");
  const [es,setEs]=useState(lead.statusComercial);
  const [ed,setEd]=useState(lead.documentoStatus);
  const [eq,setEq]=useState(lead.equipe||"");
  const [or,setOr]=useState(lead.operadorRepassado||"");
  const o=opr(lead.responsavelId);
  const days=sinceD(lead.ultimoContato);
  const save=()=>{
    const updated={...lead,documentoStatus:ed,equipe:eq,operadorRepassado:or};
    if(es!==lead.statusComercial)dispatch({type:"MOVE",lid:lead.id,st:es});
    dispatch({type:"UPD",lead:updated});
  };
  const AS={stage_change:{ic:"⇄",bg:"var(--accent-dim)",cl:"var(--accent)"},contact:{ic:"☎",bg:"var(--success-dim)",cl:"var(--success)"},doc:{ic:"📄",bg:"var(--amber-dim)",cl:"var(--amber)"},note:{ic:"✎",bg:"rgba(90,70,50,.07)",cl:"var(--text-muted)"}};
  return(
    <div className="spanel">
      <div style={{padding:"18px 22px 14px",borderBottom:"1px solid var(--border)",background:"var(--bg-card)"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
          <Avatar name={lead.nomeIndicado} size={44} color="#5B4FE8"/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{fontSize:16,fontWeight:600,color:"var(--text-primary)",fontFamily:"var(--font-display)",letterSpacing:"-.01em"}}>{lead.nomeIndicado}</div>
              <AlertDot days={days}/>
            </div>
            <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{lead.orgaoPrefeitura} · {lead.cpfIndicado}</div>
            <div style={{marginTop:8}}><StageTag stageId={lead.statusComercial}/></div>
          </div>
          <button onClick={()=>dispatch({type:"CLOSE"})} style={{background:"rgba(90,70,50,.08)",border:"1px solid var(--border-mid)",borderRadius:8,color:"var(--text-secondary)",cursor:"pointer",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>×</button>
        </div>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid var(--border)",background:"var(--bg-card)"}}>
        {[["info","Informações"],["activity","Atividades"],["docs","Documentos"]].map(([id,lb])=>(
          <button key={id} className={`ptab ${tab===id?"on":""}`} onClick={()=>setTab(id)}>{lb}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
        {tab==="info"&&(
          <div>
            <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",marginBottom:16}}>
              {[["Telefone",lead.telefone||"—"],["Quem indicou",lead.nomeQuemIndicou||<em style={{color:"var(--text-faint)"}}>Não informado</em>],["Tipo indicação",INDICATION_TYPES.find(t=>t.id===lead.statusIndicacao)?.label||"—"],["Perfil",lead.perfilCliente||"—"],["Secretaria",lead.secretariaAtuacao||"—"],["Equipe",lead.equipe||<em style={{color:"var(--text-faint)"}}>Não definida</em>],["Op. Repassado",lead.operadorRepassado||<em style={{color:"var(--text-faint)"}}>Não definido</em>],["Data entrada",fmtD(lead.dataEntrada)],["Atribuído em",fmtD(lead.dataAtribuicao)],["Último contato",fmtD(lead.ultimoContato)]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 12px",borderBottom:"1px solid var(--border)"}}>
                  <span style={{fontSize:12,color:"var(--text-muted)"}}>{k}</span>
                  <span style={{fontSize:12,color:"var(--text-primary)",fontWeight:500,textAlign:"right",maxWidth:"58%"}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{marginBottom:14}}><div className="eyebrow" style={{marginBottom:8}}>Produtos de interesse</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{lead.produtosInteresse.map(p=><span key={p} className="prod-pill">{p}</span>)}</div></div>
            {o&&<div style={{padding:"11px 13px",background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:10,display:"flex",alignItems:"center",gap:10,marginBottom:14}}><Avatar name={o.name} size={34} color={o.color}/><div><div style={{fontSize:13,fontWeight:600}}>{o.name}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>{o.team==="mesa"?"Mesa comercial":"Time pós-venda"}</div></div></div>}
            {lead.observacoes&&<div style={{padding:"10px 12px",background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:8,fontSize:12,color:"var(--text-secondary)",lineHeight:1.6,marginBottom:14}}>{lead.observacoes}</div>}
            <div style={{borderTop:"1px solid var(--border)",paddingTop:16}}>
              <div className="eyebrow" style={{marginBottom:10}}>Edição rápida</div>
              <label style={{fontSize:12,color:"var(--text-muted)",display:"block",marginBottom:5}}>Estágio</label>
              <select className="sel" value={es} onChange={e=>setEs(e.target.value)} style={{marginBottom:10}}>{STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
              <label style={{fontSize:12,color:"var(--text-muted)",display:"block",marginBottom:5}}>Documento</label>
              <select className="sel" value={ed} onChange={e=>setEd(e.target.value)} style={{marginBottom:10}}>{DOC_STATUS.map(s=><option key={s} value={s}>{s}</option>)}</select>
              <label style={{fontSize:12,color:"var(--text-muted)",display:"block",marginBottom:5}}>Equipe</label>
              <select className="sel" value={eq} onChange={e=>setEq(e.target.value)} style={{marginBottom:10}}>
                <option value="">— Selecionar equipe —</option>
                {EQUIPES.map(e=><option key={e} value={e}>{e}</option>)}
              </select>
              <label style={{fontSize:12,color:"var(--text-muted)",display:"block",marginBottom:5}}>Operador Repassado</label>
              <select className="sel" value={or} onChange={e=>setOr(e.target.value)} style={{marginBottom:12}}>
                <option value="">— Selecionar operador —</option>
                {OPERADORES_REPASSADOS.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
              <button className="btn btn-primary" style={{width:"100%"}} onClick={save}>Salvar alterações</button>
            </div>
          </div>
        )}
        {tab==="activity"&&(
          <div>
            <div style={{marginBottom:16}}>
              <textarea className="inp" value={note} onChange={e=>setNote(e.target.value)} placeholder="Registrar ligação, reunião, observação…" style={{resize:"vertical",minHeight:70,fontFamily:"var(--font)",lineHeight:1.5,marginBottom:8}}/>
              <button className="btn btn-primary" style={{width:"100%"}} onClick={()=>{if(!note.trim())return;dispatch({type:"NOTE",lid:lead.id,act:{id:gid(),type:"note",date:TODAY,user:"Usuário",text:note.trim()}});setNote("");}}>+ Registrar atividade</button>
            </div>
            {[...lead.activities].reverse().map((a,i)=>{const s=AS[a.type]||AS.note;return(
              <div key={a.id} style={{display:"flex",gap:10}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <div style={{width:30,height:30,borderRadius:9,background:s.bg,color:s.cl,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{s.ic}</div>
                  {i<lead.activities.length-1&&<div className="activity-line"/>}
                </div>
                <div style={{flex:1,paddingBottom:13}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:12,fontWeight:600}}>{a.user}</span><span style={{fontSize:11,color:"var(--text-faint)"}}>{fmtD(a.date)}</span></div>
                  <div style={{fontSize:12,color:"var(--text-secondary)",lineHeight:1.5}}>{a.text}</div>
                </div>
              </div>
            );})}
          </div>
        )}
        {tab==="docs"&&(
          <div>
            <div style={{marginBottom:18}}>
              <div className="eyebrow" style={{marginBottom:12}}>Progresso</div>
              <div style={{display:"flex"}}>{DOC_STATUS.map((s,i)=>{const idx=DOC_STATUS.indexOf(lead.documentoStatus);const done=i<=idx;return(<div key={s} style={{flex:1,textAlign:"center"}}><div style={{height:4,background:done?"var(--success)":"rgba(90,70,50,.12)",transition:"background .4s",borderRadius:i===0?"3px 0 0 3px":i===4?"0 3px 3px 0":0}}/><div style={{fontSize:9,fontWeight:700,marginTop:5,color:done?"var(--success)":"var(--text-faint)",letterSpacing:".03em"}}>{s.split(" ").join("\n")}</div></div>);})}</div>
            </div>
            <div style={{background:"var(--bg-surface)",border:"1px dashed var(--border-mid)",borderRadius:12,padding:"26px 16px",textAlign:"center",marginBottom:14}}><div style={{fontSize:26,marginBottom:8}}>📁</div><div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Upload de documentos</div><div style={{fontSize:12,color:"var(--text-muted)"}}>Disponível após integração com backend</div></div>
            <div className="eyebrow" style={{marginBottom:10}}>Documentos esperados</div>
            {["RG ou CNH","Comprovante de renda","Comprovante de endereço","Contracheque","Margem consignável"].map(doc=>(
              <div key={doc} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid var(--border)"}}>
                <div style={{width:28,height:28,borderRadius:7,background:"var(--amber-dim)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>📄</div>
                <span style={{fontSize:13,flex:1}}>{doc}</span>
                <span style={{fontSize:11,fontWeight:600,color:"var(--text-muted)"}}>Pendente</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NEW LEAD MODAL ───────────────────────────────────────────────────────────

function NewLead({dispatch}){
  const blank={nomeIndicado:"",cpfIndicado:"",telefone:"",nomeQuemIndicou:"",orgaoPrefeitura:"",statusIndicacao:"indicacao_com_nome",produtosInteresse:[],responsavelId:"beatriz",perfilCliente:"",secretariaAtuacao:"",observacoes:"",documentoStatus:"Não solicitado",statusComercial:"distribuido",equipe:"",resultado:"Em andamento",dataEntrada:TODAY,dataAtribuicao:TODAY,ultimoContato:TODAY,operadorRepassado:""};
  const [form,setForm]=useState(blank);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const tp=p=>set("produtosInteresse",form.produtosInteresse.includes(p)?form.produtosInteresse.filter(x=>x!==p):[...form.produtosInteresse,p]);
  const Field=({label,children})=>(<div><label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>{label}</label>{children}</div>);
  return(
    <div className="mbk" onClick={e=>{if(e.target===e.currentTarget)dispatch({type:"TNEW"})}}>
      <div className="mbox">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22}}>
          <div><div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:600,color:"var(--text-primary)",letterSpacing:"-.02em"}}>Novo Lead</div><div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>Preencha os dados do indicado</div></div>
          <button onClick={()=>dispatch({type:"TNEW"})} style={{background:"rgba(90,70,50,.08)",border:"1px solid var(--border-mid)",borderRadius:9,color:"var(--text-secondary)",cursor:"pointer",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>×</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:11}}>
          <Field label="Nome do indicado *"><input className="inp" value={form.nomeIndicado} onChange={e=>set("nomeIndicado",e.target.value)} placeholder="Nome completo"/></Field>
          <Field label="CPF do indicado *"><input className="inp" value={form.cpfIndicado} onChange={e=>set("cpfIndicado",e.target.value)} placeholder="000.000.000-00"/></Field>
          <Field label="Telefone"><input className="inp" value={form.telefone} onChange={e=>set("telefone",e.target.value)} placeholder="(00) 00000-0000"/></Field>
          <Field label="Órgão / Prefeitura"><input className="inp" value={form.orgaoPrefeitura} onChange={e=>set("orgaoPrefeitura",e.target.value)} placeholder="Prefeitura de…"/></Field>
        </div>
        <div style={{marginBottom:11}}><Field label="Tipo de indicação"><select className="sel" value={form.statusIndicacao} onChange={e=>set("statusIndicacao",e.target.value)}>{INDICATION_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></Field></div>
        {form.statusIndicacao!=="indicacao_sem_nome"&&<div style={{marginBottom:11}}><Field label="Nome de quem indicou"><input className="inp" value={form.nomeQuemIndicou} onChange={e=>set("nomeQuemIndicou",e.target.value)} placeholder="Nome do indicador"/></Field></div>}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>Produtos de interesse</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {PRODUCTS.map(p=>{const sel=form.produtosInteresse.includes(p);return(<button key={p} onClick={()=>tp(p)} style={{padding:"5px 11px",borderRadius:99,fontSize:12,fontWeight:600,cursor:"pointer",background:sel?"var(--accent-dim)":"rgba(90,70,50,.07)",color:sel?"var(--accent)":"var(--text-muted)",border:sel?"1px solid rgba(91,79,232,.25)":"1px solid var(--border)",transition:"all .15s"}}>{p}</button>);})}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:11}}>
          <Field label="Operador responsável"><select className="sel" value={form.responsavelId} onChange={e=>set("responsavelId",e.target.value)}>{OPERATORS.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
          <Field label="Perfil do cliente"><input className="inp" value={form.perfilCliente} onChange={e=>set("perfilCliente",e.target.value)} placeholder="Ex: Servidor público"/></Field>
          <Field label="Secretaria de atuação"><input className="inp" value={form.secretariaAtuacao} onChange={e=>set("secretariaAtuacao",e.target.value)} placeholder="Sec. de…"/></Field>
        </div>
        <div style={{marginBottom:20}}><Field label="Observações"><textarea className="inp" value={form.observacoes} onChange={e=>set("observacoes",e.target.value)} style={{resize:"vertical",minHeight:64,fontFamily:"var(--font)",lineHeight:1.5}} placeholder="Detalhes relevantes…"/></Field></div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button className="btn btn-ghost" onClick={()=>dispatch({type:"TNEW"})}>Cancelar</button>
          <button className="btn btn-primary" onClick={()=>{if(!form.nomeIndicado.trim()||!form.cpfIndicado.trim()){alert("Nome e CPF são obrigatórios.");return;}dispatch({type:"ADD",lead:form});}}>Salvar lead</button>
        </div>
      </div>
    </div>
  );
}

// ─── ATTRIBUTION ──────────────────────────────────────────────────────────────

function Attribution({rules,dispatch}){
  return(
    <div style={{padding:"28px 32px",maxWidth:760}}>
      <div className="fu" style={{marginBottom:24}}><div className="section-title">Motor de Atribuição</div><div className="section-sub">Regras que determinam para qual operador/time um lead é direcionado</div></div>
      <div style={{marginBottom:22}}>
        {rules.map((r,i)=>(
          <div key={r.id} className="card fu" style={{padding:"15px 18px",marginBottom:10,opacity:r.active?1:.45,animationDelay:`${i*.07}s`}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:r.active?"var(--success)":"var(--text-faint)",flexShrink:0,boxShadow:r.active?"0 0 6px var(--success)":undefined}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:7}}>{r.name}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  <span className="tag" style={{background:"rgba(90,70,50,.07)",color:"var(--text-secondary)",fontSize:11}}>SE: {INDICATION_TYPES.find(t=>t.id===r.condition)?.label}</span>
                  <span style={{fontSize:11,color:"var(--text-muted)"}}>→</span>
                  <span className="tag" style={{background:"var(--accent-dim)",color:"var(--accent)",fontSize:11}}>{r.action.replace("team:","Time: ").replace("round_robin:","Round-robin: ")}</span>
                  <span className="tag" style={{background:r.showIndicator?"var(--success-dim)":"var(--amber-dim)",color:r.showIndicator?"var(--success)":"var(--amber)",fontSize:11}}>{r.showIndicator?"Exibe indicador":"Oculta indicador"}</span>
                </div>
              </div>
              <button className="btn btn-ghost" style={{fontSize:12,padding:"6px 12px"}} onClick={()=>dispatch({type:"TRULE",id:r.id})}>{r.active?"Desativar":"Ativar"}</button>
            </div>
          </div>
        ))}
      </div>
      <div className="card fu1" style={{padding:"18px 20px",marginBottom:14}}>
        <div className="eyebrow" style={{marginBottom:12}}>Fluxo de distribuição</div>
        <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:0,rowGap:8}}>
          {["Lead entra","Regra aplicada","Operador selecionado","Lead atribuído"].map((s,i)=>(
            <div key={s} style={{display:"flex",alignItems:"center"}}>
              <div style={{padding:"7px 12px",borderRadius:8,fontSize:12,fontWeight:600,background:"rgba(90,70,50,.06)",border:"1px solid var(--border)"}}>{s}</div>
              {i<3&&<div style={{fontSize:12,color:"var(--text-faint)",margin:"0 5px"}}>→</div>}
            </div>
          ))}
        </div>
        <div style={{marginTop:11,fontSize:12,color:"var(--text-muted)",lineHeight:1.7}}>Leads da mesa comercial alternam automaticamente entre Nair e Maicon. O sistema garante distribuição equilibrada.</div>
      </div>
      <div className="card fu2" style={{padding:"18px 20px"}}>
        <div className="eyebrow" style={{marginBottom:12}}>Operadores e times</div>
        {OPERATORS.map(o=>(
          <div key={o.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
            <Avatar name={o.name} size={36} color={o.color}/>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{o.name}</div><div style={{fontSize:11,color:"var(--text-muted)"}}>{o.team==="mesa"?"Mesa comercial":"Time pós-venda"}</div></div>
            <span className="tag" style={{background:`${o.color}15`,color:o.color,fontSize:11}}>{o.team==="mesa"?"Mesa":"Pós-venda"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

function Login(){
  const [email,setEmail]=useState('');
  const [pass,setPass]=useState('');
  const [showPass,setShowPass]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [shaking,setShaking]=useState(false);

  const attempt=async()=>{
    if(!email.trim()||!pass){setError('Preencha e-mail e senha.');return;}
    setLoading(true);setError('');
    const {error:err}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password:pass});
    setLoading(false);
    if(err){
      setError('E-mail ou senha incorretos.');
      setShaking(true);setTimeout(()=>setShaking(false),500);
    }
  };

  return(
    <div style={{minHeight:"100vh",background:"var(--bg-base)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font)",padding:16}}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}.shake{animation:shake .45s both;}`}</style>
      <div style={{position:"fixed",top:-100,right:-100,width:400,height:400,borderRadius:"50%",background:"rgba(91,79,232,0.07)",filter:"blur(80px)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:-80,left:-80,width:320,height:320,borderRadius:"50%",background:"rgba(26,158,138,0.07)",filter:"blur(60px)",pointerEvents:"none"}}/>
      <div className={shaking?"shake":""} style={{background:"var(--bg-elevated)",borderRadius:"var(--radius-xl)",border:"1px solid var(--border-mid)",boxShadow:"0 8px 48px rgba(60,40,20,0.14), 0 1px 0 rgba(255,255,255,0.8) inset",width:"100%",maxWidth:400,padding:"40px 36px",animation:"fadeUp .4s cubic-bezier(.4,0,.2,1) both"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:32}}>
          <div style={{width:44,height:44,borderRadius:13,background:"linear-gradient(135deg,#5B4FE8 0%,#9B8FF5 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 4px 16px rgba(91,79,232,.35)"}}>◈</div>
          <div>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,color:"var(--text-primary)"}}>Starbank</div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--accent)",letterSpacing:".09em",textTransform:"uppercase"}}>CRM Indicações</div>
          </div>
        </div>
        <div style={{marginBottom:24}}>
          <div style={{fontSize:22,fontWeight:600,fontFamily:"var(--font-display)",color:"var(--text-primary)",letterSpacing:"-.02em",marginBottom:4}}>Bem-vindo de volta</div>
          <div style={{fontSize:13,color:"var(--text-muted)"}}>Acesso restrito à equipe Starbank</div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>E-mail</label>
          <input className="inp" type="email" value={email} onChange={e=>{setEmail(e.target.value);setError('');}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="seu@email.com" autoComplete="email"/>
        </div>
        <div style={{marginBottom:error?10:24}}>
          <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>Senha</label>
          <div style={{position:"relative"}}>
            <input className="inp" type={showPass?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);setError('');}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="••••••••" autoComplete="current-password" style={{paddingRight:44}}/>
            <button onClick={()=>setShowPass(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"var(--text-muted)",padding:4,lineHeight:1}}>{showPass?"🙈":"👁"}</button>
          </div>
        </div>
        {error&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,marginBottom:16,background:"var(--danger-dim)",border:"1px solid rgba(196,66,58,.2)",fontSize:12,fontWeight:500,color:"var(--danger)"}}><span>⚠</span>{error}</div>}
        <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",padding:"11px 0",fontSize:14}} onClick={attempt} disabled={loading}>
          {loading?"Entrando…":"Entrar no sistema"}
        </button>
        <div style={{marginTop:20,padding:"12px 14px",background:"rgba(90,70,50,.05)",borderRadius:10,border:"1px solid var(--border)"}}>
          <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.7}}>🔒 Acesso por convite.<br/>Não tem conta? Fale com um administrador.</div>
        </div>
      </div>
    </div>
  );
}

// ─── RESET DE SENHA ───────────────────────────────────────────────────────────

function ResetPassword(){
  const [pass,setPass]=useState('');
  const [confirm,setConfirm]=useState('');
  const [showPass,setShowPass]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [done,setDone]=useState(false);

  const submit=async()=>{
    if(!pass||pass.length<6){setError('A senha deve ter pelo menos 6 caracteres.');return;}
    if(pass!==confirm){setError('As senhas não coincidem.');return;}
    setLoading(true);setError('');
    const {error:err}=await supabase.auth.updateUser({password:pass});
    setLoading(false);
    if(err){setError('Erro ao definir senha. Tente novamente.');return;}
    setDone(true);
    setTimeout(()=>window.location.href='/',1800);
  };

  return(
    <div style={{minHeight:"100vh",background:"var(--bg-base)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font)",padding:16}}>
      <div style={{position:"fixed",top:-100,right:-100,width:400,height:400,borderRadius:"50%",background:"rgba(91,79,232,0.07)",filter:"blur(80px)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:-80,left:-80,width:320,height:320,borderRadius:"50%",background:"rgba(26,158,138,0.07)",filter:"blur(60px)",pointerEvents:"none"}}/>
      <div style={{background:"var(--bg-elevated)",borderRadius:"var(--radius-xl)",border:"1px solid var(--border-mid)",boxShadow:"0 8px 48px rgba(60,40,20,0.14), 0 1px 0 rgba(255,255,255,0.8) inset",width:"100%",maxWidth:400,padding:"40px 36px",animation:"fadeUp .4s cubic-bezier(.4,0,.2,1) both"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:32}}>
          <div style={{width:44,height:44,borderRadius:13,background:"linear-gradient(135deg,#5B4FE8 0%,#9B8FF5 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 4px 16px rgba(91,79,232,.35)"}}>◈</div>
          <div>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,color:"var(--text-primary)"}}>Starbank</div>
            <div style={{fontSize:11,fontWeight:700,color:"var(--accent)",letterSpacing:".09em",textTransform:"uppercase"}}>CRM Indicações</div>
          </div>
        </div>

        {done?(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:40,marginBottom:12}}>✅</div>
            <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>Senha definida!</div>
            <div style={{fontSize:13,color:"var(--text-muted)"}}>Redirecionando para o login…</div>
          </div>
        ):(
          <>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:22,fontWeight:600,fontFamily:"var(--font-display)",color:"var(--text-primary)",letterSpacing:"-.02em",marginBottom:4}}>Definir sua senha</div>
              <div style={{fontSize:13,color:"var(--text-muted)"}}>Crie uma senha para acessar o sistema</div>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>Nova senha</label>
              <div style={{position:"relative"}}>
                <input className="inp" type={showPass?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);setError('');}} placeholder="Mínimo 6 caracteres" style={{paddingRight:44}}/>
                <button onClick={()=>setShowPass(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"var(--text-muted)",padding:4,lineHeight:1}}>{showPass?"🙈":"👁"}</button>
              </div>
            </div>

            <div style={{marginBottom:error?10:24}}>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>Confirmar senha</label>
              <input className="inp" type={showPass?"text":"password"} value={confirm} onChange={e=>{setConfirm(e.target.value);setError('');}} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Repita a senha"/>
            </div>

            {error&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,marginBottom:16,background:"var(--danger-dim)",border:"1px solid rgba(196,66,58,.2)",fontSize:12,fontWeight:500,color:"var(--danger)"}}><span>⚠</span>{error}</div>}

            <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",padding:"11px 0",fontSize:14}} onClick={submit} disabled={loading}>
              {loading?"Salvando…":"Salvar senha e entrar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Unauthorized({onLogout}){
  return(
    <div style={{minHeight:"100vh",background:"var(--bg-base)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font)"}}>
      <div style={{textAlign:"center",padding:32}}>
        <div style={{fontSize:40,marginBottom:16}}>🚫</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>Acesso não autorizado</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:24}}>Este e-mail não tem permissão para acessar o sistema.<br/>Entre em contato com um administrador.</div>
        <button className="btn btn-ghost" onClick={onLogout}>Voltar ao login</button>
      </div>
    </div>
  );
}

// ─── AUDITORIA (ADMIN ONLY) ───────────────────────────────────────────────────

function Auditoria(){
  const [logs,setLogs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState('');

  useEffect(()=>{
    supabase.from('audit_log').select('*').order('created_at',{ascending:false}).limit(300)
      .then(({data})=>{ setLogs(data||[]); setLoading(false); });

    const ch=supabase.channel('audit_realtime')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'audit_log'},
        payload=>setLogs(prev=>[payload.new,...prev]))
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[]);

  const filtered=useMemo(()=>{
    if(!filter) return logs;
    const s=filter.toLowerCase();
    return logs.filter(l=>
      l.user_nome?.toLowerCase().includes(s)||
      l.lead_nome?.toLowerCase().includes(s)||
      l.action?.toLowerCase().includes(s)||
      l.detalhes?.toLowerCase().includes(s)
    );
  },[logs,filter]);

  const actionColor={
    'Moveu lead no pipeline':'var(--accent)',
    'Criou novo lead':'var(--success)',
    'Adicionou nota':'var(--amber)',
    'Editou informações':'var(--teal)',
  };

  const fmtTs=ts=>{
    if(!ts) return '—';
    const d=new Date(ts);
    return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
  };

  return(
    <div style={{padding:"28px 32px"}}>
      <div className="fu" style={{marginBottom:24}}>
        <div className="section-title">Auditoria</div>
        <div className="section-sub">Registro de todas as ações realizadas pela equipe pós-venda</div>
      </div>

      <div className="fu1" style={{display:"flex",gap:8,marginBottom:16}}>
        <div className="search-wrap" style={{maxWidth:360}}>
          <span className="search-icon">⌕</span>
          <input className="inp" placeholder="Filtrar por usuário, lead, ação…" value={filter} onChange={e=>setFilter(e.target.value)}/>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--text-muted)"}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"var(--success)",boxShadow:"0 0 5px var(--success)"}}/>
          Atualizando em tempo real
        </div>
      </div>

      {loading?(
        <div style={{textAlign:"center",padding:"40px 0",fontSize:13,color:"var(--text-muted)"}}>Carregando registros…</div>
      ):(
        <div className="fu2 card" style={{overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"rgba(90,70,50,.04)",borderBottom:"1px solid var(--border)"}}>
                  {["Data/hora","Usuário","Ação","Lead","Detalhes"].map(h=>(
                    <th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".08em",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log,i)=>(
                  <tr key={log.id} style={{borderBottom:"1px solid var(--border)",background:i%2===0?"transparent":"rgba(90,70,50,.015)"}}>
                    <td style={{padding:"10px 14px",fontSize:11,color:"var(--text-muted)",whiteSpace:"nowrap"}}>{fmtTs(log.created_at)}</td>
                    <td style={{padding:"10px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <Avatar name={log.user_nome||"?"} size={24} color="#5B4FE8"/>
                        <span style={{fontSize:12,fontWeight:600,color:"var(--text-primary)"}}>{log.user_nome}</span>
                      </div>
                    </td>
                    <td style={{padding:"10px 14px"}}>
                      <span className="tag" style={{background:`${actionColor[log.action]||"var(--accent)"}18`,color:actionColor[log.action]||"var(--accent)",fontSize:11}}>{log.action}</span>
                    </td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"var(--text-primary)",fontWeight:500}}>{log.lead_nome||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"var(--text-secondary)",maxWidth:280}}>{log.detalhes||"—"}</td>
                  </tr>
                ))}
                {filtered.length===0&&<tr><td colSpan={5} style={{padding:"40px 0",textAlign:"center",color:"var(--text-muted)",fontSize:13}}>Nenhum registro encontrado</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GESTÃO DE EQUIPE (ADMIN ONLY) ───────────────────────────────────────────

function GestaoEquipe(){
  const [pessoas,setPessoas]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showModal,setShowModal]=useState(false);
  const [editing,setEditing]=useState(null); // null = new, object = editing
  const [saving,setSaving]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [form,setForm]=useState({email:'',nome:'',role:'pos_venda'});
  const [msg,setMsg]=useState(null); // {type:'success'|'error', text}

  const load=async()=>{
    setLoading(true);
    const {data}=await supabase.from('allowed_users').select('*').order('nome');
    setPessoas(data||[]);
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  const openNew=()=>{
    setEditing(null);
    setForm({email:'',nome:'',role:'pos_venda'});
    setShowModal(true);
  };

  const openEdit=(p)=>{
    setEditing(p);
    setForm({email:p.email,nome:p.nome,role:p.role});
    setShowModal(true);
  };

  const save=async()=>{
    if(!form.email.trim()||!form.nome.trim()){setMsg({type:'error',text:'E-mail e nome são obrigatórios.'});return;}
    const emailLower=form.email.trim().toLowerCase();
    setSaving(true);setMsg(null);
    if(editing){
      // Update allowed_users
      const {error}=await supabase.from('allowed_users')
        .update({email:emailLower,nome:form.nome.trim(),role:form.role})
        .eq('email',editing.email);
      // Also update profile if exists
      await supabase.from('profiles')
        .update({email:emailLower,nome:form.nome.trim(),role:form.role})
        .ilike('email',editing.email);
      if(error){setMsg({type:'error',text:'Erro ao salvar. Verifique os dados.'});}
      else{setMsg({type:'success',text:`${form.nome} atualizado com sucesso!`});setShowModal(false);load();}
    } else {
      // Check if already exists
      const {data:exists}=await supabase.from('allowed_users').select('email').ilike('email',emailLower).single();
      if(exists){setSaving(false);setMsg({type:'error',text:'Este e-mail já está cadastrado.'});return;}
      const {error}=await supabase.from('allowed_users').insert({email:emailLower,nome:form.nome.trim(),role:form.role});
      if(error){setMsg({type:'error',text:'Erro ao adicionar. Tente novamente.'});}
      else{setMsg({type:'success',text:`${form.nome} adicionado! Crie o acesso no Supabase Auth.`});setShowModal(false);load();}
    }
    setSaving(false);
  };

  const remove=async(pessoa)=>{
    // Remove from allowed_users and profiles
    await supabase.from('profiles').delete().ilike('email',pessoa.email);
    await supabase.from('allowed_users').delete().eq('email',pessoa.email);
    setConfirmDelete(null);
    setMsg({type:'success',text:`${pessoa.nome} removido do sistema.`});
    load();
  };

  const roleLabel={admin:'Admin',pos_venda:'Pós-venda'};
  const roleColor={admin:'var(--amber)',pos_venda:'var(--accent)'};
  const roleBg={admin:'var(--amber-dim)',pos_venda:'var(--accent-dim)'};

  return(
    <div style={{padding:"28px 32px",maxWidth:860}}>
      <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
        <div>
          <div className="section-title">Gestão de Equipe</div>
          <div className="section-sub">Gerencie quem tem acesso ao sistema</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Adicionar pessoa</button>
      </div>

      {msg&&(
        <div className="fu" style={{
          display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:9,marginBottom:16,
          background:msg.type==='success'?"var(--success-dim)":"var(--danger-dim)",
          border:`1px solid ${msg.type==='success'?"rgba(30,143,94,.2)":"rgba(196,66,58,.2)"}`,
          fontSize:13,color:msg.type==='success'?"var(--success)":"var(--danger)",
        }}>
          <span>{msg.type==='success'?'✓':'⚠'}</span>{msg.text}
          <button onClick={()=>setMsg(null)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"inherit",fontSize:16}}>×</button>
        </div>
      )}

      {loading?(
        <div style={{textAlign:"center",padding:"40px 0",fontSize:13,color:"var(--text-muted)"}}>Carregando equipe…</div>
      ):(
        <>
          {/* Admins */}
          {['admin','pos_venda'].map(roleGroup=>(
            <div key={roleGroup} style={{marginBottom:24}}>
              <div className="eyebrow" style={{marginBottom:12}}>
                {roleGroup==='admin'?'Administradores':'Time Pós-venda'}
                <span style={{marginLeft:8,fontWeight:400,color:"var(--text-faint)"}}>
                  ({pessoas.filter(p=>p.role===roleGroup).length})
                </span>
              </div>
              <div className="card" style={{overflow:"hidden"}}>
                {pessoas.filter(p=>p.role===roleGroup).length===0?(
                  <div style={{padding:"20px 18px",fontSize:13,color:"var(--text-muted)"}}>Nenhuma pessoa neste grupo.</div>
                ):(
                  pessoas.filter(p=>p.role===roleGroup).map((p,i,arr)=>(
                    <div key={p.email} style={{
                      display:"flex",alignItems:"center",gap:12,padding:"13px 18px",
                      borderBottom:i<arr.length-1?"1px solid var(--border)":"none",
                      transition:"background .15s",
                    }}>
                      <Avatar name={p.nome} size={38} color={roleColor[p.role]}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>{p.nome}</div>
                        <div style={{fontSize:12,color:"var(--text-muted)",marginTop:1}}>{p.email}</div>
                      </div>
                      <span className="tag" style={{background:roleBg[p.role],color:roleColor[p.role],fontSize:11}}>
                        {roleLabel[p.role]}
                      </span>
                      <div style={{display:"flex",gap:6,marginLeft:8}}>
                        <button className="btn btn-ghost" style={{padding:"5px 11px",fontSize:12}}
                          onClick={()=>openEdit(p)}>Editar</button>
                        <button onClick={()=>setConfirmDelete(p)} style={{
                          padding:"5px 11px",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",
                          background:"var(--danger-dim)",color:"var(--danger)",
                          border:"1px solid rgba(196,66,58,.2)",transition:"all .15s",
                        }}>Remover</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}

          {/* Info box */}
          <div style={{padding:"12px 16px",background:"rgba(90,70,50,.05)",borderRadius:10,border:"1px solid var(--border)",fontSize:12,color:"var(--text-muted)",lineHeight:1.7}}>
            💡 <strong>Para dar acesso a uma nova pessoa:</strong> adicione aqui primeiro, depois vá em{' '}
            <strong>Supabase → Authentication → Users → Add user → Create new user</strong> e crie o usuário com o mesmo e-mail e uma senha inicial.
          </div>
        </>
      )}

      {/* Modal Add/Edit */}
      {showModal&&(
        <div className="mbk" onClick={e=>{if(e.target===e.currentTarget){setShowModal(false);setMsg(null);}}}>
          <div className="mbox" style={{maxWidth:440}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <div>
                <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,color:"var(--text-primary)"}}>
                  {editing?'Editar pessoa':'Adicionar pessoa'}
                </div>
                <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>
                  {editing?'Atualize os dados da pessoa':'Preencha os dados da nova pessoa'}
                </div>
              </div>
              <button onClick={()=>{setShowModal(false);setMsg(null);}} style={{background:"rgba(90,70,50,.08)",border:"1px solid var(--border-mid)",borderRadius:9,color:"var(--text-secondary)",cursor:"pointer",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>×</button>
            </div>

            {msg&&<div style={{padding:"9px 12px",borderRadius:8,marginBottom:14,background:"var(--danger-dim)",border:"1px solid rgba(196,66,58,.2)",fontSize:12,color:"var(--danger)"}}>{msg.text}</div>}

            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>Nome completo</label>
              <input className="inp" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome da pessoa"/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>E-mail</label>
              <input className="inp" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                placeholder="email@exemplo.com" disabled={!!editing}
                style={{opacity:editing?0.6:1}}/>
              {editing&&<div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>O e-mail não pode ser alterado após o cadastro.</div>}
            </div>
            <div style={{marginBottom:22}}>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>Papel no sistema</label>
              <div style={{display:"flex",gap:8}}>
                {[{v:'pos_venda',l:'Pós-venda'},{v:'admin',l:'Administrador'}].map(opt=>{
                  const sel=form.role===opt.v;
                  return(
                    <button key={opt.v} onClick={()=>setForm(f=>({...f,role:opt.v}))} style={{
                      flex:1,padding:"9px 0",borderRadius:9,fontSize:13,fontWeight:600,cursor:"pointer",
                      background:sel?roleColor[opt.v]:"rgba(90,70,50,.06)",
                      color:sel?"#fff":"var(--text-secondary)",
                      border:sel?"none":"1px solid var(--border)",
                      transition:"all .15s",
                    }}>{opt.l}</button>
                  );
                })}
              </div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>{setShowModal(false);setMsg(null);}}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving?"Salvando…":editing?"Salvar alterações":"Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete&&(
        <div className="mbk" onClick={e=>{if(e.target===e.currentTarget)setConfirmDelete(null);}}>
          <div className="mbox" style={{maxWidth:400}}>
            <div style={{textAlign:"center",padding:"8px 0 20px"}}>
              <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
              <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>
                Remover {confirmDelete.nome}?
              </div>
              <div style={{fontSize:13,color:"var(--text-muted)",lineHeight:1.6,marginBottom:24}}>
                Esta pessoa perderá acesso ao sistema imediatamente.<br/>
                O histórico de ações dela na auditoria será mantido.
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                <button className="btn btn-ghost" onClick={()=>setConfirmDelete(null)}>Cancelar</button>
                <button className="btn" style={{background:"var(--danger)",color:"#fff",boxShadow:"0 3px 12px rgba(196,66,58,.3)"}}
                  onClick={()=>remove(confirmDelete)}>Sim, remover acesso</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function App(){
  const {session,profile,authLoading,unauthorized,signOut,configError,isRecovery}=useAuth();
  const [s,dispatch]=useReducer(R,INIT);
  const {leads,view,sel,newOpen,filters,rules,dragId}=s;
  const selected=leads.find(l=>l.id===sel);
  const [leadsReady,setLeadsReady]=useState(false);

  // ── Load leads from Supabase on login ──
  useEffect(()=>{
    if(!session) return;
    supabase.from('leads').select('data').then(async({data,error})=>{
      if(error) console.error('Erro ao carregar leads:', error);
      const remoteLeads = data?.map(r=>r.data) || [];

      if(remoteLeads.length >= LEADS0.length){
        // Supabase has all leads — use them
        dispatch({type:'SET_LEADS', leads:remoteLeads});
      } else {
        // Supabase is missing leads — seed from LEADS0 and use LEADS0
        console.log(`Supabase tem ${remoteLeads.length} leads, fazendo seed de ${LEADS0.length} leads...`);
        const toSeed = LEADS0.map(l=>({id:l.id, data:l}));
        // Batch upsert in chunks of 50
        for(let i=0;i<toSeed.length;i+=50){
          const chunk = toSeed.slice(i,i+50);
          const {error:e} = await supabase.from('leads').upsert(chunk,{onConflict:'id'});
          if(e) console.error('Seed error:', e);
        }
        dispatch({type:'SET_LEADS', leads:LEADS0});
        console.log('Seed concluído!');
      }
      setLeadsReady(true);
    });
  },[session]);

  // ── Save a single lead to Supabase ──
  const saveLead=useCallback(async(lead)=>{
    if(!session||!leadsReady) return;
    const {error}=await supabase.from('leads').upsert({id:lead.id,data:lead},{onConflict:'id'});
    if(error) console.error('Erro ao salvar lead:', error);
  },[session,leadsReady]);

  // ── Audited dispatch — saves directly + logs pos_venda actions ──
  const auditedDispatch=useCallback((action)=>{
    // First dispatch to update local state
    dispatch(action);

    // Then save affected lead(s) to Supabase
    if(session&&leadsReady){
      setTimeout(()=>{
        // We need the updated leads — get from the reducer result directly
        const affectedId=action.lid||action.lead?.id||action.leadId;
        if(['MOVE','NOTE','UPD'].includes(action.type)&&affectedId){
          // Re-read from current state via a callback approach
          setLeadsReady(prev=>{ // trick to access latest leads
            return prev;
          });
          // Use functional state read
          dispatch({type:'__SAVE_HOOK__',id:affectedId,_save:saveLead});
        }
        if(action.type==='ADD'&&action.lead){
          const newLead={...action.lead,id:action.lead.id||'tmp'};
          saveLead({...newLead,id:newLead.id});
        }
      },50);
    }

    // Audit log for pos_venda
    if(profile?.role==='pos_venda'){
      const auditMap={
        MOVE:()=>({action:'Moveu lead no pipeline',leadId:action.lid,details:`Estágio → "${stg(action.st).label}"`}),
        NOTE:()=>({action:'Adicionou nota',leadId:action.lid,details:action.act?.text||''}),
        UPD: ()=>({action:'Editou informações',leadId:action.lead?.id,details:'Campos atualizados no lead'}),
        ADD: ()=>({action:'Criou novo lead',leadId:null,details:`Nome: ${action.lead?.nomeIndicado||'—'}`}),
      };
      const fn=auditMap[action.type];
      if(fn){
        const {action:act,leadId,details}=fn();
        const leadNome=action.type==='ADD'
          ?action.lead?.nomeIndicado
          :leads.find(l=>l.id===leadId)?.nomeIndicado||'—';
        supabase.from('audit_log').insert({
          user_id:session.user.id,user_nome:profile.nome,
          action:act,lead_id:leadId||null,lead_nome:leadNome,detalhes:details,
        });
      }
    }
  },[profile,leads,session,leadsReady,saveLead]);

  // ── Watch leads and sync any changes to Supabase ──
  const leadsRef=useRef(leads);
  useEffect(()=>{
    if(!leadsReady||!session) return;
    const prev=leadsRef.current;
    const changed=leads.filter(l=>{
      const old=prev.find(p=>p.id===l.id);
      return !old||JSON.stringify(old)!==JSON.stringify(l);
    });
    if(changed.length>0){
      Promise.all(changed.map(l=>
        supabase.from('leads').upsert({id:l.id,data:l},{onConflict:'id'})
          .then(({error})=>{ if(error) console.error('Sync error:',l.id,error); })
      ));
    }
    leadsRef.current=leads;
  },[leads,leadsReady,session]);

  // ── Auth states ──
  if(configError){
    return(
      <>
        <GlobalStyles/>
        <div style={{minHeight:"100vh",background:"var(--bg-base)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font)",padding:24}}>
          <div style={{maxWidth:480,background:"var(--bg-elevated)",borderRadius:"var(--radius-xl)",border:"1px solid var(--border-mid)",padding:"36px 32px",boxShadow:"0 8px 48px rgba(60,40,20,0.14)"}}>
            <div style={{fontSize:32,marginBottom:16}}>⚠️</div>
            <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,color:"var(--text-primary)",marginBottom:8}}>Supabase não configurado</div>
            <div style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.7,marginBottom:20}}>
              O arquivo <code style={{background:"rgba(90,70,50,.1)",padding:"1px 6px",borderRadius:4,fontSize:12}}>.env</code> não foi criado ou as chaves estão incorretas.<br/><br/>
              Crie o arquivo <strong>.env</strong> na raiz do projeto com o conteúdo abaixo:
            </div>
            <div style={{background:"rgba(90,70,50,.06)",border:"1px solid var(--border-mid)",borderRadius:8,padding:"12px 14px",fontFamily:"monospace",fontSize:12,color:"var(--text-primary)",lineHeight:1.8,marginBottom:20}}>
              VITE_SUPABASE_URL=https://xxxx.supabase.co<br/>
              VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
            </div>
            <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.7}}>
              Após criar o .env, <strong>pare o servidor</strong> com Ctrl+C e rode <code style={{background:"rgba(90,70,50,.1)",padding:"1px 6px",borderRadius:4}}>npm run dev</code> novamente.<br/>
              As chaves estão em: <strong>Supabase → Project Settings → API</strong>
            </div>
          </div>
        </div>
      </>
    );
  }
  if(authLoading){
    return(
      <>
        <GlobalStyles/>
        <div style={{minHeight:"100vh",background:"var(--bg-base)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font)"}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:12}}>◈</div>
            <div style={{fontSize:13,color:"var(--text-muted)"}}>Carregando…</div>
          </div>
        </div>
      </>
    );
  }
  if(isRecovery) return <><GlobalStyles/><ResetPassword/></>;
  if(!session) return <><GlobalStyles/><Login/></>;
  if(unauthorized) return <><GlobalStyles/><Unauthorized onLogout={signOut}/></>;
  if(!profile) return(
    <><GlobalStyles/>
      <div style={{minHeight:"100vh",background:"var(--bg-base)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font)"}}>
        <div style={{fontSize:13,color:"var(--text-muted)"}}>Verificando perfil…</div>
      </div>
    </>
  );

  return(
    <>
      <GlobalStyles/>
      <div style={{display:"flex",minHeight:"100vh",background:"var(--bg-base)",fontFamily:"var(--font)"}}>
        <Sidebar view={view} dispatch={auditedDispatch} onLogout={signOut} profile={profile}/>
        <main style={{flex:1,minWidth:0,overflowY:"auto",paddingRight:selected?490:0,transition:"padding-right .3s cubic-bezier(.4,0,.2,1)"}}>
          {view==="dashboard"   &&<Dashboard leads={leads}/>}
          {view==="kanban"      &&<Kanban leads={leads} dispatch={auditedDispatch} dragId={dragId}/>}
          {view==="leads"       &&<LeadsTable leads={leads} dispatch={auditedDispatch} filters={filters}/>}
          {view==="attribution" &&<Attribution rules={rules} dispatch={auditedDispatch}/>}
          {view==="auditoria"   &&<Auditoria/>}
          {view==="equipe"      &&<GestaoEquipe/>}
        </main>
        {selected&&<Detail key={selected.id} lead={selected} dispatch={auditedDispatch}/>}
        {newOpen&&<NewLead dispatch={auditedDispatch}/>}
      </div>
    </>
  );
}