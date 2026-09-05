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
  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productName,
        language,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.details || errData.error || `Request failed with status ${response.status}`);
    }

    const data: ProductsResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error fetching alternatives:", error?.message || error);
    throw error;
  }
}
