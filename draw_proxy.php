<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$prompt = $data['prompt'] ?? '';

if (empty($prompt)) {
    http_response_code(400);
    echo json_encode(['error' => 'Prompt is required']);
    exit;
}

$apiUrl = 'https://api.siliconflow.cn/v1/images/generations';
$apiKey = 'sk-ttncbnpnvrqxmhiugxxucrlzrkhhpivxmdsrlrwbnmrtxwvg';

$ch = curl_init($apiUrl);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'model' => 'stabilityai/stable-diffusion-3-5-large',
        'prompt' => $prompt,
        'n' => 1,
        'size' => '1024x1024',
        'steps' => 20,
        'guidance_scale' => 7.5
    ])
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Curl error: ' . $error
    ]);
    exit;
}

if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'error' => 'API error: ' . $response
    ]);
    exit;
}

$responseData = json_decode($response, true);
if ($responseData && isset($responseData['data'][0]['url'])) {
    echo json_encode([
        'success' => true,
        'data' => [
            'url' => $responseData['data'][0]['url']
        ]
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid response format from API'
    ]);
} 