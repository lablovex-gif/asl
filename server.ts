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

function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let clean = rawUrl.trim();
  // Strip markdown, brackets
  clean = clean.replace(/^[<(\[]+|[>)\]]+$/g, "");
  const match = clean.match(/(https?:\/\/[^\s\)]+)/i);
  if (match) {
    clean = match[1];
  } else if (!/^https?:\/\//i.test(clean) && clean.includes(".")) {
    clean = "https://" + clean;
  }
  return isValidHttpUrl(clean) ? clean : "";
}

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

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

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `أنت مساعد ذكي مبرمج خصيصاً لمساعدة المستخدمين في إيجاد بدائل حقيقية وأرخص للمنتجات.

      مدخلات المستخدم: "${cleanProductName}"

      عندما يطلب المستخدم إيجاد بدائل لمنتج معين، يجب عليك اتباع الخطوات التالية بدقة بالغة:
      1. ابحث في جوجل أولاً باستخدام أداة البحث المدمجة (Google Search tool) عن بدائل أرخص لهذا المنتج.
      2. استخدم مصطلحات بحث فعالة مثل: "بديل أرخص لـ [المنتج]" أو "[المنتج] alternative cheaper" أو "أفضل بديل [المنتج] سعر".
      3. انتظر نتائج البحث الحقيقية واقرأها بعناية.
      4. استخرج ما بين 10 إلى 20 منتجاً كبدائل مقترحة من نتائج البحث الفعلية، بشرط أن يحتوي كل خيار على رابط حقيقي مباشر لصفحة المنتج.

      🚨 قواعد صارمة جداً وحاسمة بخصوص الروابط (exactUrl):
      - 🚫 يمنع منعاً باتاً اقتراح أي خيار أو منتج لا يحتوي على رابط مباشر لصفحة المنتج في نتائج البحث الحقيقية. كل بديل تقترحه يجب أن يشتمل على رابط مباشر ومؤكد. لا تقترح أبداً أي منتج بدون رابط مباشر.
      - 🚫 ممنوع منعاً باتاً اختراع أي رابط أو تخمينه أو بناؤه يدوياً أو تعديله حتى لو بدا منطقياً أو متوقعاً.
      - ✅ يجب أخذ الرابط (exactUrl) حرفياً وبكل رموزه وحروفه كما ظهر في نتائج بحث جوجل الحقيقية المرتجعة من الأداة فقط.
      - 🚫 يجب أن يوجه الرابط إلى صفحة المنتج البديل مباشرة وليس الصفحة الرئيسية للموقع أو المتجر.
      - لا تقترح نفس المتجر (مثل أمازون أو غيره) أكثر من مرة واحدة في قائمة البدائل، إلا إذا طلب المستخدم ذلك صراحة. يجب تنويع المتاجر ومواقع البيع في النتائج المعروضة لتقديم أفضل خيارات ممكنة للمستخدم.

      قواعد إضافية لباقي الحقول:
      - message: استخدم هذا الحقل للرد على المستخدم إذا كان سؤاله غير متعلق بمنتج، أو لسؤاله عن توضيحات إضافية إذا كان طلبه غير واضح.
      - name: اسم المنتج البديل.
      - price: السعر التقريبي الفعلي الذي وجدته في بحثك (مثال: "$50" أو "200 ريال"). إذا لم تجد سعراً، استخدم "-".
      - store: اسم الموقع أو المتجر الحقيقي الذي يبيع المنتج.
      - description: لماذا هو بديل جيد (سبب مختصر ومقنع).
      - searchKey: الكلمة المفتاحية للبحث باللغة الإنجليزية بدون إضافات.
      - similarity: مدى التشابه.
      - imageUrl: رابط صالح ومباشر لصورة المنتج البديل من نتائج البحث، أو اتركه فارغاً إذا لم تجد.
      
      Language for UI text fields: ${cleanLanguage}.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
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
                  exactUrl: { 
                    type: Type.STRING, 
                    description: "The EXACT direct product URL taken LITERALLY from Google Search results. STRICTLY FORBIDDEN to invent, guess, or manually build. Must be empty string '' if no exact direct URL is found in the search results." 
                  },
                  imageUrl: { type: Type.STRING, description: "A valid absolute URL for a relevant product image." }
                },
                required: ["store", "name", "searchKey", "price", "description", "similarity", "exactUrl"]
              }
            }
          },
          required: ["alternatives"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      return res.json({ alternatives: [], message: "" });
    }

    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) cleanText = cleanText.substring(7);
    if (cleanText.startsWith("```")) cleanText = cleanText.substring(3);
    if (cleanText.endsWith("```")) cleanText = cleanText.slice(0, -3);
    cleanText = cleanText.trim();

    const parsed = JSON.parse(cleanText);

    // Sanitize all URLs returned by AI
    if (parsed && Array.isArray(parsed.alternatives)) {
      parsed.alternatives = parsed.alternatives.map((item: any) => ({
        ...item,
        exactUrl: sanitizeUrl(item.exactUrl),
        imageUrl: sanitizeUrl(item.imageUrl)
      })).filter((item: any) => item.exactUrl !== "");
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
