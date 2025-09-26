// ====================================================================================
// CÓDIGO PARA O NÓ "CODE" DO N8N - GERADOR DE INTERFACE (v4 - Final)
// Descrição: Versão final do script. Remove elementos redundantes,
//            implementa a seleção de contatos ao clicar em qualquer parte da linha
//            e centraliza a configuração de limite de seleção.
// ====================================================================================

const contacts = $input.all().map(item => item.json);

const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Seleção de Contatos para Disparo</title>
    <style>
        :root {
            --bg-color: #1a1a1a;
            --card-bg-color: #2b2b2b;
            --card-content-bg-color: #2c3e50;
            --header-bg-color: #333;
            --header-highlight-bg-color: #556B2F;
            --row-odd-color: transparent;
            --row-even-color: rgba(0, 0, 0, 0.15);
            --row-selected-color: rgba(40, 167, 69, 0.3);
            --border-color: #444;
            --text-color: #f0f0f0;
            --text-muted-color: #aaa;
            --primary-color: #28a745;
            --primary-hover-color: #218838;
            --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: var(--font-family);
            margin: 0;
            padding: 1rem;
        }

        .container { max-width: 1200px; margin: 0 auto; }
        h1 { border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; font-weight: 500; }
        h2 {
           margin: 0;
           padding: 0.75rem 1rem;
           background-color: var(--header-highlight-bg-color);
           font-size: 1rem;
           border-radius: 6px 6px 0 0;
           font-weight: bold;
           text-transform: uppercase;
        }

        details {
            background-color: var(--card-bg-color);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            margin-bottom: 1rem;
            overflow: hidden;
        }

        summary { font-size: 1.2rem; font-weight: bold; padding: 1rem; cursor: pointer; outline: none; user-select: none; }
        summary::marker { color: var(--primary-color); }

        .content-wrapper { padding: 1rem; background-color: var(--card-content-bg-color); display: flex; flex-direction: column; gap: 1.5rem; }
        
        @media (min-width: 992px) {
            .content-wrapper { flex-direction: row; }
            .contacts-table-container { flex: 3; }
            .selected-contacts-container { flex: 2; }
        }
        
        .table-scroll-wrapper { overflow: auto; max-height: 60vh; border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 6px 6px; }

        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 0.8rem 0.5rem; text-align: left; border-bottom: 1px solid var(--border-color); white-space: nowrap; }

        thead { background-color: var(--header-bg-color); position: sticky; top: 0; z-index: 1; }
        th[data-column] { cursor: pointer; user-select: none; }
        th .sort-indicator { display: inline-block; margin-left: 5px; opacity: 0.5; width: 1em; }
        th.sorted .sort-indicator { opacity: 1; }

        /* [MODIFICADO] Adicionando cursor de ponteiro para a linha inteira */
        tbody tr { cursor: pointer; }
        tbody tr:nth-child(even) { background-color: var(--row-even-color); }
        tbody tr:nth-child(odd) { background-color: var(--row-odd-color); }
        tbody tr.selected-row { background-color: var(--row-selected-color); }
        
        #searchInput {
            width: 100%;
            padding: 0.75rem;
            margin-bottom: 1rem;
            background-color: var(--header-bg-color);
            border: 1px solid var(--border-color);
            border-radius: 5px;
            color: var(--text-color);
            font-size: 1rem;
            box-sizing: border-box;
        }
        
        .action-btn { background-color: var(--primary-color); color: white; border: none; border-radius: 5px; padding: 0.4rem 0.6rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; transition: background-color 0.2s; }
        .action-btn:hover { background-color: var(--primary-hover-color); }
        .action-btn svg { width: 16px; height: 16px; }

        input[type="checkbox"] { transform: scale(1.5); cursor: pointer; }
        input[type="checkbox"]:disabled { cursor: not-allowed; opacity: 0.5; }

    </style>
