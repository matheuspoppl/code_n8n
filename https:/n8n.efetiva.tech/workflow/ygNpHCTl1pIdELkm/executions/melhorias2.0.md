1. Módulo de Intenção (intencao):

Problema: A lógica atual prioriza a contagem de características (quartos, área) sobre palavras-chave explícitas de busca, classificando erroneamente mensagens de "procura" (que começam com "Busco", "Preciso") como "oferta".

Ação: Refatore o bloco de intencao para que a verificação de palavras-chave explícitas de procura (procuraRegex) tenha prioridade máxima. Se uma dessas palavras for encontrada, a intenção deve ser definida como "procura" imediatamente, ignorando outras heurísticas.

Problema: Mensagens muito curtas e diretas, sem verbos de busca (ex: "Loja ... Ipanema... Aluguel"), são classificadas como "oferta" por padrão.

Ação: Crie uma heurística adicional: se tipo_operacao for detectado, mas nenhum valor for encontrado, aumente a probabilidade de a intencao ser "procura".

2. Módulo de Extração de Valores Numéricos:

Problema: A função de parse de números (parseNumber ou parseTaxaRobusta) falha com valores formatados com ponto e dois zeros para centavos (ex: "800.00" é convertido para 80000).

Ação: Melhore a função de parse para identificar corretamente o formato XXX.XX como decimal. Uma sugestão é verificar se o último ponto é seguido por exatamente dois dígitos no final da string numérica.

Problema: O campo condominio foi preenchido com o valor do número de quartos.

Ação: Adicione "travas de segurança" na extração de IPTU e Condomínio. O valor extraído só deve ser considerado válido se estiver muito próximo (na string) da palavra-chave correspondente ("iptu", "condominio"). Evite capturar números "soltos" no texto.

3. Módulo de Características Específicas:

Área (area_m2): O código captura apenas o último número associado a "m2". Ele precisa ser capaz de somar áreas quando descritas separadamente (ex: "PRIMEIRO PAVIMENTO MEDINDO 65 M2. SEGUNDO PAVIMENTO COM 110 M2").

Vagas de Garagem (vagas_garagem): A extração capturou "15 vagas" de um estacionamento para visitantes. A regex precisa ser mais contextual, buscando por termos como "vagas do imóvel", "vagas na escritura" ou ignorando números próximos à palavra "visitantes".

IPTU: O código não reconhece "Isento de IPTU". Adicione uma lógica para que, ao encontrar o termo "isento" próximo a "IPTU", o valor seja definido como 0.

Banheiros (banheiros): A lógica de soma de banheiros (suítes + sociais + lavabo + serviço) falhou em alguns casos. Revise o código para garantir que a detecção de "lavabo" e "dependência completa" / "banheiro de empregada" funcione de forma consistente e seja sempre somada ao total.

4. Filtro de Mensagens Irrelevantes:

Problema: Mensagens que são propaganda de serviços de corretor, e não de um imóvel específico, poluem os dados com extrações incorretas.

Ação: Crie uma função de pré-validação. Se a mensagem contiver múltiplos nomes de países/cidades internacionais (ex: "Flórida", "Portugal", "Dubai") e termos genéricos como "parceria", "exterior", "atuamos com", classifique a intencao como "institucional" (ou similar) e anule todos os outros campos de características.

{
  "Vila Valqueire": {
    "bairros": ["valqueire", "vila valqueire"],
    "ruas": ["luis beltrao"]
  },
  "Pechincha": {
    "regioes": ["retiro dos artistas"]
  },
  "Barra da Tijuca": {
    "condominios": ["santa monica condominium club"]
  },
  "Leblon": {
    "regioes": ["2 quadra da praia"]
  },
  "Ipanema": {
    "regioes": ["2 quadra da praia"]
  }
}

------------------
Adições ao Prompt de Evolução do Código (Baseado no Lote 2)

1. Módulo de Características Específicas:

