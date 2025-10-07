/*
 * =================================================================================
 * == Gerador de Página de Leads v11.5 (Final com Efeitos Visuais) ==
 * =================================================================================
 * v11.5: Aplica os refinamentos visuais finais solicitados:
 * - Ícone do WhatsApp e efeito de hover verde nos botões de contato.
 * - Efeito de hover nos cards de oportunidade.
 * - Ajuste final nos textos dos botões.
 * =================================================================================
 */

// --- FUNÇÕES DE ANONIMIZAÇÃO ---
const anonimizarNome = (n) => n && typeof n === 'string' ? n.trim().split(' ')[0] : 'Anunciante';
const anonimizarTelefone = (t) => { if (!t || typeof t !== 'string' || t.length < 4) return 'Oculto'; const d = t.replace(/\D/g, ''); if (d.length < 4) return 'Oculto'; return `(**) *****-${d.slice(-4)}`; };
const anonimizarGrupo = (g) => g ? 'Grupo Confidencial' : 'Não informado';
const anonimizarTexto = (texto) => {
    if (!texto || typeof texto !== 'string') return '';
    let txt = texto.replace(/(\*{2}.*?\s*-\s*)([A-Za-zÀ-ú\s]+)(:\*{2})/g, (_, p1, p2, p3) => p1 + anonimizarNome(p2) + p3);
    txt = txt.replace(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4}[-.\s]?\d{4}/g, (m) => anonimizarTelefone(m));
    return txt;
};

// --- ETAPA 1: RECEBER E PROCESSAR OS DADOS DE ENTRADA ---
const input = $input.first()?.json;
const returnErrorHtml = async (msg) => { const html = `<html><body><h1>${msg}</h1></body></html>`; const buf = Buffer.from(html, 'utf8'); const bin = await this.helpers.prepareBinaryData(buf, 'e.html', 'text/html'); return [{ json: {}, binary: { data: bin } }]; };
if (!input || !Array.isArray(input.oportunidades) || !Array.isArray(input.extracao_oport)) { return await returnErrorHtml("Erro: Formato de dados inválido."); }
const caracteristicas = input.extracao_oport.find(e => e.caracteristicas)?.caracteristicas || {};
const localizacao = input.extracao_oport.find(e => e.localizacao)?.localizacao || {};
const anuncioOriginal = { oportunidades: input.oportunidades, mensagem_conteudo: input.mensagem_oport, mensagem_datetime: input.data_msg_oport, grupo_nome: input.grp_msg_oport, ...caracteristicas, localizacao: localizacao };
let allLeads = [];
(anuncioOriginal.oportunidades || []).forEach(item => { if (item.clientes_diretos) allLeads.push({ ...item.clientes_diretos, tipo: 'Cliente Direto', data_lead: item.clientes_diretos.data_ultima_mensagem }); else if (item.clientes_parceiros) allLeads.push({ ...item.clientes_parceiros, tipo: 'Parceiro', data_lead: item.clientes_parceiros.mensagem_datetime }); else allLeads.push({ ...item, tipo: 'Imóvel Ofertado', data_lead: item.mensagem_datetime }); });
if (allLeads.length === 0) return await returnErrorHtml("Nenhum lead compatível foi encontrado.");

// --- ETAPA 2: ORDENAR POR RELEVÂNCIA ---
const isOfertaOriginal = anuncioOriginal.intencao === 'oferta';
allLeads.sort((a, b) => { const dateA = new Date(a.data_lead || 0), dateB = new Date(b.data_lead || 0); const scoreA = a.pontuacao_match ?? -1, scoreB = b.pontuacao_match ?? -1; if (isOfertaOriginal) { const typeA = a.tipo === 'Cliente Direto' ? 1 : 0, typeB = b.tipo === 'Cliente Direto' ? 1 : 0; if (typeA !== typeB) return typeB - typeA; } if (dateB.getTime() !== dateA.getTime()) return dateB - dateA; return scoreB - scoreA; });

