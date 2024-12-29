import { API_CONFIG, sendToAPI, buildMessages, setCurrentModel, sendDrawRequest, getCurrentModel } from './api.js';

const messageHistory = []; // 移到文件顶部
const chatHistoryList = [];
let sidebarOverlay;
let currentChatId = null; // 添加当前聊天ID的跟踪

// 检测浏览器类型
function getBrowserType() {
    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = ua.match(/android/i);
    
    if (ua.match(/MicroMessenger/i)) {
        return isAndroid ? 'android-wechat' : 'ios-wechat';
    } else if (ua.match(/QQ/i)) {
        return isAndroid ? 'android-qq' : 'ios-qq';
    }
    return 'other';
}

// 在 DOMContentLoaded 时添加特殊类
document.addEventListener('DOMContentLoaded', function() {
    const browserType = getBrowserType();
    if (browserType === 'ios-wechat' || browserType === 'ios-qq') {
        document.documentElement.classList.add('wechat-qq-browser');
    } else if (browserType === 'android-qq' || browserType === 'android-wechat') {
        document.documentElement.classList.add('android-qq-browser');
    }
    
    // 初始化事件监听器
    initEventListeners();
    // 初始化主题切换
    initThemeToggle();
});

// 初始化所有事件监听器
function initEventListeners() {
    // 发送按钮点击事件
    const sendButton = document.getElementById('send-button');
    if (sendButton) {
        sendButton.addEventListener('click', sendMainMessage);
    }

    // 输入框事件
    const userInput = document.getElementById('main-user-input');
    if (userInput) {
        userInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMainMessage();
            }
        });
    }

    // 菜单按钮事件
    const menuButton = document.getElementById('menuButton');
    if (menuButton) {
        menuButton.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.add('active');
                if (sidebarOverlay) {
                    sidebarOverlay.classList.add('active');
                }
            }
        });
    }
}

// 修改代码块打字效果函数
function typeCode(code, element, callback) {
    let i = 0;
    const chars = code.split('');
    let currentCode = '';
    let buffer = '';
    const BUFFER_SIZE = 5; // 每次显示5个字符
    
    // 预处理整个代码的高亮
    const tempCode = document.createElement('code');
    tempCode.className = element.className;
    tempCode.textContent = code;
    hljs.highlightElement(tempCode);
    const highlightedCode = tempCode.innerHTML;
    
    // 设置初始样式
    element.classList.add('hljs');
    element.classList.add(element.className.split(' ')[0]); // 确保语言类名被添加
    
    function typeChar() {
        if (i < chars.length) {
            buffer += chars[i];
            i++;
            
            if (buffer.length >= BUFFER_SIZE || i === chars.length) {
                currentCode += buffer;
                // 使用预处理的高亮结果的对应部分
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = highlightedCode;
                const highlightedText = tempDiv.textContent;
                const percentage = currentCode.length / code.length;
                const partialHighlighted = highlightedCode.substring(0, Math.floor(highlightedCode.length * percentage));
                
                element.innerHTML = partialHighlighted;
                buffer = '';
            }
            
            requestAnimationFrame(() => setTimeout(typeChar, 8));
        } else {
            // 完成时使用完整的高亮代码
            element.innerHTML = highlightedCode;
            if (callback) callback();
        }
    }
    
    // 开始打字效果前先设置一个空的高亮块
    element.innerHTML = '<span class="hljs-comment"></span>';
    typeChar();
}

// 处理代码块的函数
function processCodeBlock(codeContent, messageDiv, useTypingEffect, callback) {
    const codeWrapper = document.createElement('div');
    codeWrapper.className = 'code-block-wrapper';
    
    // 解析语言和文件名
    let language = 'plaintext';
    let filename = '';
    
    // 检查是否包含文件名
    if (codeContent.startsWith('```') && codeContent.includes(':')) {
        const firstLine = codeContent.split('\n')[0];
        const match = firstLine.match(/```([^:]+):(.+)/);
        if (match) {
            language = match[1];
            filename = match[2];
        }
    }
    
    codeWrapper.setAttribute('data-language', language);
    if (filename) {
        codeWrapper.setAttribute('data-filename', filename);
    }
    
    const pre = document.createElement('pre');
    const codeElement = document.createElement('code');
    codeElement.className = `language-${language}${filename ? `:${filename}` : ''}`;
    
    pre.appendChild(codeElement);
    codeWrapper.appendChild(pre);
    
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.textContent = 'Copy code';
    copyButton.onclick = () => copyCode(copyButton);
    codeWrapper.appendChild(copyButton);
    
    messageDiv.appendChild(codeWrapper);
    
    if (useTypingEffect) {
        if (codeContent.startsWith('```')) {
            const lines = codeContent.split('\n');
            codeContent = lines.slice(1, -1).join('\n');
        }
        // 确保代码块容器立即显示
        pre.style.display = 'block';
        pre.style.opacity = '1';
        typeCode(codeContent, codeElement, callback);
    } else {
        codeElement.textContent = codeContent;
        hljs.highlightElement(codeElement);
        if (callback) callback();
    }
}

