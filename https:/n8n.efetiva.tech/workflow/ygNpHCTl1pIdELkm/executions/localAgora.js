// [INÍCIO DO CÓDIGO COMPLETO E ATUALIZADO - v2.2 com Zona Sul]

// Verifica se há alguma informação de texto para processar.
if (!$json.caractbd.mensagem && !$json.grupo_nome) {
  return { localizacao: { bairro: null, regiao: null, rua: null, condominio: null } };
}

// Combina o nome do grupo e o conteúdo da mensagem para ter mais contexto.
const content = ($json.grupo_nome || '') + '\n' + ($json.caractbd.mensagem || '');

// Normaliza o texto para minúsculas e remove acentos para facilitar a busca.
const text = content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// --- BASE DE CONHECIMENTO DE LOCALIZAÇÕES (CORRIGIDA E COM ZONA SUL ENRIQUECIDA) ---
const knowledgeBase = {
    // Cidades/Regiões fora do RJ (MARCADAS COM type PARA BÔNUS)
    'Niterói': { type: 'cidade', bairros: ['niteroi', 'icarai', 'piratininga', 'engenho do mato'], ruas: ['rua oceanica', 'gaviao peixoto'] },
    'Angra dos Reis': { type: 'cidade', bairros: ['angra dos reis', 'frade', 'bracui', 'caieirinha'] },
    'Região Serrana': { type: 'regiao_macro', bairros: ['itaipava', 'regiao serrana', 'teresopolis', 'tere'] },
    'Região dos Lagos': { type: 'regiao_macro', bairros: ['regiao dos lagos', 'sao pedro da aldeia', 'buzios', 'cabo frio', 'araruama', 'praia linda'], regioes: ['praia do dentinho', 'manguinhos', 'geriba', 'ferradura', 'joao fernandes', 'tucuns'] },
    'Maricá': { type: 'cidade', bairros: ['marica'] },
    'Cachoeiras de Macacu': { type: 'cidade', bairros: ['cachoeiras de macacu'] },
    'Nilópolis': { type: 'cidade', bairros: ['nilopolis'], condominios: ['vivendas do imperador'] },
    'Belford Roxo': { type: 'cidade', bairros: ['belford roxo'] },
    'Rio das Ostras': { type: 'cidade', bairros:['rio das ostras'] },
    'Itaboraí': { type: 'cidade', bairros:['itaborai'] },
    'Mangaratiba': { type: 'cidade', bairros:['mangaratiba'] },

    // BAIRROS DA CAPITAL (RJ)
    // --- ZONA OESTE (APROFUNDADA) ---
    'Barra da Tijuca': {
        ruas: ['lucio costa', 'sernambetiba', 'avenida das americas', 'ayrton senna', 'pepe', 'olegario maciel', 'erico verissimo', 'prefeito dulcidio cardoso', 'armando lombardi', 'afonso de taunay', 'evandro lins e silva', 'general guedes da fontoura', 'comandante julio de moura', 'jornalista henrique cordeiro', 'gildasio amado', 'coronel paulo malta rezende', 'alceu amoroso lima', 'mario covas junior', 'belisario leite de andrade neto', 'jorgina de albuquerque', 'pedro lago', 'flamboyants da peninsula', 'jornalista tim lopes', 'john kennedy', 'rachel de queiroz', 'aldo bonadei', 'noel nutels', 'joao carlos machado', 'armando coelho freitas', 'marechal henrique lott', 'peregrino junior', 'av arquiteto afonso reidy', 'av evandro lins e silva', 'av malibu', 'ricardo marinho', 'jose de figueiredo', 'jose roquete', 'bruno girondi', 'clovis salgado', 'desembargador pires de castro', 'marina do costabella', 'avenida alfredo baltazar da silveira'],
        regioes: ['jardim oceanico', 'peninsula', 'abm', 'parque das rosas', 'km 1', 'barrinha', 'posto 3', 'posto 4', 'posto 5', 'posto 6', 'posto 8', 'quadra da praia', '1a quadra da praia', 'praça do ó', 'centro empresarial barra shopping', 'barra central park', 'mandala', 'bosque da barra', 'novo leblon', 'americas park', 'mundo novo', 'pedra de itauna', 'blue das americas', 'rio mar'],
        condominios: ['malibu', 'mansoes', 'santa monica jardins', 'riserva uno', 'riserva golf', 'golden green', 'le parc', 'interlagos de itauna', 'alphaville', 'waterways', 'atlantico sul', 'london green', 'laguna di mare', 'barramares', 'alfa barra', 'ocean drive', 'crystal lake', 'san diego', 'alphagreen', 'oceana golf', 'san filippo', 'itauna gold', 'praia da barra', 'barra village house life', 'peninsula mondrian', 'mondrian', 'rhr', 'barra bella', 'mandarim', 'mandarim da peninsula', 'on the park peninsula', 'peninsula way', 'be peninsula', 'key west', 'saint george', 'aloha', 'alphaland', 'wonderful ocean suites', 'queen elizabeth', 'alfa barra quality', 'beton', 'palm springs', 'queen mary', 'wyndham', 'blue houses', 'costa del sol', 'saint germain', 'mediterraneo', 'marlin', 'soho residences', 'union square home', 'riviera dei fiori', 'bella vita', 'royal blue', 'ilha de cozumel', 'santa marina', 'palais de nice', 'barra premium', 'jardim europa', 'nova ipanema', 'four seasons', 'liberty place', 'villa borghese', 'barra marina', 'lagoa mar do norte', 'barra summer dream', 'quintas do rio', 'parc des princes', 'casa blanca', 'lake', 'sirius', 'taurus', 'village oceanique', 'saint martin', 'aquarela', 'costa blanca', 'centro empresarial', 'lanai', '360 on the park', 'barra sunday'],
        apelidos: ['barra']
    },
    'Recreio dos Bandeirantes': {
        ruas: ['lucio costa', 'glaucio gil', 'benvindo de novaes', 'genaro de carvalho', 'estrada do pontal', 'alfredo balthazar da silveira', 'zelio valverde', 'odilon martins de andrade', 'nelson tarquinio', 'tim maia', 'desembargador paulo alonso', 'omar bandeira de mello', 'presidente nereu ramos', 'sylvia de lara', 'guilherme baptista', 'gustavo corcao', 'silvia pozzano', 'jose americo de almeida', 'artur possolo', 'cel joao olintho', 'sao francisco de assis', 'panasco alvim', 'murilo de araujo', 'cecilia meireles', 'demostenes madureira de pinho', 'joao barros moreira', 'professor taciel cylleno', 'ivo borges', 'jorge emilio fontenele', 'alberto cavalcanti', 'venancio veloso', 'rivadavia campos', 'jose luiz de ferraz', 'teixeira heizer', 'estrada vereador alceu de carvalho', 'gelson fonseca', 'hermes de lima', 'leiloeiro ernani melo', 'linda batista', 'luiz carlos sarolli', 'rubem braga', 'alberto bianchi', 'clementina de jesus', 'sefora', 'roberto moura', 'geraldo de carvalho', 'damasceno girao', 'rua 4w', 'jose mindlin'],
        regioes: ['pontal', 'barra bonita', 'gleba a', 'gleba b', 'gleba c', 'posto 9', 'posto 10', 'posto 11', 'posto 12', 'pontal oceanico', 'pedra da macumba', 'quadra da praia', '1a quadra da praia', 'recanto do recreio', 'terreirao', 'recanto da praia'],
        condominios: ['sublime', 'barra bali', 'maramar', 'art life', 'riviera del sol', 'bothanica nature', 'maui', 'luau do recreio', 'le quartier', 'varandas do mar', 'residencial life', 'sunset', 'barra wave', 'jardins de maria', 'barra sul', 'maximo recreio', 'barra zen', 'sea coast', 'wonderfull', 'nova barra', 'wide', 'maximo recreio resort', 'life resort', 'park premium', 'sublime max', 'green place', 'home ways', 'viverde residencial', 'frames', 'barra allegro', 'bothanica park', 'villa blanca ll', 'barra village lakes', 'mares de goa', 'jardins do recreio', 'ocean breeze', 'camino del sol', 'pátio do sol', 'novolar recreio', 'grumari', 'noir', 'thai club', 'noir design', 'onda carioca', 'parc des palmiers', 'villagio del mare', 'dream village', 'liv lifestyle', 'ocean', 'uprise', 'noir plus'],
        apelidos: ['recreio']
    },
     'Barra Olímpica': {
        ruas: ['embaixador abelardo bueno', 'abelardo bueno', 'salvador allende', 'jaime poggi', 'coronel pedro correa', 'aroazes', 'franz weissman', 'alfredo ceschiatti', 'mario agostinelli', 'jorge faraj', 'queiros junior', 'francisco de paula', 'abadiana', 'olof palme', 'ipero', 'vilhena de moraes'],
        regioes: ['cidade jardim', 'rio 2', 'centro metropolitano', 'villas da barra', 'ilha pura'],
        condominios: ['verano', 'verano stay', 'green park', 'maayan', 'reserva do parque', 'bora bora resort', 'like residencial', 'barra mais', 'seasons', 'fontano residencial', 'freedom', 'estrelas full', 'portal do atlantico', 'duet', 'villa aqua', 'origami', 'viure', 'front lake', 'reserva jardim', 'grand prix', 'villa luna', 'villa mare', 'alsacia', 'normandie', 'genova', 'majestic', 'saint michel'],
        apelidos: ['regiao olimpica']
    },
    'Vargem Grande': {
        ruas: ['estrada dos bandeirantes', 'estrada do sacarrao', 'estrada do morgado', 'estrada do morgadinho', 'rua manhuacu', 'rua lagoa bonita', 'rua pacui', 'caminho de dentro', 'estrada do rio morto', 'matusalem', 'salomao', 'moinho', 'girassol', 'papoulas', 'cravos', 'azaleias'],
        regioes: ['polo gastronomico'],
        condominios: ['dom jose', 'jardim de monet', 'novolar vargem grande', 'vitale eco', 'natura clube', 'fazenda vargem grande', 'solar do pontal', 'saint michel', 'verde vale', 'ville verte'],
        apelidos: ['vargem grande']
    },
    'Vargem Pequena': {
        ruas: ['estrada dos bandeirantes', 'estrada do rio morto', 'rua ciro aranha', 'rua professor silvio elia', 'rua jose duarte', 'rua benvindo de novaes', 'rua paulo duarte', 'rua alexandre de gusmao', 'rua carlos zefiro', 'jornalista luiz eduardo lobo', 'rosa antunes', 'celio fernandes dos santos silva', 'paulo jose mahfud', 'rua rubi', 'rua turmalina'],
        regioes: ['americas shopping'],
        condominios: ['dom olival', 'village dos oitis', 'reserva da praia', 'giverny', 'village do ouro', 'outside authentic residences', 'village vip', 'rota do sol', 'residencial bandeirantes', 'arte studios', 'vargem alegre', 'casa design', 'grand family', 'advanced'],
        apelidos: ['vargem pequena']
    },
    'Camorim': {
        ruas: ['estrada do camorim', 'luis carlos da cunha feio', 'abraao jabour', 'ipadu', 'paulo de medeiros', 'olof palme', 'carlos oswald', 'alberto de oliveira', 'reverencia', 'itaperuna', 'itajobi'],
        regioes: ['rio centro', 'projac'],
        condominios: ['reserva natura garden', 'garden vent', 'minha praia', 'frames vila da midia', 'wind', 'way bandeirantes', 'aquagreen', 'floris', 'vent residencial'],
        apelidos: []
    },
    'Curicica': { ruas: ['andre rocha'], regioes: [], condominios: [], apelidos: [] },
    'Taquara': {
        bairros: ['taquara'],
        ruas: ['rua nacional', 'estrada do rio grande', 'estrada do tindiba', 'avenida nelson cardoso'],
        regioes: ['centro da taquara', 'shopping plaza'],
        condominios:['connect life work trade']
    },
    'Anil': { ruas: ['estrada de jacarepagua', 'rua araticum'], regioes: [], condominios: ['up barra'], apelidos: ['anil'] },
    'Freguesia (Jacarepaguá)': {
        ruas: ['rua araguaia', 'rua tirol', 'rua fortunato de brito', 'rua geminiano gois', 'rua ituverava', 'estrada do guanumbi', 'rua potiguara', 'estrada do bananal', 'rua alcides lima', 'estrada pau ferro', 'estrada geremario dantas', 'rua santo eleuterio', 'rua raul seixas', 'estrada dos tres rios'],
        regioes: ['largo da freguesia', 'jardim urussanga', 'bairro araujo'],
        condominios: ['grand valley', 'gabinal', 'freedom', 'village florenca', 'residencial matisse', 'trend boutique', 'libero', 'high', 'green hill'],
        apelidos: ['freguesia']
    },
    'Pechincha': { ruas: ['estrada do pau ferro', 'ana silva', 'estrada do capenha', 'rua lopo saraiva', 'rua professor henrique costa'], regioes: [], condominios: ['recanto do lazer'], apelidos: [] },
    'Jacarepaguá': {
        bairros: ['jacarepagua', 'tanque'],
        ruas:['estrada do gabinal'], 
        regioes:['vila do pan', 'espigao'],
        condominios:['indianoapolis', 'studio 6677', 'up barra', 'vercelli', 'village sol e mar', 'essence'], 
        apelidos:[]
    },
    'Itanhangá': {
        ruas: ['estrada do itanhanga', 'engenheiro souza filho', 'estrada da barra da tijuca', 'sorima', 'dom rosalvo da costa rego', 'engenheiro pires do rio', 'acacias', 'alexandrino de alencar', 'sao josemaria escriva', 'tijuco preto', 'jardim do serido', 'visconde de asseca', 'calheiros gomes', 'maria martins'],
        regioes: ['tijuquinha', 'muzema'],
        condominios: ['greenwood park', 'porto dos cabritos', 'moradas do itanhanga', 'vila do golfe', 'reserva do itanhanga', 'itanhanga hills', 'itanhanga park'],
        apelidos: []
    },
    'Joá': {
        ruas: ['estrada do joa', 'jackson de figueiredo', 'professor tael de lacerda', 'pascoal de melo', 'sargento jose da silva', 'balthazar da silveira', 'conselheiro olegario', 'pires de carvalho', 'desembargador aluisio lopes de carvalho', 'herbert moses', 'professor alfredo pessoa', 'ibere de lemos'],
        regioes: ['joatinga'],
        condominios: ['condominio joatinga', 'condominio passado', 'residencial das americas'],
        apelidos: []
    },
    'Grumari': { ruas: ['estrada do grumari', 'estrada de guaratiba', 'avenida estado da guanabara'], regioes: ['prainha', 'abrico', 'praia do perigoso'], condominios: [], apelidos: [] },
    
    // --- ZONA SUL (APROFUNDADA) ---
    'Leblon': {
        ruas: ['carlos gois', 'afranio de melo franco', 'ataulfo de paiva', 'humberto de campos', 'joao lira', 'almirante guilhem', 'sambaiba', 'dias ferreira', 'general urquiza', 'jose linhares', 'rainha guilhermina', 'professor antonio maria teixeira', 'timoteo da costa', 'bartolomeu mitre', 'venancio flores', 'general artigas', 'desembargador alfredo russel', 'delfim moreira', 'aristides espinola', 'visconde de albuquerque', 'fadel fadel', 'tubira', 'mario ribeiro'],
        regioes: ['quadra da praia', 'baixo leblon', 'alto leblon', '2a quadra', '1a quadra da praia', 'quadrilatero', 'jardim pernanbuco'],
        condominios: ['atores', 'san martin', 'meia lua'],
        apelidos: []
    },
    'Ipanema': {
        ruas: ['vieira souto', 'prudente de morais', 'vinicius de moraes', 'barao da torre', 'maria quiteria', 'nascimento silva', 'barao de jaguaribe', 'redentor', 'farme de amoedo', 'joana angelica', 'anibal de mendonca', 'rainha elizabeth', 'teixeira de melo', 'garcia d\'avila', 'saddock de sa', 'antonio parreiras', 'gomes carneiro', 'joaquim nabuco', 'paul redfern', 'alberto de campos', 'visconde de piraja'],
        regioes: ['quadra da praia', 'posto 9', 'posto 10', 'copanema', '1a quadra da praia', 'praca general osorio', 'quadrilatero do charme', 'quadrilatero', 'arpoador'],
        condominios: ['tiffanys residence', 'bossa 107', 'wave ipanema', 'country ipanema', 'diamante azul', 'marias', 'cap ferrat', 'juan les pins'],
        apelidos: []
    },
    'Copacabana': {
        ruas: ['atlantica', 'nossa senhora de copacabana', 'hilario de gouveia', 'bolivar', 'constante ramos', 'santa clara', 'barata ribeiro', 'siqueira campos', 'figueiredo de magalhaes', 'raimundo correia', 'domingos ferreira', 'tonelero', 'bulhoes de carvalho', 'cinco de julho', 'assis brasil', 'belfort roxo', 'paula freitas', 'xavier da silveira', 'ministro viveiro de castro', 'silva castro', 'joseph bloch', 'felipe de oliveira', 'djalma ulrich', 'anita garibaldi', 'miguel lemos'],
        regioes: ['posto 6', 'posto 5', 'posto 4', 'posto 3', 'posto 2', 'praca eugenio jardim', 'quadra da praia', '1a quadra da praia', 'bairro peixoto'],
        condominios: ['chopin'],
        apelidos: ['copa']
    },
    'Botafogo': {
        ruas: ['real grandeza', 'marques de olinda', 'alvaro ramos', 'lauro muller', 'dezenove de fevereiro', 'fernandes guimaraes', 'rua sao clemente', 'rua voluntários da patria', 'rua general polidoro'],
        regioes: [],
        condominios: [],
        apelidos: []
    },
    'Flamengo': { 
        bairros:['flamengo'], 
        ruas: ['arthur bernardes', 'buarque de macedo', 'marques de abrantes', 'avenida rui barbosa', 'machado de assis', 'rua paissandu', 'senador vergueiro'], 
        regioes: [], 
        condominios: ['icono parque'], 
        apelidos: [] 
    },
    'Laranjeiras': { ruas: ['general glicerio', 'rua das laranjeiras', 'pereira da silva'], regioes: [], condominios: [], apelidos: [] },
    'Jardim Botânico': { ruas: [], regioes: ['horto'], condominios: [], apelidos: [] },
    'Humaitá': { ruas: [], regioes: [], condominios: [], apelidos: [] },
    'Lagoa': { ruas: ['fonte da saudade', 'epitacio pessoa', 'borges de medeiros', 'custodio serrao'], regioes: [], condominios: [], apelidos: [] },
    'Catete': { bairros:['catete'], ruas: ['rua do catete', 'bento lisboa'], regioes: [], condominios: ['quartier carioca'], apelidos: [] },
    'Glória': { bairros:['gloria'], ruas: [], regioes: [], condominios: [], apelidos: [] },
    'Leme': { bairros:['leme'], ruas: ['gustavo sampaio'], regioes: [], condominios: [], apelidos: [] },
    'Urca': { bairros:['urca'], ruas: ['avenida portugal'], regioes: [], condominios: [], apelidos: [] },
    'Gávea': { bairros:['gavea'], ruas:['avenida padre leonel franca'], regioes:[], condominios:[], apelidos:[] },
    
    // --- ZONA NORTE E OUTROS (A SEREM EXPANDIDOS) ---
    'Tijuca': {
        ruas: ['conde de bonfim', 'jose higino', 'afonso pena', 'amaral', 'uruguai', 'barao de mesquita', 'haddock lobo', 'desembargador izidro', 'general roca', 'sao francisco xavier', 'santo afonso', 'maria'],
        regioes: ['muda', 'usina', 'metro uruguai', 'praca saens pena'],
        condominios: [],
        apelidos: []
    },
    'Rio Comprido': { ruas: ['barao de itapagipe', 'aristides lobo'], regioes: [], condominios: [], apelidos: [] },
    'Grajaú': { ruas: ['barao do bom retiro'], regioes: [], condominios: [], apelidos: [] },
    'Lapa': { ruas: ['rua do resende'], regioes: [], condominios: ['mood lapa'], apelidos: [] },
    'Engenho de Dentro': { ruas: ['mario calderaro'], regioes: ['engenhao'], condominios: [], apelidos: [] },
    'Engenho Novo': { bairros:['engenho novo', 'sampaio'], ruas: [], regioes: [], condominios: [], apelidos: [] },
    'Cachambi': { bairros:['cachambi'], ruas: ['monte pascoa'], regioes: [], condominios: [], apelidos: [] },
    'Centro': { bairros:['centro'], ruas: ['graca aranha', 'rua rio branco'], regioes: ['cinelandia', 'passeio'], condominios: [], apelidos: [] },
    'Cascadura': { bairros:['cascadura'], ruas: [], regioes: [], condominios: [], apelidos: [] },
    'Méier': { bairros:['meier'], ruas:[], regioes:[], condominios:[], apelidos:[] },
};


