const AlipaySdk = require('alipay-sdk').default;

// 支付宝配置
const alipayConfig = {
    appId: '<-- 请填写您的AppId -->',
    privateKey: '<-- 请填写您的应用私钥 -->',
    alipayPublicKey: '<-- 请填写您的支付宝公钥 -->',
    gateway: 'https://openapi.alipay.com/gateway.do',
    charset: 'UTF-8',
    version: '1.0',
    signType: 'RSA2'
};

// 创建支付宝实例
const alipaySdk = new AlipaySdk({
    appId: alipayConfig.appId,
    privateKey: alipayConfig.privateKey,
    alipayPublicKey: alipayConfig.alipayPublicKey,
    gateway: alipayConfig.gateway,
    charset: alipayConfig.charset,
    version: alipayConfig.version,
    signType: alipayConfig.signType
});

module.exports = { alipaySdk, alipayConfig }; 