Banheiros (banheiros): A lógica de contagem de banheiros continua a ser um ponto fraco. Ela falhou em somar todos os componentes em múltiplos anúncios (ex: suítes + lavabos + dependência). É necessário revisar a função extractMaxCount e a lógica de soma para garantir que termos como "dois lavabos" (plural) e a combinação de diferentes tipos de banheiros sejam sempre contabilizados corretamente.

Quartos (quartos): A lógica deve ser aprimorada para identificar e contar "dependência reversível" como um quarto adicional.

Nome do Anunciante (nome_anunciante): O parser removeu os números do nome "Fenixx777". Revisar a regex de limpeza do nome para que ela não remova números que fazem parte do nome do usuário/empresa.

2. Módulo de Extração de Valores Numéricos:

Valor (valor): O parser falhou em extrair valores escritos no formato "1. 200" ou "1.300" (com espaço ou sem o "mil" explícito) para significar milhões. A regex de valor precisa ser mais flexível para capturar esses padrões comuns em mensagens de procura.

IPTU: Foi observado um erro grave onde um valor aleatório (30833) foi atribuído ao IPTU. Isso sugere uma regex "gulosa" ou um erro de "contaminação". A regra de proximidade (sugerida no prompt anterior) se torna ainda mais crucial para evitar esses falsos positivos.

3. Módulo de Intenção (intencao):

Problema: Mensagens que iniciam com uma pergunta direta de busca, como "Vc tem para VENDA:", estão sendo classificadas como "oferta".

Ação: Adicionar padrões de pergunta/solicitação (ex: "vc tem", "alguem tem", "tem para venda") à procuraRegex para aumentar a precisão na detecção de mensagens de procura.
{
  "Botafogo": {
    "ruas": ["praia de botafogo"]
  },
  "Barra da Tijuca": {
    "regioes": ["pedra de itauna"]
  },
  "Copacabana": {
    "regioes": ["arco verde"]
  }
}
----------------------------
2.1 - Prompt de Melhorias para o Código (Atualizado)
(Este prompt consolida os aprendizados de todos os lotes até agora.)

Assunto: Evolução do Código de Extração de Anúncios Imobiliários (Consolidado)

1. Módulo de Intenção (intencao):

Prioridade de Palavras-Chave: Refatorar o bloco de intencao para que a verificação de palavras-chave explícitas de procura (procuro, busco, preciso, quem tiver, alguém tem, vc tem) tenha prioridade máxima, sobrepondo-se a qualquer outra heurística.

Heurística de Procura: Para mensagens sem palavras-chave explícitas, criar uma heurística: se tipo_operacao for detectado, mas nenhum valor for encontrado, a intencao deve ser "procura".

2. Módulo de Extração de Valores Numéricos:

Parse de Moeda: Melhorar a função de parse para lidar com formatos como XXX.XX (ex: "800.00") e variações do símbolo de moeda (ex: $4.900).

Parse de Valor de Venda: Aprimorar a regex de valor para interpretar formatos como "1. 200" e "1.300" como milhões, comuns em mensagens de procura.

Prevenção de Contaminação: Adicionar "travas de segurança" na extração de IPTU e Condomínio, exigindo que o número esteja muito próximo (na string) da palavra-chave correspondente para evitar capturar números de outros campos (como quartos).

3. Módulo de Características Específicas:

Contagem de Cômodos (Quartos e Banheiros): Esta é a área mais crítica para melhoria.

Revisar a lógica para somar corretamente todos os tipos de banheiros mencionados (suítes, sociais, lavabos, dependências).

Aprimorar a contagem de quartos para incluir "dependências completas" ou "dependências reversíveis".

Lidar com descrições de potencial (ex: "4 Qtos podendo fazer 5") e extrair o número maior.

Melhorar a detecção de plural (ex: "dois lavabos").

Nome do Anunciante (nome_anunciante): A regex de extração do nome falhou com o padrão "Corretor Aleixo:". É preciso torná-la mais flexível. Além disso, a limpeza do nome não deve remover números que fazem parte dele (ex: "Fenixx777").

