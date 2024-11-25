document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const successOverlay = document.getElementById('successOverlay');

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = {
            username: this.username.value,
            password: this.password.value,
            confirmPassword: this.confirmPassword.value,
            securityQuestion: this.securityQuestion.value,
            securityAnswer: this.securityAnswer.value
        };

        // 验证密码
        if (formData.password !== formData.confirmPassword) {
            alert('两次输入的密码不一致');
            return;
        }

        try {
            // 调用 authManager 的注册方法
            if (await authManager.register(formData)) {
                // 显示成功提示
                successOverlay.style.display = 'flex';

                // 延迟跳转回首页
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
        } catch (error) {
            console.error('Register error:', error);
            alert(error.message || '注册失败，请稍后重试');
        }
    });
}); 