document.addEventListener('DOMContentLoaded', function() {
    const promptInput = document.getElementById('promptInput');
    const charCount = document.getElementById('charCount');
    const generateBtn = document.getElementById('generateBtn');
    const resultDisplay = document.getElementById('resultDisplay');

    // Hugging Face API 配置
    const HF_TOKEN = "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";
    const API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";

    // 获取URL参数中的设计类型
    const urlParams = new URLSearchParams(window.location.search);
    const designType = urlParams.get('type');

    // 更新字符计数
    promptInput.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = count;
        
        if (count === 140) {
            charCount.style.color = '#ff4444';
        } else {
            charCount.style.color = '#666';
        }
    });

    // 生成按钮点击事件
    generateBtn.addEventListener('click', async function() {
        const prompt = promptInput.value.trim();
        if (!prompt) {
            alert('请输入生成内容描述');
            return;
        }

        try {
            // 禁用按钮并显示加载状态
            generateBtn.disabled = true;
            generateBtn.textContent = '生成中...';
            resultDisplay.innerHTML = '<div class="placeholder-text">正在生成图片，请稍候...</div>';

            // 准备提示词
            const fullPrompt = `Generate a ${designType} design with: ${prompt}`;

            // 调用 Hugging Face API
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${HF_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    inputs: fullPrompt,
                    options: {
                        wait_for_model: true,
                        use_cache: false
                    }
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'API 请求失败');
            }

            // 获取生成的图片数据
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);

            // 显示生成的图片
            resultDisplay.innerHTML = `
                <img src="${imageUrl}" alt="生成结果">
            `;

            // 修改结果区域的标题
            const resultTitle = document.querySelector('.result-section h2');
            resultTitle.innerHTML = `
                生成结果
                <a href="${imageUrl}" download="generated_image.png" class="download-btn">下载原图</a>
            `;

        } catch (error) {
            console.error('Error:', error);
            resultDisplay.innerHTML = `
                <div class="placeholder-text" style="color: #ff4444;">
                    生成失败，请稍后重试<br>
                    <small>${error.message}</small>
                </div>
            `;
        } finally {
            // 恢复按钮状态
            generateBtn.disabled = false;
            generateBtn.textContent = '去生成';
        }
    });
}); 