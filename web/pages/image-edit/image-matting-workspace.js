// 在文件顶部添加 API 相关代码
const API_CONFIG = {
    BASE_URL: 'https://techsz.aoscdn.com/api/tasks/visual/segmentation',
    API_KEY: 'wxv47rfzzfvcwtadd',
    MAX_POLLING_TIME: 30,
    POLLING_INTERVAL: 1000
};

// 添加 API 相关函数
async function processMatting(file) {
    try {
        // 直接使用 base64 数据
        const base64Data = await readFileAsBase64(file);
        // 这里可以直接使用 base64Data 进行处理
        // 暂时返回一个模拟结果
        return {
            output_url: base64Data
        };
    } catch (error) {
        console.error('抠图处理失败:', error);
        throw error;
    }
}

// 获取DOM元素
const uploadHint = document.getElementById('uploadHint');
const previewArea = document.getElementById('previewArea');
const sourceCanvas = document.getElementById('sourceCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const loadingOverlay = document.getElementById('loadingOverlay');
const processStatus = document.getElementById('processStatus');

// 画布上下文
const sourceCtx = sourceCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');

// 工作区状态管理
const workspaceState = {
    originalImage: null,
    currentImage: null,
    scale: 1,
    isProcessing: false,
    history: [],
    historyIndex: -1,
    maxHistory: 10,
    mattingMode: 'portrait', // 'portrait' 或 'product'
    background: {
        type: 'transparent', // 'transparent', 'white', 'black', 'custom-color', 'custom-image'
        color: '#ffffff',
        image: null
    }
};

// 添加到文件顶部
function showDebug(message) {
    const debugEl = document.getElementById('debugStatus');
    if (debugEl) {
        debugEl.textContent = message;
        debugEl.style.display = 'block';
        setTimeout(() => {
            debugEl.style.display = 'none';
        }, 3000);
    }
    console.log(message);
}

// 文件上传处理
function initializeUpload() {
    console.log('Initializing upload...'); // 添加调试日志

    // 获取上传按钮并直接绑定点击事件
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.onclick = function() {
            console.log('Upload button clicked');
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = handleFileSelect;
            input.click();
        };
    }

    // 获取上传提示区域并绑定点击事件
    const uploadHint = document.getElementById('uploadHint');
    if (uploadHint) {
        uploadHint.onclick = function() {
            console.log('Upload hint clicked');
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = handleFileSelect;
            input.click();
        };
    }

    // 添加拖放功能
    const dropZone = document.getElementById('canvasWrapper');
    if (dropZone) {
        dropZone.ondragover = function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.add('drag-over');
        };

        dropZone.ondragleave = function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.remove('drag-over');
        };

        dropZone.ondrop = function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.remove('drag-over');
            
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleFileSelect({ target: { files: [file] } });
            }
        };
    }
}

// 确保在页面加载完成后初始化
window.onload = function() {
    console.log('Window loaded');
    initialize();
};

// 添加全局错误处理
window.onerror = function(msg, url, line, col, error) {
    console.error('Global error:', { msg, url, line, col, error });
    showStatus('发生错误，请刷新页面重试', 'error');
    return false;
};

