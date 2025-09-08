// ===================================================================================
// === NÓ DE AUDITORIA V4 - REFINAMENTO CIRÚRGICO E LÓGICA ASSERTIVA ===
// ===================================================================================
// Esta versão aprimora a V3, corrigindo os 7 erros restantes.
// 1. Parser de valor consciente do contexto (Aluguel vs. Venda).
// 2. Penaliza contextos negativos como "gasto" e "reforma".
// 3. Detecção e tratamento aprimorado para anúncios em formato de lista.
// 4. Lógica de intervenção mais assertiva para corrigir preços com base em "valor final".

// --- 1. CONFIGURAÇÃO INICIAL ---

const extracaoInicial = $json.caracteristicas;
const mensagemOriginal = $('Loop Over Items3').item.json.caractbd.mensagem;

if (!extracaoInicial || !mensagemOriginal || typeof mensagemOriginal !== 'string') {
  return { caracteristicas: extracaoInicial || {} };
}

const anuncioCorrigido = JSON.parse(JSON.stringify(extracaoInicial));
const valorOriginal = extracaoInicial.valor;

// --- 2. PARSER DE VALOR CONSCIENTE DO CONTEXTO (V4) ---

const parseValorV4 = (str, contexto = '') => {
    if (typeof str !== 'string') return null;

    let cleanStr = str.toLowerCase().trim()
        .replace(/r\$|rs|\$|\s/g, ''); // Remove símbolos de moeda e espaços

    // Lida com "1. 200", mas agora verifica o contexto para não errar em aluguéis.
    if (/^\d\.\d{3}$/.test(cleanStr) && !/aluguel|locacao/i.test(contexto)) {
        return parseFloat(cleanStr.replace('.', '')) * 1000;
    }
    
    let multiplicador = 1;

    if (cleanStr.endsWith('mil')) {
        multiplicador = 1000;
        cleanStr = cleanStr.slice(0, -3);
    } else if (cleanStr.endsWith('k')) {
        multiplicador = 1000;
        cleanStr = cleanStr.slice(0, -1);
    } else if (cleanStr.includes('milh')) {
        multiplicador = 1000000;
        cleanStr = cleanStr.replace(/milh[aão|oes].*/, '');
    }

    cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');

    const valor = parseFloat(cleanStr);
    return isNaN(valor) ? null : valor * multiplicador;
};


// --- 3. LÓGICA DE AUDITORIA (V4) ---

const auditarValorImovel = () => {
    const textoCru = mensagemOriginal.replace(/~~/g, ' riscado ');
    let candidatos = [];

    // FASE 1: IDENTIFICAR CANDIDATOS DE ALTA CONFIANÇA
    const padroesDePreco = [
        // Padrão 1 (Prioridade Máxima): Palavras de preço final. Captura números com ou sem R$.
        /(?:agora|por|baixou para)\s*(?:r\$|rs)?\s*([\d.,\s]+milh[oõ]es|[\d.,\s]+milhao|[\d.,\s]+mil|[\d.,\s]+k|[\d.,\s]{2,})/gi,
        // Padrão 2 (Prioridade Normal): Palavras de preço padrão. Mais flexível com separadores.
        /(?:valor|preço|preco|venda|aluguel|investimento)\s*[:;]?\s*(?:r\$|rs)?\s*([\d.,\s]+milh[oõ]es|[\d.,\s]+milhao|[\d.,\s]+mil|[\d.,\s]+k|[\d.,\s]{2,})/gi,
        // Padrão 3 (Menor Prioridade): Apenas R$ + valor bem formatado (para casos sem palavra-chave).
        /(?:r\$|rs)\s*([\d.,\s]{4,}|[\d.,\s]*[.,][\d.,\s]*)/gi,
        // Padrão 4: Casos como "Valor 1. 200 estourando 1.300".
        /(?:valor|ate)\s*([\d\.\s]+)\s*(?:estourando|e|a)\s*([\d\.\s]+)/gi,
        // Padrão 5: Número bem formatado isolado (para casos como o do Santa Mônica sem keyword).
        /\b(\d{1,3}(?:\.\d{3}){2,},\d{2})\b|\b(\d{1,3}(?:\.\d{3}){2,})\b/g
    ];

    for (const regex of padroesDePreco) {
        let match;
        while ((match = regex.exec(textoCru))) {
            const fullMatchText = match[0].toLowerCase();
            // Itera sobre os grupos capturados (pode haver mais de um, como no Padrão 4)
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
    
    // FASE 2: FILTRAR E SELECIONAR O VENCEDOR
    
    // Remove duplicados e candidatos com penalidade
    const unicos = [...new Map(candidatos.map(item => [item.valor, item])).values()];
    let candidatosValidos = unicos.filter(c => !c.penalidade);

    if (candidatosValidos.length === 0) return; // Nenhuma evidência forte, não faz nada.

    // Lógica para listas de aluguel
    const eListaAluguel = /locaçao|aluguel/i.test(textoCru) && candidatosValidos.filter(c => c.valor < 80000).length > 2;
    if (eListaAluguel) {
        candidatosValidos.sort((a, b) => a.index - b.index); // Ordena pelo primeiro que aparece
    } else {
        candidatosValidos.sort((a, b) => {
            if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
            return b.valor - a.valor; // Desempate pelo maior valor
        });
    }

    const vencedor = candidatosValidos[0];

    // FASE 3: LÓGICA DE INTERVENÇÃO ASSERTIVA
    if (!vencedor) return; // Se depois de tudo não sobrou ninguém, não faz nada.

    const deveCorrigir = 
        // 1. O valor original era nulo e encontramos um.
        (valorOriginal === null) ||
        // 2. O vencedor tem prioridade máxima (é um preço final) e é diferente do original.
        (vencedor.prioridade === 1 && vencedor.valor !== valorOriginal) ||
        // 3. O valor original era claramente um erro (ex: taxa de condomínio) e achamos um candidato melhor sem penalidade.
        (candidatos.some(c => c.valor === valorOriginal && c.penalidade) && !vencedor.penalidade);

    if (deveCorrigir) {
        anuncioCorrigido.valor = vencedor.valor;
    }
};

// --- 4. EXECUÇÃO E AJUSTES FINAIS ---

auditarValorImovel();

// Ajuste Fino do Tipo de Operação (apenas se o valor foi alterado)
if (anuncioCorrigido.valor && anuncioCorrigido.valor !== valorOriginal) {
    if (anuncioCorrigido.valor >= 80000 && anuncioCorrigido.tipo_operacao !== 'venda') {
        anuncioCorrigido.tipo_operacao = 'venda';
    } else if (anuncioCorrigido.valor > 0 && anuncioCorrigido.valor < 80000 && anuncioCorrigido.tipo_operacao !== 'aluguel') {
        anuncioCorrigido.tipo_operacao = 'aluguel';
    }
}

// --- 5. RETORNO DOS DADOS ---
return { caracteristicas: anuncioCorrigido };