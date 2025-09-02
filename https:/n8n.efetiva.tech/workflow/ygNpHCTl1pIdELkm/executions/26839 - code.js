const conteudo = $json.mensagem_conteudo;

if (!conteudo || typeof conteudo !== 'string') {
  return { caracteristicas: {} };
}

// --- 1. FUNÇÕES DE AJUDA REUTILIZÁVEIS ---
const normalizeText = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[*:🚨_~]/g, '') // remove markdown and emojis
    .replace(/\s+/g, ' ')
    .trim();
};
const parseNumber = (str) => {
  if (typeof str !== 'string') return null;
  const cleanStr = str.replace(/\./g, '').replace(',', '.');
  const value = parseFloat(cleanStr);
  return isNaN(value) ? null : value;
};
const wordsToNumMap = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };

// --- 2. INICIALIZAÇÃO ---
const textoNormalizado = normalizeText(conteudo);
const anuncio = {
  nome_anunciante: null, telefone_anunciante: null, intencao: null,
  tipo_operacao: null, tipo_imovel: null, quartos: null,
  suites: null, banheiros: null, vagas_garagem: null,
  area_m2: null, valor: null, iptu: null, condominio: null,
};

// --- 3. LÓGICA DE EXTRAÇÃO DETALHADA ---

// 3.1 NOME E TELEFONE DO ANUNCIANTE
(() => {
    const phoneMatch = conteudo.match(/\+55\s?(?:\(?(\d{2})\)?\s?)?(?:9\s?|\s?9)?\s?(\d{4,5})[-.\s]?(\d{4})/);
    if (phoneMatch) {
        const ddd = phoneMatch[1] || '';
        const part1 = phoneMatch[2] || '';
        const part2 = phoneMatch[3] || '';
        const fullPhone = `55${ddd}${part1}${part2}`.replace(/\D/g, '');
        if (fullPhone.length >= 12) anuncio.telefone_anunciante = fullPhone;

        const phoneStr = phoneMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameRegex = new RegExp(`${phoneStr}\\s*[-\\s]+([^:\\r\\n]+?)\\s*[:\\r\\n]`, 'i');
        const nameMatch = conteudo.match(nameRegex);
        if (nameMatch && nameMatch[1]) {
            let nome = nameMatch[1].trim().replace(/\d+/g, '').replace(/(?:creci|cna[ai]|corretor|imoveis).*/i, '').trim();
            if (nome.length >= 2) anuncio.nome_anunciante = nome;
        }
    }
})();

// 3.2 INTENÇÃO (Procura vs Oferta)
(() => {
    const procuraRegex = /\b(procuro|procura|preciso|busco|buscando|cliente (busca|procura)|alguem com|necessito|gostaria de)\b/;
    if (procuraRegex.test(textoNormalizado)) { anuncio.intencao = 'procura'; return; }
    const ofertaExplicitaRegex = /\b(vendo|alugo|venda|locacao|oportunidade|vende-se|aluga-se|porteira fechada|disponivel para)\b/;
    if (ofertaExplicitaRegex.test(textoNormalizado)) { anuncio.intencao = 'oferta'; return; }
    const ofertaFeatures = [/r\s*\$/, /\b\d+\s*m(2|²)/, /\b\d+\s*(quarto|qto|suite)/, /\b(cod|codigo|ref|ap)\d+/, /https?:/];
    let featureCount = 0;
    for (const feature of ofertaFeatures) { if (feature.test(textoNormalizado)) featureCount++; }
    if (featureCount >= 2) { anuncio.intencao = 'oferta'; return; }
    anuncio.intencao = 'oferta';
})();

