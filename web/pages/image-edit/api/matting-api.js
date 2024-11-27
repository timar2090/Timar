// API配置
const API_CONFIG = {
    BASE_URL: 'https://techsz.aoscdn.com/api/tasks/visual/segmentation',
    API_KEY: 'wxv47rfzzfvcwtadd',  // 更新为实际的API密钥
    MAX_POLLING_TIME: 30,
    POLLING_INTERVAL: 1000, // 轮询间隔1秒
};

// 添加重试配置
const RETRY_CONFIG = {
    maxRetries: 3,
    retryDelay: 1000,
    retryableErrors: [408, 429, 500, 502, 503, 504] // 可重试的HTTP状态码
};

// 创建抠图任务
async function createMattingTask(imageUrl, retryCount = 0) {
    try {
        const formData = new FormData();
        formData.append('image_url', imageUrl);
        formData.append('sync', '0');

        const response = await fetch(API_CONFIG.BASE_URL, {
            method: 'POST',
            headers: {
                'X-API-KEY': API_CONFIG.API_KEY
            },
            body: formData
        });

        const data = await response.json();
        
        if (data.status !== 200) {
            // 检查是否需要重试
            if (retryCount < RETRY_CONFIG.maxRetries && 
                RETRY_CONFIG.retryableErrors.includes(response.status)) {
                await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay));
                return createMattingTask(imageUrl, retryCount + 1);
            }
            throw new Error(data.message || '创建任务失败');
        }

        return data.data.task_id;
    } catch (error) {
        console.error('创建抠图任务失败:', error);
        throw error;
    }
}

// 轮询任务结果
async function pollTaskResult(taskId, pollingTime = 0, retryCount = 0) {
    if (pollingTime >= API_CONFIG.MAX_POLLING_TIME) {
        throw new Error('轮询超时');
    }

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/${taskId}`, {
            method: 'GET',
            headers: {
                'X-API-KEY': API_CONFIG.API_KEY
            }
        });

        if (!response.ok) {
            // 检查是否需要重试
            if (retryCount < RETRY_CONFIG.maxRetries && 
                RETRY_CONFIG.retryableErrors.includes(response.status)) {
                await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay));
                return pollTaskResult(taskId, pollingTime, retryCount + 1);
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const state = data.data.state;

        if (state < 0) {
            throw new Error(data.message || '抠图处理失败');
        }

        if (state === 1) {
            return data.data;
        }

        // 继续轮询
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.POLLING_INTERVAL));
        return pollTaskResult(taskId, pollingTime + 1, 0);
    } catch (error) {
        console.error('轮询任务结果失败:', error);
        throw error;
    }
}

// 上传本地图片并获取URL
async function uploadImage(file, retryCount = 0) {
    try {
        // 这里我们使用一个临时的图床服务
        const formData = new FormData();
        formData.append('file', file);
        formData.append('token', API_CONFIG.API_KEY);

        const response = await fetch('https://smms.app/api/v2/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            // 检查是否需要重试
            if (retryCount < RETRY_CONFIG.maxRetries && 
                RETRY_CONFIG.retryableErrors.includes(response.status)) {
                await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay));
                return uploadImage(file, retryCount + 1);
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || '图片上传失败');
        }

        return data.data.url;
    } catch (error) {
        console.error('图片上传失败:', error);
        throw error;
    }
}

// 完整的抠图处理流程
async function processMatting(file) {
    try {
        // 1. 上传图片获取URL
        const imageUrl = await uploadImage(file);

        // 2. 创建抠图任务
        const taskId = await createMattingTask(imageUrl);

        // 3. 轮询获取结果
        const result = await pollTaskResult(taskId);

        return result;
    } catch (error) {
        console.error('抠图处理失败:', error);
        throw error;
    }
}

export { processMatting }; 