4. Filtro de Mensagens Irrelevantes:

Criar uma função de pré-validação para identificar e anular os dados de mensagens que são conversas ou propagandas de serviços, e não anúncios de imóveis.
{
  "Barra da Tijuca": {
    "condominios": ["santa mônica residência"]
  }
}

-------------------
Assunto: Evolução do Código de Extração (Reforços do Lote 4)

1. Módulo de Extração de Valores Numéricos:

Priorização de Valores: O código precisa de uma lógica para diferenciar o preço de venda de outros valores, como custos de reforma. Uma regra poderia ser: "o maior valor monetário associado a 'valor' ou 'R$' é provavelmente o preço do imóvel".

Confusão de Taxas: Reforçar a regra de proximidade na extração de IPTU e Condomínio para evitar que um valor seja atribuído ao campo errado, como visto no ID 1279.

2. Módulo de Características Específicas:

area_m2: Implementar uma regra para priorizar a "área construída" sobre a "área do terreno" quando ambas estiverem presentes no anúncio.

tipo_imovel: Melhorar a detecção de 'Imóvel Comercial' a partir de palavras-chave como "Sala comercial", "Corporate", "Offices".

3. Tratamento de Anúncios Complexos:

Anúncios em Lista: Desenvolver uma estratégia para lidar com mensagens que contêm múltiplos imóveis. A abordagem mais segura é extrair os dados apenas do primeiro imóvel listado e ignorar o restante, para evitar a contaminação de dados.
{
  "Recreio dos Bandeirantes": {
    "condominios": ["jardins de barra bonita"]
  },
  "Barra da Tijuca": {
    "condominios": ["corporate & offices"],
    "ruas": ["prefeito dulcidio cardoso"]
  }
}
---------------
Entendido. Seguindo com o lote 5 no novo formato.

Este lote apresentou casos interessantes, como a extração de múltiplos quartos, taxas somadas e a necessidade de identificar cidades fora do Rio, mostrando a importância contínua de enriquecer a knowledgeBase.

1. Lista de Erros e Correções
Anúncio ID 1270:

Campo intencao incorreto: classificado como 'oferta', mas o texto "Preciso para locação" indica 'procura'.

Campo tipo_imovel incorreto: classificado como 'Casa', mas o correto é 'Imóvel Comercial', conforme o texto "Casa comercial" e "Atividade: escola".

Campo localizacao nulo: não identificou 'Zona Sul' como uma região genérica do Rio de Janeiro.

Anúncio ID 1269:

Campo tipo_imovel incorreto: classificado como 'Casa', mas o texto diz "Excelente apto".

Campo localizacao parcialmente incorreto: identificou 'Centro', mas não associou a 'Petrópolis', que é a cidade.

Anúncio ID 1268:

Campo quartos incorreto: extraiu 2, mas o correto é 4 (2 na casa principal + 2 na casa dos fundos).

Campo banheiros incorreto: extraiu 2, mas o correto é 4 (1 suíte + 1 social + 2 na casa dos fundos).

Campo localizacao parcialmente incorreto: identificou 'Niterói' como bairro, mas deveria ser a cidade, com o bairro sendo 'Piratininga'.

Anúncio ID 1267:

Campo intencao incorreto: classificado como 'oferta', mas o texto "CLIENTE DIRETO COMPRA" indica 'procura'.

Campo localizacao parcialmente incorreto: não extraiu a regiao 'Posto 1 ou 2'.

Anúncio ID 1266:

Campo quartos incorreto: extraiu 2, quando o texto diz "6 amplas suítes".

Campo suites incorreto: extraiu 2, o correto é 6.

Campo banheiros incorreto: extraiu 3, o correto é 7 (6 suítes + 1 social/lavabo implícito).

Campo area_m2 incorreto: extraiu 515 (área do terreno), em vez de 435 (área construída).

