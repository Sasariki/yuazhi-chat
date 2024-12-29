<?php
session_start();

// 如果已经登录，重定向到主页
if (isset($_SESSION['user_id']) || isset($_COOKIE['user_id'])) {
    header('Location: index.php');
    exit;
}

// 检查是否有token参数
$token = $_GET['token'] ?? '';
if (empty($token)) {
    header('Location: login.php');
    exit;
}

// 数据库连接配置
$dbConfig = [
    'host' => 'localhost',
    'user' => 'chat_rjjr_cn',
    'password' => '7y9NE2rGehAS494M',
    'database' => 'chat_rjjr_cn'
];

// 创建数据库连接
$mysqli = new mysqli($dbConfig['host'], $dbConfig['user'], $dbConfig['password'], $dbConfig['database']);

if ($mysqli->connect_error) {
    die('数据库连接失败');
}

$mysqli->set_charset('utf8mb4');

// 验证token是否有效
$stmt = $mysqli->prepare("
    SELECT email, expires_at 
    FROM password_resets 
    WHERE token = ? AND used = 0 AND expires_at > NOW()
    ORDER BY created_at DESC 
    LIMIT 1
");

$stmt->bind_param('s', $token);
$stmt->execute();
$result = $stmt->get_result();
$reset = $result->fetch_assoc();

if (!$reset) {
    header('Location: login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>重置密码 - AI Chat</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200">
</head>
<body>
    <div class="login-container">
        <div class="login-box">
            <h2>重置密码</h2>
            <p class="reset-description">请输入您的新密码</p>
            
            <form id="resetPasswordForm">
                <div class="error-message" style="display: none;">
                    <span class="material-symbols-outlined">error</span>
                    <span id="errorText"></span>
                </div>
                <div class="success-message" style="display: none;">
                    <span class="material-symbols-outlined">check_circle</span>
                    <span id="successText"></span>
                </div>
                <input type="password" id="password" placeholder="新密码" required minlength="6">
                <input type="password" id="confirmPassword" placeholder="确认新密码" required minlength="6">
                <input type="hidden" id="token" value="<?php echo htmlspecialchars($token); ?>">
                <button type="submit">重置密码</button>
            </form>
            
            <div class="login-footer">
                <a href="login.php" class="back-to-login">返回登录</a>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('resetPasswordForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const token = document.getElementById('token').value;
            const errorDiv = document.querySelector('.error-message');
            const successDiv = document.querySelector('.success-message');
            const errorText = document.getElementById('errorText');
            const successText = document.getElementById('successText');
            
            // 隐藏之前的消息
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';
            
            // 验证密码
            if (password.length < 6) {
                errorText.textContent = '密码长度至少为6位';
                errorDiv.style.display = 'flex';
                return;
            }
            
            if (password !== confirmPassword) {
                errorText.textContent = '两次输入的密码不一致';
                errorDiv.style.display = 'flex';
                return;
            }
            
            try {
                const formData = new FormData();
                formData.append('action', 'reset_password');
                formData.append('token', token);
                formData.append('password', password);
                
                const response = await fetch('api.php', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    successText.textContent = '密码重置成功！3秒��跳转到登录页面...';
                    successDiv.style.display = 'flex';
                    document.getElementById('resetPasswordForm').reset();
                    
                    // 3秒后跳转到登录页
                    setTimeout(() => {
                        window.location.href = 'login.php';
                    }, 3000);
                } else {
                    throw new Error(data.error || '重置密码失败');
                }
            } catch (error) {
                console.error('重置失败:', error);
                errorText.textContent = error.message || '重置密码失败';
                errorDiv.style.display = 'flex';
            }
        });
    </script>
</body>
</html> 