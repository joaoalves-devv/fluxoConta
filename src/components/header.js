// ===== FluxoConta - HEADER COMPONENT =====

class FinanceHeader {
    constructor() {
        this.currentUser = null;
        this.demoMode = false;
        this.init();
    }
    
    init() {
        this.loadUserData();
        this.render();
        this.setupEventListeners();
    }
    
    loadUserData() {
        try {
            this.currentUser = JSON.parse(localStorage.getItem('finance_current_user'));
            this.demoMode = localStorage.getItem('demo_mode') === 'true';
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        }
    }
    
    render() {
        const header = document.querySelector('.header');
        if (!header) return;
        
        const currentPage = this.getCurrentPage();
        const pageTitle = this.getPageTitle(currentPage);
        const hasExport = this.pageHasExport(currentPage);
        const hasTemplate = this.pageHasTemplate(currentPage);
        
        header.innerHTML = `
            <div class="header-left">
                <button class="menu-toggle" id="menuToggle">
                    <i class="fas fa-bars"></i>
                </button>
                <h1 class="page-title">${pageTitle}</h1>
            </div>
            
            <div class="header-right">
                ${hasTemplate ? this.getTemplateButton() : ''}
                ${hasExport ? this.getExportButton(currentPage) : ''}
                
                <div class="month-selector" id="monthSelector" style="${currentPage === 'dashboard' || currentPage === 'fluxo-caixa' || currentPage === 'categorias' ? 'display: flex;' : 'display: none;'}">
                    <button id="prevMonth"><i class="fas fa-chevron-left"></i></button>
                    <span id="currentMonth">${this.getCurrentMonth()}</span>
                    <button id="nextMonth"><i class="fas fa-chevron-right"></i></button>
                </div>
                
                <div class="period-selector" id="periodSelector" style="${currentPage === 'relatorios' ? 'display: block;' : 'display: none;'}">
                    <select class="form-control" id="periodSelect">
                        <option value="month">Último mês</option>
                        <option value="quarter">Último trimestre</option>
                        <option value="semester">Último semestre</option>
                        <option value="year">Último ano</option>
                        <option value="custom">Personalizado</option>
                    </select>
                </div>
                
                <div class="user-info" id="userInfo">
                    <div class="user-avatar">
                        ${this.getUserAvatar()}
                    </div>
                    <div class="user-details">
                        <span class="user-name">
                            ${this.currentUser?.name || 'Usuário'}
                            ${this.demoMode ? '<span class="badge badge-info" style="font-size: 0.6rem; margin-left: 4px;">Demo</span>' : ''}
                        </span>
                        <span class="user-email">${this.currentUser?.email || 'usuario@email.com'}</span>
                    </div>
                </div>
                
                <!-- Menu dropdown separado -->
                <div class="user-menu" id="userMenu">
                    <div class="user-menu-header">
                        <div class="user-menu-avatar">
                            ${this.getUserAvatar()}
                        </div>
                        <div class="user-menu-info">
                            <strong>${this.currentUser?.name || 'Usuário'}</strong>
                            <span>${this.currentUser?.email || 'usuario@email.com'}</span>
                        </div>
                    </div>
                    
                    <div class="user-menu-divider"></div>
                    
                    <div class="user-menu-item" onclick="window.location.href='dashboard.html'">
                        <i class="fas fa-home"></i> Dashboard
                    </div>
                    <div class="user-menu-item" onclick="window.location.href='categorias.html'">
                        <i class="fas fa-tags"></i> Categorias
                    </div>
                    <div class="user-menu-item" onclick="window.location.href='fluxo-caixa.html'">
                        <i class="fas fa-calendar-alt"></i> Fluxo de Caixa
                    </div>
                    <div class="user-menu-item" onclick="window.location.href='relatorios.html'">
                        <i class="fas fa-chart-bar"></i> Relatórios
                    </div>
                    <div class="user-menu-item" onclick="window.location.href='importar.html'">
                        <i class="fas fa-file-import"></i> Importar
                    </div>
                    
                    <div class="user-menu-divider"></div>
                    
                    <div class="user-menu-item" onclick="FinanceHeader.logout()">
                        <i class="fas fa-sign-out-alt"></i> Sair
                    </div>
                </div>
            </div>
        `;
        
        // REMOVIDO: updateSidebar() - não mexemos mais na sidebar
        
        // Adicionar overlay para menu
        this.addMenuOverlay();
        
        // Disparar evento de header carregado
        document.dispatchEvent(new CustomEvent('headerLoaded', { 
            detail: { currentPage: currentPage }
        }));
    }
    
