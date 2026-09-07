<?php
/**
 * Pezeex - Gemini Search API Bridge for PHP / Shared Hosting
 * Works seamlessly on Hostinger, cPanel, LiteSpeed, Apache, Nginx
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

// 1. Resolve AI Provider and Key flexibly from multiple sources and formats
function detectAIConfig() {
    $env = [];

    // Method A: getenv()
    if (function_exists('getenv')) {
        $g = getenv();
        if (is_array($g)) $env = array_merge($env, $g);
    }

    // Method B: apache_getenv()
    if (function_exists('apache_getenv')) {
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
    $htaccessPaths = [
        ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/.htaccess',
        dirname(__DIR__) . '/.htaccess',
        __DIR__ . '/.htaccess',
        dirname($_SERVER['DOCUMENT_ROOT'] ?? '') . '/.htaccess'
    ];
    foreach ($htaccessPaths as $ht) {
        if (!empty($ht) && file_exists($ht) && is_readable($ht)) {
            $lines = file($ht, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if (preg_match('/^SetEnv\s+([A-Za-z0-9_]+)\s+["\']?([^"\']+)["\']?/i', $line, $m)) {
                    $env[$m[1]] = trim($m[2]);
                }
            }
        }
    }

    // Method E: Read .env from all common host paths
    $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    $envPaths = [
        __DIR__ . '/.env',
        dirname(__DIR__) . '/.env',
        dirname(dirname(__DIR__)) . '/.env',
        $docRoot . '/.env',
        $docRoot . '/public_html/.env',
        dirname($docRoot) . '/.env',
        dirname($docRoot) . '/public_html/.env',
        dirname(dirname($docRoot)) . '/.env'
    ];
    foreach ($envPaths as $p) {
        if (!empty($p) && file_exists($p) && is_readable($p)) {
            $lines = file($p, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line) || $line[0] === '#') continue;
                if (preg_match('/^([A-Za-z0-9_]+)\s*=\s*["\']?([^"\']+)["\']?/', $line, $m)) {
                    $env[$m[1]] = trim($m[2]);
                }
            }
        }
    }

    // Method F: Check config.php
    $configFiles = [
        __DIR__ . '/config.php',
        dirname(__DIR__) . '/config.php',
        $docRoot . '/api/config.php',
        $docRoot . '/config.php',
        dirname($docRoot) . '/config.php'
    ];
    foreach ($configFiles as $configFile) {
        if (!empty($configFile) && file_exists($configFile)) {
            $c = include $configFile;
            if (is_array($c)) {
                foreach ($c as $k => $v) {
                    if (is_string($v)) $env[$k] = trim($v);
                }
            }
        }
    }

    $apiKey = '';
    $provider = '';
    $customBaseUrl = $env['AI_BASE_URL'] ?? $env['OPENAI_BASE_URL'] ?? null;
    $customModel = $env['AI_MODEL'] ?? $env['OPENAI_MODEL'] ?? $env['GEMINI_MODEL'] ?? null;

    $systemVars = [
        'PATH', 'PWD', 'HOME', 'SHELL', 'USER', 'HOSTNAME', 'PORT', 'NODE_ENV', 'TERM', 'SHLVL', '_', 'LANG',
        'DOCUMENT_ROOT', 'SERVER_SOFTWARE', 'SERVER_NAME', 'SERVER_ADDR', 'SERVER_PORT', 'REMOTE_ADDR',
        'SCRIPT_FILENAME', 'SERVER_ADMIN', 'CONTEXT_DOCUMENT_ROOT', 'REQUEST_SCHEME', 'GATEWAY_INTERFACE',
        'SERVER_PROTOCOL', 'REQUEST_METHOD', 'QUERY_STRING', 'REQUEST_URI', 'SCRIPT_NAME', 'PHP_SELF',
        'REQUEST_TIME_FLOAT', 'REQUEST_TIME', 'HTTP_HOST', 'HTTP_USER_AGENT', 'HTTP_ACCEPT', 'DISABLE_HMR',
        'APP_URL', 'K_SERVICE', 'K_REVISION', 'K_CONFIGURATION', 'LS_COLORS', 'COLORTERM'
    ];

    // Priority 1: Check variables by name (GEMINI, OPENAI, GROQ, DEEPSEEK, ANTHROPIC, AI_API_KEY, etc.)
    foreach ($env as $k => $v) {
        if (!is_string($v) || in_array(strtoupper($k), $systemVars)) continue;
        $val = trim($v);
        if (strlen($val) < 18 || strlen($val) > 400) continue;
        if ($val[0] === '/' || strpos($val, 'http://') === 0 || strpos($val, 'https://') === 0 || $val[0] === '{') continue;

        $kUpper = strtoupper($k);
        if (strpos($kUpper, 'OPENAI') !== false || strpos($kUpper, 'CHATGPT') !== false) {
            $apiKey = $val; $provider = 'openai'; break;
        } elseif (strpos($kUpper, 'GROQ') !== false) {
            $apiKey = $val; $provider = 'groq'; break;
        } elseif (strpos($kUpper, 'DEEPSEEK') !== false) {
            $apiKey = $val; $provider = 'deepseek'; break;
        } elseif (strpos($kUpper, 'OPENROUTER') !== false) {
            $apiKey = $val; $provider = 'openrouter'; break;
        } elseif (strpos($kUpper, 'ANTHROPIC') !== false || strpos($kUpper, 'CLAUDE') !== false) {
            $apiKey = $val; $provider = 'anthropic'; break;
        } elseif (strpos($kUpper, 'MISTRAL') !== false) {
            $apiKey = $val; $provider = 'mistral'; break;
        } elseif (strpos($kUpper, 'GEMINI') !== false || strpos($kUpper, 'GOOGLE') !== false) {
            $apiKey = $val; $provider = 'gemini'; break;
        } elseif (strpos($kUpper, 'AI_API_KEY') !== false || strpos($kUpper, 'API_KEY') !== false || strpos($kUpper, 'AI_KEY') !== false) {
            $apiKey = $val;
            break;
        }
    }

    // Priority 2: If no provider-specific name matched, search ALL variables for known key signatures
    if (empty($apiKey)) {
        foreach ($env as $k => $v) {
            if (!is_string($v) || in_array(strtoupper($k), $systemVars)) continue;
            $val = trim($v);
            if (strpos($val, 'AIzaSy') === 0 || strpos($val, 'AQ.') === 0) {
                $apiKey = $val; $provider = 'gemini'; break;
            } elseif (strpos($val, 'gsk_') === 0) {
                $apiKey = $val; $provider = 'groq'; break;
            } elseif (strpos($val, 'sk-or-') === 0) {
                $apiKey = $val; $provider = 'openrouter'; break;
            } elseif (strpos($val, 'sk-ant-') === 0) {
                $apiKey = $val; $provider = 'anthropic'; break;
            } elseif (strpos($val, 'sk-proj-') === 0 || strpos($val, 'sk-') === 0) {
                $apiKey = $val; $provider = 'openai'; break;
            }
        }
    }

    // Priority 3: Fallback - pick ANY non-system variable that looks like an API key token
    if (empty($apiKey)) {
        foreach ($env as $k => $v) {
            if (!is_string($v) || in_array(strtoupper($k), $systemVars)) continue;
            $val = trim($v);
            if (strlen($val) >= 20 && strlen($val) <= 300 && strpos($val, ' ') === false && $val[0] !== '/' && strpos($val, '://') === false) {
                $apiKey = $val;
                break;
            }
        }
    }

    // Auto-detect provider based on key format
    if (!empty($apiKey) && empty($provider)) {
        if (strpos($apiKey, 'AIzaSy') === 0 || strpos($apiKey, 'AQ.') === 0) {
            $provider = 'gemini';
        } elseif (strpos($apiKey, 'gsk_') === 0) {
            $provider = 'groq';
        } elseif (strpos($apiKey, 'sk-or-') === 0) {
            $provider = 'openrouter';
        } elseif (strpos($apiKey, 'sk-ant-') === 0) {
            $provider = 'anthropic';
        } elseif (!empty($customBaseUrl)) {
            $provider = 'openai-compatible';
        } elseif (strpos($apiKey, 'sk-') === 0) {
            $provider = 'openai';
        } else {
            $provider = 'gemini';
        }
    }

    return [
        'apiKey' => trim($apiKey),
        'provider' => $provider ?: 'gemini',
        'customBaseUrl' => $customBaseUrl,
        'customModel' => $customModel
    ];
}

$aiConfig = detectAIConfig();
$apiKey = $aiConfig['apiKey'];
$aiProvider = $aiConfig['provider'];
$customBaseUrl = $aiConfig['customBaseUrl'];
$customModel = $aiConfig['customModel'];

if (empty($apiKey)) {
    http_response_code(500);
    echo json_encode([
        'error' => 'No AI API Key is configured.',
        'details' => 'Please set an API key for Gemini, OpenAI, Groq, DeepSeek, OpenRouter, Anthropic, or any AI in your environment variables, .env, or api/config.php'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 2. Read JSON Input
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

$productName = !empty($input['productName']) ? trim($input['productName']) : '';
$language = !empty($input['language']) ? trim($input['language']) : 'العربية';

if (empty($productName)) {
    http_response_code(400);
    echo json_encode(['error' => 'productName is required'], JSON_UNESCAPED_UNICODE);
    exit;
}

$cleanProductName = mb_substr(strip_tags($productName), 0, 100);
$cleanLanguage = mb_substr(strip_tags($language), 0, 50);

// Helper to resolve store domain
function resolveStoreDomain($store, $aiDomain = '') {
    if (!empty($aiDomain) && is_string($aiDomain) && strpos($aiDomain, '.') !== false) {
        $cleanAiDomain = preg_replace('/^(https?:\/\/)?(www\.)?/', '', strtolower(trim($aiDomain)));
        $cleanAiDomain = explode('/', $cleanAiDomain)[0];
        if (strlen($cleanAiDomain) > 3 && strpos($cleanAiDomain, '.') !== false) {
            return $cleanAiDomain;
        }
    }

    $s = mb_strtolower(trim($store ?? ''));
    if (strpos($s, 'amazon') !== false || strpos($s, 'أمازون') !== false) return 'amazon.com';
    if (strpos($s, 'noon') !== false || strpos($s, 'نون') !== false) return 'noon.com';
    if (strpos($s, 'aliexpress') !== false || strpos($s, 'علي إكسبريس') !== false || strpos($s, 'علي اكسبرس') !== false) return 'aliexpress.com';
    if (strpos($s, 'jarir') !== false || strpos($s, 'جرير') !== false) return 'jarir.com';
    if (strpos($s, 'extra') !== false || strpos($s, 'إكسترا') !== false || strpos($s, 'اكسترا') !== false) return 'extra.com';
    if (strpos($s, 'ebay') !== false || strpos($s, 'إيباي') !== false || strpos($s, 'ايباي') !== false) return 'ebay.com';
    if (strpos($s, 'temu') !== false || strpos($s, 'تيمو') !== false) return 'temu.com';
    if (strpos($s, 'shein') !== false || strpos($s, 'شي إن') !== false || strpos($s, 'شي ان') !== false) return 'shein.com';
    if (strpos($s, 'alibaba') !== false || strpos($s, 'علي بابا') !== false) return 'alibaba.com';
    if (strpos($s, 'banggood') !== false || strpos($s, 'بانجوود') !== false) return 'banggood.com';
    if (strpos($s, 'walmart') !== false || strpos($s, 'وول مارت') !== false) return 'walmart.com';
    if (strpos($s, 'best buy') !== false || strpos($s, 'bestbuy') !== false || strpos($s, 'بست باي') !== false) return 'bestbuy.com';
    if (strpos($s, 'apple') !== false || strpos($s, 'آبل') !== false || strpos($s, 'ابل') !== false) return 'apple.com';
    if (strpos($s, 'samsung') !== false || strpos($s, 'سامسونج') !== false) return 'samsung.com';
    if (strpos($s, 'anker') !== false || strpos($s, 'أنكر') !== false) return 'anker.com';
    if (strpos($s, 'carrefour') !== false || strpos($s, 'كارفور') !== false) return 'carrefour.com';
    if (strpos($s, 'lulu') !== false || strpos($s, 'لولو') !== false) return 'luluhypermarket.com';
    if (strpos($s, 'geekbuying') !== false || strpos($s, 'جيك باينج') !== false) return 'geekbuying.com';
    if (strpos($s, 'newegg') !== false || strpos($s, 'نيوايج') !== false) return 'newegg.com';
    if (strpos($s, 'bhphoto') !== false || strpos($s, 'b&h') !== false || strpos($s, 'بي آند إتش') !== false) return 'bhphotovideo.com';
    if (strpos($s, 'asos') !== false || strpos($s, 'اسوس') !== false || strpos($s, 'أسوس') !== false) return 'asos.com';
    if (strpos($s, 'myprotein') !== false || strpos($s, 'ماي بروتين') !== false) return 'myprotein.com';
    if (strpos($s, 'zaful') !== false || strpos($s, 'زافول') !== false) return 'zaful.com';

    $latinClean = preg_replace('/[^a-z0-9]/', '', $s);
    if (strlen($latinClean) > 2) return $latinClean . '.com';
    return '';
}

function sanitizeUrl($url, $fallbackSearch = '') {
    if (empty($url) || !is_string($url)) {
        return $fallbackSearch ? 'https://www.google.com/search?q=' . urlencode($fallbackSearch) : '';
    }
    $trimmed = trim($url);
    if (preg_match('/^https?:\/\//i', $trimmed)) {
        return $trimmed;
    }
    return $fallbackSearch ? 'https://www.google.com/search?q=' . urlencode($fallbackSearch) : '';
}

// 3. Prompt for Gemini
$prompt = "أنت مساعد ذكي متخصص في إيجاد بدائل حقيقية وممتازة وأرخص للمنتجات.

المنتج أو الاستفسار المطلوب: \"{$cleanProductName}\"

المطلوب:
1. اقترح قائمة غنية ومتنوعة تحتوي على ما بين 12 إلى 18 منتجاً بديلاً حقيقياً وأرخص ثمناً وتوفر قيمة ممتازة ومنافسة مقابل السعر مقارنة بالمنتج الأصلي.
2. لكل منتج بديل، حدد المتجر أو المنصة التي يتوفر بها (نوّع بين المتاجر مثل: أمازون، نون، علي إكسبريس، جرير، إكسترا، إيباي، إلخ).
3. استخرج النطاق الإلكتروني الرسمي للمتجر بدقة في حقل storeDomain (مثل: amazon.sa, noon.com, aliexpress.com, jarir.com, extra.com, ebay.com, temu.com, shein.com).
4. اكتب سبباً مقنعاً ومختصراً يوضح لماذا يعتبر هذا المنتج خياراً وبديلاً ممتازاً وأرخص.
5. اذكر السعر التقريبي للمنتج البديل، ونسبة أو درجة التشابه مع المنتج المطلوب.

اللغة المطلوبة للرد: {$cleanLanguage}.";

// 4. Gemini Request Payload
$schema = [
    'type' => 'OBJECT',
    'properties' => [
        'message' => ['type' => 'STRING'],
        'alternatives' => [
            'type' => 'ARRAY',
            'items' => [
                'type' => 'OBJECT',
                'properties' => [
                    'store' => ['type' => 'STRING'],
                    'storeDomain' => ['type' => 'STRING'],
                    'name' => ['type' => 'STRING'],
                    'searchKey' => ['type' => 'STRING'],
                    'price' => ['type' => 'STRING'],
                    'description' => ['type' => 'STRING'],
                    'similarity' => ['type' => 'STRING'],
                    'exactUrl' => ['type' => 'STRING'],
                    'imageUrl' => ['type' => 'STRING'],
                    'logoUrl' => ['type' => 'STRING']
                ],
                'required' => ['store', 'name', 'searchKey', 'price', 'description', 'similarity', 'exactUrl']
            ]
        ]
    ],
    'required' => ['alternatives']
];

$responseJson = null;
$lastError = null;

function safeHttpPost($url, $headers, $postBodyJson) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postBodyJson,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 45,
            CURLOPT_SSL_VERIFYPEER => true
        ]);
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);

        // If SSL certificate problem (common on shared hosting), retry with verify false
        if ($result === false && (strpos($curlError, 'SSL') !== false || strpos($curlError, 'certificate') !== false)) {
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
            $result = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
        }
        curl_close($ch);
        return [$httpCode, $result, $curlError];
    }

    // Stream context fallback
    $opts = [
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", $headers),
            'content' => $postBodyJson,
            'timeout' => 45,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ];
    $ctx = stream_context_create($opts);
    $result = @file_get_contents($url, false, $ctx);
    $httpCode = 500;
    if (isset($http_response_header) && preg_match('/HTTP\/\S+\s+(\d+)/', $http_response_header[0], $m)) {
        $httpCode = (int)$m[1];
    }
    return [$httpCode, $result, $result === false ? 'file_get_contents failed' : ''];
}

// 4. Dispatch to the appropriate AI provider
if ($aiProvider === 'gemini') {
    $payload = [
        'contents' => [
            [
                'parts' => [
                    ['text' => $prompt]
                ]
            ]
        ],
        'generationConfig' => [
            'responseMimeType' => 'application/json',
            'responseSchema' => $schema
        ]
    ];

    $candidateModels = !empty($customModel) ? [$customModel] : [
        'gemini-3.6-flash',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemini-2.5-flash'
    ];

    foreach ($candidateModels as $model) {
        $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . urlencode($apiKey);
        list($httpCode, $result, $curlError) = safeHttpPost($apiUrl, [
            'Content-Type: application/json',
            'x-goog-api-key: ' . $apiKey
        ], json_encode($payload));

        if ($httpCode === 200 && !empty($result)) {
            $apiDecoded = json_decode($result, true);
            if (!empty($apiDecoded['candidates'][0]['content']['parts'][0]['text'])) {
                $responseJson = $apiDecoded['candidates'][0]['content']['parts'][0]['text'];
                break;
            }
        } else {
            $lastError = "Gemini ($model) error [HTTP $httpCode]: " . substr($result, 0, 300) . " $curlError";
        }
    }
} elseif ($aiProvider === 'anthropic') {
    $apiUrl = "https://api.anthropic.com/v1/messages";
    $model = !empty($customModel) ? $customModel : "claude-3-5-haiku-20241022";

    $payload = [
        'model' => $model,
        'max_tokens' => 4096,
        'system' => "You are a shopping expert assistant. You MUST respond with ONLY a valid JSON object strictly matching this schema: {\"message\": string, \"alternatives\": [{\"store\": string, \"storeDomain\": string, \"name\": string, \"searchKey\": string, \"price\": string, \"description\": string, \"similarity\": string, \"exactUrl\": string, \"imageUrl\": string, \"logoUrl\": string}]}. Do NOT include markdown blocks or any text before or after the JSON.",
        'messages' => [
            ['role' => 'user', 'content' => $prompt]
        ]
    ];

    list($httpCode, $result, $curlError) = safeHttpPost(
        $apiUrl,
        [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
            'anthropic-version: 2023-06-01'
        ],
        json_encode($payload)
    );

    if ($httpCode === 200 && !empty($result)) {
        $apiDecoded = json_decode($result, true);
        if (!empty($apiDecoded['content'][0]['text'])) {
            $responseJson = $apiDecoded['content'][0]['text'];
        }
    } else {
        $lastError = "Anthropic error [HTTP $httpCode]: " . substr($result, 0, 300) . " $curlError";
    }
} else {
    // OpenAI and OpenAI-compatible providers (Groq, DeepSeek, OpenRouter, Mistral, Local/Custom)
    $endpoint = "https://api.openai.com/v1/chat/completions";
    $candidateModels = ["gpt-4o-mini", "gpt-4o"];
    $extraHeaders = [];

    if ($aiProvider === 'groq') {
        $endpoint = "https://api.groq.com/openai/v1/chat/completions";
        $candidateModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];
    } elseif ($aiProvider === 'deepseek') {
        $endpoint = "https://api.deepseek.com/chat/completions";
        $candidateModels = ["deepseek-chat"];
    } elseif ($aiProvider === 'openrouter') {
        $endpoint = "https://openrouter.ai/api/v1/chat/completions";
        $candidateModels = ["google/gemini-2.0-flash-001", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat"];
        $extraHeaders[] = "HTTP-Referer: https://pezeex.com";
        $extraHeaders[] = "X-Title: Pezeex";
    } elseif ($aiProvider === 'mistral') {
        $endpoint = "https://api.mistral.ai/v1/chat/completions";
        $candidateModels = ["mistral-small-latest", "open-mistral-nemo"];
    }

    if (!empty($customBaseUrl)) {
        $endpoint = rtrim($customBaseUrl, '/');
        if (strpos($endpoint, '/chat/completions') === false) {
            $endpoint .= '/chat/completions';
        }
    }
    if (!empty($customModel)) {
        $candidateModels = [$customModel];
    }

    foreach ($candidateModels as $model) {
        $payload = [
            'model' => $model,
            'messages' => [
                [
                    'role' => 'system',
                    'content' => "You are a shopping expert assistant. You MUST respond with ONLY a valid JSON object strictly matching this schema: {\"message\": string, \"alternatives\": [{\"store\": string, \"storeDomain\": string, \"name\": string, \"searchKey\": string, \"price\": string, \"description\": string, \"similarity\": string, \"exactUrl\": string, \"imageUrl\": string, \"logoUrl\": string}]}. Do NOT include markdown formatting or commentary."
                ],
                [
                    'role' => 'user',
                    'content' => $prompt
                ]
            ],
            'response_format' => ['type' => 'json_object']
        ];

        $headers = array_merge([
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ], $extraHeaders);

        list($httpCode, $result, $curlError) = safeHttpPost($endpoint, $headers, json_encode($payload));

        if ($httpCode === 200 && !empty($result)) {
            $apiDecoded = json_decode($result, true);
            if (!empty($apiDecoded['choices'][0]['message']['content'])) {
                $responseJson = $apiDecoded['choices'][0]['message']['content'];
                break;
            }
        } else {
            $lastError = "AI Provider ($aiProvider / $model) error [HTTP $httpCode]: " . substr($result, 0, 300) . " $curlError";
        }
    }
}

if (empty($responseJson)) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Failed to generate alternatives from AI provider (' . htmlspecialchars($aiProvider) . ').',
        'details' => $lastError
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$cleanText = preg_replace('/^```(?:json)?\s*/i', '', trim($responseJson));
$cleanText = preg_replace('/\s*```$/', '', $cleanText);
$parsed = json_decode($cleanText, true);