// 3.3 VALOR PRINCIPAL e 3.4 TIPO DE OPERAÇÃO (Lógica Unificada e Corrigida)
(() => {
    // Etapa A: Coleta de todos os candidatos a valor
    const candidatos = [];
    let match;

    // Estratégia 1: Sufixos (mil, milhão, etc.)
    const regexSufixo = /(?:r\$|rs|\$|valor|preco|preço|investimento|venda|ate|até)?\s*:?\s*\*?\s*([\d.,]+)\s*(mm|milhoes|milhao|kk|k|mil)\b/gi;
    while ((match = regexSufixo.exec(textoNormalizado))) {
        const context = textoNormalizado.substring(Math.max(0, match.index - 20), match.index);
        if (/\b(iptu|condominio|cond)\b/.test(context)) continue;
        
        let numeroBase;
        const sufixo = match[2].toLowerCase().replace('ões', 'oes').replace('ão', 'ao');

        if (['m', 'mm', 'milhoes', 'milhao', 'kk'].includes(sufixo)) {
            numeroBase = parseFloat(match[1].replace(',', '.'));
        } else {
            numeroBase = parseNumber(match[1]);
        }
        
        if (!isNaN(numeroBase)) {
            if (['k', 'mil'].includes(sufixo)) candidatos.push(numeroBase * 1000);
            else if (['m', 'mm', 'milhoes', 'milhao', 'kk'].includes(sufixo)) candidatos.push(numeroBase * 1000000);
        }
    }

    // Estratégia 2: Keywords sem sufixo
    const regexKeyword = /(?:valor|preco|preço|investimento|venda|ate|até|r\$|rs|\$)\s*:?\s*\*?\s*([\d.,]+)/gi;
    while ((match = regexKeyword.exec(textoNormalizado))) {
        const context = textoNormalizado.substring(Math.max(0, match.index - 20), match.index);
        if (/\b(iptu|condominio|cond)\b/.test(context)) continue;
        const nextChars = textoNormalizado.substring(match.index + match[0].length, match.index + match[0].length + 8).trim();
        if (['k', 'mil', 'm', 'mm', 'milhao', 'milhoes'].some(suf => nextChars.startsWith(suf))) continue;
        const valor = parseNumber(match[1]);
        if (valor) candidatos.push(valor);
    }
    
    // Estratégia 3: Números grandes bem formatados, sem keywords
    const regexGrandes = /(?<!\d[.,])(\d{1,3}(\.\d{3})+,\d{2}|\d{1,3}(\.\d{3}){2,})(?![.,]\d)/g;
    while ((match = regexGrandes.exec(textoNormalizado))) {
        const context = textoNormalizado.substring(Math.max(0, match.index - 30), match.index);
        if (/\b(valor|preco|preço|investimento|venda|ate|até|r\$|rs|\$|iptu|condominio|cond)\b/.test(context)) continue;
        const valor = parseNumber(match[0]);
        if (valor) candidatos.push(valor);
    }
    
    const uniqueCandidatos = [...new Set(candidatos)];

    // Etapa B: Determinar tipo de operação
    const kwAluguel = /\b(aluguel|aluga-se|locacao|alugo|locar|temporada)\b/;
    const kwVenda = /\b(venda|vendo|vende-se|a venda|compra|comprar|investidor)\b/;

    if (kwAluguel.test(textoNormalizado)) {
        anuncio.tipo_operacao = 'aluguel';
    } else if (kwVenda.test(textoNormalizado)) {
        anuncio.tipo_operacao = 'venda';
    } else if (uniqueCandidatos.length > 0) {
        const maxCandidato = Math.max(...uniqueCandidatos);
        if (maxCandidato >= 80000) {
            anuncio.tipo_operacao = 'venda';
        } else if (maxCandidato > 0) {
            anuncio.tipo_operacao = 'aluguel';
        }
    }

    // Etapa C: Filtrar e selecionar o valor principal
    if (uniqueCandidatos.length > 0) {
        let validos;
        if (anuncio.tipo_operacao === 'aluguel') {
            validos = uniqueCandidatos.filter(v => v >= 500 && v < 80000);
        } else { // Venda ou indefinido
            validos = uniqueCandidatos.filter(v => v >= 80000 && v < 200000000);
        }
        
        if (validos.length === 0 && anuncio.intencao === 'procura') {
           validos = uniqueCandidatos.filter(v => v > 1000 && v < 200000000);
        }

        if (validos.length > 0) {
            anuncio.valor = Math.max(...validos);
        }
    }
})();