// 添加消息处理函数
function addMessage(message, sender, containerId, useTypingEffect = true) {
    const chatMessages = document.getElementById(containerId);
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === 'user' ? 'user-message' : 'assistant-message'}`;
    chatMessages.appendChild(messageDiv);
    
    if (sender === 'user') {
        // 用户消息不再使用 marked，而是直接显示文本
        // 对特殊字符进行转义
        const escapedMessage = message
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>');
        messageDiv.innerHTML = escapedMessage;
    } else {
        // 检查是否是图片消息
        if (message.startsWith('Generated image: ')) {
            const imageUrl = message.replace('Generated image: ', '');
            messageDiv.innerHTML = `
                <div class="image-loading">
                    <img src="${imageUrl}" alt="AI Generated Image" class="generated-image" />
                </div>
            `;
            return;
        }

        // AI 文本回复的处理
        if (useTypingEffect) {
            const tempDiv = document.createElement('div');
            tempDiv.style.display = 'none';
            
            // 使用 marked 解析，但添加特定配置
            tempDiv.innerHTML = marked.parse(message, {
                breaks: true, // 保留换行
                gfm: true,   // 启用 GitHub 风格 Markdown
                smartLists: true, // 优化列表渲染
                smartypants: true // 优化标点符号
            });
            
            document.body.appendChild(tempDiv);

            let currentIndex = 0;
            const elements = Array.from(tempDiv.children);

            function processNextElement() {
                if (currentIndex < elements.length) {
                    const element = elements[currentIndex];
                    
                    if (element.tagName === 'PRE') {
                        // 代码块特殊处理
                        const codeBlock = element.querySelector('code');
                        if (codeBlock) {
                            const codeWrapper = document.createElement('div');
                            codeWrapper.className = 'code-block-wrapper';
                            
                            // 解析语言和文件名
                            let language = 'plaintext';
                            let filename = '';
                            if (codeBlock.className) {
                                const match = codeBlock.className.match(/language-([^:]+)(?::(.+))?/);
                                if (match) {
                                    language = match[1];
                                    filename = match[2] || '';
                                }
                            }
                            
                            // 设置代码块属性
                            codeWrapper.setAttribute('data-language', language);
                            if (filename) {
                                codeWrapper.setAttribute('data-filename', filename);
                            }
                            
                            const pre = document.createElement('pre');
                            const newCodeBlock = document.createElement('code');
                            newCodeBlock.className = codeBlock.className;
                            
                            pre.appendChild(newCodeBlock);
                            codeWrapper.appendChild(pre);
                            
                            const copyButton = document.createElement('button');
                            copyButton.className = 'copy-button';
                            copyButton.textContent = 'Copy code';
                            copyButton.onclick = () => copyCode(copyButton);
                            codeWrapper.appendChild(copyButton);
                            
                            messageDiv.appendChild(codeWrapper);
                            
                            typeCode(codeBlock.textContent, newCodeBlock, () => {
                                currentIndex++;
                                processNextElement();
                            });
                        }
                    } else {
                        // 普通文本使用打字效果
                        const textElement = document.createElement('div');
                        messageDiv.appendChild(textElement);
                        
                        // 处理 Markdown 内联样式
                        const content = element.outerHTML;
                        typeWriterHTML(content, textElement, () => {
                            currentIndex++;
                            processNextElement();
                        });
                    }
                }
                
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            processNextElement();
            document.body.removeChild(tempDiv);
        } else {
            // 不使用打字效果时的处理
            messageDiv.innerHTML = marked.parse(message, {
                breaks: true,
                gfm: true,
                smartLists: true,
                smartypants: true
            });
            
            // 处理代码块
            messageDiv.querySelectorAll('pre code').forEach(block => {
                const wrapper = block.parentElement.parentElement;
                if (wrapper.classList.contains('code-block-wrapper')) {
                    const match = block.className.match(/language-([^:]+)(?::(.+))?/);
                    if (match) {
                        const language = match[1];
                        const filename = match[2];
                        wrapper.setAttribute('data-language', language);
                        if (filename) {
                            wrapper.setAttribute('data-filename', filename);
                        }
                    }
                }
                hljs.highlightElement(block);
            });
        }
    }

    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 修改 typeWriterHTML 函数，调整打字速度
function typeWriterHTML(html, element, callback = null) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    element.innerHTML = '';
    
    const contents = [];
    function parseNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.replace(/^\s+|\s+$/g, '');
            if (text) {
                contents.push({ type: 'text', content: text });
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            contents.push({ type: 'open', content: node.cloneNode(false) });
            Array.from(node.childNodes).forEach(child => parseNode(child));
            contents.push({ type: 'close' });
        }
    }
    
    Array.from(temp.childNodes).forEach(node => parseNode(node));
    
    let currentIndex = 0;
    let currentTextIndex = 0;
    let currentElement = element;
    const elementStack = [element];
    
    const TYPING_SPEED = 8; // 减少普通文本打字延迟到8ms
    
    function typeNextChar() {
        if (currentIndex >= contents.length) {
            if (callback) callback();
            return;
        }
        
        const current = contents[currentIndex];
        
        switch (current.type) {
            case 'text':
                if (currentTextIndex < current.content.length) {
                    if (!currentElement.lastChild || currentElement.lastChild.nodeType !== Node.TEXT_NODE) {
                        currentElement.appendChild(document.createTextNode(''));
                    }
                    currentElement.lastChild.textContent += current.content[currentTextIndex];
                    currentTextIndex++;
                    setTimeout(typeNextChar, TYPING_SPEED);
                } else {
                    currentIndex++;
                    currentTextIndex = 0;
                    typeNextChar();
                }
                break;
                
            case 'open':
                const newElement = current.content.cloneNode(false);
                currentElement.appendChild(newElement);
                elementStack.push(newElement);
                currentElement = newElement;
                currentIndex++;
                typeNextChar();
                break;
                
            case 'close':
                elementStack.pop();
                currentElement = elementStack[elementStack.length - 1];
                currentIndex++;
                typeNextChar();
                break;
        }
    }
    
    typeNextChar();
}

// 打字机效果函数
function typeWriter(text, element, callback = null) {
    if (!text) {
        if (callback) callback();
        return;
    }
    
    let i = 0;
    element.textContent = '';
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, 30); // 调整打字速度
        } else if (callback) {
            callback();
        }
    }
    
    type();
}

// 复制代码功能
function copyCode(button) {
    const pre = button.parentElement.querySelector('pre');
    const code = pre.textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('复制失败:', err);
        button.textContent = 'Failed to copy';
        
        setTimeout(() => {
            button.textContent = 'Copy code';
        }, 2000);
    });
}

// 加载示器函数
function addTypingIndicator() {
    const chatMessages = document.getElementById('main-chat-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    typingDiv.id = 'typing-indicator';
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// 侧边栏控制
document.getElementById('menuButton').addEventListener('click', function() {
    document.getElementById('sidebar').classList.add('active');
});

// 本地存储相关
function saveToLocalStorage() {
    localStorage.setItem('chatHistory', JSON.stringify(messageHistory));
}

function loadFromLocalStorage() {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
        const history = JSON.parse(savedHistory);
        // 直接加载消息，保持原始顺序
        messageHistory.push(...history);
        
        // 使用addMessage函数显示历史消息
        messageHistory.forEach(msg => {
            addMessage(msg.content, msg.role, 'main-chat-messages', false);
        });
        
        // 滚动到底部
        const chatMessages = document.getElementById('main-chat-messages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// 修改对话按钮功能
document.querySelector('.new-chat').addEventListener('click', function() {
    // 清空当前对话
    currentChatId = null;
    const chatMessages = document.getElementById('main-chat-messages');
    chatMessages.innerHTML = '';
    messageHistory.length = 0;
    
    // 显示欢迎消息
    const welcomeMessage = '你好呀，有什么可以帮忙的？';
    addMessage(welcomeMessage, 'ai', 'main-chat-messages');
    messageHistory.push({
        role: "assistant",
        content: welcomeMessage,
        timestamp: Date.now()
    });
    
    // 移除所有聊天记录的active类
    document.querySelectorAll('.chat-history-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 在移动端时，关闭侧栏和遮罩层
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.querySelector('.sidebar-overlay');
        sidebar.classList.remove('active');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('active');
        }
    }
});

// 更新聊天历史UI
function updateChatHistoryUI() {
    const chatHistory = document.getElementById('chatHistory');
    chatHistory.innerHTML = '';

    chatHistoryList.forEach(chat => {
        // 使用第一条用户消息作为标题
        let title = chat.title;
        const firstUserMessage = chat.messages.find(msg => msg.role === 'user');
        if (firstUserMessage) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = marked.parse(firstUserMessage.content);
            title = tempDiv.textContent.slice(0, 30) + (tempDiv.textContent.length > 30 ? '...' : '');
        }

        const chatElement = document.createElement('div');
        chatElement.className = `chat-history-item${chat.id === currentChatId ? ' active' : ''}`;
        chatElement.dataset.id = chat.id;
        chatElement.innerHTML = `
            <span class="chat-title">${title}</span>
            <button class="delete-chat" data-id="${chat.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        `;

        // 为删除按钮添加事件监听器
        const deleteButton = chatElement.querySelector('.delete-chat');
        deleteButton.addEventListener('click', async (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            
            showDeleteConfirmModal(async (confirmed) => {
                if (confirmed) {
                    try {
                        const formData = new FormData();
                        formData.append('action', 'deleteChatHistory');
                        formData.append('chatId', chat.id);
                        
                        const response = await fetch('api.php', {
                            method: 'POST',
                            body: formData
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            // 如果删除的是当前对话，清空聊天区域
                            if (chat.id === currentChatId) {
                                currentChatId = null;
                                document.getElementById('main-chat-messages').innerHTML = '';
                                messageHistory.length = 0;
                                
                                // 显示欢迎消息
                                const welcomeMessage = '你好呀，有什么可以帮忙的？';
                                addMessage(welcomeMessage, 'ai', 'main-chat-messages');
                            }
                            
                            // 重新加载聊天历史
                            await loadUserChatHistory();
                        } else {
                            alert('删除失败：' + (data.error || '未知错误'));
                        }
                    } catch (error) {
                        console.error('删除聊天失败:', error);
                        alert('删除失败，请重试');
                    }
                }
            });
        });

        // 点击加载对话
        chatElement.addEventListener('click', async (e) => {
            // 如果点击的是删除按钮，不执行加载
            if (e.target.closest('.delete-chat')) {
                return;
            }
            
            // 移除其他对话的active类
            document.querySelectorAll('.chat-history-item').forEach(item => {
                item.classList.remove('active');
            });
            // 添加当前对话的active类
            chatElement.classList.add('active');

            currentChatId = chat.id;
            const chatMessages = document.getElementById('main-chat-messages');
            chatMessages.innerHTML = '';
            messageHistory.length = 0;

            // 确保消息按时间戳排序后再加载
            const sortedMessages = chat.messages.sort((a, b) => {
                return (b.timestamp || 0) - (a.timestamp || 0);
            });

            sortedMessages.forEach(msg => {
                messageHistory.push({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp || Date.now() // 确保有时间戳
                });
                
                if (msg.role === 'assistant') {
                    // 对于AI消息，需要重新解析并应用样式
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message assistant-message';
                    chatMessages.appendChild(messageDiv);
                    
                    if (msg.content.startsWith('Generated image: ')) {
                        // 处理图片消息
                        const imageUrl = msg.content.replace('Generated image: ', '');
                        messageDiv.innerHTML = `
                            <div class="image-loading">
                                <img src="${imageUrl}" alt="AI Generated Image" class="generated-image" />
                            </div>
                        `;
                    } else {
                        // 处理文本消息，包括代码块
                        messageDiv.innerHTML = marked.parse(msg.content);
                        // 为所有代码块添加包装器和复制按钮
                        messageDiv.querySelectorAll('pre code').forEach(codeBlock => {
                            const wrapper = document.createElement('div');
                            wrapper.className = 'code-block-wrapper';
                            
                            // 解析语言和文件名
                            const match = codeBlock.className.match(/language-([^:]+)(?::(.+))?/);
                            if (match) {
                                const language = match[1];
                                const filename = match[2];
                                wrapper.setAttribute('data-language', language);
                                if (filename) {
                                    wrapper.setAttribute('data-filename', filename);
                                }
                            }
                            
                            const pre = codeBlock.parentElement;
                            pre.parentElement.insertBefore(wrapper, pre);
                            wrapper.appendChild(pre);
                            
                            const copyButton = document.createElement('button');
                            copyButton.className = 'copy-button';
                            copyButton.textContent = 'Copy code';
                            copyButton.onclick = () => copyCode(copyButton);
                            wrapper.appendChild(copyButton);
                            
                            // 应用代码高亮
                            hljs.highlightElement(codeBlock);
                        });
                    }
                } else {
                    // 用户消息直接显示
                    addMessage(msg.content, msg.role, 'main-chat-messages', false);
                }
            });

            // 滚动到底部
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // 在移动端加载对话后关闭侧边栏和遮罩层
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            }
        });

        chatHistory.appendChild(chatElement);
    });
}