if (!$parsed || !isset($parsed['alternatives']) || !is_array($parsed['alternatives'])) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Invalid JSON structure from Gemini.',
        'raw' => $cleanText
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Enhance items with resolved domain, logoUrl, sanitized URLs
$alternatives = [];
foreach ($parsed['alternatives'] as $item) {
    $fallbackSearch = trim(($item['name'] ?? '') . ' ' . ($item['store'] ?? ''));
    $domain = resolveStoreDomain($item['store'] ?? '', $item['storeDomain'] ?? '');
    
    $logoUrl = '';
    if (!empty($item['logoUrl']) && strpos($item['logoUrl'], 'http') === 0) {
        $logoUrl = $item['logoUrl'];
    } elseif (!empty($domain)) {
        $logoUrl = 'https://www.google.com/s2/favicons?domain=' . urlencode($domain) . '&sz=128';
    }

    $item['storeDomain'] = $domain;
    $item['logoUrl'] = $logoUrl;
    $item['exactUrl'] = sanitizeUrl($item['exactUrl'] ?? '', $fallbackSearch);
    $item['imageUrl'] = sanitizeUrl($item['imageUrl'] ?? '');

    $alternatives[] = $item;
}

echo json_encode([
    'message' => $parsed['message'] ?? null,
    'alternatives' => $alternatives
], JSON_UNESCAPED_UNICODE);