// 3.5 TIPO DE IMÓVEL
(() => {
    if (/\b(cobertura|triplex)\b/.test(textoNormalizado)) anuncio.tipo_imovel = 'Cobertura';
    else if (/\b(casa|sobrado|mansao|chacara|sitio)\b/.test(textoNormalizado)) anuncio.tipo_imovel = 'Casa';
    else if (/\b(apartamento|apto|ap |studio|kitnet|quitinete|flat|garden|andar|edificio|predio)\b/.test(textoNormalizado)) anuncio.tipo_imovel = 'Apartamento';
    else if (/\b(loja|salas? comercia(l|is)|ponto comercial|galpao|laje corporativa|escritorio|clinica)\b/.test(textoNormalizado)) anuncio.tipo_imovel = 'Imóvel Comercial';
    else if (/\b(terreno|lote|gleba)\b/.test(textoNormalizado)) anuncio.tipo_imovel = 'Terreno';
    else if (/\b\d+\s*(quarto|qto|suite)s?\b/.test(textoNormalizado)) anuncio.tipo_imovel = 'Apartamento';
})();

// 3.6 SUÍTES (Lógica Robusta Restaurada)
(() => {
    const candidatos = [];
    let match;
    const regexes = [
        // Prioridade 1: "sendo 3 suítes", "com 2 suítes"
        /\b(?:sendo|com|possui|tem)\s*(\d{1,2}|uma|um|duas|dois|tres|quatro)\s*(?:quartos?\s*)?(suites?|ste?s?)\b/g,
        // Prioridade 2: "3 suítes" ou "2 quartos suítes"
        /\b(\d{1,2}|uma|um|duas|dois|tres|quatro)\s*(?:quartos?\s*)?(suites?|ste?s?)\b/g,
        // Prioridade 3: "suítes: 2"
        /\b(suites?|ste?s?)\s*:?\s*(\d{1,2})\b/g,
    ];

    for (const re of regexes) {
        re.lastIndex = 0; // Resetar o índice para regex global
        while ((match = re.exec(textoNormalizado))) {
            const numStr = match[1] || match[2];
            const num = wordsToNumMap[numStr] || parseInt(numStr, 10);
            if (num) candidatos.push(num);
        }
    }
    
    if (candidatos.length > 0) {
        anuncio.suites = Math.max(...candidatos);
    } else if (/\b(suite)\b/.test(textoNormalizado)) {
        anuncio.suites = 1;
    }
})();

// 3.7 QUARTOS (Lógica Robusta Restaurada)
(() => {
    const candidatos = [];
    let match;
    const regexes = [
        // Regex corrigida para capturar com adjetivos no meio
        /\b(\d{1,2}|uma|um|duas|dois|tres|quatro)\s*(?:espacosos?|amplos?)?\s*(quartos?|qts?|qtos?|dormitorios?|q)\b/g,
        /\b(quartos?|qts?|qtos?|dormitorios?)\s*:?\s*(\d{1,2})\b/g
    ];

    for (const re of regexes) {
        re.lastIndex = 0;
        while ((match = re.exec(textoNormalizado))) {
            const numStr = match[1] || match[2];
            const num = wordsToNumMap[numStr] || parseInt(numStr, 10);
            if (num) candidatos.push(num);
        }
    }

    if (/\b(quarto e sala|sala e quarto)\b/.test(textoNormalizado)) candidatos.push(1);

    const reversibleMatch = textoNormalizado.match(/(\d+)\s*quartos\s*\+\s*1\s*quarto\s*reversivel/);
    if(reversibleMatch) candidatos.push(parseInt(reversibleMatch[1], 10) + 1);
    
    if (candidatos.length > 0) anuncio.quartos = Math.max(...candidatos);
    
    if (anuncio.suites > 0) {
      if (anuncio.quartos === null || anuncio.quartos < anuncio.suites) {
          anuncio.quartos = anuncio.suites;
      }
    }
})();

