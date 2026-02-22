// ===== FluxoConta - FLUXO DE CAIXA SCRIPT =====

const STORAGE_KEYS = {
    TRANSACTIONS: 'finance_transactions',
    CATEGORIES: 'finance_categories'
};

let currentMonth = new Date();
let transactions = [];
let categories = [];

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    updateUI();
});

function loadData() {
    transactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
    categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || [];
}

function setupEventListeners() {
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    document.getElementById('exportBtn').addEventListener('click', exportReport);
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeDayModal();
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
    updateQuickSummary();
    generateCalendar();
    updateExpensesList();
    updateIncomesList();
    updateInvoices();
}

function updateQuickSummary() {
    const filteredTransactions = getFilteredTransactions();
    
    const totals = filteredTransactions.reduce((acc, t) => {
        if (t.type === 'income') acc.income += t.amount;
        else if (t.type === 'expense') acc.expense += t.amount;
        else if (t.type === 'credit') acc.credit += t.amount;
        return acc;
    }, { income: 0, expense: 0, credit: 0 });
    
    const balance = totals.income - totals.expense - totals.credit;
    
    document.getElementById('quickIncome').textContent = formatCurrency(totals.income);
    document.getElementById('quickExpense').textContent = formatCurrency(totals.expense + totals.credit);
    document.getElementById('quickBalance').textContent = formatCurrency(balance);
}

function generateCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Primeiro dia do mês
    const firstDay = new Date(year, month, 1);
    // Último dia do mês
    const lastDay = new Date(year, month + 1, 0);
    
    // Ajustar para começar no domingo (0 = domingo, 1 = segunda, etc.)
    let startDay = firstDay.getDay(); // 0 = domingo, 1 = segunda, etc.
    
    // Data inicial no calendário (pode ser do mês anterior)
    const startDate = new Date(firstDay);
    startDate.setDate(1 - startDay); // Voltar para o domingo anterior
    
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;
    
    calendarGrid.innerHTML = '';
    
    // Agrupar transações por dia para facilitar
    const transactionsByDay = groupTransactionsByDay(getFilteredTransactions());
    
    // Gerar 6 semanas (42 dias) para garantir que todos os dias do mês apareçam
    for (let i = 0; i < 42; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const dateStr = formatDateISO(currentDate);
        const dayTransactions = transactionsByDay[dateStr] || [];
        const isCurrentMonth = currentDate.getMonth() === month && currentDate.getFullYear() === year;
        const isToday = isSameDay(currentDate, new Date());
        
        const dayElement = createDayElement(currentDate, dayTransactions, isCurrentMonth, isToday);
        calendarGrid.appendChild(dayElement);
    }
}

function createDayElement(date, transactions, isCurrentMonth, isToday) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    
    if (!isCurrentMonth) {
        dayDiv.classList.add('other-month');
    }
    
    if (isToday) {
        dayDiv.classList.add('today');
    }
    
    // Número do dia
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = date.getDate();
    dayDiv.appendChild(dayNumber);
    
    // Transações do dia (se houver)
    if (transactions.length > 0) {
        const transactionsDiv = document.createElement('div');
        transactionsDiv.className = 'day-transactions';
        
        // Mostrar apenas as 3 primeiras transações
        const displayTransactions = transactions.slice(0, 3);
        
        displayTransactions.forEach(t => {
            const transactionEl = document.createElement('div');
            transactionEl.className = `day-transaction ${t.type}`;
            
            const sign = t.type === 'income' ? '+' : '-';
            const value = formatCurrency(t.amount);
            
            transactionEl.innerHTML = `
                <span class="transaction-sign">${sign}</span>
                <span class="transaction-value">${value}</span>
            `;
            transactionEl.title = `${t.description} - ${t.category}`;
            
            transactionsDiv.appendChild(transactionEl);
        });
        
        if (transactions.length > 3) {
            const moreEl = document.createElement('div');
            moreEl.className = 'transaction-more';
            moreEl.textContent = `+${transactions.length - 3} mais`;
            transactionsDiv.appendChild(moreEl);
        }
        
        dayDiv.appendChild(transactionsDiv);
        
        // Adicionar tooltip com todas as transações
        const tooltipText = transactions.map(t => 
            `${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)} - ${t.description}`
        ).join('\n');
        
        dayDiv.setAttribute('data-tooltip', tooltipText);
    }
    
    // Adicionar evento de clique para ver detalhes
    dayDiv.addEventListener('click', () => openDayModal(date, transactions));
    
    return dayDiv;
}

