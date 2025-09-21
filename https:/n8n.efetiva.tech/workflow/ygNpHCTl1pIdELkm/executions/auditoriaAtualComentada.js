// ===================================================================================
// === NÓ DE AUDITORIA V16 - A VERSÃO CONSOLIDADA ESTÁVEL ===
// ===================================================================================
// ESTA É A VERSÃO DEFINITIVA, CONSTRUÍDA SOBRE A BASE V13.
// 1. FUNDAÇÃO SÓLIDA: Mantém a performance para Valor, Intenção e Taxas.
// 2. SEM BUGS DE ESCOPO: O erro 'valorOriginal is not defined' foi corrigido.
// 3. MÓDULOS COMPLETOS: Integra as auditorias para 'tipo_imovel' e 'quartos'
//    de forma segura e isolada para garantir consistência e previsibilidade.

// --- 1. CONFIGURAÇÃO INICIAL ---
// OBJETIVO: Preparar os dados de entrada e criar um ambiente seguro para as modificações.

// Pega o resultado da extração do Nó 1. É o nosso "rascunho" inicial.
const extracaoInicial = $json.caracteristicas; 
// Pega a mensagem de texto BRUTA, original, de um nó anterior ao Nó 1.
// É crucial usar o texto original para a auditoria não ser influenciada por possíveis erros de normalização do Nó 1.
const mensagemOriginal = $('Loop Over Items3').item.json.caractbd.mensagem;

// CLÁUSULA DE GUARDA (SAFETY CHECK): Se não houver dados do Nó 1 ou a mensagem original,
// o código para aqui e retorna o que tiver, evitando que o workflow quebre com um erro.
if (!extracaoInicial || !mensagemOriginal || typeof mensagemOriginal !== 'string') {
  return { caracteristicas: extracaoInicial || {} };
}

// CRIA UMA CÓPIA PROFUNDA (DEEP COPY): Cria um clone exato do objeto vindo do Nó 1.
// POR QUÊ? Para que possamos modificar `anuncioCorrigido` à vontade, sem alterar o objeto original (`extracaoInicial`).
// Isso é essencial para fazer comparações do tipo "antes e depois".
const anuncioCorrigido = JSON.parse(JSON.stringify(extracaoInicial));

// ARMAZENA O ESTADO "ANTES": Guarda os valores de `valor` e `tipo_operacao` extraídos pelo Nó 1.
// POR QUÊ? Para, no final do script, podermos comparar se a nossa auditoria mudou o valor.
// Se o valor mudou (ex: de 5.000 para 500.000), talvez o tipo de operação também precise mudar (de 'aluguel' para 'venda').
const valorOriginal = extracaoInicial.valor;
const tipoOperacaoOriginal = extracaoInicial.tipo_operacao;


// --- 2. FUNÇÕES DE AJUDA ---
// OBJETIVO: Centralizar lógicas reutilizáveis, como a conversão de texto para número.

/**
 * Converte uma string (ex: "R$ 1.500 mil") em um número (ex: 1500000).
 * É mais inteligente que um parseFloat simples.
 * @param {string} str - A string a ser convertida.
 * @param {string} [contexto=''] - Um trecho do texto original ao redor do número para ajudar a tomar decisões.
 * @returns {number|null} - O número convertido ou null se for inválido.
 */
