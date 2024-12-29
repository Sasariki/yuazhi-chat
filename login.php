<?php
session_start();

// 如果已经登录，重定向到主页
if (isset($_SESSION['user_id']) || isset($_COOKIE['user_id'])) {
    header('Location: index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="鸢栀AI助手是一款智能对话机器人，提供智能问答、图片创作、代码编程等多样化服务。作为新一代AI助手，我们致力于为用户提供更智能、更贴心的对话体验，让AI服务更加便捷、高效。">
    <meta name="keywords" content="鸢栀AI,AI助手,智能对话,AI绘画,AI编程,人工智能,聊天机器人,AI问答,智能助手">
    <meta name="author" content="鸢栀AI">
    <meta name="robots" content="index, follow">

    <!-- Open Graph Tags -->
    <meta property="og:title" content="鸢栀AI助手 - 智能对话新体验">
    <meta property="og:description" content="提供智能问答、图片创作、代码编程等多样化AI服务，打造更智能的对话体验">
    <meta property="og:image" content="/recommend.png">
    <meta property="og:url" content="https://chat.yuanzhi.ai/">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="zh_CN">

    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="鸢栀AI助手 - 智能对话新体验">
    <meta name="twitter:description" content="提供智能问答、图片创作、代码编程等多样化AI服务，打造更智能的对话体验">
    <meta name="twitter:image" content="/recommend.png">
    
    <title>聊天 - 与鸢栀对话</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200">
</head>

<body>
    <div class="login-container">
        <div class="login-box">
            
            <h2>欢迎回来</h2>
            <form id="loginForm">
                <div class="error-message" style="display: none;">
                    <span class="material-symbols-outlined">error</span>
                    <span id="errorText">用户名或密码错误</span>
                </div>
                <input type="text" id="username" placeholder="电子邮件地址" required>
                <input type="password" id="password" placeholder="密码" required>
                <div class="form-footer">
                </div>
                <button type="submit">登录</button>
            </form>
            <div class="divider">
                <span>或</span>
            </div>
            
            <div class="login-footer">
                还没有帐户？<a href="register.php" class="register-link">注册</a>
            </div>
            <br>
            <a href="forgot-password.php" class="forgot-password-link">忘记密码？</a>
        </div>
        
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.querySelector('.error-message');
            const errorText = document.getElementById('errorText');
            
            // 隐藏之前的错误信息
            errorDiv.style.display = 'none';
            
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
                    window.location.href = 'index.php';
                } else {
                    throw new Error(data.error || '用户名或密码错误');
                }
            } catch (error) {
                console.error('登录失败:', error);
                errorText.textContent = error.message || '用户名或密码错误';
                errorDiv.style.display = 'flex';
                errorDiv.classList.remove('hide');
                
                // 3秒后淡出并隐藏
                setTimeout(() => {
                    errorDiv.classList.add('hide');
                    // 等待过渡效果完成后再隐藏元素
                    setTimeout(() => {
                        errorDiv.style.display = 'none';
                    }, 300);
                }, 3000);
            }
        });

        // 社交登录按钮事件
        document.querySelector('.google-login').addEventListener('click', () => {
            // 实现 Google 登录
            console.log('Google login clicked');
        });

        document.querySelector('.microsoft-login').addEventListener('click', () => {
            // 实现 Microsoft 登录
            console.log('Microsoft login clicked');
        });

        document.querySelector('.apple-login').addEventListener('click', () => {
            // 实现 Apple 登录
            console.log('Apple login clicked');
        });
    </script>
</body>
</html> 