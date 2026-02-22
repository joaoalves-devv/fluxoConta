// ===== FluxoConta - RELATÓRIOS SCRIPT =====

const STORAGE_KEYS = {
    TRANSACTIONS: 'finance_transactions',
    CATEGORIES: 'finance_categories'
};

let transactions = [];
let categories = [];
let currentPeriod = 'month';
let startDate = null;
let endDate = null;
let barChart = null;
let pieChart = null;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    updatePeriod();
    updateUI();
});

// Adicionar esta verificação no início do arquivo, após as constantes
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se as bibliotecas foram carregadas
    if (typeof window.jspdf === 'undefined') {
        console.warn('jsPDF não carregado. A exportação PDF não funcionará.');
        const exportBtn = document.getElementById('exportPdfBtn');
        if (exportBtn) {
            exportBtn.disabled = true;
            exportBtn.title = 'Biblioteca PDF não carregada';
        }
    }
    
    loadData();
    setupEventListeners();
    updatePeriod();
    updateUI();
});

function loadData() {
    transactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) || [];
    categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || [];
}

function setupEventListeners() {
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('periodSelect').addEventListener('change', handlePeriodChange);
    document.getElementById('applyCustomPeriod').addEventListener('click', applyCustomPeriod);
    document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
    
    window.addEventListener('resize', () => {
        if (barChart || pieChart) {
            updateCharts();
        }
    });
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

// ===== FUNÇÕES DE PERÍODO =====

function handlePeriodChange() {
    currentPeriod = document.getElementById('periodSelect').value;
    
    if (currentPeriod === 'custom') {
        document.getElementById('customPeriodCard').style.display = 'block';
        // Preencher com datas padrão (últimos 30 dias)
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        
        document.getElementById('startDate').value = formatDateISO(start);
        document.getElementById('endDate').value = formatDateISO(end);
    } else {
        document.getElementById('customPeriodCard').style.display = 'none';
        updatePeriod();
        updateUI();
    }
}

function applyCustomPeriod() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    
    if (!start || !end) {
        showToast('Aviso', 'Selecione as datas inicial e final', 'warning');
        return;
    }
    
    if (new Date(start) > new Date(end)) {
        showToast('Erro', 'Data inicial não pode ser maior que data final', 'error');
        return;
    }
    
    startDate = new Date(start);
    endDate = new Date(end);
    endDate.setHours(23, 59, 59); // Incluir o dia final inteiro
    
    updateUI();
}

function updatePeriod() {
    const today = new Date();
    endDate = new Date(today);
    endDate.setHours(23, 59, 59);
    
    switch (currentPeriod) {
        case 'month':
            startDate = new Date(today);
            startDate.setMonth(today.getMonth() - 1);
            break;
        case 'quarter':
            startDate = new Date(today);
            startDate.setMonth(today.getMonth() - 3);
            break;
        case 'semester':
            startDate = new Date(today);
            startDate.setMonth(today.getMonth() - 6);
            break;
        case 'year':
            startDate = new Date(today);
            startDate.setFullYear(today.getFullYear() - 1);
            break;
        default:
            startDate = new Date(today);
            startDate.setMonth(today.getMonth() - 1);
    }
    
    startDate.setHours(0, 0, 0);
}

function getFilteredTransactions() {
    if (!startDate || !endDate) return [];
    
    return transactions.filter(t => {
        const date = new Date(t.date);
        return date >= startDate && date <= endDate;
    });
}

// ===== FUNÇÕES DE UI =====

function updateUI() {
    const filteredTransactions = getFilteredTransactions();
    
    updateSummaryCards(filteredTransactions);
    updateCharts(filteredTransactions);
    updateTopCategories(filteredTransactions);
    updateMonthlyComparison();
    updateStatistics(filteredTransactions);
}

function updateSummaryCards(filteredTransactions) {
    const totals = filteredTransactions.reduce((acc, t) => {
        if (t.type === 'income') acc.income += t.amount;
        else if (t.type === 'expense') acc.expense += t.amount;
        else if (t.type === 'credit') acc.credit += t.amount;
        return acc;
    }, { income: 0, expense: 0, credit: 0 });
    
    const balance = totals.income - totals.expense - totals.credit;
    
    document.getElementById('totalIncomePeriod').textContent = formatCurrency(totals.income);
    document.getElementById('totalExpensePeriod').textContent = formatCurrency(totals.expense + totals.credit);
    document.getElementById('totalCreditPeriod').textContent = formatCurrency(totals.credit);
    document.getElementById('balancePeriod').textContent = formatCurrency(balance);
}

