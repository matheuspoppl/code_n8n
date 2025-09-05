// Verifica se o campo de entrada existe e é uma string.
// Se não for, retorna um objeto vazio para evitar erros no fluxo do n8n.
if (!$json.caractbd.mensagem || typeof $json.caractbd.mensagem !== 'string') {
  return { caracteristicas: {} };
}

const conteudo = $json.caractbd.mensagem;

// --- 1. FUNÇÕES DE AJUDA REUTILIZÁVEIS ---

/**
 * Normaliza e limpa o texto para facilitar a extração com regex.
 * - Converte para minúsculas.
 * - Remove acentos.
 * - Remove caracteres de formatação do WhatsApp (negrito, itálico, etc.) e emojis comuns.
 * - Consolida múltiplos espaços em um só.
 * @param {string} str O texto original do anúncio.
 * @returns {string} O texto limpo e normalizado.
 */
const normalizeText = (str) => {
  if (!str) return '';
  return str
    // CORREÇÃO DEFINITIVA: Remove TODOS os asteriscos (*) do texto antes de qualquer outra etapa.
    // Isso garante que a formatação de negrito não interfira em nenhuma das regex subsequentes.
    .replace(/\*/g, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[:🚨_~]/g, '')      // Remove os demais caracteres de markdown
    .replace(/\s+/g, ' ')           // Junta múltiplos espaços
    .trim();
};

/**
 * Converte uma string monetária (ex: "1.500,00") em um número de ponto flutuante.
 * @param {string} str A string a ser convertida.
 * @returns {number|null} O número convertido ou null se for inválido.
 */
const parseNumber = (str) => {
  if (typeof str !== 'string') return null;
  // Remove pontos de milhar e substitui a vírgula decimal por ponto
  const cleanStr = str.replace(/\./g, '').replace(',', '.');
  const value = parseFloat(cleanStr);
  return isNaN(value) ? null : value;
};

// Mapeamento para converter números escritos por extenso em dígitos.
const wordsToNumMap = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };

// --- 2. INICIALIZAÇÃO ---

// Normaliza o texto de entrada uma única vez para otimizar o desempenho
const textoNormalizado = normalizeText(conteudo);

// Estrutura de dados final que será preenchida com as informações extraídas
const anuncio = {
  nome_anunciante: null,
  telefone_anunciante: null,
  intencao: null,
  tipo_operacao: null,
  tipo_imovel: null,
  quartos: null,
  suites: null,
  banheiros: null,
  vagas_garagem: null,
  area_m2: null,
  valor: null,
  iptu: null,
  condominio: null,
};

// --- 3. LÓGICA DE EXTRAÇÃO DETALHADA ---

// 3.1 NOME E TELEFONE DO ANUNCIANTE (ORIGINAL INTOCÁVEL)
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

// 3.2 INTENÇÃO (Procura vs Oferta) (ORIGINAL INTOCÁVEL)
(() => {
    const procuraRegex = /\b(procuro|procura|preciso|busco|buscando|cliente (busca|procura)|alguem com|necessito|gostaria de)\b/;
    if (procuraRegex.test(textoNormalizado)) { anuncio.intencao = 'procura'; return; }
    
    const ofertaExplicitaRegex = /\b(vendo|alugo|venda|locacao|oportunidade|vende-se|aluga-se|porteira fechada|disponivel para)\b/;
    if (ofertaExplicitaRegex.test(textoNormalizado)) { anuncio.intencao = 'oferta'; return; }

    const ofertaFeatures = [/r\s*\$/, /\b\d+\s*m(2|²)/, /\b\d+\s*(quarto|qto|suite)/, /\b(cod|codigo|ref|ap)\d+/, /https?:/];
    let featureCount = 0;
    for (const feature of ofertaFeatures) { if (feature.test(textoNormalizado)) featureCount++; }
    if (featureCount >= 2) { anuncio.intencao = 'oferta'; return; }
    
    // Assume como oferta por padrão se não for claramente uma procura
    anuncio.intencao = 'oferta';
})();

// --- MELHORIA ADICIONAL PARA INTENÇÃO ---
if (anuncio.intencao !== 'procura') {
    const procuraReforcoRegex = /\b(cliente querendo)\b/;
    if (procuraReforcoRegex.test(textoNormalizado)) {
        anuncio.intencao = 'procura';
    }
}


