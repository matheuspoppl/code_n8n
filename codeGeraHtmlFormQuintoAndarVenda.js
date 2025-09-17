// Este script é específico para o fluxo de VENDA.
// Ele lê os dados do formulário e do web scraping (no formato misto),
// processa os anúncios e gera uma página de resultados interativa.
// VERSÃO AJUSTADA: Mantém a descrição completa dos anúncios da planilha.

// --- ETAPA 1: Ler os dados dos nós anteriores ---

const formBody = $('Webhook').first().json.body;
// Assumindo que os dados do scraping de VENDA estão no primeiro item, na propriedade 'anuncios'.$input.first().json.anuncios;
const scrapingResults = $input.first().json.data[0][0].anuncios;

// --- ETAPA 2: Processamento e Organização dos Dados de VENDA ---

// Esta função é o "tradutor" que transforma a string mista em dados limpos
function parseVendaAnuncios(anunciosString) {
    const anunciosIndividuais = anunciosString.split(/\n\n+/);
    const parsedList = [];

    for (const adFragment of anunciosIndividuais) {
        const trimmedFragment = adFragment.trim();
        if (!trimmedFragment) continue;

        let adObject = null;

        // Estratégia 1: Tentar parsear como JSON (QuintoAndar, Livima)
        if (trimmedFragment.startsWith('{') && trimmedFragment.endsWith('}')) {
            try {
                const parsedJson = JSON.parse(trimmedFragment);
                if (parsedJson.descrição && parsedJson.link) {
                    const valorMatch = parsedJson.descrição.match(/(?:R\$\s*)?([\d\.,]+)(?:,00)?\s*$/);
                    const valor = valorMatch ? parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
                    
                    adObject = {
                        descrição: parsedJson.descrição,
                        link: parsedJson.link,
                        valor: valor
                    };
                }
            } catch (e) { /* Ignora e tenta a próxima estratégia */ }
        }

        // Estratégia 2: Tentar parsear como texto (Planilha / Google Drive) - LÓGICA AJUSTADA
        if (!adObject) {
            const regexDrive = /(.+?)\s*-\s*link:\s*\[\s*(https?:\/\/.+?)\s*\]/i;
            const match = trimmedFragment.match(regexDrive);

            if (match) {
                const [_, fullDescription, link] = match;
                
                // Extrai o valor da descrição completa para a ordenação
                const valorMatch = fullDescription.match(/R\$\s*([\d\.]+)/);
                const valor = valorMatch ? parseFloat(valorMatch[1].replace(/\./g, '')) : 0;
                
                adObject = {
                    // Usa a descrição completa, como solicitado
                    descrição: fullDescription.trim(),
                    link: link.trim(),
                    valor: valor
                };
            }
        }
        
        if (adObject && adObject.valor > 0) {
            parsedList.push(adObject);
        }
    }
    return parsedList;
}

const processedResults = [];
const bairrosPesquisados = Array.isArray(formBody['bairros[]']) ? formBody['bairros[]'] : [formBody['bairros[]']];

scrapingResults.forEach((bairroString, index) => {
    const parsedAds = parseVendaAnuncios(bairroString);
    if (parsedAds.length === 0) return;

    const sortedAds = parsedAds.sort((a, b) => b.valor - a.valor);
    const nomeBairro = bairrosPesquisados[index] || "Resultados";
    
    processedResults.push({
        bairro: nomeBairro,
        anuncios: sortedAds
    });
});


// --- ETAPA 3: Montagem Dinâmica do HTML (Idêntica à versão anterior) ---

function createSummaryCard(data) {
    let summaryHTML = `<div class="summary-card"><h2>Resumo da Sua Busca</h2><div class="summary-grid">`;
    summaryHTML += `<div><strong>Finalidade:</strong> ${data.finalidade || 'N/A'}</div>`;
    summaryHTML += `<div><strong>Bairros:</strong> ${bairrosPesquisados.join(', ') || 'N/A'}</div>`;
    summaryHTML += `<div><strong>Valor:</strong> ${data.valor_min || 'N/A'} a ${data.valor_max || 'N/A'}</div>`;
    summaryHTML += `<div><strong>Quartos:</strong> ${data.quartos_min} a ${data.quartos_max}</div>`;
    summaryHTML += `<div><strong>Vagas:</strong> ${data.vagas_min} a ${data.vagas_max}</div>`;
    summaryHTML += `<div><strong>Aceita Pet:</strong> ${data.pet || 'N/A'}</div>`;
    summaryHTML += `<div><strong>Mobiliado:</strong> ${data.mobilia || 'N/A'}</div>`;
    summaryHTML += `</div></div>`;
    return summaryHTML;
}

