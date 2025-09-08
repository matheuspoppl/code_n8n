// ===================================================================================
// === NÓ DE AUDITORIA V13 - A V5 DEFINITIVA COM CORREÇÃO PRECISA DE TAXAS ===
// ===================================================================================
// Esta é a versão mais estável. Retornamos à base confiável da V5 e adicionamos
// um módulo de auditoria de taxas simples, direto e robusto.
// - Sem hierarquias complexas.
// - Foco em regex de alta precisão para encontrar e corrigir erros específicos
//   de IPTU (isento, anual, parcelado) e Condomínio.
// - Objetivo: Máxima confiabilidade e consistência.

// --- 1. CONFIGURAÇÃO INICIAL ---
const extracaoInicial = $json.caracteristicas;
const mensagemOriginal = $('Loop Over Items3').item.json.caractbd.mensagem;

if (!extracaoInicial || !mensagemOriginal || typeof mensagemOriginal !== 'string') {
  return { caracteristicas: extracaoInicial || {} };
}

const anuncioCorrigido = JSON.parse(JSON.stringify(extracaoInicial));

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
    
    // Lógica robusta para tratar múltiplos pontos (ex: 2.519.05) e vírgulas
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


// --- 3. AUDITORIAS MODULARES (BASE V5) ---

const auditarValorImovel = () => {
    const valorOriginal = anuncioCorrigido.valor;
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

const auditarIntencaoEFiltrar = () => {
    const textoNormalizado = mensagemOriginal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const patternsInvalidos = /erro de interpretaçao|muito obrigada|nem sempre|piano|barratt & robinson|instagram\.com\/reel|quintoandar\.com|segue o link/;
    if (patternsInvalidos.test(textoNormalizado)) {
        Object.keys(anuncioCorrigido).forEach(key => { if (!['nome_anunciante', 'telefone_anunciante'].includes(key)) { anuncioCorrigido[key] = null; } });
        return false;
    }
    let intencaoScore = 0;
    const T_PROCURA_FORTE = /\b(procuro|busco|buscando|preciso|necessito|cliente (procura|busca|quer|compra)|quem tiver|alguem (tem|com)|vc tem|precioso de)\b/;
    const T_OFERTA_FORTE = /\b(vendo|vende-se|alugo|aluga-se|disponivel para|oportunidade|lançamento|imperdivel|exclusividade)\b/;
    if (T_PROCURA_FORTE.test(textoNormalizado)) intencaoScore += 100;
    if (T_OFERTA_FORTE.test(textoNormalizado)) intencaoScore -= 100;
    if (anuncioCorrigido.valor === null) { if (!/trabalhamos com|atuamos com|consultoria/i.test(textoNormalizado)) { intencaoScore += 75; } }
    if (/parceria|exterior|estados unidos|portugal|dubai|espanha|trabalhamos com|atuamos com|consultoria/i.test(textoNormalizado)) { intencaoScore -= 80; }
    if (mensagemOriginal.includes('?')) intencaoScore += 20;
    if (intencaoScore > 25) { anuncioCorrigido.intencao = 'procura'; }
    else if (intencaoScore < -25) { anuncioCorrigido.intencao = 'oferta'; }
    return true;
};

// NOVO MÓDULO DE AUDITORIA PARA TAXAS (V13)
const auditarTaxas = () => {
    const textoCru = mensagemOriginal;

    // --- AUDITORIA DE IPTU ---
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

                if (/anual|ano|\/ano/.test(contexto)) {
                    iptuCorrigido = Math.round(valor / 12);
                } else if (/parcelado em/.test(contexto) || /cota/.test(contexto)) {
                    // Se encontrar o número de parcelas, usa, senão assume 10 (padrão comum)
                    const divisor = parcelas > 1 ? parcelas : 10;
                    // Procura o valor total para dividir, se disponível
                    const matchTotal = contexto.match(/([\d.,]+)\/ano, parcelado/);
                    if(matchTotal) {
                        const valorTotal = parseNumero(matchTotal[1]);
                        iptuCorrigido = Math.round(valorTotal / divisor);
                    } else {
                       iptuCorrigido = valor; // Assume que o valor já é o da parcela
                    }
                } else if (valor > 2500 && !/m[eê]s|mensal/.test(contexto)) {
                    iptuCorrigido = Math.round(valor / 12);
                } else {
                    iptuCorrigido = valor;
                }
            }
        }
    }
    
    // --- AUDITORIA DE CONDOMÍNIO ---
    let condCorrigido = null;
    const regexCond = /(?:condom[ií]nio|cond\.?|taxas)\s*[:;]?\s*(?:r\$|rs)?\s*([\d.,]+)/i;
    const matchCond = textoCru.match(regexCond);
    if(matchCond){
        const valor = parseNumero(matchCond[1]);
        if(valor && valor > 50 && valor < 30000 && anuncioCorrigido.valor && valor < anuncioCorrigido.valor) {
            condCorrigido = valor;
        }
    }
    
    // Aplica as correções apenas se forem válidas
    if (iptuCorrigido !== null) anuncioCorrigido.iptu = iptuCorrigido;
    if (condCorrigido !== null) anuncioCorrigido.condominio = condCorrigido;
};


// --- 5. EXECUÇÃO ---
auditarValorImovel();
const adValido = auditarIntencaoEFiltrar();

if (adValido) {
    auditarTaxas();
}

// --- 6. RETORNO DOS DADOS ---
return { caracteristicas: anuncioCorrigido };