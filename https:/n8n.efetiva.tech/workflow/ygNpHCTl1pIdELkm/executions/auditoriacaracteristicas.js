// ===================================================================================
// === NÓ DE AUDITORIA V5 - VALOR CONFIÁVEL + INTENÇÃO INTELIGENTE ===
// ===================================================================================
// Esta versão mantém a lógica V4 para o campo "valor" e adiciona uma nova
// função de auditoria para o campo "intencao", usando um sistema de pontuação
// e um filtro de anúncios inválidos para aumentar drasticamente a precisão.

// --- 1. CONFIGURAÇÃO INICIAL ---

const extracaoInicial = $json.caracteristicas;
const mensagemOriginal = $('Loop Over Items3').item.json.caractbd.mensagem;

if (!extracaoInicial || !mensagemOriginal || typeof mensagemOriginal !== 'string') {
  return { caracteristicas: extracaoInicial || {} };
}

const anuncioCorrigido = JSON.parse(JSON.stringify(extracaoInicial));
const valorOriginal = extracaoInicial.valor;
const intencaoOriginal = extracaoInicial.intencao;

// --- 2. FUNÇÕES DE AJUDA ---

const parseValorV4 = (str, contexto = '') => {
    if (typeof str !== 'string') return null;
    let cleanStr = str.toLowerCase().trim().replace(/r\$|rs|\$|\s/g, '');
    if (/^\d\.\d{3}$/.test(cleanStr) && !/aluguel|locacao/i.test(contexto)) {
        return parseFloat(cleanStr.replace('.', '')) * 1000;
    }
    let multiplicador = 1;
    if (cleanStr.endsWith('mil')) { multiplicador = 1000; cleanStr = cleanStr.slice(0, -3); } 
    else if (cleanStr.endsWith('k')) { multiplicador = 1000; cleanStr = cleanStr.slice(0, -1); } 
    else if (cleanStr.includes('milh')) { multiplicador = 1000000; cleanStr = cleanStr.replace(/milh[aão|oes].*/, ''); }
    cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    const valor = parseFloat(cleanStr);
    return isNaN(valor) ? null : valor * multiplicador;
};

// --- 3. LÓGICA DE AUDITORIA DE VALOR (V4 - MANTIDA) ---

const auditarValorImovel = () => {
    // ... (A LÓGICA V4 COMPLETA E FUNCIONAL PARA 'VALOR' PERMANECE AQUI, SEM ALTERAÇÕES)
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
                    const valorNum = parseValorV4(valorStr, contextoCompleto);
                    if (valorNum && valorNum > 10) {
                        candidatos.push({
                            valor: valorNum,
                            index: match.index,
                            prioridade: /agora|por|baixou|final/i.test(fullMatchText) ? 1 : 2,
                            penalidade: /gasto|reforma|taxas\s*\d/i.test(contextoCompleto.toLowerCase())
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

// --- 4. NOVA LÓGICA DE AUDITORIA DE INTENÇÃO (V5) ---

const auditarIntencaoEFiltrar = () => {
    const textoNormalizado = mensagemOriginal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // ETAPA 1: Filtro de Anúncios Inválidos (Lixo)
    const patternsInvalidos = /erro de interpretaçao|muito obrigada|nem sempre|piano|barratt & robinson|instagram\.com\/reel|quintoandar\.com|segue o link/;
    if (patternsInvalidos.test(textoNormalizado)) {
        // Se for lixo, anula tudo exceto contato e retorna 'false' para parar o processamento.
        Object.keys(anuncioCorrigido).forEach(key => {
            if (!['nome_anunciante', 'telefone_anunciante'].includes(key)) {
                anuncioCorrigido[key] = null;
            }
        });
        return false; // Indica que o anúncio é inválido
    }

    // ETAPA 2: Sistema de Pontuação para Intenção
    let intencaoScore = 0;

    // Termos Fortes de Procura (+100)
    const T_PROCURA_FORTE = /\b(procuro|busco|buscando|preciso|necessito|cliente (procura|busca|quer|compra)|quem tiver|alguem (tem|com)|vc tem|precioso de)\b/;
    // Termos Fortes de Oferta (-100)
    const T_OFERTA_FORTE = /\b(vendo|vende-se|alugo|aluga-se|disponivel para|oportunidade|lançamento|imperdivel|exclusividade)\b/;
    
    if (T_PROCURA_FORTE.test(textoNormalizado)) intencaoScore += 100;
    if (T_OFERTA_FORTE.test(textoNormalizado)) intencaoScore -= 100;

    // Heurísticas de Alto Peso
    // Se não há valor, é muito provável que seja uma procura.
    if (anuncioCorrigido.valor === null) {
        // Se não for um anúncio de serviço genérico, aplica o bônus.
        if (!/trabalhamos com|atuamos com|consultoria/i.test(textoNormalizado)) {
            intencaoScore += 75;
        }
    }
    
    // Anúncios de serviço são ofertas, mas podem não ter valor. Penaliza "procura" para eles.
    if (/parceria|exterior|estados unidos|portugal|dubai|espanha|trabalhamos com|atuamos com|consultoria/i.test(textoNormalizado)) {
        intencaoScore -= 80;
    }

    // Heurísticas de Médio Peso
    if (mensagemOriginal.includes('?')) intencaoScore += 20;

    // ETAPA 3: Decisão Final
    if (intencaoScore > 25) { // Limiar para evitar falsos positivos
        anuncioCorrigido.intencao = 'procura';
    } else if (intencaoScore < -25) {
        anuncioCorrigido.intencao = 'oferta';
    }
    // Se a pontuação for ambígua (-25 a 25), confia na extração original.

    return true; // Indica que o anúncio é válido
};


// --- 5. EXECUÇÃO ---

// Primeiro, audita o VALOR, pois a ausência dele é crucial para a intenção.
auditarValorImovel();

// Em seguida, audita a INTENÇÃO e filtra anúncios inválidos.
const adValido = auditarIntencaoEFiltrar();

if (adValido) {
    // Ajuste Fino do Tipo de Operação (apenas se o valor foi alterado)
    if (anuncioCorrigido.valor && anuncioCorrigido.valor !== valorOriginal) {
        if (anuncioCorrigido.valor >= 80000 && anuncioCorrigido.tipo_operacao !== 'venda') {
            anuncioCorrigido.tipo_operacao = 'venda';
        } else if (anuncioCorrigido.valor > 0 && anuncioCorrigido.valor < 80000 && anuncioCorrigido.tipo_operacao !== 'aluguel') {
            anuncioCorrigido.tipo_operacao = 'aluguel';
        }
    }
}

// --- 6. RETORNO DOS DADOS ---
return { caracteristicas: anuncioCorrigido };