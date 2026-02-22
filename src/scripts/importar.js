// ===== FluxoConta - IMPORTAR SCRIPT =====

const STORAGE_KEYS = {
    TRANSACTIONS: 'finance_transactions',
    CATEGORIES: 'finance_categories',
    IMPORT_HISTORY: 'finance_import_history'
};

let transactions = [];
let categories = [];
let importHistory = [];
let currentFileData = null;
let currentFileName = '';

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se as bibliotecas foram carregadas
    checkLibraries();
    loadData();
    setupEventListeners();
    updateHistoryList();
});

function checkLibraries() {
    // Verificar PapaParse
    if (typeof Papa === 'undefined' && typeof PapaParse === 'undefined') {
        console.error('PapaParse não carregado. A importação CSV não funcionará.');
        showToast('Erro', 'Biblioteca de CSV não carregada. Recarregue a página.', 'error');
        
        // Desabilitar upload se a biblioteca não carregou
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.style.opacity = '0.5';
            uploadArea.style.pointerEvents = 'none';
            uploadArea.title = 'Biblioteca não carregada. Recarregue a página.';
        }
    }
    
    // Verificar SheetJS
    if (typeof XLSX === 'undefined') {
        console.error('SheetJS não carregado. A importação Excel/ODS não funcionará.');
        showToast('Erro', 'Biblioteca de Excel não carregada. Recarregue a página.', 'error');
    }
}

function loadData() {
    transactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
    categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || [];
    importHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.IMPORT_HISTORY)) || [];
}

function setupEventListeners() {
    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }
    
    // Upload area
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    
    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
    }
    
    if (selectFileBtn) {
        selectFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Preview actions
    const clearPreviewBtn = document.getElementById('clearPreviewBtn');
    const cancelImportBtn = document.getElementById('cancelImportBtn');
    const confirmImportBtn = document.getElementById('confirmImportBtn');
    
    if (clearPreviewBtn) clearPreviewBtn.addEventListener('click', clearPreview);
    if (cancelImportBtn) cancelImportBtn.addEventListener('click', clearPreview);
    if (confirmImportBtn) confirmImportBtn.addEventListener('click', confirmImport);
    
    // Template download - IMPORTANTE: verificar ambos os botões
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    if (downloadTemplateBtn) {
        console.log('Botão de template encontrado, adicionando evento');
        downloadTemplateBtn.addEventListener('click', downloadTemplate);
    } else {
        console.error('Botão de template NÃO encontrado!');
    }
    
    // History
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearHistory);
    }
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

// ===== FUNÇÕES DE UPLOAD =====

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('uploadArea').classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('uploadArea').classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

// ===== PROCESSAMENTO DE ARQUIVOS =====

