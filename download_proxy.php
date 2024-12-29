<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

if (!isset($_GET['url'])) {
    http_response_code(400);
    die('URL parameter is required');
}

$imageUrl = $_GET['url'];

// 获取图片内容
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $imageUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
$imageContent = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    http_response_code($httpCode);
    die('Failed to download image');
}

// 获取文件扩展名
$extension = pathinfo(parse_url($imageUrl, PHP_URL_PATH), PATHINFO_EXTENSION);
if (empty($extension)) {
    $extension = 'jpg';
}

// 设置响应头
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="ai-generated-image.' . $extension . '"');
header('Content-Length: ' . strlen($imageContent));

// 输出图片内容
echo $imageContent; 