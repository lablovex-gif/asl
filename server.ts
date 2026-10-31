import express from "express";
import path from "path";
import compression from "compression";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable gzip/deflate compression for all requests
app.use(compression());
app.use(express.json({ limit: "1mb" }));

// Helper to sanitize and validate URLs (prevents javascript:, data:, vbscript:, etc.)
function isValidHttpUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizeUrl(rawUrl: string, fallbackQuery?: string): string {
  if (rawUrl && typeof rawUrl === "string") {
    let clean = rawUrl.trim();
    clean = clean.replace(/^[<(\[]+|[>)\]]+$/g, "");
    const match = clean.match(/(https?:\/\/[^\s\)]+)/i);
    if (match) {
      clean = match[1];
    } else if (!/^https?:\/\//i.test(clean) && clean.includes(".")) {
      clean = "https://" + clean;
    }
    if (isValidHttpUrl(clean)) {
      return clean;
    }
  }

  if (fallbackQuery && typeof fallbackQuery === "string" && fallbackQuery.trim()) {
    return `https://www.google.com/search?q=${encodeURIComponent(fallbackQuery.trim())}`;
  }

  return "";
}

interface AIConfigItem {
  id: string;
  provider: "gemini" | "openai" | "groq" | "deepseek" | "openrouter" | "anthropic" | "mistral" | "openai-compatible";
  apiKey: string;
  customBaseUrl?: string;
  customModel?: string;
}

function detectProvider(apiKey: string, varName: string = ""): "gemini" | "openai" | "groq" | "deepseek" | "openrouter" | "anthropic" | "mistral" | "openai-compatible" {
  const kUpper = varName.toUpperCase();
  if (kUpper.includes("OPENAI") || kUpper.includes("CHATGPT")) return "openai";
  if (kUpper.includes("GROQ")) return "groq";
  if (kUpper.includes("DEEPSEEK")) return "deepseek";
  if (kUpper.includes("OPENROUTER")) return "openrouter";
  if (kUpper.includes("ANTHROPIC") || kUpper.includes("CLAUDE")) return "anthropic";
  if (kUpper.includes("MISTRAL")) return "mistral";
  if (kUpper.includes("GEMINI") || kUpper.includes("GOOGLE")) return "gemini";

  const val = apiKey.trim();
  if (val.startsWith("AIzaSy") || val.startsWith("AQ.")) return "gemini";
  if (val.startsWith("gsk_")) return "groq";
  if (val.startsWith("sk-or-")) return "openrouter";
  if (val.startsWith("sk-ant-")) return "anthropic";
  if (val.startsWith("sk-proj-") || val.startsWith("sk-")) return "openai";
  return "gemini";
}

