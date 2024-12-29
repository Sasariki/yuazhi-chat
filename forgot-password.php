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
    <title>忘记密码 - AI Chat</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200">
</head>

<body>
    <div class="login-container">
        <div class="login-box">
            <h2>重置密码</h2>
            <p class="reset-description">请输入您的电子邮件地址，我们将向您发送重置密码的链接。</p>
            
            <form id="forgotPasswordForm">
                <div class="error-message" style="display: none;">
                    <span class="material-symbols-outlined">error</span>
                    <span id="errorText"></span>
                </div>
                <div class="success-message" style="display: none;">
                    <span class="material-symbols-outlined">check_circle</span>
                    <span id="successText"></span>
                </div>
                <input type="email" id="email" placeholder="电子邮件地址" required>
                <button type="submit">
                    <span class="button-text">发送重置链接</span>
                    <span class="loading-spinner" style="display: none;">
                        <span class="material-symbols-outlined rotating">progress_activity</span>
                    </span>
                </button>
            </form>
            
            <div class="login-footer">
                <a href="login.php" class="back-to-login">返回登录</a>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('forgotPasswordForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const errorDiv = document.querySelector('.error-message');
            const successDiv = document.querySelector('.success-message');
            const errorText = document.getElementById('errorText');
            const successText = document.getElementById('successText');
            
            // 隐藏之前的消息
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';
            
            try {
                const formData = new FormData();
                formData.append('action', 'forgot_password');
                formData.append('email', email);
                
                const response = await fetch('api.php', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    successText.textContent = '重置密码链接已发送到您的邮箱，请查收。';
                    successDiv.style.display = 'flex';
                    document.getElementById('email').value = '';
                    
                    // 3秒后隐藏成功消息
                    setTimeout(() => {
                        successDiv.classList.add('fade-out');
                        setTimeout(() => {
                            successDiv.style.display = 'none';
                            successDiv.classList.remove('fade-out');
                        }, 300);
                    }, 3000);
                } else {
                    throw new Error(data.error || '发送重置链接失败');
                }
            } catch (error) {
                console.error('发送失败:', error);
                errorText.textContent = error.message || '发送重置链接失败';
                errorDiv.style.display = 'flex';
                
                // 3秒后隐藏错误消息
                setTimeout(() => {
                    errorDiv.classList.add('fade-out');
                    setTimeout(() => {
                        errorDiv.style.display = 'none';
                        errorDiv.classList.remove('fade-out');
                    }, 300);
                }, 3000);
            }
        });
    </script>
</body>
</html> 