const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { alipaySdk } = require('./alipayConfig');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key';

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 模拟数据库
let users = [];
let orders = [];

// 注册接口
app.post('/api/register', (req, res) => {
    const { username, password, securityQuestion, securityAnswer } = req.body;
    
    // 检查用户是否已存在
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: '用户名已存在' });
    }

    // 创建新用户
    const user = {
        id: users.length + 1,
        username,
        password, // 实际项目中需要加密
        securityQuestion,
        securityAnswer,
        isVip: false,
        vipExpireDate: null,
        createTime: new Date()
    };

    users.push(user);
    console.log('注册用户:', user); // 调试用
    
    // 生成 token
    const token = jwt.sign({ userId: user.id, username }, JWT_SECRET);
    
    res.json({ 
        token,
        message: '注册成功'
    });
});

// 登录接口
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    console.log('登录请求:', { username, password }); // 调试用
    
    const user = users.find(u => u.username === username && u.password === password);
    console.log('找到用户:', user); // 调试用
    
    if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ userId: user.id, username }, JWT_SECRET);
    res.json({ 
        token,
        username: user.username,
        isVip: user.isVip,
        message: '登录成功'
    });
});

// 验证 token 的中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '未登录' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '无效的token' });
        }
        req.user = user;
        next();
    });
};

// 获取VIP状态
app.get('/api/vip-status', authenticateToken, (req, res) => {
    const user = users.find(u => u.username === req.user.username);
    res.json({ isVip: user.isVip });
});

// 创建支付订单
app.post('/api/phoenix-divine/create-order', authenticateToken, async (req, res) => {
    const { amount } = req.body;
    const orderId = 'ORDER_' + Date.now();
    
    try {
        // 这里模拟调用 PhoenixDivine DLL 的接口
        // 实际项目中需要通过 Node.js 的 FFI 或其他方式调用 DLL
        const qrCodeUrl = `data:image/png;base64,${generateQRCode(amount)}`; // 这里应该是实际的二维码数据
        
        // 创建订单
        const order = {
            id: orderId,
            userId: req.user.userId,
            amount,
            status: 'pending',
            createTime: new Date()
        };
        
        orders.push(order);
        
        res.json({ 
            orderId, 
            qrCodeUrl,
            message: '支付二维码生成成功'
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: '创建订单失败' });
    }
});

// 检查支付状态
app.get('/api/phoenix-divine/check-payment', authenticateToken, async (req, res) => {
    const { orderId } = req.query;
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
        return res.status(404).json({ error: '订单不存在' });
    }

    try {
        // 这里应该调用 PhoenixDivine DLL 检查支付状态
        // 模拟支付状态检查
        const isPaid = Date.now() - order.createTime > 10000; // 10秒后自动变为支付成功
        
        if (isPaid) {
            order.status = 'paid';
            // 更新用户VIP状态
            const user = users.find(u => u.id === order.userId);
            if (user) {
                user.isVip = true;
                user.vipExpireDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            }
        }

        res.json({ 
            status: order.status,
            message: isPaid ? '支付成功' : '等待支付'
        });
    } catch (error) {
        console.error('Check payment error:', error);
        res.status(500).json({ error: '检查支付状态失败' });
    }
});

// 创建支付宝订单
app.post('/api/create-alipay-order', authenticateToken, async (req, res) => {
    const { amount, productName } = req.body;
    const outTradeNo = 'ORDER_' + Date.now();

    try {
        const result = await alipaySdk.pageExec('alipay.trade.page.pay', {
            notify_url: 'http://your-domain.com/notify_url',
            return_url: 'http://your-domain.com/return_url',
            bizContent: {
                out_trade_no: outTradeNo,
                product_code: 'FAST_INSTANT_TRADE_PAY',
                total_amount: amount,
                subject: productName,
                body: 'VIP会员订阅',
                store_id: 'NJ_001',
                extend_params: {
                    sys_service_provider_id: '2088511833207846'
                },
                timeout_express: '90m'
            }
        });

        // 创建订单记录
        const order = {
            id: outTradeNo,
            userId: req.user.userId,
            amount,
            status: 'pending',
            createTime: new Date()
        };
        orders.push(order);

        res.json({
            orderId: outTradeNo,
            payUrl: result
        });
    } catch (error) {
        console.error('Create alipay order error:', error);
        res.status(500).json({ error: '创建支付宝订单失败' });
    }
});

// 支付宝异步通知接口
app.post('/notify_url', async (req, res) => {
    const params = req.body;
    
    try {
        const result = alipaySdk.checkNotifySign(params);
        if (result) {
            const outTradeNo = params.out_trade_no;
            const order = orders.find(o => o.id === outTradeNo);
            
            if (order && params.trade_status === 'TRADE_SUCCESS') {
                order.status = 'paid';
                // 更新用户VIP状态
                const user = users.find(u => u.id === order.userId);
                if (user) {
                    user.isVip = true;
                    user.vipExpireDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                }
            }
            res.send('success');
        } else {
            res.send('fail');
        }
    } catch (error) {
        console.error('Alipay notify error:', error);
        res.send('fail');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 