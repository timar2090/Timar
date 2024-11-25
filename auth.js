class AuthManager {
    constructor() {
        this.isLoggedIn = false;
        this.isVip = false;
        this.token = null;
        this.username = null;

        // 初始化用户数据库
        if (!localStorage.getItem('users')) {
            localStorage.setItem('users', JSON.stringify([]));
        }

        this.checkLoginStatus();
    }

    // 检查登录状态
    checkLoginStatus() {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        
        if (token && username && isLoggedIn === 'true') {
            this.isLoggedIn = true;
            this.token = token;
            this.username = username;
            this.updateUIForLogin();
            this.checkVipStatus();
        }
    }

    // 登录
    async login(username, password) {
        try {
            // 从本地存储获取用户列表
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.username === username && u.password === password);

            if (!user) {
                throw new Error('用户名或密码错误');
            }

            // 生成模拟token
            const token = 'mock_token_' + Date.now();
            this.token = token;
            this.username = username;
            this.isLoggedIn = true;
            this.isVip = user.isVip || false;

            // 保存到本地存储
            localStorage.setItem('token', token);
            localStorage.setItem('username', username);
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('isVip', user.isVip || false);

            this.updateUIForLogin();
            return true;
        } catch (error) {
            console.error('Login error:', error);
            alert(error.message);
            return false;
        }
    }

    // 注册
    async register(userData) {
        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            
            // 检查用户名是否已存在
            if (users.some(u => u.username === userData.username)) {
                throw new Error('用户名已存在');
            }

            // 创建新用户
            const newUser = {
                id: users.length + 1,
                username: userData.username,
                password: userData.password,
                securityQuestion: userData.securityQuestion,
                securityAnswer: userData.securityAnswer,
                isVip: false,
                createTime: new Date().toISOString()
            };

            // 保存用户信息
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));

            // 自动登录
            return await this.login(userData.username, userData.password);
        } catch (error) {
            console.error('Register error:', error);
            alert(error.message);
            return false;
        }
    }

    // 登出
    logout() {
        this.isLoggedIn = false;
        this.token = null;
        this.username = null;
        this.isVip = false;
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('isLoggedIn');
        this.updateUIForLogout();
    }

    // 更新UI显示登录状态
    updateUIForLogin() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const vipBtn = document.querySelector('.vip-btn');
        
        if (loginBtn) loginBtn.textContent = this.username;
        if (registerBtn) registerBtn.textContent = '退出';
        if (vipBtn && this.isVip) vipBtn.textContent = 'VIP会员';
    }

    // 更新UI显示登出状态
    updateUIForLogout() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const vipBtn = document.querySelector('.vip-btn');
        
        if (loginBtn) loginBtn.textContent = '登录';
        if (registerBtn) registerBtn.textContent = '注册';
        if (vipBtn) vipBtn.textContent = '开通会员';
    }

    // 检查VIP状态
    async checkVipStatus() {
        const isVip = localStorage.getItem('isVip') === 'true';
        this.isVip = isVip;
        this.updateVipUI();
    }

    // 更新VIP状态UI
    updateVipUI() {
        const vipBtn = document.querySelector('.vip-btn');
        if (vipBtn) {
            vipBtn.textContent = this.isVip ? 'VIP会员' : '开通会员';
        }
    }
}

// 创建全局的认证管理器实例
const authManager = new AuthManager();

// 初始化UI事件
document.addEventListener('DOMContentLoaded', function() {
    // 添加登录弹窗到页面
    createLoginModal();

    // 绑定事件
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const loginModal = document.getElementById('loginModal');

    // 登录按钮点击事件
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (!authManager.isLoggedIn) {
                loginModal.style.display = 'flex';
            }
        });
    }

    // 注册/退出按钮点击事件
    if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (authManager.isLoggedIn) {
                authManager.logout();
            } else {
                window.location.href = 'register.html';
            }
        });
    }

    // 关闭按钮事件
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            loginModal.style.display = 'none';
        });
    });

    // 处理登录表单提交
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = this.username.value;
        const password = this.password.value;
        
        if (await authManager.login(username, password)) {
            loginModal.style.display = 'none';
            alert('登录成功！');
            window.location.reload(); // 刷新页面以更新状态
        } else {
            alert('登录失败，请检查用户名和密码');
        }
    });
});

function createLoginModal() {
    const modalHTML = `
        <div class="modal-overlay" id="loginModal">
            <div class="modal">
                <span class="modal-close">&times;</span>
                <h2 style="text-align: center; margin-bottom: 20px; color: #333;">登录</h2>
                <form class="auth-form" id="loginForm">
                    <div class="form-group">
                        <label for="loginUsername">用户名</label>
                        <input type="text" id="loginUsername" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="loginPassword">密码</label>
                        <input type="password" id="loginPassword" name="password" required>
                    </div>
                    <button type="submit" class="auth-btn">登录</button>
                    <div class="auth-switch">
                        <span>还没有账号？</span>
                        <a href="register.html">立即注册</a>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}