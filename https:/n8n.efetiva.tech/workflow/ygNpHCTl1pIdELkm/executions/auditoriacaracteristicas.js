// ===================================================================================
// === NÓ DE AUDITORIA V3 - ESTRATÉGIA DE ALTA PRECISÃO E INTERVENÇÃO MÍNIMA ===
// ===================================================================================
// Esta versão corrige a falha da V2 ao adotar uma abordagem mais segura.
// 1. Usa regex de alta precisão para identificar APENAS candidatos a preço prováveis.
// 2. Só intervém se o valor original estiver claramente errado ou ausente.
// 3. Na dúvida, NÃO ALTERA o resultado, evitando a criação de novos erros.

// --- 1. CONFIGURAÇÃO INICIAL ---

const extracaoInicial = $json.caracteristicas;
// ATENÇÃO: Ajuste a referência abaixo SE o nome do seu nó de loop for diferente de "Loop Over Items3"
const mensagemOriginal = $('Loop Over Items3').item.json.caractbd.mensagem;

if (!extracaoInicial || !mensagemOriginal || typeof mensagemOriginal !== 'string') {
  return { caracteristicas: extracaoInicial || {} };
}

const anuncioCorrigido = JSON.parse(JSON.stringify(extracaoInicial));
const valorOriginal = extracaoInicial.valor;

// --- 2. PARSER DE VALOR (REFINADO E SEGURO) ---

const parseValorV3 = (str) => {
    if (typeof str !== 'string') return null;

    let cleanStr = str.toLowerCase().trim()
        .replace(/r\$|rs|\$|\s/g, ''); // Remove símbolos de moeda e espaços

    // Lida com o formato "1. 200" -> 1200000
    if (/^\d\.\d{3}$/.test(cleanStr)) {
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
    } else if (cleanStr.endsWith('m')) {
         // Evita confundir '100m' (metros) com milhão. Só aceita se for um valor composto.
        if (str.match(/[.,]/)) {
            multiplicador = 1000000;
            cleanStr = cleanStr.slice(0, -1);
        }
    }

    // A causa dos bugs anteriores: remove pontos de milhar, DEPOIS troca vírgula por ponto.
    // Ex: "1.500.000,00" -> "1500000,00" -> "1500000.00"
    // Ex: "1.500.000" -> "1500000" -> "1500000"
    cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');

    const valor = parseFloat(cleanStr);
    return isNaN(valor) ? null : valor * multiplicador;
};


// --- 3. LÓGICA DE AUDITORIA (PRECISÃO CIRÚRGICA) ---

