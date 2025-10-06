/*
 * =================================================================================
 * == Gerador de Página de Leads v5.4 (Final com Anonimização de Conteúdo) ==
 * =================================================================================
 * Este script gera um painel de ação completo, responsivo e interativo.
 * v5.4: Adiciona a anonimização de dados sensíveis (telefones, nomes)
 * diretamente no corpo das mensagens para demonstrações seguras.
 * =================================================================================
 */

// --- FUNÇÕES DE ANONIMIZAÇÃO ---

const anonimizarNome = (nomeCompleto) => {
    if (!nomeCompleto || typeof nomeCompleto !== 'string') return 'Anunciante';
    const partes = nomeCompleto.trim().split(' ');
    return partes[0]; // Retorna apenas o primeiro nome
};

const anonimizarTelefone = (telefone) => {
    if (!telefone || typeof telefone !== 'string' || telefone.length < 4) return 'Oculto';
    const digitos = telefone.replace(/\D/g, ''); // Remove não-dígitos
    if (digitos.length < 4) return 'Oculto';
    const final = digitos.slice(-4);
    return `(**) *****-${final}`; // Ex: (**) *****-3192
};

const anonimizarGrupo = (nomeGrupo) => {
    if (!nomeGrupo) return 'Não informado';
    return 'Grupo Confidencial';
};

const anonimizarTexto = (texto) => {
    if (!texto || typeof texto !== 'string') return '';
    let textoAnonimo = texto;

    // 1. Anonimiza nomes no formato "Autor" (ex: **+55... - Nome Completo:**)
    const authorRegex = /(\*{2}.*?\s*-\s*)([A-Za-zÀ-ú\s]+)(:\*{2})/g;
    textoAnonimo = textoAnonimo.replace(authorRegex, (match, p1, p2, p3) => {
        return p1 + anonimizarNome(p2) + p3;
    });

    // 2. Anonimiza números de telefone no texto
    const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4}[-.\s]?\d{4}/g;
    textoAnonimo = textoAnonimo.replace(phoneRegex, (match) => {
        return anonimizarTelefone(match);
    });

    return textoAnonimo;
};


// --- ETAPA 1: RECEBER E PROCESSAR OS DADOS DE ENTRADA ---

const input = $input.first()?.json;

const returnErrorHtml = async (message) => {
    const errorHtml = `<html><body><h1>${message}</h1></body></html>`;
    const buffer = Buffer.from(errorHtml, 'utf8');
    const binaryData = await this.helpers.prepareBinaryData(buffer, 'error.html', 'text/html');
    return [{ json: {}, binary: { data: binaryData } }];
};

// Validação da nova estrutura de entrada
if (!input || !Array.isArray(input.oportunidades) || !Array.isArray(input.extracao_oport)) {
    return await returnErrorHtml("Erro: Formato de dados de entrada inválido ou nenhuma oportunidade/extração encontrada.");
}

// Unifica os dados do anúncio original em um único objeto para compatibilidade
const caracteristicas = input.extracao_oport.find(e => e.caracteristicas)?.caracteristicas || {};
const localizacao = input.extracao_oport.find(e => e.localizacao)?.localizacao || {};

const anuncioOriginal = {
    oportunidades: input.oportunidades,
    // Aplica a anonimização de conteúdo AQUI
    mensagem_conteudo: anonimizarTexto(input.mensagem_oport),
    mensagem_datetime: input.data_msg_oport,
    grupo_nome: input.grp_msg_oport,
    ...caracteristicas,
    localizacao: localizacao,
};

const todasAsOportunidades = anuncioOriginal.oportunidades;
let allLeads = [];

// Unifica os resultados e adiciona um campo de data padronizado para ordenação
if (todasAsOportunidades.length > 0 && (todasAsOportunidades[0].clientes_diretos || todasAsOportunidades[0].clientes_parceiros)) {
    for (const item of todasAsOportunidades) {
        if (item.clientes_diretos) {
            allLeads.push({ ...item.clientes_diretos, tipo: 'Cliente Direto', data_lead: item.clientes_diretos.data_ultima_mensagem });
        } else if (item.clientes_parceiros) {
            allLeads.push({ ...item.clientes_parceiros, tipo: 'Parceiro', data_lead: item.clientes_parceiros.mensagem_datetime });
        }
    }
} else {
    allLeads = todasAsOportunidades.map(item => ({ ...item, tipo: 'Imóvel Ofertado', data_lead: item.mensagem_datetime }));
}

