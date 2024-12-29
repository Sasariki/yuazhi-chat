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
    <title>注册 - AI Chat</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200">
    <style>
        .privacy-notice {
            font-size: 13px;
            color: #8e8ea0;
            text-align: center;
            margin: 0;
            padding: 12px 0 0 0;
            line-height: 1.5;
        }

        .privacy-notice a {
            color: var(--theme-color);
            text-decoration: none;
        }

        .privacy-notice a:hover {
            text-decoration: underline;
        }

        .login-link {
            color: var(--theme-color);
            text-decoration: none;
            transition: all 0.3s ease;
        }

        .login-link:hover {
            text-decoration: underline;
        }

        .login-footer {
            margin-top: 1.5rem;
            font-size: 14px;
            color: #8e8ea0;
            text-align: center;
        }

        .login-box .divider {
            margin-top: 15px !important;
            padding-top: 0;
            color: #8e8ea0;
        }

        .login-box .divider span {
            padding: 0;
            background: none;
            opacity: 0.8;
        }

        #registerForm button[type="submit"] {
            margin-bottom: 0;
        }

        #registerForm {
            margin-bottom: 0;
        }

        #registerForm button[type="submit"] + .privacy-notice {
            margin-top: 12px;
        }
    </style>
</head>

<body>
    <div class="login-container">
        <div class="login-box">
            
            <h2>创建账户</h2>
            <form id="registerForm">
                <div class="error-message" style="display: none;">
                    <span class="material-symbols-outlined">error</span>
                    <span id="errorText">注册失败</span>
                </div>
                <input type="text" id="username" placeholder="用户名" required>
                <input type="email" id="email" placeholder="电子邮件地址" required>
                <input type="password" id="password" placeholder="密码" required>
                <input type="password" id="confirmPassword" placeholder="确认密码" required>
                <button type="submit">注册</button>
                <div class="privacy-notice">
                    注册即表示您同意我们的<a href="privacy.php" target="_blank">隐私政策</a>
                </div>
            </form>
            <div class="divider">
                <span>或</span>
            </div>
            
            <div class="login-footer">
                已有帐户？<a href="login.php" class="login-link">登录</a>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('registerForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const errorDiv = document.querySelector('.error-message');
            const errorText = document.getElementById('errorText');
            
            // 隐藏之前的错误信息
            errorDiv.style.display = 'none';

            // 验证密码匹配
            if (password !== confirmPassword) {
                errorText.textContent = '两次输入的密码不一致';
                errorDiv.style.display = 'flex';
                errorDiv.classList.remove('hide');
                
                setTimeout(() => {
                    errorDiv.classList.add('hide');
                    setTimeout(() => {
                        errorDiv.style.display = 'none';
                    }, 300);
                }, 3000);
                return;
            }
            
            try {
                const formData = new FormData();
                formData.append('action', 'register');
                formData.append('username', username);
                formData.append('email', email);
                formData.append('password', password);
                
                const response = await fetch('api.php', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    window.location.href = 'index.php';
                } else {
                    throw new Error(data.error || '注册失败');
                }
            } catch (error) {
                console.error('注册失败:', error);
                errorText.textContent = error.message || '注册失败，请重试';
                errorDiv.style.display = 'flex';
                errorDiv.classList.remove('hide');
                
                // 3秒后淡出并隐藏
                setTimeout(() => {
                    errorDiv.classList.add('hide');
                    setTimeout(() => {
                        errorDiv.style.display = 'none';
                    }, 300);
                }, 3000);
            }
        });

        // 社交登录按钮事件
        document.querySelector('.google-login').addEventListener('click', () => {
            // 实现 Google 注��
            console.log('Google register clicked');
        });

        document.querySelector('.microsoft-login').addEventListener('click', () => {
            // 实现 Microsoft 注册
            console.log('Microsoft register clicked');
        });

        document.querySelector('.apple-login').addEventListener('click', () => {
            // 实现 Apple 注册
            console.log('Apple register clicked');
        });
    </script>
</body>
</html> 