class RemoveAPI {
    constructor() {
        this.API_KEY = 'wxv47rfzzfvcwtadd';
        this.BASE_URL = 'https://techsz.aoscdn.com/api/tasks/visual/inpainting';
    }

    // 创建物体移除任务
    async createTask(imageUrl, maskData) {
        const formData = new FormData();
        formData.append('image_url', imageUrl);
        formData.append('mask_data', maskData);
        formData.append('sync', '0');

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

    // 执行物体移除任务
    async performRemove(imageUrl, maskData) {
        try {
            const taskId = await this.createTask(imageUrl, maskData);
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
    const removeBtn = document.getElementById('removeBtn');
    const resultDisplay = document.getElementById('resultDisplay');
    const removeAPI = new RemoveAPI();

    let canvas, ctx;
    let isDrawing = false;
    let maskData = null;

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
            setupCanvas();
            removeBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    // 设置画布
    function setupCanvas() {
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.cursor = 'crosshair';
            uploadArea.appendChild(canvas);
            
            ctx = canvas.getContext('2d');
        }

        canvas.width = uploadArea.clientWidth;
        canvas.height = uploadArea.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 绑定绘制事件
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing);
    }

    function startDrawing(e) {
        isDrawing = true;
        draw(e);
    }

    function draw(e) {
        if (!isDrawing) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();

        // 更新遮罩数据
        maskData = canvas.toDataURL();
    }

    function stopDrawing() {
        isDrawing = false;
    }

    // 处理物体移除
    removeBtn.addEventListener('click', async () => {
        if (!previewImage.src || !maskData) {
            alert('请先上传图片并标记要移除的区域');
            return;
        }

        try {
            removeBtn.disabled = true;
            resultDisplay.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">正在移除物体...</div>
                </div>
            `;

            const result = await removeAPI.performRemove(previewImage.src, maskData);
            
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
            removeBtn.disabled = false;
        }
    });
}); 