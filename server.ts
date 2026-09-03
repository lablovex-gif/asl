import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

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
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
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

// Candidate models in preference order (reliable and active)
const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash",
];

// Secure search endpoint proxying Gemini API calls
app.post("/api/search", async (req, res) => {
  try {
    const { productName, language = "العربية" } = req.body || {};

    if (!productName || typeof productName !== "string" || productName.trim().length === 0) {
      return res.status(400).json({ error: "Product name or search query is required." });
    }

    const cleanProductName = productName.trim().substring(0, 500);
    const cleanLanguage = typeof language === "string" ? language.trim().substring(0, 50) : "العربية";

    const ai = getAIClient();

    const prompt = `أنت مساعد ذكي متخصص في إيجاد بدائل حقيقية وممتازة وأرخص للمنتجات.

المنتج أو الاستفسار المطلوب: "${cleanProductName}"

المطلوب:
1. اقترح قائمة غنية ومتنوعة تحتوي على ما بين 12 إلى 18 منتجاً بديلاً حقيقياً وأرخص ثمناً وتوفر قيمة ممتازة ومنافسة مقابل السعر مقارنة بالمنتج الأصلي.
2. لكل منتج بديل، حدد المتجر أو المنصة التي يتوفر بها (نوّع بين المتاجر مثل: أمازون، نون، علي إكسبريس، جرير، إكسترا، إيباي، إلخ).
3. اكتب سبباً مقنعاً ومختصراً يوضح لماذا يعتبر هذا المنتج خياراً وبديلاً ممتازاً وأرخص.
4. اذكر السعر التقريبي للمنتج البديل، ونسبة أو درجة التشابه مع المنتج المطلوب.

اللغة المطلوبة للرد: ${cleanLanguage}.`;

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
              name: { type: Type.STRING },
              searchKey: { type: Type.STRING },
              price: { type: Type.STRING },
              description: { type: Type.STRING },
              similarity: { type: Type.STRING },
              exactUrl: { type: Type.STRING },
              imageUrl: { type: Type.STRING }
            },
            required: ["store", "name", "searchKey", "price", "description", "similarity", "exactUrl"]
          }
        }
      },
      required: ["alternatives"]
    };

    let generatedText: string | null = null;
    let lastError: any = null;

    for (const model of CANDIDATE_MODELS) {
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
        console.warn(`Model ${model} failed, trying next candidate...`, err?.message || err);
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

    const parsed = JSON.parse(cleanText);

    // Sanitize URLs and ensure every item has a reliable search/store link
    if (parsed && Array.isArray(parsed.alternatives)) {
      parsed.alternatives = parsed.alternatives.map((item: any) => {
        const fallbackSearch = `${item.name || ""} ${item.store || ""}`.trim();
        return {
          ...item,
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
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
