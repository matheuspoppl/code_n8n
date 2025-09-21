// ===================================================================================
// === NÓ DE AUDITORIA - Intenção V3.0 ===
// ===================================================================================
// Alteração: A função 'auditarIntencaoEFiltrar' foi substituída pela V3.0.
// Esta versão utiliza uma lógica de âncoras de alta prioridade e vetos contextuais,
// baseada na análise detalhada dos casos de erro.

// --- 1. CONFIGURAÇÃO INICIAL ---
const extracaoInicial = $json.caracteristicas;
const mensagemOriginal = $('Loop Over Items3').item.json.caractbd.mensagem;

if (!extracaoInicial || !mensagemOriginal || typeof mensagemOriginal !== 'string') {
  return { caracteristicas: extracaoInicial || {} };
}

const anuncioCorrigido = JSON.parse(JSON.stringify(extracaoInicial));
// Variáveis globais para comparação no final da execução
const valorOriginal = extracaoInicial.valor;
const tipoOperacaoOriginal = extracaoInicial.tipo_operacao;


// --- 2. FUNÇÕES DE AJUDA ---

const parseNumero = (str, contexto = '') => {
    if (typeof str !== 'string') return null;
    let cleanStr = str.toLowerCase().trim().replace(/r\$|rs|\$|\s/g, '');
    if (/^\d\.\d{3}$/.test(cleanStr) && !/aluguel|locacao/i.test(contexto)) {
        return parseFloat(cleanStr.replace('.', '')) * 1000;
    }
    let multiplicador = 1;
    if (cleanStr.endsWith('mil')) { multiplicador = 1000; cleanStr = cleanStr.slice(0, -3); }
    else if (cleanStr.endsWith('k')) { multiplicador = 1000; cleanStr = cleanStr.slice(0, -1); }
    else if (cleanStr.includes('milh')) { multiplicador = 1000000; cleanStr = cleanStr.replace(/milh[aão|oes].*/, ''); }
    
    const dotCount = (cleanStr.match(/\./g) || []).length;
    if (dotCount > 1 && !cleanStr.includes(',')) {
        const lastDotIndex = cleanStr.lastIndexOf('.');
        const integerPart = cleanStr.substring(0, lastDotIndex).replace(/\./g, '');
        const decimalPart = cleanStr.substring(lastDotIndex + 1);
        cleanStr = `${integerPart}.${decimalPart}`;
    } else {
        cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    }

    const valor = parseFloat(cleanStr);
    return isNaN(valor) ? null : Math.round(valor * multiplicador);
};


// --- 3. AUDITORIAS MODULARES ---

const auditarValorImovel = () => {
    const textoCru = mensagemOriginal.replace(/~~/g, ' riscado ');
    let candidatos = [];
    const padroesDePreco = [
        /(?:agora|por|baixou para)\s*(?:r\$|rs)?\s*([\d.,\s]+milh[oõ]es|[\d.,\s]+milhao|[\d.,\s]+mil|[\d.,\s]+k|[\d.,\s]{2,})/gi,
        /(?:valor|preço|preco|venda|aluguel|investimento)\s*[:;]?\s*(?:r\$|rs)?\s*([\d.,\s]+milh[oõ]es|[\d.,\s]+milhao|[\d.,\s]+mil|[\d.,\s]+k|[\d.,\s]{2,})/gi,
        /(?:r\$|rs)\s*([\d.,\s]{4,}|[\d.,\s]*[.,][\d.,\s]*)/gi,
        /(?:valor|ate)\s*([\d\.\s]+)\s*(?:estourando|e|a)\s*([\d\.\s]+)/gi,
        /\b(\d{1,3}(?:\.\d{3}){2,},\d{2})\b|\b(\d{1,3}(?:\.\d{3}){2,})\b/g
    ];
    for (const regex of padroesDePreco) {
        let match;
        while ((match = regex.exec(textoCru))) {
            const fullMatchText = match[0].toLowerCase();
            for (let i = 1; i < match.length; i++) {
                if (match[i]) {
                    const valorStr = match[i];
                    const contextoCompleto = textoCru.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30);
                    const valorNum = parseNumero(valorStr, contextoCompleto);
                    if (valorNum && valorNum > 10) {
                        candidatos.push({
                            valor: valorNum, index: match.index, prioridade: /agora|por|baixou|final/i.test(fullMatchText) ? 1 : 2,
                            penalidade: /gasto|reforma|taxas\s*\d|debito/i.test(contextoCompleto.toLowerCase())
                        });
                    }
                }
            }
        }
    }
    const unicos = [...new Map(candidatos.map(item => [item.valor, item])).values()];
    let candidatosValidos = unicos.filter(c => !c.penalidade);
    if (candidatosValidos.length === 0) return;
    const eListaAluguel = /locaçao|aluguel/i.test(textoCru) && candidatosValidos.filter(c => c.valor < 80000).length > 2;
    if (eListaAluguel) { candidatosValidos.sort((a, b) => a.index - b.index); }
    else { candidatosValidos.sort((a, b) => { if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade; return b.valor - a.valor; }); }
    const vencedor = candidatosValidos[0];
    if (!vencedor) return;
    const deveCorrigir = (valorOriginal === null) || (vencedor.prioridade === 1 && vencedor.valor !== valorOriginal) || (candidatos.some(c => c.valor === valorOriginal && c.penalidade) && !vencedor.penalidade);
    if (deveCorrigir) { anuncioCorrigido.valor = vencedor.valor; }
};

