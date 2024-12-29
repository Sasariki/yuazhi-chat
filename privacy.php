<?php
session_start();
?>
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>隐私政策 - AI Chat</title>
    <style>
        :root {
            --primary-color: #2c2c2c;
            --secondary-color: #343541;
            --text-color: #FFFFFF;
            --border-color: #4A4B53;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            background-color: var(--primary-color);
            color: var(--text-color);
            line-height: 1.6;
        }

        .privacy-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }

        .privacy-content {
            background-color: var(--secondary-color);
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .privacy-content h1 {
            color: var(--text-color);
            margin-bottom: 20px;
            font-size: 24px;
            font-weight: 500;
        }

        .privacy-content h2 {
            color: var(--text-color);
            margin: 25px 0 15px;
            font-size: 18px;
            font-weight: 500;
        }

        .privacy-content section {
            margin-bottom: 30px;
        }

        .privacy-content ul {
            padding-left: 20px;
            margin: 10px 0;
            color: var(--text-color);
            opacity: 0.9;
        }

        .privacy-content li {
            margin: 8px 0;
        }

        .privacy-content p {
            color: var(--text-color);
            opacity: 0.9;
            margin: 10px 0;
        }

        @media (max-width: 480px) {
            .privacy-container {
                padding: 15px;
            }
            
            .privacy-content {
                padding: 20px;
            }

            .privacy-content h1 {
                font-size: 22px;
            }

            .privacy-content h2 {
                font-size: 16px;
            }
        }

        .back-button {
            position: fixed;
            top: 20px;
            left: 20px;
            background: transparent;
            border: none;
            color: var(--text-color);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            padding: 8px 12px;
            border-radius: 6px;
            transition: background-color 0.3s ease;
            z-index: 1000;
        }

        .back-button:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }

        .back-button span {
            font-size: 20px;
        }

        @media (max-width: 480px) {
            .back-button {
                position: absolute;
                top: 20px;
                left: 15px;
            }

            .privacy-container {
                padding-top: 70px;
            }
            
            .privacy-content {
                padding: 20px;
                margin-top: 10px;
            }
        }
    </style>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200">
</head>
<body>
    <button onclick="window.location.href='register.php'" class="back-button">
        <span class="material-symbols-outlined">arrow_back</span>
        返回注册
    </button>
    <div class="privacy-container">
        <div class="privacy-content">
            <h1>隐私政策</h1>
            <p>最后更新日期：<?php echo date('Y-m-d'); ?></p>

            <section>
                <h2>1. 信息收集</h2>
                <p>我们收集以下类型的信息：</p>
                <ul>
                    <li>基本账户信息（用户名、电子邮件地址）</li>
                    <li>登录凭据（经过加密的密码）</li>
                    <li>使用我们服务时的对话记录</li>
                </ul>
            </section>

            <section>
                <h2>2. 信息使用</h2>
                <p>我们使用收集的信息用于：</p>
                <ul>
                    <li>提供、维护和改进我们的服务</li>
                    <li>处理您的注册和维护您的账户</li>
                    <li>响应您的询问和请求</li>
                    <li>发送服务相关的通知</li>
                </ul>
            </section>

            <section>
                <h2>3. 信息安全</h2>
                <p>我们采取适当的技术和组织措施来保护您的个人信息，包括：</p>
                <ul>
                    <li>使用加密技术保护数据传输</li>
                    <li>定期更新安全措施</li>
                    <li>限制员工访问个人信息</li>
                </ul>
            </section>

            <section>
                <h2>4. 信息共享</h2>
                <p>我们不会出售、出租或与第三方共享您的个人信息，除非：</p>
                <ul>
                    <li>获得您的明确同意</li>
                    <li>法律要求</li>
                    <li>保护我们的权利和财产</li>
                </ul>
            </section>

            <section>
                <h2>5. 您的权利</h2>
                <p>您有权：</p>
                <ul>
                    <li>访问您的个人信息</li>
                    <li>更正不准确的信息</li>
                    <li>要求删���您的账户</li>
                    <li>反对或限制某些处理</li>
                </ul>
            </section>

            <section>
                <h2>6. 联系我们</h2>
                <p>如果您对本隐私政策有任何疑问，请通过以下方式联系我们：</p>
                <p>邮箱：contact@aichat.com</p>
            </section>
        </div>
    </div>
</body>
</html>