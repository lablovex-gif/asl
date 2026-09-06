<?php
/**
 * Pezeex - Alternative AI Configuration
 * 
 * If your shared hosting (e.g. Hostinger Business) does not pass system environment variables to PHP,
 * you can simply rename this file to "config.php" in the same folder (api/config.php)
 * and enter your API key below.
 * 
 * It supports ANY AI provider (Gemini, OpenAI, Groq, DeepSeek, Anthropic, OpenRouter, etc.)
 */

return [
    // Put your API key here:
    'AI_API_KEY' => 'YOUR_API_KEY_HERE',

    // Optional: Specify custom model or custom base URL if needed
    // 'AI_MODEL' => 'gemini-2.5-flash',
    // 'AI_BASE_URL' => 'https://api.openai.com/v1',
];