// 3.3 VALOR PRINCIPAL e 3.4 TIPO DE OPERAÇÃO (LÓGICA ORIGINAL INTOCÁVEL)
(() => {
    const candidatos = [];
    let match;
    const textoParaValor = textoNormalizado.replace(/(\d[\d.,]*)\s*m[2²]?\b/gi, ' ').replace(/(\d[\d.,]*)\s*metros\b/gi, ' ');
    const mainKeywords = 'valor|preco|preço|investimento|venda|ate|até';
    const currencySymbols = 'r\\$|rs|\\$';

    const regexSufixo = /([\d.,]+)\s*(mm|m|milh[oõ]es|milh[aã]o|kk|k|mil)\b/gi;
    while ((match = regexSufixo.exec(textoParaValor))) {
        const valorStr = match[1];
        const sufixo = match[2].toLowerCase().replace('ões', 'oes').replace('ão', 'ao');
        let numeroBase;
        if (['m', 'mm', 'milhoes', 'milhao', 'kk'].includes(sufixo)) {
            numeroBase = parseFloat(valorStr.replace(',', '.'));
        } else {
            numeroBase = parseNumber(valorStr);
        }
        if (!isNaN(numeroBase)) {
            let valorFinal = null;
            if (['k', 'mil'].includes(sufixo)) valorFinal = numeroBase * 1000;
            else if (['m', 'mm', 'milhoes', 'milhao', 'kk'].includes(sufixo)) valorFinal = numeroBase * 1000000;
            if (valorFinal) candidatos.push(valorFinal);
        }
    }

    const regexKeyword = new RegExp(`(?:${mainKeywords}|${currencySymbols})\\s*:?\\s*([\\d.,]+)`, 'gi');
    while ((match = regexKeyword.exec(textoNormalizado))) {
        const context = textoNormalizado.substring(Math.max(0, match.index - 20), match.index);
        if (/\b(iptu|condominio|cond)\b/.test(context)) continue;
        const nextChars = textoNormalizado.substring(match.index + match[0].length, match.index + match[0].length + 8).trim();
        if (['k', 'mil', 'm', 'mm', 'milhao', 'milhoes'].some(suf => nextChars.startsWith(suf))) continue;
        const valor = parseNumber(match[1]);
        if (valor) candidatos.push(valor);
    }
    
    const regexNumerosGrandes = /\b(\d{1,3}(\.\d{3})+,\d{2})\b|\b(\d{1,3}(\.\d{3}){2,})\b/g;
    while ((match = regexNumerosGrandes.exec(textoNormalizado))) {
        const context = textoNormalizado.substring(Math.max(0, match.index - 30), match.index);
        if (new RegExp(`\\b(${mainKeywords}|${currencySymbols.replace(/\\/g, '')}|iptu|condominio|cond)\\b`).test(context)) continue;
        const valor = parseNumber(match[1] || match[3]);
        if (valor) candidatos.push(valor);
    }
    
    const uniqueCandidatos = [...new Set(candidatos)];
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

// --- MELHORIA ADICIONAL PARA VALOR E TIPO DE OPERAÇÃO ---
(() => {
    const parseValorRobusto = (str) => {
        if (typeof str !== 'string') return null;
        let cleanStr = str.replace(/[^\d.,]/g, '');
        if (cleanStr.includes(',') && cleanStr.includes('.')) {
            const lastCommaIndex = cleanStr.lastIndexOf(',');
            const integerPart = cleanStr.substring(0, lastCommaIndex).replace(/[.,]/g, '');
            const decimalPart = cleanStr.substring(lastCommaIndex + 1);
            cleanStr = `${integerPart}.${decimalPart}`;
        } else if (cleanStr.includes(',')) {
            cleanStr = cleanStr.replace(',', '.');
        } else if (cleanStr.includes('.')) {
            const parts = cleanStr.split('.');
            if (parts[parts.length - 1].length !== 2) {
                cleanStr = cleanStr.replace(/\./g, '');
            }
        }
        const value = parseFloat(cleanStr);
        return isNaN(value) ? null : value;
    };
    const textoCru = conteudo.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').replace(/[*_~]/g, '');
    const candidatosMelhoria = [];
    let match;
    const regexSufixoReforco = /(?:R\$|rs|\$)?\s*([\d.,]+)\s*(mil|k)\b/gi;
    while ((match = regexSufixoReforco.exec(textoCru))) {
        const val = parseValorRobusto(match[1]);
        if (val) candidatosMelhoria.push(val * 1000);
    }
    const kwAluguel = /\b(aluguel|aluga-se|locacao|alugo|locar|temporada)\b/i;
    if (!kwAluguel.test(textoCru)) {
        const regexEmojiMil = /(?:R\$|rs|\$)\s*(1\d{2}|[2-9]\d{2})\s*💰/gi;
        while ((match = regexEmojiMil.exec(textoCru))) {
            candidatosMelhoria.push(parseInt(match[1], 10) * 1000);
        }
    }
    const regexValorBemFormatado = /(?:valor|R\$|rs|\$)\s*([\d.,]{6,})/gi;
    while ((match = regexValorBemFormatado.exec(textoCru))) {
        const val = parseValorRobusto(match[1]);
        if (val) candidatosMelhoria.push(val);
    }
    if (candidatosMelhoria.length > 0) {
        const validosVenda = candidatosMelhoria.filter(v => v >= 80000 && v < 200000000);
        if (validosVenda.length > 0) {
            const melhorCandidato = Math.max(...validosVenda);
            if (!anuncio.valor || anuncio.valor < 20000) {
                anuncio.valor = melhorCandidato;
                if (anuncio.tipo_operacao !== 'venda') {
                    anuncio.tipo_operacao = 'venda';
                }
            }
        }
    }
})();


// 3.5 TIPO DE IMÓVEL (ORIGINAL INTOCÁVEL)
(() => {
    if (/\b(cobertura|triplex)\b/.test(textoNormalizado)) anuncio.tipo_imovel = 'Cobertura';
    else if (/\b(casa|sobrado|mansao|chacara|sitio)\b/.test(textoNormalizado)) anuncio.tipo_imovel = 'Casa';
    else if (/\b(apartamento|apto|ap |studio|kitnet|quitinete|flat|garden|andar|edificio|predio)\b/.test(textoNormalizado)) anuncio.tipo_imovel = 'Apartamento';
    else if (/\b(loja|salas? comercia(l|is)|ponto comercial|galpao|laje corporativa|escritorio|clinica)\b/.test(textoNormalizado)) anuncio.tipo_imovel = 'Imóvel Comercial';
    else if (/\b(terreno|lote|gleba)\b/.test(textoNormalizado)) anuncio.tipo_imovel = 'Terreno';
    else if (/\b\d+\s*(quarto|qto|suite)s?\b/.test(textoNormalizado)) anuncio.tipo_imovel = 'Apartamento';
})();

// --- MELHORIA ADICIONAL PARA TIPO DE IMÓVEL (CORREÇÃO DE FALSO POSITIVO) ---
if (anuncio.tipo_imovel === 'Terreno' && (/\b\d+\s*quartos?\b/.test(textoNormalizado) || /\bfrontal\b/.test(textoNormalizado))) {
    anuncio.tipo_imovel = 'Apartamento';
}


// 3.6 SUÍTES (ORIGINAL INTOCÁVEL)
(() => {
    const candidatos = [];
    let match;
    const regexes = [
        /\b(?:sendo|com|possui|tem)\s*(\d{1,2}|uma|um|duas|dois|tres|quatro)\s*(?:quartos?\s*)?(suites?|ste?s?)\b/g,
        /\b(\d{1,2}|uma|um|duas|dois|tres|quatro)\s*(?:quartos?\s*)?(suites?|ste?s?)\b/g,
        /\b(suites?|ste?s?)\s*:?\s*(\d{1,2})\b/g,
    ];

    for (const re of regexes) {
        re.lastIndex = 0;
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

// 3.7 QUARTOS (ORIGINAL INTOCÁVEL)
(() => {
    const candidatos = [];
    let match;
    const regexes = [
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

// --- MELHORIA ADICIONAL PARA QUARTOS ---
(() => {
    const regexTypo = /\b(\d{1,2}|uma|um|duas|dois|tres|quatro)\s*(?:amplos?)?\s*(quantos?)\b/g;
    let match = regexTypo.exec(textoNormalizado);
    if (match) {
        const numStr = match[1];
        const num = wordsToNumMap[numStr] || parseInt(numStr, 10);
        if (num && num > (anuncio.quartos || 0)) {
            anuncio.quartos = num;
        }
    }
})();

// 3.8 BANHEIROS (ORIGINAL INTOCÁVEL)
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

    const counts = { suite: anuncio.suites || 0, lavabo: 0, social: 0, servico: 0, generic: 0 };
    
    const extractMaxCount = (regex) => {
        let maxCount = 0, match;
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
    if (isResidential && onlySuitesFound) finalCount = counts.suite + 1;

    const isResidentialMultiBedroom = isResidential && anuncio.quartos && anuncio.quartos > 1;
    if(isResidentialMultiBedroom && finalCount === 1 && counts.servico === 1 && counts.suite === 0 && counts.social === 0 && counts.lavabo === 0) {
        finalCount = 2;
    }
    
    const needsBathroom = anuncio.tipo_imovel && ['Apartamento', 'Casa', 'Cobertura', 'Imóvel Comercial'].includes(anuncio.tipo_imovel);
    if (finalCount === 0 && needsBathroom) finalCount = 1;

    if (finalCount > 0) anuncio.banheiros = finalCount;
})();


// 3.9 VAGAS DE GARAGEM (ORIGINAL INTOCÁVEL)
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

// 3.10 ÁREA (m²) (ORIGINAL INTOCÁVEL)
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

// --- MELHORIA ADICIONAL PARA ÁREA (PARA CAPTURAR TERRENOS GRANDES) ---
if (!anuncio.area_m2) {
    const candidatos = [];
    const regexGeral = /([\d.,]+)\s*(m2|m²)(?!\w)/gi;
    let match;
    while ((match = regexGeral.exec(textoNormalizado))) {
        const valor = parseNumber(match[1]);
        if (valor && valor > 10) {
            candidatos.push(Math.round(valor));
        }
    }
    if (candidatos.length > 0) {
        anuncio.area_m2 = Math.max(...candidatos);
    }
}


// --- MELHORIA ADICIONAL PARA TIPO DE IMÓVEL (com base na área) ---
if (!anuncio.tipo_imovel && anuncio.area_m2 && anuncio.area_m2 > 2000) {
    anuncio.tipo_imovel = 'Terreno';
}

// 3.11 IPTU e CONDOMÍNIO (ORIGINAL INTOCÁVEL)
(() => {
    const extractTax = (keyword, isIptu = false) => {
        const regex = new RegExp(`(?:${keyword})([\\s\\w():.-]*?)(?:r\\$|rs)?\\s*([\\d.,]+)`, 'gi');
        let match;
        const candidatos = [];
        while ((match = regex.exec(textoNormalizado))) {
            const snippetBetween = (match[1] || '').trim();
            const valorStr = match[2];
            const fullMatchText = match[0];
            const valorNumerico = parseNumber(valorStr);
            if (!valorNumerico) continue;
            const palavrasDeDescarte = /\b(com|quartos?|vagas?|unidades?|andares?|lazer|infra|seguranca|piscina|portaria)\b/;
            const ehTaxaExplicita = /\b(valor|taxa|cota)\b/.test(snippetBetween) || snippetBetween.startsWith(':');
            if (palavrasDeDescarte.test(snippetBetween) && !ehTaxaExplicita) continue;
            const hasMonetarySymbol = /r\$|rs/.test(fullMatchText);
            const hasFormatting = /[.,]/.test(valorStr);
            if (valorNumerico <= 100 && !hasMonetarySymbol && !hasFormatting && !ehTaxaExplicita) continue;
            if (anuncio.valor && valorNumerico >= anuncio.valor) continue;
            let taxValue = valorNumerico;
            const context = fullMatchText + textoNormalizado.substring(match.index + match[0].length, match.index + match[0].length + 15);
            if (/\b(anual|ano)\b/.test(context)) {
                taxValue /= 12;
            } else if (isIptu && taxValue > 1800 && !/\b(mensal|mes)\b/.test(context)) {
                taxValue /= 12;
            }
            candidatos.push(Math.round(taxValue));
        }
        return candidatos.length > 0 ? candidatos[candidatos.length - 1] : null;
    };
    anuncio.iptu = extractTax('iptu', true);
    anuncio.condominio = extractTax('condominio|cond\\.?|cota');
    if (anuncio.condominio && anuncio.iptu && anuncio.condominio <= anuncio.iptu) {
        anuncio.condominio = null;
    }
})();

// --- MELHORIA ADICIONAL PARA IPTU E CONDOMÍNIO ---
(() => {
    // Função de parse robusta, específica para taxas
    const parseTaxaRobusta = (str) => {
        if (typeof str !== 'string') return null;
        // Limpa a string de tudo que não for número, ponto ou vírgula
        let cleanStr = str.replace(/[^\d.,]/g, '');

        // Lógica para tratar casos como "2.519.05" -> "2519.05"
        const dotCount = (cleanStr.match(/\./g) || []).length;
        if (dotCount > 1 && !cleanStr.includes(',')) {
            const lastDotIndex = cleanStr.lastIndexOf('.');
            const integerPart = cleanStr.substring(0, lastDotIndex).replace(/\./g, '');
            const decimalPart = cleanStr.substring(lastDotIndex + 1);
            cleanStr = `${integerPart}.${decimalPart}`;
        } else { // Caso contrário, usa a lógica padrão
            cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
        }
        
        const value = parseFloat(cleanStr);
        return isNaN(value) ? null : value;
    };

    const textoCru = conteudo.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').replace(/[*_~]/g, '');

    // --- LÓGICA DE CORREÇÃO PARA CONDOMÍNIO ---
    let condRobusto = null;
    const condRegexes = [
        /(?:condominio|cond)[\s\w():.-]*?(?:r\$|rs)?\s*([\d.,]+)/i, // Padrão normal
        /([\d.,]+)\s*mil\s*de\s*condominio/i // Padrão "7 mil de condomínio"
    ];

    for (const regex of condRegexes) {
        let match = textoCru.match(regex);
        if (match) {
            condRobusto = parseTaxaRobusta(match[1]);
            if (match[0].includes('mil')) {
                condRobusto *= 1000;
            }
            // Se encontrou um valor válido, para a busca
            if (condRobusto) break;
        }
    }
    
    // Aplica a correção no condomínio se necessário
    if (condRobusto && anuncio.condominio !== condRobusto) {
        // Corrige apenas se o original for nulo ou claramente um valor de IPTU/outro
        if (anuncio.condominio === null || (anuncio.iptu && anuncio.condominio === anuncio.iptu) || (anuncio.valor && anuncio.condominio === anuncio.valor) || (anuncio.condominio < 50 && condRobusto > 50)) {
             anuncio.condominio = Math.round(condRobusto);
        }
    }

    // --- LÓGICA DE CORREÇÃO PARA IPTU ---
    let iptuRobusto = null;
    let iptuMatch = textoCru.match(/iptu[\s\w():.-]*?(?:r\$|rs)?\s*([\d.,]+)/i);
    if (iptuMatch) iptuRobusto = parseTaxaRobusta(iptuMatch[1]);
    
    // Passo 1: Verificação de "Não Informado"
    const iptuNaoInformadoRegex = /iptu\s*:\s*(nao informado|a consultar|nao tem)/i;
    if (iptuNaoInformadoRegex.test(textoNormalizado)) {
        anuncio.iptu = null;
        return;
    }

    // Passo 2: Verificação de "total" ou "/ano"
    const anualRegex = /iptu[\s\w():.-]*?(?:r\$|rs)?\s*([\d.,]+)\s*(total|anual|ano|\/ano)/i;
    let match = textoCru.match(anualRegex);
    if (match) {
        const valorAnual = parseTaxaRobusta(match[1]);
        if (valorAnual) {
            const valorMensal = Math.round(valorAnual / 12);
            if(anuncio.iptu !== valorMensal) anuncio.iptu = valorMensal;
            return;  
        }
    }
    
    // Passo 3: Verificação Cruzada (usando os valores robustos)
    if (iptuRobusto && anuncio.condominio && iptuRobusto >= anuncio.condominio) {
        let valorCorrigido = iptuRobusto;
        if (valorCorrigido > 1800 && !/mensal|mes/i.test(iptuMatch[0])) {
            valorCorrigido /= 12;
        }
        anuncio.iptu = Math.round(valorCorrigido);
        return;
    }

    // Passo 4: Verificação de valor nulo (fallback)
    if (anuncio.iptu === null) {
        const iptuMensalRegex = /([\d.,]+)\s*mensal de iptu/i;
        match = textoCru.match(iptuMensalRegex);
        if (match) {
            anuncio.iptu = parseNumber(match[1]);
        }
    }
})();

// --- NOVO BLOCO DE AUDITORIA E CORREÇÃO PARA CONDOMÍNIO (IMPLEMENTAÇÃO DA PROPOSTA) ---
// Este bloco foi adicionado conforme a solicitação para auditar e corrigir o valor do condomínio.
// Ele roda APÓS toda a lógica original (incluindo as melhorias anteriores) e NUNCA a altera.
// A correção só é aplicada se condições específicas de erro forem detectadas.
(() => {

    // --- HEURÍSTICA #1: EXTRAÇÃO ROBUSTA E CONTEXTUAL ---

    /**
     * Função de parse robusta para valores de taxas, capaz de lidar com formatações
     * complexas como "2.519.05" e garantir a conversão correta para número.
     * @param {string} str A string do valor a ser parseada.
     * @returns {number|null} O valor numérico ou null se inválido.
     */
    const parseTaxaRobusta = (str) => {
        if (typeof str !== 'string') return null;
        // Limpa a string de tudo que não for número, ponto ou vírgula
        let cleanStr = str.replace(/[^\d.,]/g, '');

        // Lógica para tratar casos como "2.519.05" -> "2519.05"
        const dotCount = (cleanStr.match(/\./g) || []).length;
        if (dotCount > 1 && !cleanStr.includes(',')) {
            const lastDotIndex = cleanStr.lastIndexOf('.');
            const integerPart = cleanStr.substring(0, lastDotIndex).replace(/\./g, '');
            const decimalPart = cleanStr.substring(lastDotIndex + 1);
            cleanStr = `${integerPart}.${decimalPart}`;
        } else { // Caso contrário, usa a lógica padrão de remover pontos e trocar vírgula
            cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
        }

        const value = parseFloat(cleanStr);
        return isNaN(value) ? null : value;
    };

    let candidato_correto_condominio = null;

    // Define as expressões regulares flexíveis para encontrar o valor do condomínio.
    const regexesCandidatos = [
        // Padrão 1: "condomínio [valor]" (ex: Condomínio R$ 930, cond: 789,00)
        /(?:condominio|cond\.?)\s*(?:de|valor|taxa|cota|:)?\s*(?:r\$|rs)?\s*([\d.,]+)/i,

        // Padrão 2: "[valor] de condomínio" (ex: 7 mil de condomínio, 789 de condomínio)
        // Captura também variações como "mensal de condomínio".
        /\b([\d.,]+)\s*(mil|k)?\s*(?:mensal\s*)?de\s*condominio/i,

        // Padrão 3: Um valor numérico solto logo após a palavra "condominio"
        /\b(condominio)\s+([\d.,]+)/i
    ];

    for (const regex of regexesCandidatos) {
        const match = textoNormalizado.match(regex);
        if (match) {
            // A captura do valor numérico pode estar em match[1] ou match[2]
            const valorStr = match[1] || match[2];
            let valorNumerico = parseTaxaRobusta(valorStr);

            if (valorNumerico !== null) {
                // No Padrão 2, o sufixo "mil" ou "k" é capturado no segundo grupo
                const sufixo = (match[2] || '').toLowerCase();
                if (sufixo === 'mil' || sufixo === 'k') {
                    valorNumerico *= 1000;
                }

                // Desconsidera valores irrisórios que podem ser de outras taxas
                if (valorNumerico > 50) {
                    candidato_correto_condominio = Math.round(valorNumerico);
                    break; // Encontrou um bom candidato, para a busca.
                }
            }
        }
    }

    // --- HEURÍSTICAS #2 e #3: AUDITORIA E DECISÃO DE CORREÇÃO ---
    // Este bloco só executa se a extração robusta encontrou um candidato válido.
    if (candidato_correto_condominio !== null) {

        // Define as condições de erro que disparam a correção.
        const condicaoA = (anuncio.condominio === null);
        const condicaoB = (anuncio.condominio !== null && anuncio.condominio !== candidato_correto_condominio);
        const condicaoC = (anuncio.condominio !== null && anuncio.iptu !== null && anuncio.condominio <= anuncio.iptu);

        // DOCUMENTAÇÃO DAS CONDIÇÕES:
        // Condição A (Erro de null): O código original falhou em encontrar qualquer valor (anuncio.condominio é null),
        // mas a nossa extração robusta encontrou um candidato.
        //
        // Condição B (Erro de Confusão): O código original encontrou um valor, mas ele é DIFERENTE do nosso candidato,
        // sugerindo que ele pode ter capturado um número errado (ex: um pedaço do CEP, área, etc.).
        //
        // Condição C (Violação da Regra de Negócio): O valor do condomínio extraído pelo código original é
        // menor ou igual ao valor do IPTU, o que é um forte indicador de erro de extração.

        // Se QUALQUER uma das condições de erro for verdadeira, o valor é sobrescrito.
        if (condicaoA || condicaoB || condicaoC) {
            // Ação de correção: sobrescreve o valor do condomínio com o candidato encontrado.
            anuncio.condominio = candidato_correto_condominio;
        }
    }

})();

// ===================================================================================
// === NOVO BLOCO DE AUDITORIA E CORREÇÃO (INSERIR APÓS O CÓDIGO ORIGINAL) ==========
// ===================================================================================
// Este bloco NÃO ALTERA a lógica original. Ele apenas verifica os resultados
// do objeto 'anuncio' e aplica correções específicas para os problemas conhecidos.

(() => {

    // --- 1. AUDITORIA E CORREÇÃO DO TELEFONE_ANUNCIANTE ---
    // Objetivo: Corrigir números de celular que perderam o '9' inicial.

    // Verifica se o telefone foi extraído, mas está com a contagem de dígitos incorreta (12 em vez de 13).
    if (anuncio.telefone_anunciante && anuncio.telefone_anunciante.length === 12) {
        
        // Usa uma regex mais precisa que FORÇA a captura do 9 inicial em celulares.
        // Padrão: +55 (DDD) 9XXXX-XXXX
        const regexTelefoneCorreto = /\+55\s*\(?(\d{2})\)?\s*(9\d{4,5})[-.\s]?(\d{4})/g;
        const matchCorreto = conteudo.match(regexTelefoneCorreto);

        if (matchCorreto) {
            // Se encontrar um número no formato correto, limpa-o de caracteres não numéricos
            // e o usa para sobrescrever o valor incorreto.
            const telefoneCorrigido = matchCorreto[0].replace(/\D/g, '');
            
            // Apenas sobrescreve se o resultado for um número válido de 13 dígitos.
            if (telefoneCorrigido.length === 13) {
                anuncio.telefone_anunciante = telefoneCorrigido;
            }
        }
    }


    // --- 2. AUDITORIA E CORREÇÃO DA INTENCAO ---
    // Objetivo: Corrigir anúncios de 'oferta' que foram erroneamente classificados como 'procura'.

    // A condição principal é verificar se a lógica original concluiu a intenção como 'procura'.
    if (anuncio.intencao === 'procura') {

        // Define uma lista de palavras-chave inequívocas de OFERTA.
        // Estas palavras têm maior peso do que as palavras ambíguas de 'procura' (como "gostaria de").
        const palavrasChaveOfertaForte = /\b(venda|vendo|vende-se|alugo|aluga-se|locacao|oportunidade|imperdivel|disponivel para venda|disponivel para aluguel|promocao|oferta)\b/i;

        // Verifica no texto normalizado (minúsculo e sem acentos) se alguma dessas palavras fortes de oferta existe.
        // Usamos o textoNormalizado que já foi processado no início do script original.
        if (palavrasChaveOfertaForte.test(textoNormalizado)) {
            // Se uma palavra forte de oferta for encontrada, a decisão original estava errada.
            // Ação de correção: sobrescreve a intenção para 'oferta'.
            anuncio.intencao = 'oferta';
        }
    }

})(); // Fim do bloco de auditoria.

// A linha de retorno original permanece a mesma, agora retornando o objeto 'anuncio' potencialmente corrigido.
return { caracteristicas: anuncio };

// --- 4. RETORNO DOS DADOS ---
// Retorna o objeto final no formato que o n8n espera para os próximos nós.
//return { caracteristicas: anuncio };