// 加载历史对话
function loadChat(chat) {
    messageHistory.length = 0;
    
    // 直接加载消息，保持原始顺序
    messageHistory.push(...chat.messages);
    
    document.getElementById('main-chat-messages').innerHTML = '';
    messageHistory.forEach(msg => {
        addMessage(msg.content, msg.role, 'main-chat-messages', false);
    });
    
    // 确保所有代码块都应用高亮
    document.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
    });
    
    // 滚动到底部
    const chatMessages = document.getElementById('main-chat-messages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 更新本地存储
    saveToLocalStorage();
    
    // 在移动端加载对话后关闭侧边栏和遮罩层
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('active');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('active');
        }
    }
}

// 删除历史对话
async function deleteChatHistory(chatId) {
    try {
        const formData = new FormData();
        formData.append('action', 'deleteChatHistory');
        formData.append('chatId', chatId);
        
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 重新加载聊天历史
            await loadUserChatHistory();
        } else {
            throw new Error(data.error || '删除聊天历史失败');
        }
    } catch (error) {
        console.error('删除聊天历史失败:', error);
        alert('删除聊条历史失败，请重试');
    }
}

// 加载用户的聊天历史
async function loadUserChatHistory() {
    try {
        const formData = new FormData();
        formData.append('action', 'getChatHistory');
        
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 清空现有历史
            chatHistoryList.length = 0;
            
            // 加载新的史记录
            for (const history of data.histories) {
                chatHistoryList.push({
                    id: history.id,
                    title: history.title,
                    messages: await getMessages(history.id)
                });
            }
            
            // 更新UI
            updateChatHistoryUI();
        } else {
            throw new Error(data.error || '加载聊天历史失败');
        }
    } catch (error) {
        console.error('加载聊天历史失败:', error);
        alert('加载聊天历史失败，请重试');
    }
}

