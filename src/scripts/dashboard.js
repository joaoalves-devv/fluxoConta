// ===== FluxoConta - DASHBOARD SCRIPT =====
// Gerencia todas as funcionalidades da página inicial/dashboard

// ===== CONSTANTES E CONFIGURAÇÕES =====
const STORAGE_KEYS = {
    TRANSACTIONS: 'finance_transactions',
    CATEGORIES: 'finance_categories'
};

const DEFAULT_CATEGORIES = [
    // Categorias de Entrada
    { id: 1, nome: 'Salário', tipo: 'income', cor: '#2ecc71', icone: '💼', orcamento: 0 },
    { id: 2, nome: 'Freelance', tipo: 'income', cor: '#3498db', icone: '💻', orcamento: 0 },
    { id: 3, nome: 'Investimentos', tipo: 'income', cor: '#9b59b6', icone: '📈', orcamento: 0 },
    
    // Categorias de Saída
    { id: 4, nome: 'Alimentação', tipo: 'expense', cor: '#e74c3c', icone: '🍔', orcamento: 800 },
    { id: 5, nome: 'Transporte', tipo: 'expense', cor: '#f39c12', icone: '🚗', orcamento: 300 },
    { id: 6, nome: 'Moradia', tipo: 'expense', cor: '#1abc9c', icone: '🏠', orcamento: 1500 },
    { id: 7, nome: 'Saúde', tipo: 'expense', cor: '#e67e22', icone: '💊', orcamento: 200 },
    
    // Categorias de Cartão
    { id: 8, nome: 'Compras', tipo: 'credit', cor: '#f1c40f', icone: '🛍️', orcamento: 500 },
    { id: 9, nome: 'Lazer', tipo: 'credit', cor: '#e91e63', icone: '🎮', orcamento: 300 },
    { id: 10, nome: 'Assinaturas', tipo: 'credit', cor: '#00bcd4', icone: '📺', orcamento: 150 }
];

// ===== ESTADO GLOBAL =====
let currentMonth = new Date();
let transactions = [];
let categories = [];
let deleteId = null;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    loadData();
    setupEventListeners();
    updateUI();
});

function initializeData() {
    // Inicializa categorias padrão se não existirem
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    }
    
    // Inicializa transações vazias se não existirem
    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    }
}

function loadData() {
    transactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
    categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || DEFAULT_CATEGORIES;
}

function setupEventListeners() {
    // Menu toggle para mobile
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    
    // Navegação de mês
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    
    // Botão de nova transação
    document.getElementById('btnAddTransaction').addEventListener('click', openTransactionModal);
    
    // Ver todas as transações
    document.getElementById('viewAllTransactions').addEventListener('click', viewAllTransactions);
    
    // Mudança no tipo de transação (mostrar/esconder campos de cartão)
    document.getElementById('transactionType').addEventListener('change', handleTransactionTypeChange);
    
    // Fechar modais ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeAllModals();
        }
    });
}

// ===== FUNÇÕES DE UI =====

function updateUI() {
    updateMonthDisplay();
    updateSummaryCards();
    updateTransactionsList();
    updateCreditCategories();
}

function updateMonthDisplay() {
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthSpan = document.getElementById('currentMonth');
    monthSpan.textContent = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
}

function updateSummaryCards() {
    const filteredTransactions = getFilteredTransactions();
    
    const totals = filteredTransactions.reduce((acc, transaction) => {
        if (transaction.type === 'income') {
            acc.income += transaction.amount;
        } else if (transaction.type === 'expense') {
            acc.expense += transaction.amount;
        } else if (transaction.type === 'credit') {
            acc.credit += transaction.amount;
        }
        return acc;
    }, { income: 0, expense: 0, credit: 0 });
    
    const balance = totals.income - totals.expense - totals.credit;
    
    document.getElementById('totalIncome').textContent = formatCurrency(totals.income);
    document.getElementById('totalExpense').textContent = formatCurrency(totals.expense);
    document.getElementById('totalCredit').textContent = formatCurrency(totals.credit);
    document.getElementById('totalBalance').textContent = formatCurrency(balance);
}