function updateCharts(filteredTransactions) {
    updateBarChart(filteredTransactions);
    updatePieChart(filteredTransactions);
}

function updateBarChart(filteredTransactions) {
    const ctx = document.getElementById('barChart').getContext('2d');
    
    // Agrupar por mês
    const monthlyData = groupTransactionsByMonth(filteredTransactions);
    
    const labels = Object.keys(monthlyData).sort();
    const incomeData = labels.map(month => monthlyData[month].income || 0);
    const expenseData = labels.map(month => (monthlyData[month].expense || 0) + (monthlyData[month].credit || 0));
    
    if (barChart) {
        barChart.destroy();
    }
    
    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(month => formatMonthLabel(month)),
            datasets: [
                {
                    label: 'Entradas',
                    data: incomeData,
                    backgroundColor: 'rgba(46, 204, 113, 0.7)',
                    borderColor: '#27ae60',
                    borderWidth: 1
                },
                {
                    label: 'Saídas',
                    data: expenseData,
                    backgroundColor: 'rgba(231, 76, 60, 0.7)',
                    borderColor: '#c0392b',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function updatePieChart(filteredTransactions) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    
    // Considerar apenas despesas e cartão
    const expenses = filteredTransactions.filter(t => t.type === 'expense' || t.type === 'credit');
    
    // Agrupar por categoria
    const categoryTotals = {};
    expenses.forEach(t => {
        if (!categoryTotals[t.category]) {
            categoryTotals[t.category] = 0;
        }
        categoryTotals[t.category] += t.amount;
    });
    
    // Ordenar e pegar top 7 (o resto vai para "Outros")
    const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1]);
    
    let labels = [];
    let data = [];
    let backgroundColors = [];
    
    if (sortedCategories.length > 7) {
        const topCategories = sortedCategories.slice(0, 6);
        const othersTotal = sortedCategories.slice(6).reduce((sum, [, value]) => sum + value, 0);
        
        labels = [...topCategories.map(([name]) => name), 'Outros'];
        data = [...topCategories.map(([, value]) => value), othersTotal];
    } else {
        labels = sortedCategories.map(([name]) => name);
        data = sortedCategories.map(([, value]) => value);
    }
    
    // Gerar cores baseadas nas categorias
    backgroundColors = labels.map(label => {
        if (label === 'Outros') return '#95a5a6';
        const category = categories.find(c => c.nome === label);
        return category ? category.cor : '#3498db';
    }).map(color => color + '80'); // Adicionar 50% de transparência
    
    if (pieChart) {
        pieChart.destroy();
    }
    
    pieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: 'white',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    return {
                                        text: `${label}: ${formatCurrency(value)}`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: data.datasets[0].borderColor,
                                        lineWidth: data.datasets[0].borderWidth,
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateTopCategories(filteredTransactions) {
    const expenses = filteredTransactions.filter(t => t.type === 'expense' || t.type === 'credit');
    
    const categoryTotals = {};
    expenses.forEach(t => {
        if (!categoryTotals[t.category]) {
            categoryTotals[t.category] = 0;
        }
        categoryTotals[t.category] += t.amount;
    });
    
    const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const container = document.getElementById('topCategoriesList');
    const emptyState = document.getElementById('emptyTopCategories');
    
    if (sortedCategories.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    
    container.innerHTML = sortedCategories.map(([category, amount], index) => {
        const percentage = (amount / total * 100).toFixed(1);
        const categoryData = categories.find(c => c.nome === category);
        const color = categoryData ? categoryData.cor : '#3498db';
        const icon = categoryData ? categoryData.icone : '📌';
        
        let positionClass = '';
        if (index === 0) positionClass = 'gold';
        else if (index === 1) positionClass = 'silver';
        else if (index === 2) positionClass = 'bronze';
        
        return `
            <div class="top-category-item">
                <div class="top-category-position ${positionClass}">${index + 1}</div>
                <div class="top-category-icon" style="background-color: ${color}20;">
                    ${icon}
                </div>
                <div class="top-category-info">
                    <span class="top-category-name">${category}</span>
                    <div class="top-category-details">
                        <span class="top-category-amount">${formatCurrency(amount)}</span>
                        <span class="top-category-percentage">${percentage}%</span>
                    </div>
                    <div class="top-category-bar">
                        <div class="top-category-bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateMonthlyComparison() {
    // Agrupar transações por mês
    const allTransactions = transactions; // Usar todas as transações, não apenas filtradas
    const monthlyData = groupTransactionsByMonth(allTransactions);
    
    const months = Object.keys(monthlyData).sort().slice(-12); // Últimos 12 meses
    
    const tbody = document.getElementById('monthlyComparisonList');
    const tfoot = document.getElementById('monthlyComparisonTotal');
    const emptyState = document.getElementById('emptyMonthlyComparison');
    
    if (months.length === 0) {
        tbody.innerHTML = '';
        if (tfoot) tfoot.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    let totalIncome = 0;
    let totalExpense = 0;
    let totalCredit = 0;
    
    tbody.innerHTML = months.map((month, index) => {
        const data = monthlyData[month];
        const income = data.income || 0;
        const expense = data.expense || 0;
        const credit = data.credit || 0;
        const balance = income - expense - credit;
        
        totalIncome += income;
        totalExpense += expense;
        totalCredit += credit;
        
        // Calcular variação em relação ao mês anterior
        let variation = null;
        if (index > 0) {
            const prevMonth = months[index - 1];
            const prevData = monthlyData[prevMonth];
            const prevTotal = (prevData.expense || 0) + (prevData.credit || 0);
            const currentTotal = expense + credit;
            
            if (prevTotal > 0) {
                variation = ((currentTotal - prevTotal) / prevTotal * 100).toFixed(1);
            }
        }
        
        return `
            <tr>
                <td><strong>${formatMonthLabel(month)}</strong></td>
                <td class="amount-income">${formatCurrency(income)}</td>
                <td class="amount-expense">${formatCurrency(expense)}</td>
                <td class="amount-credit">${formatCurrency(credit)}</td>
                <td class="${balance >= 0 ? 'amount-income' : 'amount-expense'}">${formatCurrency(balance)}</td>
                <td>
                    ${variation ? `
                        <span class="${variation >= 0 ? 'positive-variation' : 'negative-variation'}">
                            ${variation >= 0 ? '↑' : '↓'} ${Math.abs(variation)}%
                        </span>
                    ` : '-'}
                </td>
            </tr>
        `;
    }).join('');
    
    const totalBalance = totalIncome - totalExpense - totalCredit;
    
    tfoot.innerHTML = `
        <tr>
            <td><strong>TOTAL</strong></td>
            <td class="amount-income"><strong>${formatCurrency(totalIncome)}</strong></td>
            <td class="amount-expense"><strong>${formatCurrency(totalExpense)}</strong></td>
            <td class="amount-credit"><strong>${formatCurrency(totalCredit)}</strong></td>
            <td class="${totalBalance >= 0 ? 'amount-income' : 'amount-expense'}"><strong>${formatCurrency(totalBalance)}</strong></td>
            <td><strong>-</strong></td>
        </tr>
    `;
}

function updateStatistics(filteredTransactions) {
    const incomes = filteredTransactions.filter(t => t.type === 'income');
    const expenses = filteredTransactions.filter(t => t.type === 'expense' || t.type === 'credit');
    const creditTransactions = filteredTransactions.filter(t => t.type === 'credit' && t.installment && t.totalInstallments);
    
    // Média de gastos por mês
    const monthsInPeriod = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 30)));
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const avgMonthlyExpense = totalExpenses / monthsInPeriod;
    
    // Categoria que mais gasta
    const categoryTotals = {};
    expenses.forEach(t => {
        if (!categoryTotals[t.category]) categoryTotals[t.category] = 0;
        categoryTotals[t.category] += t.amount;
    });
    
    let topCategory = '-';
    if (Object.keys(categoryTotals).length > 0) {
        const top = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
        topCategory = `${top[0]} (${formatCurrency(top[1])})`;
    }
    
    // Total em compras parceladas
    const totalInstallments = creditTransactions.reduce((sum, t) => {
        // Apenas a parcela atual
        return sum + t.amount;
    }, 0);
    
    // Maior entrada
    const largestIncome = incomes.length > 0 ? Math.max(...incomes.map(t => t.amount)) : 0;
    
    // Maior despesa
    const largestExpense = expenses.length > 0 ? Math.max(...expenses.map(t => t.amount)) : 0;
    
    // Taxa de poupança
    const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0;
    
    document.getElementById('avgMonthlyExpense').textContent = formatCurrency(avgMonthlyExpense);
    document.getElementById('topSpendingCategory').textContent = topCategory;
    document.getElementById('totalInstallments').textContent = formatCurrency(totalInstallments);
    document.getElementById('largestIncome').textContent = formatCurrency(largestIncome);
    document.getElementById('largestExpense').textContent = formatCurrency(largestExpense);
    document.getElementById('savingsRate').textContent = savingsRate + '%';
}

// ===== FUNÇÕES UTILITÁRIAS =====

function groupTransactionsByMonth(transactionsList) {
    const groups = {};
    
    transactionsList.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!groups[monthKey]) {
            groups[monthKey] = { income: 0, expense: 0, credit: 0 };
        }
        
        groups[monthKey][t.type] += t.amount;
    });
    
    return groups;
}

function formatMonthLabel(monthKey) {
    const [year, month] = monthKey.split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${monthNames[parseInt(month) - 1]}/${year}`;
}

function formatDateISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
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

function exportToPDF() {
    showToast('Exportação', 'Gerando PDF do relatório...', 'info');
    
    try {
        // Verificar se a biblioteca está carregada
        if (typeof window.jspdf === 'undefined') {
            throw new Error('Biblioteca jsPDF não carregada');
        }
        
        // Criar novo documento PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configurar fonte padrão
        doc.setFont('helvetica');
        
        // Título do relatório
        doc.setFontSize(18);
        doc.setTextColor(46, 204, 113); // Verde primary
        doc.text('FluxoConta - Relatório Financeiro', 14, 22);
        
        // Período
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        let periodText = '';
        
        if (currentPeriod === 'custom' && startDate && endDate) {
            periodText = `Período: ${formatDateToBR(startDate)} a ${formatDateToBR(endDate)}`;
        } else {
            const periodLabels = {
                'month': 'Último mês',
                'quarter': 'Último trimestre',
                'semester': 'Último semestre',
                'year': 'Último ano'
            };
            periodText = `Período: ${periodLabels[currentPeriod] || 'Personalizado'}`;
        }
        doc.text(periodText, 14, 32);
        
        // Data de geração
        const today = new Date();
        doc.text(`Gerado em: ${today.toLocaleDateString('pt-BR')} às ${today.toLocaleTimeString('pt-BR')}`, 14, 38);
        
        // Linha separadora
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 42, 196, 42);
        
        // Buscar dados
        const filteredTransactions = getFilteredTransactions();
        
        // Calcular totais
        const totals = filteredTransactions.reduce((acc, t) => {
            if (t.type === 'income') acc.income += t.amount;
            else if (t.type === 'expense') acc.expense += t.amount;
            else if (t.type === 'credit') acc.credit += t.amount;
            return acc;
        }, { income: 0, expense: 0, credit: 0 });
        
        const balance = totals.income - totals.expense - totals.credit;
        
        // Resumo Financeiro
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Resumo Financeiro', 14, 52);
        
        doc.setFontSize(11);
        
        // Entradas
        doc.setTextColor(46, 204, 113);
        doc.text(`Entradas: ${formatCurrency(totals.income)}`, 20, 62);
        
        // Saídas (inclui despesas e cartão)
        doc.setTextColor(231, 76, 60);
        doc.text(`Saídas: ${formatCurrency(totals.expense + totals.credit)}`, 20, 70);
        
        // Cartão (separado)
        doc.setTextColor(243, 156, 18);
        doc.text(`Cartão: ${formatCurrency(totals.credit)}`, 20, 78);
        
        // Saldo
        doc.setTextColor(balance >= 0 ? 46 : 231, balance >= 0 ? 204 : 76, balance >= 0 ? 113 : 60);
        doc.text(`Saldo: ${formatCurrency(balance)}`, 20, 86);
        
        // Top 5 Categorias
        const expenses = filteredTransactions.filter(t => t.type === 'expense' || t.type === 'credit');
        const categoryTotals = {};
        expenses.forEach(t => {
            if (!categoryTotals[t.category]) categoryTotals[t.category] = 0;
            categoryTotals[t.category] += t.amount;
        });
        
        const sortedCategories = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        if (sortedCategories.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Top 5 Categorias de Gastos', 14, 104);
            
            let yPos = 114;
            sortedCategories.forEach(([category, amount], index) => {
                doc.setFontSize(11);
                doc.setTextColor(100, 100, 100);
                doc.text(`${index + 1}. ${category}`, 20, yPos);
                doc.setTextColor(231, 76, 60);
                doc.text(formatCurrency(amount), 120, yPos);
                yPos += 8;
            });
        }
        
        // Tabela de Transações do Período
        if (filteredTransactions.length > 0) {
            doc.addPage();
            
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Transações do Período', 14, 22);
            
            // Preparar dados para a tabela
            const tableData = filteredTransactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map(t => [
                    formatDate(t.date),
                    t.description.substring(0, 30), // Limitar descrição
                    t.category,
                    t.type === 'income' ? 'Entrada' : (t.type === 'expense' ? 'Saída' : 'Cartão'),
                    formatCurrency(t.amount)
                ]);
            
            // Usar autoTable
            doc.autoTable({
                startY: 30,
                head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
                body: tableData,
                theme: 'striped',
                headStyles: {
                    fillColor: [46, 204, 113],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 10
                },
                bodyStyles: {
                    fontSize: 9
                },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 50 },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 35, halign: 'right' }
                },
                margin: { left: 14, right: 14 },
                didDrawPage: function(data) {
                    // Rodapé
                    doc.setFontSize(8);
                    doc.setTextColor(150, 150, 150);
                    doc.text(
                        `Página ${doc.getCurrentPageInfo().pageNumber}`,
                        data.settings.margin.left,
                        doc.internal.pageSize.height - 10
                    );
                }
            });
        }
        
        // Estatísticas Adicionais
        doc.addPage();
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Estatísticas Detalhadas', 14, 22);
        
        // Calcular estatísticas
        const incomes = filteredTransactions.filter(t => t.type === 'income');
        const allExpenses = filteredTransactions.filter(t => t.type === 'expense' || t.type === 'credit');
        const creditTransactions = filteredTransactions.filter(t => t.type === 'credit' && t.installment);
        
        const monthsInPeriod = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 30)));
        const totalExpenses = allExpenses.reduce((sum, t) => sum + t.amount, 0);
        const avgMonthlyExpense = totalExpenses / monthsInPeriod;
        
        const totalInstallments = creditTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        const largestIncome = incomes.length > 0 ? Math.max(...incomes.map(t => t.amount)) : 0;
        const largestExpense = allExpenses.length > 0 ? Math.max(...allExpenses.map(t => t.amount)) : 0;
        
        const uniqueDays = new Set(filteredTransactions.map(t => t.date)).size;
        
        const stats = [
            ['Média de Gastos por Mês', formatCurrency(avgMonthlyExpense)],
            ['Total em Compras Parceladas', formatCurrency(totalInstallments)],
            ['Maior Entrada', formatCurrency(largestIncome)],
            ['Maior Despesa', formatCurrency(largestExpense)],
            ['Número de Transações', filteredTransactions.length.toString()],
            ['Dias com Movimentação', uniqueDays.toString()]
        ];
        
        let yPos = 32;
        stats.forEach(([label, value]) => {
            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text(label, 20, yPos);
            doc.setTextColor(0, 0, 0);
            doc.text(value, 120, yPos);
            yPos += 8;
        });
        
        // Salvar PDF
        const fileName = `relatorio_financeiro_${formatDateISO(new Date())}.pdf`;
        doc.save(fileName);
        
        showToast('Sucesso', 'PDF gerado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro detalhado ao gerar PDF:', error);
        showToast('Erro', `Falha ao gerar PDF: ${error.message}`, 'error');
    }
}

// Função auxiliar para formatar data no padrão brasileiro
function formatDateToBR(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
}

// Função auxiliar para formatar data (já existe, mas vou garantir)
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}