// 获取特定聊天记录的消息
async function getMessages(chatId) {
    try {
        const formData = new FormData();
        formData.append('action', 'getMessages');
        formData.append('chatId', chatId);
        
        const response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 根据消息的顺序排序，确保顺序与保存时一致
            return data.messages.sort((a, b) => a.order - b.order);
        } else {
            throw new Error(data.error || '获取消息失败');
        }
    } catch (error) {
        console.error('获取消息失败:', error);
        return [];
    }
}

// 在页面加载时添加事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // 显示录模态框
    const loginModal = document.getElementById('loginModal');
    // 检查登录状态
    checkLoginStatus();
    
    async function checkLoginStatus() {
        try {
            const formData = new FormData();
            formData.append('action', 'checkLogin');
            
            const response = await fetch('api.php', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 已登录加载聊天历史
                await loadUserChatHistory();
                // 如果有历史记录，显示欢迎消息
                const chatMessages = document.getElementById('main-chat-messages');
                if (chatMessages.children.length === 0) {
                    const welcomeMessage = '你好呀，有什么可以帮忙的？';
                    addMessage(welcomeMessage, 'ai', 'main-chat-messages');
                }
            } else {
                // 未登录，显示登录框
                loginModal.classList.add('active');
            }
        } catch (error) {
            console.error('检查登录态失败:', error);
            loginModal.classList.add('active');
        }
    }

    // 处理登录表单提交
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const formData = new FormData();
            formData.append('action', 'login');
            formData.append('username', username);
            formData.append('password', password);
            
            const response = await fetch('api.php', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('登录成功:', data.user.username);
                loginModal.classList.remove('active');
                
                // 加载用户的聊天历史
                await loadUserChatHistory();
                
                // 如果没有历史记录，显示欢迎消息
                const chatMessages = document.getElementById('main-chat-messages');
                if (chatMessages.children.length === 0) {
                    const welcomeMessage = '你好呀，有什么可以帮忙的？';
                    addMessage(welcomeMessage, 'ai', 'main-chat-messages');
                }
            } else {
                throw new Error(data.error || '登录失败');
            }
        } catch (error) {
            console.error('登录失败:', error);
            alert(error.message || '登录失败请重试');
        }
    });
    
    // 发送按钮点击事件
    document.getElementById('send-button').addEventListener('click', sendMainMessage);
    
    // 输入框事件
    const userInput = document.getElementById('main-user-input');
    
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMainMessage();
        }
    });
    
    userInput.addEventListener('input', function() {
        this.style.height = '45px';
        const newHeight = Math.min(this.scrollHeight, 120);
        this.style.height = newHeight + 'px';
        
        // 调整发送按钮的位置
        const sendButton = document.getElementById('send-button');
        if (newHeight > 45) {
            sendButton.style.height = newHeight + 'px';
        } else {
            sendButton.style.height = '45px';
        }
    });
    
    // 创建遮罩层
    sidebarOverlay = document.createElement('div');
    sidebarOverlay.className = 'sidebar-overlay';
    document.body.appendChild(sidebarOverlay);
    
    // 菜单按钮点击事件
    document.getElementById('menuButton').addEventListener('click', function() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
    });
    
    // 遮罩层点击事件
    sidebarOverlay.addEventListener('click', function() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });

    // 修改模型选择器相关代码
    document.querySelector('.model-selector').innerHTML = `
        <div class="model-dropdown" id="modelDropdown">
            <div class="model-option" data-model="yuanzhi">鸢栀助手</div>
            <div class="model-option" data-model="gpt">通用助手</div>
            <div class="model-option" data-model="draw">绘画助手</div>
        </div>
        <button class="model-button" id="modelButton">
            <span class="model-name">鸢栀助手</span>
            <span class="dropdown-arrow">▼</span>
        </button>
    `;

    // 切换下拉菜单
    const modelButton = document.getElementById('modelButton');
    if (modelButton) {
        modelButton.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('modelDropdown');
            
            // 如果下拉菜单已显示，先移除 show 类
            if (dropdown.classList.contains('show')) {
                dropdown.style.opacity = '0';
                dropdown.style.transform = 'translateY(-10px)';
                dropdown.style.visibility = 'hidden';
                
                setTimeout(() => {
                    dropdown.classList.remove('show');
                }, 200);
            } else {
                // 如果下拉菜单隐藏，先添加 show 类
                dropdown.classList.add('show');
                
                // 强制重绘
                dropdown.offsetHeight;
                
                // 设置可和度
                dropdown.style.visibility = 'visible';
                dropdown.style.opacity = '1';
                dropdown.style.transform = 'translateY(0)';
            }
        });
    }

    // 修改模型选项点击事件处理
    document.querySelectorAll('.model-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            const modelName = this.textContent;
            const modelType = this.dataset.model;
            const dropdown = document.getElementById('modelDropdown');
            
            // 更新按钮文本
            document.querySelector('.model-button .model-name').textContent = modelName;
            
            // 关闭下拉菜单（带动画）
            dropdown.style.opacity = '0';
            dropdown.style.transform = 'translateY(-10px)';
            dropdown.style.visibility = 'hidden';
            
            setTimeout(() => {
                dropdown.classList.remove('show');
            }, 200);
            
            // 只更新当前模型,不显示开场白
            setCurrentModel(modelType);
        });
    });

    // 点击其他地时关闭下拉菜单
    document.addEventListener('click', function() {
        const dropdown = document.getElementById('modelDropdown');
        if (dropdown.classList.contains('show')) {
            dropdown.style.opacity = '0';
            dropdown.style.transform = 'translateY(-10px)';
            dropdown.style.visibility = 'hidden';
            
            setTimeout(() => {
                dropdown.classList.remove('show');
            }, 200);
        }
    });

    // 处理 ESC 键
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const dropdown = document.getElementById('modelDropdown');
            if (dropdown.classList.contains('show')) {
                dropdown.style.opacity = '0';
                dropdown.style.transform = 'translateY(-10px)';
                dropdown.style.visibility = 'hidden';
                
                setTimeout(() => {
                    dropdown.classList.remove('show');
                }, 200);
            }
        }
    });
});