// 文件选择处理
async function handleFileSelect(event) {
    console.log('File select triggered', event);
    
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
        showStatus('请选择正确的图片格式', 'error');
        return;
    }

    try {
        showLoading('正在加载图片...');

        // 读取文件为 base64
        const base64Url = await readFileAsBase64(file);
        const img = await loadImage(base64Url);
        
        // 计算适合的画布尺寸
        const containerWidth = document.querySelector('.canvas-container').clientWidth;
        const containerHeight = document.querySelector('.canvas-container').clientHeight;
        
        let width = img.width;
        let height = img.height;
        
        // 计算缩放比例以适应容器
        const containerRatio = Math.min(
            (containerWidth * 0.9) / width,
            (containerHeight * 0.9) / height
        );
        
        // 设置画布尺寸为缩放后的尺寸
        const scaledWidth = Math.floor(width * containerRatio);
        const scaledHeight = Math.floor(height * containerRatio);

        // 设置画布尺寸
        sourceCanvas.width = scaledWidth;
        sourceCanvas.height = scaledHeight;
        resultCanvas.width = scaledWidth;
        resultCanvas.height = scaledHeight;

        // 清空画布并绘制图片
        sourceCtx.clearRect(0, 0, scaledWidth, scaledHeight);
        sourceCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
        
        // 清空结果画布
        resultCtx.clearRect(0, 0, scaledWidth, scaledHeight);
        resultCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

        // 更新状态
        workspaceState.originalImage = img;
        workspaceState.currentImage = sourceCanvas.toDataURL('image/png');
        workspaceState.scale = 1;

        // 隐藏上传提示，显示预览区域
        const uploadHint = document.getElementById('uploadHint');
        const previewArea = document.getElementById('previewArea');
        
        if (uploadHint && previewArea) {
            uploadHint.style.display = 'none';
            previewArea.style.display = 'flex';
            
            // 初始只显示原图
            sourceCanvas.style.display = 'block';
            resultCanvas.style.display = 'none';
            
            // 设置预览区域样式
            previewArea.style.position = 'relative';
            previewArea.style.width = '100%';
            previewArea.style.height = '100%';
            
            // 设置画布样式
            sourceCanvas.style.position = 'absolute';
            sourceCanvas.style.left = '50%';
            sourceCanvas.style.top = '50%';
            sourceCanvas.style.transform = 'translate(-50%, -50%)';
            
            resultCanvas.style.position = 'absolute';
            resultCanvas.style.left = '50%';
            resultCanvas.style.top = '50%';
            resultCanvas.style.transform = 'translate(-50%, -50%)';
        }

        // 添加到历史记录
        addToHistory(workspaceState.currentImage);
        
        showStatus('图片加载成功', 'success');
    } catch (error) {
        console.error('图片加载失败:', error);
        showStatus('图片加载失败，请重试', 'error');
    } finally {
        hideLoading();
    }
}

// 添加辅助函数：读取文件为 base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 添加辅助函数：加载图片
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// 智能抠图处理
async function handleAutoMatting() {
    if (!workspaceState.currentImage || workspaceState.isProcessing) return;

    try {
        workspaceState.isProcessing = true;
        showLoading('正在进行智抠图...');

        // 获取当前画布的图片数据
        const blob = await new Promise(resolve => {
            sourceCanvas.toBlob(resolve, 'image/png');
        });

        // 调用API处理抠图
        const result = await processMatting(blob);

        // 处理返回的结果
        const resultImage = new Image();
        resultImage.onload = () => {
            workspaceState.mattingResult = resultImage;
            updateBackground();
            showStatus('抠图完成', 'success');
            addToHistory(resultCanvas.toDataURL());
        };
        resultImage.src = result.output_url; // 假设API返回的是output_url字段

    } catch (error) {
        console.error('抠图处理失败:', error);
        showStatus(error.message || '处理失败，请重试', 'error');
    } finally {
        workspaceState.isProcessing = false;
        hideLoading();
    }
}

// 画布缩放控制
function initializeCanvasControls() {
    document.getElementById('zoomIn').addEventListener('click', () => {
        workspaceState.scale = Math.min(workspaceState.scale * 1.2, 5);
        updateCanvasScale();
    });

    document.getElementById('zoomOut').addEventListener('click', () => {
        workspaceState.scale = Math.max(workspaceState.scale / 1.2, 0.1);
        updateCanvasScale();
    });

    document.getElementById('fitScreen').addEventListener('click', () => {
        workspaceState.scale = 1;
        updateCanvasScale();
    });
}

// 更新画布缩放
function updateCanvasScale() {
    const transform = `translate(-50%, -50%) scale(${workspaceState.scale})`;
    sourceCanvas.style.transform = transform;
    resultCanvas.style.transform = transform;
}