const parseNumero = (str, contexto = '') => {
    if (typeof str !== 'string') return null;
    
    // 1. LIMPEZA INICIAL: Remove símbolos de moeda e espaços em branco.
    let cleanStr = str.toLowerCase().trim().replace(/r\$|rs|\$|\s/g, '');
    
    // 2. REGRA ESPECIAL DE NEGÓCIO: Trata o caso "1.500" que significa "um milhão e quinhentos mil".
    // ACIONADO QUANDO: A string tem o formato exato de um dígito, um ponto e três dígitos (ex: "1.500", "2.200").
    // E o contexto NÃO menciona aluguel (para não confundir "aluguel 1.500" com 1.5 milhão).
    if (/^\d\.\d{3}$/.test(cleanStr) && !/aluguel|locacao/i.test(contexto)) {
        return parseFloat(cleanStr.replace('.', '')) * 1000; // "1500" -> 1500 * 1000 = 1.500.000 (caso comum em anúncios de venda)
    }
    
    // 3. TRATAMENTO DE SUFIXOS: Identifica e aplica multiplicadores para "mil", "k", "milhão".
    let multiplicador = 1;
    if (cleanStr.endsWith('mil')) { multiplicador = 1000; cleanStr = cleanStr.slice(0, -3); }
    else if (cleanStr.endsWith('k')) { multiplicador = 1000; cleanStr = cleanStr.slice(0, -1); }
    else if (cleanStr.includes('milh')) { multiplicador = 1000000; cleanStr = cleanStr.replace(/milh[aão|oes].*/, ''); }
    
    // 4. NORMALIZAÇÃO DE PONTOS E VÍRGULAS: Converte o formato brasileiro para o formato numérico padrão (com ponto decimal).
    const dotCount = (cleanStr.match(/\./g) || []).length;
    // ACIONADO QUANDO: Existem múltiplos pontos e nenhuma vírgula (ex: "2.500.000").
    if (dotCount > 1 && !cleanStr.includes(',')) {
        const lastDotIndex = cleanStr.lastIndexOf('.');
        const integerPart = cleanStr.substring(0, lastDotIndex).replace(/\./g, '');
        const decimalPart = cleanStr.substring(lastDotIndex + 1);
        cleanStr = `${integerPart}.${decimalPart}`; // Transforma "2.500.00" em "2500.00".
    } else {
        // Lógica padrão: remove pontos de milhar e troca vírgula decimal por ponto.
        cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    }

    // 5. CONVERSÃO FINAL: Converte a string limpa para número.
    const valor = parseFloat(cleanStr);
    
    // Retorna o valor final arredondado, ou null se a conversão falhou.
    return isNaN(valor) ? null : Math.round(valor * multiplicador);
};


// --- 3. AUDITORIAS MODULARES ---
// OBJETIVO: Cada função é um especialista em auditar um campo específico do anúncio.

/**
 * Reavalia o VALOR do imóvel a partir do texto original.
 * Esta função é a mais complexa, pois tenta encontrar o preço mais provável,
 * especialmente em textos com valores antigos, novos, ou números que não são preços.
 */