// 修改 sendMainMessage 函数
async function sendMainMessage() {
    const userInput = document.getElementById('main-user-input');
    const message = userInput.value.trim();
    
    if (!message) return;

    // 禁用输入和发送按钮
    userInput.disabled = true;
    const sendButton = document.getElementById('send-button');
    sendButton.disabled = true;

    try {
        // 添加用户消息到历史记录时包含时间戳
        messageHistory.push({
            role: "user",
            content: message,
            timestamp: Date.now()
        });

        addMessage(message, 'user', 'main-chat-messages');
        userInput.value = '';
        userInput.style.height = '45px';
        sendButton.style.height = '45px';

        const currentModel = getCurrentModel();
        // 检查当前模型是否绘画模型
        if (currentModel === 'draw') {
            // 添加骨架屏
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message assistant-message';
            loadingDiv.innerHTML = `
                <div class="image-loading">
                    <div class="image-skeleton"></div>
                    <div class="image-loading-text">正在生成图片请稍候...</div>
                </div>
            `;
            document.getElementById('main-chat-messages').appendChild(loadingDiv);
            
            const response = await sendDrawRequest(message);
            
            if (response.success && response.imageUrl) {
                // 移除骨架屏
                loadingDiv.remove();
                
                // 添加生成的图片
                const imageMessage = `Generated image: ${response.imageUrl}`;
                addMessage(imageMessage, 'assistant', 'main-chat-messages');
                
                // 添加到消息历史
                messageHistory.push({
                    role: "assistant",
                    content: imageMessage,
                    timestamp: Date.now()
                });

                // 保存到数据库
                try {
                    const formData = new FormData();
                    formData.append('action', 'saveChatHistory');
                    
                    // 使用第一条用户消息作为标题
                    const firstUserMessage = messageHistory.find(msg => msg.role === 'user');
                    let chatTitle = firstUserMessage ? firstUserMessage.content : '新对话';
                    
                    // 添加消息序号，确保顺序
                    const messagesWithOrder = messageHistory.map((msg, index) => ({
                        ...msg,
                        order: index
                    }));
                    
                    formData.append('title', chatTitle);
                    formData.append('messages', JSON.stringify(messagesWithOrder));
                    
                    // 如果是现有对话，添加 chatId
                    if (currentChatId) {
                        formData.append('chatId', currentChatId);
                    }
                    
                    const saveResponse = await fetch('api.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const saveData = await saveResponse.json();
                    
                    if (saveData.success) {
                        // 更新当前对话ID
                        if (!currentChatId) {
                            currentChatId = saveData.chatId;
                        }
                        // 重新加载聊天历史列表
                        await loadUserChatHistory();
                    }
                } catch (error) {
                    console.error('保存聊天历史失败:', error);
                }
            } else {
                // 移除骨架屏
                loadingDiv.remove();
                // 显示错误消息
                const errorMessage = '生成图片失败，请稍后重试。';
                addMessage(errorMessage, 'assistant', 'main-chat-messages');
                
                // 添加错误消息到历史记录并保存
                messageHistory.push({
                    role: "assistant",
                    content: errorMessage,
                    timestamp: Date.now()
                });
                
                // 保存错误消息到数据库
                try {
                    const formData = new FormData();
                    formData.append('action', 'saveChatHistory');
                    const messagesWithOrder = messageHistory.map((msg, index) => ({
                        ...msg,
                        order: index
                    }));
                    formData.append('messages', JSON.stringify(messagesWithOrder));
                    if (currentChatId) {
                        formData.append('chatId', currentChatId);
                    }
                    await fetch('api.php', { method: 'POST', body: formData });
                    await loadUserChatHistory();
                } catch (error) {
                    console.error('保存聊天历史失败:', error);
                }
            }
        } else {
            // 非绘画模式才显示三点加载画
            addTypingIndicator();

            // 使用 API 模块发送消息
            const messages = buildMessages(messageHistory);
            const response = await sendToAPI(messages);

            removeTypingIndicator();

            if (response.success) {
                // 添加AI回复到历史记录
                messageHistory.push({
                    role: "assistant",
                    content: response.content,
                    timestamp: Date.now()
                });

                // 如果历史记录长，删除旧的对话
                while (messageHistory.length > API_CONFIG.MAX_HISTORY * 2) {
                    messageHistory.shift();
                }

                addMessage(response.content, 'ai', 'main-chat-messages');

                // 保存到数据库
                try {
                    const formData = new FormData();
                    formData.append('action', 'saveChatHistory');
                    
                    // 使用第一条用户消息作为标题
                    const firstUserMessage = messageHistory.find(msg => msg.role === 'user');
                    let chatTitle = '新对话';
                    if (firstUserMessage) {
                        chatTitle = firstUserMessage.content;
                    }
                    
                    // 添加消息序号，确保顺序
                    const messagesWithOrder = messageHistory.map((msg, index) => ({
                        ...msg,
                        order: index
                    }));
                    
                    formData.append('title', chatTitle);
                    formData.append('messages', JSON.stringify(messagesWithOrder));
                    
                    if (currentChatId && messageHistory.length > 2) {
                        formData.append('chatId', currentChatId);
                    }
                    
                    const saveResponse = await fetch('api.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const saveData = await saveResponse.json();
                    
                    if (saveData.success) {
                        if (!currentChatId || messageHistory.length <= 2) {
                            currentChatId = saveData.chatId;
                        }
                        await loadUserChatHistory();
                    }
                } catch (error) {
                    console.error('保存聊天历史失败:', error);
                }
            } else {
                console.error('API Response Error:', response);
                const errorMessage = response.error || '唔...出错了呢~ 请稍后再试w（耳朵耷拉下来）';
                addMessage(errorMessage, 'ai', 'main-chat-messages');
            }
        }
    } catch (error) {
        console.error('Send Message Error:', error);
        if (getCurrentModel() !== 'draw') {
            removeTypingIndicator();
        }
        addMessage('发生了外部错误，请稍后重试（伤心地垂下耳朵）', 'ai', 'main-chat-messages');
    } finally {
        // 重新启用和发送按钮
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }
}

// 修改主题切换功能
function initThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle'); // 修改这里，使用 class 选择器
    const root = document.documentElement;
    
    // 从localStorage加载主题设置
    const savedTheme = localStorage.getItem('theme') || 'dark';
    root.setAttribute('data-theme', savedTheme);
    
    if (themeToggle) {
        // 移除可能存在的旧事件监听器
        themeToggle.replaceWith(themeToggle.cloneNode(true));
        const newThemeToggle = document.querySelector('.theme-toggle');
        
        newThemeToggle.addEventListener('click', () => {
            const currentTheme = root.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            root.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            // 更新图标
            updateThemeIcon(newTheme);
        });
        
        // 初始化图标
        updateThemeIcon(savedTheme);
    }
}

function updateThemeIcon(theme) {
    const themeToggle = document.querySelector('.theme-toggle'); // 修改这里，使用 class 选择器
    if (!themeToggle) return;
    
    if (theme === 'light') {
        themeToggle.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
        `;
    } else {
        themeToggle.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
        `;
    }
}

// 确保在 DOMContentLoaded 时初始化主题切换功能
document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    
    // 其他初始化代码...
});