// 历史记录管理
function addToHistory(imageData) {
    if (!workspaceState.history) {
        workspaceState.history = [];
    }
    
    if (workspaceState.historyIndex < workspaceState.history.length - 1) {
        workspaceState.history = workspaceState.history.slice(0, workspaceState.historyIndex + 1);
    }
    
    workspaceState.history.push(imageData);
    if (workspaceState.history.length > workspaceState.maxHistory) {
        workspaceState.history.shift();
    }
    workspaceState.historyIndex = workspaceState.history.length - 1;
    
    // 移除对撤销/重按钮的直接引用
    updateHistoryState();
}

// 更新历史状态
function updateHistoryState() {
    // 只更新状态，不直接操作DOM
    workspaceState.canUndo = workspaceState.historyIndex > 0;
    workspaceState.canRedo = workspaceState.historyIndex < workspaceState.history.length - 1;
}

// 加载历史状态
function loadHistoryState() {
    const imageData = workspaceState.history[workspaceState.historyIndex];
    if (!imageData) return;

    const img = new Image();
    img.onload = () => {
        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
        resultCtx.drawImage(img, 0, 0);
        updateHistoryState();
    };
    img.src = imageData;
}

// 初始化历史控制
function initializeHistoryControls() {
    // 不再需要检查按钮是否存在
    workspaceState.history = [];
    workspaceState.historyIndex = -1;
    workspaceState.canUndo = false;
    workspaceState.canRedo = false;
}

// 显示加载状态
function showLoading(message) {
    loadingOverlay.style.display = 'flex';
    loadingOverlay.querySelector('.loading-text').textContent = message;
}

// 隐藏加载状态
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// 显示状态提示
function showStatus(message, type = 'success') {
    processStatus.className = `process-status ${type}`;
    processStatus.querySelector('.status-text').textContent = message;
    processStatus.style.display = 'flex';
    
    setTimeout(() => {
        processStatus.style.display = 'none';
    }, 3000);
}

// 初始化模式选择
function initializeModeSelection() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            workspaceState.mattingMode = btn.dataset.mode;
            
            // 如果已有图片，重新执行抠图
            if (workspaceState.currentImage) {
                handleAutoMatting();
            }
        });
    });
}

// 修改背景控制初始化
function initializeBackgroundControls() {
    const bgOptions = document.querySelectorAll('.bg-option');
    const colorPickerPopup = document.querySelector('.color-picker-popup');
    const colorPicker = document.getElementById('bgColorPicker');
    const customColorPreview = document.querySelector('.custom-color-preview');
    
    // 背景选项切换
    bgOptions.forEach(option => {
        option.onclick = () => {
            const bgType = option.dataset.bg;
            
            // 移除其他选项的激活状态
            bgOptions.forEach(opt => opt.classList.remove('active'));
            // 激活当前选项
            option.classList.add('active');
            
            if (bgType === 'custom-color') {
                // 直接显示颜色选择器
                colorPicker.click();
            }
            
            // 更新背景状态
            workspaceState.background = {
                ...workspaceState.background,
                type: bgType
            };

            // 立即应用背景
            if (workspaceState.mattingResult) {
                applyBackground();
            }
        };
    });
    
    // 颜色选择器变化时
    if (colorPicker) {
        colorPicker.onchange = (e) => {
            // 更新自选颜色预览块的颜色
            customColorPreview.style.background = e.target.value;
            
            // 更新背景状态
            workspaceState.background = {
                type: 'custom-color',
                color: e.target.value
            };
            
            // 应用背景
            if (workspaceState.mattingResult) {
                applyBackground();
            }
        };

        // 实时预览
        colorPicker.oninput = (e) => {
            // 更新自选颜色预览块的颜色
            customColorPreview.style.background = e.target.value;
            
            // 更新背景状态
            workspaceState.background = {
                type: 'custom-color',
                color: e.target.value
            };
            
            // 应用背景
            if (workspaceState.mattingResult) {
                applyBackground();
            }
        };
    }
}

