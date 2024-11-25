document.addEventListener('DOMContentLoaded', function() {
    const promptInput = document.getElementById('promptInput');
    const charCount = document.getElementById('charCount');
    const generateBtn = document.getElementById('generateBtn');
    const resultDisplay = document.getElementById('resultDisplay');

    // 获取URL参数中的type
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');

    // 定义标题映射
    const titleMap = {
        'tshirt': '设计T恤',
        'cup': '设计杯子',
        'phonecase': '设计手机壳',
        'poster': '设计海报',
        'bedding': '设计床单',
        'wallpaper': '设计手机壁纸',
        'avatar': '设计头像',
        'magnet': '设计冰箱贴',
        'fan': '设计扇子',
        'wallart': '设计挂画',
        'book': '设计绘本'
    };

    // 定义每种类型对应的英文提示词补充
    const promptSuffix = {
        'tshirt': ', t-shirt design, fashion design, clothing',
        'cup': ', mug design, cup pattern, drinkware',
        'phonecase': ', phone case design, protective case pattern',
        'poster': ', poster design, wall art, graphic design',
        'bedding': ', bedding pattern, textile design, fabric pattern',
        'wallpaper': ', mobile wallpaper, phone background, digital art',
        'avatar': ', profile picture, avatar design, character portrait',
        'magnet': ', fridge magnet design, decorative magnet',
        'fan': ', hand fan design, folding fan pattern',
        'wallart': ', wall art design, home decoration, canvas art',
        'book': ', children book illustration, story book art'
    };

    // 设置页面标题
    document.title = `${titleMap[type] || 'AI生图'} - 比比控科技`;

    // 设置页面内的标题
    const headerTitle = document.querySelector('header h1');
    if (headerTitle) {
        headerTitle.textContent = titleMap[type] || 'AI生图';
    }

    // 更新字数统计
    promptInput.addEventListener('input', function() {
        charCount.textContent = this.value.length;
    });

    // Hugging Face API 调用函数
    async function query(prompt) {
        // 根据类型补充提示词
        const enhancedPrompt = prompt + (promptSuffix[type] || '');
        
        const response = await fetch(
            "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
            {
                headers: {
                    "Authorization": "Bearer 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",
                    "Content-Type": "application/json"
                },
                method: "POST",
                body: JSON.stringify({
                    "inputs": enhancedPrompt,
                    "parameters": {
                        "negative_prompt": "ugly, disfigured, low quality, blurry, nsfw",
                        "num_inference_steps": 30,
                        "guidance_scale": 7.5
                    },
                    "options": {
                        "wait_for_model": true
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`API 请求失败: ${error.error || response.status}`);
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }

    // 生成图片
    generateBtn.addEventListener('click', async function() {
        const prompt = promptInput.value.trim();
        
        if (!prompt) {
            alert('请输入提示词');
            return;
        }

        try {
            // 显示加载状态
            resultDisplay.innerHTML = `
                <div class="loading">
                    <div class="loading-text">AI 正在绘制中...</div>
                    <div class="loading-spinner"></div>
                </div>
            `;
            generateBtn.disabled = true;

            // 调用 Hugging Face API
            const imageUrl = await query(prompt);

            // 显示生成的图片
            resultDisplay.innerHTML = `
                <img src="${imageUrl}" alt="生成的图片">
                <div class="download-container">
                    <a href="${imageUrl}" download="generated-image.png" class="download-btn">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-right: 4px;">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                        下载原图
                    </a>
                </div>
            `;

        } catch (error) {
            resultDisplay.innerHTML = `
                <div class="error-message">
                    ${error.message}
                </div>
            `;
            console.error('Error:', error);
        } finally {
            generateBtn.disabled = false;
        }
    });
}); 