// 3.8 BANHEIROS (Lógica Robusta Final Aprimorada)
(() => {
    if (/\b(sem|s\/)\s*banheiro/.test(textoNormalizado)) {
        anuncio.banheiros = 0;
        return;
    }

    const totalMatch = textoNormalizado.match(/(\d+)\s*banheiros?\s*(?:no\s*)?total|total\s*(?:de\s*)?(\d+)\s*banheiros?/);
    if (totalMatch) {
        const totalNum = parseInt(totalMatch[1] || totalMatch[2], 10);
        if (totalNum > 0) {
            anuncio.banheiros = totalNum;
            return;
        }
    }

    const counts = {
        suite: anuncio.suites || 0,
        lavabo: 0,
        social: 0,
        servico: 0,
        generic: 0,
    };
    
    const extractMaxCount = (regex) => {
        let maxCount = 0;
        let match;
        regex.lastIndex = 0;
        while ((match = regex.exec(textoNormalizado))) {
            const numStr = match[1] || match[2] || match[3];
            const num = wordsToNumMap[numStr] || parseInt(numStr, 10);
            if (num > maxCount) maxCount = num;
        }
        return maxCount;
    };
    
    counts.social = extractMaxCount(/(\d+|uma|um|duas|dois)\s*banheiros?\s*socia(l|is)/g);
    counts.servico = extractMaxCount(/(\d+|uma|um|duas|dois)\s*banheiro\s*de\s*servico/g);
    counts.lavabo = extractMaxCount(/(\d+|uma|um|duas|dois)\s*lavabo/g);
    counts.generic = extractMaxCount(/(?:mais\s*)?(\d+|uma|um|duas|dois)\s*banheiros?(?!\s*socia|\s*de\s*servico)/g);

    if (counts.lavabo === 0 && /\b(lavabo)\b/.test(textoNormalizado)) counts.lavabo = 1;
    if (counts.social === 0 && /\b(banheiro\s*social)\b/.test(textoNormalizado)) counts.social = 1;
    if (counts.servico === 0 && /\b(banheiro\s*de\s*servico|area de servico com banheiro|dependencia completa)\b/.test(textoNormalizado)) counts.servico = 1;
    
    const sumOfParts = counts.suite + counts.lavabo + counts.social + counts.servico;
    let finalCount = Math.max(sumOfParts, counts.generic);

    const isResidential = anuncio.tipo_imovel && ['Apartamento', 'Casa', 'Cobertura'].includes(anuncio.tipo_imovel);
    
    const onlySuitesFound = counts.suite > 0 && (counts.lavabo + counts.social + counts.servico + counts.generic) === 0;
    if (isResidential && onlySuitesFound) {
       finalCount = counts.suite + 1;
    }

    const isResidentialMultiBedroom = isResidential && anuncio.quartos && anuncio.quartos > 1;
    if(isResidentialMultiBedroom && finalCount === 1 && counts.servico === 1 && counts.suite === 0 && counts.social === 0 && counts.lavabo === 0) {
        finalCount = 2; // Adiciona o banheiro social implícito
    }
    
    const needsBathroom = anuncio.tipo_imovel && ['Apartamento', 'Casa', 'Cobertura', 'Imóvel Comercial'].includes(anuncio.tipo_imovel);
    if (finalCount === 0 && needsBathroom) {
        finalCount = 1;
    }

    if (finalCount > 0) {
        anuncio.banheiros = finalCount;
    }
})();