const auditarValorImovel = () => {
    // Substitui o texto riscado "~~" por uma palavra, para que valores riscados não sejam capturados.
    const textoCru = mensagemOriginal.replace(/~~/g, ' riscado ');
    let candidatos = []; // Lista para armazenar todos os números que podem ser o preço.

    // Define uma lista de expressões regulares (Regex), da mais específica à mais geral.
    const padroesDePreco = [
        // Padrão 1 (ALTA PRIORIDADE): Captura valores após termos que indicam atualização de preço.
        /(?:agora|por|baixou para)\s*(?:r\$|rs)?\s*([\d.,\s]+milh[oõ]es|[\d.,\s]+milhao|[\d.,\s]+mil|[\d.,\s]+k|[\d.,\s]{2,})/gi,
        // Padrão 2 (MÉDIA PRIORIDADE): Captura valores após palavras-chave comuns de preço.
        /(?:valor|preço|preco|venda|aluguel|investimento)\s*[:;]?\s*(?:r\$|rs)?\s*([\d.,\s]+milh[oõ]es|[\d.,\s]+milhao|[\d.,\s]+mil|[\d.,\s]+k|[\d.,\s]{2,})/gi,
        // Padrão 3 (BAIXA PRIORIDADE): Captura valores que começam com "R$" e são longos.
        /(?:r\$|rs)\s*([\d.,\s]{4,}|[\d.,\s]*[.,][\d.,\s]*)/gi,
        // Padrão 4: Captura faixas de preço (ex: "valor 1.500 a 1.600").
        /(?:valor|ate)\s*([\d\.\s]+)\s*(?:estourando|e|a)\s*([\d\.\s]+)/gi,
        // Padrão 5: Captura qualquer número grande e bem formatado (com pontos de milhar), que é provavelmente um preço.
        /\b(\d{1,3}(?:\.\d{3}){2,},\d{2})\b|\b(\d{1,3}(?:\.\d{3}){2,})\b/g
    ];

    // Itera sobre cada padrão de Regex para encontrar todos os possíveis candidatos a preço.
    for (const regex of padroesDePreco) {
        let match;
        while ((match = regex.exec(textoCru))) {
            const fullMatchText = match[0].toLowerCase();
            // Itera sobre os grupos de captura da Regex (os trechos dentro de parênteses).
            for (let i = 1; i < match.length; i++) {
                if (match[i]) { // Se o grupo capturou algum valor...
                    const valorStr = match[i];
                    // Pega o texto ao redor do valor encontrado para análise de contexto.
                    const contextoCompleto = textoCru.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30);
                    const valorNum = parseNumero(valorStr, contextoCompleto);
                    
                    if (valorNum && valorNum > 10) { // Se for um número válido...
                        // Adiciona o candidato à lista com metadados para a decisão final.
                        candidatos.push({
                            valor: valorNum,
                            index: match.index, // Posição no texto, para desempate.
                            // PRIORIDADE: Se o texto contém "agora", "baixou", etc., recebe prioridade 1 (mais importante). Senão, 2.
                            prioridade: /agora|por|baixou|final/i.test(fullMatchText) ? 1 : 2,
                            // PENALIDADE: Se o contexto menciona "gasto", "reforma", "débito", etc., é marcado como penalizado.
                            // POR QUÊ? Para evitar confundir o preço do imóvel com o custo de uma reforma.
                            penalidade: /gasto|reforma|taxas\s*\d|debito/i.test(contextoCompleto.toLowerCase())
                        });
                    }
                }
            }
        }
    }

    // Filtra a lista de candidatos para remover duplicados e os que têm penalidade.
    const unicos = [...new Map(candidatos.map(item => [item.valor, item])).values()];
    let candidatosValidos = unicos.filter(c => !c.penalidade);
    
    if (candidatosValidos.length === 0) return; // Se não sobrou nenhum candidato válido, encerra a função.

    // REGRA DE NEGÓCIO P/ LISTA DE ALUGUÉIS: Se o texto parece uma lista de aluguéis
    // (menciona "aluguel" e tem mais de 2 valores baixos), muda a ordenação.
    const eListaAluguel = /locaçao|aluguel/i.test(textoCru) && candidatosValidos.filter(c => c.valor < 80000).length > 2;
    if (eListaAluguel) {
        // Ordena pela ordem de aparição no texto.
        candidatosValidos.sort((a, b) => a.index - b.index);
    } else {
        // Ordenação padrão: Primeiro por prioridade, depois pelo maior valor.
        candidatosValidos.sort((a, b) => {
            if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade; // Prioridade 1 vem primeiro.
            return b.valor - a.valor; // O mais caro primeiro.
        });
    }

    // O melhor candidato é o primeiro da lista ordenada.
    const vencedor = candidatosValidos[0];
    if (!vencedor) return;

    // LÓGICA DE DECISÃO FINAL: Quando devemos sobrescrever o valor do Nó 1?
    const deveCorrigir = 
        // CONDIÇÃO 1: O Nó 1 não encontrou valor algum.
        (valorOriginal === null) ||
        // CONDIÇÃO 2: Encontramos um vencedor de alta prioridade (ex: "baixou para") que é diferente do valor original.
        (vencedor.prioridade === 1 && vencedor.valor !== valorOriginal) ||
        // CONDIÇÃO 3: O valor que o Nó 1 pegou era um valor penalizado, e nós encontramos um candidato melhor, não penalizado.
        (candidatos.some(c => c.valor === valorOriginal && c.penalidade) && !vencedor.penalidade);
    
    if (deveCorrigir) {
        anuncioCorrigido.valor = vencedor.valor;
    }
};

/**
 * Reavalia a INTENÇÃO (oferta vs. procura) e FILTRA anúncios inválidos (spam, links, etc).
 * Retorna 'false' se o anúncio deve ser descartado.
 */