// 应用背景函数
function applyBackground() {
    if (!workspaceState.mattingResult) return;

    // 获取当前画布尺寸
    const width = resultCanvas.width;
    const height = resultCanvas.height;

    // 清空画布
    resultCtx.clearRect(0, 0, width, height);

    // 根背景类型绘
    switch (workspaceState.background.type) {
        case 'white':
            resultCtx.fillStyle = '#ffffff';
            resultCtx.fillRect(0, 0, width, height);
            break;
        case 'black':
            resultCtx.fillStyle = '#000000';
            resultCtx.fillRect(0, 0, width, height);
            break;
        case 'custom-color':
            resultCtx.fillStyle = workspaceState.background.color;
            resultCtx.fillRect(0, 0, width, height);
            break;
        // transparent 不需要填充背景
    }

    // 绘制抠图结果
    resultCtx.drawImage(workspaceState.mattingResult, 0, 0);

    // 更新历史记录
    addToHistory(resultCanvas.toDataURL());
}

// 在初始化时设置默认背景类型
function initialize() {
    console.log('Initializing...');
    
    if (!sourceCanvas || !resultCanvas) {
        console.error('Canvas elements not found');
        return;
    }

    initializeUpload();
    initializeCanvasControls();
    initializeHistoryControls();
    
    // 绑定人像抠图按钮
    const portraitMattingBtn = document.getElementById('portraitMatting');
    if (portraitMattingBtn) {
        portraitMattingBtn.onclick = () => {
            console.log('Portrait matting button clicked');
            handleMatting('portrait');
        };
    } else {
        console.error('Portrait matting button not found');
    }
    
    // 绑定商品抠图按钮
    const productMattingBtn = document.getElementById('productMatting');
    if (productMattingBtn) {
        productMattingBtn.onclick = () => {
            console.log('Product matting button clicked');
            handleMatting('product');
        };
    } else {
        console.error('Product matting button not found');
    }
    
    // 设置默认背景状态
    workspaceState.background = {
        type: 'transparent',
        color: '#ffffff'
    };
    
    // 初始化背景控制
    initializeBackgroundControls();
}

// 添加上传图片到图床的函数
async function uploadToImgur(base64Data) {
    // 移除 base64 URL 的前缀
    const base64Image = base64Data.split(',')[1];
    
    const formData = new FormData();
    formData.append('image', base64Image);

    try {
        const response = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: {
                'Authorization': 'Client-ID YOUR_IMGUR_CLIENT_ID' // 需要替换为你的 Imgur Client ID
            },
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            return data.data.link;
        } else {
            throw new Error('图片上传失败');
        }
    } catch (error) {
        throw new Error('图片上传失败: ' + error.message);
    }
}