if (allLeads.length === 0) {
    return await returnErrorHtml("Nenhum lead compatível foi encontrado para este anúncio.");
}

// --- ETAPA 2: ORDENAR POR RELEVÂNCIA (LÓGICA DUPLA) ---

const isOfertaOriginal = anuncioOriginal.intencao === 'oferta';

allLeads.sort((a, b) => {
    const dateA = a.data_lead ? new Date(a.data_lead) : new Date(0);
    const dateB = b.data_lead ? new Date(b.data_lead) : new Date(0);
    const scoreA = a.pontuacao_match ?? -1;
    const scoreB = b.pontuacao_match ?? -1;

    if (isOfertaOriginal) { // Se estamos buscando CLIENTES
        const typeA = a.tipo === 'Cliente Direto' ? 1 : 0;
        const typeB = b.tipo === 'Cliente Direto' ? 1 : 0;
        if (typeA !== typeB) return typeB - typeA;
        if (dateB.getTime() !== dateA.getTime()) return dateB - dateA;
        return scoreB - scoreA;
    } else { // Se estamos buscando IMÓVEIS
        if (dateB.getTime() !== dateA.getTime()) return dateB - dateA;
        return scoreB - scoreA;
    }
});

// --- ETAPA 3: GERAR A PÁGINA HTML ---