// --- FUNÇÃO ATUALIZADA (V3.0 - Lógica Decisiva Final) ---
const auditarIntencaoEFiltrar = () => {
    const textoNormalizado = mensagemOriginal.toLowerCase().normalize('NFD').replace(/[\u0000-\u001F\u007F-\u009F]/g, "").replace(/[\u0300-\u036f]/g, '').replaceAll('\n',' ').trim();

    // 1. FILTRO DE ANÚNCIOS INVÁLIDOS
    const patternsInvalidos = /\b(piano|barratt & robinson|proposta for aceita|regras do grupo|por favor apague|jorge atacando de novo|golpes no mercado|recrutamento e treinamento|palestra sobre|quintoandar\.com\.br\/propostas|sou ponte)\b/i;
    if (patternsInvalidos.test(textoNormalizado)) {
        Object.keys(anuncioCorrigido).forEach(key => { if (!['nome_anunciante', 'telefone_anunciante'].includes(key)) { anuncioCorrigido[key] = null; } });
        return false;
    }
    if (textoNormalizado.includes('instagram.com/') && mensagemOriginal.length < 150) {
        Object.keys(anuncioCorrigido).forEach(key => { if (!['nome_anunciante', 'telefone_anunciante'].includes(key)) { anuncioCorrigido[key] = null; } });
        return false;
    }

    // 2. SISTEMA DE PONTUAÇÃO HÍBRIDO (V3.0)
    let intencaoScore = 0;
    
    // --- ÂNCORAS E PALAVRAS-CHAVE ---

    // ANCHOR_PROCURA: Termos inequívocos que garantem a intenção de PROCURA.
    const ANCHOR_PROCURA = new RegExp(`\\b(cliente procurando|cliente procura|cliente precisa|cliente precisando|cliente buscando|cliente busca|temos cliente|cliente direto|cliente compra|cliente comprando|cliente quer|cliente querendo|cliente necessita|cliente necessitando|preciso de|precisa de|precisando de|` +
                                     `(vc|voce) tem (para|pra) (venda|aluguel)|` +
                                     `(vc|voce) tem (apart|cobertura|casa)|` +
                                     `alguem\\s?\\?)\\b`, 'i');

    // T_PROCURA_GERAL: Termos gerais que aumentam a pontuação de PROCURA.
    const T_PROCURA_GERAL = /\b(procuro|procura|procurando|busco|busca|buscando|preciso|precisa|precisando|necessito|necessita|necessitando|quem tiver|alguem tem|alguem com|vc tem|voce tem|cliente procurando|cliente procura|cliente precisa|cliente precisando|cliente buscando|cliente busca|temos cliente|cliente direto|cliente compra|cliente comprando|cliente quer|cliente querendo|cliente necessita|cliente necessitando|preciso de|precisa de|precisando de|)\b/i;

    // ANCHOR_OFERTA: Termos que garantem a intenção de OFERTA.
    const ANCHOR_OFERTA = /\b(vendo|vende-se|aluga-se|disponivel para|oportunidade|lançamento|imperdivel|exclusividade|seguem? minhas opçoes)\b/i;
    
    // TERMOS AMBÍGUOS: Palavras que podem aparecer nos dois contextos.
    const T_OFERTA_AMBIGUO = /\b(venda|aluguel|locaçao)\b/i;
    const PROCURA_VETO = /\b(quem tiver cliente|chamar no reservado)\b/i;

    // --- Aplicação dos Pesos ---
    let procuraAncorada = false;
    let ofertaAncorada = false;

    if (ANCHOR_PROCURA.test(textoNormalizado)) {
        intencaoScore += 200;
        procuraAncorada = true;
    }
    if (T_PROCURA_GERAL.test(textoNormalizado)) {
        intencaoScore += 75;
    }

    if (ANCHOR_OFERTA.test(textoNormalizado)) {
        intencaoScore -= 200;
        ofertaAncorada = true;
    }
    
    // LÓGICA DE VETO: Se o anúncio começa como OFERTA, "quem tiver cliente" reforça a oferta.
    if (ofertaAncorada && PROCURA_VETO.test(textoNormalizado)) {
        intencaoScore -= 50;
    }
    
    // LÓGICA DE VETO: Se é uma PROCURA clara, a presença de "venda" ou "aluguel" tem peso quase nulo.
    if (T_OFERTA_AMBIGUO.test(textoNormalizado)) {
        intencaoScore -= (procuraAncorada ? 5 : 60);
    }
    
    // --- Heurísticas Finais ---
    if (mensagemOriginal.includes('?')) {
        intencaoScore += 20;
    }
    // A heurística de 'valor nulo' retorna com peso baixo, pois ajuda em casos específicos.
    if (anuncioCorrigido.valor === null && !/trabalhamos com|atuamos com|consultoria/i.test(textoNormalizado)) {
        intencaoScore += 30;
    }
    if (/parceria/i.test(textoNormalizado) && !procuraAncorada) {
        intencaoScore -= 50;
    }

    // --- 3. DECISÃO FINAL ---
    if (intencaoScore > 40) { 
        anuncioCorrigido.intencao = 'procura'; 
    } else if (intencaoScore < -40) { 
        anuncioCorrigido.intencao = 'oferta'; 
    }

    return true;
};