const auditarIntencaoEFiltrar = () => {
    // Normaliza o texto para facilitar a busca por palavras-chave.
    const textoNormalizado = mensagemOriginal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // FILTRO DE SPAM/LIXO: Se o texto contém algum desses padrões, é considerado inválido.
    const patternsInvalidos = /erro de interpretaçao|muito obrigada|nem sempre|piano|barratt & robinson|instagram\.com\/reel|quintoandar\.com|segue o link/;
    if (patternsInvalidos.test(textoNormalizado)) {
        // Zera todos os campos (exceto contato) para indicar que o anúncio não deve ser processado.
        Object.keys(anuncioCorrigido).forEach(key => { if (!['nome_anunciante', 'telefone_anunciante'].includes(key)) { anuncioCorrigido[key] = null; } });
        return false; // Sinaliza que a execução das outras auditorias deve parar.
    }
    
    // SISTEMA DE PONTUAÇÃO (SCORING): Em vez de 'if/else', usamos um placar.
    // Pontos positivos indicam 'procura', pontos negativos indicam 'oferta'.
    let intencaoScore = 0;
    
    const T_PROCURA_FORTE = /\b(procuro|busco|buscando|preciso|necessito|cliente (procura|busca|quer|compra)|quem tiver|alguem (tem|com)|vc tem|precioso de)\b/;
    const T_OFERTA_FORTE = /\b(vendo|vende-se|alugo|aluga-se|disponivel para|oportunidade|lançamento|imperdivel|exclusividade)\b/;
    
    // Aplica os pesos baseados nas palavras-chave encontradas.
    if (T_PROCURA_FORTE.test(textoNormalizado)) intencaoScore += 100;
    if (T_OFERTA_FORTE.test(textoNormalizado)) intencaoScore -= 100;
    // HEURÍSTICA: Se não tem preço, é mais provável que seja uma procura.
    if (anuncioCorrigido.valor === null) {
        // Evita falso positivo em mensagens de corretores que se apresentam ("trabalhamos com...").
        if (!/trabalhamos com|atuamos com|consultoria/i.test(textoNormalizado)) { intencaoScore += 75; }
    }
    // HEURÍSTICA: Se fala de parceria ou outros países, provavelmente é uma oferta de serviço, não de imóvel específico.
    if (/parceria|exterior|estados unidos|portugal|dubai|espanha|trabalhamos com|atuamos com|consultoria/i.test(textoNormalizado)) { intencaoScore -= 80; }
    // HEURÍSTICA: Se contém uma interrogação, aumenta a chance de ser uma procura.
    if (mensagemOriginal.includes('?')) intencaoScore += 20;

    // DECISÃO FINAL: Com base na pontuação, define a intenção.
    if (intencaoScore > 25) { anuncioCorrigido.intencao = 'procura'; }
    else if (intencaoScore < -25) { anuncioCorrigido.intencao = 'oferta'; }
    
    return true; // Sinaliza que o anúncio é válido e a execução pode continuar.
};


/**
 * Reavalia as TAXAS (IPTU e Condomínio) com lógica mais detalhada.
 */
