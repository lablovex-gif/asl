<?php
/**
 * Diagnostic & Health Check Endpoint for Pezeex
 * Works on Hostinger, cPanel, LiteSpeed, Apache, Nginx
 * Visit in browser: https://yourdomain.com/api/health.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// 1. Gather all potential sources of environment variables
$sources = [];
$env = [];

// Method A: getenv()
if (function_exists('getenv')) {
    $g = getenv();
    if (is_array($g)) {
        $env = array_merge($env, $g);
        $sources['getenv'] = count($g) . ' variables';
    }
}

// Method B: apache_getenv()
if (function_exists('apache_getenv')) {
    $sources['apache_getenv'] = 'available';
    $checkList = [
        'GEMINI_API_KEY', 'AI_API_KEY', 'API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY',
        'DEEPSEEK_API_KEY', 'ANTHROPIC_API_KEY', 'VITE_GEMINI_API_KEY', 'VITE_AI_API_KEY',
        'GOOGLE_API_KEY', 'AI_KEY', 'CLAUDE_API_KEY', 'OPENROUTER_API_KEY'
    ];
    foreach ($checkList as $cKey) {
        $v = apache_getenv($cKey);
        if (!empty($v)) $env[$cKey] = trim($v);
        $vRedir = apache_getenv('REDIRECT_' . $cKey);
        if (!empty($vRedir)) $env[$cKey] = trim($vRedir);
    }
}

// Method C: $_SERVER and $_ENV
$env = array_merge($env, $_SERVER ?? [], $_ENV ?? []);
$sources['$_SERVER'] = isset($_SERVER) ? count($_SERVER) . ' variables' : 'empty';
$sources['$_ENV'] = isset($_ENV) ? count($_ENV) . ' variables' : 'empty';

// Normalize any REDIRECT_ prefixes from mod_rewrite
foreach ($env as $k => $v) {
    if (is_string($v) && strpos($k, 'REDIRECT_') === 0) {
        $unprefixed = preg_replace('/^(REDIRECT_)+/', '', $k);
        if (!empty($unprefixed) && !isset($env[$unprefixed])) {
            $env[$unprefixed] = $v;
        }
    }
}

// Method D: Read .htaccess for SetEnv directives
$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$htaccessPaths = [
    $docRoot . '/.htaccess',
    dirname(__DIR__) . '/.htaccess',
    __DIR__ . '/.htaccess',
    dirname($docRoot) . '/.htaccess'
];
$loadedHtaccess = [];
foreach ($htaccessPaths as $ht) {
    if (!empty($ht) && file_exists($ht) && is_readable($ht)) {
        $loadedHtaccess[] = $ht;
        $lines = file($ht, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (preg_match('/^SetEnv\s+([A-Za-z0-9_]+)\s+["\']?([^"\']+)["\']?/i', $line, $m)) {
                $env[$m[1]] = trim($m[2]);
            }
        }
    }
}
$sources['.htaccess_found'] = $loadedHtaccess;

// Method E: .env files in multiple potential paths
$checkedEnvPaths = [
    __DIR__ . '/.env',
    dirname(__DIR__) . '/.env',
    dirname(dirname(__DIR__)) . '/.env',
    $docRoot . '/.env',
    $docRoot . '/public_html/.env',
    dirname($docRoot) . '/.env',
    dirname($docRoot) . '/public_html/.env',
    dirname(dirname($docRoot)) . '/.env'
];

$loadedEnvFiles = [];
foreach ($checkedEnvPaths as $path) {
    if (!empty($path) && file_exists($path) && is_readable($path)) {
        $loadedEnvFiles[] = $path;
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || $line[0] === '#') continue;
            if (preg_match('/^([A-Za-z0-9_]+)\s*=\s*["\']?([^"\']+)["\']?/', $line, $m)) {
                $env[$m[1]] = trim($m[2]);
            }
        }
    }
}
$sources['.env_files_found'] = $loadedEnvFiles;

// Method E: config.php in multiple potential paths
$checkedConfigFiles = [
    __DIR__ . '/config.php',
    dirname(__DIR__) . '/config.php',
    ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/api/config.php',
    ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/config.php'
];

$loadedConfigFiles = [];
foreach ($checkedConfigFiles as $cf) {
    if (!empty($cf) && file_exists($cf)) {
        $loadedConfigFiles[] = $cf;
        $c = include $cf;
        if (is_array($c)) {
            foreach ($c as $k => $v) {
                if (is_string($v)) $env[$k] = trim($v);
            }
        }
    }
}
$sources['config_php_found'] = $loadedConfigFiles;

// 2. Identify API Key and Provider
$systemVars = [
    'PATH', 'PWD', 'HOME', 'SHELL', 'USER', 'HOSTNAME', 'PORT', 'NODE_ENV', 'TERM', 'SHLVL', '_', 'LANG',
    'DOCUMENT_ROOT', 'SERVER_SOFTWARE', 'SERVER_NAME', 'SERVER_ADDR', 'SERVER_PORT', 'REMOTE_ADDR',
    'SCRIPT_FILENAME', 'SERVER_ADMIN', 'CONTEXT_DOCUMENT_ROOT', 'REQUEST_SCHEME', 'GATEWAY_INTERFACE',
    'SERVER_PROTOCOL', 'REQUEST_METHOD', 'QUERY_STRING', 'REQUEST_URI', 'SCRIPT_NAME', 'PHP_SELF',
    'REQUEST_TIME_FLOAT', 'REQUEST_TIME', 'HTTP_HOST', 'HTTP_USER_AGENT', 'HTTP_ACCEPT', 'DISABLE_HMR',
    'APP_URL', 'K_SERVICE', 'K_REVISION', 'K_CONFIGURATION', 'LS_COLORS', 'COLORTERM', 'REDIRECT_STATUS'
];

$apiKey = '';
$provider = '';
$detectedKeyName = '';

// Check provider-named variables
foreach ($env as $k => $v) {
    if (!is_string($v) || in_array(strtoupper($k), $systemVars)) continue;
    $val = trim($v);
    if (strlen($val) < 18 || strlen($val) > 400) continue;
    if ($val[0] === '/' || strpos($val, 'http://') === 0 || strpos($val, 'https://') === 0 || $val[0] === '{') continue;

    $kUpper = strtoupper($k);
    if (strpos($kUpper, 'OPENAI') !== false || strpos($kUpper, 'CHATGPT') !== false) {
        $apiKey = $val; $provider = 'openai'; $detectedKeyName = $k; break;
    } elseif (strpos($kUpper, 'GROQ') !== false) {
        $apiKey = $val; $provider = 'groq'; $detectedKeyName = $k; break;
    } elseif (strpos($kUpper, 'DEEPSEEK') !== false) {
        $apiKey = $val; $provider = 'deepseek'; $detectedKeyName = $k; break;
    } elseif (strpos($kUpper, 'OPENROUTER') !== false) {
        $apiKey = $val; $provider = 'openrouter'; $detectedKeyName = $k; break;
    } elseif (strpos($kUpper, 'ANTHROPIC') !== false || strpos($kUpper, 'CLAUDE') !== false) {
        $apiKey = $val; $provider = 'anthropic'; $detectedKeyName = $k; break;
    } elseif (strpos($kUpper, 'MISTRAL') !== false) {
        $apiKey = $val; $provider = 'mistral'; $detectedKeyName = $k; break;
    } elseif (strpos($kUpper, 'GEMINI') !== false || strpos($kUpper, 'GOOGLE') !== false) {
        $apiKey = $val; $provider = 'gemini'; $detectedKeyName = $k; break;
    } elseif (strpos($kUpper, 'AI_API_KEY') !== false || strpos($kUpper, 'API_KEY') !== false || strpos($kUpper, 'AI_KEY') !== false) {
        $apiKey = $val; $detectedKeyName = $k; break;
    }
}

// Check key signature
if (empty($apiKey)) {
    foreach ($env as $k => $v) {
        if (!is_string($v) || in_array(strtoupper($k), $systemVars)) continue;
        $val = trim($v);
        if (strpos($val, 'AIzaSy') === 0 || strpos($val, 'AQ.') === 0) {
            $apiKey = $val; $provider = 'gemini'; $detectedKeyName = $k; break;
        } elseif (strpos($val, 'gsk_') === 0) {
            $apiKey = $val; $provider = 'groq'; $detectedKeyName = $k; break;
        } elseif (strpos($val, 'sk-or-') === 0) {
            $apiKey = $val; $provider = 'openrouter'; $detectedKeyName = $k; break;
        } elseif (strpos($val, 'sk-ant-') === 0) {
            $apiKey = $val; $provider = 'anthropic'; $detectedKeyName = $k; break;
        } elseif (strpos($val, 'sk-proj-') === 0 || strpos($val, 'sk-') === 0) {
            $apiKey = $val; $provider = 'openai'; $detectedKeyName = $k; break;
        }
    }
}

// Any variable looking like a key
if (empty($apiKey)) {
    foreach ($env as $k => $v) {
        if (!is_string($v) || in_array(strtoupper($k), $systemVars)) continue;
        $val = trim($v);
        if (strlen($val) >= 20 && strlen($val) <= 300 && strpos($val, ' ') === false && $val[0] !== '/' && strpos($val, '://') === false) {
            $apiKey = $val;
            $detectedKeyName = $k;
            $provider = 'generic (openai-compatible)';
            break;
        }
    }
}

$maskedKey = '';
if (!empty($apiKey)) {
    $maskedKey = substr($apiKey, 0, 6) . '...' . substr($apiKey, -4);
}

$output = [
    'status' => !empty($apiKey) ? 'READY' : 'NO_API_KEY_DETECTED',
    'backend' => 'PHP ' . PHP_VERSION,
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'curl_installed' => function_exists('curl_init'),
    'ai_provider' => $provider ?: 'none',
    'detected_key_variable' => $detectedKeyName ?: 'none',
    'key_preview' => $maskedKey ?: 'NOT_FOUND',
    'diagnostic_sources' => $sources,
    'quick_solution' => empty($apiKey) ? [
        'ar' => 'إذا لم يكتشف الخادم مفتاحك، أسهل حل في هوستنجر هو: أنشئ ملفاً باسم config.php داخل مجلد api وضع فيه: <?php return ["AI_API_KEY" => "مفتاحك_هنا"];',
        'en' => 'If your host does not pass environment variables, create api/config.php with: <?php return ["AI_API_KEY" => "YOUR_KEY_HERE"];'
    ] : 'All set! AI is ready to respond.'
];

echo json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

