import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ProductAlternative {
  name: string;
  price: string;
  description: string;
  similarity: string;
  link: string;
  exactUrl: string;
  imageUrl?: string;
  store: string;
  searchKey?: string;
  isPromo?: boolean;
}

export interface ProductsResponse {
  alternatives: ProductAlternative[];
  message?: string;
}

export async function getProductAlternatives(productName: string, language: string = "العربية"): Promise<ProductsResponse | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `أنت مساعد ذكي مبرمج خصيصاً لمساعدة المستخدمين في إيجاد بدائل حقيقية وأرخص للمنتجات.

      مدخلات المستخدم: "${productName}"

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
      
      Language for UI text fields: ${language}.`,
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
    if (!text) return null;
    
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
    if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
    if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
    cleanText = cleanText.trim();
    
    return JSON.parse(cleanText);
  } catch (error: any) {
    console.error("Error fetching alternatives:", error?.message || error);
    throw error;
  }
}
