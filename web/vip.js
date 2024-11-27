document.addEventListener('DOMContentLoaded', function() {
    const priceCards = document.querySelectorAll('.price-card');
    const payAmount = document.getElementById('payAmount');
    const paymentStatus = document.getElementById('paymentStatus');
    const qrCodeImg = document.getElementById('qrCodeImg');
    const backBtn = document.getElementById('backBtn');

    // 选择价格套餐
    priceCards.forEach(card => {
        card.addEventListener('click', function() {
            // 移除其他卡片的选中状态
            priceCards.forEach(c => c.classList.remove('selected'));
            // 添加当前卡片的选中状态
            this.classList.add('selected');
            // 更新支付金额
            const price = this.getAttribute('data-price');
            payAmount.textContent = `¥${price}`;
            // 更新二维码
            updateQRCode(price);
        });
    });

    // 更新二维码的函数
    async function updateQRCode(price) {
        try {
            if (!authManager.isLoggedIn) {
                alert('请先登录');
                window.location.href = 'index.html';
                return;
            }

            // 显示加载状态
            qrCodeImg.style.display = 'none';
            paymentStatus.innerHTML = '<div class="status-text">正在生成支付码...</div>';

            // 调用 PhoenixDivine 接口
            const response = await fetch('/api/phoenix-divine/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authManager.token}`
                },
                body: JSON.stringify({
                    amount: price,
                    user_name: authManager.username
                })
            });

            if (!response.ok) {
                throw new Error('创建订单失败');
            }

            const data = await response.json();
            
            // 显示二维码
            qrCodeImg.style.display = 'block';
            qrCodeImg.src = data.qrCodeUrl;
            paymentStatus.innerHTML = '<div class="status-text">请使用微信扫码支付</div>';
            
            // 开始轮询支付状态
            startPaymentCheck(data.orderId);

        } catch (error) {
            console.error('Error:', error);
            paymentStatus.innerHTML = `
                <div class="status-text" style="color: #ff4444;">
                    生成支付码失败，请稍后重试<br>
                    <small>${error.message}</small>
                </div>
            `;
            qrCodeImg.style.display = 'none';
        }
    }

    // 检查支付状态
    function startPaymentCheck(orderId) {
        const checkInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/phoenix-divine/check-payment', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authManager.token}`
                    },
                    params: { orderId }
                });

                if (!response.ok) {
                    throw new Error('支付状态检查失败');
                }

                const data = await response.json();
                
                if (data.status === 'paid') {
                    clearInterval(checkInterval);
                    paymentStatus.innerHTML = '<div class="status-text" style="color: #4CAF50;">支付成功！</div>';
                    
                    // 更新VIP状态
                    await authManager.checkVipStatus();
                    
                    // 延迟跳转
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                }
            } catch (error) {
                console.error('Payment check error:', error);
                clearInterval(checkInterval);
                paymentStatus.innerHTML = `
                    <div class="status-text" style="color: #ff4444;">
                        支付状态检查失败，请刷新页面重试
                    </div>
                `;
            }
        }, 3000); // 每3秒检查一次

        // 5分钟后停止检查
        setTimeout(() => {
            clearInterval(checkInterval);
            paymentStatus.innerHTML = `
                <div class="status-text" style="color: #ff4444;">
                    支付超时，请重新发起支付
                </div>
            `;
        }, 300000);
    }

    backBtn.addEventListener('click', function(e) {
        e.preventDefault();
        // 获取上一个页面的URL
        const previousPage = document.referrer;
        
        if (previousPage) {
            // 如果有上一个页面，则返回
            window.location.href = previousPage;
        } else {
            // 如果没有上一个页面，则返回首页
            window.location.href = 'website.html';
        }
    });
}); 