const auditarTaxas = () => {
    const textoCru = mensagemOriginal;
    let iptuCorrigido = null;
    if (/iptu\s*(isento|isenta)/i.test(textoCru)) {
        iptuCorrigido = 0;
    } else {
        const regexIptu = /(iptu\s*[:;.]?\s*(?:r\$|rs)?\s*([\d.,]+)|([\d.,]+)\s*de\s*iptu)[\s\S]{0,15}(anual|ano|\/ano|m[eê]s|mensal|cota|parcelado em (\d+)\s*x)/i;
        const match = textoCru.match(regexIptu);
        if (match) {
            const valorStr = match[2] || match[3];
            let valor = parseNumero(valorStr);
            if (valor) {
                const contexto = match[0].toLowerCase();
                const parcelas = match[5] ? parseInt(match[5], 10) : 12;
                if (/anual|ano|\/ano/.test(contexto)) { iptuCorrigido = Math.round(valor / 12); }
                else if (/parcelado em/.test(contexto) || /cota/.test(contexto)) {
                    const divisor = parcelas > 1 ? parcelas : 10;
                    const matchTotal = contexto.match(/([\d.,]+)\/ano, parcelado/);
                    if (matchTotal) { const valorTotal = parseNumero(matchTotal[1]); iptuCorrigido = Math.round(valorTotal / divisor); }
                    else { iptuCorrigido = valor; }
                } else if (valor > 2500 && !/m[eê]s|mensal/.test(contexto)) { iptuCorrigido = Math.round(valor / 12); }
                else { iptuCorrigido = valor; }
            }
        }
    }
    let condCorrigido = null;
    const regexCond = /(?:condom[ií]nio|cond\.?|taxas)\s*[:;]?\s*(?:r\$|rs)?\s*([\d.,]+)/i;
    const matchCond = textoCru.match(regexCond);
    if (matchCond) {
        const valor = parseNumero(matchCond[1]);
        if (valor && valor > 50 && valor < 30000 && anuncioCorrigido.valor && valor < anuncioCorrigido.valor) {
            condCorrigido = valor;
        }
    }
    if (iptuCorrigido !== null) anuncioCorrigido.iptu = iptuCorrigido;
    if (condCorrigido !== null) anuncioCorrigido.condominio = condCorrigido;
};

