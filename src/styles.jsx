export const GlobalStyles = () => (
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