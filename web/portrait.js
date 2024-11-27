class PortraitAPI {
    constructor() {
        this.API_KEY = 'wxv47rfzzfvcwtadd';
        this.BASE_URL = 'https://techsz.aoscdn.com/api/tasks/visual/portrait';
    }

    // 创建证件照/写真任务
    async createTask(imageUrl, params = {}) {
        const formData = new FormData();
        formData.append('image_url', imageUrl);
        formData.append('sync', '0');
        
        // 添加参数
        if (params.style) formData.append('style', params.style);
        if (params.size) formData.append('size', params.size);
        if (params.background) formData.append('background', params.background);

        try {
            const response = await fetch(this.BASE_URL, {
                method: 'POST',
                headers: {
                    'X-API-KEY': this.API_KEY
                },
                body: formData
            });

            const data = await response.json();
            if (data.status !== 200) {
                throw new Error(data.message);
            }

            return data.data.task_id;
        } catch (error) {
            throw new Error(`创建任务失败: ${error.message}`);
        }
    }

    // 轮询任务结果
    async pollTaskResult(taskId, pollingTime = 0) {
        if (pollingTime >= 30) {
            throw new Error('轮询超时');
        }

        try {
            const response = await fetch(`${this.BASE_URL}/${taskId}`, {
                method: 'GET',
                headers: {
                    'X-API-KEY': this.API_KEY
                }
            });

            const data = await response.json();
            const state = data.data.state;

            if (state < 0) {
                throw new Error(data.message);
            }

            if (state === 1) {
                return data.data;
            }

            // 等待1秒后继续轮询
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.pollTaskResult(taskId, pollingTime + 1);
        } catch (error) {
            throw new Error(`获取结果失败: ${error.message}`);
        }
    }

    // 执行证件照/写真任务
    async performPortrait(imageUrl, params = {}) {
        try {
            const taskId = await this.createTask(imageUrl, params);
            return await this.pollTaskResult(taskId);
        } catch (error) {
            throw error;
        }
    }
}

// 页面逻辑
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const previewImage = document.getElementById('previewImage');
    const generateBtn = document.getElementById('generateBtn');
    const resultDisplay = document.getElementById('resultDisplay');
    const portraitAPI = new PortraitAPI();

    // 处理文件上传
    uploadArea.addEventListener('click', () => imageInput.click());
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('请上传图片文件');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            previewImage.hidden = false;
            document.querySelector('.upload-placeholder').hidden = true;
            generateBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    // 处理风格切换
    document.querySelectorAll('.style-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.style-btn.active').classList.remove('active');
            btn.classList.add('active');
            updatePreview();
        });
    });

    // 处理参数变化
    document.getElementById('bgColor').addEventListener('change', updatePreview);
    document.getElementById('photoSize').addEventListener('change', updatePreview);

    // 更新预览效果
    function updatePreview() {
        if (!previewImage.src) return;

        const style = document.querySelector('.style-btn.active').dataset.style;
        const bgColor = document.getElementById('bgColor').value;
        const size = document.getElementById('photoSize').value;

        // 这里可以添加实时预览效果的逻辑
    }

    // 处理生成
    generateBtn.addEventListener('click', async () => {
        if (!previewImage.src) {
            alert('请先上传图片');
            return;
        }

        try {
            generateBtn.disabled = true;
            resultDisplay.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">正在处理中...</div>
                </div>
            `;

            // 获取参数
            const style = document.querySelector('.style-btn.active').dataset.style;
            const size = document.getElementById('photoSize').value;
            const background = document.getElementById('bgColor').value;

            const result = await portraitAPI.performPortrait(previewImage.src, {
                style,
                size,
                background
            });
            
            // 显示结果
            resultDisplay.innerHTML = `
                <img src="${result.output_url}" alt="处理结果">
                <div class="download-section">
                    <a href="${result.output_url}" download class="download-btn">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                        下载结果
                    </a>
                </div>
            `;
        } catch (error) {
            resultDisplay.innerHTML = `
                <div class="error-message">${error.message}</div>
            `;
        } finally {
            generateBtn.disabled = false;
        }
    });
}); 