# apply_patch_v2.py
# Coloque na raiz do projeto e rode: python apply_patch_v2.py
# Nao usa redirecionamento > — escreve direto nos arquivos

import os

def patch(content, filename):
    replacements = [
        # BKO_STAGES — BKOApp.jsx (versao completa com bg)
        ("label:'Clientes Novos',",               "label:'Corb novos entrantes',"),
        ("label:'Saldo em Andamento - BKO',",      "label:'BKO - Saldo Devedor',"),
        ("label:'Saldo em Andamento',",            "label:'BKO - Saldo Devedor',"),
        ("label:'Pendência Análise Financeiro',",  "label:'Pendência Analise Financeira',"),
        ("label:'Pendência Financeiro',",          "label:'Pend. Analise Financeira',"),
        ("label:'Em Negociação - Corban',",        "label:'Em negociação - Corban',"),
        ("label:'Em Negociação',",                 "label:'Em negociação - Corban',"),
        ("label:'Abertura de Conta - Corban',",    "label:'Abertura de conta - Interno',"),
        ("label:'Abertura de Conta',",             "label:'Abertura de conta - Interno',"),
        ("label:'Digitar Proposta - Corban',",     "label:'Pronto p digitar - Corban',"),
        ("label:'Digitar Proposta',",              "label:'Pronto p digitar - Corban',"),
        ("label:'Integrado',",                     "label:'Finalizado - Interno',"),
        ("label:'Perdido',",                       "label:'Perdidos',"),
    ]
    for old, new in replacements:
        content = content.replace(old, new)

    if 'BKOApp' in filename:
        # Scroll fix 1: container externo do pipeline
        content = content.replace(
            "<div style={{padding:'16px 20px',overflowX:'hidden'}}>",
            "<div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>"
        )
        # Scroll fix 2: header — adiciona padding e flexShrink
        content = content.replace(
            "      {/* ── Header ── */}\n      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,gap:16,flexWrap:'wrap'}}>",
            "      {/* ── Header ── */}\n      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,gap:16,flexWrap:'wrap',padding:'16px 20px 0',flexShrink:0}}>"
        )
        # Scroll fix 3: colunas kanban
        content = content.replace(
            "        <div ref={colsRef} style={{display:'flex',gap:7,overflowX:'auto',paddingBottom:16}}>",
            "        <div ref={colsRef} style={{display:'flex',gap:7,overflowX:'auto',overflowY:'hidden',padding:'0 20px 16px',flex:1,minHeight:0,alignItems:'flex-start'}}>"
        )
        # Scroll fix 4: main overflow condicional
        content = content.replace(
            "<main style={{flex:1,minWidth:0,overflowY:'auto',paddingRight:selected?490:0,transition:'padding-right .3s cubic-bezier(.4,0,.2,1)'}}>",
            "<main style={{flex:1,minWidth:0,overflowY:view==='pipeline'?'hidden':'auto',paddingRight:selected?490:0,transition:'padding-right .3s cubic-bezier(.4,0,.2,1)'}}>"
        )

    return content


files = [
    'src/views/bko/BKOApp.jsx',
    'src/views/bko/BKODetail.jsx',
    'src/views/tv/TVApp.jsx',
]

for filepath in files:
    if not os.path.exists(filepath):
        print(f'AVISO: {filepath} nao encontrado, pulando...')
        continue

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    filename = os.path.basename(filepath)
    new_content = patch(content, filename)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    changed = content != new_content
    print(f'{"OK" if changed else "SEM MUDANCAS"}: {filepath}')

print('\nPronto! Rode: npm run dev')