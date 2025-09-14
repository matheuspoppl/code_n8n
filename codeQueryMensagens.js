/*
 * =================================================================================
 * == Motor de Matchmaking v1.1 - Busca Detalhada de Parceiros (mensagens) ==
 * =================================================================================
 * Este script recebe as características de um imóvel (oferta) e gera 4 queries SQL
 * em cascata para encontrar procuras compatíveis (leads de parceiros)
 * na tabela 'mensagens', retornando um conjunto detalhado de campos.
 * =================================================================================
 */

// --- ETAPA 1: CAPTURAR E ESTRUTURAR OS DADOS DE ENTRADA ---

const inputData = $json.data || [];

const caracteristicasAnuncio = inputData.find(item => item.caracteristicas)?.caracteristicas;
const localizacaoAnuncio = inputData.find(item => item.localizacao)?.localizacao;

// Validação de segurança: Interrompe se os dados mínimos não existirem.
if (!caracteristicasAnuncio || !localizacaoAnuncio || !caracteristicasAnuncio.tipo_operacao || !caracteristicasAnuncio.valor || !localizacaoAnuncio.bairro) {
  return {
    error: "Dados de entrada insuficientes. Verifique se 'tipo_operacao', 'valor' e 'bairro' foram extraídos.",
    queries: {}
  };
}

// --- ETAPA 2: MAPEAMENTO E LÓGICA DE BUSCA ---

// A operação da procura deve ser a mesma da oferta (venda com venda, aluguel com aluguel).
const tipoOperacaoProcura = caracteristicasAnuncio.tipo_operacao;

// "Famílias de Imóveis" para busca flexível.
const familiasImoveis = {
  'Apartamento': ['Apartamento', 'Cobertura', 'Studio', 'Kitnet', 'Flat', 'Garden'],
  'Cobertura': ['Apartamento', 'Cobertura'],
  'Studio': ['Apartamento', 'Studio', 'Kitnet', 'Flat'],
  'Kitnet': ['Apartamento', 'Studio', 'Kitnet'],
  'Flat': ['Apartamento', 'Studio', 'Flat'],
  'Garden': ['Apartamento', 'Garden'],
  'Casa': ['Casa', 'Casa de Condomínio', 'Sobrado', 'Sítio', 'Chácara', 'Mansão'],
  'Casa de Condomínio': ['Casa', 'Casa de Condomínio', 'Sobrado', 'Mansão'],
  'Sobrado': ['Casa', 'Sobrado'],
  'Imóvel Comercial': ['Imóvel Comercial', 'Loja', 'Sala Comercial', 'Galpão'],
  'Loja': ['Imóvel Comercial', 'Loja', 'Ponto Comercial'],
  'Sala Comercial': ['Imóvel Comercial', 'Sala Comercial', 'Escritório', 'Clínica'],
  'Terreno': ['Terreno', 'Lote', 'Gleba'],
};

const familiaAnuncio = familiasImoveis[caracteristicasAnuncio.tipo_imovel] || [caracteristicasAnuncio.tipo_imovel];
const tiposImovelParaBuscar = familiaAnuncio.map(t => `'${t}'`).join(', ');

// --- ETAPA 3: CONSTRUÇÃO DAS QUERIES EM CASCATA ---

let queries = {};
// Define a lista de campos detalhados para incluir em todas as queries
const camposDetalhados = `grupo_nome, mensagem_datetime, tipo_operacao, tipo_imovel, quartos, valor, localizacao`;

// --- Query 1: Match Essencial (Bairro) ---
const buildQuery1 = () => {
  const whereParts = [
    `intencao = 'procura'`,
    `tipo_operacao ILIKE '%${tipoOperacaoProcura}%'`,
    `bairro ILIKE '%${localizacaoAnuncio.bairro}%'`,
    `(valor >= ${caracteristicasAnuncio.valor} AND valor IS NOT NULL)`
  ];
  return `SELECT id, mensagem_conteudo, autor_telefone, autor_nome, ${camposDetalhados} FROM public.mensagens WHERE ${whereParts.join(' AND ')};`;
};
queries.query1_essencial_bairro = buildQuery1();