</head>
<body>
    <div class="container">
        <h1>Ferramenta de Disparo</h1>
        
        <details open>
            <summary>1. SELEÇÃO DE CONTATOS</summary>
            <div class="content-wrapper">
                
                <div class="contacts-table-container">
                    <h2>CONTATOS DISPONÍVEIS</h2>
                    <input type="text" id="searchInput" placeholder="Pesquisar por nome...">
                    <div class="table-scroll-wrapper">
                        <table id="contactsTable">
                            <thead>
                                <tr>
                                    <th><input type="checkbox" id="selectAllCheckbox" title="Selecionar todos os visíveis (até o limite)"></th>
                                    <th>AÇÕES</th>
                                    <th data-column="push_name">NOME <span class="sort-indicator"></span></th>
                                    <th data-column="remote_jid">CONTATO <span class="sort-indicator"></span></th>
                                    <th data-column="created_at">DT CADASTRO <span class="sort-indicator"></span></th>
                                    <th data-column="updated_at">DT ÚLTIMA MSG <span class="sort-indicator"></span></th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>

                <div class="selected-contacts-container">
                    <h2>SELECIONADOS (<span id="selectedCount">0</span>/<span id="maxCount">30</span>)</h2>
                    <div class="table-scroll-wrapper">
                        <table id="selectedTable">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>AÇÃO</th>
                                    <th>NOME</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>

            </div>
        </details>
        
        <details>
            <summary>2. CONFIGURAÇÕES DO DISPARO</summary>
             <div class="content-wrapper">
                <p>Em breve...</p>
            </div>
        </details>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            
            // --- Bloco 1: DADOS, ESTADO E CONSTANTES ---
            
            // ==> CONFIGURE AQUI O LIMITE MÁXIMO DE SELEÇÃO <==
            const MAX_SELECTIONS = 30;

            const n8nData = ${JSON.stringify(contacts)};
            let currentDisplayData = [...n8nData];
            let selectedContactIds = new Set();
            let sortState = { column: 'push_name', direction: 'asc' };

            const searchInput = document.getElementById('searchInput');
            const contactsTableBody = document.querySelector('#contactsTable tbody');
            const selectedTableBody = document.querySelector('#selectedTable tbody');
            const selectedCountSpan = document.getElementById('selectedCount');
            const maxCountSpan = document.getElementById('maxCount'); // Referência para o total
            const contactsThead = document.querySelector('#contactsTable thead');
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');

            const formatDate = (isoString) => {
                if (!isoString) return 'N/A';
                const date = new Date(isoString);
                return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            };
            const formatPhone = (jid) => jid ? jid.split('@')[0] : '';
            const toTitleCase = (str) => str ? str.toLowerCase().replace(/\\b\\w/g, char => char.toUpperCase()) : 'Sem Nome';
            const createWhatsAppButtonHTML = (phoneNumber) => \`<a href="https://wa.me/\${phoneNumber}" target="_blank" class="action-btn" title="Abrir no WhatsApp"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 221.9-99.6 221.9-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.8 0-67.6-9.5-97.2-27.2l-6.7-4-71.7 18.7 19-70.1-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg></a>\`;

            function renderContactsTable() {
                contactsTableBody.innerHTML = '';
                const isLimitReached = selectedContactIds.size >= MAX_SELECTIONS;
                currentDisplayData.forEach(contact => {
                    const tr = document.createElement('tr');
                    tr.dataset.contactId = contact.id;
                    const isSelected = selectedContactIds.has(contact.id.toString());
                    if (isSelected) tr.classList.add('selected-row');
                    const phoneNumber = formatPhone(contact.remote_jid);
                    tr.innerHTML = \`
                        <td><input type="checkbox" class="contact-checkbox" \${isSelected ? 'checked' : ''} \${!isSelected && isLimitReached ? 'disabled' : ''}></td>
                        <td>\${createWhatsAppButtonHTML(phoneNumber)}</td>
                        <td>\${toTitleCase(contact.push_name)}</td>
                        <td>\${phoneNumber}</td>
                        <td>\${formatDate(contact.created_at)}</td>
                        <td>\${formatDate(contact.updated_at)}</td>
                    \`;
                    contactsTableBody.appendChild(tr);
                });
            }

            function renderSelectedTable() {
                selectedTableBody.innerHTML = '';
                selectedCountSpan.textContent = selectedContactIds.size;
                let counter = 1;
                n8nData.forEach(contact => {
                    if (selectedContactIds.has(contact.id.toString())) {
                        const tr = document.createElement('tr');
                        const phoneNumber = formatPhone(contact.remote_jid);
                        // [MODIFICADO] Nova ordem das células
                        tr.innerHTML = \`
                            <td>\${counter++}.</td>
                            <td>\${createWhatsAppButtonHTML(phoneNumber)}</td>
                            <td>\${toTitleCase(contact.push_name)}</td>
                        \`;
                        selectedTableBody.appendChild(tr);
                    }
                });
            }

            const applySort = () => {
                const { column, direction } = sortState;
                currentDisplayData.sort((a, b) => {
                    const valA = a[column]; const valB = b[column];
                    if (valA === null || valA === undefined) return 1; if (valB === null || valB === undefined) return -1;
                    let c = 0; if (valA > valB) c = 1; else if (valA < valB) c = -1;
                    return direction === 'asc' ? c : c * -1;
                });
                contactsThead.querySelectorAll('th').forEach(th => {
                    th.classList.remove('sorted', 'asc', 'desc');
                    const i = th.querySelector('.sort-indicator'); if(i) i.textContent = '';
                });
                const activeTh = contactsThead.querySelector(\`th[data-column="\${column}"]\`);
                if(activeTh) {
                   activeTh.classList.add('sorted', direction);
                   const i = activeTh.querySelector('.sort-indicator'); if(i) i.textContent = direction === 'asc' ? '▲' : '▼';
                }
            };

            // --- Event Listeners ---
            searchInput.addEventListener('input', (e) => {
                currentDisplayData = n8nData.filter(c => c.push_name && c.push_name.toLowerCase().includes(e.target.value.toLowerCase()));
                applySort(); renderContactsTable();
            });

            contactsThead.addEventListener('click', (e) => {
                const h = e.target.closest('th'); if (!h || !h.dataset.column) return;
                const c = h.dataset.column;
                if (sortState.column === c) sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
                else { sortState.column = c; sortState.direction = 'asc'; }
                applySort(); renderContactsTable();
            });
            
            // [MODIFICADO] Listener de clique na linha para selecionar
            contactsTableBody.addEventListener('click', (e) => {
                // Impede que a ação seja disparada se o clique for em um link ou no próprio checkbox
                if (e.target.closest('a, input[type="checkbox"]')) return;
                
                const row = e.target.closest('tr');
                if (!row) return;

                const checkbox = row.querySelector('.contact-checkbox');
                if (checkbox) checkbox.click(); // .click() dispara o evento 'change'
            });

            contactsTableBody.addEventListener('change', (e) => {
                if (e.target.classList.contains('contact-checkbox')) {
                    const checkbox = e.target; const row = checkbox.closest('tr'); const id = row.dataset.contactId;
                    if (checkbox.checked) {
                        if (selectedContactIds.size < MAX_SELECTIONS) selectedContactIds.add(id);
                        else { checkbox.checked = false; alert(\`Limite de \${MAX_SELECTIONS} seleções atingido.\`); }
                    } else { selectedContactIds.delete(id); }
                    renderSelectedTable(); renderContactsTable();
                }
});

            selectAllCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                const visibleIds = currentDisplayData.map(c => c.id.toString());
                if (isChecked) {
                    visibleIds.forEach(id => { if (selectedContactIds.size < MAX_SELECTIONS) selectedContactIds.add(id); });
                } else { visibleIds.forEach(id => selectedContactIds.delete(id)); }
                renderSelectedTable(); renderContactsTable();
            });

            function init() {
                maxCountSpan.textContent = MAX_SELECTIONS; // Atualiza o texto do limite máximo
                applySort();
                renderContactsTable();
                renderSelectedTable();
            }

            init();
        });
    </script>
</body>
</html>
`;

const data = Buffer.from(html, 'utf-8');

return [{
  binary: {
    data: data,
    fileName: 'index.html',
    mimeType: 'text/html',
  }
}];