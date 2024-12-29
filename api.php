<?php
// 设置错误报告
error_reporting(E_ALL);
ini_set('display_errors', 0); // 关闭错误显示
ini_set('log_errors', 1); // 开启错误日志
ini_set('error_log', __DIR__ . '/error.log'); // 设置错误日志文件

// 设置 session 配置
ini_set('session.cookie_lifetime', 86400);
ini_set('session.gc_maxlifetime', 86400);
session_set_cookie_params(86400);

// 确保在输出任何内容之前设置header
header('Content-Type: application/json');
session_start();

// 引入 PHPMailer 之前先检查文件是否存在
$phpmailer_files = [
    __DIR__ . '/PHPMailer/src/Exception.php',
    __DIR__ . '/PHPMailer/src/PHPMailer.php',
    __DIR__ . '/PHPMailer/src/SMTP.php'
];

foreach ($phpmailer_files as $file) {
    if (!file_exists($file)) {
        echo json_encode(['success' => false, 'error' => 'PHPMailer files not found']);
        exit;
    }
}

require_once __DIR__ . '/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// 错误处理
error_reporting(E_ALL);
ini_set('display_errors', 0);
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    throw new ErrorException($errstr, $errno, 0, $errfile, $errline);
});

try {
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
        throw new Exception('数据库连接失败: ' . $mysqli->connect_error);
    }

    $mysqli->set_charset('utf8mb4');

    // 创建用户表（如果不存在）
    $mysqli->query("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // 检查是否需要添加 email 字段
    $result = $mysqli->query("SHOW COLUMNS FROM users LIKE 'email'");
    if ($result->num_rows === 0) {
        $mysqli->query("ALTER TABLE users ADD COLUMN email VARCHAR(100) NOT NULL UNIQUE AFTER username");
    }

    // 路由处理
    $action = $_POST['action'] ?? '';

    switch ($action) {
        case 'checkLogin':
            handleCheckLogin();
            break;
        case 'login':
            handleLogin($mysqli);
            break;
        case 'getChatHistory':
            handleGetChatHistory($mysqli);
            break;
        case 'getMessages':
            handleGetMessages($mysqli);
            break;
        case 'saveChatHistory':
            handleSaveChatHistory($mysqli);
            break;
        case 'deleteChatHistory':
            handleDeleteChatHistory($mysqli);
            break;
        case 'register':
            try {
                // 取注册信息
                $username = $_POST['username'] ?? '';
                $email = $_POST['email'] ?? '';
                $password = $_POST['password'] ?? '';
                
                // 验证输入
                if (empty($username) || empty($email) || empty($password)) {
                    throw new Exception('请填写所有必填字段');
                }
                
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    throw new Exception('请输入有效的电子邮件地址');
                }
                
                // 检查邮箱是否已被注册
                $stmt = $mysqli->prepare("SELECT id FROM users WHERE email = ?");
                $stmt->bind_param('s', $email);
                $stmt->execute();
                $result = $stmt->get_result();
                if ($result->num_rows > 0) {
                    throw new Exception('该邮箱已被注册');
                }
                
                // 检查用户名是否已被使用
                $stmt = $mysqli->prepare("SELECT id FROM users WHERE username = ?");
                $stmt->bind_param('s', $username);
                $stmt->execute();
                $result = $stmt->get_result();
                if ($result->num_rows > 0) {
                    throw new Exception('该用户名已被使用');
                }
                
                // 对密码进行加密
                $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
                
                // 插入新用户
                $stmt = $mysqli->prepare("INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())");
                $stmt->bind_param('sss', $username, $email, $hashedPassword);
                
                if (!$stmt->execute()) {
                    throw new Exception('注册失败: ' . $stmt->error);
                }
                
                // 获取新插入的用户ID
                $userId = $mysqli->insert_id;
                
                // 设置session
                $_SESSION['user_id'] = $userId;
                $_SESSION['username'] = $username;
                
                echo json_encode([
                    'success' => true,
                    'message' => '注册成功'
                ]);
            } catch (Exception $e) {
                echo json_encode([
                    'success' => false,
                    'error' => $e->getMessage()
                ]);
            }
            break;
        case 'forgot_password':
            try {
                $email = $_POST['email'] ?? '';
                
                if (empty($email)) {
                    echo json_encode(['success' => false, 'error' => '请输入邮箱地址']);
                    exit;
                }
                
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    echo json_encode(['success' => false, 'error' => '请输入有效的邮箱地址']);
                    exit;
                }
                
                // 检查邮箱是否存在
                $stmt = $mysqli->prepare("SELECT id FROM users WHERE email = ?");
                if (!$stmt) {
                    throw new Exception('Database prepare failed: ' . $mysqli->error);
                }
                
                $stmt->bind_param('s', $email);
                if (!$stmt->execute()) {
                    throw new Exception('Database execute failed: ' . $stmt->error);
                }
                
                $result = $stmt->get_result();
                if ($result->num_rows === 0) {
                    echo json_encode(['success' => false, 'error' => '该邮箱地址未注册']);
                    exit;
                }
                
                // 生成重置令牌
                $token = bin2hex(random_bytes(32));
                $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
                
                // 保存重置令牌前先检查表是否存在
                try {
                    $mysqli->query("CREATE TABLE IF NOT EXISTS password_resets (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        email VARCHAR(255) NOT NULL,
                        token VARCHAR(100) NOT NULL,
                        expires_at DATETIME NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        used BOOLEAN DEFAULT FALSE,
                        INDEX (token),
                        INDEX (email)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
                } catch (Exception $e) {
                    error_log('Create table error: ' . $e->getMessage());
                    throw new Exception('Database error');
                }
                
                // 保存重置令牌
                $stmt = $mysqli->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)");
                if (!$stmt) {
                    throw new Exception('Database prepare failed: ' . $mysqli->error);
                }
                
                $stmt->bind_param('sss', $email, $token, $expires);
                if (!$stmt->execute()) {
                    throw new Exception('Save token failed: ' . $stmt->error);
                }
                
                // 发送邮件
                $mail = new PHPMailer(true);
                try {
                    $mail->SMTPDebug = 0;
                    $mail->isSMTP();
                    $mail->Host = 'smtp.qq.com';
                    $mail->SMTPAuth = true;
                    $mail->Username = '2210459573@qq.com';
                    $mail->Password = 'igjcielkovlkdhgj';
                    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
                    $mail->Port = 465;
                    $mail->CharSet = 'UTF-8';
                    
                    $mail->setFrom('2210459573@qq.com', 'AI Chat');
                    $mail->addAddress($email);
                    
                    $resetLink = "https://" . $_SERVER['HTTP_HOST'] . "/reset-password.php?token=" . $token;
                    
                    $mail->isHTML(true);
                    $mail->Subject = "重置密码 - AI Chat";
                    $mail->Body = "
                        <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                            <h2 style='color: #333; margin-bottom: 20px;'>重置密码</h2>
                            <p style='color: #666; margin-bottom: 20px;'>您收到此邮件是因为有人请求重置您的密码。如果这不是您发起的请求，请忽略此邮件。</p>
                            <p style='color: #666; margin-bottom: 20px;'>点击下面的按钮重置密码（链接有效期为1小时）：</p>
                            <a href='{$resetLink}' style='display: inline-block; background-color: #f5aca7; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-bottom: 20px;'>重置密码</a>
                            <p style='color: #999; font-size: 12px;'>如果按钮无法点击，请复制以下链接到浏览器地址栏：<br>{$resetLink}</p>
                        </div>
                    ";
                    $mail->AltBody = "重置密码\n\n请访问以下链接重置密码：\n{$resetLink}";
                    
                    if (!$mail->send()) {
                        throw new Exception('Mailer Error: ' . $mail->ErrorInfo);
                    }
                    
                    echo json_encode(['success' => true]);
                    
                } catch (Exception $e) {
                    error_log('Mail error: ' . $e->getMessage());
                    throw new Exception('发送邮件失败');
                }
                
            } catch (Exception $e) {
                error_log('Forgot password error: ' . $e->getMessage());
                echo json_encode(['success' => false, 'error' => '发送重置链接失败，请稍后重试']);
            }
            break;
        case 'reset_password':
            try {
                $token = $_POST['token'] ?? '';
                $password = $_POST['password'] ?? '';
                
                if (empty($token) || empty($password)) {
                    echo json_encode(['success' => false, 'error' => '参数错误']);
                    exit;
                }
                
                if (strlen($password) < 6) {
                    echo json_encode(['success' => false, 'error' => '密码长度至少为6位']);
                    exit;
                }
                
                // 验证token
                $stmt = $mysqli->prepare("
                    SELECT email 
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
                    echo json_encode(['success' => false, 'error' => '重置链接已过期或无效']);
                    exit;
                }
                
                // 更新密码
                $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $mysqli->prepare("UPDATE users SET password = ? WHERE email = ?");
                $stmt->bind_param('ss', $hashedPassword, $reset['email']);
                
                if (!$stmt->execute()) {
                    throw new Exception('更新密码失败');
                }
                
                // 标记token为已使用
                $stmt = $mysqli->prepare("UPDATE password_resets SET used = 1 WHERE token = ?");
                $stmt->bind_param('s', $token);
                $stmt->execute();
                
                echo json_encode(['success' => true]);
                
            } catch (Exception $e) {
                error_log('Reset password error: ' . $e->getMessage());
                echo json_encode(['success' => false, 'error' => '重置密码失败，请稍后重试']);
            }
            break;
        case 'chat':
            $messages = json_decode($_POST['messages'], true);
            $model = $_POST['model'] ?? 'yuanzhi'; // 获取模型参数
            
            // 这里可以根据不同的模型使用不同的API端点或参数
            // 如果使用同一个API，只是角色设定不同，那么这里不需要做特殊处理
            
            // 处理消息并返回响应
            // ...
            break;
        default:
            echo json_encode(['success' => false, 'error' => '未知操作']);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