const auditarTaxas = () => {
    const textoCru = mensagemOriginal;
    let iptuCorrigido = null;
    
    // CASO 1: IPTU ISENTO. A forma mais fácil de identificar.
    if (/iptu\s*(isento|isenta)/i.test(textoCru)) {
        iptuCorrigido = 0;
    } else {
        // CASO 2: IPTU DECLARADO. Regex complexa para capturar o valor e o contexto (anual, mensal, parcelado).
        const regexIptu = /(iptu\s*[:;.]?\s*(?:r\$|rs)?\s*([\d.,]+)|([\d.,]+)\s*de\s*iptu)[\s\S]{0,15}(anual|ano|\/ano|m[eê]s|mensal|cota|parcelado em (\d+)\s*x)/i;
        const match = textoCru.match(regexIptu);
        if (match) {
            const valorStr = match[2] || match[3];
            let valor = parseNumero(valorStr);
            if (valor) {
                const contexto = match[0].toLowerCase();
                const parcelas = match[5] ? parseInt(match[5], 10) : 12;
                
                // Lógica de conversão para valor MENSAL.
                if (/anual|ano|\/ano/.test(contexto)) { iptuCorrigido = Math.round(valor / 12); }
                else if (/parcelado em/.test(contexto) || /cota/.test(contexto)) {
                    // Lógica mais complexa para valores parcelados.
                    const divisor = parcelas > 1 ? parcelas : 10;
                    const matchTotal = contexto.match(/([\d.,]+)\/ano, parcelado/);
                    if (matchTotal) { const valorTotal = parseNumero(matchTotal[1]); iptuCorrigido = Math.round(valorTotal / divisor); }
                    else { iptuCorrigido = valor; } // Se não especifica o total, assume que o valor da cota é o mensal.
                } 
                // HEURÍSTICA: Se o valor for muito alto (>2500) e não disser que é mensal, assume-se que é anual.
                else if (valor > 2500 && !/m[eê]s|mensal/.test(contexto)) { iptuCorrigido = Math.round(valor / 12); }
                else { iptuCorrigido = valor; } // Caso padrão, o valor é mensal.
            }
        }
    }
    
    // LÓGICA PARA CONDOMÍNIO: Mais simples, pois geralmente é mensal.
    let condCorrigido = null;
    const regexCond = /(?:condom[ií]nio|cond\.?|taxas)\s*[:;]?\s*(?:r\$|rs)?\s*([\d.,]+)/i;
    const matchCond = textoCru.match(regexCond);
    if (matchCond) {
        const valor = parseNumero(matchCond[1]);
        // VALIDAÇÃO: O valor do condomínio deve ser razoável (>50, <30000) e menor que o valor do imóvel.
        if (valor && valor > 50 && valor < 30000 && anuncioCorrigido.valor && valor < anuncioCorrigido.valor) {
            condCorrigido = valor;
        }
    }
    
    // Aplica as correções se valores válidos foram encontrados.
    if (iptuCorrigido !== null) anuncioCorrigido.iptu = iptuCorrigido;
    if (condCorrigido !== null) anuncioCorrigido.condominio = condCorrigido;
};

/**
 * Reavalia o TIPO DE IMÓVEL para corrigir classificações erradas do Nó 1.
 */
const auditarTipoImovel = () => {
    const textoNormalizado = mensagemOriginal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // A lógica é uma cascata de 'if/else if', da mais específica para a mais geral.
    // Ex: "cobertura" é verificado antes de "apartamento" para evitar que uma cobertura seja classificada como apartamento.
    if (/\b(cobertura|duplex|triplex)\b/.test(textoNormalizado)) { anuncioCorrigido.tipo_imovel = 'Cobertura'; }
    else if (/\b(sala comercial|loja|galpao|ponto comercial|corporate|offices|casa comercial)\b/.test(textoNormalizado)) { anuncioCorrigido.tipo_imovel = 'Imóvel Comercial'; }
    else if (/\b(casa|sobrado|mansao)\b/.test(textoNormalizado)) {
        // Tratamento de ambiguidade: "casa comercial".
        if (!/\b(comercial)\b/.test(textoNormalizado)) { anuncioCorrigido.tipo_imovel = 'Casa'; }
        else { anuncioCorrigido.tipo_imovel = 'Imóvel Comercial'; }
    } else if (/\b(apartamento|apto|ap\s|quarto e sala|sala e quarto|garden|flat|studio)\b/.test(textoNormalizado)) { anuncioCorrigido.tipo_imovel = 'Apartamento'; }
    else if (/\b(terreno|lote)\b/.test(textoNormalizado)) { anuncioCorrigido.tipo_imovel = 'Terreno'; }
    // HEURÍSTICA FINAL: Se nenhum tipo foi encontrado, mas o anúncio fala de "quartos",
    // é muito provável que seja um imóvel residencial (Apartamento ou Cobertura).
    else if (anuncioCorrigido.tipo_imovel === null && (/\d+\s*qto?s?/.test(textoNormalizado) || anuncioCorrigido.quartos > 0)) {
         if (/\b(duplex|triplex)\b/.test(textoNormalizado)) { anuncioCorrigido.tipo_imovel = 'Cobertura'; }
         else { anuncioCorrigido.tipo_imovel = 'Apartamento'; }
    }
};

