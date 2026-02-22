// ===== FluxoConta - CATEGORIAS SCRIPT =====

const STORAGE_KEYS = {
    TRANSACTIONS: 'finance_transactions',
    CATEGORIES: 'finance_categories'
};

let currentMonth = new Date();
let categories = [];
let transactions = [];
let currentCategoryId = null;
let deleteCategoryId = null;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    updateUI();
});

function loadData() {
    categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || [];
    transactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
}

function setupEventListeners() {
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    document.getElementById('btnAddCategory').addEventListener('click', openCategoryModal);
    document.getElementById('categoryTypeFilter').addEventListener('change', updateUI);
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeAllModals();
        }
    });
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

function changeMonth(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    updateMonthDisplay();
    updateUI();
}

function updateMonthDisplay() {
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthSpan = document.getElementById('currentMonth');
    monthSpan.textContent = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
}

// ===== FUNÇÕES DE UI =====

function updateUI() {
    const filter = document.getElementById('categoryTypeFilter').value;
    const filteredCategories = filter === 'all' 
        ? categories 
        : categories.filter(c => c.tipo === filter);
    
    const grid = document.getElementById('categoriesGrid');
    const emptyState = document.getElementById('emptyCategories');
    
    if (filteredCategories.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Ordenar por nome
    filteredCategories.sort((a, b) => a.nome.localeCompare(b.nome));
    
    grid.innerHTML = filteredCategories.map(category => {
        const stats = getCategoryStats(category);
        const percentage = stats.budget > 0 ? (stats.total / stats.budget * 100) : 0;
        const progressClass = getProgressClass(percentage);
        
        return `
            <div class="category-card" onclick="openDetailsModal(${category.id})" 
                 style="--category-color: ${category.cor}; --category-color-light: ${category.cor}20;">
                <div class="category-header">
                    <div class="category-icon" style="background-color: ${category.cor}20;">
                        ${category.icone}
                    </div>
                    <div class="category-title">
                        <span class="category-name">${category.nome}</span>
                        <span class="category-type type-${category.tipo}">
                            ${getTypeLabel(category.tipo)}
                        </span>
                    </div>
                </div>
                
                <div class="category-stats">
                    <div class="stat-row">
                        <span class="stat-label">Total no mês</span>
                        <span class="stat-value" style="color: ${category.cor}">
                            ${formatCurrency(stats.total)}
                        </span>
                    </div>
                    
                    ${category.orcamento > 0 ? `
                        <div class="category-progress">
                            <div class="progress-header">
                                <span>Orçamento: ${formatCurrency(category.orcamento)}</span>
                                <span>${percentage.toFixed(1)}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill ${progressClass}" 
                                     style="width: ${Math.min(percentage, 100)}%; background-color: ${category.cor};"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="category-actions" onclick="event.stopPropagation()">
                    <button class="details-btn" onclick="openDetailsModal(${category.id})" title="Detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="edit-btn" onclick="editCategory(${category.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="openDeleteModal(${category.id}, '${category.nome}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function getCategoryStats(category) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const categoryTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return t.category === category.nome &&
               date.getFullYear() === year &&
               date.getMonth() === month;
    });
    
    const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    return {
        total,
        count: categoryTransactions.length,
        transactions: categoryTransactions
    };
}

function getTypeLabel(type) {
    const labels = {
        'income': 'Entrada',
        'expense': 'Saída',
        'credit': 'Cartão'
    };
    return labels[type] || type;
}

function getProgressClass(percentage) {
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    return '';
}

// ===== FUNÇÕES DE MODAL =====

function openCategoryModal(categoryId = null) {
    currentCategoryId = categoryId;
    
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('categoryModalTitle');
    
    if (categoryId) {
        title.textContent = 'Editar Categoria';
        loadCategoryForEdit(categoryId);
    } else {
        title.textContent = 'Nova Categoria';
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryId').value = '';
    }
    
    modal.classList.add('active');
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
    document.getElementById('categoryForm').reset();
    currentCategoryId = null;
}

function loadCategoryForEdit(id) {
    const category = categories.find(c => c.id === id);
    if (!category) return;
    
    document.getElementById('categoryId').value = category.id;
    document.getElementById('categoryName').value = category.nome;
    document.getElementById('categoryType').value = category.tipo;
    document.getElementById('categoryColor').value = category.cor;
    document.getElementById('categoryIcon').value = category.icone;
    document.getElementById('categoryBudget').value = category.orcamento;
}

function openDetailsModal(id) {
    const category = categories.find(c => c.id === id);
    if (!category) return;
    
    const stats = getCategoryStats(category);
    const percentage = category.orcamento > 0 
        ? (stats.total / category.orcamento * 100).toFixed(1)
        : 0;
    
    // Header
    const header = document.getElementById('categoryDetailsHeader');
    header.innerHTML = `
        <div class="category-header-large" style="background: linear-gradient(135deg, ${category.cor} 0%, ${adjustColor(category.cor, -20)} 100%);">
            <div class="category-icon-large">
                ${category.icone}
            </div>
            <div class="category-info-large">
                <h2 class="category-name-large">${category.nome}</h2>
                <div class="category-meta">
                    <span><i class="fas fa-tag"></i> ${getTypeLabel(category.tipo)}</span>
                    <span><i class="fas fa-palette"></i> ${category.cor}</span>
                </div>
            </div>
        </div>
    `;
    
    // Stats
    document.getElementById('categoryMonthTotal').textContent = formatCurrency(stats.total);
    document.getElementById('categoryBudget').textContent = formatCurrency(category.orcamento);
    document.getElementById('categoryPercentage').textContent = `${percentage}%`;
    
    // Progress Bar
    const progressFill = document.getElementById('categoryProgressFill');
    progressFill.style.width = `${Math.min(percentage, 100)}%`;
    progressFill.style.backgroundColor = category.cor;
    
    if (percentage >= 100) {
        progressFill.classList.add('danger');
    } else if (percentage >= 80) {
        progressFill.classList.add('warning');
    }
    
    // Transactions
    const transactionsList = document.getElementById('categoryTransactionsList');
    const emptyTransactions = document.getElementById('emptyCategoryTransactions');
    
    if (stats.transactions.length === 0) {
        transactionsList.innerHTML = '';
        emptyTransactions.style.display = 'block';
    } else {
        emptyTransactions.style.display = 'none';
        
        // Ordenar por data (mais recentes primeiro)
        stats.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        transactionsList.innerHTML = stats.transactions.map(t => `
            <tr>
                <td>${formatDate(t.date)}</td>
                <td>${t.description}</td>
                <td class="transaction-amount amount-${t.type}">${formatCurrency(t.amount)}</td>
                <td><span class="badge badge-${t.type}">${getTypeLabel(t.type)}</span></td>
            </tr>
        `).join('');
    }
    
    currentCategoryId = id;
    document.getElementById('categoryDetailsModal').classList.add('active');
}

function closeDetailsModal() {
    document.getElementById('categoryDetailsModal').classList.remove('active');
    currentCategoryId = null;
}

function openDeleteModal(id, name) {
    deleteCategoryId = id;
    document.getElementById('deleteCategoryName').textContent = name;
    document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
    deleteCategoryId = null;
    document.getElementById('deleteModal').classList.remove('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
    });
    currentCategoryId = null;
    deleteCategoryId = null;
}

function editCategoryFromDetails() {
    closeDetailsModal();
    openCategoryModal(currentCategoryId);
}

// ===== FUNÇÕES DE CRUD =====

function saveCategory() {
    const form = document.getElementById('categoryForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const categoryData = {
        id: document.getElementById('categoryId').value || Date.now(),
        nome: document.getElementById('categoryName').value,
        tipo: document.getElementById('categoryType').value,
        cor: document.getElementById('categoryColor').value,
        icone: document.getElementById('categoryIcon').value,
        orcamento: parseFloat(document.getElementById('categoryBudget').value) || 0
    };
    
    if (document.getElementById('categoryId').value) {
        // Editar
        const index = categories.findIndex(c => c.id === categoryData.id);
        if (index !== -1) {
            const oldName = categories[index].nome;
            categories[index] = categoryData;
            
            // Atualizar nome da categoria nas transações
            if (oldName !== categoryData.nome) {
                transactions = transactions.map(t => {
                    if (t.category === oldName) {
                        t.category = categoryData.nome;
                    }
                    return t;
                });
                localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
            }
            
            showToast('Sucesso', 'Categoria atualizada com sucesso!', 'success');
        }
    } else {
        // Nova categoria
        categories.push(categoryData);
        showToast('Sucesso', 'Categoria criada com sucesso!', 'success');
    }
    
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    
    closeCategoryModal();
    updateUI();
}

function confirmDelete() {
    if (deleteCategoryId) {
        const category = categories.find(c => c.id === deleteCategoryId);
        
        if (category) {
            // Mover transações para "Sem categoria"
            transactions = transactions.map(t => {
                if (t.category === category.nome) {
                    t.category = 'Sem categoria';
                }
                return t;
            });
            
            // Remover categoria
            categories = categories.filter(c => c.id !== deleteCategoryId);
            
            localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
            localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
            
            showToast('Sucesso', 'Categoria excluída com sucesso!', 'success');
        }
        
        closeDeleteModal();
        updateUI();
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

function adjustColor(hex, percent) {
    // Simplificação: escurecer/clarear cor
    let R = parseInt(hex.substring(1,3), 16);
    let G = parseInt(hex.substring(3,5), 16);
    let B = parseInt(hex.substring(5,7), 16);
    
    R = Math.min(255, Math.max(0, R + percent));
    G = Math.min(255, Math.max(0, G + percent));
    B = Math.min(255, Math.max(0, B + percent));
    
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

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
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// ===== EXPOR FUNÇÕES GLOBAIS =====
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.openDetailsModal = openDetailsModal;
window.closeDetailsModal = closeDetailsModal;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.saveCategory = saveCategory;
window.confirmDelete = confirmDelete;
window.editCategory = (id) => openCategoryModal(id);
window.editCategoryFromDetails = editCategoryFromDetails;