// 检查登录状态
function handleCheckLogin() {
    if (isset($_SESSION['user_id']) || isset($_COOKIE['user_id'])) {
        // 如果 session 丢失但 cookie 存在，恢复 session
        if (!isset($_SESSION['user_id']) && isset($_COOKIE['user_id'])) {
            $_SESSION['user_id'] = $_COOKIE['user_id'];
            $_SESSION['username'] = $_COOKIE['username'];
        }
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $_SESSION['user_id'] ?? $_COOKIE['user_id'],
                'username' => $_SESSION['username'] ?? $_COOKIE['username']
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => '未登录']);
    }
}

// 登录处理
function handleLogin($mysqli) {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    
    $stmt = $mysqli->prepare('SELECT id, username, password FROM users WHERE email = ? OR username = ?');
    $stmt->bind_param('ss', $username, $username);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        setcookie('user_id', $user['id'], time() + 86400, '/');
        setcookie('username', $user['username'], time() + 86400, '/');
        echo json_encode(['success' => true, 'user' => $user]);
    } else {
        echo json_encode(['success' => false, 'error' => '用户名或密码错误']);
    }
}

// 获取聊天历史
function handleGetChatHistory($mysqli) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'error' => '未登录']);
        return;
    }
    
    $userId = $_SESSION['user_id'];
    $result = $mysqli->query("SELECT * FROM chat_histories WHERE user_id = $userId ORDER BY created_at DESC");
    $histories = [];
    
    while ($row = $result->fetch_assoc()) {
        $histories[] = $row;
    }
    
    echo json_encode(['success' => true, 'histories' => $histories]);
}