/**
 * Reavalia a contagem de QUARTOS e SUÍTES, focando em casos complexos.
 */
const auditarComodos = () => {
    const textoNormalizado = mensagemOriginal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let quartosCount = 0;
    let suitesCount = 0;
    
    // Regex para encontrar todas as menções a quartos e suítes e pegar o maior número.
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

    // Casos específicos.
    if (/\b(quarto e sala|sala e quarto)\b/.test(textoNormalizado)) { quartosCount = Math.max(quartosCount, 1); }

    // CASO DE REVERSÃO: Captura anúncios que dizem "originalmente 4 quartos, hoje com 3".
    const matchRevertido = textoNormalizado.match(/original\s*(\d+)\s*quartos.*?(?:hoje com|transformados em|revertido para)\s*(\d+)/);
    if (matchRevertido) {
        quartosCount = parseInt(matchRevertido[2], 10); // Pega o número atual.
    }
    
    const temDependencia = /\b(dependencia completa|dep\. completa|dependencia reversivel|quarto de empregada)\b/.test(textoNormalizado);
    
    // Define a contagem base de quartos (usando suítes se a contagem de quartos for zero).
    let contagemBase = quartosCount > 0 ? quartosCount : suitesCount;
    
    // HEURÍSTICA DA DEPENDÊNCIA: Se tem "dependência completa" e não especifica "+ dep", soma 1 quarto.
    if (temDependencia && contagemBase > 0) {
        if (!/\d\s*\+\s*dep/.test(textoNormalizado)) {
             contagemBase += 1;
        }
    }
    
    // Aplica a correção se uma contagem válida foi encontrada.
    if (contagemBase > 0) {
        anuncioCorrigido.quartos = contagemBase;
    }
};


// --- 5. EXECUÇÃO ---
// OBJETIVO: Orquestrar a chamada das funções de auditoria na ordem correta.

// 1. Audita o valor primeiro, pois ele pode ser usado por outras funções.
auditarValorImovel();
// 2. Audita a intenção e verifica se o anúncio é válido.
const adValido = auditarIntencaoEFiltrar();

// 3. Se o anúncio for válido, executa as demais auditorias.
if (adValido) {
    auditarTaxas();
    auditarTipoImovel();
    auditarComodos();

    // 4. VALIDAÇÃO FINAL SIMPLES: Uma última verificação de sanidade.
    // ACIONADO QUANDO: O valor do condomínio é maior ou igual ao valor do imóvel, o que é impossível.
    if (anuncioCorrigido.valor && anuncioCorrigido.condominio && anuncioCorrigido.condominio >= anuncioCorrigido.valor) {
        anuncioCorrigido.condominio = null; // Zera o condomínio, pois foi extraído incorretamente.
    }
    
    // 5. AJUSTE FINO DO TIPO DE OPERAÇÃO:
    // ACIONADO QUANDO: A auditoria do valor MUDOU o preço extraído pelo Nó 1.
    if (anuncioCorrigido.valor && anuncioCorrigido.valor !== valorOriginal) {
        // Se o novo valor é alto, e a operação não era 'venda', corrige para 'venda'.
        if (anuncioCorrigido.valor >= 80000) {
            if(tipoOperacaoOriginal !== 'venda') anuncioCorrigido.tipo_operacao = 'venda';
        } 
        // Se o novo valor é baixo, e a operação não era 'aluguel', corrige para 'aluguel'.
        else if (anuncioCorrigido.valor > 0) {
            if(tipoOperacaoOriginal !== 'aluguel') anuncioCorrigido.tipo_operacao = 'aluguel';
        }
    }
}

// --- 6. RETORNO DOS DADOS ---
// OBJETIVO: Enviar o objeto final, corrigido e auditado, para o próximo nó do workflow.
return { caracteristicas: anuncioCorrigido };