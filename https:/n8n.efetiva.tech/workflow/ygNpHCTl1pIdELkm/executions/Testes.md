Ordem de Execução Proposta para o Código Unificado

**Grupo 1: Extrações de Base (Independentes)**
Extração do **telefone_anunciante**.
Extração da **area_m2**.
Extração das **vagas_garagem**.
Extração das **suites**.

**Grupo 2: Primeiras Dependências**
Extração do **nome_anunciante** (usando o telefone como âncora).
Extração inicial do **tipo_imovel** (baseada em palavras-chave).
Extração dos **quartos** e validação com suites.

**Grupo 3: O Pivô Central**
Extração do **valor** do imóvel. Esta será a lógica mais completa, combinando as melhores regex e heurísticas de ambos os nós.

**Grupo 4: Inferências e Classificações Pós-Valor**
Determinação do **tipo_operacao** (combinando palavras-chave com a análise do valor extraído).
Determinação da **intencao** (combinando a lógica de regras e a de pontuação, usando o valor como um dos critérios).

**Grupo 5: Detalhes Finais e Taxas**
Extração de **banheiros** (agora com suites, quartos e tipo_imovel já disponíveis).
Extração de **iptu** e validação contra valor.
Extração de **condominio** e validação contra valor e iptu.

**Grupo 6: Bloco Final de Validação Cruzada**
Uma última rodada de checagens que garantem a consistência geral dos dados, como:
Corrigir **tipo_imovel** com base na area_m2, se necessário.
Qualquer outra regra de negócio que **compara múltiplos campos.**