// 获取消息
function handleGetMessages($mysqli) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'error' => '未登录']);
        return;
    }
    
    $chatId = $_POST['chatId'] ?? '';
    if (!$chatId) {
        echo json_encode(['success' => false, 'error' => '缺少聊天ID']);
        return;
    }
    
    $stmt = $mysqli->prepare(
        "SELECT role, content, message_order FROM messages 
         WHERE chat_id = ? 
         ORDER BY message_order ASC"
    );
    $stmt->bind_param('i', $chatId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $messages = [];
    while ($row = $result->fetch_assoc()) {
        $messages[] = [
            'role' => $row['role'],
            'content' => $row['content'],
            'order' => $row['message_order']
        ];
    }
    
    echo json_encode(['success' => true, 'messages' => $messages]);
}

// 保存聊天历史
function handleSaveChatHistory($mysqli) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'error' => '未登录']);
        return;
    }
    
    $userId = $_SESSION['user_id'];
    $title = $_POST['title'] ?? '';
    $messages = json_decode($_POST['messages'] ?? '[]', true);
    $chatId = $_POST['chatId'] ?? null;
    
    if (empty($messages)) {
        echo json_encode(['success' => false, 'error' => '消息不能为空']);
        return;
    }
    
    try {
        // 开始事务
        $mysqli->begin_transaction();
        
        if ($chatId) {
            // 更新现有聊天
            $stmt = $mysqli->prepare('UPDATE chat_histories SET title = ? WHERE id = ? AND user_id = ?');
            $stmt->bind_param('sii', $title, $chatId, $userId);
            $stmt->execute();
            
            // 删除旧消息
            $stmt = $mysqli->prepare('DELETE FROM messages WHERE chat_id = ?');
            $stmt->bind_param('i', $chatId);
            $stmt->execute();
        } else {
            // 创建新聊天
            $stmt = $mysqli->prepare('INSERT INTO chat_histories (user_id, title) VALUES (?, ?)');
            $stmt->bind_param('is', $userId, $title);
            $stmt->execute();
            $chatId = $mysqli->insert_id;
        }
        
        // 保存消息，包含顺序信息
        $stmt = $mysqli->prepare('INSERT INTO messages (chat_id, role, content, message_order) VALUES (?, ?, ?, ?)');
        foreach ($messages as $msg) {
            $order = $msg['order'] ?? 0; // 使用消息中的 order 字段
            $stmt->bind_param('issi', $chatId, $msg['role'], $msg['content'], $order);
            $stmt->execute();
        }
        
        // 提交事务
        $mysqli->commit();
        
        echo json_encode(['success' => true, 'chatId' => $chatId]);
    } catch (Exception $e) {
        $mysqli->rollback();
        echo json_encode(['success' => false, 'error' => '保存失败: ' . $e->getMessage()]);
    }
}

// 删除聊天历史
function handleDeleteChatHistory($mysqli) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'error' => '未登录']);
        return;
    }
    
    $userId = $_SESSION['user_id'];
    $chatId = $_POST['chatId'] ?? '';
    
    if (!$chatId) {
        echo json_encode(['success' => false, 'error' => '缺少聊天ID']);
        return;
    }
    
    try {
        // 开始事务
        $mysqli->begin_transaction();
        
        // 删除消息（因为设置了外键级联删除，这步可选）
        $stmt = $mysqli->prepare('DELETE FROM messages WHERE chat_id = ?');
        $stmt->bind_param('i', $chatId);
        $stmt->execute();
        
        // 删除聊天历史
        $stmt = $mysqli->prepare('DELETE FROM chat_histories WHERE id = ? AND user_id = ?');
        $stmt->bind_param('ii', $chatId, $userId);
        $stmt->execute();
        
        // 提交事务
        $mysqli->commit();
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $mysqli->rollback();
        echo json_encode(['success' => false, 'error' => '删除失败: ' . $e->getMessage()]);
    }
}

if (isset($mysqli)) {
    $mysqli->close();
}
?> 