const auditarValorImovel = () => {
    const textoCru = mensagemOriginal.replace(/~~/g, ' riscado ');
    const candidatos = [];

    // FASE 1: IDENTIFICAR CANDIDATOS DE ALTÍSSIMA CONFIANÇA
    // Cada regex é desenhada para encontrar um padrão de preço e ignorar ruído.
    const padroesDePreco = [
        // Padrão 1: Palavras-chave fortes (agora, por) + R$ + valor
        /(?:agora|por)\s*(?:r\$|rs)?\s*([\d.,\s]+milh[oõ]es|[\d.,\s]+milhao|[\d.,\s]+mil|[\d.,\s]+k|[\d.,\s]+m\b|[\d.,\s]{2,})/gi,
        // Padrão 2: Palavras-chave padrão (valor, preço) + R$ + valor
        /(?:valor|preço|preco|venda|aluguel)\s*:?\s*(?:r\$|rs)?\s*([\d.,\s]+milh[oõ]es|[\d.,\s]+milhao|[\d.,\s]+mil|[\d.,\s]+k|[\d.,\s]+m\b|[\d.,\s]{2,})/gi,
        // Padrão 3: Apenas R$ + valor bem formatado (com ponto ou virgula, ou > 4 digitos)
        /(?:r\$|rs)\s*([\d.,\s]{4,}|[\d.,\s]*[.,][\d.,\s]*)/gi,
        // Padrão 4: Valor bem formatado seguido de "mil" ou "milhões"
        /([\d.,\s]+)\s*(mil|milhao|milh[oõ]es)\b/gi,
        // Padrão 5: Casos como "Valor 1. 200 estourando 1.300"
        /(?:valor|ate)\s*([\d\.\s]+)\s*(?:estourando|e|a)\s*([\d\.\s]+)/gi
    ];

    for (const regex of padroesDePreco) {
        let match;
        while ((match = regex.exec(textoCru))) {
            // Itera sobre os grupos capturados no match
            for (let i = 1; i < match.length; i++) {
                if (match[i]) {
                    const valorStr = match[i];
                    const valorNum = parseValorV3(valorStr);
                    if (valorNum && valorNum > 10) { // Ignora valores irrelevantes
                        const contexto = textoCru.substring(Math.max(0, match.index - 15), match.index + match[0].length + 15);
                        // Filtro final para evitar ruído
                        if (!/m2|m²|quarto|suite|vaga|iptu|condominio|cond\b/i.test(contexto)) {
                           candidatos.push({
                                valor: valorNum,
                                prioridade: /agora|por|baixou|final/i.test(match[0]) ? 1 : 2, // Prioridade máxima para valores finais
                                texto: match[0]
                            });
                        }
                    }
                }
            }
        }
    }
    
    if (candidatos.length === 0) {
        // NENHUM candidato de alta confiança foi encontrado.
        // Ação: Não fazer nada. Confiar no script original.
        return;
    }

    // FASE 2: SELECIONAR O MELHOR CANDIDATO (VENCEDOR)
    candidatos.sort((a, b) => {
        if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade; // Prioridade 1 (agora, por) vem primeiro
        return b.valor - a.valor; // Se a prioridade for a mesma, pega o maior valor
    });
    const vencedor = candidatos[0];

    // FASE 3: LÓGICA DE DECISÃO PARA INTERVIR
    
    // CASO 1: O valor original era NULO, e encontramos um bom candidato.
    if (valorOriginal === null) {
        anuncioCorrigido.valor = vencedor.valor;
        return;
    }

    // CASO 2: O valor original é claramente um erro (muito pequeno, provavelmente contagem de quartos/vagas).
    if (valorOriginal < 1000 && vencedor.valor >= 1000) {
        anuncioCorrigido.valor = vencedor.valor;
        return;
    }
    
    // CASO 3: O valor original é DIFERENTE do nosso vencedor, que tem prioridade máxima (é um preço final).
    if (vencedor.prioridade === 1 && vencedor.valor !== valorOriginal) {
        anuncioCorrigido.valor = vencedor.valor;
        return;
    }

    // CASO 4: O valor original veio de uma taxa (ex: IPTU anual confundido com preço)
    if (valorOriginal > 1000 && vencedor.valor > valorOriginal) {
        const contextoOriginal = textoCru.match(new RegExp(`.{0,15}${valorOriginal.toString().substring(0,4)}.{0,15}`, 'i'));
        if (contextoOriginal && /iptu|cond/i.test(contextoOriginal[0])) {
            anuncioCorrigido.valor = vencedor.valor;
            return;
        }
    }
};


// --- 4. EXECUÇÃO E AJUSTES FINAIS ---

auditarValorImovel();

// Ajuste Fino do Tipo de Operação (apenas se o valor foi alterado e é válido)
if (anuncioCorrigido.valor && anuncioCorrigido.valor !== valorOriginal) {
    if (anuncioCorrigido.valor >= 80000 && anuncioCorrigido.tipo_operacao !== 'venda') {
        anuncioCorrigido.tipo_operacao = 'venda';
    } else if (anuncioCorrigido.valor > 0 && anuncioCorrigido.valor < 80000 && anuncioCorrigido.tipo_operacao !== 'aluguel') {
        anuncioCorrigido.tipo_operacao = 'aluguel';
    }
}

// --- 5. RETORNO DOS DADOS ---
return { caracteristicas: anuncioCorrigido };