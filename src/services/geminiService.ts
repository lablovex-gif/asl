export interface ProductAlternative {
  name: string;
  price: string;
  description: string;
  similarity: string;
  link: string;
  exactUrl: string;
  imageUrl?: string;
  store: string;
  storeDomain?: string;
  logoUrl?: string;
  searchKey?: string;
  isPromo?: boolean;
}

export interface ProductsResponse {
  alternatives: ProductAlternative[];
  message?: string;
}

function resolveStoreDomain(store: string, domain?: string): string {
  if (domain && typeof domain === "string" && domain.includes(".")) {
    return domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0].trim();
  }
  const s = (store || "").toLowerCase().trim();
  if (s.includes("amazon") || s.includes("أمازون")) return "amazon.sa";
  if (s.includes("noon") || s.includes("نون")) return "noon.com";
  if (s.includes("aliexpress") || s.includes("علي إكسبريس") || s.includes("علي اكسبرس")) return "aliexpress.com";
  if (s.includes("jarir") || s.includes("جرير")) return "jarir.com";
  if (s.includes("extra") || s.includes("إكسترا") || s.includes("اكسترا")) return "extra.com";
  if (s.includes("ebay") || s.includes("إيباي") || s.includes("ايباي")) return "ebay.com";
  if (s.includes("temu") || s.includes("تيمو")) return "temu.com";
  if (s.includes("shein") || s.includes("شي إن") || s.includes("شي ان")) return "shein.com";
  return "";
}

// Direct Client-Side Call (used when deploying to static hosting or without server)
async function fetchAlternativesDirectFromClient(productName: string, language: string, clientKey: string): Promise<ProductsResponse> {
  const prompt = `أنت مساعد ذكي متخصص في إيجاد بدائل حقيقية وممتازة وأرخص للمنتجات.

المنتج أو الاستفسار المطلوب: "${productName}"

المطلوب:
1. اقترح قائمة غنية ومتنوعة تحتوي على ما بين 12 إلى 18 منتجاً بديلاً حقيقياً وأرخص ثمناً وتوفر قيمة ممتازة ومنافسة مقابل السعر مقارنة بالمنتج الأصلي.
2. لكل منتج بديل، حدد المتجر أو المنصة التي يتوفر بها (أمازون، نون، علي إكسبريس، جرير، إكسترا، إيباي، إلخ).
3. استخرج النطاق الرسمي للمتجر في storeDomain (مثل: amazon.sa, noon.com, aliexpress.com, jarir.com, extra.com, ebay.com).
4. اكتب سبباً مقنعاً ومختصراً يوضح لماذا يعتبر هذا المنتج خياراً وبديلاً ممتازاً وأرخص.
5. اذكر السعر التقريبي للمنتج البديل ونسبة التشابه.

اللغة المطلوبة للرد: ${language}.
أجب بصيغة JSON حصراً مطابقة تماماً للشكل التالي:
{"message": "نص الترحيب", "alternatives": [{"store": "أمازون", "storeDomain": "amazon.sa", "name": "اسم المنتج", "searchKey": "اسم المنتج للبحث", "price": "150 SAR", "description": "السبب والوصف", "similarity": "85%", "exactUrl": "https://www.amazon.sa/s?k=...", "imageUrl": "", "logoUrl": ""}]}`;

  const isGemini = clientKey.startsWith("AIzaSy") || !clientKey.startsWith("sk-");
  let rawJsonText = "";

  if (isGemini) {
    const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];
    let lastErr: any = null;
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(clientKey)}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });
        if (res.ok) {
          const data = await res.json();
          rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (rawJsonText) break;
        } else {
          lastErr = new Error(`Gemini status ${res.status}`);
        }
      } catch (e) {
        lastErr = e;
      }
    }
    if (!rawJsonText && lastErr) throw lastErr;
  } else {
    // OpenAI or Groq or OpenRouter
    const endpoint = clientKey.startsWith("gsk_")
      ? "https://api.groq.com/openai/v1/chat/completions"
      : clientKey.startsWith("sk-or-")
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

    const model = clientKey.startsWith("gsk_") ? "llama-3.3-70b-versatile" : "gpt-4o-mini";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${clientKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });
    if (!res.ok) throw new Error(`AI error ${res.status}`);
    const data = await res.json();
    rawJsonText = data?.choices?.[0]?.message?.content || "";
  }

  let clean = rawJsonText.trim();
  if (clean.startsWith("```json")) clean = clean.substring(7);
  if (clean.startsWith("```")) clean = clean.substring(3);
  if (clean.endsWith("```")) clean = clean.slice(0, -3);
  clean = clean.trim();

  const parsed = JSON.parse(clean);
  if (parsed && Array.isArray(parsed.alternatives)) {
    parsed.alternatives = parsed.alternatives.map((item: any) => {
      const domain = resolveStoreDomain(item.store, item.storeDomain);
      const fallbackUrl = item.exactUrl || (domain ? `https://${domain}/s?k=${encodeURIComponent(item.searchKey || item.name)}` : `https://www.google.com/search?q=${encodeURIComponent(item.searchKey || item.name)}`);
      return {
        ...item,
        storeDomain: domain,
        logoUrl: domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : "",
        exactUrl: fallbackUrl
      };
    });
  }
  return parsed;
}

export async function getProductAlternatives(productName: string, language: string = "العربية"): Promise<ProductsResponse | null> {
  const requestBody = JSON.stringify({
    productName,
    language,
  });

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: requestBody,
  };

  // 1. Try server endpoint first (/api/search)
  let response: Response | null = null;
  let lastError: any = null;

  const candidateEndpoints = [
    "/api/search",
    "/api/search.php",
    "api/search.php",
    "/public/api/search.php",
    "public/api/search.php"
  ];

  for (const endpoint of candidateEndpoints) {
    try {
      const res = await fetch(endpoint, requestOptions);
      if (res.status !== 404) {
        response = res;
        break;
      }
    } catch (err: any) {
      if (!lastError) lastError = err;
    }
  }

  // 2. If server responded successfully
  if (response && response.ok) {
    const data: ProductsResponse = await response.json();
    return data;
  }

  // 3. Fallback: If server is 404 / unavailable / static hosting, check if AI key is injected in environment variables
  const metaEnv = (import.meta as any).env || {};
  const clientKey = (metaEnv.VITE_AI_API_KEY || metaEnv.VITE_GEMINI_API_KEY || "") as string;
  if (clientKey && clientKey.trim().length > 10) {
    try {
      return await fetchAlternativesDirectFromClient(productName, language, clientKey.trim());
    } catch (clientErr: any) {
      console.warn("Direct client call failed, returning server error", clientErr);
    }
  }

  // If server had a specific error response, throw it
  if (response && !response.ok) {
    const errData = await response.json().catch(() => ({}));
    const detailedMessage = errData.details || errData.error || `HTTP error ${response.status}: ${response.statusText}`;
    throw new Error(detailedMessage);
  }

  throw lastError || new Error("لم يتم العثور على خادم البحث أو مفتاح الذكاء الاصطناعي.");
}
