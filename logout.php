<?php
session_start();

// 清除所有session变量
$_SESSION = array();

// 删除session cookie
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time()-3600, '/');
}

// 删除用户cookie
setcookie('user_id', '', time()-3600, '/');
setcookie('username', '', time()-3600, '/');

// 销毁session
session_destroy();

// 重定向到登录页面
header('Location: login.php');
exit;
?> 