function getAllAIConfigs(): AIConfigItem[] {
  const env = process.env;
  const customBaseUrl = env.AI_BASE_URL || env.OPENAI_BASE_URL;
  const customModel = env.AI_MODEL || env.OPENAI_MODEL || env.GEMINI_MODEL;
  const configs: AIConfigItem[] = [];
  const seenKeys = new Set<string>();

  const addKey = (rawKey: string, varName: string = "") => {
    const key = rawKey.trim();
    if (!key || seenKeys.has(key)) return;
    if (key.length < 15 || key.startsWith("/") || key.startsWith("http://") || key.startsWith("https://") || key.startsWith("{")) return;
    seenKeys.add(key);
    const provider = detectProvider(key, varName);
    configs.push({
      id: `${varName || "key"}_${configs.length + 1}`,
      apiKey: key,
      provider: customBaseUrl ? "openai-compatible" : provider,
      customBaseUrl,
      customModel,
    });
  };

  // 1. Look for numbered variables FIRST in exact natural numeric order (API_KEY_1, API_KEY_2, API_KEY_3, etc.)
  const numberedKeys = Object.keys(env)
    .filter(k => /^(GEMINI_API_KEY|API_KEY|OPENAI_API_KEY|GROQ_API_KEY|DEEPSEEK_API_KEY|CLAUDE_API_KEY)[_-]?\d+$/i.test(k))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+$/)?.[0] || "0", 10);
      const numB = parseInt(b.match(/\d+$/)?.[0] || "0", 10);
      return numA - numB;
    });
  for (const k of numberedKeys) {
    const val = env[k];
    if (typeof val === "string") {
      addKey(val, k);
    }
  }

  // 2. Look for explicit comma/newline-separated lists (e.g. GEMINI_API_KEYS or API_KEYS)
  const listVars = ["API_KEYS", "GEMINI_API_KEYS", "OPENAI_API_KEYS", "AI_KEYS"];
  for (const varName of listVars) {
    const val = env[varName];
    if (typeof val === "string" && val.trim()) {
      const parts = val.split(/[\n,;]+/).map(p => p.trim()).filter(Boolean);
      for (const part of parts) {
        addKey(part, varName);
      }
    }
  }

  // 3. Look for standard single keys (GEMINI_API_KEY, OPENAI_API_KEY, GROQ_API_KEY, etc.)
  const standardVars = ["GEMINI_API_KEY", "OPENAI_API_KEY", "GROQ_API_KEY", "DEEPSEEK_API_KEY", "OPENROUTER_API_KEY", "ANTHROPIC_API_KEY", "API_KEY"];
  for (const varName of standardVars) {
    const val = env[varName];
    if (typeof val === "string") {
      addKey(val, varName);
    }
  }

  // 4. Fallback search across any remaining env vars that resemble API tokens
  const systemVars = new Set([
    "PATH", "PWD", "HOME", "SHELL", "USER", "HOSTNAME", "PORT", "NODE_ENV", "TERM", "SHLVL", "_", "LANG",
    "DISABLE_HMR", "APP_URL", "K_SERVICE", "K_REVISION", "K_CONFIGURATION", "LS_COLORS", "COLORTERM"
  ]);
  for (const [k, v] of Object.entries(env)) {
    if (typeof v !== "string" || systemVars.has(k.toUpperCase()) || seenKeys.has(v.trim())) continue;
    const val = v.trim();
    if ((val.startsWith("AIzaSy") || val.startsWith("gsk_") || val.startsWith("sk-")) && val.length >= 20) {
      addKey(val, k);
    }
  }

  return configs;
}

