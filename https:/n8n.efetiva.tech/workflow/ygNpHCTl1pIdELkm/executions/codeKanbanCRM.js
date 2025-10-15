// ====================================================================================
// CÓDIGO PARA O NÓ "CODE" DO N8N - GERADOR DE KANBAN (v5 - Final com Ações em Bloco)
// Autor: Gemini
// Descrição: Versão final com interface interativa, incluindo filtros, seleção em massa,
//            e um menu customizado de ações para deletar, alterar IA e mover cards.
// ====================================================================================

// =================================================================
// INÍCIO: CONFIGURAÇÕES E FUNÇÕES DE AJUDA
// =================================================================

const WEBHOOK_URL = 'https://webhook.efetiva.tech/webhook/crm-atualiza-efetiva';

const formatName = (name, phone) => {
  const cleanPhone = phone ? phone.split('@')[0] : '';
  if (name && name.trim() !== '' && name.trim().toLowerCase() !== 'null' && name.trim() !== cleanPhone) {
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return toTitleCase(name);
    return toTitleCase(`${parts[0]} ${parts[parts.length - 1]}`);
  }
  return cleanPhone || 'Sem Nome';
};

const toTitleCase = (str) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const formatDate = (isoString) => {
    if (!isoString) return 'N/I';
    const options = { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' };
    return new Date(isoString).toLocaleString('pt-BR', options).replace(',', '');
};

const sanitizePhoneNumber = (phone) => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

const whatsappIconSvg = `<svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em"><path d="M16.6 14c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.5-1.5-1.8-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.2.2-.3.1-.1.1-.2 0-.4-.1-.1-.6-1.5-.8-2-.2-.5-.4-.5-.5-.5h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2 1 2.4c.1.1 1.5 2.3 3.6 3.2.5.2.8.3 1.1.4.5.1 1 .1 1.3.1.4 0 1.1-.5 1.3-1 .2-.5.2-.9.1-1zM12 2a10 10 0 100 20 10 10 0 000-20zm0 18.4a8.4 8.4 0 110-16.8 8.4 8.4 0 010 16.8z"></path></svg>`;
const trashIconSvg = `<svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em"><path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z"></path></svg>`;

// =================================================================
// INÍCIO: LÓGICA DE PREPARAÇÃO DOS DADOS
// =================================================================

let clientes = $input.all().map(item => item.json);

clientes.forEach(c => {
    c.nome = c.nome || c.nome_partic;
    c.telefone = c.telefone || c.fone_partic;
});

const etapasFunil = [
  '1° CONTATO (D)', '1° CONTATO (E)', 'INTERESSADO', 'REUNIÃO AGENDADA',
  'REUNIÃO REALIZADA', 'NEGÓCIO FECHADO', 'CONTATO FUTURO', 'PERDIDO'
];

const clientesPorEtapa = {};
etapasFunil.forEach(etapa => { clientesPorEtapa[etapa] = []; });

clientes.forEach(cliente => {
  if (!cliente.etapa_funil) return;
  const etapaDoBanco = cliente.etapa_funil.toUpperCase();
  const etapaKanban = etapasFunil.find(e => e.toUpperCase() === etapaDoBanco || e.toUpperCase().includes(etapaDoBanco));
  
  if (etapaKanban && clientesPorEtapa[etapaKanban]) {
    clientesPorEtapa[etapaKanban].push(cliente);
  }
});

for (const etapa in clientesPorEtapa) {
  clientesPorEtapa[etapa].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// =================================================================
//  INÍCIO: DEFINIÇÃO DE CORES
// =================================================================
const coresDasColunas = {
    '1° CONTATO (D)': '#dcdcdc',
    '1° CONTATO (E)': '#dcdcdc',
    'INTERESSADO': '#5f7ca7',
    'REUNIÃO AGENDADA': '#a9dfbf',
    'REUNIÃO REALIZADA': '#58d68d',
    'NEGÓCIO FECHADO': '#2ecc71',
    'CONTATO FUTURO': '#0d3b66',
    'PERDIDO': '#6c223a',
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
        :root { --cor-vinho: #8B0000; --cor-vinho-card: rgb(83 3 3 / 88%); }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000; color: #e2e8f0; overflow: hidden; }
        .kanban-board { display: flex; height: 100vh; padding: 10px; padding-bottom: 25px; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; scrollbar-color: #4a5568 #111; }
        .kanban-board::-webkit-scrollbar { height: 20px; }
        .kanban-board::-webkit-scrollbar-track { background: #111; }
        .kanban-board::-webkit-scrollbar-thumb { background-color: #4a5568; border-radius: 10px; border: 4px solid #111; }
        .kanban-column { flex: 0 0 240px; margin: 0 5px; border-radius: 8px; display: flex; flex-direction: column; }
        .column-header { background-color: rgba(0,0,0,0.4); border-top-left-radius: 8px; border-top-right-radius: 8px; }
        .column-title { padding: 12px; font-size: 0.9rem; font-weight: 700; color: #fff; }
        .cards-container { padding: 10px; flex-grow: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.3) transparent; }
        .kanban-card { background-color: #2d3748; border-radius: 6px; padding: 8px; margin-bottom: 8px; cursor: grab; box-shadow: 0 2px 4px rgba(0,0,0,0.4); border: 1px solid transparent; display: flex; flex-direction: column; transition: background-color 0.2s; }
        .kanban-card.sortable-delay-started { cursor: grabbing; border-color: #4299e1; }
        .kanban-card.card-origem-d { background-color: var(--cor-vinho-card); }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; gap: 8px; }
        .card-name { font-size: 0.95rem; font-weight: 600; flex-grow: 1; margin-right: 8px; word-break: break-word; }
        .card-details { font-size: 0.75rem; color: #a0aec0; margin-bottom: 8px; }
        .card-actions { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: auto; }
        .btn-whatsapp, .btn-delete { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: none; border-radius: 5px; cursor: pointer; flex-shrink: 0; transition: background-color 0.2s; padding: 0; }
        .btn-whatsapp { background-color: #25D366; color: white; font-size: 1.2rem; }
        .btn-whatsapp:hover { background-color: #1DA851; }
        .btn-delete { background-color: var(--cor-vinho); color: white; font-size: 1rem; }
        .switch-container { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; color: #a0aec0; }
        .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #555; transition: .4s; border-radius: 24px; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #25D366; }
        input:checked + .slider:before { transform: translateX(20px); }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: none; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: #2d3748; padding: 25px; border-radius: 8px; text-align: center; width: 90%; max-width: 320px; }
        .modal-actions { display: flex; justify-content: center; gap: 1rem; margin-top: 1.5rem; }
        .modal-btn-cancel { background-color: #718096; color: #fff; }
        .modal-btn-confirm { background-color: #4299e1; color: #fff; }
        #modal-btn-delete, .btn-delete-batch { background-color: var(--cor-vinho); color: #fff; }

        /* --- ESTILOS DAS FERRAMENTAS DA COLUNA --- */
        .column-tools { padding: 0 10px 10px 10px; display: flex; flex-direction: column; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .column-search { width: 100%; background-color: rgba(0,0,0,0.3); border: 1px solid #555; color: #fff; border-radius: 4px; padding: 6px 8px; font-size: 0.85rem; }
        .selection-area { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .select-all-label { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #ccc; cursor: pointer; user-select: none; }
        .card-checkbox { transform: scale(1.3); flex-shrink: 0; }
        .batch-actions-container { display: none; /* Inicia oculto */ position: relative; }
        .batch-actions-trigger { background: #4a5568; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; }
        .batch-actions-menu { display: none; position: absolute; background-color: #3e4a5c; border: 1px solid #555; border-radius: 5px; z-index: 1010; min-width: 200px; right: 0; top: 100%; margin-top: 5px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        .batch-menu-item { padding: 10px 15px; cursor: pointer; display: flex; align-items: center; gap: 8px; background-color: #3d3c45; font-size: smaller; }
        .batch-menu-item:hover { background-color: #4a5568; }
        .batch-menu-item svg { width: 16px; height: 16px; }
        .batch-menu-divider { border-top: 1px solid #555; margin: 5px 0; }
        .batch-menu-header { padding: 8px 15px; font-size: 0.9rem; color: #a0aec0; text-transform: uppercase; background-color: #101325; }
        .batch-menu-sub-item { padding: 8px 15px 8px 25px; }
    </style>
</head>
<body>
    <div class="kanban-board" id="kanbanBoard">
        ${
          etapasFunil.map(etapa => `
            <div class="kanban-column" style="background-color: ${coresDasColunas[etapa] || '#333'};">
                <div class="column-header">
                    <h2 class="column-title" data-title-etapa="${etapa}">${etapa} <span class="card-counter">(${clientesPorEtapa[etapa].length})</span></h2>
                    
                    <div class="column-tools">
                        <input type="text" class="column-search" placeholder="Filtrar nesta coluna...">
                        <div class="selection-area">
                            <label class="select-all-label"><input type="checkbox" class="select-all-in-column"> Todos</label>
                            <div class="batch-actions-container">
                                <button class="batch-actions-trigger">Ações em Bloco ▾</button>
                                <div class="batch-actions-menu">
                                    <div class="batch-menu-item" data-action="delete">
                                        ${trashIconSvg} Deletar Todos
                                    </div>
                                    <div class="batch-menu-divider"></div>
                                    <div class="batch-menu-header">Alterar IA</div>
                                    <div class="batch-menu-item" data-action="ia-on">Ativar IA</div>
                                    <div class="batch-menu-item" data-action="ia-off">Desativar IA</div>
                                    <div class="batch-menu-divider"></div>
                                    <div class="batch-menu-header">Mover para Etapa...</div>
                                    ${etapasFunil.filter(e => e !== etapa).map(e => `<div class="batch-menu-item batch-menu-sub-item" data-action="move_${e}">${e}</div>`).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="cards-container" data-etapa-id="${etapa}">
                    ${
                      clientesPorEtapa[etapa].map(cliente => {
                        const isIA = (cliente.quem_responde?.toLowerCase() || 'ia') === 'ia';
                        const telefoneLimpo = sanitizePhoneNumber(cliente.telefone);
                        const origemClass = cliente.etapa_funil === '1° CONTATO (D)' ? 'card-origem-d' : '';
                        return `
                        <div class="kanban-card ${origemClass}" data-card-id="${cliente.id}">
                            <div class="card-header">
                                <input type="checkbox" class="card-checkbox" data-card-id="${cliente.id}">
                                <div class="card-name">${formatName(cliente.nome, cliente.telefone)}</div>
                                <a href="https://wa.me/${telefoneLimpo}" target="_blank" class="btn-whatsapp">${whatsappIconSvg}</a>
                            </div>
                            <div class="card-details">Criado em: ${formatDate(cliente.created_at)}</div>
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
    <div id="confirm-modal" class="modal-overlay">
        <div class="modal-content">
            <h3 id="confirm-modal-title">Confirmar Ação</h3>
            <p id="confirm-modal-message">Você tem certeza?</p>
            <div class="modal-actions">
                <button class="modal-btn-cancel">Cancelar</button>
                <button class="modal-btn-confirm" id="modal-btn-confirm-action">Confirmar</button>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            
            const webhookUrl = '${WEBHOOK_URL}';

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

            // --- LÓGICA DOS MODAIS ---
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
            
            const confirmModal = document.getElementById('confirm-modal');
            const confirmModalTitle = document.getElementById('confirm-modal-title');
            const confirmModalMessage = document.getElementById('confirm-modal-message');
            const confirmModalButton = document.getElementById('modal-btn-confirm-action');
            let confirmModalResolve;
            function openConfirmModal(title, message, btnText = 'Confirmar', btnClass = 'modal-btn-confirm') {
                confirmModalTitle.textContent = title;
                confirmModalMessage.textContent = message;
                confirmModalButton.textContent = btnText;
                confirmModalButton.className = \`modal-btn-confirm \${btnClass}\`;
                confirmModal.style.display = 'flex';
                return new Promise(resolve => { confirmModalResolve = resolve; });
            }
            confirmModalButton.onclick = () => {
                confirmModal.style.display = 'none';
                if(confirmModalResolve) confirmModalResolve({ confirmed: true });
            };
            confirmModal.querySelector('.modal-btn-cancel').onclick = () => {
                confirmModal.style.display = 'none';
                if(confirmModalResolve) confirmModalResolve({ confirmed: false });
            };


            // --- LÓGICA DO DRAG AND DROP ---
            document.querySelectorAll('.cards-container').forEach(container => {
                new Sortable(container, {
                    group: 'kanban', animation: 150, delay: 300, delayOnTouchOnly: true,
                    onEnd: async function (evt) {
                        const cardId = evt.item.dataset.cardId;
                        const novaEtapa = evt.to.dataset.etapaId;
                        updateCounters(evt.from, evt.to);
                        if (novaEtapa === 'CONTATO FUTURO') {
                            const result = await openDateModal();
                            if (result.confirmed) {
                                fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updateType: 'etapa', cardId, novaEtapa, dataHoraFuturo: result.date }) }).catch(console.error);
                            } else {
                                evt.from.appendChild(evt.item);
                                updateCounters(evt.to, evt.from);
                            }
                        } else {
                            fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updateType: 'etapa', cardId, novaEtapa }) }).catch(console.error);
                        }
                    }
                });
            });

            // --- EVENTOS DE AÇÃO NOS CARDS E COLUNAS ---
            document.getElementById('kanbanBoard').addEventListener('click', async function(event) {
                const deleteButton = event.target.closest('.btn-delete');
                if (deleteButton) {
                    const cardId = deleteButton.dataset.cardId;
                    const cardElement = deleteButton.closest('.kanban-card');
                    const result = await openConfirmModal('Confirmar Exclusão', 'Tem certeza que deseja excluir este lead?', 'Excluir', 'btn-delete-batch');
                    if (result.confirmed) {
                        const originalContainer = cardElement.parentElement;
                        cardElement.remove();
                        updateCounters(originalContainer, null);
                        fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updateType: 'etapa', cardId, novaEtapa: 'excluido' }) }).catch(console.error);
                    }
                }

                // Lógica de abrir/fechar menu de ações em bloco
                const actionsTrigger = event.target.closest('.batch-actions-trigger');
                if (actionsTrigger) {
                    const menu = actionsTrigger.nextElementSibling;
                    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                } else if (!event.target.closest('.batch-actions-menu')) {
                    document.querySelectorAll('.batch-actions-menu').forEach(menu => menu.style.display = 'none');
                }
            });
            
            document.getElementById('kanbanBoard').addEventListener('change', function(event) {
                const target = event.target;
                const column = target.closest('.kanban-column');
                
                if (target.classList.contains('ia-toggle')) {
                    const cardId = target.dataset.cardId;
                    const novoResponsavel = target.checked ? 'ia' : 'humano';
                    fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updateType: 'responsavel', cardId, novoResponsavel }) }).catch(console.error);
                }

                if(target.classList.contains('select-all-in-column') || target.classList.contains('card-checkbox')) {
                    setTimeout(() => updateBatchActionsVisibility(column), 0);
                }

                if(target.classList.contains('select-all-in-column')) {
                    const checkboxes = column.querySelectorAll('.cards-container .kanban-card:not([style*="display: none"]) .card-checkbox');
                    checkboxes.forEach(cb => cb.checked = target.checked);
                }
            });

            document.querySelectorAll('.column-search').forEach(input => {
                input.addEventListener('input', function(event) {
                    const searchTerm = event.target.value.toLowerCase();
                    const column = event.target.closest('.kanban-column');
                    const cards = column.querySelectorAll('.kanban-card');
                    column.querySelector('.select-all-in-column').checked = false;
                    
                    cards.forEach(card => {
                        const cardName = (card.querySelector('.card-name')?.textContent || '').toLowerCase();
                        const cardPhone = (card.querySelector('a.btn-whatsapp')?.href || '').replace('https://wa.me/', '');
                        const isVisible = cardName.includes(searchTerm) || cardPhone.includes(searchTerm);
                        card.style.display = isVisible ? 'flex' : 'none';
                    });
                    updateBatchActionsVisibility(column);
                });
            });

            // --- LÓGICA DAS AÇÕES EM MASSA ---
            function updateBatchActionsVisibility(column) {
                if (!column) return;
                const container = column.querySelector('.batch-actions-container');
                const selectedCount = column.querySelectorAll('.card-checkbox:checked').length;
                container.style.display = selectedCount > 0 ? 'block' : 'none';
            }

            document.querySelectorAll('.batch-menu-item').forEach(item => {
                item.addEventListener('click', async (e) => {
                    const action = e.target.dataset.action;
                    const column = e.target.closest('.kanban-column');
                    const selectedCheckboxes = column.querySelectorAll('.card-checkbox:checked');
                    const cardIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.cardId);

                    // Esconde o menu após clicar
                    e.target.closest('.batch-actions-menu').style.display = 'none';

                    if (cardIds.length === 0) return;

                    let confirmed = false;
                    let payload = { cardIds };
                    let actionText = '';

                    if (action === 'delete') {
                        const result = await openConfirmModal('Excluir Selecionados', \`Tem certeza de que deseja excluir os \${cardIds.length} leads selecionados?\`, 'Excluir', 'btn-delete-batch');
                        if (result.confirmed) {
                            confirmed = true;
                            payload.updateType = 'etapa';
                            payload.novaEtapa = 'excluido';
                        }
                    } else if (action === 'ia-on' || action === 'ia-off') {
                        const novoResponsavel = action === 'ia-on' ? 'ia' : 'humano';
                        actionText = action === 'ia-on' ? 'Ligar IA' : 'Desligar IA';
                        const result = await openConfirmModal('Alterar Responsável', \`Deseja \${actionText} para os \${cardIds.length} leads selecionados?\`);
                        if (result.confirmed) {
                            confirmed = true;
                            payload.updateType = 'responsavel';
                            payload.novoResponsavel = novoResponsavel;
                        }
                    } else if (action.startsWith('move_')) {
                        const novaEtapa = action.replace('move_', '');
                        payload.updateType = 'etapa';
                        payload.novaEtapa = novaEtapa;
                        
                        if (novaEtapa === 'CONTATO FUTURO') {
                            const dateResult = await openDateModal();
                            if (dateResult.confirmed) {
                                payload.dataHoraFuturo = dateResult.date;
                                const result = await openConfirmModal('Mover Selecionados', \`Mover \${cardIds.length} leads para "\${novaEtapa}" em \${new Date(dateResult.date).toLocaleString('pt-BR')}?\`);
                                confirmed = result.confirmed;
                            }
                        } else {
                           const result = await openConfirmModal('Mover Selecionados', \`Mover \${cardIds.length} leads para a etapa "\${novaEtapa}"?\`);
                           confirmed = result.confirmed;
                        }
                    }

                    if (confirmed) {
                        fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(console.error);

                        // Ações na interface
                        const fromContainer = column.querySelector('.cards-container');
                        if (action === 'delete') {
                            selectedCheckboxes.forEach(cb => cb.closest('.kanban-card').remove());
                            updateCounters(fromContainer, null);
                        } else if (action.startsWith('ia-')) {
                            selectedCheckboxes.forEach(cb => {
                                const toggle = cb.closest('.kanban-card').querySelector('.ia-toggle');
                                toggle.checked = payload.novoResponsavel === 'ia';
                            });
                        } else if (action.startsWith('move_')) {
                            const toContainer = document.querySelector(\`[data-etapa-id="\${payload.novaEtapa}"]\`);
                            selectedCheckboxes.forEach(cb => {
                                toContainer.prepend(cb.closest('.kanban-card'));
                            });
                            updateCounters(fromContainer, toContainer);
                        }
                    }
                    
                    // Limpa a seleção
                    column.querySelectorAll('.card-checkbox:checked').forEach(cb => cb.checked = false);
                    column.querySelector('.select-all-in-column').checked = false;
                    updateBatchActionsVisibility(column);
                });
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
return [{ binary: { data: buffer, fileName: 'kanban_crm.html', mimeType: 'text/html' } }];