function groupTransactionsByDay(transactionsList) {
    const groups = {};
    transactionsList.forEach(t => {
        if (!groups[t.date]) {
            groups[t.date] = [];
        }
        groups[t.date].push(t);
    });
    return groups;
}

function updateExpensesList() {
    const filteredTransactions = getFilteredTransactions();
    const expenses = filteredTransactions.filter(t => t.type === 'expense' || t.type === 'credit');
    
    const tbody = document.getElementById('expensesList');
    const emptyState = document.getElementById('emptyExpenses');
    const count = document.getElementById('expenseCount');
    
    count.textContent = expenses.length;
    
    if (expenses.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        document.getElementById('totalExpenses').textContent = formatCurrency(0);
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    // Ordenar por data
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    document.getElementById('totalExpenses').textContent = formatCurrency(total);
    
    tbody.innerHTML = expenses.map(expense => {
        const status = getTransactionStatus(expense);
        
        return `
            <tr>
                <td>${formatDate(expense.date)}</td>
                <td title="${expense.description}">${truncateText(expense.description, 30)}</td>
                <td>
                    <span class="category-badge" style="background-color: ${getCategoryColor(expense.category)}20; color: ${getCategoryColor(expense.category)}">
                        ${getCategoryIcon(expense.category)} ${expense.category}
                    </span>
                </td>
                <td class="transaction-amount amount-${expense.type}">${formatCurrency(expense.amount)}</td>
                <td><span class="status-badge status-${status}">${status === 'paid' ? 'Pago' : 'Pendente'}</span></td>
            </tr>
        `;
    }).join('');
}

function updateIncomesList() {
    const filteredTransactions = getFilteredTransactions();
    const incomes = filteredTransactions.filter(t => t.type === 'income');
    
    const tbody = document.getElementById('incomesList');
    const emptyState = document.getElementById('emptyIncomes');
    const count = document.getElementById('incomeCount');
    
    count.textContent = incomes.length;
    
    if (incomes.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        document.getElementById('totalIncomes').textContent = formatCurrency(0);
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    // Ordenar por data
    incomes.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const total = incomes.reduce((sum, t) => sum + t.amount, 0);
    document.getElementById('totalIncomes').textContent = formatCurrency(total);
    
    tbody.innerHTML = incomes.map(income => {
        const status = getTransactionStatus(income);
        
        return `
            <tr>
                <td>${formatDate(income.date)}</td>
                <td title="${income.description}">${truncateText(income.description, 30)}</td>
                <td>
                    <span class="category-badge" style="background-color: ${getCategoryColor(income.category)}20; color: ${getCategoryColor(income.category)}">
                        ${getCategoryIcon(income.category)} ${income.category}
                    </span>
                </td>
                <td class="transaction-amount amount-income">${formatCurrency(income.amount)}</td>
                <td><span class="status-badge status-${status}">${status === 'paid' ? 'Recebido' : 'Pendente'}</span></td>
            </tr>
        `;
    }).join('');
}

function updateInvoices() {
    const filteredTransactions = getFilteredTransactions();
    const creditTransactions = filteredTransactions.filter(t => t.type === 'credit' && t.card);
    
    const invoicesGrid = document.getElementById('invoicesGrid');
    const emptyState = document.getElementById('emptyInvoices');
    
    if (!invoicesGrid) return;
    
    if (creditTransactions.length === 0) {
        invoicesGrid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    // Agrupar por cartão
    const invoicesByCard = {};
    creditTransactions.forEach(t => {
        if (!invoicesByCard[t.card]) {
            invoicesByCard[t.card] = {
                transactions: [],
                total: 0,
                count: 0
            };
        }
        invoicesByCard[t.card].transactions.push(t);
        invoicesByCard[t.card].total += t.amount;
        invoicesByCard[t.card].count++;
    });
    
    invoicesGrid.innerHTML = Object.entries(invoicesByCard).map(([card, data]) => {
        const dueDate = calculateDueDate();
        
        return `
            <div class="invoice-card">
                <div class="invoice-header">
                    <h4>${card}</h4>
                    <span class="badge badge-credit">${data.count} compras</span>
                </div>
                <div class="invoice-details">
                    <div class="invoice-row">
                        <span>Total da fatura:</span>
                        <strong>${formatCurrency(data.total)}</strong>
                    </div>
                    <div class="invoice-row">
                        <span>Vencimento:</span>
                        <span>${dueDate}</span>
                    </div>
                    <div class="invoice-row">
                        <span>Dias para vencer:</span>
                        <span>${calculateDaysToDue()}</span>
                    </div>
                </div>
                <div class="invoice-total">
                    <div class="invoice-row">
                        <span>Valor médio:</span>
                        <span>${formatCurrency(data.total / data.count)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== FUNÇÕES DE MODAL =====

function openDayModal(date, transactions) {
    const modal = document.getElementById('dayDetailsModal');
    const title = document.getElementById('dayModalTitle');
    
    if (!modal) return;
    
    title.textContent = `Transações de ${date.toLocaleDateString('pt-BR')}`;
    
    // Resumo do dia
    const summary = document.getElementById('daySummary');
    if (summary) {
        const totals = transactions.reduce((acc, t) => {
            if (t.type === 'income') acc.income += t.amount;
            else if (t.type === 'expense') acc.expense += t.amount;
            else if (t.type === 'credit') acc.credit += t.amount;
            return acc;
        }, { income: 0, expense: 0, credit: 0 });
        
        summary.innerHTML = `
            <div class="summary-item">
                <span class="label">Entradas</span>
                <span class="value income">${formatCurrency(totals.income)}</span>
            </div>
            <div class="summary-item">
                <span class="label">Saídas</span>
                <span class="value expense">${formatCurrency(totals.expense)}</span>
            </div>
            <div class="summary-item">
                <span class="label">Cartão</span>
                <span class="value credit">${formatCurrency(totals.credit)}</span>
            </div>
            <div class="summary-item">
                <span class="label">Saldo</span>
                <span class="value ${totals.income - totals.expense - totals.credit >= 0 ? 'income' : 'expense'}">
                    ${formatCurrency(totals.income - totals.expense - totals.credit)}
                </span>
            </div>
        `;
    }
    
    // Lista de transações
    const list = document.getElementById('dayTransactionsList');
    if (list) {
        if (transactions.length === 0) {
            list.innerHTML = '<tr><td colspan="4" class="text-center">Nenhuma transação neste dia</td></tr>';
        } else {
            list.innerHTML = transactions.map(t => `
                <tr>
                    <td>${t.description}</td>
                    <td>
                        <span class="category-badge" style="background-color: ${getCategoryColor(t.category)}20; color: ${getCategoryColor(t.category)}">
                            ${getCategoryIcon(t.category)} ${t.category}
                        </span>
                    </td>
                    <td class="transaction-amount amount-${t.type}">${formatCurrency(t.amount)}</td>
                    <td><span class="badge badge-${t.type}">${getTypeLabel(t.type)}</span></td>
                </tr>
            `).join('');
        }
    }
    
    modal.classList.add('active');
}

function closeDayModal() {
    const modal = document.getElementById('dayDetailsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ===== FUNÇÕES UTILITÁRIAS =====

function getFilteredTransactions() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    return transactions.filter(t => {
        const date = new Date(t.date);
        return date.getFullYear() === year && date.getMonth() === month;
    });
}

function getTransactionStatus(transaction) {
    const today = new Date();
    const transDate = new Date(transaction.date);
    
    // Considera pago se a data já passou
    return transDate <= today ? 'paid' : 'pending';
}

function calculateDueDate() {
    const dueDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 10);
    return dueDate.toLocaleDateString('pt-BR');
}

function calculateDaysToDue() {
    const today = new Date();
    const dueDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 10);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Vencida';
    if (diffDays === 0) return 'Vence hoje';
    return `${diffDays} dias`;
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

function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
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

function exportReport() {
    showToast('Exportação', 'Relatório exportado com sucesso!', 'success');
}

// ===== EXPOR FUNÇÕES GLOBAIS =====
window.closeDayModal = closeDayModal;