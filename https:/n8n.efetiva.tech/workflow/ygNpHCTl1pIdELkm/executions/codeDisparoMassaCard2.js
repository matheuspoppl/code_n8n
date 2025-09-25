// ====================================================================================
// CÓDIGO PARA O NÓ "CODE" DO N8N - GERADOR DE INTERFACE (v5 - Card 2 Implementado)
// Autor: Gemini
// Descrição: Versão completa com os dois cards funcionais.
//            - Card 1: Seleção de Contatos.
//            - Card 2: Configuração e visualização de mensagem única e randômica.
// ====================================================================================

const contacts = $input.all().map(item => item.json);

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
            --header-bg-color: #333; --header-highlight-bg-color: #556B2F; --row-odd-color: transparent;
            --row-even-color: rgba(0, 0, 0, 0.15); --row-selected-color: rgba(40, 167, 69, 0.3);
            --border-color: #444; --text-color: #f0f0f0; --text-muted-color: #aaa;
            --primary-color: #28a745; --primary-hover-color: #218838; --invalid-color: #dc3545;
            --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        /* --- ESTILOS GERAIS E DO CARD 1 (Resumidos) --- */
        body { background-color: var(--bg-color); color: var(--text-color); font-family: var(--font-family); margin: 0; padding: 1rem; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; font-weight: 500; }
        h2 { margin: 0; padding: 0.75rem 1rem; background-color: var(--header-highlight-bg-color); font-size: 1rem; border-radius: 6px 6px 0 0; font-weight: bold; text-transform: uppercase; }
        details { background-color: var(--card-bg-color); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem; overflow: hidden; }
        summary { font-size: 1.2rem; font-weight: bold; padding: 1rem; cursor: pointer; user-select: none; }
        summary::marker { color: var(--primary-color); }
        .content-wrapper { padding: 1rem; background-color: var(--card-content-bg-color); display: flex; flex-direction: column; gap: 1.5rem; }
        @media (min-width: 992px) { .content-wrapper { flex-direction: row; } .contacts-table-container, .config-col { flex: 3; } .selected-contacts-container, .preview-col { flex: 2; } }
        .table-scroll-wrapper { overflow: auto; max-height: 60vh; border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 6px 6px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 0.8rem 0.5rem; text-align: left; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
        thead { background-color: var(--header-bg-color); position: sticky; top: 0; z-index: 1; }
        tbody tr { cursor: pointer; }
        tbody tr.selected-row { background-color: var(--row-selected-color); }
        #searchInput { width: 100%; padding: 0.75rem; margin-bottom: 1rem; background-color: var(--header-bg-color); border: 1px solid var(--border-color); border-radius: 5px; color: var(--text-color); font-size: 1rem; box-sizing: border-box; }
        .action-btn { background-color: var(--primary-color); color: white; border: none; border-radius: 5px; padding: 0.4rem 0.6rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; }
        .action-btn svg { width: 16px; height: 16px; }
        input[type="checkbox"] { transform: scale(1.5); cursor: pointer; }

        /* --- NOVOS ESTILOS PARA O CARD 2 --- */
        .config-section { margin-bottom: 1.5rem; }
        .config-section h3 { margin-top: 0; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; font-size: 1.1rem; }
        .checkbox-group { display: flex; flex-wrap: wrap; gap: 1rem; }
        .checkbox-group label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
        .validation-note { font-size: 0.8rem; color: var(--text-muted-color); margin-top: 0.5rem; }
        .validation-note.invalid { color: var(--invalid-color); font-weight: bold; }
        textarea { width: 100%; min-height: 100px; background-color: var(--header-bg-color); border: 1px solid var(--border-color); border-radius: 5px; color: var(--text-color); font-size: 0.95rem; padding: 0.5rem; box-sizing: border-box; resize: vertical; }
        textarea.invalid { border-color: var(--invalid-color); }
        .char-counter { display: block; text-align: right; font-size: 0.8rem; color: var(--text-muted-color); margin-top: 0.25rem; }
        .char-counter.invalid { color: var(--invalid-color); font-weight: bold; }
        
        .phone-preview { background-color: var(--bg-color); border-radius: 20px; padding: 1.5rem 1rem; border: 3px solid #555; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 1rem; }
        .phone-preview input { width: 100%; box-sizing: border-box; }
        .chat-bubble { background-color: var(--primary-color); color: white; padding: 0.75rem 1rem; border-radius: 15px 15px 0 15px; align-self: flex-end; max-width: 90%; word-wrap: break-word; line-height: 1.4; min-height: 40px; }
        .btn { padding: 0.75rem 1rem; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; background-color: var(--primary-hover-color); color: white; width: 100%; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Configuração de Disparo</h1>
        
        <details>
            <summary>1. SELEÇÃO DE CONTATOS</summary>
            </details>
        
        <details open>
            <summary>2. CONFIGURAÇÃO DA MENSAGEM</summary>
            <div class="content-wrapper">
                
                <div class="config-col">
                    <div class="config-section">
                        <h3>1. Início da Conversa (Obrigatório)</h3>
                        <p class="validation-note">Saudações Iniciais (<span id="s1_count">0</span>/3+ selecionados)</p>
                        <div class="checkbox-group" id="saudacao1_group">
                            <label><input type="checkbox" value="Oi"> Oi</label>
                            <label><input type="checkbox" value="Olá"> Olá</label>
                            <label><input type="checkbox" value="Opa"> Opa</label>
                            <label><input type="checkbox" value="Oie"> Oie</label>
                            <label><input type="checkbox" value="Beleza"> Beleza</label>
                            <label><input type="checkbox" value="E aí"> E aí</label>
                        </div>
                        <hr style="border-color: var(--border-color); margin: 1rem 0;">
                        <p class="validation-note">Complementos (<span id="s2_count">0</span>/3+ selecionados)</p>
                        <div class="checkbox-group" id="saudacao2_group">
                           <label><input type="checkbox" value="tudo bem?"> tudo bem?</label>
                           <label><input type="checkbox" value="tudo certo?"> tudo certo?</label>
                           <label><input type="checkbox" value="tudo tranquilo?"> tudo tranquilo?</label>
                           <label><input type="checkbox" value="como vai?"> como vai?</label>
                        </div>
                    </div>

                    <div class="config-section">
                        <h3><label><input type="checkbox" id="includeCorpo"> 2. Corpo da Mensagem (Opcional)</label></h3>
                        <textarea id="corpoText" placeholder="Digite as variações do corpo da mensagem, uma por linha.&#10;Ex: Vi que você se interessou pelo nosso serviço..."></textarea>
                        <span id="corpoCounter" class="char-counter">0/100</span>
                    </div>

                    <div class="config-section">
                        <h3><label><input type="checkbox" id="includeCTA"> 3. Chamada para Ação (Opcional)</label></h3>
                        <textarea id="ctaText" placeholder="Digite as variações da pergunta final, uma por linha.&#10;Ex: Isso te interessa?"></textarea>
                        <span id="ctaCounter" class="char-counter">0/100</span>
                        <p id="ctaValidation" class="validation-note">Todas as linhas devem terminar com "?"</p>
                    </div>
                </div>

                <div class="preview-col">
                    <div class="phone-preview">
                        <input type="text" id="testNameInput" placeholder="Nome para Teste" value="Maria">
                        <div class="chat-bubble" id="previewMessage">
                            Clique em "Gerar Visualização" para começar.
                        </div>
                        <button id="generatePreviewBtn" class="btn">Gerar Nova Visualização</button>
                    </div>
                </div>

            </div>
        </details>
    </div>

    <script>
        // O código do Card 1 (seleção de contatos) iria aqui...
    </script>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            // --- INÍCIO DA LÓGICA DO CARD 2 ---

            // --- Referências do DOM ---
            const s1Group = document.getElementById('saudacao1_group');
            const s2Group = document.getElementById('saudacao2_group');
            const s1Count = document.getElementById('s1_count');
            const s2Count = document.getElementById('s2_count');
            
            const includeCorpo = document.getElementById('includeCorpo');
            const corpoText = document.getElementById('corpoText');
            const corpoCounter = document.getElementById('corpoCounter');

            const includeCTA = document.getElementById('includeCTA');
            const ctaText = document.getElementById('ctaText');
            const ctaCounter = document.getElementById('ctaCounter');
            const ctaValidation = document.getElementById('ctaValidation');

            const testNameInput = document.getElementById('testNameInput');
            const previewMessage = document.getElementById('previewMessage');
            const generatePreviewBtn = document.getElementById('generatePreviewBtn');

            // --- Funções Auxiliares ---
            const getPeriodoDia = () => {
                const agora = new Date();
                const opcoesHora = { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false };
                const horaNoBrasil = parseInt(agora.toLocaleString('en-US', opcoesHora));
                if (horaNoBrasil >= 5 && horaNoBrasil < 12) return 'bom dia';
                if (horaNoBrasil >= 12 && horaNoBrasil < 18) return 'boa tarde';
                return 'boa noite';
            };

            const escolherAleatorio = (lista) => lista.length > 0 ? lista[Math.floor(Math.random() * lista.length)] : '';

            // --- Função Principal de Atualização da Prévia ---
            function updatePreview() {
                // 1. Coletar e validar Saudações
                const s1Checked = Array.from(s1Group.querySelectorAll('input:checked')).map(cb => cb.value);
                const s2Checked = Array.from(s2Group.querySelectorAll('input:checked')).map(cb => cb.value);
                const nome = testNameInput.value.split(' ')[0] || "Pessoa"; // Pega só o primeiro nome

                if (s1Checked.length < 3 || s2Checked.length < 3) {
                    previewMessage.textContent = "Por favor, selecione pelo menos 3 opções de cada grupo de saudação.";
                    return;
                }

                // 2. Montar Saudação Aleatória
                let saudacaoFinal = '';
                const periodo = getPeriodoDia();
                if (Math.random() < 0.5) { // Formato 1
                    saudacaoFinal = \`\${escolherAleatorio(s1Checked)}, \${nome}, \${periodo}!\`;
                } else { // Formato 2
                    saudacaoFinal = \`\${periodo.charAt(0).toUpperCase() + periodo.slice(1)}, \${nome}, \${escolherAleatorio(s2Checked)}\`;
                }

                // 3. Coletar Corpo (se incluído)
                let corpoFinal = '';
                if (includeCorpo.checked && corpoText.value.trim() !== '') {
                    const corpoOptions = corpoText.value.split('\\n').filter(line => line.trim() !== '');
                    corpoFinal = escolherAleatorio(corpoOptions);
                }

                // 4. Coletar CTA (se incluído)
                let ctaFinal = '';
                if (includeCTA.checked && ctaText.value.trim() !== '') {
                    const ctaOptions = ctaText.value.split('\\n').filter(line => line.trim() !== '');
                    ctaFinal = escolherAleatorio(ctaOptions);
                }

                // 5. Montar Mensagem Final e Exibir
                const mensagemCompleta = [saudacaoFinal, corpoFinal, ctaFinal].filter(Boolean).join(' ');
                previewMessage.textContent = mensagemCompleta;
            }

            // --- Validações e Contadores em Tempo Real ---
            function setupValidation(group, countEl) {
                const noteEl = group.previousElementSibling;
                group.addEventListener('change', () => {
                    const count = group.querySelectorAll('input:checked').length;
                    countEl.textContent = count;
                    if (count < 3) {
                        noteEl.classList.add('invalid');
                    } else {
                        noteEl.classList.remove('invalid');
                    }
                });
            }
            setupValidation(s1Group, s1Count);
            setupValidation(s2Group, s2Count);

            function setupTextarea(textarea, counterEl, validationEl = null, mustEndWith = null) {
                textarea.addEventListener('input', () => {
                    const lines = textarea.value.split('\\n');
                    let allLinesValid = true;
                    let longestLine = 0;
                    
                    lines.forEach(line => {
                        if (line.length > longestLine) longestLine = line.length;
                        if (mustEndWith && line.trim() !== '' && !line.trim().endsWith(mustEndWith)) {
                            allLinesValid = false;
                        }
                    });

                    counterEl.textContent = \`\${longestLine}/100\`;
                    counterEl.classList.toggle('invalid', longestLine > 100);
                    textarea.classList.toggle('invalid', longestLine > 100);

                    if (validationEl) {
                        validationEl.classList.toggle('invalid', !allLinesValid);
                    }
                });
            }
            setupTextarea(corpoText, corpoCounter);
            setupTextarea(ctaText, ctaCounter, ctaValidation, '?');
            
            // --- Event Listeners para Atualização Automática ---
            generatePreviewBtn.addEventListener('click', updatePreview);
            testNameInput.addEventListener('input', updatePreview);
            [s1Group, s2Group, includeCorpo, includeCTA, corpoText, ctaText].forEach(el => {
                el.addEventListener('input', updatePreview); // 'input' é melhor para textareas
                el.addEventListener('change', updatePreview); // 'change' é melhor para checkboxes
            });

            // Inicializar a prévia
            updatePreview();
        });
    </script>
</body>
</html>
`;

// Lógica final para empacotar e retornar o arquivo para o n8n
const data = Buffer.from(html, 'utf-8');

return [{
  binary: {
    data: data,
    fileName: 'index.html',
    mimeType: 'text/html',
  }
}];