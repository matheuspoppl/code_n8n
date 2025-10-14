// =================================================================
// INÍCIO: CONFIGURAÇÕES E FUNÇÕES DE AJUDA
// =================================================================

// Webhook unificado para todas as ações de atualização do Kanban.
const WEBHOOK_URL = 'https://webhook.efetiva.tech/webhook/crm-atualiza-efetiva';

/**
 * Formata um nome completo para "Nome Sobrenome".
 * Ex: "José Carlos da Silva" -> "José Silva"
 * @param {string} fullName O nome completo.
 * @returns {string} O nome formatado.
 */
const formatName = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return toTitleCase(fullName);
  return toTitleCase(`${parts[0]} ${parts[parts.length - 1]}`);
};

/**
 * Converte uma string para o formato Title Case.
 * Ex: "joão silva" -> "João Silva"
 * @param {string} str A string de entrada.
 * @returns {string} A string formatada.
 */
const toTitleCase = (str) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

/**
 * Formata um número para moeda brasileira (BRL).
 * @param {number} num O número a ser formatado.
 * @returns {string} O valor formatado como moeda.
 */
const formatCurrency = (num) => {
  if (num === null || num === undefined) return 'N/I';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

/**
 * Remove caracteres não numéricos de um telefone.
 * @param {string} phone O número de telefone.
 * @returns {string} O número de telefone limpo.
 */
const sanitizePhoneNumber = (phone) => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

// Ícones em formato SVG para serem embutidos no HTML.
const whatsappIconSvg = `<svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em"><path d="M16.6 14c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.5-1.5-1.8-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.2.2-.3.1-.1.1-.2 0-.4-.1-.1-.6-1.5-.8-2-.2-.5-.4-.5-.5-.5h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2 1 2.4c.1.1 1.5 2.3 3.6 3.2.5.2.8.3 1.1.4.5.1 1 .1 1.3.1.4 0 1.1-.5 1.3-1 .2-.5.2-.9.1-1zM12 2a10 10 0 100 20 10 10 0 000-20zm0 18.4a8.4 8.4 0 110-16.8 8.4 8.4 0 010 16.8z"></path></svg>`;
const trashIconSvg = `<svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em"><path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z"></path></svg>`;

// =================================================================
// INÍCIO: LÓGICA DE PREPARAÇÃO DOS DADOS
// =================================================================

const clientes = $input.all().map(item => item.json);

const etapasFunil = [
  '1° CONTATO ( D )', '1° CONTATO ( E )', 'RESPONDIDO', 'QUALIFICADO ( H )',
  'ATENÇÃO ( H )', 'ATEND. FINALIZADO', 'VISITA AGENDADA', 'VISITA FEITA',
  'EM NEGOCIAÇÃO', 'REALIZADO', 'PERDIDO', 'CONTATO FUTURO'
];

const mapaDeEtapas = {
  'PRIMEIRO CONTATO': '1° CONTATO ( E )',
  'TRANSFERENCIA HUMANO': 'QUALIFICADO ( H )',
  'RESPONDIDO': 'RESPONDIDO', 'EM NEGOCIAÇÃO': 'EM NEGOCIAÇÃO',
  'REALIZADO': 'REALIZADO', 'PERDIDO': 'PERDIDO',
};

const clientesPorEtapa = {};
etapasFunil.forEach(etapa => { clientesPorEtapa[etapa] = []; });
clientes.forEach(cliente => {
  if (!cliente.etapa_funil) return;
  const etapaDoBanco = cliente.etapa_funil.toUpperCase();
  const etapaKanban = mapaDeEtapas[etapaDoBanco] || etapasFunil.find(e => e.toUpperCase().includes(etapaDoBanco));
  if (etapaKanban && clientesPorEtapa[etapaKanban]) {
    clientesPorEtapa[etapaKanban].push(cliente);
  }
});

// =================================================================
//  INÍCIO: DEFINIÇÃO DE CORES DAS COLUNAS
//  Esta é a área principal para editar as cores.
//  Basta alterar o código de cor hexadecimal (#...) para a cor desejada.
// =================================================================
const coresDasColunas = {
    // Etapa: 1° CONTATO ( D )
    '1° CONTATO ( D )': '#dcdcdc',
    // Etapa: 1° CONTATO ( E )
    '1° CONTATO ( E )': '#dcdcdc',
    // Etapa: RESPONDIDO
    'RESPONDIDO': '#5f7ca7',
    // Etapa: QUALIFICADO ( H )
    'QUALIFICADO ( H )': '#f39c12',
    // Etapa: ATENÇÃO ( H )
    'ATENÇÃO ( H )': '#f1c40f',
    // Etapa: ATEND. FINALIZADO
    'ATEND. FINALIZADO': '#e74c3c',
    // Etapa: VISITA AGENDADA
    'VISITA AGENDADA': '#a9dfbf',
    // Etapa: VISITA FEITA
    'VISITA FEITA': '#58d68d',
    // Etapa: EM NEGOCIAÇÃO
    'EM NEGOCIAÇÃO': '#1a5d2d',
    // Etapa: REALIZADO
    'REALIZADO': '#2ecc71',
    // Etapa: PERDIDO
    'PERDIDO': '#6c223a',
    // Etapa: CONTATO FUTURO
    'CONTATO FUTURO': '#0d3b66',
};

// =================================================================
// INÍCIO: GERAÇÃO DO HTML, CSS E JAVASCRIPT DO CLIENTE
// =================================================================
let html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRM Kanban</title>
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
    <style>
        :root { --cor-vinho: #8B0000; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000; color: #e2e8f0; overflow: hidden; }
        .kanban-board { display: flex; height: 100vh; padding: 10px; padding-bottom: 25px; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; scrollbar-width: thin; scrollbar-color: #4a5568 #111; }
        .kanban-board::-webkit-scrollbar { height: 20px; }
        .kanban-board::-webkit-scrollbar-track { background: #111; }
        .kanban-board::-webkit-scrollbar-thumb { background-color: #4a5568; border-radius: 10px; border: 4px solid #111; }
        .kanban-column { flex: 0 0 220px; margin: 0 5px; border-radius: 8px; display: flex; flex-direction: column; }
        .column-title { padding: 12px; font-size: 0.9rem; font-weight: 700; color: #fff; background-color: rgba(0,0,0,0.4); border-top-left-radius: 8px; border-top-right-radius: 8px; }
        .cards-container { padding: 10px; flex-grow: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.3) transparent; }
        .cards-container::-webkit-scrollbar { width: 8px; }
        .cards-container::-webkit-scrollbar-track { background: transparent; }
        .cards-container::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.4); border-radius: 10px; }
        .kanban-card { background-color: #2d3748; border-radius: 6px; padding: 8px; margin-bottom: 8px; cursor: grab; box-shadow: 0 2px 4px rgba(0,0,0,0.4); border: 1px solid transparent; display: flex; flex-direction: column; }
        .kanban-card.sortable-delay-started { cursor: grabbing; border-color: #4299e1; }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .card-name { font-size: 0.95rem; font-weight: 600; flex-grow: 1; margin-right: 8px; }
        .card-details { font-size: 0.75rem; color: #a0aec0; margin-bottom: 8px; text-transform: capitalize; }
        .card-actions { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: auto; }
        .btn-whatsapp { background-color: #25D366; color: white; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; border: none; border-radius: 5px; transition: background-color 0.2s; padding: 0; cursor: pointer; }
        .btn-whatsapp:hover { background-color: #1DA851; }
        .btn-delete { background-color: var(--cor-vinho); color: white; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 1rem; border: none; border-radius: 5px; cursor: pointer; }
        .switch-container { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; color: #a0aec0; }
        .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #555; transition: .4s; border-radius: 24px; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #25D366; }
        input:checked + .slider:before { transform: translateX(20px); }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: none; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: #2d3748; padding: 25px; border-radius: 8px; text-align: center; width: 90%; max-width: 320px; }
        .modal-content h3 { margin-bottom: 15px; }
        .modal-content p { margin-bottom: 20px; color: #a0aec0; }
        .modal-content input[type="datetime-local"] { width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #4a5568; background: #1a202c; color: #fff; font-size: 1rem; margin-bottom: 20px; }
        .modal-actions button { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: 600; }
        .modal-btn-cancel { background-color: #718096; color: #fff; }
        .modal-btn-confirm { background-color: #4299e1; color: #fff; margin-left: 10px; }
        #modal-btn-delete { background-color: var(--cor-vinho); color: #fff; margin-left: 10px; }
    </style>
</head>
<body>
    <div class="kanban-board" id="kanbanBoard">
        ${
          etapasFunil.map(etapa => `
            <div class="kanban-column" style="background-color: ${coresDasColunas[etapa] || '#333'};">
                <h2 class="column-title" data-title-etapa="${etapa}">${etapa} <span class="card-counter">(${clientesPorEtapa[etapa].length})</span></h2>
                <div class="cards-container" data-etapa-id="${etapa}">
                    ${
                      clientesPorEtapa[etapa].map(cliente => {
                        const isIA = (cliente.quem_responde?.toLowerCase() || 'ia') === 'ia';
                        return `
                        <div class="kanban-card" data-card-id="${cliente.id}">
                            <div class="card-header">
                                <div class="card-name">${formatName(cliente.nome)}</div>
                                <a href="https://wa.me/55${sanitizePhoneNumber(cliente.telefone)}" target="_blank" class="btn-whatsapp">${whatsappIconSvg}</a>
                            </div>
                            <div class="card-details">
                                ${cliente.finalidade || ''} - ${formatCurrency(cliente.finalidade?.toLowerCase().includes('venda') ? cliente.investmax_compra : cliente.investmax_aluguel)}
                            </div>
                            <div class="card-actions">
                                <button class="btn-delete" data-card-id="${cliente.id}">${trashIconSvg}</button>
                                <div class="switch-container">
                                    <span>IA</span>
                                    <label class="switch">
                                        <input type="checkbox" class="ia-toggle" data-card-id="${cliente.id}" ${isIA ? 'checked' : ''}>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>`;
                      }).join('')
                    }
                </div>
            </div>
          `).join('')
        }
    </div>

    <div id="date-modal" class="modal-overlay">
        <div class="modal-content">
            <h3>Definir Data para Contato Futuro</h3>
            <input type="datetime-local" id="future-date-input">
            <div class="modal-actions">
                <button class="modal-btn-cancel">Cancelar</button>
                <button class="modal-btn-confirm" id="modal-btn-save-date">Salvar</button>
            </div>
        </div>
    </div>

    <div id="delete-modal" class="modal-overlay">
        <div class="modal-content">
            <h3>Confirmar Exclusão</h3>
            <p>Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.</p>
            <div class="modal-actions">
                <button class="modal-btn-cancel">Cancelar</button>
                <button class="modal-btn-confirm" id="modal-btn-delete">Excluir</button>
            </div>
        </div>
    </div>

    <script>
        // Bloco de script executado após o carregamento da página.
        document.addEventListener('DOMContentLoaded', function () {
            
            // --- VARIÁVEIS GLOBAIS E FUNÇÕES DE APOIO ---
            const webhookUrl = '${WEBHOOK_URL}';

            /**
             * Atualiza dinamicamente os contadores de cards nos títulos das colunas.
             * @param {HTMLElement} fromContainer - O container de origem do card.
             * @param {HTMLElement} toContainer - O container de destino do card (pode ser null se for exclusão).
             */
            function updateCounters(fromContainer, toContainer) {
                if (fromContainer) {
                    const fromTitle = document.querySelector(\`[data-title-etapa="\${fromContainer.dataset.etapaId}"] .card-counter\`);
                    if(fromTitle) fromTitle.textContent = \`(\${fromContainer.children.length})\`;
                }
                if (toContainer) {
                    const toTitle = document.querySelector(\`[data-title-etapa="\${toContainer.dataset.etapaId}"] .card-counter\`);
                    if(toTitle) toTitle.textContent = \`(\${toContainer.children.length})\`;
                }
            }

            // --- LÓGICA DO MODAL DE DATA E HORA ---
            const dateModal = document.getElementById('date-modal');
            const dateInput = document.getElementById('future-date-input');
            let dateModalResolve;
            function openDateModal() {
                dateModal.style.display = 'flex';
                dateInput.value = '';
                return new Promise(resolve => { dateModalResolve = resolve; });
            }
            dateModal.querySelector('#modal-btn-save-date').onclick = () => {
                if (dateInput.value) {
                    dateModal.style.display = 'none';
                    if (dateModalResolve) dateModalResolve({ confirmed: true, date: dateInput.value });
                } else { alert('Por favor, selecione uma data e hora.'); }
            };
            dateModal.querySelector('.modal-btn-cancel').onclick = () => {
                dateModal.style.display = 'none';
                if (dateModalResolve) dateModalResolve({ confirmed: false });
            };

            // --- LÓGICA DO MODAL DE CONFIRMAÇÃO (GENÉRICO) ---
            const confirmModal = document.getElementById('delete-modal');
            let confirmModalResolve;
            function openConfirmModal() {
                confirmModal.style.display = 'flex';
                return new Promise(resolve => { confirmModalResolve = resolve; });
            }
            confirmModal.querySelector('#modal-btn-delete').onclick = () => {
                confirmModal.style.display = 'none';
                if(confirmModalResolve) confirmModalResolve({ confirmed: true });
            };
            confirmModal.querySelector('.modal-btn-cancel').onclick = () => {
                confirmModal.style.display = 'none';
                if(confirmModalResolve) confirmModalResolve({ confirmed: false });
            };


            // --- LÓGICA PRINCIPAL DO DRAG AND DROP (SORTABLEJS) ---
            document.querySelectorAll('.cards-container').forEach(container => {
                new Sortable(container, {
                    group: 'kanban',
                    animation: 150,
                    delay: 300,
                    delayOnTouchOnly: true,
                    onEnd: async function (evt) {
                        const cardId = evt.item.dataset.cardId;
                        const novaEtapa = evt.to.dataset.etapaId;

                        updateCounters(evt.from, evt.to);
                        
                        if (novaEtapa === 'CONTATO FUTURO') {
                            const result = await openDateModal();
                            if (result.confirmed) {
                                fetch(webhookUrl, {
                                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ updateType: 'contatoFuturo', cardId, novaEtapa, dataHoraFuturo: result.date })
                                }).catch(console.error);
                            } else {
                                evt.from.appendChild(evt.item);
                                updateCounters(evt.to, evt.from);
                            }
                        } else {
                            fetch(webhookUrl, {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ updateType: 'etapa', cardId, novaEtapa })
                            }).catch(console.error);
                        }
                    }
                });
            });

            // --- EVENT LISTENERS PARA AÇÕES NOS CARDS ---
            document.getElementById('kanbanBoard').addEventListener('click', async function(event) {
                // Lógica do botão de Excluir
                const deleteButton = event.target.closest('.btn-delete');
                if (deleteButton) {
                    const cardId = deleteButton.dataset.cardId;
                    const cardElement = deleteButton.closest('.kanban-card');
                    
                    const result = await openConfirmModal();
                    if (result.confirmed) {
                        const originalContainer = cardElement.parentElement;
                        cardElement.remove();
                        updateCounters(originalContainer, null);

                        fetch(webhookUrl, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ updateType: 'etapa', cardId, novaEtapa: 'excluido' })
                        }).catch(console.error);
                    }
                    return; // Encerra a execução para não confundir com outros eventos
                }

                // Lógica do Toggle IA/Humano (usa 'change' event)
                const toggle = event.target;
                if (toggle.classList.contains('ia-toggle')) {
                    // O listener de 'change' lida com isso.
                    return;
                }
            });

            // Listener separado para 'change' para o toggle, que é mais apropriado.
            document.getElementById('kanbanBoard').addEventListener('change', function(event) {
                const toggle = event.target;
                if (!toggle.classList.contains('ia-toggle')) return;
                
                const cardId = toggle.dataset.cardId;
                const novoResponsavel = toggle.checked ? 'ia' : 'humano';

                fetch(webhookUrl, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updateType: 'responsavel', cardId, novoResponsavel })
                }).catch(console.error);
            });
        });
    </script>
</body>
</html>
`;

// =================================================================
// INÍCIO: GERAÇÃO DO ARQUIVO BINÁRIO DE SAÍDA
// =================================================================
const buffer = Buffer.from(html, 'utf-8');
return [{ binary: { data: buffer } }];