// 修改抠图处理函数
async function handleMatting(mode) {
    if (!workspaceState.currentImage || workspaceState.isProcessing) {
        showStatus('请先上传图片', 'error');
        return;
    }

    try {
        workspaceState.isProcessing = true;
        showLoading('正在AI处理中，请稍后...');

        // 将画布数据转换为 Blob
        const blob = await new Promise(resolve => {
            sourceCanvas.toBlob(resolve, 'image/jpeg', 0.95);
        });

        // 创建 FormData，使用正确的参数名 'image_file'
        const formData = new FormData();
        formData.append('image_file', blob, 'image.jpg');  // 添加文件名
        formData.append('sync', '0');

        console.log('Sending request to API...');

        // 发送请求
        const response = await fetch('https://techsz.aoscdn.com/api/tasks/visual/segmentation', {
            method: 'POST',
            headers: {
                'X-API-KEY': 'wxv47rfzzfvcwtadd'
            },
            body: formData
        });

        const data = await response.json();
        console.log('Create task response:', data);

        if (data.status !== 200) {
            throw new Error(data.message || '创建任务失败');
        }

        // 获取任务ID并轮询结果
        const taskId = data.data.task_id;
        console.log('Task ID:', taskId);

        let result = null;
        let pollingTime = 0;

        // 轮询获取结果
        while (pollingTime < 30) {
            console.log('Polling attempt:', pollingTime + 1);
            
            const taskResponse = await fetch(`https://techsz.aoscdn.com/api/tasks/visual/segmentation/${taskId}`, {
                method: 'GET',
                headers: {
                    'X-API-KEY': 'wxv47rfzzfvcwtadd'
                }
            });

            const taskData = await taskResponse.json();
            console.log('Task Status:', taskData);

            if (taskData.data.state === 1) {  // 处理完成
                const resultData = taskData.data;
                console.log('Result Data:', resultData);

                // 获取抠图结果URL
                const imageUrl = resultData.image;
                if (!imageUrl) {
                    throw new Error('未找到有效的结果图片URL');
                }

                // 获取图片数据
                const imageResponse = await fetch(imageUrl);
                const imageBlob = await imageResponse.blob();
                const blobUrl = URL.createObjectURL(imageBlob);

                // 加载抠图结果
                const resultImage = new Image();
                resultImage.crossOrigin = 'anonymous';

                const loadResultImage = new Promise((resolve, reject) => {
                    resultImage.onload = () => {
                        URL.revokeObjectURL(blobUrl);
                        resolve(resultImage);
                    };
                    resultImage.onerror = () => {
                        URL.revokeObjectURL(blobUrl);
                        reject(new Error('结果图片加载失败'));
                    };
                });

                resultImage.src = blobUrl;

                // 等待图片加载完成
                const loadedImage = await loadResultImage;

                // 保存抠图结果到状态中
                workspaceState.mattingResult = loadedImage;

                // 设置画布尺寸
                resultCanvas.width = loadedImage.width;
                resultCanvas.height = loadedImage.height;

                // 应用当前背景设置
                const bgType = workspaceState.background?.type || 'transparent';
                const bgColor = workspaceState.background?.color || '#ffffff';

                // 清空画布
                resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);

                // 根据背景类型绘制
                switch (bgType) {
                    case 'white':
                        resultCtx.fillStyle = '#ffffff';
                        resultCtx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
                        break;
                    case 'black':
                        resultCtx.fillStyle = '#000000';
                        resultCtx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
                        break;
                    case 'custom-color':
                        resultCtx.fillStyle = bgColor;
                        resultCtx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
                        break;
                    // transparent 不需要填充背景
                }

                // 绘制抠图结果
                resultCtx.drawImage(loadedImage, 0, 0);

                // 隐��原图，显示结果
                sourceCanvas.style.display = 'none';
                resultCanvas.style.display = 'block';

                // 更新历史记录
                addToHistory(resultCanvas.toDataURL());

                showStatus('抠图完成', 'success');
                break;
            }

            if (taskData.data.state < 0) {
                throw new Error('处理失败');
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            pollingTime++;
        }

        if (pollingTime >= 30) {
            throw new Error('处理超时');
        }

    } catch (error) {
        console.error('处理失败:', error);
        showStatus(error.message || '处理失败，请重试', 'error');
        sourceCanvas.style.display = 'block';
        resultCanvas.style.display = 'none';
    } finally {
        workspaceState.isProcessing = false;
        hideLoading();
    }
}

// 修改加载提示样式
function showLoading(message) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        const loadingText = loadingOverlay.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }
}

// 添加状态提示样式
function showStatus(message, type = 'success') {
    const statusEl = document.getElementById('processStatus');
    if (statusEl) {
        statusEl.className = `process-status ${type}`;
        const textEl = statusEl.querySelector('.status-text');
        if (textEl) {
            textEl.textContent = message;
        }
        statusEl.style.display = 'flex';
        
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }
}

// 导出处理
function handleExport() {
    const format = document.getElementById('exportFormat').value;
    const quality = document.getElementById('quality').value / 100;
    
    try {
        const dataUrl = resultCanvas.toDataURL(`image/${format}`, quality);
        const link = document.createElement('a');
        link.download = `matting-result.${format}`;
        link.href = dataUrl;
        link.click();
        
        showStatus('导出成功', 'success');
    } catch (error) {
        console.error('导出失败:', error);
        showStatus('导出失败，请重试', 'error');
    }
}

// 添加CSS类
const style = document.createElement('style');
style.textContent = `
    .drag-over {
        border-color: var(--primary) !important;
        background: var(--primary-light) !important;
    }
    
    .upload-hint {
        cursor: pointer;
    }
    
    .upload-hint:hover {
        background: var(--primary-light);
        border-color: var(--primary);
    }
`;
document.head.appendChild(style);

// 确保在 DOM 加载完成后始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded'); // 调试日志
    initialize();
}); 