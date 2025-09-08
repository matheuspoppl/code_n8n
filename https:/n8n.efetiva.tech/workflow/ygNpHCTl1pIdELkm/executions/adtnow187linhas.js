// ===================================================================================
// === NÓ DE AUDITORIA V12 - BASE V5 + CORREÇÕES CIRÚRGICAS PARA TAXAS ===
// ===================================================================================
// Esta versão volta à estabilidade e confiabilidade da V5.
// Abandona completamente as lógicas complexas que falharam.
// Adiciona uma nova função 'auditarTaxasV12' focada em CORRIGIR erros
// específicos de IPTU (isento, anual, parcelado) em vez de redescobrir valores,
// garantindo consistência e performance.

// --- 1. CONFIGURAÇÃO INICIAL ---
const extracaoInicial = $json.caracteristicas;
const mensagemOriginal = $('Loop Over Items3').item.json.caractbd.mensagem;

if (!extracaoInicial || !mensagemOriginal || typeof mensagemOriginal !== 'string') {
  return { caracteristicas: extracaoInicial || {} };
}

const anuncioCorrigido = JSON.parse(JSON.stringify(extracaoInicial));
const valorOriginal = extracaoInicial.valor;

// --- 2. FUNÇÕES DE AJUDA (DA BASE V5) ---

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

    if (/[.,]\d{2}$/.test(cleanStr)) {
        const decimalPart = cleanStr.slice(-2);
        const integerPart = cleanStr.slice(0, -3).replace(/[.,]/g, '');
        cleanStr = `${integerPart}.${decimalPart}`;
    } else {
        cleanStr = cleanStr.replace(/[.,]/g, '');
    }
    const valor = parseFloat(cleanStr);
    return isNaN(valor) ? null : Math.round(valor * multiplicador);
};

// --- 3. AUDITORIAS MODULARES (DA BASE V5) ---

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

// --- 4. NOVA AUDITORIA DE TAXAS (V12) ---
const auditarTaxasV12 = () => {
    const textoCru = mensagemOriginal;

    // --- CORREÇÃO DE IPTU ---
    // Regra 1: "IPTU Isento"
    if (/iptu\s*(isento|isenta)/i.test(textoCru)) {
        anuncioCorrigido.iptu = 0;
    } else {
        // Regra 2: Busca por valor de IPTU com contexto de anual ou parcelado
        const regexIptuAnual = /iptu\s*[:;.]?\s*(?:r\$|rs)?\s*([\d.,]+)\s*(?:\(?\s*(anual|ao ano|\/ano)\s*\)?)/i;
        const regexIptuParcelado = /iptu:?.*?(\d+)\s*x\s*de\s*\$?\s*([\d.,]+)/i;
        const regexIptuGeral = /iptu\s*[:;.]?\s*(?:r\$|rs)?\s*([\d.,]+)/i;
        
        const matchAnual = textoCru.match(regexIptuAnual);
        const matchParcelado = textoCru.match(regexIptuParcelado);
        const matchGeral = textoCru.match(regexIptuGeral);

        let iptuCorrigido = null;

        if (matchAnual) {
            const valor = parseNumero(matchAnual[1]);
            if (valor) iptuCorrigido = Math.round(valor / 12);
        } else if (matchParcelado) {
            const valor = parseNumero(matchParcelado[2]);
            if (valor) iptuCorrigido = valor;
        } else if (matchGeral) {
            const valor = parseNumero(matchGeral[1]);
            // Se o valor for muito alto, assume que é anual mesmo sem a palavra
            if (valor && valor > 2500 && !/mes|mensal|cota/i.test(matchGeral[0])) {
                 iptuCorrigido = Math.round(valor / 12);
            } else if (valor) {
                 iptuCorrigido = valor;
            }
        }
        
        if (iptuCorrigido !== null) {
            anuncioCorrigido.iptu = iptuCorrigido;
        }
    }

    // --- CORREÇÃO DE CONDOMÍNIO ---
    const regexCond = /(?:condom[ií]nio|cond\.?|taxas)\s*[:;]?\s*(?:r\$|rs)?\s*([\d.,]+)/i;
    const matchCond = textoCru.match(regexCond);
    if(matchCond){
        const valor = parseNumero(matchCond[1]);
        if(valor && valor > 50 && valor < 30000){
            anuncioCorrigido.condominio = valor;
        }
    }
};


// --- 5. EXECUÇÃO E VALIDAÇÃO FINAL ---
auditarValorImovel();
const adValido = auditarIntencaoEFiltrar();

if (adValido) {
    auditarTaxasV12();

    // Validação final de plausibilidade e hierarquia simples
    if (anuncioCorrigido.valor && anuncioCorrigido.condominio && anuncioCorrigido.condominio >= anuncioCorrigido.valor) {
        anuncioCorrigido.condominio = null;
    }
    if (anuncioCorrigido.condominio && anuncioCorrigido.iptu && anuncioCorrigido.iptu >= anuncioCorrigido.condominio) {
        anuncioCorrigido.iptu = null;
    }
    
    // Ajuste Fino do Tipo de Operação
    if (anuncioCorrigido.valor && anuncioCorrigido.valor !== valorOriginal) {
        if (anuncioCorrigido.valor >= 80000) {
            anuncioCorrigido.tipo_operacao = 'venda';
        } else if (anuncioCorrigido.valor > 0) {
            anuncioCorrigido.tipo_operacao = 'aluguel';
        }
    }
}

// --- 6. RETORNO DOS DADOS ---
return { caracteristicas: anuncioCorrigido };