Campo condominio incorreto: erro de parse, extraiu 98000 em vez de 980.

Anúncio ID 1264:

Campo tipo_operacao nulo: não foi extraído, mas o valor do imóvel foi identificado.

Campo valor nulo: o preço de venda de 2.200.000,00 não foi capturado.

Campos iptu e condominio incorretos: o código se confundiu com "Taxas 2.400 Cond.e IPTU", atribuindo valores errados. O correto seria extrair o valor total de 2400 e, idealmente, atribuí-lo a ambos ou a um campo combinado.

Campo quartos incorreto: extraiu 3, mas o texto indica "3 suites + escritório", totalizando 4 quartos.

Campo localizacao incompleto: não extraiu a rua "Eduardo Perdeneira".

Anúncio ID 1263:

Extração 100% correta.

Anúncio ID 1262:

Campo valor incorreto: extraiu 300.000,00, ignorando o preço final com desconto de 230.000,00.

Campo localizacao incompleto: não identificou o condomínio "Medical Center".

Anúncio ID 1260:

Campo quartos incorreto: extraiu 3, mas o texto diz "3 quartos + 1 suíte", totalizando 4 quartos.

Anúncio ID 1259:

Campo quartos nulo: o texto indica "quarto com armário".

Campo valor incorreto: extraiu o valor antigo de 1.200.000, ignorando o preço final de 1.150.000,00.

Campo localizacao incompleto: não extraiu o nome do condomínio "Residencial Barra Beach".

2. Prompt de Melhorias para o Código (Consolidado)
Assunto: Evolução do Código de Extração (Reforços do Lote 5)

1. Módulo de Extração de Valores Numéricos:

Priorização de Preço: Implementar uma lógica para identificar o preço final quando múltiplos valores são mencionados (ex: "De R$ 300.000 Por R$ 230.000"). O código deve sempre capturar o último ou menor valor em um contexto de desconto.

Taxas Agrupadas: Desenvolver uma heurística para lidar com taxas agrupadas (ex: "Taxas 2.400 Cond. e IPTU"). A lógica poderia atribuir o valor a ambos os campos ou criar um campo temporário taxas_totais.

2. Módulo de Características Específicas:

Contagem de Cômodos: A contagem de quartos precisa ser aprimorada para somar diferentes tipos de cômodos (ex: "2Q" + "2 quartos na casa dos fundos" = 4 quartos; "3 suítes + escritório" = 4 quartos; "3 quartos + 1 suíte" = 4 quartos).

area_m2: Reforçar a regra para priorizar a "área construída" sobre a "área do terreno".

3. Módulo de Localização:

Suporte a Múltiplas Cidades: A knowledgeBase e a lógica de busca precisam ser estruturadas para lidar melhor com diferentes cidades (Rio de Janeiro, Niterói, Petrópolis), evitando que "Centro" de Petrópolis seja confundido com "Centro" do Rio.
{
  "Recreio dos Bandeirantes": {
    "ruas": ["eduardo perdeneira"],
    "condominios": ["medical center"]
  },
  "Petrópolis": {
    "type": "cidade",
    "bairros": ["petropolis", "centro historico"]
  },
  "Niterói": {
    "bairros": ["piratininga"]
  },
  "Barra da Tijuca": {
    "condominios": ["residencial barra beach"]
  }
}

----------
Assunto: Evolução do Código de Extração (Reforços do Lote 6)

1. Módulo de Intenção (intencao):

Reforçar Palavras-Chave de Procura: A falha mais consistente. Adicionar com prioridade máxima as frases "Cliente procurando", "cliente busca", "Alguém com..." à procuraRegex. A lógica de contar características não pode se sobrepor a essas palavras-chave.

2. Módulo de Características Específicas:

Contagem de Quartos: A lógica precisa ser mais robusta para entender "X quartos com dependência" como X+1 quartos.