// 在页面加载完成后也初始化一次
window.addEventListener('load', () => {
    initThemeToggle();
});

// 添加模态框控制函数
function showDeleteConfirmModal(callback) {
    const modal = document.getElementById('deleteConfirmModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);

    const confirmBtn = modal.querySelector('.confirm');
    const cancelBtn = modal.querySelector('.cancel');
    
    function closeModal() {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    }
    
    function handleConfirm() {
        closeModal();
        callback(true);
    }
    
    function handleCancel() {
        closeModal();
        callback(false);
    }
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}

// 修改删除按钮的事件处理
deleteButton.addEventListener('click', async (e) => {
    e.stopPropagation(); // 阻止事件冒泡
    
    showDeleteConfirmModal(async (confirmed) => {
        if (confirmed) {
            try {
                const formData = new FormData();
                formData.append('action', 'deleteChatHistory');
                formData.append('chatId', chat.id);
                
                const response = await fetch('api.php', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // 如果删除的是当前对话，清空聊天区域
                    if (chat.id === currentChatId) {
                        currentChatId = null;
                        document.getElementById('main-chat-messages').innerHTML = '';
                        messageHistory.length = 0;
                        
                        // 显示欢迎消息
                        const welcomeMessage = '你好呀，有什么可以帮忙的？';
                        addMessage(welcomeMessage, 'ai', 'main-chat-messages');
                    }
                    
                    // 重新加载聊天历史
                    await loadUserChatHistory();
                } else {
                    alert('删除失败：' + (data.error || '未知错误'));
                }
            } catch (error) {
                console.error('删除聊天失败:', error);
                alert('删除失败，请重试');
            }
        }
    });
});

// 在聊天记录项中创建删除按钮
function createChatHistoryItem(chat) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-history-item';
    chatItem.setAttribute('data-chat-id', chat.id);

    // 创建删除按钮
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-chat-button';
    deleteButton.innerHTML = '×';
    deleteButton.title = '删除对话';

    // 添加删除按钮的点击事件
    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        showDeleteConfirmation(chat.id);
    });

    // 创建标题元素
    const titleElement = document.createElement('span');
    titleElement.className = 'chat-title';
    titleElement.textContent = chat.title || '新对话';

    // 将元素添加到聊天项中
    chatItem.appendChild(titleElement);
    chatItem.appendChild(deleteButton);

    // 添加点击事件以加载聊天记录
    chatItem.addEventListener('click', () => {
        loadChat(chat.id);
    });

    return chatItem;
}