// 3.9 VAGAS DE GARAGEM (Lógica Robusta Restaurada)
(() => {
    if (/\b(sem|nenhuma|nao possui|nao tem)\s+(vaga|garagem)\b/.test(textoNormalizado)) {
        anuncio.vagas_garagem = 0;
        return;
    }
    const candidatos = [];
    let match;

    const regexes = [
        /\b(\d{1,2})\s*(?:vagas?|vaga|garagens?|garagem)\b/g,
        /\b(?:vagas?|vaga|garagens?|garagem)\s*[:=-]?\s*(\d{1,2})\b/g,
        /\b(?:vagas?|vaga|garagens?|garagem)?\s*(?:para\s*)?(\d{1,2})\s*(?:carros?|carro)\b/g
    ];
    for (const re of regexes) {
        re.lastIndex = 0;
        while ((match = re.exec(textoNormalizado))) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num)) candidatos.push(num);
        }
    }

    const specialMap = { dupla: 2, tripla: 3 };
    const reSpecial = /\bvaga\s+(dupla|tripla)\b/g;
    while ((match = reSpecial.exec(textoNormalizado))) {
        candidatos.push(specialMap[match[1]]);
    }
    
    const reWords = new RegExp("\\b(" + Object.keys(wordsToNumMap).join('|') + ")\\s*(?:vagas?|vaga|garagens?|garagem)\\b", "g");
    while ((match = reWords.exec(textoNormalizado))) {
        candidatos.push(wordsToNumMap[match[1]]);
    }

    if (candidatos.length > 0) {
        anuncio.vagas_garagem = Math.max(...candidatos);
    } else if (/\b(vaga na garagem|vaga de garagem|vaga na escritura)\b/.test(textoNormalizado)) {
        anuncio.vagas_garagem = 1;
    }
})();

// 3.10 ÁREA (m²)
(() => {
    const candidatos = [];
    const regexGeral = /([\d.,]+)\s*(m2|m²|metros\s*quadrados|metros|m)(?!\w)/gi;
    let match;
    while ((match = regexGeral.exec(textoNormalizado))) {
        const valor = parseNumber(match[1]);
        if (!valor || valor <= 10 || valor >= 5000) continue;
        const unidade = match[2];
        let prioridade = 2;
        let ehValido = true;
        if (['m2', 'm²', 'metros quadrados'].includes(unidade)) prioridade = 1;
        else {
            const snippet = textoNormalizado.substring(Math.max(0, match.index - 40), match.index + 40);
            if (/\b(praia|metro|shopping|rua)\b/.test(snippet)) ehValido = false;
        }
        if (ehValido) candidatos.push({ valor: Math.round(valor), prioridade });
    }
    if (candidatos.length > 0) {
        candidatos.sort((a, b) => a.prioridade - b.prioridade || b.valor - a.valor);
        anuncio.area_m2 = candidatos[0].valor;
    }
})();

// 3.11 IPTU e CONDOMÍNIO
const extractTax = (keyword) => {
    const regex = new RegExp(`(?:${keyword})(?:[\\s\\w:.-]*)?(?:r\\$|rs)?\\s*([\\d.,]+)`, 'gi');
    let match;
    const candidatos = [];
    while ((match = regex.exec(textoNormalizado))) {
        let taxValue = parseNumber(match[1]);
        if (taxValue) {
            if (anuncio.valor && taxValue >= anuncio.valor) continue;
            const context = textoNormalizado.substring(match.index, match.index + match[0].length + 15);
            if (/\b(anual|ano)\b/.test(context)) taxValue /= 12;
            candidatos.push(Math.round(taxValue));
        }
    }
    return candidatos.length > 0 ? Math.min(...candidatos) : null;
};
anuncio.iptu = extractTax('iptu');
anuncio.condominio = extractTax('condominio|cond\\.?|cota');

// --- 4. RETORNO DOS DADOS ---
return { caracteristicas: anuncio };