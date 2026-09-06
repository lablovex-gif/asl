<?php
/**
 * Health check endpoint for PHP / Shared Hosting
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

echo json_encode([
    'status' => 'ok',
    'backend' => 'php',
    'php_version' => PHP_VERSION,
    'timestamp' => date('c'),
    'has_curl' => function_exists('curl_init')
], JSON_PRETTY_PRINT);