// --- ETAPA 3: GERAR A PÁGINA HTML ---
const formatarData = (dISO) => { if (!dISO) return 'N/A'; const d = new Date(dISO); d.setHours(d.getHours() - 3); return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
const formatarValor = (valor) => { if (!valor) return null; return `R$ ${parseInt(valor).toLocaleString('pt-BR')}`; };
const whatsappIconSvg = `<svg viewBox="0 0 24 24" class="icon-whatsapp"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 12c0 1.77.46 3.45 1.28 4.95L2 22l5.25-1.38c1.45.77 3.09 1.18 4.79 1.18h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2M12.04 3.65c4.51 0 8.26 3.75 8.26 8.26s-3.75 8.26-8.26 8.26h-.01c-1.55 0-3.05-.44-4.33-1.25l-.31-.18l-3.22.84l.86-3.14l-.2-.32c-.87-1.34-1.34-2.92-1.34-4.57c0-4.51 3.75-8.26 8.26-8.26m4.33 9.84c-.22-.11-1.3-.65-1.5-.73s-.35-.11-.5.11s-.57.73-.7 1.48s-.26.22-.48.11c-1.12-.55-2.12-1.13-2.98-2.32c-.37-.53-.61-1.07-.7-1.25s-.08-.26.04-.38c.11-.11.24-.28.37-.42c.13-.14.17-.24.26-.4s.04-.22-.04-.33c-.08-.11-.5-1.2-.68-1.65c-.18-.44-.37-.38-.5-.38h-.4c-.18 0-.4.04-.61.26c-.22.22-.84.83-.84 2.02s.86 2.34 1 2.5s1.71 2.58 4.1 3.6c.59.26 1.05.41 1.41.53c.6.2 1.14.17 1.56-.08c.48-.28.84-.74.96-1.18s.12-.84.08-.95c-.04-.11-.18-.17-.4-.28"/></svg>`;

const checkValorMatch = (anuncio, lead) => {
    let valorAnuncio = anuncio.valor;
    let valorLead = lead.valor || lead.investmax_compra || lead.investmax_aluguel;
    if (!valorAnuncio || !valorLead) return false;
    if (anuncio.intencao === 'oferta') {
        return parseInt(valorAnuncio) <= parseInt(valorLead);
    } else { // 'procura'
        return parseInt(valorAnuncio) >= parseInt(valorLead);
    }
};

const getTagsAsArray = (dados) => {
    let valorLead = dados.valor || dados.investmax_compra || dados.investmax_aluguel;
    return [
        dados.tipo_imovel || dados.tipoimovel,
        dados.tipo_operacao || dados.finalidade,
        dados.bairro || dados.localizacao?.bairro,
        dados.quartos ? `${dados.quartos}q` : null,
        dados.suites ? `${dados.suites}s` : null,
        formatarValor(valorLead),
    ].filter(t => t).map(t => String(t).trim().toLowerCase());
};

const gerarTagsResumo = (dados, max = 6, anuncioRef, scoreClass = 'low') => {
    let valorLead = dados.valor || dados.investmax_compra || dados.investmax_aluguel;
    const isValorMatch = anuncioRef ? checkValorMatch(anuncioRef, dados) : false;

    const priorityTags = [
        { value: formatarValor(valorLead), match: isValorMatch },
        { value: dados.tipo_imovel || dados.tipoimovel, match: anuncioRef ? String(anuncioRef.tipo_imovel || '').toLowerCase() === String(dados.tipo_imovel || dados.tipoimovel || '').toLowerCase() : false },
        { value: dados.tipo_operacao || dados.finalidade, match: anuncioRef ? String(anuncioRef.tipo_operacao || '').toLowerCase() === String(dados.tipo_operacao || dados.finalidade || '').toLowerCase() : false },
        { value: dados.bairro || dados.localizacao?.bairro, match: anuncioRef ? String(anuncioRef.bairro || anuncioRef.localizacao?.bairro || '').toLowerCase() === String(dados.bairro || dados.localizacao?.bairro || '').toLowerCase() : false },
    ].filter(t => t.value);

    const otherTags = [
        { value: dados.quartos ? `${dados.quartos}q` : null, match: anuncioRef ? parseInt(anuncioRef.quartos) === parseInt(dados.quartos) : false },
        { value: dados.suites ? `${dados.suites}s` : null, match: anuncioRef ? parseInt(anuncioRef.suites) === parseInt(dados.suites) : false },
    ].filter(t => t.value);

    const allTags = [...priorityTags, ...otherTags];
    
    return allTags.slice(0, max).map(t => {
        return `<span class="tag ${t.match ? `tag-match ${scoreClass}` : ''}">${t.value}</span>`;
    }).join(' ');
};

const gerarComparativo = (anuncio, lead) => {
    const checkMatch = (val1, val2, type = 'string') => {
        if (val1 === null || val1 === undefined || val2 === null || val2 === undefined) return false;
        if (type === 'numeric') { return parseInt(val1) === parseInt(val2); }
        return String(val1).trim().toLowerCase() === String(val2).trim().toLowerCase();
    };

    const isValorMatch = checkValorMatch(anuncio, lead);
    const campos = [
        { label: 'Tipo de Imóvel', an: anuncio.tipo_imovel, ld: lead.tipo_imovel || lead.tipoimovel, match: checkMatch(anuncio.tipo_imovel, lead.tipo_imovel || lead.tipoimovel) },
        { label: 'Operação', an: anuncio.tipo_operacao, ld: lead.tipo_operacao || lead.finalidade, match: checkMatch(anuncio.tipo_operacao, lead.tipo_operacao || lead.finalidade) },
        { label: 'Bairro', an: anuncio.bairro || anuncio.localizacao?.bairro, ld: lead.bairro || lead.localizacao?.bairro, match: checkMatch(anuncio.bairro || anuncio.localizacao?.bairro, lead.bairro || lead.localizacao?.bairro) },
        { label: 'Valor', an: anuncio.valor, ld: lead.valor || lead.investmax_compra || lead.investmax_aluguel, match: isValorMatch, format: formatarValor },
        { label: 'Quartos', an: anuncio.quartos, ld: lead.quartos, match: checkMatch(anuncio.quartos, lead.quartos, 'numeric') },
        { label: 'Suítes', an: anuncio.suites, ld: lead.suites, match: checkMatch(anuncio.suites, lead.suites, 'numeric') },
    ];

    let html = '<ul>';
    for (const campo of campos) {
        if (campo.an || campo.ld) {
            const valAnuncio = campo.format ? campo.format(campo.an) : campo.an;
            const valLead = campo.format ? campo.format(campo.ld) : campo.ld;
            html += `<li class="${campo.match ? 'match' : ''}"><div class="label">${campo.label} ${campo.match ? '<span class="match-icon">✔</span>' : ''}</div><div class="values"><div class="value-item"><span>Anúncio:</span> ${valAnuncio || 'N/A'}</div><div class="value-item"><span>Oportunidade:</span> ${valLead || 'N/A'}</div></div></li>`;
        }
    }
    html += '</ul>';
    return html;
};

const nomeAnuncianteAnonimo = anonimizarNome(anuncioOriginal.nome_anunciante);
const anuncioTagsSet = new Set(getTagsAsArray(anuncioOriginal));

const htmlString = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Análise de Oportunidades</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root { --bg: #2d3748; --card-bg: #4a5568; --card-hover: #525c6e; --text-light: #e2e8f0; --text-muted: #a0aec0; --accent: #38b2ac; --accent-hover: #25D366; --border: #718096; --shadow: rgba(0,0,0,0.2); --high-glow: #68d391; --mid-glow: #f6e05e; --low-glow: #a0aec0; }
        body { font-family: 'Inter', sans-serif; margin: 0; background-color: var(--bg); color: var(--text-light); line-height: 1.6; }
        .wrapper { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .header { text-align: center; margin-bottom: 3rem; }
        .header h1 { font-size: 2.5rem; margin: 0; }
        .header p { color: var(--text-muted); font-size: 1.1rem; }
        .section-title { font-size: 1.8rem; font-weight: 600; margin-bottom: 1.5rem; border-bottom: 2px solid var(--border); padding-bottom: 1rem; }
        
        .anuncio-card { background-color: var(--card-bg); border-radius: 16px; padding: 2rem; box-shadow: 0 10px 30px var(--shadow); border: 1px solid var(--border); margin-bottom: 3rem; }
        .anuncio-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border); padding-bottom: 1rem; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .anuncio-header .section-title { margin:0; border:none; padding:0; flex-grow: 1; }
        .anuncio-grid { display: grid; grid-template-columns: 3fr 2fr; gap: 2rem; }
        .anuncio-info .label { font-size: 0.9rem; color: var(--text-muted); display: block; }
        .anuncio-info-section { padding-bottom: 1rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border); }
        .anuncio-info-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .info-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
        .anuncio-texto { font-size: 0.9rem; white-space: pre-wrap; max-height: 350px; overflow-y: auto; background: #2d3748; padding: 1rem; border-radius: 8px; }

        .leads-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
        .lead-tile { background-color: var(--card-bg); border-radius: 12px; padding: 1rem 1.5rem; box-shadow: 0 5px 20px var(--shadow); border: 1px solid var(--border); cursor: pointer; transition: all 0.2s ease-in-out; display: flex; flex-direction: column; }
        .lead-tile:hover { transform: translateY(-5px); box-shadow: 0 10px 30px var(--shadow); background-color: var(--card-hover); }
        .tile-content { flex-grow: 1; }
        .tile-line-1 { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; }
        .lead-name { font-size: 1.25rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .score { font-size: 1.5rem; font-weight: 700; flex-shrink: 0; }
        .score.high { color: var(--high-glow); } .score.mid { color: var(--mid-glow); } .score.low { color: var(--text-muted); }
        .tile-line-2 { font-size: 0.85rem; color: var(--text-muted); margin-top: -5px; margin-bottom: 1rem; }
        .tags-container { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border); }
        .tag { font-size: 0.75rem; font-weight: 500; padding: 0.25rem 0.75rem; border-radius: 50px; background-color: #2d3748; border: 1px solid var(--border); }
        .tag-match.high { border-color: var(--high-glow); background-color: rgba(104, 211, 145, 0.1); }
        .tag-match.mid { border-color: var(--mid-glow); background-color: rgba(246, 224, 94, 0.1); }
        .tag-match.low { border-color: var(--low-glow); background-color: rgba(160, 174, 192, 0.1); }
        
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.7); backdrop-filter: blur(5px); align-items: center; justify-content: center; }
        .modal.is-visible { display: flex; }
        .modal-content { background-color: var(--bg); margin: auto; padding: 2rem; border: 1px solid var(--border); width: 90%; max-width: 900px; border-radius: 16px; position: relative; box-shadow: 0 10px 50px var(--shadow); }
        .close-button { color: var(--text-muted); position: absolute; top: 1rem; right: 1.5rem; font-size: 2rem; font-weight: bold; cursor: pointer; z-index: 10; }
        .modal-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; gap: 1rem; }
        .modal-header h2 { font-size: 1.8rem; margin: 0; flex-grow: 1; }
        .modal-subheader { color: var(--text-muted); margin-bottom: 2rem; }
        .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        .comparison-list h3 { font-size: 1.1rem; color: var(--accent); margin-top: 0; margin-bottom: 1rem; }
        .comparison-list ul { list-style: none; padding: 0; margin: 0; }
        .comparison-list li { padding: 0.75rem 0; border-bottom: 1px solid #3a475a; display: flex; justify-content: space-between; align-items: center; }
        .comparison-list .label { font-weight: 600; }
        .comparison-list .values { text-align: right; font-size: 0.9rem; }
        .comparison-list .value-item span { color: var(--text-muted); }
        .comparison-list li.match .label { color: var(--high-glow); }
        .comparison-list .match-icon { color: var(--high-glow); font-weight: bold; margin-left: 5px; }
        .message-content-modal { font-size: 0.9rem; line-height: 1.7; color: var(--text-muted); white-space: pre-wrap; max-height: 400px; overflow-y: auto; background-color: #1a202c; padding: 1rem; border-radius: 8px;}
        .action-button { display: inline-flex; align-items: center; justify-content: center; background: var(--accent); color: white !important; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; box-sizing: border-box; transition: background-color 0.2s; margin-right: 2em; }
        .action-button:hover { background-color: var(--accent-hover); }
        .icon-whatsapp { width: 1.2em; height: 1.2em; margin-left: 8px; }

        @media screen and (max-width: 992px) { .anuncio-grid, .modal-grid { grid-template-columns: 1fr; } .anuncio-texto { order: -1; margin-bottom: 1.5rem; } }
        @media screen and (max-width: 600px) { 
            .wrapper { padding: 1rem; } 
            .header h1 { font-size: 1.8rem; }
            .anuncio-header, .modal-header { flex-direction: column; align-items: flex-start; } 
            .anuncio-header .action-button, .modal-header .action-button { width: 100%; }
            .modal-content { padding: 1.5rem; }
            .modal-header { padding-right: 2.5rem; }
        }
    </style>
</head>
<body>
<div class="wrapper">
    <header class="header">
        <h1>Análise de Oportunidades</h1>
        <p>Olá <strong>${nomeAnuncianteAnonimo}</strong>, encontramos ${allLeads.length} oportunidades compatíveis com o anúncio.</p>
    </header>

    <div class="anuncio-card">
        <div class="anuncio-header">
             <h2 class="section-title">Anúncio Original</h2>
             <a href="#" class="action-button">Contatar Anunciante ${whatsappIconSvg}</a>
        </div>
        <div class="anuncio-grid">
            <div class="anuncio-texto">${anonimizarTexto(anuncioOriginal.mensagem_conteudo)}</div>
            <div class="anuncio-info">
                 <div class="anuncio-info-section">
                    <div class="info-row">
                        <div><span class="label">Anunciante</span><br>${nomeAnuncianteAnonimo}</div>
                        <div><span class="label">Telefone</span><br>${anonimizarTelefone(anuncioOriginal.telefone_anunciante)}</div>
                    </div>
                </div>
                <div class="anuncio-info-section">
                     <div class="info-row">
                        <div><span class="label">Grupo</span><br>${anonimizarGrupo(anuncioOriginal.grupo_nome)}</div>
                        <div><span class="label">Data</span><br>${formatarData(anuncioOriginal.mensagem_datetime)}</div>
                    </div>
                </div>
                <div class="anuncio-info-section">
                    <div style="font-size: 1rem; font-weight:600; margin-bottom: 1rem;">Características Principais</div>
                    <div class="tags-container" style="border:none; padding-top:0;">${gerarTagsResumo(anuncioOriginal, 6)}</div>
                </div>
            </div>
        </div>
    </div>

    <h2 class="section-title">Oportunidades Encontradas</h2>
    <div class="leads-grid">
        ${allLeads.map((lead, index) => {
            const score = lead.pontuacao_match ?? 0;
            const scoreClass = score >= 40 ? 'high' : (score >= 25 ? 'mid' : 'low');
            return `
            <div class="grid-tile lead-tile" onclick="openModal('modal-${index}')">
                <div class="tile-content">
                    <div class="tile-line-1">
                        <h3 class="lead-name">${anonimizarNome(lead.nome || lead.autor_nome)}</h3>
                        <span class="score ${scoreClass}">★ ${score}</span>
                    </div>
                    <div class="tile-line-2">
                        <span>${lead.tipo}</span> | <span>${formatarData(lead.data_lead)}</span>
                    </div>
                </div>
                <div class="tags-container">${gerarTagsResumo(lead, 6, anuncioOriginal, scoreClass)}</div>
            </div>
            `;
        }).join('')}
    </div>
</div>

${allLeads.map((lead, index) => `
<div id="modal-${index}" class="modal">
    <div class="modal-content" onclick="event.stopPropagation()">
        <span class="close-button" onclick="closeModal('modal-${index}')">&times;</span>
        <div class="modal-header">
            <h2>${anonimizarNome(lead.nome || lead.autor_nome)}</h2>
            <a href="#" class="action-button">Contatar Lead ${whatsappIconSvg}</a>
        </div>
        <div class="modal-subheader">
            <span><strong>Tipo:</strong> ${lead.tipo}</span> | 
            <span><strong>Score:</strong> ${lead.pontuacao_match ?? 0}</span> | 
            <span><strong>Grupo:</strong> ${anonimizarGrupo(lead.grupo_nome)}</span> | 
            <span><strong>Data:</strong> ${formatarData(lead.data_lead)}</span>
        </div>
        <div class="modal-grid">
            <div class="comparison-list">
                <h3>Análise de Compatibilidade</h3>
                ${gerarComparativo(anuncioOriginal, lead)}
            </div>
            <div class="message-content-modal">
                <strong>Mensagem Original do Lead:</strong><br><br>
                ${anonimizarTexto(lead.mensagem_conteudo || lead.descricao || '')}
            </div>
        </div>
    </div>
</div>
`).join('')}

<script>
    function openModal(modalId) { document.getElementById(modalId).classList.add('is-visible'); }
    function closeModal(modalId) { document.getElementById(modalId).classList.remove('is-visible'); }
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (event) => {
            closeModal(modal.id);
        });
    });
</script>

</body>
</html>
`;

// --- ETAPA 4: PREPARAR A SAÍDA COMO ARQUIVO BINÁRIO ---
const buffer = Buffer.from(htmlString, 'utf8');
const binaryData = await this.helpers.prepareBinaryData(buffer, 'report.html', 'text/html');

// --- ETAPA 5: RETORNO FINAL ---
return [{ json: {}, binary: { data: binaryData } }];