Cálculo de IPTU: O código já divide valores anuais, mas falhou em um caso (id_bd: 1249). É preciso garantir que a verificação de anual seja consistente para todos os formatos de valor.

area_m2: O código capturou a área de um parque (74.000m²) para o apartamento. É preciso adicionar um limite superior (ex: 2000m² para apartamentos) para evitar a captura de áreas de condomínio.

3. Módulo de Localização:

Lógica de Exclusão: Implementar uma lógica para identificar e ignorar locais mencionados após palavras de exclusão, como "NÃO pode ser", "Exceto", "Exclusão:".

knowledgeBase: Continuar a expansão para incluir novos condomínios e ruas que aparecem com frequência.
{
  "Barra Olímpica": {
    "condominios": ["milênio"]
  },
  "Barra da Tijuca": {
    "condominios": ["pontões da barra", "laguna", "nau da barra"]
  },
  "Ipanema": {
    "ruas": ["vieira souto"]
  },
  "Recreio dos Bandeirantes": {
    "condominios": ["barra family"]
  }
}
--------------
Assunto: Evolução do Código de Extração (Reforços do Lote 7)

1. Módulo de Características Específicas:

Contagem de Quartos e Banheiros: Continua sendo o ponto mais fraco. A lógica precisa ser robusta para:

Somar corretamente quartos e dependências (3 quartos + dependência -> 4 quartos).

Interpretar quartos revertidos (original 4 quartos, hoje 3 -> 3 quartos).

Somar todos os tipos de banheiros consistentemente.

Extração de Taxas: O código está perdendo valores de IPTU e Condomínio com frequência. As regex para extractTax precisam ser mais flexíveis para capturar variações como "Cpnd.:", "IPTU.:" e diferentes formatações de valor.

2. Módulo de Localização:

A knowledgeBase precisa ser continuamente expandida com novos condomínios, bairros e ruas que aparecem nos lotes para melhorar a precisão da geolocalização.
{
  "Barra da Tijuca": {
    "condominios": ["le monde", "o2"]
  },
  "Vargem Pequena": {
    "condominios": ["el camino real"]
  },
  "Leblon": {
    "ruas": ["aperana"]
  },
  "Vila Isabel": {
    "bairros": ["vila isabel"],
    "ruas": ["boulevard 28 de setembro"]
  },
  "Copacabana": {
    "ruas": ["pompeu loureiro", "piragibe frota aguiar"]
  },
  "Leme": {
      "bairros": ["leme"]
  }
}

-------------
Assunto: Evolução do Código de Extração (Reforços do Lote 9)

1. Módulo de Extração de Valores:

Múltiplas Operações: Implementar uma lógica para lidar com anúncios que oferecem "Venda" e "Aluguel". A regra pode ser: priorizar a operação de Venda como tipo_operacao principal e extrair ambos os valores, se possível, ou apenas o de venda.

Débitos: Ignorar valores mencionados como "débito de condomínio" ou "dívida de IPTU" ao preencher os campos de taxas mensais.

2. Módulo de Características Específicas:

Contagem de Quartos: A contagem de quartos deve ser aprimorada para somar corretamente "X suítes" + "Y dependências".
{
  "Niterói": {
    "bairros": ["engenho do mato"]
  },
  "Jacarepaguá": {
    "regioes": ["espigao"]
  }
}
--------------
Prompt de Melhorias para o Código (Consolidado)
Nenhum novo tipo de erro foi detectado. Os erros deste lote reforçam a necessidade das melhorias já listadas, especialmente:

Parse de Valores: Melhorar a regex para capturar valores com sufixos como "M" (milhões).

Lógica de intenção: Continuar refinando as palavras-chave de "procura".

Contagem de Cômodos: Consolidar a regra de somar quartos e suítes com "dependências completas".
{
  "Itanhangá": {
    "bairros": ["itanhanga"]
  },
  "Recreio dos Bandeirantes": {
    "ruas": ["rua cel. joão olintho"]
  }
}