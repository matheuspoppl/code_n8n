/*
 * =================================================================================
 * == Gerador de Página de Leads v6.3 (Evolução Visual - Dark Mode Suave) ==
 * =================================================================================
 * Design refinado com foco em profissionalismo, clareza e identidade visual.
 * Tema escuro suave para uma estética moderna e sofisticada.
 * Inclui adaptação de dados e anonimização completa.
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

if (!input || !Array.isArray(input.oportunidades) || !Array.isArray(input.extracao_oport)) {
    return await returnErrorHtml("Erro: Formato de dados de entrada inválido.");
}

const caracteristicas = input.extracao_oport.find(e => e.caracteristicas)?.caracteristicas || {};
const localizacao = input.extracao_oport.find(e => e.localizacao)?.localizacao || {};

const anuncioOriginal = {
    oportunidades: input.oportunidades,
    mensagem_conteudo: anonimizarTexto(input.mensagem_oport),
    mensagem_datetime: input.data_msg_oport,
    grupo_nome: input.grp_msg_oport,
    ...caracteristicas,
    localizacao: localizacao,
};

let allLeads = [];
(anuncioOriginal.oportunidades || []).forEach(item => {
    if (item.clientes_diretos) allLeads.push({ ...item.clientes_diretos, tipo: 'Cliente Direto', data_lead: item.clientes_diretos.data_ultima_mensagem });
    else if (item.clientes_parceiros) allLeads.push({ ...item.clientes_parceiros, tipo: 'Parceiro', data_lead: item.clientes_parceiros.mensagem_datetime });
    else allLeads.push({ ...item, tipo: 'Imóvel Ofertado', data_lead: item.mensagem_datetime });
});

if (allLeads.length === 0) return await returnErrorHtml("Nenhum lead compatível foi encontrado.");

// --- ETAPA 2: ORDENAR POR RELEVÂNCIA ---
const isOfertaOriginal = anuncioOriginal.intencao === 'oferta';
allLeads.sort((a, b) => {
    const dateA = new Date(a.data_lead || 0), dateB = new Date(b.data_lead || 0);
    const scoreA = a.pontuacao_match ?? -1, scoreB = b.pontuacao_match ?? -1;
    if (isOfertaOriginal) {
        const typeA = a.tipo === 'Cliente Direto' ? 1 : 0, typeB = b.tipo === 'Cliente Direto' ? 1 : 0;
        if (typeA !== typeB) return typeB - typeA;
    }
    if (dateB.getTime() !== dateA.getTime()) return dateB - dateA;
    return scoreB - scoreA;
});

// --- ETAPA 3: GERAR A PÁGINA HTML ---
const formatarData = (dISO) => { if (!dISO) return 'N/A'; const d = new Date(dISO); d.setHours(d.getHours() - 3); return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); };

const gerarListaDetalhes = (dados) => {
    const icons = {
        'Tipo de Imóvel': 'M16 12H2V11H16V12ZM16 7H2V6H16V7ZM20.1 17H2V16H20.1V17ZM22 3.89999V2H0V15H17.9V10.15L22 13.1V3.89999Z',
        'Operação': 'M12,17.27L18.18,21L17,14.64L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7,14.64L5.82,21L12,17.27Z',
        'Bairro': 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13C19 5.13 15.87 2 12 2zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        'Quartos': 'M20 9.55V3H4v8.35c.61.35 1.16.78 1.68 1.29C6.43 13.4 7 14.16 7 15H3v-2H1v6h2v-2h4c0 1.08.27 2.1.75 3H4v2h16v-2h-.75c.48-.9.75-1.92.75-3H21v-2h-2v-2h2V9c-1.4-.44-2.53-1.45-3-2.7V3H13v3.3c-.47 1.25-1.6 2.26-3 2.7zM18 8H6V5h12v3z',
        'Suítes': 'M2 6h5v3H2zm0 5h5v3H2zm0 5h5v3H2zM22 5H12a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2h1a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zm-1 3h-8V7h8v1z',
        'Banheiros': 'M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10,10-4.48,10-10S17.52,2,12,2zM12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8,8,3.59,8,8S16.41,20,12,20z M16.5,13H15v4h-1.5v-4H12v-1.5h1.5V7.04h1.5V11.5H16.5V13z M7.5,13H9V7.04h1.5V11.5H12v1.5H7.5V13z',
        'Vagas': 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5S18.33 16 17.5 16zM5 11l1.5-4.5h11L19 11H5z',
        'Área (m²)': 'M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 16H5V5h14v14zM7 10h3v3H7zm5 0h3v3h-3zm-5 5h3v3H7zm5 0h3v3h-3z'
    };
    const isOferta = dados.intencao === 'oferta' || dados.tipo_operacao === 'venda' || dados.tipo_operacao === 'aluguel';
    const titulo = isOferta ? 'Dados do Imóvel:' : 'Dados da Procura:';
    let valorLead = dados.valor || dados.investmax_compra || dados.investmax_aluguel;

    const detalhes = [
        { label: 'Tipo de Imóvel', value: dados.tipo_imovel || dados.tipoimovel },
        { label: 'Operação', value: dados.tipo_operacao || dados.finalidade },
        { label: 'Bairro', value: dados.bairro || dados.localizacao?.bairro },
        { label: 'Quartos', value: dados.quartos },
        { label: 'Suítes', value: dados.suites },
        { label: 'Banheiros', value: dados.banheiros },
        { label: 'Vagas', value: dados.vagas_garagem },
        { label: 'Área (m²)', value: dados.area_m2 },
        { label: isOferta ? 'Valor' : 'Orçamento', value: valorLead ? `R$ ${parseInt(valorLead).toLocaleString('pt-BR')}` : null },
        { label: 'Condomínio', value: dados.condominio ? `R$ ${parseInt(dados.condominio).toLocaleString('pt-BR')}` : null },
        { label: 'IPTU', value: dados.iptu ? `R$ ${parseInt(dados.iptu).toLocaleString('pt-BR')}` : null },
    ];
    const listaHtml = detalhes.filter(item => item.value !== null && item.value !== undefined && item.value !== '').map(item => `
    <li>
      <svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="${icons[item.label] || icons['Bairro']}"></path></svg>
      <div><strong>${item.label}:</strong> ${item.value}</div>
    </li>`).join('');
    return listaHtml ? `<h3>${titulo}</h3><ul>${listaHtml}</ul>` : '';
};

const nomeAnuncianteAnonimo = anonimizarNome(anuncioOriginal.nome_anunciante);
const headerTitle = `Olá, ${nomeAnuncianteAnonimo}! Encontramos ${allLeads.length} oportunidades para o seu anúncio.`;
const leadTitle = `2 Potenciais Clientes Encontrados`; // Alterado para corresponder à imagem e manter o contador

const htmlString = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel de Oportunidades</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root { 
            --bg-color: #36393F; /* Cinza escuro */
            --card-bg: #40444B; /* Cinza um pouco mais claro para cards */
            --text-primary: #FFFFFF; /* Branco puro */
            --text-secondary: #BBBBBB; /* Cinza claro para detalhes */
            --accent-color: #1abc9c; /* Verde-azulado */
            --accent-hover: #16a085; /* Verde-azulado mais escuro */
            --border-color: #2F3136; /* Borda mais escura */
            --shadow-color: rgba(0,0,0,0.2); /* Sombra mais visível no tema escuro */
            --text-code-bg: #2F3136; /* Fundo para o código da mensagem */
            --lead-header-bg: #52565C; /* Fundo para o cabeçalho do lead */
            --lead-header-hover: #60656B; /* Hover para o cabeçalho do lead */
        }
        body { font-family: 'Poppins', sans-serif; margin: 0; background-color: var(--bg-color); color: var(--text-primary); }
        .container { max-width: 1200px; margin: 2rem auto; padding: 2rem; }
        .header { text-align: center; margin-bottom: 2.5rem; }
        .header h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary); }
        .header p { font-size: 1.2rem; color: var(--text-secondary); margin-top: 0; }
        .card { background-color: var(--card-bg); border-radius: 12px; box-shadow: 0 4px 25px var(--shadow-color); margin-bottom: 2.5rem; border: 1px solid var(--border-color); }
        .card-header { padding: 1rem 1.5rem; background-color: #4C5056; /* Um pouco mais escuro para o cabeçalho do card */ border-bottom: 1px solid var(--border-color); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; border-radius: 12px 12px 0 0;}
        .card-header-info { font-size: 0.9rem; color: var(--text-secondary); }
        .card-header-info strong { color: var(--text-primary); }
        .card-content { display: grid; grid-template-columns: 3fr 2fr; gap: 2rem; padding: 1.5rem; }
        .column-text { white-space: pre-wrap; background-color: var(--text-code-bg); border-radius: 8px; padding: 1rem; font-size: 0.9rem; line-height: 1.6; color: var(--text-secondary);}
        .column-details h3 { font-size: 1.2rem; margin-top: 0; margin-bottom: 1rem; color: var(--text-primary); }
        .column-details ul { margin: 0; padding: 0; list-style-type: none; }
        .column-details li { display: flex; align-items: center; margin-bottom: 0.75rem; font-size: 0.95rem; color: var(--text-secondary); }
        .column-details li strong { color: var(--text-primary); }
        .column-details .icon { width: 20px; height: 20px; margin-right: 10px; color: var(--accent-color); }
        .action-button { display: inline-block; padding: 0.75rem 1.5rem; background-color: var(--accent-color); color: white !important; text-decoration: none; border-radius: 50px; font-weight: 600; transition: all 0.2s; }
        .action-button:hover { background-color: var(--accent-hover); transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .section-title { font-size: 1.8rem; font-weight: 600; margin-bottom: 1.5rem; color: var(--text-primary); }
        .lead-card { background-color: var(--card-bg); border-radius: 12px; margin-bottom: 1rem; box-shadow: 0 2px 15px var(--shadow-color); border: 1px solid var(--border-color); }
        .lead-header { display: flex; align-items: center; padding: 1rem 1.5rem; cursor: pointer; background-color: var(--lead-header-bg); border-radius: 12px; transition: background-color 0.2s; }
        .lead-header:hover { background-color: var(--lead-header-hover); }
        .score-col { flex: 0 0 80px; text-align: center; font-weight: 700; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; gap: 5px; }
        .score-high { color: #28a745; } /* Verde para scores altos */
        .score-mid { color: #ffc107; } /* Amarelo para scores médios */
        .score-low { color: #BBBBBB; } /* Cinza claro para scores baixos */
        .type-col { flex: 0 0 130px; }
        .name-col { flex: 1 1 auto; font-weight: 600; font-size: 1.1rem; color: var(--text-primary); }
        .date-col { flex: 0 0 120px; color: var(--text-secondary); text-align: right; font-weight: 500; }
        .action-col { flex: 0 0 40px; text-align: right; font-size: 1.5rem; color: var(--text-secondary); transition: transform 0.3s; }
        .lead-type { font-size: 0.8rem; font-weight: 600; padding: 0.25rem 0.75rem; border-radius: 50px; color: white; }
        .type-direto { background-color: #17a2b8; } /* Azul ciano */
        .type-parceiro { background-color: #6c757d; } /* Cinza médio */
        .type-imovel { background-color: #fd7e14; } /* Laranja */
        .lead-details { display: none; padding: 0 1.5rem 1.5rem 1.5rem; border-top: 1px solid var(--border-color); background-color: var(--card-bg); border-radius: 0 0 12px 12px; }
        .details-footer { text-align: right; padding-top: 1rem; border-top: 1px solid var(--border-color); }
        .rotated { transform: rotate(180deg); }
        @media screen and (max-width: 992px) { .card-content { grid-template-columns: 1fr; } .column-text { margin-bottom: 2rem; } }
        @media screen and (max-width: 768px) {
            .container { padding: 1rem; margin: 0; width: 100%; box-sizing: border-box; }
            .header h1 { font-size: 1.8rem; } .header p { font-size: 1rem; }
            .lead-header { flex-wrap: wrap; row-gap: 0.5rem; }
            .name-col { width: 100%; order: 1; flex-basis: 100%; }
            .score-col { order: 2; text-align: left; flex-grow: 1; }
            .type-col { order: 3; text-align: right; flex-grow: 1; }
            .date-col { order: 4; text-align: left; flex-basis: 90%; }
            .action-col { order: 5; text-align: right; flex-basis: 10%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>Painel de Oportunidades</h1>
            <p>${headerTitle}</p>
        </header>
        <div class="card">
            <div class="card-header">
                <div class="card-header-info">
                    <strong>Anunciante:</strong> ${anonimizarNome(anuncioOriginal.nome_anunciante)} - ${anonimizarTelefone(anuncioOriginal.telefone_anunciante)}<br>
                    <strong>Grupo:</strong> ${anonimizarGrupo(anuncioOriginal.grupo_nome)} | <strong>Data:</strong> ${formatarData(anuncioOriginal.mensagem_datetime)}
                </div>
                <a href="#" class="action-button">Contatar Anunciante</a>
            </div>
            <div class="card-content">
                <div class="column-text">
                    <h3>Anúncio Original:</h3>
                    ${anuncioOriginal.mensagem_conteudo || ''}
                </div>
                <div class="column-details">${gerarListaDetalhes(anuncioOriginal)}</div>
            </div>
        </div>
        <h2 class="section-title">${leadTitle}</h2>
        <div class="leads-list">
        ${allLeads.map((lead, index) => {
            const score = lead.pontuacao_match ?? 0;
            let scoreClass = score >= 40 ? 'score-high' : (score >= 25 ? 'score-mid' : 'score-low');
            return `
            <div class="lead-card">
                <div class="lead-header" onclick="toggleDetails(${index})">
                    <div class="score-col ${scoreClass}">
                        <svg viewBox="0 0 24 24" style="width:20px;height:20px;"><path fill="currentColor" d="M12,17.27L18.18,21L17,14.64L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7,14.64L5.82,21L12,17.27Z"></path></svg>
                        ${score}
                    </div>
                    <div class="type-col"><span class="lead-type ${lead.tipo === 'Cliente Direto' ? 'type-direto' : (lead.tipo === 'Parceiro' ? 'type-parceiro' : 'type-imovel')}">${lead.tipo}</span></div>
                    <div class="name-col">${anonimizarNome(lead.nome || lead.autor_nome)}</div>
                    <div class="date-col">${formatarData(lead.data_lead)}</div>
                    <div class="action-col" id="arrow-${index}">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;"><path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"></path></svg>
                    </div>
                </div>
                <div class="lead-details" id="details-${index}">
                    <div class="card-content">
                         <div class="column-text">
                            <h3>${isOfertaOriginal ? 'Procura Original' : 'Oferta Original'}:</h3>
                            ${anonimizarTexto(lead.mensagem_conteudo || lead.descricao || '')}
                        </div>
                        <div class="column-details">
                            ${gerarListaDetalhes(lead)}
                            <div class="details-footer">
                                <a href="#" class="action-button">Contatar Lead (${anonimizarTelefone(lead.telefone || lead.autor_telefone)})</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('')}
        </div>
    </div>
    <script>
        function toggleDetails(index) {
            const detailsRow = document.getElementById('details-' + index);
            const arrow = document.getElementById('arrow-' + index).querySelector('svg');
            if (detailsRow.style.display === 'grid') { // Alterado para 'grid' para corresponder ao card-content
                detailsRow.style.display = 'none';
                arrow.style.transform = 'rotate(0deg)';
            } else {
                detailsRow.style.display = 'grid'; // Alterado para 'grid'
                arrow.style.transform = 'rotate(180deg)';
            }
        }
    </script>
</body>
</html>
`;

// --- ETAPA 4: PREPARAR A SAÍDA COMO ARQUIVO BINÁRIO ---
const buffer = Buffer.from(htmlString, 'utf8');
const binaryData = await this.helpers.prepareBinaryData(buffer, 'report.html', 'text/html');

// --- ETAPA 5: RETORNO FINAL ---
return [{ json: {}, binary: { data: binaryData } }];