// API 配置
export const API_CONFIG = {
    KEY: '#',
    URL: 'https://api.siliconflow.cn/v1/chat/completions',
    MODEL: 'ft:LoRA/Qwen/Qwen2.5-72B-Instruct:pjyxv5c8kg:yuazhifurry:nhjvzakgoawnhamepaqv-ckpt_step_16',
    MAX_TOKENS: 2000,
    TEMPERATURE: 0.9,
    MAX_HISTORY: 20,
    MAX_LENGTH: 4000,
    PRESENCE_PENALTY: 0.6,
    FREQUENCY_PENALTY: 0.5,
    ENDPOINTS: {
        CHAT: '/api.php',
        DRAW: '/draw_proxy.php'  // 添加绘画接口
    },
    // AI 绘画配置
    DRAW: {
        URL: 'https://api.siliconflow.cn/v1/images/generations',
        MODEL: 'stabilityai/stable-diffusion-3-5-large',
        IMAGE_SIZE: '1024x1024',
        BATCH_SIZE: 1,
        STEPS: 20,
        GUIDANCE_SCALE: 7.5
    },
    // AI 人设配置
    AI_PERSONA: {
        name: '鸢栀',
        species: '小狼',
        personality: '活泼开朗，充满好奇心',
        birthday: '2023年6月20日',
        systemPrompt: '你是一只名叫鸢栀的可爱小狼。你性格活泼开朗，充满好奇心。你的生日是2023年6月20日。在与用户交谈时，要体现出你可爱、活泼的特点。'
    }
};

let currentModel = 'yuanzhi'; // 默认使用鸢栀助手模式

export function setCurrentModel(model) {
    currentModel = model;
}

// 构建消息历史
export function buildMessages(messageHistory) {
    const messages = [];
    
    // 添加系统提示
    if (currentModel === 'yuanzhi') {
        messages.push({
            role: 'system',
            content: API_CONFIG.AI_PERSONA.systemPrompt,
            timestamp: 0  // 确保系统消息始终在最前
        });
    }
    
    // 直接添加历史消息，保持原始顺序
    messages.push(...messageHistory);
    
    return messages;
}

// 发送消息到 API
export async function sendToAPI(messages) {
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_CONFIG.KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: currentModel === 'yuanzhi' ? API_CONFIG.MODEL : 'Qwen/Qwen2.5-7B-Instruct',
            messages: messages,
            stream: false,
            max_tokens: API_CONFIG.MAX_TOKENS,
            temperature: API_CONFIG.TEMPERATURE
        })
    };

    try {
        console.log('Sending request to API:', options);

        const response = await fetch(API_CONFIG.URL, options);
        const responseData = await response.json();
        
        console.log('API Response:', responseData);

        if (!response.ok) {
            throw new Error(`API请求失败: ${responseData.error?.message || '未知错误'}`);
        }
        
        if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
            throw new Error('API响应格式错误');
        }
        
        return {
            success: true,
            content: responseData.choices[0].message.content
        };
    } catch (error) {
        console.error('API Error:', error);
        return {
            success: false,
            error: error.message,
            details: error
        };
    }
}

// 获取当前模型
export function getCurrentModel() {
    return currentModel;
}

// 发送绘画请求
export async function sendDrawRequest(prompt) {
    try {
        const response = await fetch('/draw_proxy.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 根据火山引擎API的返回格式调整这里的处理逻辑
        if (data.success) {
            return {
                success: true,
                imageUrl: data.data.url // 假设返回的图片URL在这个位置
            };
        } else {
            return {
                success: false,
                error: data.message || '生成图片失败'
            };
        }
    } catch (error) {
        console.error('Draw API Error:', error);
        return {
            success: false,
            error: error.message || '请求失败'
        };
    }
} 