// --- NOVA LÓGICA DE PONTUAÇÃO (VERSÃO 2.1 com Bônus para Cidades) ---

const weights = {
  condominio: 5,
  rua: 4,
  regiao: 3,
  bairro: 2,
  apelido: 1
};

const CITY_BONUS = 10; // Bônus de pontuação para cidades/macro-regiões

let scores = {};
let foundDetails = {};

const capitalize = (str) => {
    if (!str) return null;
    const prepositions = ['de', 'da', 'do', 'das', 'dos'];
    return str.split(' ').map(word => {
        if (word.toUpperCase() === 'ABM' || word.toUpperCase() === 'RHR') return word.toUpperCase();
        if (prepositions.includes(word.toLowerCase())) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
};

for (const bairro in knowledgeBase) {
  const data = knowledgeBase[bairro];
  foundDetails[bairro] = {};
  let hasFoundForThisBairro = false;

  const checkForTerm = (term, type) => {
    const regex = new RegExp('\\b' + term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b');
    if (regex.test(text)) {
      scores[bairro] = (scores[bairro] || 0) + weights[type];
      hasFoundForThisBairro = true;
      if (!foundDetails[bairro][type] || term.length > (foundDetails[bairro][type] || '').length) {
         if (type === 'bairro' || type === 'apelido') {
            foundDetails[bairro]['bairro_nome'] = bairro;
         } else {
            foundDetails[bairro][type] = term;
         }
      }
      return true;
    }
    return false;
  };

  (data.condominios || []).forEach(condo => checkForTerm(condo, 'condominio'));
  (data.ruas || []).forEach(rua => checkForTerm(rua, 'rua'));
  (data.regioes || []).forEach(regiao => checkForTerm(regiao, 'regiao'));
  (data.bairros || [bairro.toLowerCase()]).forEach(bairroName => checkForTerm(bairroName, 'bairro'));
  (data.apelidos || []).forEach(apelido => checkForTerm(apelido, 'apelido'));

  if (hasFoundForThisBairro && (data.type === 'cidade' || data.type === 'regiao_macro')) {
      scores[bairro] += CITY_BONUS;
  }
}

// --- DETERMINAÇÃO DO VENCEDOR E RETORNO DO RESULTADO ---

let winnerBairro = null;
let maxScore = 0;

for (const bairro in scores) {
  if (scores[bairro] > maxScore) {
    maxScore = scores[bairro];
    winnerBairro = bairro;
  }
}

let result = { bairro: null, regiao: null, rua: null, condominio: null };

if (winnerBairro) {
  const details = foundDetails[winnerBairro];
  result = {
    bairro: winnerBairro,
    regiao: capitalize(details.regiao) || null,
    rua: capitalize(details.rua) || null,
    condominio: capitalize(details.condominio) || null
  };
}

return { localizacao: result };

// [FIM DO CÓDIGO COMPLETO E ATUALIZADO]