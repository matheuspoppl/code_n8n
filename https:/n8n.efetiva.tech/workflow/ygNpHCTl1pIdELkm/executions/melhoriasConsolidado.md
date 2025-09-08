{
  "Barra da Tijuca": {
    "condominios": [
      "santa monica condominium club",
      "santa mônica residência",
      "corporate & offices",
      "residencial barra beach",
      "pontões da barra",
      "laguna",
      "nau da barra",
      "le monde",
      "o2"
    ],
    "regioes": [
      "pedra de itauna",
      "2 quadra da praia",
      "bosque da barra"
    ],
    "ruas": [
      "prefeito dulcidio cardoso",
      "avenida marechal henrique lott",
      "avenida vieira souto"
    ]
  },
  "Barra Olímpica": {
    "condominios": [
      "milênio"
    ]
  },
  "Botafogo": {
    "ruas": [
      "praia de botafogo"
    ]
  },
  "Copacabana": {
    "regioes": [
      "arco verde"
    ],
    "ruas": [
      "pompeu loureiro",
      "piragibe frota aguiar"
    ]
  },
  "Ipanema": {
    "regioes": [
      "2 quadra da praia"
    ]
  },
  "Itanhangá": {
    "bairros": [
      "itanhanga"
    ]
  },
  "Jacarepaguá": {
    "regioes": [
      "espigao"
    ]
  },
  "Leblon": {
    "ruas": [
      "aperana"
    ]
  },
  "Leme": {
    "bairros": [
      "leme"
    ]
  },
  "Niterói": {
    "bairros": [
      "engenho do mato"
    ]
  },
  "Pechincha": {
    "regioes": [
      "retiro dos artistas"
    ]
  },
  "Petrópolis": {
    "type": "cidade",
    "bairros": [
      "petropolis",
      "centro historico"
    ]
  },
  "Recreio dos Bandeirantes": {
    "condominios": [
      "jardins de barra bonita",
      "medical center"
    ],
    "ruas": [
      "eduardo perdeneira",
      "rua cel. joão olintho"
    ]
  },
  "Vargem Grande": {
    "apelidos": [
      "vargem"
    ]
  },
  "Vargem Pequena": {
    "condominios": [
      "el camino real"
    ],
    "apelidos": [
      "vargem"
    ]
  },
  "Vila Isabel": {
    "bairros": [
      "vila isabel"
    ],
    "ruas": [
      "boulevard 28 de setembro"
    ]
  },
  "Vila Valqueire": {
    "bairros": [
      "valqueire",
      "vila valqueire"
    ],
    "ruas": [
      "luis beltrao"
    ]
  }
}

----------------

1. Resumo Consolidado para o Script de CARACTERÍSTICAS
Este resumo abrange todas as melhorias de lógica necessárias. O objetivo é criar um "bloco de auditoria" que execute estas verificações e correções após o código original.

1.1. Intenção (intencao)
Prioridade Máxima para Palavras-Chave de Procura: A lógica deve ser ajustada para que palavras-chave explícitas como preciso, procuro, busco, cliente procura, cliente busca, alguém com, vc tem, tem para venda sempre definam a intenção como "procura", independentemente de outras características presentes no anúncio.

Heurística para Anúncios sem Valor: Se um anúncio for classificado como "oferta", mas não tiver um valor extraído, a intenção deve ser reclassificada como "procura".

1.2. Valores Monetários (valor, iptu, condominio)
Parse Robusto de Números: A função de parse deve ser aprimorada para lidar corretamente com:

Formatos com múltiplos pontos (ex: R$525.000.00).

Formatos com ponto como decimal, apenas se seguidos por dois dígitos (ex: 800.00).

Símbolos monetários alternativos (ex: $).

Sufixos de Milhão e Mil: A extração de valor deve reconhecer e converter sufixos como M, MM e mil (ex: 4.3M -> 4300000; 480MM -> 480000000).

Priorização de Valor Final: Em anúncios com preços riscados (ex: ~~R$ 470.000.00~~ 🚨 R$ 450.000,00 🚨), a lógica deve priorizar a extração do último valor não riscado.

Prevenção de Contaminação: As regras de extração de iptu e condominio devem ser mais rigorosas, exigindo proximidade com a palavra-chave e ignorando números que claramente pertencem ao valor do imóvel (ex: um valor de 7 dígitos não pode ser condomínio).

Taxas Agrupadas: Implementar uma lógica para tratar casos como "Taxas 2.400 Cond.e IPTU", possivelmente atribuindo o valor a um dos campos ou a ambos, se aplicável.

Ignorar Débitos: A lógica de extração de taxas deve ignorar valores explicitamente mencionados como "débito" ou "dívida".

1.3. Contagem de Cômodos (quartos, suites, banheiros)
Soma de Dependências: A contagem de quartos e banheiros deve ser consistentemente incrementada quando o texto mencionar "dependência completa", "dependência reversível" ou "quarto de empregada".

Contagem em Descrições Complexas: A lógica deve ser capaz de somar cômodos descritos em seções diferentes (ex: "1° piso", "2° piso") e também interpretar "X quartos + Y suítes" como X+Y quartos totais, se aplicável.

Quartos Revertidos: A lógica deve identificar o número final de quartos em casos como "original 4 quartos, hoje com 3".

Plurais e Outros Termos: A contagem de banheiros deve ser aprimorada para reconhecer termos no plural (ex: "dois lavabos") e somar corretamente todos os componentes (suítes, sociais, lavabos, dependências).

1.4. Outras Características
Prioridade de area_m2: Quando o anúncio mencionar "área construída" e "área do terreno", o script deve priorizar a "área construída" para o campo area_m2.

Limite de area_m2: Adicionar um limite superior (ex: 5000 m²) para apartamentos, a fim de evitar a captura de áreas de lazer do condomínio (ex: 74.000 m² de um parque).

vagas_garagem Contextual: A extração de vagas deve ignorar números próximos à palavra "visitantes".

tipo_imovel Específico: Melhorar a detecção de "Imóvel Comercial" a partir de termos como "Sala comercial", "Corporate", "Offices" e evitar falsos positivos (ex: "Casa & Video").

iptu Isento: Reconhecer a expressão "IPTU isento" e atribuir o valor 0 ao campo.

1.5. Filtragem e Tratamento de Anúncios
Anúncios de Serviços: Identificar e anular os dados de mensagens que são propagandas de serviços de corretores (mencionando múltiplos países, "parceria", etc.).

Anúncios em Lista: Para mensagens que listam múltiplos imóveis, a estratégia será extrair os dados apenas do primeiro imóvel mencionado para garantir consistência.