// Map of cached GoogleGenAI instances per API key
const aiClientsMap = new Map<string, GoogleGenAI>();
function getAIClient(apiKey: string): GoogleGenAI {
  const cleanKey = apiKey.trim();
  let client = aiClientsMap.get(cleanKey);
  if (!client) {
    client = new GoogleGenAI({
      apiKey: cleanKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    aiClientsMap.set(cleanKey, client);
  }
  return client;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Candidate models in preference order (reliable and active)
const CANDIDATE_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-2.5-flash",
];

function resolveStoreDomain(store: string, aiDomain?: string): string {
  if (aiDomain && typeof aiDomain === "string" && aiDomain.includes(".")) {
    const cleanAiDomain = aiDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0].trim();
    if (cleanAiDomain.length > 3 && cleanAiDomain.includes(".")) return cleanAiDomain;
  }

  const s = (store || "").toLowerCase().trim();
  if (s.includes("amazon") || s.includes("أمازون")) return "amazon.com";
  if (s.includes("noon") || s.includes("نون")) return "noon.com";
  if (s.includes("aliexpress") || s.includes("علي إكسبريس") || s.includes("علي اكسبرس")) return "aliexpress.com";
  if (s.includes("jarir") || s.includes("جرير")) return "jarir.com";
  if (s.includes("extra") || s.includes("إكسترا") || s.includes("اكسترا")) return "extra.com";
  if (s.includes("ebay") || s.includes("إيباي") || s.includes("ايباي")) return "ebay.com";
  if (s.includes("temu") || s.includes("تيمو")) return "temu.com";
  if (s.includes("shein") || s.includes("شي إن") || s.includes("شي ان")) return "shein.com";
  if (s.includes("alibaba") || s.includes("علي بابا")) return "alibaba.com";
  if (s.includes("banggood") || s.includes("بانجوود")) return "banggood.com";
  if (s.includes("walmart") || s.includes("وول مارت")) return "walmart.com";
  if (s.includes("best buy") || s.includes("bestbuy") || s.includes("بست باي")) return "bestbuy.com";
  if (s.includes("apple") || s.includes("آبل") || s.includes("ابل")) return "apple.com";
  if (s.includes("samsung") || s.includes("سامسونج")) return "samsung.com";
  if (s.includes("anker") || s.includes("أنكر")) return "anker.com";
  if (s.includes("carrefour") || s.includes("كارفور")) return "carrefour.com";
  if (s.includes("lulu") || s.includes("لولو")) return "luluhypermarket.com";
  if (s.includes("geekbuying") || s.includes("جيك باينج")) return "geekbuying.com";
  if (s.includes("newegg") || s.includes("نيوايج")) return "newegg.com";
  if (s.includes("bhphoto") || s.includes("b&h") || s.includes("بي آند إتش")) return "bhphotovideo.com";
  if (s.includes("asos") || s.includes("اسوس") || s.includes("أسوس")) return "asos.com";
  if (s.includes("myprotein") || s.includes("ماي بروتين")) return "myprotein.com";
  if (s.includes("zaful") || s.includes("زافول")) return "zaful.com";
  if (s.includes("ikea") || s.includes("ايكيا") || s.includes("إيكيا")) return "ikea.com";
  if (s.includes("namshi") || s.includes("نمشي")) return "namshi.com";
  if (s.includes("sivvi") || s.includes("سيفي")) return "sivvi.com";
  if (s.includes("niceone") || s.includes("نايس ون")) return "niceonesa.com";

  const latinClean = s.replace(/[^a-z0-9]/g, "");
  if (latinClean.length > 2) return `${latinClean}.com`;
  return "";
}

async function executeSingleAIConfig(aiConfig: AIConfigItem, prompt: string): Promise<string> {
  let generatedText: string | null = null;
  let lastError: any = null;

  if (aiConfig.provider === "gemini") {
    const ai = getAIClient(aiConfig.apiKey);
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        message: { type: Type.STRING },
        alternatives: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              store: { type: Type.STRING },
              storeDomain: { type: Type.STRING },
              name: { type: Type.STRING },
              searchKey: { type: Type.STRING },
              price: { type: Type.STRING },
              description: { type: Type.STRING },
              similarity: { type: Type.STRING },
              exactUrl: { type: Type.STRING },
              imageUrl: { type: Type.STRING },
              logoUrl: { type: Type.STRING }
            },
            required: ["store", "name", "searchKey", "price", "description", "similarity", "exactUrl"]
          }
        }
      },
      required: ["alternatives"]
    };

    const candidateModels = aiConfig.customModel ? [aiConfig.customModel] : CANDIDATE_MODELS;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema,
          },
        });
        if (response.text) {
          generatedText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Gemini] Model ${model} failed for key ${aiConfig.id}:`, err?.message || err);
      }
    }
  } else if (aiConfig.provider === "anthropic") {
    const model = aiConfig.customModel || "claude-3-5-haiku-20241022";
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": aiConfig.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: "You are a shopping expert assistant. You MUST respond with ONLY a valid JSON object strictly matching this schema: {\"message\": string, \"alternatives\": [{\"store\": string, \"storeDomain\": string, \"name\": string, \"searchKey\": string, \"price\": string, \"description\": string, \"similarity\": string, \"exactUrl\": string, \"imageUrl\": string, \"logoUrl\": string}]}. Do NOT include markdown blocks or any text before or after the JSON.",
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data?.content?.[0]?.text) {
          generatedText = data.content[0].text;
        }
      } else {
        const errBody = await response.text();
        lastError = new Error(`Anthropic error [${response.status}]: ${errBody}`);
      }
    } catch (err: any) {
      lastError = err;
    }
  } else {
    // OpenAI and OpenAI-compatible (Groq, DeepSeek, OpenRouter, Mistral, Custom)
    let endpoint = "https://api.openai.com/v1/chat/completions";
    let candidateModels = ["gpt-4o-mini", "gpt-4o"];
    const extraHeaders: Record<string, string> = {};

    if (aiConfig.provider === "groq") {
      endpoint = "https://api.groq.com/openai/v1/chat/completions";
      candidateModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];
    } else if (aiConfig.provider === "deepseek") {
      endpoint = "https://api.deepseek.com/chat/completions";
      candidateModels = ["deepseek-chat"];
    } else if (aiConfig.provider === "openrouter") {
      endpoint = "https://openrouter.ai/api/v1/chat/completions";
      candidateModels = ["google/gemini-2.0-flash-001", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat"];
      extraHeaders["HTTP-Referer"] = "https://pezeex.com";
      extraHeaders["X-Title"] = "Pezeex";
    } else if (aiConfig.provider === "mistral") {
      endpoint = "https://api.mistral.ai/v1/chat/completions";
      candidateModels = ["mistral-small-latest", "open-mistral-nemo"];
    }

    if (aiConfig.customBaseUrl) {
      endpoint = aiConfig.customBaseUrl.replace(/\/+$/, "");
      if (!endpoint.includes("/chat/completions")) {
        endpoint += "/chat/completions";
      }
    }
    if (aiConfig.customModel) {
      candidateModels = [aiConfig.customModel];
    }

    for (const model of candidateModels) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${aiConfig.apiKey}`,
            ...extraHeaders
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: "You are a shopping expert assistant. You MUST respond with ONLY a valid JSON object strictly matching this schema: {\"message\": string, \"alternatives\": [{\"store\": string, \"storeDomain\": string, \"name\": string, \"searchKey\": string, \"price\": string, \"description\": string, \"similarity\": string, \"exactUrl\": string, \"imageUrl\": string, \"logoUrl\": string}]}. Do NOT include markdown formatting or commentary."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            response_format: { type: "json_object" }
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          if (data?.choices?.[0]?.message?.content) {
            generatedText = data.choices[0].message.content;
            break;
          }
        } else {
          const errBody = await response.text();
          lastError = new Error(`AI Provider [${response.status}]: ${errBody}`);
        }
      } catch (err: any) {
        lastError = err;
      }
    }
  }

  if (!generatedText) {
    throw lastError || new Error(`Key ${aiConfig.id} could not generate response.`);
  }

  return generatedText;
}