const formatarData = (dataISO) => {
    if (!dataISO) return 'Não informada';
    const data = new Date(dataISO);
    data.setHours(data.getHours() - 3); // Ajuste UTC-3
    return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const gerarListaDetalhes = (dados) => {
    const isOferta = dados.intencao === 'oferta' || dados.tipo_operacao === 'venda' || dados.tipo_operacao === 'aluguel';
    const titulo = isOferta ? 'Dados da Oferta:' : 'Dados da Procura:';
    let valorLead = dados.valor || dados.investmax_compra || dados.investmax_aluguel;

    const detalhes = [
        { label: 'Tipo de Imóvel', value: dados.tipo_imovel || dados.tipoimovel },
        { label: 'Operação', value: dados.tipo_operacao || dados.finalidade },
        { label: 'Bairro', value: dados.bairro || dados.localizacao?.bairro },
        { label: 'Região', value: dados.localizacao?.regiao },
        { label: 'Condomínio', value: dados.localizacao?.condominio },
        { label: 'Rua', value: dados.localizacao?.rua },
        { label: 'Quartos', value: dados.quartos },
        { label: 'Suítes', value: dados.suites },
        { label: 'Banheiros', value: dados.banheiros },
        { label: 'Vagas', value: dados.vagas_garagem },
        { label: 'Área (m²)', value: dados.area_m2 },
        { label: isOferta ? 'Valor' : 'Orçamento', value: valorLead ? `R$ ${parseInt(valorLead).toLocaleString('pt-BR')}` : null },
        { label: 'Condomínio', value: dados.condominio ? `R$ ${parseInt(dados.condominio).toLocaleString('pt-BR')}` : null },
        { label: 'IPTU', value: dados.iptu ? `R$ ${parseInt(dados.iptu).toLocaleString('pt-BR')}` : null },
    ];
    const listaHtml = detalhes.filter(item => item.value !== null && item.value !== undefined && item.value !== '').map(item => `<li><strong>${item.label}:</strong> ${item.value}</li>`).join('');
    return listaHtml ? `<strong>${titulo}</strong><ul>${listaHtml}</ul>` : '';
};

const tituloPrincipal = isOfertaOriginal
    ? "Oportunidade: Imóvel Oferecido e Potenciais Clientes Encontrados"
    : "Oportunidade: Cliente Procurando e Potenciais Imóveis Encontrados";
const tituloContador = isOfertaOriginal
    ? `${allLeads.length} Potenciais Clientes Encontrados`
    : `${allLeads.length} Potenciais Imóveis Encontrados`;

// Aplica a anonimização para os dados do anunciante principal
const nomeAnuncianteAnonimo = anonimizarNome(anuncioOriginal.nome_anunciante);
const telefoneAnuncianteAnonimo = anonimizarTelefone(anuncioOriginal.telefone_anunciante);
const grupoAnuncianteAnonimo = anonimizarGrupo(anuncioOriginal.grupo_nome);
const linkWhatsAppAnunciante = `#`; // Link desativado

const htmlString = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Painel de Oportunidades (Anônimo)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; background-color: #f4f7f6; color: #333; }
    .container { max-width: 1200px; margin: 20px auto; padding: 20px; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .main-title { font-size: 28px; color: #1a1a1a; text-align: center; margin-bottom: 20px; }
    .card { border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
    .card-subtitle { padding: 8px 15px; background-color: #f8f8f8; color: #555; font-size: 14px; border-bottom: 1px solid #ddd; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; }
    .card-subtitle-info { display: flex; flex-direction: column; }
    .card-content { display: flex; flex-wrap: wrap; padding: 15px; }
    .column { padding: 10px; box-sizing: border-box; }
    .column-text { flex: 60%; white-space: pre-wrap; font-family: monospace; background-color: #f0f0f0; border-radius: 4px; padding: 15px; }
    .column-details { flex: 40%; padding-left: 20px; }
    .column-details ul { margin: 0; padding: 0; list-style-type: none; }
    .column-details li { margin-bottom: 8px; font-size: 15px; }
    h1 { color: #1a1a1a; font-size: 24px; margin-top: 20px; border-bottom: 2px solid #e1e1e1; padding-bottom: 10px; }
    .action-button { display: inline-block; padding: 8px 16px; color: white !important; text-decoration: none; border-radius: 20px; font-weight: bold; font-size: 14px; transition: background-color 0.2s; cursor: pointer; border: none; margin: 4px; }
    .btn-contatar { background-color: #128C7E; } .btn-contatar:hover { background-color: #25D366; }
    .btn-marcar { background-color: #007bff; } .btn-marcar:hover { background-color: #0056b3; }
    .lead-header { display: flex; align-items: center; padding: 10px 15px; cursor: pointer; background-color: #cddff8; border-top: 1px solid #ddd; }
    .lead-header:hover { background-color: #b4c9e8; }
    .lead-header > div { padding: 0 10px; }
    .score-col { flex: 0 0 80px; text-align: center; font-weight: bold; font-size: 1.2em; }
    .score-high { color: #28a745; } .score-mid { color: #ffc107; } .score-low { color: #6c757d; }
    .type-col { flex: 0 0 130px; }
    .name-col { flex: 1 1 auto; font-weight: 500; }
    .date-col { flex: 0 0 150px; color: #555; text-align: right; font-weight: bold; }
    .action-col { flex: 0 0 50px; text-align: right; font-size: 24px; user-select: none; transition: transform 0.2s; }
    .lead-type { font-size: 0.9em; padding: 4px 8px; border-radius: 12px; color: white; text-align: center; display: inline-block; }
    .type-direto { background-color: #17a2b8; } .type-parceiro { background-color: #6c757d; } .type-imovel { background-color: #fd7e14; }
    .lead-details { display: none; }
    .details-footer { text-align: right; width: 100%; border-top: 1px solid #eee; padding: 10px 15px; background-color: #f8f8f8; box-sizing: border-box; }
    .rotated { transform: rotate(180deg); }
    
    @media screen and (max-width: 768px) {
      .container { padding: 10px; margin: 0; width: 100%; box-sizing: border-box; box-shadow: none; border-radius: 0; }
      .card-subtitle { flex-direction: column; align-items: flex-start; gap: 5px; }
      .card-subtitle-info { order: 1; }
      .card-subtitle .action-button { order: 2; margin-top: 10px; width: 100%; text-align: center; box-sizing: border-box; }
      .card-content { flex-direction: column; }
      .column-details { padding-left: 10px; padding-top: 20px; }
      .lead-header { flex-wrap: wrap; row-gap: 5px; }
      .name-col { width: 100%; flex-basis: 100%; order: 1; padding: 5px 0; font-size: 1.1em; }
      .score-col { flex: 1 1 50%; order: 2; text-align: left; padding-left: 0; }
      .type-col { flex: 1 1 50%; order: 3; text-align: right; padding-right: 0; }
      .date-col { flex: 1 1 90%; order: 5; text-align: left; padding-left: 0; font-weight: bold; }
      .action-col { flex: 1 1 10%; order: 4; }
      .details-footer { text-align: center; }
      .action-button { width: 100%; box-sizing: border-box; text-align: center; margin-bottom: 5px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="main-title">${tituloPrincipal}</h1>
    <div class="card">
      <div class="card-subtitle">
        <div class="card-subtitle-info">
          <span><strong>Grupo:</strong> ${grupoAnuncianteAnonimo} | <strong>Data:</strong> ${formatarData(anuncioOriginal.mensagem_datetime)}</span>
          <span><strong>Anunciante:</strong> ${nomeAnuncianteAnonimo} - ${telefoneAnuncianteAnonimo}</span>
        </div>
        <a href="${linkWhatsAppAnunciante}" target="_blank" class="action-button btn-contatar">Contatar Anunciante</a>
      </div>
      <div class="card-content">
        <div class="column column-text"><strong>Anúncio Original:</strong><br><br>${anuncioOriginal.mensagem_conteudo || ''}</div>
        <div class="column column-details">${gerarListaDetalhes(anuncioOriginal)}</div>
      </div>
    </div>
    <h1>${tituloContador}</h1>
    <div class="leads-list">
    ${allLeads.map((lead, index) => {
        const score = lead.pontuacao_match ?? 0;
        let scoreClass = 'score-low';
        if (score >= 40) scoreClass = 'score-high';
        else if (score >= 25) scoreClass = 'score-mid';

        // Aplica a anonimização para os dados de cada lead
        const nomeLeadAnonimo = anonimizarNome(lead.nome || lead.autor_nome);
        const telefoneLeadAnonimo = anonimizarTelefone(lead.telefone || lead.autor_telefone);
        const grupoLeadAnonimo = anonimizarGrupo(lead.grupo_nome);
        const tipoLead = lead.tipo;
        const tipoClass = tipoLead === 'Cliente Direto' ? 'type-direto' : (tipoLead === 'Parceiro' ? 'type-parceiro' : 'type-imovel');
        const linkWhatsAppLead = `#`; // Link desativado
        // Aplica a anonimização de conteúdo AQUI
        const mensagemLeadAnonima = anonimizarTexto(lead.mensagem_conteudo || lead.descricao || '');

        return `
          <div class="lead-card">
            <div class="lead-header" onclick="toggleDetails(${index})">
              <div class="score-col score ${scoreClass}">${score} ⭐</div>
              <div class="type-col"><span class="lead-type ${tipoClass}">${tipoLead}</span></div>
              <div class="name-col">${nomeLeadAnonimo}</div>
              <div class="date-col">${formatarData(lead.data_lead)}</div>
              <div class="action-col" id="arrow-${index}">▼</div>
            </div>
            <div class="lead-details" id="details-${index}">
                <div class="card-subtitle">
                    <strong>Grupo:</strong> ${grupoLeadAnonimo} | <strong>Data:</strong> ${formatarData(lead.data_lead)}
                </div>
                <div class="card-content">
                    <div class="column column-text">
                        <strong>${isOfertaOriginal ? 'Procura Original' : 'Oferta Original'}:</strong><br><br>
                        ${mensagemLeadAnonima}
                    </div>
                    <div class="column column-details">
                        ${gerarListaDetalhes(lead)}
                        <div class="details-footer">
                          <a href="${linkWhatsAppLead}" target="_blank" class="action-button btn-contatar">Contatar Lead (${telefoneLeadAnonimo})</a>
                          <button class="action-button btn-marcar" onclick="alert('Funcionalidade futura: Marcar como contatado')">Marcar Contato</button>
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
      const arrow = document.getElementById('arrow-' + index);
      if (detailsRow.style.display === 'block') {
        detailsRow.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
      } else {
        detailsRow.style.display = 'block';
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
return [{
    json: {},
    binary: {
        data: binaryData
    }
}];