function updateTransactionsList() {
    const filteredTransactions = getFilteredTransactions();
    const tbody = document.getElementById('transactionsList');
    const emptyState = document.getElementById('emptyTransactions');
    const tableContainer = document.querySelector('.table-container');
    
    // Ordenar por data (mais recentes primeiro)
    const sortedTransactions = [...filteredTransactions].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    ).slice(0, 10); // Mostrar apenas as 10 mais recentes
    
    if (sortedTransactions.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';
    
    tbody.innerHTML = sortedTransactions.map(transaction => `
        <tr class="transaction-row" data-id="${transaction.id}">
            <td>${formatDate(transaction.date)}</td>
            <td class="transaction-description" title="${transaction.description}">
                ${truncateText(transaction.description, 30)}
            </td>
            <td>
                <span class="category-badge" style="background-color: ${getCategoryColor(transaction.category)}20; color: ${getCategoryColor(transaction.category)}">
                    ${getCategoryIcon(transaction.category)} ${transaction.category}
                </span>
            </td>
            <td class="transaction-amount amount-${transaction.type}">
                ${formatCurrency(transaction.amount)}
            </td>
            <td>
                <span class="transaction-type-badge type-${transaction.type}">
                    ${getTransactionTypeLabel(transaction.type)}
                </span>
            </td>
            <td>
                <div class="transaction-actions">
                    <button class="edit-btn" onclick="editTransaction(${transaction.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="openDeleteModal(${transaction.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateCreditCategories() {
    const filteredTransactions = getFilteredTransactions();
    const creditTransactions = filteredTransactions.filter(t => t.type === 'credit');
    
    const categoriesList = document.getElementById('creditCategoriesList');
    const emptyState = document.getElementById('emptyCreditCategories');
    
    if (creditTransactions.length === 0) {
        categoriesList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Agrupar por categoria
    const categoryTotals = {};
    creditTransactions.forEach(transaction => {
        if (!categoryTotals[transaction.category]) {
            categoryTotals[transaction.category] = 0;
        }
        categoryTotals[transaction.category] += transaction.amount;
    });
    
    // Calcular total para percentuais
    const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    
    // Ordenar por valor (maiores primeiro)
    const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1]);
    
    categoriesList.innerHTML = sortedCategories.map(([category, amount]) => {
        const percentage = (amount / total * 100).toFixed(1);
        const categoryColor = getCategoryColor(category);
        const categoryIcon = getCategoryIcon(category);
        
        return `
            <div class="category-item">
                <span class="category-color" style="background-color: ${categoryColor}"></span>
                <span class="category-icon">${categoryIcon}</span>
                <div class="category-info">
                    <span class="category-name">${category}</span>
                    <div style="display: flex; justify-content: space-between;">
                        <span class="category-amount">${formatCurrency(amount)}</span>
                        <span class="category-percentage">${percentage}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-bar-fill" style="width: ${percentage}%; background-color: ${categoryColor}"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== FUNÇÕES DE FILTRO =====

function getFilteredTransactions() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    return transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getFullYear() === year && 
               transactionDate.getMonth() === month;
    });
}

function changeMonth(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    updateMonthDisplay();
    updateUI();
}

// ===== FUNÇÕES DE FORMATAÇÃO =====

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

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

function getTransactionTypeLabel(type) {
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

// ===== FUNÇÕES DE MODAL =====

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

function openTransactionModal() {
    document.getElementById('transactionModal').classList.add('active');
    loadCategoriesIntoSelect();
    setDefaultDate();
}

function closeTransactionModal() {
    document.getElementById('transactionModal').classList.remove('active');
    document.getElementById('transactionForm').reset();
    document.getElementById('creditFields').style.display = 'none';
}

function openCategoryModal() {
    closeTransactionModal();
    document.getElementById('categoryModal').classList.add('active');
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
    document.getElementById('categoryForm').reset();
    openTransactionModal(); // Reabre o modal de transação
}

function openDeleteModal(id) {
    deleteId = id;
    document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
    deleteId = null;
    document.getElementById('deleteModal').classList.remove('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
    });
}

function handleTransactionTypeChange() {
    const type = document.getElementById('transactionType').value;
    const creditFields = document.getElementById('creditFields');
    
    if (type === 'credit') {
        creditFields.style.display = 'block';
    } else {
        creditFields.style.display = 'none';
    }
    
    loadCategoriesIntoSelect();
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transactionDate').value = today;
}