// --- Query 2: Match Essencial (Localização Específica) ---
const buildQuery2 = () => {
  const localizacoesEspecificas = [
    localizacaoAnuncio.regiao,
    localizacaoAnuncio.rua,
    localizacaoAnuncio.condominio
  ].filter(Boolean);

  if (localizacoesEspecificas.length === 0) {
    return "SELECT 'Nenhuma localização específica (região, rua ou condomínio) foi fornecida no anúncio para esta busca.' AS resultado;";
  }

  const whereParts = [
    `intencao = 'procura'`,
    `tipo_operacao ILIKE '%${tipoOperacaoProcura}%'`,
    `(valor >= ${caracteristicasAnuncio.valor} AND valor IS NOT NULL)`
  ];
  
  const ilikeConditions = localizacoesEspecificas.map(loc => `mensagem_conteudo ILIKE '%${loc}%'`);
  whereParts.push(`(${ilikeConditions.join(' OR ')})`);

  return `SELECT id, mensagem_conteudo, autor_telefone, autor_nome, ${camposDetalhados} FROM public.mensagens WHERE ${whereParts.join(' AND ')};`;
};
queries.query2_essencial_especifico = buildQuery2();


// --- Query 3: Lista Qualificada e Ranqueada (com Tipo de Imóvel) ---
const buildQuery3 = () => {
  const scoringParts = [
    `(CASE WHEN bairro ILIKE '%${localizacaoAnuncio.bairro}%' THEN 8 ELSE 0 END)`,
    `(CASE WHEN tipo_imovel IN (${tiposImovelParaBuscar}) THEN 6 ELSE 0 END)`,
    `(CASE WHEN valor >= ${caracteristicasAnuncio.valor} THEN 10 ELSE 0 END)`
  ];
  const whereParts = [
    `intencao = 'procura'`,
    `tipo_operacao ILIKE '%${tipoOperacaoProcura}%'`,
    `bairro ILIKE '%${localizacaoAnuncio.bairro}%'`,
    `tipo_imovel IN (${tiposImovelParaBuscar})`,
    `(valor >= ${caracteristicasAnuncio.valor} AND valor IS NOT NULL)`
  ];

  const selectClause = `SELECT id, mensagem_conteudo, autor_telefone, autor_nome, (${scoringParts.join(' + ')}) AS pontuacao_match, ${camposDetalhados}`;
  const fromClause = ` FROM public.mensagens`;
  const whereClause = ` WHERE ${whereParts.join(' AND ')}`;
  const orderByClause = ` ORDER BY pontuacao_match DESC;`;
  
  return `${selectClause}${fromClause}${whereClause}${orderByClause}`;
};
queries.query3_qualificada_tipo = buildQuery3();


// --- Query 4: Lista Super Qualificada e Ranqueada (com Tipo e Quartos) ---
const buildQuery4 = () => {
  if (!caracteristicasAnuncio.quartos) {
    return "SELECT 'Anúncio sem número de quartos para realizar a busca super qualificada.' AS resultado;";
  }

  const scoringParts = [
    `(CASE WHEN bairro ILIKE '%${localizacaoAnuncio.bairro}%' THEN 8 ELSE 0 END)`,
    `(CASE WHEN tipo_imovel IN (${tiposImovelParaBuscar}) THEN 6 ELSE 0 END)`,
    `(CASE WHEN valor >= ${caracteristicasAnuncio.valor} THEN 10 ELSE 0 END)`,
    `(CASE WHEN quartos <= ${caracteristicasAnuncio.quartos} THEN 4 ELSE 0 END)`
  ];
  const whereParts = [
    `intencao = 'procura'`,
    `tipo_operacao ILIKE '%${tipoOperacaoProcura}%'`,
    `bairro ILIKE '%${localizacaoAnuncio.bairro}%'`,
    `tipo_imovel IN (${tiposImovelParaBuscar})`,
    `(valor >= ${caracteristicasAnuncio.valor} AND valor IS NOT NULL)`,
    `(quartos <= ${caracteristicasAnuncio.quartos} AND quartos IS NOT NULL)`
  ];

  const selectClause = `SELECT id, mensagem_conteudo, autor_telefone, autor_nome, (${scoringParts.join(' + ')}) AS pontuacao_match, ${camposDetalhados}`;
  const fromClause = ` FROM public.mensagens`;
  const whereClause = ` WHERE ${whereParts.join(' AND ')}`;
  const orderByClause = ` ORDER BY pontuacao_match DESC;`;

  return `${selectClause}${fromClause}${whereClause}${orderByClause}`;
};
queries.query4_super_qualificada_completa = buildQuery4();


// --- ETAPA 5: RETORNO FINAL ---
// Remove as quebras de linha de todas as queries para evitar erros de execução.
for (const key in queries) {
  queries[key] = queries[key].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

return { queries };