// 显示删除确认对话框
function showDeleteConfirmation(chatId) {
    const modal = document.getElementById('deleteConfirmModal');
    const confirmButton = modal.querySelector('.confirm');
    const cancelButton = modal.querySelector('.cancel');

    // 显示模态框
    modal.style.display = 'flex';
    modal.classList.add('active');

    // 确认删除
    const handleConfirm = async () => {
        try {
            await deleteChat(chatId);
            // 从 UI 中移除聊天项
            const chatItem = document.querySelector(`.chat-history-item[data-chat-id="${chatId}"]`);
            if (chatItem) {
                chatItem.remove();
            }
        } catch (error) {
            console.error('删除聊天失败:', error);
        } finally {
            closeModal();
        }
    };

    // 取消删除
    const handleCancel = () => {
        closeModal();
    };

    // 关闭模态框
    const closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
        // 移除事件监听器
        confirmButton.removeEventListener('click', handleConfirm);
        cancelButton.removeEventListener('click', handleCancel);
    };

    // 添加事件监听器
    confirmButton.addEventListener('click', handleConfirm);
    cancelButton.addEventListener('click', handleCancel);
}

// 删除聊天的 API 调用函数
async function deleteChat(chatId) {
    try {
        const response = await fetch(`/api/delete_chat.php?chat_id=${chatId}`, {
            method: 'DELETE',
        });
        
        if (!response.ok) {
            throw new Error('删除聊天失败');
        }
        
        return await response.json();
    } catch (error) {
        console.error('删除聊天出错:', error);
        throw error;
    }
}