function processFile(file) {
    const fileName = file.name;
    const fileExt = fileName.split('.').pop().toLowerCase();
    
    // Validar extensão
    const validExtensions = ['csv', 'xlsx', 'xls', 'ods'];
    if (!validExtensions.includes(fileExt)) {
        showToast('Erro', 'Formato de arquivo não suportado', 'error');
        return;
    }
    
    showToast('Processando', `Lendo arquivo: ${fileName}`, 'info');
    currentFileName = fileName;
    
    // Mostrar modal de progresso
    const progressModal = document.getElementById('progressModal');
    document.getElementById('importProgressFill').style.width = '0%';
    document.getElementById('importProgressText').textContent = 'Analisando arquivo...';
    document.getElementById('importStatus').innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Lendo arquivo...</p>';
    progressModal.classList.add('active');
    
    // Ler arquivo
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            let data;
            
            if (fileExt === 'csv') {
                // Verificar se PapaParse está disponível
                if (typeof Papa === 'undefined' && typeof PapaParse === 'undefined') {
                    throw new Error('Biblioteca PapaParse não está disponível');
                }
                
                // Usar PapaParse (pode estar em Papa ou PapaParse)
                const PapaLib = typeof Papa !== 'undefined' ? Papa : PapaParse;
                
                // Processar CSV
                const result = PapaLib.parse(e.target.result, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: (h) => {
                        // Remover BOM, espaços e converter para minúsculas
                        return h ? h.replace(/^\uFEFF/, '').trim().toLowerCase() : '';
                    },
                    transform: (value) => {
                        // Remover espaços extras e BOM de valores
                        return value ? value.toString().replace(/^\uFEFF/, '').trim() : '';
                    }
                });
                
                if (result.errors && result.errors.length > 0) {
                    console.warn('Erros no CSV:', result.errors);
                    if (result.errors.some(e => e.type !== 'FieldMismatch')) {
                        showToast('Aviso', 'Alguns erros foram encontrados no CSV', 'warning');
                    }
                }
                
                data = result.data.filter(row => {
                    // Filtrar linhas completamente vazias
                    return row && Object.values(row).some(val => val && val.toString().trim() !== '');
                });
                
            } else {
                // Verificar se SheetJS está disponível
                if (typeof XLSX === 'undefined') {
                    throw new Error('Biblioteca SheetJS não está disponível');
                }
                
                // Processar Excel/ODS com SheetJS
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const firstSheet = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheet];
                
                // Converter para JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                    header: 1,
                    defval: '' 
                });
                
                if (jsonData.length < 2) {
                    throw new Error('Arquivo muito curto ou vazio');
                }
                
                // Pegar cabeçalhos (primeira linha)
                const headers = jsonData[0].map(h => 
                    h ? h.toString().toLowerCase().trim() : ''
                ).filter(h => h !== '');
                
                // Converter para array de objetos
                data = jsonData.slice(1).map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        if (header) {
                            obj[header] = row[index] ? row[index].toString().trim() : '';
                        }
                    });
                    return obj;
                }).filter(row => Object.values(row).some(v => v && v.toString().trim() !== ''));
            }
            
            // Validar se temos dados
            if (!data || data.length === 0) {
                throw new Error('Nenhum dado encontrado no arquivo');
            }
            
            // Log para debug
            console.log('Dados processados:', data.slice(0, 3));
            
            // Validar e processar dados
            const processedData = validateAndProcessData(data);
            
            if (processedData.valid.length === 0) {
                showToast('Erro', 'Nenhuma transação válida encontrada', 'error');
                progressModal.classList.remove('active');
                return;
            }
            
            currentFileData = processedData;
            showPreview(processedData);
            
            // Fechar modal de progresso
            progressModal.classList.remove('active');
            
        } catch (error) {
            console.error('Erro detalhado ao processar arquivo:', error);
            progressModal.classList.remove('active');
            showToast('Erro', `Falha ao processar arquivo: ${error.message}`, 'error');
        }
    };
    
    reader.onerror = (error) => {
        console.error('Erro ao ler arquivo:', error);
        progressModal.classList.remove('active');
        showToast('Erro', 'Falha ao ler o arquivo', 'error');
    };
    
    if (fileExt === 'csv') {
        reader.readAsText(file, 'UTF-8');
    } else {
        reader.readAsBinaryString(file);
    }
}