const auditarTipoImovel = () => {
    const textoNormalizado = mensagemOriginal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/\b(cobertura|duplex|triplex)\b/.test(textoNormalizado)) { anuncioCorrigido.tipo_imovel = 'Cobertura'; }
    else if (/\b(sala comercial|loja|galpao|ponto comercial|corporate|offices|casa comercial)\b/.test(textoNormalizado)) { anuncioCorrigido.tipo_imovel = 'Imóvel Comercial'; }
    else if (/\b(casa|sobrado|mansao)\b/.test(textoNormalizado)) {
        if (!/\b(comercial)\b/.test(textoNormalizado)) { anuncioCorrigido.tipo_imovel = 'Casa'; }
        else { anuncioCorrigido.tipo_imovel = 'Imóvel Comercial'; }
    } else if (/\b(apartamento|apto|ap\s|quarto e sala|sala e quarto|garden|flat|studio)\b/.test(textoNormalizado)) { anuncioCorrigido.tipo_imovel = 'Apartamento'; }
    else if (/\b(terreno|lote)\b/.test(textoNormalizado)) { anuncioCorrigido.tipo_imovel = 'Terreno'; }
    else if (anuncioCorrigido.tipo_imovel === null && (/\d+\s*qto?s?/.test(textoNormalizado) || anuncioCorrigido.quartos > 0)) {
         if (/\b(duplex|triplex)\b/.test(textoNormalizado)) { anuncioCorrigido.tipo_imovel = 'Cobertura'; }
         else { anuncioCorrigido.tipo_imovel = 'Apartamento'; }
    }
};

const auditarComodos = () => {
    const textoNormalizado = mensagemOriginal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let quartosCount = 0;
    let suitesCount = 0;
    
    const regexQuartos = /(\d+)\s*(?:quartos|qtos|qto|q)\b/g;
    const regexSuites = /(\d+)\s*(?:suites|suite|stes)\b/g;
    
    let match;
    while ((match = regexQuartos.exec(textoNormalizado))) {
        const num = parseInt(match[1], 10);
        if (num > quartosCount) quartosCount = num;
    }
    
    while ((match = regexSuites.exec(textoNormalizado))) {
        const num = parseInt(match[1], 10);
        if (num > suitesCount) suitesCount = num;
    }

    if (/\b(quarto e sala|sala e quarto)\b/.test(textoNormalizado)) { quartosCount = Math.max(quartosCount, 1); }

    const matchRevertido = textoNormalizado.match(/original\s*(\d+)\s*quartos.*?(?:hoje com|transformados em|revertido para)\s*(\d+)/);
    if (matchRevertido) {
        quartosCount = parseInt(matchRevertido[2], 10);
    }
    
    const temDependencia = /\b(dependencia completa|dep\. completa|dependencia reversivel|quarto de empregada)\b/.test(textoNormalizado);
    
    let contagemBase = quartosCount > 0 ? quartosCount : suitesCount;
    
    if (temDependencia && contagemBase > 0) {
        if (!/\d\s*\+\s*dep/.test(textoNormalizado)) {
             contagemBase += 1;
        }
    }
    
    if (contagemBase > 0) {
        anuncioCorrigido.quartos = contagemBase;
    }
};


// --- 5. EXECUÇÃO ---
auditarValorImovel();
const adValido = auditarIntencaoEFiltrar();

if (adValido) {
    auditarTaxas();
    auditarTipoImovel();
    auditarComodos();

    // Validação Final Simples
    if (anuncioCorrigido.valor && anuncioCorrigido.condominio && anuncioCorrigido.condominio >= anuncioCorrigido.valor) {
        anuncioCorrigido.condominio = null;
    }
    
    // Ajuste Fino do Tipo de Operação
    if (anuncioCorrigido.valor && anuncioCorrigido.valor !== valorOriginal) {
        if (anuncioCorrigido.valor >= 80000) {
            if(tipoOperacaoOriginal !== 'venda') anuncioCorrigido.tipo_operacao = 'venda';
        } else if (anuncioCorrigido.valor > 0) {
            if(tipoOperacaoOriginal !== 'aluguel') anuncioCorrigido.tipo_operacao = 'aluguel';
        }
    }
}

// --- 6. RETORNO DOS DADOS ---
return { caracteristicas: anuncioCorrigido };