let resultsHTML = '';
if (processedResults.length > 0) {
    processedResults.forEach(group => {
        resultsHTML += `<section class="results-section"><h2>Resultados para ${group.bairro}</h2>`;
        group.anuncios.forEach(ad => {
            const cleanDescription = ad.descrição.replace(/"/g, '&quot;');
            resultsHTML += `
                <div class="ad-card">
                    <div class="ad-content">
                        <p>${ad.descrição}</p>
                        <a href="${ad.link}" target="_blank">Ver anúncio no site</a>
                    </div>
                    <div class="ad-selector">
                        <input type="checkbox" class="ad-checkbox" 
                               data-description="${cleanDescription}" 
                               data-link="${ad.link}">
                    </div>
                </div>
            `;
        });
        resultsHTML += `</section>`;
    });
} else {
    resultsHTML = '<p class="no-results">Nenhum imóvel encontrado com os critérios informados.</p>';
}

// --- ETAPA 4: Geração do HTML Completo ---

const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resultados da Busca de Imóveis</title>
    <style>
        :root {
            --primary-color: #003366; --light-gray: #f4f4f9; --medium-gray: #e0e0e0;
            --dark-gray: #555; --text-color: #333; --border-radius: 8px; --success-color: #28a745;
        }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: var(--light-gray); margin: 0; padding: 20px; color: var(--text-color); }
        .container { max-width: 900px; margin: 0 auto; }
        .summary-card { background-color: #fff; padding: 20px; border-radius: var(--border-radius); box-shadow: 0 2px 10px rgba(0,0,0,0.08); margin-bottom: 25px; }
        .summary-card h2 { margin-top: 0; color: var(--primary-color); border-bottom: 2px solid var(--light-gray); padding-bottom: 10px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px; }
        .summary-grid div { background-color: var(--light-gray); padding: 8px; border-radius: 4px; font-size: 0.9em; }
        .selection-bar {
            position: sticky; top: 0; background-color: rgba(255, 255, 255, 0.95); padding: 15px;
            border-radius: var(--border-radius); box-shadow: 0 4px 15px rgba(0,0,0,0.1); z-index: 100;
            display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 25px;
            backdrop-filter: blur(5px);
        }
        .selection-info p { margin: 0; font-weight: 600; }
        #selection-counter { font-size: 1.2em; color: var(--primary-color); }
        .send-button { background-color: var(--success-color); color: #fff; border: none; padding: 12px 20px; border-radius: var(--border-radius); font-size: 1em; font-weight: bold; cursor: pointer; transition: background-color 0.3s; }
        .send-button:disabled { background-color: var(--medium-gray); cursor: not-allowed; }
        .results-section h2 { color: var(--primary-color); }
        .ad-card { display: flex; background-color: #fff; margin-bottom: 15px; border-radius: var(--border-radius); box-shadow: 0 2px 5px rgba(0,0,0,0.05); overflow: hidden; }
        .ad-content { padding: 15px; flex-grow: 1; }
        .ad-content p { margin: 0 0 10px 0; line-height: 1.5; white-space: pre-wrap; }
        .ad-content a { color: var(--primary-color); text-decoration: none; font-weight: 600; }
        .ad-selector { display: flex; align-items: center; justify-content: center; background-color: var(--light-gray); padding: 20px; }
        input[type="checkbox"] { transform: scale(1.5); cursor: pointer; }
        .no-results { text-align: center; font-size: 1.2em; padding: 40px; background-color: #fff; border-radius: var(--border-radius); }
    </style>
</head>
<body>
    <div class="container">
        ${createSummaryCard(formBody)}
        
        <div class="selection-bar">
            <div class="selection-info">
                <p>Escolha até 10 anúncios</p>
                <span id="selection-counter">0 anúncios selecionados</span>
            </div>
            <button class="send-button" id="send-whatsapp-button" disabled>Enviar Anúncios para o Cliente</button>
        </div>

        ${resultsHTML}
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const checkboxes = document.querySelectorAll('.ad-checkbox');
            const counter = document.getElementById('selection-counter');
            const sendButton = document.getElementById('send-whatsapp-button');
            const clientPhoneNumber = "${formBody.whatsapp || ''}";
            const MAX_SELECTION = 10;

            function updateSelection() {
                const selectedCheckboxes = Array.from(checkboxes).filter(cb => cb.checked);
                const selectedCount = selectedCheckboxes.length;
                counter.textContent = \`\${selectedCount} anúncio\${selectedCount !== 1 ? 's' : ''} selecionado\${selectedCount !== 1 ? 's' : ''}\`;
                sendButton.disabled = selectedCount === 0;
                if (selectedCount >= MAX_SELECTION) {
                    checkboxes.forEach(cb => { if (!cb.checked) cb.disabled = true; });
                } else {
                    checkboxes.forEach(cb => cb.disabled = false);
                }
            }

            checkboxes.forEach(cb => cb.addEventListener('change', updateSelection));

            sendButton.addEventListener('click', function() {
                if (!clientPhoneNumber) { alert('Número de WhatsApp do cliente não encontrado.'); return; }
                let message = "Olá! Encontrei estas ótimas opções de imóveis para você, o que acha?\\n\\n";
                const selectedCheckboxes = Array.from(checkboxes).filter(cb => cb.checked);
                selectedCheckboxes.forEach((cb, index) => {
                    const description = cb.dataset.description;
                    const link = cb.dataset.link;
                    const cleanDesc = description.replace(/\\n/g, ' ').replace(/\\s+/g, ' ').trim();
                    message += \`Anúncio \${index + 1}: \${cleanDesc}\\n\`;
                    message += \`\${link}\\n\\n\`;
                });
                const whatsappUrl = \`https://wa.me/55\${clientPhoneNumber}?text=\${encodeURIComponent(message)}\`;
                window.open(whatsappUrl, '_blank');
            });
            updateSelection();
        });
    </script>
</body>
</html>
`;

// --- ETAPA 5: Preparação da Saída para o n8n ---

const binaryData = await this.helpers.prepareBinaryData(Buffer.from(html), 'results.html', 'text/html');

return [{
  json: {},
  binary: {
    data: binaryData
  }
}];