function loadCategoriesIntoSelect() {
    const type = document.getElementById('transactionType').value;
    const select = document.getElementById('transactionCategory');
    
    if (!type) {
        select.innerHTML = '<option value="">Selecione o tipo primeiro</option>';
        return;
    }
    
    const filteredCategories = categories.filter(c => c.tipo === type);
    
    if (filteredCategories.length === 0) {
        select.innerHTML = '<option value="">Nenhuma categoria disponível</option>';
        return;
    }
    
    select.innerHTML = filteredCategories.map(category => 
        `<option value="${category.nome}">${category.icone} ${category.nome}</option>`
    ).join('');
}

// ===== FUNÇÕES DE CRUD =====

function saveTransaction() {
    // Validar formulário
    const form = document.getElementById('transactionForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Coletar dados
    const transaction = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        type: document.getElementById('transactionType').value,
        date: document.getElementById('transactionDate').value,
        description: document.getElementById('transactionDescription').value,
        category: document.getElementById('transactionCategory').value,
        amount: parseFloat(document.getElementById('transactionAmount').value)
    };
    
    // Adicionar campos de cartão se necessário
    if (transaction.type === 'credit') {
        transaction.card = document.getElementById('transactionCard').value;
        transaction.installment = parseInt(document.getElementById('transactionInstallment').value);
        transaction.totalInstallments = parseInt(document.getElementById('transactionTotalInstallments').value);
    }
    
    // Salvar
    transactions.push(transaction);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    
    // Feedback
    showToast('Sucesso', 'Transação adicionada com sucesso!', 'success');
    
    // Fechar modal e atualizar UI
    closeTransactionModal();
    updateUI();
}

function saveCategory() {
    // Validar formulário
    const form = document.getElementById('categoryForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Coletar dados
    const category = {
        id: Date.now(),
        nome: document.getElementById('categoryName').value,
        tipo: document.getElementById('categoryType').value,
        cor: document.getElementById('categoryColor').value,
        icone: document.getElementById('categoryIcon').value,
        orcamento: parseFloat(document.getElementById('categoryBudget').value) || 0
    };
    
    // Salvar
    categories.push(category);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    
    // Feedback
    showToast('Sucesso', 'Categoria criada com sucesso!', 'success');
    
    // Fechar modal
    closeCategoryModal();
}

function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    // Preencher formulário
    document.getElementById('transactionType').value = transaction.type;
    document.getElementById('transactionDate').value = transaction.date;
    document.getElementById('transactionDescription').value = transaction.description;
    document.getElementById('transactionAmount').value = transaction.amount;
    
    // Carregar categorias e selecionar a correta
    loadCategoriesIntoSelect();
    setTimeout(() => {
        document.getElementById('transactionCategory').value = transaction.category;
    }, 100);
    
    // Se for cartão, preencher campos adicionais
    if (transaction.type === 'credit') {
        document.getElementById('creditFields').style.display = 'block';
        document.getElementById('transactionCard').value = transaction.card || '';
        document.getElementById('transactionInstallment').value = transaction.installment || 1;
        document.getElementById('transactionTotalInstallments').value = transaction.totalInstallments || 1;
    }
    
    // Remover transação antiga
    transactions = transactions.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    
    // Abrir modal
    openTransactionModal();
    
    showToast('Info', 'Editando transação. Faça as alterações e salve.', 'info');
}

function confirmDelete() {
    if (deleteId) {
        transactions = transactions.filter(t => t.id !== deleteId);
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
        
        showToast('Sucesso', 'Transação excluída com sucesso!', 'success');
        
        closeDeleteModal();
        updateUI();
    }
}

// ===== FUNÇÕES DE UTILIDADE =====

function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
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
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function viewAllTransactions() {
    // Por enquanto, apenas mostra um toast
    showToast('Info', 'Em breve: visualização completa de transações', 'info');
}

// ===== EXPOR FUNÇÕES GLOBAIS =====
window.openTransactionModal = openTransactionModal;
window.closeTransactionModal = closeTransactionModal;
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.saveTransaction = saveTransaction;
window.saveCategory = saveCategory;
window.confirmDelete = confirmDelete;
window.editTransaction = editTransaction;