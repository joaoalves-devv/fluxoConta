// ===== FluxoConta - LOGIN SCRIPT =====

const STORAGE_KEYS = {
    USERS: 'finance_users',
    CURRENT_USER: 'finance_current_user',
    SESSION: 'finance_session'
};

let users = [];
let currentUser = null;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    checkSession();
    setupEventListeners();
});

function loadData() {
    // Carregar usuários do localStorage
    users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
    currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) || null;
}

function checkSession() {
    // Verificar se já existe uma sessão ativa
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    const rememberMe = localStorage.getItem('remember_me');
    
    if (session && rememberMe === 'true' && currentUser) {
        // Se tiver sessão e "lembrar-me" estiver ativo, redirecionar
        redirectToDashboard();
    }
}

function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Enter key para login
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    });
}

// ===== FUNÇÕES DE ABA =====

function switchTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    }
}

// ===== FUNÇÕES DE LOGIN =====

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Validações básicas
    if (!email || !password) {
        showToast('Erro', 'Preencha todos os campos', 'error');
        return;
    }
    
    // Mostrar loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
    submitBtn.disabled = true;
    
    try {
        // Simular delay de rede
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Buscar usuário
        const user = users.find(u => u.email === email);
        
        if (!user) {
            showToast('Erro', 'Usuário não encontrado', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        // Verificar senha (em produção, isso seria feito no backend)
        if (user.password !== password) {
            showToast('Erro', 'Senha incorreta', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        // Login bem-sucedido
        currentUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt
        };
        
        // Salvar sessão
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
        localStorage.setItem(STORAGE_KEYS.SESSION, 'true');
        localStorage.setItem('remember_me', rememberMe);
        
        showToast('Sucesso', `Bem-vindo, ${user.name}!`, 'success');
        
        // Redirecionar
        setTimeout(() => {
            redirectToDashboard();
        }, 1000);
        
    } catch (error) {
        console.error('Erro no login:', error);
        showToast('Erro', 'Falha ao fazer login', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const acceptTerms = document.getElementById('acceptTerms').checked;
    
    // Validações
    if (!name || !email || !password || !confirmPassword) {
        showToast('Erro', 'Preencha todos os campos', 'error');
        return;
    }
    
    if (!acceptTerms) {
        showToast('Erro', 'Você deve aceitar os termos de uso', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Erro', 'A senha deve ter no mínimo 6 caracteres', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Erro', 'As senhas não coincidem', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showToast('Erro', 'E-mail inválido', 'error');
        return;
    }
    
    // Mostrar loading
    const submitBtn = document.querySelector('#registerForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
    submitBtn.disabled = true;
    
    try {
        // Simular delay de rede
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Verificar se usuário já existe
        if (users.some(u => u.email === email)) {
            showToast('Erro', 'E-mail já cadastrado', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            return;
        }
        
        // Criar novo usuário
        const newUser = {
            id: generateId(),
            name: name,
            email: email,
            password: password, // Em produção, isso seria hash
            createdAt: new Date().toISOString(),
            preferences: {
                currency: 'BRL',
                theme: 'light'
            }
        };
        
        users.push(newUser);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        
        showToast('Sucesso', 'Cadastro realizado com sucesso!', 'success');
        
        // Limpar formulário e mudar para aba de login
        document.getElementById('registerForm').reset();
        switchTab('login');
        
        // Pré-preencher email
        document.getElementById('loginEmail').value = email;
        
    } catch (error) {
        console.error('Erro no cadastro:', error);
        showToast('Erro', 'Falha ao realizar cadastro', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ===== FUNÇÕES DE UTILIDADE =====

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

function redirectToDashboard() {
    window.location.href = 'dashboard.html';
}

// ===== FUNÇÕES DE INTERAÇÃO =====

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function forgotPassword() {
    showToast('Info', 'Função de recuperação de senha em desenvolvimento', 'info');
}

function showTerms() {
    document.getElementById('termsModal').classList.add('active');
}

function closeTermsModal() {
    document.getElementById('termsModal').classList.remove('active');
}

// ===== MODO DEMONSTRAÇÃO =====

async function enterDemoMode() {
    const demoBtn = document.querySelector('.demo-mode .btn');
    const originalText = demoBtn.innerHTML;
    demoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
    demoBtn.disabled = true;
    
    try {
        // Simular delay
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Criar usuário demo
        const demoUser = {
            id: 'demo-' + generateId(),
            name: 'Usuário Demonstração',
            email: 'demo@financecontrol.com',
            type: 'demo'
        };
        
        // Criar dados de exemplo para demonstração
        createDemoData();
        
        // Salvar sessão demo
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(demoUser));
        localStorage.setItem(STORAGE_KEYS.SESSION, 'true');
        localStorage.setItem('demo_mode', 'true');
        
        showToast('Sucesso', 'Bem-vindo ao modo demonstração!', 'success');
        
        // Redirecionar
        setTimeout(() => {
            redirectToDashboard();
        }, 1000);
        
    } catch (error) {
        console.error('Erro ao entrar em modo demo:', error);
        showToast('Erro', 'Falha ao entrar em modo demonstração', 'error');
        demoBtn.innerHTML = originalText;
        demoBtn.disabled = false;
    }
}

function createDemoData() {
    // Criar categorias de exemplo
    const demoCategories = [
        { id: 1, nome: 'Salário', tipo: 'income', cor: '#2ecc71', icone: '💼', orcamento: 5000 },
        { id: 2, nome: 'Freelance', tipo: 'income', cor: '#3498db', icone: '💻', orcamento: 2000 },
        { id: 3, nome: 'Alimentação', tipo: 'expense', cor: '#e74c3c', icone: '🍔', orcamento: 800 },
        { id: 4, nome: 'Transporte', tipo: 'expense', cor: '#f39c12', icone: '🚗', orcamento: 300 },
        { id: 5, nome: 'Moradia', tipo: 'expense', cor: '#1abc9c', icone: '🏠', orcamento: 1500 },
        { id: 6, nome: 'Compras', tipo: 'credit', cor: '#f1c40f', icone: '🛍️', orcamento: 500 },
        { id: 7, nome: 'Lazer', tipo: 'credit', cor: '#e91e63', icone: '🎮', orcamento: 400 },
        { id: 8, nome: 'Assinaturas', tipo: 'credit', cor: '#00bcd4', icone: '📺', orcamento: 150 }
    ];
    
    // Criar transações de exemplo
    const demoTransactions = [];
    const today = new Date();
    
    // Receitas do mês
    demoTransactions.push({
        id: Date.now() + 1,
        type: 'income',
        date: formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 5)),
        description: 'Salário',
        category: 'Salário',
        amount: 5000
    });
    
    demoTransactions.push({
        id: Date.now() + 2,
        type: 'income',
        date: formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 15)),
        description: 'Freelance - Site',
        category: 'Freelance',
        amount: 1500
    });
    
    // Despesas do mês
    demoTransactions.push({
        id: Date.now() + 3,
        type: 'expense',
        date: formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 2)),
        description: 'Aluguel',
        category: 'Moradia',
        amount: 1200
    });
    
    demoTransactions.push({
        id: Date.now() + 4,
        type: 'expense',
        date: formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 3)),
        description: 'Supermercado',
        category: 'Alimentação',
        amount: 350.50
    });
    
    demoTransactions.push({
        id: Date.now() + 5,
        type: 'expense',
        date: formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 4)),
        description: 'Uber',
        category: 'Transporte',
        amount: 35.80
    });
    
    // Compras no cartão
    demoTransactions.push({
        id: Date.now() + 6,
        type: 'credit',
        date: formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 1)),
        description: 'Netflix',
        category: 'Assinaturas',
        amount: 45.90,
        card: 'Nubank',
        installment: 1,
        totalInstallments: 1
    });
    
    demoTransactions.push({
        id: Date.now() + 7,
        type: 'credit',
        date: formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 8)),
        description: 'Amazon',
        category: 'Compras',
        amount: 299.90,
        card: 'PicPay',
        installment: 1,
        totalInstallments: 3
    });
    
    demoTransactions.push({
        id: Date.now() + 8,
        type: 'credit',
        date: formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 12)),
        description: 'Cinema',
        category: 'Lazer',
        amount: 80.00,
        card: 'Nubank',
        installment: 1,
        totalInstallments: 1
    });
    
    // Salvar dados demo
    localStorage.setItem('finance_categories', JSON.stringify(demoCategories));
    localStorage.setItem('finance_transactions', JSON.stringify(demoTransactions));
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ===== FUNÇÕES DE TOAST =====

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
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// ===== FUNÇÕES DE LOGOUT =====

function logout() {
    // Remover dados da sessão
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem('remember_me');
    localStorage.removeItem('demo_mode');
    
    // Redirecionar para login
    window.location.href = 'login.html';
}

// ===== EXPOR FUNÇÕES GLOBAIS =====
window.switchTab = switchTab;
window.togglePassword = togglePassword;
window.forgotPassword = forgotPassword;
window.showTerms = showTerms;
window.closeTermsModal = closeTermsModal;
window.enterDemoMode = enterDemoMode;
window.logout = logout;