    // REMOVIDO: método updateSidebar() completamente
    
    getUserAvatar() {
        if (this.currentUser?.name) {
            return this.currentUser.name.charAt(0).toUpperCase();
        }
        return 'U';
    }
    
    getCurrentPage() {
        const path = window.location.pathname.split('/').pop();
        return path.replace('.html', '');
    }
    
    getPageTitle(page) {
        const titles = {
            'dashboard': 'Dashboard',
            'categorias': 'Categorias',
            'fluxo-caixa': 'Fluxo de Caixa',
            'relatorios': 'Relatórios e Análises',
            'importar': 'Importar Dados',
            'index': 'FluxoConta',
            'login': 'Login'
        };
        return titles[page] || 'FluxoConta';
    }
    
    pageHasExport(page) {
        return ['relatorios', 'fluxo-caixa'].includes(page);
    }
    
    pageHasTemplate(page) {
        return page === 'importar';
    }
    
    getTemplateButton() {
        return `
            <button class="btn btn-sm btn-outline" id="downloadTemplateBtn" title="Baixar modelo">
                <i class="fas fa-download"></i> Modelo
            </button>
        `;
    }
    
    getExportButton(page) {

     if (page === 'fluxo-caixa') {
            return `
                <button class="btn btn-sm btn-outline" id="exportBtn" title="Exportar relatório">
                    <i class="fas fa-download"></i> Exportar
                </button>
            `;
        }
        return '';
    }
    
    getCurrentMonth() {
        const date = new Date();
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                           'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    }
    
    setupEventListeners() {
        // Menu toggle
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelector('.sidebar').classList.toggle('active');
            });
        }
        
        // User menu toggle
        const userInfo = document.getElementById('userInfo');
        const userMenu = document.getElementById('userMenu');
        
        if (userInfo && userMenu) {
            userInfo.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                document.querySelectorAll('.user-menu.active').forEach(menu => {
                    if (menu !== userMenu) menu.classList.remove('active');
                });
                
                userMenu.classList.toggle('active');
                
                const overlay = document.getElementById('menuOverlay');
                if (overlay) {
                    if (userMenu.classList.contains('active')) {
                        overlay.classList.add('active');
                    } else {
                        overlay.classList.remove('active');
                    }
                }
            });
        }
        
        // Fechar menu ao clicar fora
        document.addEventListener('click', (e) => {
            const userMenu = document.getElementById('userMenu');
            const userInfo = document.getElementById('userInfo');
            const overlay = document.getElementById('menuOverlay');
            
            if (userMenu && userInfo && overlay && 
                !userInfo.contains(e.target) && 
                !userMenu.contains(e.target)) {
                userMenu.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
        
        // Previnir fechamento ao clicar no menu
        userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }
    
    addMenuOverlay() {
        if (!document.getElementById('menuOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'menuOverlay';
            overlay.className = 'menu-overlay';
            document.body.appendChild(overlay);
        }
    }
    
    static logout() {
        localStorage.removeItem('finance_session');
        localStorage.removeItem('finance_current_user');
        localStorage.removeItem('remember_me');
        localStorage.removeItem('demo_mode');
        window.location.href = 'login.html';
    }
}

// Inicializar header automaticamente
(function initHeader() {
    if (document.querySelector('.header') && !window.location.pathname.includes('login.html')) {
        window.financeHeader = new FinanceHeader();
    }
})();