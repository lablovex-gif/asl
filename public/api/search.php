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

// 1. Resolve API Key from multiple sources
function getApiKey() {
    // Check environment variables
    $keys = [
        'GEMINI_API_KEY',
        'VITE_GEMINI_API_KEY',
        'REDIRECT_GEMINI_API_KEY',
        'REDIRECT_VITE_GEMINI_API_KEY'
    ];
    
    foreach ($keys as $k) {
        if (!empty($_ENV[$k])) return trim($_ENV[$k]);
        if (!empty($_SERVER[$k])) return trim($_SERVER[$k]);
        $val = getenv($k);
        if (!empty($val)) return trim($val);
    }

    // Check config.php if exists
    $configFile = __DIR__ . '/config.php';
    if (file_exists($configFile)) {
        $config = include $configFile;
        if (is_array($config) && !empty($config['GEMINI_API_KEY'])) {
            return trim($config['GEMINI_API_KEY']);
        }
    }

    // Check .env file in root or parent directories
    $envPaths = [
        __DIR__ . '/.env',
        dirname(__DIR__) . '/.env',
        dirname(dirname(__DIR__)) . '/.env'
    ];

    foreach ($envPaths as $envPath) {
        if (file_exists($envPath) && is_readable($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line) || $line[0] === '#') continue;
                if (preg_match('/^(?:VITE_)?GEMINI_API_KEY\s*=\s*["\']?([^"\']+)["\']?/', $line, $m)) {
                    return trim($m[1]);
                }
            }
        }
    }

    return null;
}

$apiKey = getApiKey();
if (empty($apiKey)) {
    http_response_code(500);
    echo json_encode([
        'error' => 'GEMINI_API_KEY is not configured.',
        'details' => 'Please set GEMINI_API_KEY in Hostinger environment variables, in .env, or in api/config.php'
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

$candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-3.8-flash'
];

$responseJson = null;
$lastError = null;

foreach ($candidateModels as $model) {
    $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . urlencode($apiKey);
    
    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 45,
        CURLOPT_SSL_VERIFYPEER => true
    ]);

    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($httpCode === 200 && !empty($result)) {
        $apiDecoded = json_decode($result, true);
        if (!empty($apiDecoded['candidates'][0]['content']['parts'][0]['text'])) {
            $responseJson = $apiDecoded['candidates'][0]['content']['parts'][0]['text'];
            break;
        }
    } else {
        $lastError = "Model $model returned HTTP $httpCode: $result $curlError";
    }
}

if (empty($responseJson)) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Failed to generate alternatives from Gemini.',
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
