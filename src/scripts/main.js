// ===== FluxoConta - MAIN SCRIPT (VERIFICAÇÃO DE AUTENTICAÇÃO) =====

// Verificar autenticação em todas as páginas (exceto login)
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();
    
    // Não verificar na página de login
    if (currentPage === 'login.html') {
        return;
    }
    
    // Verificar se usuário está logado
    const session = localStorage.getItem('finance_session');
    const currentUser = localStorage.getItem('finance_current_user');
    
    if (!session || !currentUser) {
        // Se não estiver logado, redirecionar para login
        window.location.href = 'login.html';
        return;
    }
    
    // Atualizar informações do usuário no header
    updateUserInfo();
});

function updateUserInfo() {
    const userInfo = document.querySelector('.user-info');
    const userAvatar = document.querySelector('.user-avatar');
    const userName = document.querySelector('.user-name');
    const userEmail = document.querySelector('.user-email');
    
    if (!userInfo) return;
    
    try {
        const currentUser = JSON.parse(localStorage.getItem('finance_current_user'));
        const demoMode = localStorage.getItem('demo_mode') === 'true';
        
        if (currentUser) {
            if (userAvatar) {
                userAvatar.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
            }
            if (userName) {
                userName.textContent = currentUser.name || 'Usuário';
                if (demoMode) {
                    userName.innerHTML += ' <span class="badge badge-info" style="font-size: 0.6rem;">Demo</span>';
                }
            }
            if (userEmail) {
                userEmail.textContent = currentUser.email || 'usuario@email.com';
            }
            
            // Adicionar menu de logout
            addLogoutMenu(userInfo);
        }
    } catch (error) {
        console.error('Erro ao atualizar informações do usuário:', error);
    }
}

function addLogoutMenu(userElement) {
    // Verificar se já existe
    if (document.getElementById('logoutMenu')) return;
    
    // Criar menu dropdown
    const logoutMenu = document.createElement('div');
    logoutMenu.id = 'logoutMenu';
    logoutMenu.className = 'logout-menu';
    logoutMenu.innerHTML = `
        <div class="logout-menu-item" onclick="logout()">
            <i class="fas fa-sign-out-alt"></i> Sair
        </div>
    `;
    
    // Adicionar ao DOM
    userElement.appendChild(logoutMenu);
    
    // Toggle menu ao clicar no usuário
    userElement.addEventListener('click', (e) => {
        e.stopPropagation();
        logoutMenu.classList.toggle('active');
    });
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', () => {
        logoutMenu.classList.remove('active');
    });
}

// Função de logout global
window.logout = function() {
    localStorage.removeItem('finance_session');
    localStorage.removeItem('finance_current_user');
    localStorage.removeItem('remember_me');
    localStorage.removeItem('demo_mode');
    window.location.href = 'login.html';
};