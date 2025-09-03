// Verifica se há alguma informação de texto para processar.
if (!$json.caractbd.mensagem && !$json.grupo_nome) {
  return { localizacao: { bairro: null, regiao: null, rua: null, condominio: null } };
}

// Combina o nome do grupo e o conteúdo da mensagem para ter mais contexto.
const content = ($json.grupo_nome || '') + '\n' + ($json.caractbd.mensagem || '');

// Normaliza o texto para minúsculas e remove acentos para facilitar a busca.
const text = content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// --- BASE DE CONHECIMENTO DE LOCALIZAÇÕES ---
// Mapeamento expandido e refinado com base na análise de todos os anúncios.
const knowledgeBase = {
    // Cidades/Regiões fora do RJ
    'Niterói': { type: 'cidade', bairros: ['niteroi', 'icarai', 'piratininga', 'engenho do mato'], ruas: ['rua oceanica'] },
    'Angra dos Reis': { type: 'cidade', bairros: ['angra dos reis', 'frade', 'bracui'] },
    'Região Serrana': { type: 'regiao_macro', bairros: ['itaipava', 'regiao serrana', 'teresopolis', 'tere'] },
    'Região dos Lagos': { type: 'regiao_macro', bairros: ['regiao dos lagos', 'sao pedro da aldeia', 'buzios', 'cabo frio'], regioes: ['praia do dentinho'] },
    'Maricá': { type: 'cidade', bairros: ['marica'] },
    'Cachoeiras de Macacu': { type: 'cidade', bairros: ['cachoeiras de macacu'] },
    'Nilópolis': { type: 'cidade', bairros: ['nilopolis'], condominios: ['vivendas do imperador'] },
    'Belford Roxo': { type: 'cidade', bairros: ['belford roxo'] },

    // Bairros da Capital (RJ)
    'Barra da Tijuca': {
        ruas: ['lucio costa', 'sernambetiba', 'avenida das americas', 'ayrton senna', 'pepe', 'olegario maciel', 'erico verissimo', 'prefeito dulcidio cardoso', 'armando lombardi', 'afonso de taunay', 'evandro lins e silva', 'general guedes da fontoura', 'comandante julio de moura', 'jornalista henrique cordeiro', 'gildasio amado', 'coronel paulo malta rezende', 'alceu amoroso lima', 'mario covas junior', 'belisario leite de andrade neto', 'jorgina de albuquerque', 'pedro lago', 'flamboyants da peninsula', 'jornalista tim lopes', 'john kennedy', 'rachel de queiroz'],
        regioes: ['jardim oceanico', 'peninsula', 'abm', 'parque das rosas', 'km 1', 'barrinha', 'posto 3', 'posto 4', 'posto 5', 'posto 6', 'posto 8', 'quadra da praia', '1a quadra da praia'],
        condominios: ['malibu', 'mansoes', 'santa monica jardins', 'riserva uno', 'riserva golf', 'golden green', 'novo leblon', 'le parc', 'americas park', 'rio mar', 'rio mar xi', 'interlagos de itauna', 'alphaville', 'waterways', 'atlantico sul', 'pedra de itauna', 'blue das americas', 'london green', 'laguna di mare', 'barramares', 'alfa barra', 'ocean drive', 'crystal lake', 'san diego', 'alphagreen', 'oceana golf', 'san filippo', 'itauna gold', 'praia da barra', 'barra village house life', 'peninsula mondrian', 'mondrian', 'rhr', 'barra bella', 'mundo novo', 'mandarim', 'mandarim da peninsula', 'on the park peninsula', 'peninsula way', 'be peninsula', 'key west', 'saint george', 'aloha', 'alphaland', 'wonderful ocean suites', 'queen elizabeth', 'alfa barra quality', 'beton', 'palm springs', 'queen mary', 'wyndham', 'blue houses', 'costa del sol', 'saint germain', 'mediterraneo', 'marlin', 'soho residences', 'union square home', 'riviera dei fiori', 'bella vita', 'royal blue'],
        apelidos: ['barra']
    },
    'Barra Olímpica': {
        ruas: ['embaixador abelardo bueno', 'abelardo bueno', 'salvador allende', 'jaime poggi', 'coronel pedro correa', 'aroazes', 'franz weissman', 'alfredo ceschiatti', 'mario agostinelli', 'jorge faraj', 'queiros junior', 'francisco de paula', 'abadiana', 'olof palme', 'ipero', 'vilhena de moraes'],
        regioes: ['cidade jardim', 'regiao do rio 2', 'centro metropolitano'],
        condominios: ['rio 2', 'verano', 'verano stay', 'green park', 'maayan', 'reserva do parque', 'bora bora resort', 'like residencial', 'barra mais', 'seasons', 'ilha pura', 'fontano residencial', 'freedom', 'estrelas full', 'portal do atlantico', 'duet', 'villa aqua', 'origami', 'viure', 'front lake'],
        apelidos: ['regiao olimpica']
    },
    'Recreio dos Bandeirantes': {
        ruas: ['lucio costa', 'glaucio gil', 'benvindo de novaes', 'genaro de carvalho', 'estrada do pontal', 'alfredo balthazar da silveira', 'zelio valverde', 'odilon martins de andrade', 'nelson tarquinio', 'tim maia', 'desembargador paulo alonso', 'omar bandeira de mello', 'presidente nereu ramos', 'sylvia de lara', 'guilherme baptista', 'gustavo corcao', 'silvia pozzano', 'jose americo de almeida', 'artur possolo', 'cel joao olintho', 'sao francisco de assis', 'panasco alvim', 'murilo de araujo', 'cecilia meireles', 'demostenes madureira de pinho', 'joao barros moreira', 'professor taciel cylleno', 'ivo borges', 'jorge emilio fontenele', 'alberto cavalcanti', 'venancio veloso', 'rivadavia campos', 'jose luiz de ferraz', 'teixeira heizer', 'estrada vereador alceu de carvalho'],
        regioes: ['pontal', 'barra bonita', 'gleba a', 'gleba b', 'posto 9', 'posto 10', 'pontal oceanico', 'espigao', 'pedra da macumba', 'quadra da praia', '1a quadra da praia', 'recanto do recreio'],
        condominios: ['sublime', 'barra bali', 'maramar', 'art life', 'riviera del sol', 'bothanica nature', 'maui', 'luau do recreio', 'le quartier', 'varandas do mar', 'residencial life', 'sunset', 'barra wave', 'jardins de maria', 'barra sul', 'maximo recreio', 'barra zen', 'sea coast', 'wonderfull', 'nova barra', 'village sol e mar', 'wide', 'maximo recreio resort', 'life resort', 'park premium', 'sublime max', 'green place', 'home ways', 'viverde residencial', 'frames', 'barra allegro', 'bothanica park', 'villa blanca ll'],
        apelidos: ['recreio']
    },
    'Vargem Grande': {
        ruas: ['estrada dos bandeirantes', 'sacarrao', 'morgado', 'morgadinho', 'manhuacu', 'lagoa bonita', 'pacui', 'caminho de dentro', 'rio morto', 'matusalem', 'salomao', 'moinho', 'girassol', 'papoulas', 'cravos', 'azaleias', 'estrada do morgadinho'],
        regioes: ['polo gastronomico'],
        condominios: ['dom jose', 'jardim de monet', 'novolar vargem grande', 'vitale eco', 'natura clube', 'fazenda vargem grande', 'solar do pontal', 'saint michel', 'verde vale'],
        apelidos: []
    },
    'Vargem Pequena': {
        ruas: ['estrada dos bandeirantes', 'rio morto', 'ciro aranha', 'professor silvio elia', 'jose duarte', 'benvindo de novaes', 'paulo duarte', 'alexandre de gusmao', 'carlos zefiro', 'jornalista luiz eduardo lobo', 'rosa antunes', 'celio fernandes dos santos silva', 'paulo jose mahfud', 'rubi', 'turmalina'],
        regioes: ['americas shopping'],
        condominios: ['dom olival', 'village dos oitis', 'reserva da praia', 'giverny', 'village do ouro', 'outside authentic residences', 'dream village', 'village vip', 'rota do sol', 'residencial bandeirantes', 'arte studios', 'vargem alegre', 'casa design'],
        apelidos: []
    },
    'Camorim': {
        ruas: ['estrada do camorim', 'luis carlos da cunha feio', 'abraao jabour', 'ipadu', 'paulo de medeiros', 'olof palme', 'carlos oswald', 'alberto de oliveira', 'reverencia', 'itaperuna', 'itajobi'],
        regioes: ['rio centro', 'projac'],
        condominios: ['reserva natura garden', 'garden vent', 'minha praia', 'frames vila da midia', 'wind', 'way bandeirantes', 'aquagreen'],
        apelidos: []
    },
    'Curicica': {
        ruas: ['andre rocha'],
        regioes: [],
        condominios: [],
        apelidos: []
    },
    'Taquara': {
        bairros: ['taquara'],
        ruas: ['rua nacional'],
        regioes: ['centro da taquara', 'shopping plaza'],
        condominios:[]
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
    'Grumari': {
        ruas: ['estrada do grumari', 'estrada de guaratiba', 'avenida estado da guanabara'],
        regioes: ['prainha', 'abrico', 'praia do perigoso'],
        condominios: [],
        apelidos: []
    },
    'Leblon': {
        ruas: ['carlos gois', 'afranio de melo franco', 'ataulfo de paiva', 'humberto de campos', 'joao lira', 'almirante guilhem', 'sambaiba', 'dias ferreira', 'general urquiza', 'jose linhares', 'rainha guilhermina', 'professor antonio maria teixeira', 'timoteo da costa', 'bartolomeu mitre', 'venancio flores', 'general artigas', 'desembargador alfredo russel', 'delfim moreira'],
        regioes: ['quadra da praia', 'baixo leblon', 'alto leblon', '2a quadra', '1a quadra da praia'],
        condominios: [],
        apelidos: []
    },
    'Ipanema': {
        ruas: ['vieira souto', 'prudente de morais', 'vinicius de moraes', 'barao da torre', 'maria quiteria', 'nascimento silva', 'barao de jaguaribe', 'redentor', 'farme de amoedo', 'joana angelica', 'anibal de mendonca', 'rainha elizabeth', 'teixeira de melo', 'garcia d\'avila', 'saddock de sa', 'antonio parreiras', 'gomes carneiro', 'joaquim nabuco', 'paul redfern'],
        regioes: ['quadra da praia', 'posto 9', 'posto 10', 'copanema', '1a quadra da praia', 'praca general osorio'],
        condominios: ['tiffanys residence', 'bossa 107'],
        apelidos: []
    },
    'Copacabana': {
        ruas: ['atlantica', 'nossa senhora de copacabana', 'hilario de gouveia', 'bolivar', 'constante ramos', 'santa clara', 'barata ribeiro', 'siqueira campos', 'figueiredo de magalhaes', 'raimundo correia', 'domingos ferreira', 'tonelero', 'bulhoes de carvalho'],
        regioes: ['posto 6', 'posto 5', 'posto 4', 'posto 2', 'praca eugenio jardim', 'quadra da praia', '1a quadra da praia'],
        condominios: [],
        apelidos: ['copa']
    },
    'Tijuca': {
        ruas: ['conde de bonfim', 'jose higino', 'afonso pena', 'amaral', 'uruguai', 'barao de mesquita', 'haddock lobo', 'desembargador izidro', 'general roca', 'sao francisco xavier', 'santo afonso', 'maria'],
        regioes: ['muda', 'usina', 'metro uruguai', 'praca saens pena'],
        condominios: [],
        apelidos: []
    },
    'Freguesia (Jacarepaguá)': {
        ruas: ['araguaia', 'tirol', 'fortunato de brito', 'geminiano gois', 'ituverava', 'estrada do guanumbi', 'potiguara', 'bananal', 'alcides lima'],
        regioes: ['largo da freguesia', 'jardim urussanga'],
        condominios: ['grand valley', 'gabinal'],
        apelidos: ['freguesia']
    },
    'Pechincha': {
        ruas: ['estrada do pau ferro'],
        regioes: [],
        condominios: ['recanto do lazer'],
        apelidos: []
    },
    'Jacarepaguá': {
        bairros: ['jacarepagua', 'tanque'],
        ruas:[], regioes:[], condominios:[], apelidos:[]
    },
    'Laranjeiras': {
        ruas: ['general glicerio'],
        regioes: [],
        condominios: [],
        apelidos: []
    },
    'Rio Comprido': {
        ruas: ['barao de itapagipe', 'aristides lobo'],
        regioes: [],
        condominios: [],
        apelidos: []
    },
    'Grajaú': {
        ruas: ['barao do bom retiro'],
        regioes: [],
        condominios: [],
        apelidos: []
    },
    'Lapa': {
        ruas: ['rua do resende'],
        regioes: [],
        condominios: ['mood lapa'],
        apelidos: []
    },
    'Engenho de Dentro': {
        ruas: ['mario calderaro'],
        regioes: ['engenhao'],
        condominios: [],
        apelidos: []
    },
    'Engenho Novo': {
        bairros:['engenho novo', 'sampaio'],
        ruas: ['ana silva'],
        regioes: [],
        condominios: [],
        apelidos: []
    },
    'Jardim Botânico': {
        ruas: [], regioes: ['horto'], condominios: [], apelidos: []
    },
    'Humaitá': {
        ruas: [], regioes: [], condominios: [], apelidos: []
    },
    'Lagoa': {
        ruas: ['fonte da saudade'], regioes: [], condominios: [], apelidos: []
    },
    'Botafogo': {
        ruas: ['real grandeza'], regioes: [], condominios: [], apelidos: []
    },
    'Cachambi': {
        bairros:['cachambi'],
        ruas: ['monte pascoa'], regioes: [], condominios: [], apelidos: []
    },
    'Centro': {
        bairros:['centro'],
        ruas: ['graca aranha', 'rua rio branco'], regioes: ['cinelandia', 'passeio'], condominios: [], apelidos: []
    },
    'Catete': { bairros:['catete'], ruas: [], regioes: [], condominios: [], apelidos: [] },
    'Glória': { bairros:['gloria'], ruas: [], regioes: [], condominios: [], apelidos: [] },
    'Flamengo': { bairros:['flamengo'], ruas: [], regioes: [], condominios: [], apelidos: [] },
    'Cascadura': { bairros:['cascadura'], ruas: [], regioes: [], condominios: [], apelidos: [] }
};

let result = { bairro: null, regiao: null, rua: null, condominio: null };
let foundItems = [];

// --- LÓGICA DE BUSCA ---
const searchList = [];
for (const bairro in knowledgeBase) {
    const data = knowledgeBase[bairro];
    const addItem = (name, type, canonicalName, priority) => {
        if (name) searchList.push({ term: name, type, bairro, canonicalName, priority });
    };

    (data.ruas || []).forEach(rua => addItem(rua, 'rua', rua, 1));
    (data.condominios || []).forEach(condo => addItem(condo, 'condominio', condo, 1));
    (data.regioes || []).forEach(regiao => addItem(regiao, 'regiao', regiao, 2));
    (data.bairros || [bairro.toLowerCase()]).forEach(bairroName => {
        const priority = bairroName.includes(' ') ? 3 : 4; // Nomes completos têm prioridade maior
        addItem(bairroName, 'bairro', bairro, priority);
    });
    (data.apelidos || []).forEach(apelido => addItem(apelido, 'bairro', bairro, 5));
}

// Ordena por prioridade (menor é melhor) e depois por comprimento (maior é melhor)
searchList.sort((a, b) => {
    if (a.priority !== b.priority) {
        return a.priority - b.priority;
    }
    return b.term.length - a.term.length;
});

for (const item of searchList) {
    const regex = new RegExp('\\b' + item.term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b');
    if (regex.test(text)) {
        foundItems.push(item);
    }
}

if (foundItems.length > 0) {
    const primaryItem = foundItems[0];
    result.bairro = primaryItem.bairro;
    
    const capitalize = (str) => {
         if (!str) return null;
         const prepositions = ['de', 'da', 'do', 'das', 'dos'];
         return str.split(' ').map(word => {
             if (word.toUpperCase() === 'ABM' || word.toUpperCase() === 'RHR') return word.toUpperCase();
             if (prepositions.includes(word.toLowerCase())) return word.toLowerCase();
             return word.charAt(0).toUpperCase() + word.slice(1);
         }).join(' ');
    };

    for (const item of foundItems) {
        // Apenas adiciona detalhes se pertencerem ao bairro principal identificado
        if (item.bairro === result.bairro) {
            if (item.type === 'regiao' && !result.regiao) result.regiao = capitalize(item.canonicalName);
            if (item.type === 'rua' && !result.rua) result.rua = capitalize(item.canonicalName);
            if (item.type === 'condominio' && !result.condominio) result.condominio = capitalize(item.canonicalName);
        }
    }
}

return { localizacao: result };