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

  // 1. Try standard /api/search endpoint (works with Node.js dev server and Apache/LiteSpeed rewrite)
  let response: Response | null = null;
  let lastError: any = null;

  try {
    response = await fetch("/api/search", requestOptions);
  } catch (err: any) {
    lastError = err;
  }

  // 2. If 404 or failed, fallback to /api/search.php for shared hosting without rewrite
  if (!response || response.status === 404) {
    try {
      const phpEndpoints = ["/api/search.php", "api/search.php"];
      for (const ep of phpEndpoints) {
        const phpRes = await fetch(ep, requestOptions);
        if (phpRes.ok || phpRes.status !== 404) {
          response = phpRes;
          break;
        }
      }
    } catch (err: any) {
      if (!lastError) lastError = err;
    }
  }

  if (!response) {
    throw lastError || new Error("Unable to reach search API server.");
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.details || errData.error || `Request failed with status ${response.status}`);
  }

  const data: ProductsResponse = await response.json();
  return data;
}