// Global counter for search operations to ensure round-robin rotation:
// Person 1 (Search 1) -> Key 1
// Person 2 (Search 2) -> Key 2
// Person 3 (Search 3) -> Key 3
// Person 4 (Search 4) -> Key 1
let globalSearchOperationCount = 0;

// Executes search with strict per-operation round-robin key rotation and automatic failover
async function executeAISearchWithRotation(prompt: string): Promise<{ text: string; keyId: string; totalKeys: number; operationIndex: number }> {
  // Reload dotenv in case user edited .env file without restarting server
  dotenv.config();
  const configs = getAllAIConfigs();

  if (configs.length === 0) {
    throw new Error("لم يتم تكوين أي مفتاح API. يرجى إضافة API_KEY_1 و API_KEY_2 و API_KEY_3 في ملف .env");
  }

  const numKeys = configs.length;
  // Atomically increment operation count for this new incoming search
  const currentOp = ++globalSearchOperationCount;
  // Exact assigned primary key index for this search:
  // Op 1 -> index 0 (Key 1)
  // Op 2 -> index 1 (Key 2)
  // Op 3 -> index 2 (Key 3)
  // Op 4 -> index 0 (Key 1) ...
  const primaryIdx = (currentOp - 1) % numKeys;

  let lastError: any = null;

  // Try the assigned primary key first, then fall back to remaining keys in order if needed
  for (let attempt = 0; attempt < numKeys; attempt++) {
    const keyIdx = (primaryIdx + attempt) % numKeys;
    const currentConfig = configs[keyIdx];

    try {
      console.log(`[Round-Robin Search #${currentOp}] Person/Operation #${currentOp} assigned Key #${keyIdx + 1}/${numKeys} (${currentConfig.id}, provider: ${currentConfig.provider}) [attempt ${attempt + 1}]`);
      const text = await executeSingleAIConfig(currentConfig, prompt);
      if (text) {
        console.log(`[Round-Robin Search #${currentOp}] Key #${keyIdx + 1} succeeded. Next search (Operation #${currentOp + 1}) will automatically use Key #${(currentOp % numKeys) + 1}.`);
        return { text, keyId: currentConfig.id, totalKeys: numKeys, operationIndex: currentOp };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Round-Robin Search #${currentOp}] Key #${keyIdx + 1} (${currentConfig.id}) encountered error: ${err?.message || err}. Falling over to next key...`);
    }
  }

  throw lastError || new Error("All configured API keys in the pool failed or reached their rate limits.");
}

// Secure search endpoint proxying AI API calls with automatic key switching
app.post("/api/search", async (req, res) => {
  try {
    const { productName, language = "العربية" } = req.body || {};

    if (!productName || typeof productName !== "string" || productName.trim().length === 0) {
      return res.status(400).json({ error: "Product name or search query is required." });
    }

    const cleanProductName = productName.trim().substring(0, 500);
    const cleanLanguage = typeof language === "string" ? language.trim().substring(0, 50) : "العربية";

    const prompt = `أنت مساعد ذكي متخصص في إيجاد بدائل حقيقية وممتازة وأرخص للمنتجات.

المنتج أو الاستفسار المطلوب: "${cleanProductName}"

المطلوب:
1. اقترح قائمة غنية ومتنوعة تحتوي على ما بين 12 إلى 18 منتجاً بديلاً حقيقياً وأرخص ثمناً وتوفر قيمة ممتازة ومنافسة مقابل السعر مقارنة بالمنتج الأصلي.
2. لكل منتج بديل، حدد المتجر أو المنصة التي يتوفر بها (نوّع بين المتاجر مثل: أمازون، نون، علي إكسبريس، جرير، إكسترا، إيباي، إلخ).
3. استخرج النطاق الإلكتروني الرسمي للمتجر بدقة في حقل storeDomain (مثل: amazon.sa, noon.com, aliexpress.com, jarir.com, extra.com, ebay.com, temu.com, shein.com).
4. اكتب سبباً مقنعاً ومختصراً يوضح لماذا يعتبر هذا المنتج خياراً وبديلاً ممتازاً وأرخص.
5. اذكر السعر التقريبي للمنتج البديل، ونسبة أو درجة التشابه مع المنتج المطلوب.

اللغة المطلوبة للرد: ${cleanLanguage}.`;

    const { text: generatedText, keyId, totalKeys } = await executeAISearchWithRotation(prompt);

    let cleanText = generatedText.trim();
    if (cleanText.startsWith("```json")) cleanText = cleanText.substring(7);
    if (cleanText.startsWith("```")) cleanText = cleanText.substring(3);
    if (cleanText.endsWith("```")) cleanText = cleanText.slice(0, -3);
    cleanText = cleanText.trim();

    const parsed = JSON.parse(cleanText);

    // Sanitize URLs and ensure every item has a reliable search/store link and logo
    if (parsed && Array.isArray(parsed.alternatives)) {
      parsed.alternatives = parsed.alternatives.map((item: any) => {
        const fallbackSearch = `${item.name || ""} ${item.store || ""}`.trim();
        const domain = resolveStoreDomain(item.store, item.storeDomain);
        const resolvedLogoUrl = item.logoUrl && typeof item.logoUrl === "string" && item.logoUrl.startsWith("http")
          ? item.logoUrl
          : domain
            ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
            : "";

        return {
          ...item,
          storeDomain: domain,
          logoUrl: resolvedLogoUrl,
          exactUrl: sanitizeUrl(item.exactUrl, fallbackSearch),
          imageUrl: sanitizeUrl(item.imageUrl),
        };
      }).filter((item: any) => item.exactUrl !== "");
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error("Server search error:", error);
    return res.status(500).json({ 
      error: "Failed to fetch product alternatives.", 
      details: error?.message || "Internal server error" 
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0", port: 3000 },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: "1y",
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          // Do not cache HTML so updates are immediate
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      }
    }));
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