function validateAndProcessData(data) {
    const valid = [];
    const invalid = [];
    const categoriesToCreate = new Set();
    
    // Mapeamento de campos esperados
    const fieldMap = {
        data: ['data', 'date', 'dt'],
        descricao: ['descricao', 'description', 'desc', 'historico', 'histórico'],
        categoria: ['categoria', 'category', 'cat'],
        tipo: ['tipo', 'type', 'tp'],
        valor: ['valor', 'value', 'amount', 'val', 'preço', 'preco'],
        cartao: ['cartao', 'card', 'cartão', 'bandeira'],
        parcelas: ['parcelas', 'installments', 'parcela', 'installment', 'parc']
    };
    
    data.forEach((row, index) => {
        try {
            // Encontrar campos
            const dateField = findField(row, fieldMap.data);
            const descField = findField(row, fieldMap.descricao);
            const catField = findField(row, fieldMap.categoria);
            const typeField = findField(row, fieldMap.tipo);
            const amountField = findField(row, fieldMap.valor);
            const cardField = findField(row, fieldMap.cartao);
            const installField = findField(row, fieldMap.parcelas);
            
            // Validar campos obrigatórios
            if (!dateField || !descField || !amountField) {
                invalid.push({ row: index + 2, reason: 'Campos obrigatórios faltando' });
                return;
            }
            
            // Processar data
            let date = parseDate(row[dateField]);
            if (!date) {
                invalid.push({ row: index + 2, reason: 'Data inválida' });
                return;
            }
            
            // Processar valor
            let amount = parseAmount(row[amountField]);
            if (isNaN(amount) || amount <= 0) {
                invalid.push({ row: index + 2, reason: 'Valor inválido' });
                return;
            }
            
            // Determinar tipo
            let type = 'expense';
            if (typeField) {
                const typeValue = String(row[typeField]).toLowerCase().trim();
                if (typeValue.includes('entrada') || typeValue.includes('receita') || typeValue === 'income') {
                    type = 'income';
                } else if (typeValue.includes('cartao') || typeValue.includes('crédito') || typeValue === 'credit') {
                    type = 'credit';
                }
            }
            
            // Processar categoria
            let category = 'Sem categoria';
            if (catField && row[catField]) {
                category = String(row[catField]).trim();
                // Verificar se categoria existe
                const categoryExists = categories.some(c => c.nome.toLowerCase() === category.toLowerCase());
                if (!categoryExists) {
                    categoriesToCreate.add(category);
                }
            }
            
            // Processar cartão (apenas para crédito)
            let card = null;
            if (type === 'credit' && cardField && row[cardField]) {
                card = String(row[cardField]).trim();
            }
            
            // Processar parcelas
            let installment = null;
            let totalInstallments = null;
            if (installField && row[installField]) {
                const installStr = String(row[installField]).trim();
                const match = installStr.match(/(\d+)(?:\D+(\d+))?/);
                if (match) {
                    installment = parseInt(match[1]) || 1;
                    totalInstallments = parseInt(match[2]) || installment;
                }
            }
            
            // Criar transação
            const transaction = {
                id: Date.now() + Math.random() * 1000 + index,
                type: type,
                date: formatDateISO(date),
                description: String(row[descField]).trim(),
                category: category,
                amount: amount,
                card: card,
                installment: installment,
                totalInstallments: totalInstallments
            };
            
            valid.push(transaction);
            
        } catch (error) {
            console.error('Erro ao processar linha:', error);
            invalid.push({ row: index + 2, reason: 'Erro de processamento' });
        }
    });
    
    return {
        valid,
        invalid,
        categoriesToCreate: Array.from(categoriesToCreate),
        stats: calculateStats(valid)
    };
}

function findField(row, possibleNames) {
    for (const name of possibleNames) {
        if (row.hasOwnProperty(name)) {
            return name;
        }
    }
    return null;
}

function parseDate(value) {
    if (!value) return null;
    
    const str = String(value).trim();
    
    // Formato ISO (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return new Date(str);
    }
    
    // Formato BR (DD/MM/YYYY)
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const [day, month, year] = str.split('/');
        return new Date(year, month - 1, day);
    }
    
    // Formato BR com traço (DD-MM-YYYY)
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        const [day, month, year] = str.split('-');
        return new Date(year, month - 1, day);
    }
    
    // Tentar parsing automático
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
        return date;
    }
    
    return null;
}

function parseAmount(value) {
    if (!value) return NaN;
    
    const str = String(value).trim();
    
    // Remover símbolos de moeda e espaços
    let cleanStr = str.replace(/[R$\s]/g, '');
    
    // Substituir vírgula por ponto (formato BR)
    cleanStr = cleanStr.replace(',', '.');
    
    // Remover pontos de milhar
    cleanStr = cleanStr.replace(/\.(?=.*\.)/g, '');
    
    return parseFloat(cleanStr);
}

function calculateStats(transactions) {
    if (!transactions || transactions.length === 0) {
        return { income: 0, expense: 0, credit: 0 };
    }
    
    return transactions.reduce((acc, t) => {
        if (t.type === 'income') acc.income += t.amount;
        else if (t.type === 'expense') acc.expense += t.amount;
        else if (t.type === 'credit') acc.credit += t.amount;
        return acc;
    }, { income: 0, expense: 0, credit: 0 });
}

// ===== FUNÇÕES DE PREVIEW =====

