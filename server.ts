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

let aiClient: GoogleGenAI | null = null;
function getAIClient(apiKey: string): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const GEMINI_CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
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

interface AIRunner {
  name: string;
  run: (prompt: string) => Promise<string | null>;
}

function getAIRunners(): AIRunner[] {
  const env = process.env;
  const runners: AIRunner[] = [];

  const customBaseUrl = env.AI_BASE_URL || env.OPENAI_BASE_URL;
  const customModel = env.AI_MODEL || env.OPENAI_MODEL;
  const bluesmindsKey = env.BLUESMINDS_API_KEY;
  const genericAIKey = env.AI_API_KEY || env.AI_KEY;

  // 1. Check for Custom / OpenAI-Compatible Provider (e.g. Bluesminds, vLLM, custom proxy)
  if (customBaseUrl || bluesmindsKey) {
    const baseUrl = (customBaseUrl || (bluesmindsKey ? "https://api.bluesminds.com/v1" : "")).replace(/\/+$/, "");
    let endpoint = baseUrl;
    if (!endpoint.includes("/chat/completions")) {
      endpoint = `${endpoint}/chat/completions`;
    }

    const key = (bluesmindsKey || genericAIKey || env.OPENAI_API_KEY || "").trim();
    const candidateModels = customModel 
      ? [customModel]
      : ["nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", "meta/llama-3.2-11b-vision-instruct", "moonshotai/kimi-k3"];

    if (key && endpoint) {
      runners.push({
        name: `Custom Endpoint (${endpoint})`,
        run: async (prompt: string) => {
          let lastErr: any = null;
          for (const model of candidateModels) {
            try {
              const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${key}`,
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

              if (res.ok) {
                const data: any = await res.json();
                const content = data?.choices?.[0]?.message?.content;
                if (content && typeof content === "string") {
                  return content;
                }
              } else {
                const errBody = await res.text().catch(() => "");
                lastErr = new Error(`HTTP ${res.status}: ${errBody.slice(0, 300)}`);
              }
            } catch (e: any) {
              lastErr = e;
            }
          }
          throw lastErr || new Error("Custom AI endpoint returned no content");
        }
      });
    }
  }

  // 2. Check for Gemini API (Google GenAI)
  const geminiKey = (env.GEMINI_API_KEY || env.GOOGLE_API_KEY || (genericAIKey && genericAIKey.startsWith("AIzaSy") ? genericAIKey : "")).trim();
  if (geminiKey) {
    const geminiModels = [...GEMINI_CANDIDATE_MODELS];
    // If a valid Gemini model is specified in GEMINI_MODEL, test it first
    if (env.GEMINI_MODEL && env.GEMINI_MODEL.startsWith("gemini-") && !geminiModels.includes(env.GEMINI_MODEL)) {
      geminiModels.unshift(env.GEMINI_MODEL);
    }

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

    runners.push({
      name: "Google Gemini",
      run: async (prompt: string) => {
        const ai = getAIClient(geminiKey);
        let lastErr: any = null;

        for (const model of geminiModels) {
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
              return response.text;
            }
          } catch (err: any) {
            lastErr = err;
            console.warn(`[AI Search] Gemini model ${model} failed, trying next candidate...`, err?.message || err);
          }
        }
        throw lastErr || new Error("Gemini returned no content");
      }
    });
  }

  // 3. Check for Groq
  const groqKey = (env.GROQ_API_KEY || (genericAIKey && genericAIKey.startsWith("gsk_") ? genericAIKey : "")).trim();
  if (groqKey) {
    runners.push({
      name: "Groq",
      run: async (prompt: string) => {
        const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
        let lastErr: any = null;
        for (const model of models) {
          try {
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${groqKey}`
              },
              body: JSON.stringify({
                model,
                messages: [
                  {
                    role: "system",
                    content: "You are a shopping expert assistant. You MUST respond with ONLY a valid JSON object strictly matching this schema: {\"message\": string, \"alternatives\": [{\"store\": string, \"storeDomain\": string, \"name\": string, \"searchKey\": string, \"price\": string, \"description\": string, \"similarity\": string, \"exactUrl\": string, \"imageUrl\": string, \"logoUrl\": string}]}. Do NOT include markdown formatting or commentary."
                  },
                  { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
              })
            });
            if (res.ok) {
              const data: any = await res.json();
              const content = data?.choices?.[0]?.message?.content;
              if (content) return content;
            } else {
              const b = await res.text().catch(() => "");
              lastErr = new Error(`Groq HTTP ${res.status}: ${b.slice(0, 200)}`);
            }
          } catch (e: any) {
            lastErr = e;
          }
        }
        throw lastErr || new Error("Groq returned no content");
      }
    });
  }

  // 4. Check for OpenRouter
  const openRouterKey = (env.OPENROUTER_API_KEY || (genericAIKey && genericAIKey.startsWith("sk-or-") ? genericAIKey : "")).trim();
  if (openRouterKey) {
    runners.push({
      name: "OpenRouter",
      run: async (prompt: string) => {
        const models = ["google/gemini-2.0-flash-001", "meta-llama/llama-3.3-70b-instruct"];
        let lastErr: any = null;
        for (const model of models) {
          try {
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openRouterKey}`,
                "HTTP-Referer": "https://pezeex.com",
                "X-Title": "Pezeex"
              },
              body: JSON.stringify({
                model,
                messages: [
                  {
                    role: "system",
                    content: "You are a shopping expert assistant. You MUST respond with ONLY a valid JSON object strictly matching this schema: {\"message\": string, \"alternatives\": [{\"store\": string, \"storeDomain\": string, \"name\": string, \"searchKey\": string, \"price\": string, \"description\": string, \"similarity\": string, \"exactUrl\": string, \"imageUrl\": string, \"logoUrl\": string}]}. Do NOT include markdown formatting or commentary."
                  },
                  { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
              })
            });
            if (res.ok) {
              const data: any = await res.json();
              const content = data?.choices?.[0]?.message?.content;
              if (content) return content;
            } else {
              const b = await res.text().catch(() => "");
              lastErr = new Error(`OpenRouter HTTP ${res.status}: ${b.slice(0, 200)}`);
            }
          } catch (e: any) {
            lastErr = e;
          }
        }
        throw lastErr || new Error("OpenRouter returned no content");
      }
    });
  }

  // 5. Check for official OpenAI
  const openaiKey = env.OPENAI_API_KEY?.trim();
  if (openaiKey && !customBaseUrl) {
    runners.push({
      name: "OpenAI",
      run: async (prompt: string) => {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are a shopping expert assistant. You MUST respond with ONLY a valid JSON object strictly matching this schema: {\"message\": string, \"alternatives\": [{\"store\": string, \"storeDomain\": string, \"name\": string, \"searchKey\": string, \"price\": string, \"description\": string, \"similarity\": string, \"exactUrl\": string, \"imageUrl\": string, \"logoUrl\": string}]}. Do NOT include markdown formatting or commentary."
              },
              { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
          })
        });
        if (res.ok) {
          const data: any = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) return content;
        }
        const b = await res.text().catch(() => "");
        throw new Error(`OpenAI HTTP ${res.status}: ${b.slice(0, 200)}`);
      }
    });
  }

  return runners;
}

// Secure search endpoint proxying AI API calls
app.post("/api/search", async (req, res) => {
  try {
    const { productName, language = "العربية" } = req.body || {};

    if (!productName || typeof productName !== "string" || productName.trim().length === 0) {
      return res.status(400).json({ error: "Product name or search query is required." });
    }

    const cleanProductName = productName.trim().substring(0, 500);
    const cleanLanguage = typeof language === "string" ? language.trim().substring(0, 50) : "العربية";

    const runners = getAIRunners();
    if (runners.length === 0) {
      return res.status(500).json({
        error: "AI API Key is not configured.",
        details: "Please set an API key for Gemini, OpenAI, Bluesminds, Groq, or OpenRouter in your environment variables or Secrets panel."
      });
    }

    const prompt = `أنت مساعد ذكي متخصص في إيجاد بدائل حقيقية وممتازة وأرخص للمنتجات.

المنتج أو الاستفسار المطلوب: "${cleanProductName}"

المطلوب:
1. اقترح قائمة غنية ومتنوعة تحتوي على ما بين 12 إلى 18 منتجاً بديلاً حقيقياً وأرخص ثمناً وتوفر قيمة ممتازة ومنافسة مقابل السعر مقارنة بالمنتج الأصلي.
2. لكل منتج بديل، حدد المتجر أو المنصة التي يتوفر بها (نوّع بين المتاجر مثل: أمازون، نون، علي إكسبريس، جرير، إكسترا، إيباي، إلخ).
3. استخرج النطاق الإلكتروني الرسمي للمتجر بدقة في حقل storeDomain (مثل: amazon.sa, noon.com, aliexpress.com, jarir.com, extra.com, ebay.com, temu.com, shein.com).
4. اكتب سبباً مقنعاً ومختصراً يوضح لماذا يعتبر هذا المنتج خياراً وبديلاً ممتازاً وأرخص.
5. اذكر السعر التقريبي للمنتج البديل، ونسبة أو درجة التشابه مع المنتج المطلوب.

اللغة المطلوبة للرد: ${cleanLanguage}.`;

    let generatedText: string | null = null;
    let lastError: any = null;

    for (const runner of runners) {
      try {
        const text = await runner.run(prompt);
        if (text && text.trim().length > 0) {
          generatedText = text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Search] Runner '${runner.name}' failed, attempting fallback...`, err?.message || err);
      }
    }

    if (!generatedText) {
      throw lastError || new Error("Unable to generate alternatives at this moment.");
    }

    let cleanText = generatedText.trim();
    if (cleanText.startsWith("```json")) cleanText = cleanText.substring(7);
    if (cleanText.startsWith("```")) cleanText = cleanText.substring(3);
    if (cleanText.endsWith("```")) cleanText = cleanText.slice(0, -3);
    cleanText = cleanText.trim();

    // Safely extract the outermost JSON object if model outputs preamble or thoughts
    const firstBrace = cleanText.indexOf("{");
    const lastBrace = cleanText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

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
