// ====================================================================================
// CÓDIGO PARA O NÓ "CODE" DO N8N - GERADOR DE INTERFACE (v16 - Paginação Implementada)
// Autor: Gemini
// Descrição: Versão final da aplicação com a lógica de paginação implementada no Card 1
//            para otimizar a performance com grandes volumes de dados.
// ====================================================================================

const contacts = $input.all().map(item => item.json);
// Pega os dados dos nós anteriores usando a sintaxe do n8n
const calculo = ($('Edit Fields').first().json.qtd_max_envios_dia - $('qtd_disparos').first().json.count);
// Garante que o limite não seja negativo
const maxSelectionsFinal = Math.max(0, calculo);

const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configuração de Disparo</title>
    <style>
        :root {
            --bg-color: #1a1a1a; --card-bg-color: #2b2b2b; --card-content-bg-color: #2c3e50;
            --header-bg-color: #333; --row-selected-color: rgba(40, 167, 69, 0.3); 
            --border-color: #444; --text-color: #f0f0f0; --text-muted-color: #aaa; 
            --primary-color: #28a745; --primary-hover-color: #218838; --invalid-color: #dc3545; 
            --warning-color: #f0ad4e; --accent-color: #3498db;
            --row-blue-odd: #34495E;
            --row-blue-even: #2C3E50;
            --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        /* --- ESTILOS GERAIS --- */
        body { background-color: var(--bg-color); color: var(--text-color); font-family: var(--font-family); margin: 0; padding: 1rem; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; font-weight: 500; }
        h2 { margin: 0; padding: 0.75rem 1rem; background-color: var(--header-bg-color); font-size: 1rem; border-radius: 6px 6px 0 0; font-weight: bold; text-transform: uppercase; }
        h3 { margin-top: 0; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; font-size: 1.1rem; }
        details { background-color: var(--card-bg-color); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem; overflow: hidden; }
        summary { font-size: 1.2rem; font-weight: bold; padding: 1rem; cursor: pointer; user-select: none; }
        summary::marker { color: var(--primary-color); }
        .content-wrapper { padding: 1rem; background-color: var(--card-content-bg-color); display: flex; flex-direction: column; gap: 1.5rem; }
        @media (min-width: 992px) { .content-wrapper { flex-direction: row; } .contacts-table-container, .config-col { flex: 3; } .selected-contacts-container, .preview-col { flex: 2; } }
        .btn { padding: 0.75rem 1rem; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; text-wrap: nowrap; transition: background-color 0.2s, opacity 0.2s; }
        .btn:disabled { cursor: not-allowed; opacity: 0.5; background-color: #555 !important; }
        .btn-primary { background-color: var(--primary-color); color: white; }
        .btn-primary:hover:not(:disabled) { background-color: var(--primary-hover-color); }
        .btn-secondary { background-color: #6c757d; color: white; }
        .btn-secondary:hover:not(:disabled) { opacity: 0.9; }
        .btn-warning { background-color: var(--warning-color); color: var(--bg-color); }
        .btn-warning:hover:not(:disabled) { opacity: 0.9; }
        input[type="checkbox"] { transform: scale(1.5); cursor: pointer; accent-color: var(--accent-color); }
        
        /* --- ESTILOS CARD 1 --- */
        /* --- Adicione esta nova regra --- */
        .contacts-table-container {min-width: 0;}
        #card1_wrapper .table-scroll-wrapper { border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 6px 6px; overflow: auto; max-height: 60vh; }
        #card1_wrapper table { width: 100%; border-collapse: collapse; }
        #card1_wrapper th, #card1_wrapper td { padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border-color); white-space: nowrap; vertical-align: middle; }
        #card1_wrapper thead { background-color: var(--header-bg-color); position: sticky; top: 0; z-index: 10; }
        #card1_wrapper tbody tr { cursor: pointer; }
        #card1_wrapper tbody tr.selected-row { background-color: var(--row-selected-color); }
        #searchInput { width: 100%; padding: 0.75rem; margin-bottom: 1rem; background-color: var(--header-bg-color); border: 1px solid var(--border-color); border-radius: 5px; color: var(--text-color); font-size: 1rem; box-sizing: border-box; }
        .action-btn { background-color: var(--primary-color); color: white; border: none; border-radius: 5px; padding: 0.4rem 0.6rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; }
        .action-btn svg { width: 16px; height: 16px; }
        #pagination-controls { display: flex; justify-content: center; align-items: center; padding-top: 1rem; gap: 1rem; user-select: none; }

        /* --- ESTILOS CARD 2 --- */
        .config-section { margin-bottom: 1.5rem; }
        .checkbox-group { display: flex; flex-wrap: wrap; gap: 1rem; } .checkbox-group label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
        .validation-note { font-size: 0.8rem; color: var(--text-muted-color); margin-top: 0.5rem; }
        .validation-note.invalid { color: var(--invalid-color); font-weight: bold; }
        textarea { width: 100%; min-height: 100px; background-color: var(--header-bg-color); border: 1px solid var(--border-color); border-radius: 5px; color: var(--text-color); font-size: 0.95rem; padding: 0.5rem; box-sizing: border-box; resize: vertical; }
        .char-counter { display: block; text-align: right; font-size: 0.8rem; color: var(--text-muted-color); margin-top: 0.25rem; }
        .char-counter.invalid { color: var(--invalid-color); font-weight: bold; }
        .preview-col { display: flex; flex-direction: column; }
        .phone-preview { background-color: var(--bg-color); border-radius: 12px; padding: 1rem; border: 3px solid #555; display: flex; flex-direction: column; flex-grow: 1; }
        #testNameInput { background-color: var(--header-bg-color); border: 1px solid var(--border-color); color: var(--text-color); padding: 0.5rem; border-radius: 4px; }
        .chat-bubble { background-color: var(--primary-color); color: white; padding: 0.75rem 1rem; border-radius: 15px 15px 0 15px; align-self: flex-end; max-width: 95%; width: fit-content; word-wrap: break-word; line-height: 1.4; min-height: 30px; margin-top: 1.5rem; margin-bottom: 1.5rem; }
        .preview-spacer { flex-grow: 1; }
        #generatePreviewBtn { background-color: var(--accent-color); } #generatePreviewBtn:hover { opacity: 0.9; }

        /* --- ESTILOS CARD 3 --- */
        #card3_wrapper { flex-direction: column; }
        .summary-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .summary-title { width: 100%; text-align: center; padding: 0.75rem; background-color: var(--header-bg-color); border-radius: 6px; font-size: 1.2rem; font-weight: bold; margin-bottom: 1rem; }
        .summary-alert { background-color: var(--warning-color); color: var(--bg-color); font-weight: bold; text-align: center; padding: 1rem; border-radius: 6px; margin-bottom: 1rem; }
        .summary-table { display: flex; flex-direction: column; gap: 2px; }
        .summary-row { display: flex; flex-wrap: wrap; padding: 0.75rem; border-radius: 6px; }
        .summary-row:nth-child(odd) { background-color: var(--row-blue-odd); }
        .summary-row:nth-child(even) { background-color: var(--row-blue-even); }
        .contact-info { display: flex; align-items: center; gap: 1rem; flex: 1 1 300px; padding-bottom: 0.5rem; }
        .contact-message { display: flex; align-items: flex-start; gap: 1rem; flex: 2 1 400px; }
        .contact-info span { font-weight: bold; }
        .contact-info .count { flex-basis: 25px; }
        .message-content { flex-grow: 1; line-height: 1.5; white-space: pre-wrap; }
        
        /* --- ESTILOS MODAL --- */
        .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: none; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background-color: var(--card-bg-color); padding: 2rem; border-radius: 8px; text-align: center; border: 1px solid var(--border-color); }
        .modal-actions { display: flex; justify-content: center; gap: 1rem; margin-top: 1.5rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Ferramenta de Disparo</h1>
        
        <details>
            <summary>1. SELEÇÃO DE CONTATOS</summary>
            <div class="content-wrapper" id="card1_wrapper"></div>
        </details>
        
        <details>
            <summary>2. CONFIGURAÇÃO DA MENSAGEM</summary>
            <div class="content-wrapper" id="card2_wrapper"></div>
        </details>

        <details>
            <summary>3. RESUMO</summary>
            <div class="content-wrapper" id="card3_wrapper"></div>
        </details>
    </div>

    <div id="confirmationModal" class="modal-backdrop">
      <div class="modal-content">
        <p style="font-size: 1.2rem;" id="modalMessage">Podemos começar o disparo em Massa?</p>
        <div class="modal-actions" id="modalActions">
          <button id="cancelDispatchBtn" class="btn btn-secondary">CANCELAR</button>
          <button id="confirmDispatchBtn" class="btn btn-primary">SIM</button>
        </div>
      </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            // ===================================================================
            // FUNÇÕES GLOBAIS E ESTADO COMPARTILHADO
            // ===================================================================
            const toTitleCase = (str) => str ? str.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ') : 'Sem Nome';
            const formatPhone = (jid) => jid ? jid.split('@')[0] : '';
            const createWhatsAppButtonHTML = (phone) => \`<a href="https://wa.me/\${phone}" target="_blank" class="action-btn" title="Abrir no WhatsApp"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 221.9-99.6 221.9-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.8 0-67.6-9.5-97.2-27.2l-6.7-4-71.7 18.7 19-70.1-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg></a>\`;
            const getPeriodoDia = () => { const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false })); if (h >= 5 && h < 12) return 'bom dia'; if (h >= 12 && h < 18) return 'boa tarde'; return 'boa noite'; };
            const escolherAleatorio = (lista) => lista.length > 0 ? lista[Math.floor(Math.random() * lista.length)] : '';
            
            let selectedContactIds = new Set();
            let summaryData = [];
            let summaryIsValid = false;

            function invalidateSummary() {
                if (!summaryIsValid) return;
                document.getElementById('summaryAlertContainer').innerHTML = '<div class="summary-alert">A LISTA DE CONTATOS FOI ALTERADA!<br>Por favor, gere as mensagens novamente para garantir que os dados estão corretos.</div>';
                document.getElementById('summaryTable').innerHTML = '';
                document.getElementById('finalStartDispatchBtn').disabled = true;
                summaryIsValid = false;
            }

            // ===================================================================
            // MÓDULO DO CARD 1: SELEÇÃO DE CONTATOS (COM PAGINAÇÃO)
            // ===================================================================
            (() => {
                const wrapper = document.getElementById('card1_wrapper');
                if (!wrapper) return;
                
                wrapper.innerHTML = \`<div class="contacts-table-container"><h2 style="border-radius: 6px 6px 0 0;">CONTATOS DISPONÍVEIS</h2><div style="padding: 1rem; background-color: var(--card-bg-color); border-radius: 0 0 6px 6px;"><input type="text" id="searchInput" placeholder="Pesquisar por nome..."><div class="table-scroll-wrapper" style="border: none; border-radius: 0;"><table id="contactsTable"><thead><tr><th><input type="checkbox" id="selectAllCheckbox" title="Selecionar todos os visíveis"></th><th>AÇÕES</th><th data-column="push_name">NOME <span class="sort-indicator"></span></th><th data-column="remote_jid">CONTATO <span class="sort-indicator"></span></th><th data-column="created_at">DT CADASTRO <span class="sort-indicator"></span></th><th data-column="updated_at">DT ÚLTIMA MSG <span class="sort-indicator"></span></th></tr></thead><tbody></tbody></table></div><div id="pagination-controls"><button id="prevPageBtn" class="btn btn-secondary">&lt; Anterior</button><span id="pageIndicator"></span><button id="nextPageBtn" class="btn btn-secondary">Próxima &gt;</button></div></div></div><div class="selected-contacts-container"><h2>SELECIONADOS (<span id="selectedCount">0</span>/<span id="maxCount">${maxSelectionsFinal}</span>)</h2><div class="table-scroll-wrapper" style="border-radius: 6px;"><table id="selectedTable"><thead><tr><th>#</th><th>AÇÃO</th><th>NOME</th></tr></thead><tbody></tbody></table></div></div>\`;
                
                const MAX_SELECTIONS =  ${maxSelectionsFinal};
                const contacts = ${JSON.stringify(contacts)};
                let filteredData = [...contacts];
                let sortState = { column: 'push_name', direction: 'asc' };
                let currentPage = 1;
                const recordsPerPage = 100;

                const searchInput = document.getElementById('searchInput'), contactsTableBody = document.querySelector('#contactsTable tbody'), selectedTableBody = document.querySelector('#selectedTable tbody'), selectedCountSpan = document.getElementById('selectedCount'), maxCountSpan = document.getElementById('maxCount'), contactsThead = document.querySelector('#contactsTable thead'), selectAllCheckbox = document.getElementById('selectAllCheckbox');
                const prevPageBtn = document.getElementById('prevPageBtn'), nextPageBtn = document.getElementById('nextPageBtn'), pageIndicator = document.getElementById('pageIndicator');
                
                const formatDate = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
                
                function renderPage() {
                    contactsTableBody.innerHTML = '';
                    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
                    currentPage = Math.max(1, Math.min(currentPage, totalPages));
                    const start = (currentPage - 1) * recordsPerPage;
                    const end = start + recordsPerPage;
                    const pageData = filteredData.slice(start, end);
                    const limit = selectedContactIds.size >= MAX_SELECTIONS;
                    
                    pageData.forEach(c => {
                        const tr = document.createElement('tr');
                        tr.dataset.contactId = c.id;
                        const isSelected = selectedContactIds.has(c.id.toString());
                        if (isSelected) tr.classList.add('selected-row');
                        const phone = formatPhone(c.remote_jid);
                        tr.innerHTML = \`<td><input type="checkbox" class="contact-checkbox" \${isSelected ? 'checked' : ''} \${!isSelected && limit ? 'disabled' : ''}></td><td>\${createWhatsAppButtonHTML(phone)}</td><td>\${toTitleCase(c.push_name)}</td><td>\${phone}</td><td>\${formatDate(c.created_at)}</td><td>\${formatDate(c.updated_at)}</td>\`;
                        contactsTableBody.appendChild(tr);
                    });

                    pageIndicator.textContent = \`Página \${totalPages > 0 ? currentPage : 0} de \${totalPages}\`;
                    prevPageBtn.disabled = currentPage === 1;
                    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
                }
                
                function renderSelectedTable() { selectedTableBody.innerHTML = ''; selectedCountSpan.textContent = selectedContactIds.size; let counter = 1; contacts.forEach(c => { if (selectedContactIds.has(c.id.toString())) { const tr = document.createElement('tr'); const phone = formatPhone(c.remote_jid); tr.innerHTML = \`<td>\${counter++}.</td><td>\${createWhatsAppButtonHTML(phone)}</td><td>\${toTitleCase(c.push_name)}</td>\`; selectedTableBody.appendChild(tr); } }); }
                function applySort() { const { column, direction } = sortState; filteredData.sort((a, b) => { const vA = a[column], vB = b[column]; if (vA === null || vA === undefined) return 1; if (vB === null || vB === undefined) return -1; let c = 0; if (vA > vB) c = 1; else if (vA < vB) c = -1; return direction === 'asc' ? c : c * -1; }); }
                
                contactsThead.addEventListener('click', (e) => { const h = e.target.closest('th'); if (!h || !h.dataset.column) return; const c = h.dataset.column; if (sortState.column === c) sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc'; else { sortState.column = c; sortState.direction = 'asc'; } applySort(); currentPage = 1; renderPage(); });
                searchInput.addEventListener('input', (e) => { filteredData = contacts.filter(c => c.push_name && c.push_name.toLowerCase().includes(e.target.value.toLowerCase())); applySort(); currentPage = 1; renderPage(); });
                prevPageBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderPage(); } });
                nextPageBtn.addEventListener('click', () => { const totalPages = Math.ceil(filteredData.length / recordsPerPage); if (currentPage < totalPages) { currentPage++; renderPage(); } });
                
                contactsTableBody.addEventListener('click', (e) => { if (e.target.closest('a, input[type="checkbox"]')) return; const row = e.target.closest('tr'); if (!row) return; const checkbox = row.querySelector('.contact-checkbox'); if (checkbox) checkbox.click(); });
                contactsTableBody.addEventListener('change', (e) => { if (e.target.classList.contains('contact-checkbox')) { const cb = e.target, id = cb.closest('tr').dataset.contactId; if (cb.checked) { if (selectedContactIds.size < MAX_SELECTIONS) selectedContactIds.add(id); else { cb.checked = false; alert(\`Limite de \${MAX_SELECTIONS} seleções atingido.\`); } } else { selectedContactIds.delete(id); } renderSelectedTable(); renderPage(); invalidateSummary(); } });
                selectAllCheckbox.addEventListener('change', (e) => { const isChecked = e.target.checked; const start = (currentPage - 1) * recordsPerPage, end = start + recordsPerPage; const pageData = filteredData.slice(start, end); const visibleIds = pageData.map(c => c.id.toString()); if (isChecked) { visibleIds.forEach(id => { if (selectedContactIds.size < MAX_SELECTIONS) selectedContactIds.add(id); }); } else { visibleIds.forEach(id => selectedContactIds.delete(id)); } renderSelectedTable(); renderPage(); invalidateSummary(); });
                
                maxCountSpan.textContent = MAX_SELECTIONS; applySort(); renderPage(); renderSelectedTable();
            })();

            // ===================================================================
            // MÓDULO DO CARD 2: CONFIGURAÇÃO DE MENSAGEM
            // ===================================================================
            (() => {
                const wrapper = document.getElementById('card2_wrapper');
                if (!wrapper) return;
                wrapper.innerHTML = \`<div class="config-col"><div class="config-section"><h3>1. Início da Conversa (Obrigatório)</h3><p class="validation-note">Saudações Iniciais (<span id="s1_count">0</span>/3+ selecionados)</p><div class="checkbox-group" id="saudacao1_group"><label><input type="checkbox" value="Oi"> Oi</label> <label><input type="checkbox" value="Olá"> Olá</label> <label><input type="checkbox" value="Opa"> Opa</label> <label><input type="checkbox" value="Oie"> Oie</label> <label><input type="checkbox" value="Beleza"> Beleza</label> <label><input type="checkbox" value="E aí"> E aí</label></div><hr style="border-color: var(--border-color); margin: 1rem 0;"><p class="validation-note">Complementos (<span id="s2_count">0</span>/3+ selecionados)</p><div class="checkbox-group" id="saudacao2_group"><label><input type="checkbox" value="tudo bem?"> tudo bem?</label> <label><input type="checkbox" value="tudo certo?"> tudo certo?</label> <label><input type="checkbox" value="tudo tranquilo?"> tudo tranquilo?</label> <label><input type="checkbox" value="como vai?"> como vai?</label></div></div><div class="config-section"><h3><label><input type="checkbox" id="includeCorpo"> 2. Corpo da Mensagem (Opcional)</label></h3><textarea id="corpoText" placeholder="Digite as variações do corpo da mensagem, uma por linha."></textarea><span id="corpoCounter" class="char-counter">0/100</span></div><div class="config-section"><h3><label><input type="checkbox" id="includeCTA"> 3. Chamada para Ação (Opcional)</label></h3><textarea id="ctaText" placeholder="Digite as variações da pergunta final, uma por linha."></textarea><span id="ctaCounter" class="char-counter">0/100</span><p id="ctaValidation" class="validation-note">Todas as linhas devem terminar com "?"</p></div></div><div class="preview-col"><div class="phone-preview"><label for="testNameInput" style="font-size: 0.9rem; margin-bottom: 0.25rem;">Nome de Exemplo:</label><input type="text" id="testNameInput" placeholder="Digite um nome: Maria..." value="Maria"><div class="chat-bubble" id="previewMessage"></div><div class="preview-spacer"></div><button id="generatePreviewBtn" class="btn">Gerar Nova Visualização</button></div></div>\`;
                const s1Group = document.getElementById('saudacao1_group'), s2Group = document.getElementById('saudacao2_group'), s1Count = document.getElementById('s1_count'), s2Count = document.getElementById('s2_count'), includeCorpo = document.getElementById('includeCorpo'), corpoText = document.getElementById('corpoText'), corpoCounter = document.getElementById('corpoCounter'), includeCTA = document.getElementById('includeCTA'), ctaText = document.getElementById('ctaText'), ctaCounter = document.getElementById('ctaCounter'), ctaValidation = document.getElementById('ctaValidation'), testNameInput = document.getElementById('testNameInput'), previewMessage = document.getElementById('previewMessage'), generatePreviewBtn = document.getElementById('generatePreviewBtn');
                function updatePreview() {
                    const s1Checked = Array.from(s1Group.querySelectorAll('input:checked')).map(cb => cb.value); const s2Checked = Array.from(s2Group.querySelectorAll('input:checked')).map(cb => cb.value);
                    const nome = toTitleCase(testNameInput.value.split(' ')[0] || "Pessoa");
                    if (s1Checked.length < 3 || s2Checked.length < 3) { previewMessage.innerHTML = "Selecione pelo menos 3 opções de cada grupo de saudação."; return; }
                    let saudacaoFinal = '', periodo = getPeriodoDia();
                    if (Math.random() < 0.5) { saudacaoFinal = \`\${escolherAleatorio(s1Checked)}, \${nome}, \${periodo}!\`; } else { saudacaoFinal = \`\${periodo.charAt(0).toUpperCase() + periodo.slice(1)}, \${nome}, \${escolherAleatorio(s2Checked)}\`; }
                    let corpoFinal = includeCorpo.checked && corpoText.value.trim() !== '' ? escolherAleatorio(corpoText.value.split('\\n').filter(l => l.trim() !== '')) : '';
                    let ctaFinal = includeCTA.checked && ctaText.value.trim() !== '' ? escolherAleatorio(ctaText.value.split('\\n').filter(l => l.trim() !== '')) : '';
                    previewMessage.innerHTML = [saudacaoFinal, corpoFinal, ctaFinal].filter(Boolean).join('<br>');
                }
                function setupValidation(group, countEl) { group.addEventListener('change', () => { const count = group.querySelectorAll('input:checked').length; countEl.textContent = count; group.previousElementSibling.classList.toggle('invalid', count < 3); }); }
                function setupTextarea(textarea, counterEl, validationEl = null, mustEndWith = null) { textarea.addEventListener('input', () => { const lines = textarea.value.split('\\n'); let allValid = true, longest = 0; lines.forEach(line => { if (line.length > longest) longest = line.length; if (mustEndWith && line.trim() !== '' && !line.trim().endsWith(mustEndWith)) allValid = false; }); counterEl.textContent = \`\${longest}/100\`; counterEl.classList.toggle('invalid', longest > 100); textarea.classList.toggle('invalid', longest > 100); if (validationEl) validationEl.classList.toggle('invalid', !allValid); }); }
                setupValidation(s1Group, s1Count); setupValidation(s2Group, s2Count);
                setupTextarea(corpoText, corpoCounter); setupTextarea(ctaText, ctaCounter, ctaValidation, '?');
                generatePreviewBtn.addEventListener('click', updatePreview);
                [testNameInput, s1Group, s2Group, includeCorpo, includeCTA, corpoText, ctaText].forEach(el => { el.addEventListener('input', updatePreview); el.addEventListener('change', updatePreview); });
                updatePreview();
            })();

            // ===================================================================
            // MÓDULO DO CARD 3: RESUMO E DISPARO
            // ===================================================================
            (() => {
                const wrapper = document.getElementById('card3_wrapper');
                if (!wrapper) return;
                wrapper.innerHTML = \`<div class="summary-header"><button id="regenerateSummaryBtn" class="btn btn-warning">Gerar Mensagens</button><button id="finalStartDispatchBtn" class="btn btn-primary" disabled>Iniciar Envio em Massa</button></div><h2 class="summary-title">Lista de Disparo</h2><div id="summaryAlertContainer"></div><div id="summaryTable" class="summary-table"></div>\`;
                
                const confirmationModal = document.getElementById('confirmationModal'), confirmDispatchBtn = document.getElementById('confirmDispatchBtn'), cancelDispatchBtn = document.getElementById('cancelDispatchBtn');
                const contacts = ${JSON.stringify(contacts)};
                const summaryTable = document.getElementById('summaryTable');
                const finalStartDispatchBtn = document.getElementById('finalStartDispatchBtn');
                const regenerateSummaryBtn = document.getElementById('regenerateSummaryBtn');
                const summaryAlertContainer = document.getElementById('summaryAlertContainer');
                const modalMessage = document.getElementById('modalMessage');
                const modalActions = document.getElementById('modalActions');

                function generateSummary() {
                    const contactsMap = new Map(contacts.map(c => [c.id.toString(), c]));
                    const s1Checked = Array.from(document.querySelectorAll('#saudacao1_group input:checked')).map(cb => cb.value);
                    const s2Checked = Array.from(document.querySelectorAll('#saudacao2_group input:checked')).map(cb => cb.value);
                    const includeCorpo = document.getElementById('includeCorpo').checked;
                    const corpoOptions = document.getElementById('corpoText').value.split('\\n').filter(l => l.trim() !== '');
                    const includeCTA = document.getElementById('includeCTA').checked;
                    const ctaOptions = document.getElementById('ctaText').value.split('\\n').filter(l => l.trim() !== '');

                    if (selectedContactIds.size === 0) { alert('Nenhum contato selecionado no Card 1.'); return; }
                    if (s1Checked.length < 3 || s2Checked.length < 3) { alert('Configuração de saudação inválida no Card 2. Verifique se marcou pelo menos 3 opções em cada grupo.'); return; }

                    summaryData = [];
                    selectedContactIds.forEach(id => {
                        const contact = contactsMap.get(id);
                        if(!contact) return;
                        
                        const nome = toTitleCase(contact.push_name.split(' ')[0]);
                        const periodo = getPeriodoDia();
                        let saudacaoFinal = (Math.random() < 0.5) ? \`\${escolherAleatorio(s1Checked)}, \${nome}, \${periodo}!\` : \`\${periodo.charAt(0).toUpperCase() + periodo.slice(1)}, \${nome}, \${escolherAleatorio(s2Checked)}\`;
                        let corpoFinal = includeCorpo && corpoOptions.length > 0 ? escolherAleatorio(corpoOptions) : '';
                        let ctaFinal = includeCTA && ctaOptions.length > 0 ? escolherAleatorio(ctaOptions) : '';
                        
                        summaryData.push({ id: contact.id, nome: contact.push_name, telefone: formatPhone(contact.remote_jid), mensagem: [saudacaoFinal, corpoFinal, ctaFinal].filter(Boolean).join('\\n') });
                    });
                    
                    summaryIsValid = true;
                    renderSummaryTable();
                }

                function renderSummaryTable() {
                    summaryTable.innerHTML = '';
                    summaryData.forEach((item, index) => {
                        const row = document.createElement('div');
                        row.className = 'summary-row ' + (index % 2 === 0 ? 'pair-even' : 'pair-odd');
                        row.dataset.index = index;
                        row.innerHTML = \`<div class="contact-info"><span class="count">\${index + 1}.</span>\${createWhatsAppButtonHTML(item.telefone)}<span>\${toTitleCase(item.nome)}</span></div><div class="contact-message"><input type="checkbox" class="edit-message-checkbox" title="Editar esta mensagem"><div class="message-content">\${item.mensagem.replace(/\\n/g, '<br>')}</div></div>\`;
                        summaryTable.appendChild(row);
                    });
                    summaryAlertContainer.innerHTML = '';
                    finalStartDispatchBtn.disabled = false;
                }
                
                summaryTable.addEventListener('change', (e) => {
                    if(e.target.classList.contains('edit-message-checkbox')) {
                        const row = e.target.closest('.summary-row'), contentDiv = row.querySelector('.message-content'), index = parseInt(row.dataset.index);
                        if(e.target.checked) {
                            const currentMessage = summaryData[index].mensagem;
                            contentDiv.innerHTML = \`<textarea style="width: 100%; min-height: 80px;" class="dynamic-textarea">\${currentMessage}</textarea>\`;
                            contentDiv.querySelector('.dynamic-textarea').focus();
                        } else {
                            const newText = contentDiv.querySelector('.dynamic-textarea').value;
                            summaryData[index].mensagem = newText;
                            contentDiv.innerHTML = newText.replace(/\\n/g, '<br>');
                        }
                    }
                });
                summaryTable.addEventListener('input', (e) => { if(e.target.classList.contains('dynamic-textarea')) { const row = e.target.closest('.summary-row'), index = parseInt(row.dataset.index); summaryData[index].mensagem = e.target.value; } });
                regenerateSummaryBtn.addEventListener('click', generateSummary);
                finalStartDispatchBtn.addEventListener('click', () => { modalMessage.textContent = \`Podemos começar o disparo para \${summaryData.length} contato(s)?\`; modalActions.style.display = 'flex'; confirmDispatchBtn.textContent = 'SIM'; confirmationModal.style.display = 'flex' });
                confirmDispatchBtn.addEventListener('click', async () => {
                    confirmDispatchBtn.disabled = true; confirmDispatchBtn.textContent = 'Enviando...'; modalMessage.textContent = 'Iniciando o disparo. Por favor, aguarde.';
                    try {
                        const response = await fetch('https://webhook.efetiva.tech/webhook/executa-disparo-massa-marcio', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(summaryData)
                        });
                        if (response.ok) { modalMessage.textContent = 'Disparo iniciado com sucesso!'; }
                        else { const errorData = await response.json().catch(() => ({ message: \`HTTP \${response.status}: \${response.statusText}\` })); modalMessage.textContent = \`Erro ao iniciar o disparo: \${errorData.message}\`; }
                    } catch (error) {
                        modalMessage.textContent = \`Erro de rede: \${error.message}\`;
                    } finally {
                        setTimeout(() => { confirmationModal.style.display = 'none'; confirmDispatchBtn.disabled = false; confirmDispatchBtn.textContent = 'SIM'; window.location.reload(); }, 3000);
                    }
                });
                cancelDispatchBtn.addEventListener('click', () => confirmationModal.style.display = 'none');
            })();
        });
    </script>
</body>
</html>
`;

// Etapa Final: Empacotar e retornar o arquivo para o n8n
const data = Buffer.from(html, 'utf-8');

return [{
  binary: {
    data: data,
    fileName: 'index.html',
    mimeType: 'text/html',
  }
}];