function showPreview(data) {
    document.getElementById('previewCard').style.display = 'block';
    document.getElementById('fileInfo').textContent = `${currentFileName} - ${data.valid.length} transações`;
    
    // Log para debug
    console.log('Dados para preview:', data);
    console.log('Transações válidas:', data.valid.length);
    console.log('Stats calculados:', data.stats);
    
    // Atualizar estatísticas
    document.getElementById('totalRows').textContent = data.valid.length;
    document.getElementById('previewIncome').textContent = formatCurrency(data.stats.income);
    document.getElementById('previewExpense').textContent = formatCurrency(data.stats.expense);
    document.getElementById('previewCredit').textContent = formatCurrency(data.stats.credit);
    
    // Atualizar tabela
    const tbody = document.getElementById('previewList');
    
    if (data.valid.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhuma transação válida</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.valid.slice(0, 10).map(t => {
        // Garantir que a transação tem todos os campos
        return `
            <tr>
                <td>${formatDate(t.date)}</td>
                <td title="${t.description || ''}">${truncateText(t.description || '', 30)}</td>
                <td>
                    <span class="category-badge" style="background-color: ${getCategoryColor(t.category)}20; color: ${getCategoryColor(t.category)}">
                        ${getCategoryIcon(t.category)} ${t.category || 'Sem categoria'}
                    </span>
                </td>
                <td><span class="badge badge-${t.type}">${getTypeLabel(t.type)}</span></td>
                <td class="transaction-amount amount-${t.type}">${formatCurrency(t.amount || 0)}</td>
                <td>${t.card || '-'}</td>
                <td>${t.installment ? `${t.installment}/${t.totalInstallments}` : '-'}</td>
            </tr>
        `;
    }).join('');
    
    if (data.valid.length > 10) {
        tbody.innerHTML += `
            <tr>
                <td colspan="7" class="text-center" style="color: var(--gray);">
                    <i class="fas fa-ellipsis-h"></i> 
                    e mais ${data.valid.length - 10} transações
                </td>
            </tr>
        `;
    }
    
    // Mostrar aviso de categorias a criar
    if (data.categoriesToCreate && data.categoriesToCreate.length > 0) {
        showToast('Info', `${data.categoriesToCreate.length} categorias serão criadas`, 'info');
    }
    
    // Mostrar aviso de linhas inválidas
    if (data.invalid && data.invalid.length > 0) {
        console.warn('Linhas inválidas:', data.invalid);
        showToast('Aviso', `${data.invalid.length} linhas ignoradas`, 'warning');
    }
}

function clearPreview() {
    document.getElementById('previewCard').style.display = 'none';
    document.getElementById('fileInput').value = '';
    currentFileData = null;
    currentFileName = '';
}

// ===== FUNÇÕES DE IMPORTAÇÃO =====

async function confirmImport() {
    if (!currentFileData || currentFileData.valid.length === 0) {
        showToast('Erro', 'Nenhum dado válido para importar', 'error');
        return;
    }
    
    const options = {
        createCategories: document.getElementById('createCategories').checked,
        skipDuplicates: document.getElementById('skipDuplicates').checked,
        expandInstallments: document.getElementById('expandInstallments').checked
    };
    
    // Mostrar modal de progresso
    const progressModal = document.getElementById('progressModal');
    progressModal.classList.add('active');
    
    try {
        // Criar categorias se necessário
        if (options.createCategories && currentFileData.categoriesToCreate.length > 0) {
            await createMissingCategories(currentFileData.categoriesToCreate);
        }
        
        // Processar transações
        let transactionsToImport = [...currentFileData.valid];
        
        // Log para debug
        console.log('Transações válidas antes do processamento:', transactionsToImport.length);
        
        // Expandir parcelas se necessário
        if (options.expandInstallments) {
            transactionsToImport = expandInstallmentTransactions(transactionsToImport);
            console.log('Após expandir parcelas:', transactionsToImport.length);
        }
        
        // Filtrar duplicatas se necessário
        if (options.skipDuplicates) {
            transactionsToImport = filterDuplicates(transactionsToImport);
            console.log('Após filtrar duplicatas:', transactionsToImport.length);
        }
        
        // Verificar se ainda temos transações
        if (transactionsToImport.length === 0) {
            showToast('Aviso', 'Todas as transações já existem (duplicadas)', 'warning');
            progressModal.classList.remove('active');
            clearPreview();
            return;
        }
        
        // Atualizar progresso
        updateImportProgress(0, transactionsToImport.length);
        
        // Importar em lotes para não travar a interface
        const batchSize = 100;
        for (let i = 0; i < transactionsToImport.length; i += batchSize) {
            const batch = transactionsToImport.slice(i, i + batchSize);
            transactions.push(...batch);
            
            // Atualizar progresso
            updateImportProgress(i + batch.length, transactionsToImport.length);
            
            // Pequeno delay para não travar
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Salvar no localStorage
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
        
        // Calcular stats corretamente para o histórico
        const importStats = {
            income: currentFileData.stats.income,
            expense: currentFileData.stats.expense,
            credit: currentFileData.stats.credit
        };
        
        // Adicionar ao histórico
        addToHistory({
            date: new Date().toISOString(),
            filename: currentFileName,
            count: transactionsToImport.length, // Usar o número real importado
            stats: importStats
        });
        
        // Fechar modal
        progressModal.classList.remove('active');
        
        // Mostrar sucesso
        showToast('Sucesso', `${transactionsToImport.length} transações importadas!`, 'success');
        
        // Limpar preview
        clearPreview();
        
        // Atualizar histórico
        updateHistoryList();
        
    } catch (error) {
        console.error('Erro na importação:', error);
        progressModal.classList.remove('active');
        showToast('Erro', 'Falha ao importar dados', 'error');
    }
}

function updateImportProgress(current, total) {
    const percentage = (current / total * 100).toFixed(0);
    document.getElementById('importProgressFill').style.width = `${percentage}%`;
    document.getElementById('importProgressText').textContent = 
        `Processando ${current} de ${total} transações`;
    
    const statusEl = document.getElementById('importStatus');
    if (current === total) {
        statusEl.innerHTML = '<p><i class="fas fa-check-circle" style="color: var(--success);"></i> Importação concluída!</p>';
        statusEl.classList.add('success');
    } else {
        statusEl.innerHTML = `<p><i class="fas fa-spinner fa-spin"></i> Importando... ${percentage}%</p>`;
    }
}

function createMissingCategories(categoryNames) {
    return new Promise((resolve) => {
        categoryNames.forEach(name => {
            if (!categories.some(c => c.nome.toLowerCase() === name.toLowerCase())) {
                const newCategory = {
                    id: Date.now() + Math.random() * 1000,
                    nome: name,
                    tipo: 'expense', // Padrão
                    cor: generateColor(),
                    icone: '📌',
                    orcamento: 0
                };
                categories.push(newCategory);
            }
        });
        
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
        resolve();
    });
}

function expandInstallmentTransactions(transactions) {
    const expanded = [];
    
    transactions.forEach(t => {
        if (t.type === 'credit' && t.installment && t.totalInstallments && t.totalInstallments > 1) {
            // Criar uma transação para cada parcela
            for (let i = 1; i <= t.totalInstallments; i++) {
                const installmentDate = new Date(t.date);
                installmentDate.setMonth(installmentDate.getMonth() + (i - 1));
                
                expanded.push({
                    ...t,
                    id: Date.now() + Math.random() * 1000 + i,
                    date: formatDateISO(installmentDate),
                    installment: i,
                    description: `${t.description} (Parcela ${i}/${t.totalInstallments})`
                });
            }
        } else {
            expanded.push(t);
        }
    });
    
    return expanded;
}

function filterDuplicates(transactionsToFilter) {
    // Criar um Set com as chaves das transações existentes
    const existingKeys = new Set(
        transactions.map(t => 
            `${t.date}-${t.description}-${t.amount}-${t.type}`
        )
    );
    
    console.log('Transações existentes:', transactions.length);
    console.log('Chaves existentes:', existingKeys);
    
    // Filtrar apenas as que não existem
    const filtered = transactionsToFilter.filter(t => {
        const key = `${t.date}-${t.description}-${t.amount}-${t.type}`;
        const exists = existingKeys.has(key);
        if (exists) {
            console.log('Duplicata encontrada:', key);
        }
        return !exists;
    });
    
    console.log('Transações após filtro:', filtered.length);
    return filtered;
}

// ===== FUNÇÕES DE HISTÓRICO =====

function updateHistoryList() {
    const historyList = document.getElementById('historyList');
    const emptyState = document.getElementById('emptyHistory');
    
    if (!importHistory || importHistory.length === 0) {
        historyList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Ordenar por data (mais recente primeiro)
    const sortedHistory = [...importHistory].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    historyList.innerHTML = sortedHistory.map((item, index) => {
        // Garantir que stats existe
        const stats = item.stats || { income: 0, expense: 0, credit: 0 };
        
        return `
            <div class="history-item">
                <div class="history-info">
                    <span class="history-date">${formatDate(item.date)}</span>
                    <span class="history-filename">${item.filename || 'Arquivo desconhecido'}</span>
                    <div class="history-stats">
                        <span class="history-stat income">
                            <i class="fas fa-arrow-up"></i> ${formatCurrency(stats.income || 0)}
                        </span>
                        <span class="history-stat expense">
                            <i class="fas fa-arrow-down"></i> ${formatCurrency(stats.expense || 0)}
                        </span>
                        <span class="history-stat credit">
                            <i class="fas fa-credit-card"></i> ${formatCurrency(stats.credit || 0)}
                        </span>
                    </div>
                    <span class="badge">${item.count || 0} transações</span>
                </div>
                <div class="history-delete" onclick="removeHistoryItem(${index})">
                    <i class="fas fa-trash"></i>
                </div>
            </div>
        `;
    }).join('');
}

function addToHistory(item) {
    importHistory.unshift(item);
    if (importHistory.length > 20) {
        importHistory = importHistory.slice(0, 20);
    }
    localStorage.setItem(STORAGE_KEYS.IMPORT_HISTORY, JSON.stringify(importHistory));
}

function removeHistoryItem(index) {
    importHistory.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.IMPORT_HISTORY, JSON.stringify(importHistory));
    updateHistoryList();
    showToast('Sucesso', 'Item removido do histórico', 'success');
}

function clearHistory() {
    if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
        importHistory = [];
        localStorage.setItem(STORAGE_KEYS.IMPORT_HISTORY, JSON.stringify(importHistory));
        updateHistoryList();
        showToast('Sucesso', 'Histórico limpo', 'success');
    }
}

// ===== FUNÇÕES DE TEMPLATE =====

function downloadTemplate() {
    console.log('Função downloadTemplate chamada');
    
    try {
        const template = [
            ['data', 'descricao', 'categoria', 'tipo', 'valor', 'cartao', 'parcelas'],
            ['01/01/2026', 'Salário mensal', 'Salário', 'entrada', '5000,00', '', ''],
            ['05/01/2026', 'Supermercado Extra', 'Alimentação', 'saída', '350,50', '', ''],
            ['10/01/2026', 'Netflix', 'Assinaturas', 'cartão', '45,90', 'Nubank', '1/1'],
            ['15/01/2026', 'iPhone 15', 'Eletrônicos', 'cartão', '1200,00', 'PicPay', '1/12'],
            ['20/01/2026', 'Uber', 'Transporte', 'saída', '35,80', '', ''],
            ['25/01/2026', 'Freelance', 'Freelance', 'entrada', '1500,00', '', '']
        ];
        
        // Criar CSV com cabeçalho correto
        const csvContent = template.map(row => 
            row.map(cell => {
                // Escapar vírgulas se necessário
                if (cell && cell.includes(',')) {
                    return `"${cell}"`;
                }
                return cell;
            }).join(',')
        ).join('\n');
        
        // Adicionar BOM para UTF-8 (melhor compatibilidade com Excel)
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'modelo_importacao_fluxoconta.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        showToast('Sucesso', 'Modelo baixado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao baixar template:', error);
        showToast('Erro', 'Falha ao baixar modelo', 'error');
    }
}

// ===== FUNÇÕES UTILITÁRIAS =====

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function formatDateISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

function getTypeLabel(type) {
    const labels = {
        'income': 'Entrada',
        'expense': 'Saída',
        'credit': 'Cartão'
    };
    return labels[type] || type;
}

function getCategoryColor(categoryName) {
    const category = categories.find(c => c.nome === categoryName);
    return category ? category.cor : '#95a5a6';
}

function getCategoryIcon(categoryName) {
    const category = categories.find(c => c.nome === categoryName);
    return category ? category.icone : '📌';
}

function generateColor() {
    const colors = [
        '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
        '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8e44ad'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <div class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// ===== EXPOR FUNÇÕES GLOBAIS =====
window.removeHistoryItem = removeHistoryItem;