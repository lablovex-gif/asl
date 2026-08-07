/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, memo } from "react";
import { 
  ShoppingBag, 
  Globe, 
  Menu, 
  Search, 
  Mail, 
  Phone, 
  Info, 
  Languages, 
  ExternalLink,
  Loader2,
  ChevronLeft,
  Instagram,
  LayoutDashboard,
  Users,
  MousePointerClick,
  TrendingUp,
  History,
  Trash2,
  ShoppingCart,
  Store,
  Package,
  Tag,
  Sparkles,
  Share2,
  Moon, 
  Sun, 
  Pin, 
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getProductAlternatives, ProductAlternative, ProductsResponse } from "./services/geminiService";
import { motion, AnimatePresence } from "motion/react";
import { installTranslations } from "./lib/installTranslations";

const RedditIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
  >
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

const loadingMessages: Record<string, string[]> = {
  "العربية": [
    "جاري البحث عن أفضل البدائل...",
    "نجهّز أفضل الخيارات...",
    "لحظات وستجد ما يناسبك...",
    "نبحث بين مختلف المتاجر...",
    "الذكاء الاصطناعي يحلل النتائج...",
    "نبحث عن أفضل العروض والخصومات..."
  ],
  "English": [
    "Searching for the best alternatives...",
    "Preparing the best options...",
    "Just a moment, finding what suits you...",
    "Searching across various stores...",
    "AI is analyzing the results...",
    "Searching for the best deals and discounts..."
  ],
  "हिन्दी": [
    "सर्वोत्तम विकल्पों की खोज की जा रही है...",
    "सर्वोत्तम विकल्प तैयार किए जा रहे हैं...",
    "बस एक क्षण, आपके लिए सही विकल्प ढूंढ रहे हैं...",
    "विभिन्न स्टोरों में खोज की जा रही है...",
    "एआई परिणामों का विश्लेषण कर रहा है...",
    "सर्वोत्तम सौदों और छूटों की खोज की जा रही है..."
  ],
  "中文 (普通话)": [
    "正在寻找最佳替代品...",
    "正在准备最佳选择...",
    "请稍等，正在为您寻找合适的商品...",
    "正在各大商店中搜寻...",
    "人工智能正在分析结果...",
    "正在寻找最佳优惠和折扣..."
  ],
  "Español": [
    "Buscando las mejores alternativas...",
    "Preparando las mejores opciones...",
    "Solo un momento, encontrando lo que mejor se adapte a ti...",
    "Buscando en varias tiendas...",
    "La IA está analizando los resultados...",
    "Buscando las mejores ofertas y descuentos..."
  ],
  "Français": [
    "Recherche des meilleures alternatives...",
    "Préparation des meilleures options...",
    "Un instant, nous trouvons ce qui vous convient...",
    "Recherche dans différents magasins...",
    "L'IA analyse les résultats...",
    "Recherche des meilleures offres et réductions..."
  ],
  "Português": [
    "Procurando as melhores alternativas...",
    "Preparando as melhores opções...",
    "Só um momento, encontrando o que melhor se adapta a você...",
    "Pesquisando em várias lojas...",
    "A IA está analisando os resultados...",
    "Procurando as melhores ofertas e descontos..."
  ],
  "Deutsch": [
    "Suche nach den besten Alternativen...",
    "Die besten Optionen werden vorbereitet...",
    "Einen Moment, wir finden das Richtige für Sie...",
    "Suche in verschiedenen Geschäften...",
    "KI analysiert die Ergebnisse...",
    "Suche nach den besten Angeboten und Rabatten..."
  ],
  "日本語": [
    "最適な代替品を検索中...",
    "最適な選択肢を準備中...",
    "少々お待ちください。あなたにぴったりのものをお探ししています...",
    "さまざまな店舗から検索中...",
    "AIが結果を分析中...",
    "最高のセールや割引を検索中..."
  ],
  "Русский": [
    "Поиск лучших альтернатив...",
    "Подготовка лучших вариантов...",
    "Один момент, подбираем подходящее для вас...",
    "Ищем по разным магазинам...",
    "ИИ анализирует результаты...",
    "Ищем лучшие предложения и скидки..."
  ],
  "اردو": [
    "بہترین متبادل تلاش کیے جا رہے ہیں...",
    "بہترین اختیارات تیار کیے جا رہے ہیں...",
    "بس ایک لمحہ، آپ کے لیے موزوں ترین چیز تلاش کر رہے ہیں...",
    "مختلف اسٹورز میں تلاش کیا جا رہا ہے...",
    "مصنوعی ذہانت نتائج کا تجزیہ کر رہی ہے...",
    "بہترین ڈیلز اور ڈسکاؤنٹس تلاش کیے جا رہے ہیں..."
  ],
  "Türkçe": [
    "En iyi alternatifler aranıyor...",
    "En iyi seçenekler hazırlanıyor...",
    "Birazdan size en uygun olanı bulacağız...",
    "Çeşitli mağazalarda aranıyor...",
    "Yapay zeka sonuçları analiz ediyor...",
    "En iyi kampanya ve indirimler aranıyor..."
  ],
  "Italiano": [
    "Ricerca delle migliori alternative...",
    "Preparazione delle migliori opzioni...",
    "Un attimo, stiamo trovando quello che fa per te...",
    "Ricerca in vari negozi...",
    "L'IA sta analizzando i risultati...",
    "Ricerca delle migliori offerte e sconti..."
  ],
  "한국어": [
    "최고의 대안을 찾는 중...",
    "최상의 옵션을 준비하는 중...",
    "잠시만 기다려 주세요. 귀하에게 맞는 최적의 제품을 찾는 중입니다...",
    "다양한 매장에서 검색 중...",
    "AI가 결과를 분석하는 중...",
    "최고의 딜과 할인 혜택을 찾는 중..."
  ],
  "فارسی": [
    "در حال جستجو برای بهترین جایگزین‌ها...",
    "آماده‌سازی بهترین گزینه‌ها...",
    "لحظاتی دیگر، آنچه مناسب شماست را پیدا می‌کنیم...",
    "در حال جستجو در میان فروشگاه‌های مختلف...",
    "هوش مصنوعی در حال تحلیل نتایج است...",
    "در حال جستجو برای بهترین پیشنهادها و تخفیف‌ها..."
  ]
};

const translations: any = {
  "العربية": {
    searchHistory: "سجل البحث", clearHistory: "مسح السجل", emptyHistory: "السجل فارغ",
    dashboard: "لوحة التحكم",
    dir: "rtl",
    welcome: "كيف يمكنني مساعدتك اليوم؟",
    description: "أدخل اسم أي منتج أو شارك رابطه وسأبحث لك عن أفضل البدائل المتاحة بأقل الأسعار.",
    placeholder: "اكتب اسم المنتج أو الصق رابطاً هنا...",
    search: "ابحث",
    searching: "جاري البحث عن أفضل البدائل...",
    generatingResponse: "جاري توليد الرد...",
    install: "تثبيت الموقع",
    installDesc: "أضف الموقع إلى شاشتك الرئيسية للتوفير عند التسوق",
    menu: "القائمة",
    contact: "طرق التواصل",
    shareWebsite: "مشاركة الموقع",
    changeLang: "تغيير اللغة",
    about: "تعريف بالموقع",
    back: "العودة للقائمة الرئيسية",
    support: "الدعم",
    chooseLang: "اختر اللغة",
    aboutTitle: "عن pezeex",
    aboutContent: "pezeex هو مساعدك الذكي للبحث عن أفضل البدائل للمنتجات بأسعار تنافسية. نحن نستخدم تقنيات الذكاء الاصطناعي المتقدمة لمساعدتك في اتخاذ قرارات شراء ذكية وتوفير المال من خلال اقتراح منتجات مشابهة وبدائل أرخص من مختلف المتاجر العالمية.",
    instagram: "انستقرام", reddit: "ريديت",
    email: "البريد الإلكتروني",
    similarity: "تشابه",
    viewProduct: "عرض المنتج",
    aiDisclaimer: "قد يخطئ الذكاء الاصطناعي أحياناً، يرجى التحقق من الأسعار والشحن قبل الشراء",
    aiSuggestions: "pezeex",
    noResults: "لم نجد بدائل لهذا المنتج حالياً، جرب البحث عن شيء آخر.",
    temuOffers: "عروض تيمو المميزة",
    copied: "تم نسخ كلمة البحث! الصقها في الموقع",
    checkPrice: "تحقق من السعر في بلدك",
    iosInstall: "للتثبيت على iPhone",
    iosStep1: "اضغط على زر المشاركة",
    iosStep2: "اختر 'إضافة إلى الصفحة الرئيسية'",
    iosSafariTip: "ملاحظة: إذا لم تجد الخيار، يرجى فتح الموقع عبر متصفح سفاري (Safari).",
    introTitle: "وفّر آلاف الدولارات سنوياً مع pezeex!",
    introDesc: "مرحباً بك في pezeex! نحن نساعدك في البحث عن بدائل حقيقية وأرخص لأي منتج تريده باستخدام الذكاء الاصطناعي، لتتفادى الأسعار المبالغ فيها وتوفر آلاف الدولارات سنوياً عند التسوق.",
    introOk: "حسناً، فهمت",
    introDontShow: "لا تظهر هذه الرسالة مرة أخرى"
  },
  "English": {
    searchHistory: "Search History", clearHistory: "Clear History", emptyHistory: "History is empty",
    dashboard: "Dashboard",
    dir: "ltr",
    welcome: "How can I help you today?",
    description: "Enter any product name or share its link, and I'll find the best alternatives at the lowest prices.",
    placeholder: "Type product name or paste a link here...",
    search: "Search",
    searching: "Searching for the best alternatives...",
    generatingResponse: "Generating response...",
    install: "Install App",
    installDesc: "Add to home screen to save money when shopping",
    menu: "Menu",
    contact: "Contact Us",
    shareWebsite: "Share Website",
    changeLang: "Change Language",
    about: "About Us",
    back: "Back to Main Menu",
    support: "Support",
    chooseLang: "Choose Language",
    aboutTitle: "About pezeex",
    aboutContent: "pezeex is your smart assistant for finding the best product alternatives at competitive prices. We use advanced AI technologies to help you make smart purchasing decisions and save money by suggesting similar products and cheaper alternatives from various global stores.",
    instagram: "Instagram", reddit: "Reddit",
    email: "Email",
    similarity: "Similarity",
    viewProduct: "View Product",
    aiDisclaimer: "AI may make mistakes, please verify prices and links before purchasing.",
    aiSuggestions: "pezeex",
    noResults: "No alternatives found for this product, try searching for something else.",
    checkPrice: "Check local price",
    iosInstall: "Install on iPhone",
    iosStep1: "Tap the Share button",
    iosStep2: "Select 'Add to Home Screen'",
    iosSafariTip: "Note: If you don't see this option, please open the website in the Safari browser.",
    introTitle: "Save Thousands of Dollars Annually with pezeex!",
    introDesc: "Welcome to pezeex! We help you search for real and cheaper alternatives to any product using artificial intelligence, avoiding overpricing and saving you thousands of dollars annually while shopping.",
    introOk: "Okay, I got it",
    introDontShow: "Do not show this message again"
  },
  "हिन्दी": {
    searchHistory: "खोज इतिहास", clearHistory: "इतिहास मिटाएं", emptyHistory: "इतिहास खाली है",
    dashboard: "डैशबोर्ड",
    dir: "ltr",
    welcome: "आज मैं आपकी क्या मदद कर सकता हूँ?",
    description: "किसी भी उत्पाद का नाम दर्ज करें और मैं सबसे कम कीमतों पर सर्वोत्तम विकल्प ढूंढूँगा।",
    placeholder: "उत्पाद का नाम यहाँ लिखें...",
    search: "खोजें",
    searching: "सर्वोत्तम विकल्पों की खोज की जा रही है...",
    generatingResponse: "जवाब तैयार किया जा रहा है...",
    menu: "मेनू",
    contact: "संपर्क करें",
    shareWebsite: "वेबसाइट साझा करें",
    changeLang: "भाषा बदलें",
    about: "हमारे बारे में",
    back: "मुख्य मेनू पर वापस जाएँ",
    support: "समर्थन",
    chooseLang: "भाषा चुनें",
    aboutTitle: "pezeex के बारे में",
    aboutContent: "pezeex प्रतिस्पर्धी कीमतों पर सर्वोत्तम उत्पाद विकल्प खोजने के लिए आपका स्मार्ट सहायक है। हम आपको स्मार्ट खरीदारी निर्णय लेने में मदद करने के लिए उन्नत AI तकनीकों का उपयोग करते हैं और विभिन्न वैश्विक स्टोरों से समान उत्पादों और सस्ते विकल्पों का सुझाव देकर पैसे बचाते हैं।",
    instagram: "इंस्टाग्राम", reddit: "रेडिट",
    email: "ईमेल",
    similarity: "समानता",
    viewProduct: "उत्पाद देखें",
    aiDisclaimer: "AI गलतियाँ कर सकता है, कृपया खरीदने से पहले कीमतों और लिंक की पुष्टि करें।",
    aiSuggestions: "pezeex स्मार्ट सुझाव",
    noResults: "इस उत्पाद के लिए कोई विकल्प नहीं मिला, कुछ और खोजने का प्रयास करें।",
    install: "ऐप इंस्टॉल करें",
    installDesc: "खरीदारी करते समय पैसे बचाने के लिए होम स्क्रीन पर जोड़ें",
    introTitle: "pezeex के साथ सालाना हजारों डॉलर बचाएं!",
    introDesc: "pezeex में आपका स्वागत है! हम कृत्रिम बुद्धिमत्ता का उपयोग करके किसी भी उत्पाद के लिए वास्तविक और सस्ते विकल्प खोजने में आपकी सहायता करते हैं, ताकि आप अधिक कीमत चुकाने से बच सकें और खरीदारी करते समय सालाना हजारों डॉलर बचा सकें।",
    introOk: "ठीक है, मैं समझ गया",
    introDontShow: "यह संदेश दोबारा न दिखाएं"
  },
  "中文 (普通话)": {
    dir: "ltr",
    welcome: "今天我能为您提供什么帮助？",
    description: "输入任何产品名称，我将以最低的价格找到最佳替代品。",
    placeholder: "在此输入产品名称...",
    search: "搜索",
    searching: "正在寻找最佳替代品...",
    generatingResponse: "正在生成回复...",
    menu: "菜单",
    contact: "联系我们",
    shareWebsite: "分享网站",
    changeLang: "更改语言",
    about: "关于我们",
    support: "支持",
    chooseLang: "选择语言",
    aboutTitle: "关于 pezeex",
    aboutContent: "pezeex 是您的智能助手，可以以有竞争力的价格找到最佳的产品替代品。我们使用先进的人工智能技术帮助您做出明智的购买决定，并通过建议来自全球各地的类似产品和更便宜的替代品来节省资金。",
    instagram: "Instagram", reddit: "Reddit",
    email: "电子邮件",
    similarity: "相似度",
    viewProduct: "查看产品",
    aiDisclaimer: "AI 可能会犯错，请在购买前核实价格和链接。",
    aiSuggestions: "pezeex",
    noResults: "未找到该产品的替代品，请尝试搜索其他内容。",
    install: "安装应用",
    installDesc: "添加到主屏幕，在购物时节省资金",
    introTitle: "使用 pezeex 每年节省数千美元！",
    introDesc: "欢迎来到 pezeex！我们利用人工智能帮助您搜索任何产品的真实和更便宜的替代品，避免高价，并在购物时每年为您节省数千美元。",
    introOk: "好的，我知道了",
    introDontShow: "不再显示此消息"
  },
  "Español": {
    searchHistory: "Historial de búsqueda", clearHistory: "Borrar historial", emptyHistory: "El historial está vacío",
    dashboard: "Panel de control",
    dir: "ltr",
    welcome: "¿Cómo puedo ayudarte hoy?",
    description: "Ingresa el nombre de cualquier producto y encontraré las mejores alternativas a los precios más bajos.",
    placeholder: "Escribe el nombre del producto aquí...",
    search: "Buscar",
    searching: "Buscando las mejores alternativas...",
    generatingResponse: "Generando respuesta...",
    menu: "Menú",
    contact: "Contáctanos",
    shareWebsite: "Compartir sitio web",
    changeLang: "Cambiar idioma",
    about: "Sobre nosotros",
    support: "Soporte",
    chooseLang: "Elegir idioma",
    aboutTitle: "Sobre pezeex",
    aboutContent: "pezeex es su asistente inteligente para encontrar las mejores alternativas de productos a precios competitivos. Utilizamos tecnologías avanzadas de IA para ayudarle a tomar decisiones de compra inteligentes y ahorrar dinero sugiriendo productos similares y alternativas más baratas de varias tiendas globales.",
    instagram: "Instagram", reddit: "Reddit",
    email: "Correo electrónico",
    similarity: "Similitud",
    viewProduct: "Ver producto",
    aiDisclaimer: "La IA puede cometer errores, verifica los precios y enlaces antes de comprar.",
    aiSuggestions: "pezeex",
    noResults: "No se encontraron alternativas para este producto, intenta buscar otra cosa.",
    install: "Instalar aplicación",
    installDesc: "Añadir a la pantalla de inicio para ahorrar al comprar",
    introTitle: "¡Ahorre miles de dólares anualmente con pezeex!",
    introDesc: "¡Bienvenido a pezeex! Le ayudamos a buscar alternativas reales y más baratas para cualquier producto utilizando inteligencia artificial, evitando sobreprecios y ahorrándole miles de dólares anuales mientras compra.",
    introOk: "De acuerdo, lo entiendo",
    introDontShow: "No volver a mostrar este mensaje"
  },
  "Français": {
    searchHistory: "Historique de recherche", clearHistory: "Effacer l'historique", emptyHistory: "L'historique est vide",
    dashboard: "Tableau de bord",
    dir: "ltr",
    welcome: "Comment puis-je vous aider aujourd'hui ?",
    description: "Entrez le nombre de n'importe quel produit et je trouverai les meilleures alternatives aux prix les plus bas.",
    placeholder: "Tapez le nom du produit ici...",
    search: "Rechercher",
    searching: "Recherche des meilleures alternatives...",
    generatingResponse: "Génération de la réponse...",
    menu: "Menu",
    contact: "Contactez-nous",
    shareWebsite: "Partager le site",
    changeLang: "Changer de langue",
    about: "À propos de nous",
    support: "Support",
    chooseLang: "Choisir la langue",
    aboutTitle: "À propos de pezeex",
    aboutContent: "pezeex est votre assistant intelligent pour trouver les meilleures alternatives de produits à des prix compétitifs. Nous utilisons des technologies d'IA avancées pour vous aider à prendre des décisions d'achat intelligentes et à économiser de l'argent en suggérant des produits similaires et des alternatives moins chères provenant de divers magasins mondiaux.",
    instagram: "Instagram", reddit: "Reddit",
    email: "E-mail",
    similarity: "Similitude",
    viewProduct: "Voir le produit",
    aiDisclaimer: "L'IA peut faire des erreurs, veuillez vérifier les prix et les liens avant d'acheter.",
    aiSuggestions: "pezeex",
    noResults: "Aucune alternative trouvée pour ce produit, essayez de rechercher autre chose.",
    temuOffers: "Offres spéciales Temu",
    install: "Installer l'application",
    installDesc: "Ajouter à l'écran d'accueil pour économiser lors de vos achats",
    introTitle: "Économisez des milliers de dollars par an avec pezeex !",
    introDesc: "Bienvenue sur pezeex ! Nous vous aidons à rechercher des alternatives réelles et moins chères à tout produit en utilisant l'intelligence artificielle, évitant ainsi les prix excessifs et vous faisant économiser des milliers de dollars chaque année lors de vos achats.",
    introOk: "D'accord, j'ai compris",
    introDontShow: "Ne plus afficher ce message"
  },
  "Português": {
    searchHistory: "Histórico de pesquisa", clearHistory: "Limpar histórico", emptyHistory: "O histórico está vazio",
    dashboard: "Painel de controle",
    dir: "ltr",
    welcome: "Como posso ajudar você hoje?",
    description: "Insira o nome de qualquer produto e encontrarei as melhores alternativas aos preços mais baixos.",
    placeholder: "Digite o nome do produto aqui...",
    search: "Buscar",
    searching: "Procurando as melhores alternativas...",
    generatingResponse: "Gerando resposta...",
    menu: "Menu",
    contact: "Contate-nos",
    shareWebsite: "Compartilhar site",
    changeLang: "Alterar idioma",
    about: "Sobre nós",
    support: "Suporte",
    chooseLang: "Escolher idioma",
    aboutTitle: "Sobre o pezeex",
    aboutContent: "pezeex é o seu assistente inteligente para encontrar as melhores alternativas de produtos a preços competitivos. Utilizamos tecnologias avançadas de IA para ajudá-lo a tomar decisões de compra inteligentes e economizar dinheiro, sugerindo produtos semelhantes e alternativas mais baratas de várias lojas globais.",
    instagram: "Instagram", reddit: "Reddit",
    email: "E-mail",
    similarity: "Semelhança",
    viewProduct: "Ver produto",
    aiDisclaimer: "A IA pode cometer erros, verifique preços e links antes de comprar.",
    aiSuggestions: "pezeex",
    noResults: "Nenhuma alternativa encontrada para este produto, tente pesquisar outra coisa.",
    temuOffers: "Ofertas especiais Temu",
    install: "Instalar aplicativo",
    installDesc: "Adicione à tela inicial para economizar ao fazer compras",
    introTitle: "Economize milhares de dólares anualmente com o pezeex!",
    introDesc: "Bem-vindo ao pezeex! Nós ajudamos você a pesquisar alternativas reais e mais baratas para qualquer produto usando inteligência artificial, evitando preços abusivos e economizando milhares de dólares por ano em suas compras.",
    introOk: "Ok, entendi",
    introDontShow: "Não mostrar esta mensagem novamente"
  },
  "Deutsch": {
    searchHistory: "Suchverlauf", clearHistory: "Verlauf löschen", emptyHistory: "Verlauf ist leer",
    dashboard: "Dashboard",
    dir: "ltr",
    welcome: "Wie kann ich Ihnen heute helfen?",
    description: "Geben Sie einen Produktnamen ein und ich finde die besten Alternativen zu den niedrigsten Preisen.",
    placeholder: "Produktnamen hier eingeben...",
    search: "Suche",
    searching: "Suche nach den besten Alternativen...",
    generatingResponse: "Antwort wird generiert...",
    menu: "Menü",
    contact: "Kontaktieren Sie uns",
    shareWebsite: "Webseite teilen",
    changeLang: "Sprache ändern",
    about: "Über uns",
    support: "Unterstützung",
    chooseLang: "Sprache wählen",
    aboutTitle: "Über pezeex",
    aboutContent: "pezeex ist Ihr intelligenter Assistent, um die besten Produktalternativen zu wettbewerbsfähigen Preisen zu finden. Wir nutzen fortschrittliche KI-Technologien, um Ihnen zu helfen, kluge Kaufentscheidungen zu treffen und Geld zu sparen, indem wir ähnliche Produkte und günstigere Alternativen aus verschiedenen globalen Geschäften vorschlagen.",
    instagram: "Instagram", reddit: "Reddit",
    email: "E-Mail",
    similarity: "Ähnlichkeit",
    viewProduct: "Produkt ansehen",
    aiDisclaimer: "KI kann Fehler machen, bitte prüfen Sie Preise und Links vor dem Kauf.",
    aiSuggestions: "pezeex",
    noResults: "Keine Alternativen für dieses Produkt gefunden, versuchen Sie es mit einer anderen Suche.",
    temuOffers: "Temu Sonderangebote",
    install: "App installieren",
    installDesc: "Zum Startbildschirm hinzufügen, um beim Einkaufen Geld zu sparen",
    introTitle: "Sparen Sie jährlich Tausende von Dollar mit pezeex!",
    introDesc: "Willkommen bei pezeex! Wir helfen Ihnen, mithilfe von künstlicher Intelligenz nach echten und günstigeren Alternativen für jedes Produkt zu suchen. So vermeiden Sie überhöhte Preise und sparen beim Einkaufen jährlich Tausende von Dollar.",
    introOk: "Okay, ich habe verstanden",
    introDontShow: "Diese Nachricht nicht mehr anzeigen"
  },
  "日本語": {
    searchHistory: "検索履歴", clearHistory: "履歴をクリア", emptyHistory: "履歴は空です",
    dashboard: "ダッシュボード",
    dir: "ltr",
    welcome: "今日はどのようなお手伝いができますか？",
    description: "製品名を入力してください。最低価格で最高の代替品を見つけます。",
    placeholder: "製品名をここに入力...",
    search: "検索",
    searching: "最適な代替品を検索中...",
    generatingResponse: "応答を生成中...",
    menu: "メニュー",
    contact: "お問い合わせ",
    shareWebsite: "ウェブサイトを共有",
    changeLang: "言語を変更",
    about: "私たちについて",
    support: "サポート",
    chooseLang: "言語を選択",
    aboutTitle: "pezeexについて",
    aboutContent: "pezeexは、競争力のある価格で最高の製品代替品を見つけるためのスマートアシスタントです。高度なAI技術を使用して、スマートな購入決定を支援し、世界中のさまざまな店舗から類似製品やより安い代替品を提案することで節約をサポートします。",
    instagram: "Instagram", reddit: "Reddit",
    email: "メール",
    similarity: "類似度",
    viewProduct: "製品を見る",
    aiDisclaimer: "AIは間違いを犯す可能性があります。購入前に価格とリンクを確認してください。",
    aiSuggestions: "pezeex",
    noResults: "この製品の代替品は見つかりませんでした。別のキーワードで検索してください。",
    install: "アプリをインストール",
    installDesc: "ホーム画面に追加して、ショッピング中にお得に節約",
    introTitle: "pezeexで年間数千ドルを節約しましょう！",
    introDesc: "pezeexへようこそ！私たちは人工知能を使用して、あらゆる製品の真の、より安価な代替品を検索するお手伝いをします。価格の高騰を避け、買い物中に年間数千ドルを節約できます。",
    introOk: "はい、わかりました",
    introDontShow: "このメッセージを再度表示しない"
  },
  "Русский": {
    searchHistory: "История поиска", clearHistory: "Очистить историю", emptyHistory: "История пуста",
    dashboard: "Панель управления",
    dir: "ltr",
    welcome: "Чем я могу помочь вам сегодня?",
    description: "Введите название любого товара, и я найду лучшие альтернативы по самым низким ценам.",
    placeholder: "Введите название товара здесь...",
    search: "Поиск",
    searching: "Поиск лучших альтернатив...",
    generatingResponse: "Создание ответа...",
    menu: "Меню",
    contact: "Связаться с нами",
    shareWebsite: "Поделиться сайтом",
    changeLang: "Изменить язык",
    about: "О нас",
    support: "Поддержка",
    chooseLang: "Выберите язык",
    aboutTitle: "О pezeex",
    aboutContent: "pezeex — ваш умный помощник для поиска лучших альтернатив товарам по конкурентоспособным ценам. Мы используем передовые технологии ИИ, чтобы помочь вам принимать взвешенные решения о покупке и экономить деньги, предлагая похожие товары и более дешевые альтернативы из различных мировых магазинов.",
    instagram: "Instagram", reddit: "Reddit",
    email: "Электронная почта",
    similarity: "Сходство",
    viewProduct: "Посмотреть товар",
    aiDisclaimer: "ИИ может совершать ошибки, пожалуйста, проверяйте цены и ссылки перед покупкой.",
    aiSuggestions: "pezeex",
    noResults: "Альтернатив для этого товара не найдено, попробуйте поискать что-то другое.",
    temuOffers: "Специальные предложения Temu",
    install: "Установить приложение",
    installDesc: "Добавьте на главный экран, чтобы экономить при покупках",
    introTitle: "Экономьте тысячи долларов в год с pezeex!",
    introDesc: "Добро пожаловать в pezeex! Мы помогаем вам искать реальные и более дешевые альтернативы любому товару с помощью искусственного интеллекта, избегая завышенных цен и экономя вам тысячи долларов в год на покупках.",
    introOk: "Хорошо, понятно",
    introDontShow: "Больше не показывать это сообщение"
  },
  "اردو": {
    searchHistory: "تلاش کی تاریخ", clearHistory: "تاریخ صاف کریں", emptyHistory: "تاریخ خالی ہے",
    dashboard: "ڈیش بورڈ",
    dir: "rtl",
    welcome: "آج میں آپ کی کیا مدد کر سکتا ہوں؟",
    description: "کسی بھی پروڈکٹ کا نام درج کریں اور میں سب سے کم قیمت پر بہترین متبادل تلاش کروں گا۔",
    placeholder: "پروڈکٹ کا نام یہاں لکھیں...",
    search: "تلاش کریں",
    searching: "بہترین متبادل تلاش کیے جا رہے ہیں...",
    generatingResponse: "جواب تیار کیا جا رہا ہے...",
    menu: "مینو",
    contact: "ہم سے رابطہ کریں",
    shareWebsite: "ویب سائٹ شیئر کریں",
    changeLang: "زبان تبدیل کریں",
    about: "ہمارے بارے میں",
    support: "سپورٹ",
    chooseLang: "زبان منتخب کریں",
    aboutTitle: "pezeex کے بارے میں",
    aboutContent: "pezeex مسابقتی قیمتوں پر بہترین پروڈکٹ کے متبادل تلاش کرنے کے لیے آپ کا سمارٹ اسسٹنٹ ہے۔ ہم آپ کو خریداری کے سمارٹ فیصلے کرنے میں مدد کرنے کے لیے جدید AI ٹیکنالوجیز کا استعمال کرتے ہیں اور مختلف عالمی اسٹورز سے ملتی جلتی مصنوعات اور سستے متبادل تجویز کر کے پیسے بچاتے ہیں۔",
    instagram: "انسٹاگرام", reddit: "ریڈٹ",
    email: "ای میل",
    similarity: "مشابہت",
    viewProduct: "پروڈکٹ دیکھیں",
    aiDisclaimer: "AI غلطیاں کر سکتا ہے، براہ کرم خریدنے سے پہلے قیمتوں اور لنکس کی تصدیق کریں۔",
    aiSuggestions: "pezeex",
    noResults: "اس پروڈکٹ کے لیے کوئی متبادل نہیں ملا، کچھ اور تلاش کرنے کی کوشش کریں۔",
    install: "ایپ انسٹال کریں",
    installDesc: "خریداری کے دوران پیسے بچانے کے لیے ہوم اسکرین پر شامل کریں",
    introTitle: "pezeex کے ساتھ سالانہ ہزاروں ڈالر بچائیں!",
    introDesc: "pezeex میں خوش آمدید! ہم مصنوعی ذہانت کا استعمال کرتے ہوئے کسی بھی پروڈکٹ کے حقیقی اور سستے متبادل تلاش کرنے میں آپ کی مدد کرتے ہیں، تاکہ آپ زائد قیمتوں سے بچ سکیں اور خریداری کرتے وقت سالانہ ہزاروں ڈالر بچا سکیں۔",
    introOk: "ٹھیک ہے، میں سمجھ گیا",
    introDontShow: "یہ پیغام دوبارہ نہ دکھائیں"
  },
  "Türkçe": {
    searchHistory: "Arama Geçmişi", clearHistory: "Geçmişi Temizle", emptyHistory: "Geçmiş boş",
    dashboard: "Kontrol Paneli",
    dir: "ltr",
    welcome: "Bugün size nasıl yardımcı olabilirim?",
    description: "Herhangi bir ürün adı girin, en düşük fiyatlarla en iyi alternatifleri bulayım.",
    placeholder: "Ürün adını buraya yazın...",
    search: "Ara",
    searching: "En iyi alternatifler aranıyor...",
    generatingResponse: "Yanıt oluşturuluyor...",
    menu: "Menü",
    contact: "Bize Ulaşın",
    shareWebsite: "Web Sitesini Paylaş",
    changeLang: "Dili Değiştir",
    about: "Hakkımızda",
    support: "Destek",
    chooseLang: "Dil Seçin",
    aboutTitle: "pezeex Hakkında",
    aboutContent: "pezeex, rekabetçi fiyatlarla en iyi ürün alternatiflerini bulmanız için akıllı asistanınızdır. Akıllı satın alma kararları vermenize yardımcı olmak ve çeşitli küresel mağazalardan benzer ürünler ve daha ucuz alternatifler önererek tasarruf etmenizi sağlamak için gelişmiş yapay zeka teknolojilerini kullanıyoruz.",
    instagram: "Instagram", reddit: "Reddit",
    email: "E-posta",
    similarity: "Benzerlik",
    viewProduct: "Ürünü Görüntüle",
    aiDisclaimer: "Yapay zeka hata yapabilir, lütfen satın almadan önce fiyatları ve bağlantıları doğrulayın.",
    aiSuggestions: "pezeex",
    noResults: "Bu ürün için alternatif bulunamadı, başka bir şey aramayı deneyin.",
    temuOffers: "Temu Özel Teklifleri",
    install: "Uygulamayı Yükle",
    installDesc: "Alışveriş yaparken tasarruf etmek için ana ekrana ekleyin",
    introTitle: "pezeex ile her yıl binlerce dolar tasarruf edin!",
    introDesc: "pezeex'e hoş geldiniz! Alışveriş yaparken aşırı fiyatlardan kaçınmanıza ve her yıl binlerce dolar tasarruf etmenize yardımcı olarak, yapay zeka kullanarak herhangi bir ürün için gerçek ve daha ucuz alternatifler aramanıza yardımcı oluyoruz.",
    introOk: "Tamam, anladım",
    introDontShow: "Bu mesajı tekrar gösterme"
  },
  "Italiano": {
    searchHistory: "Cronologia ricerche", clearHistory: "Cancella cronologia", emptyHistory: "La cronologia è vuota",
    dashboard: "Pannello di controllo",
    dir: "ltr",
    welcome: "Come posso aiutarti oggi?",
    description: "Inserisci il nome di qualsiasi prodotto e troverò le migliori alternative ai prezzi più bassi.",
    placeholder: "Digita il nome del prodotto qui...",
    search: "Cerca",
    searching: "Ricerca delle migliori alternative...",
    generatingResponse: "Generazione della risposta...",
    menu: "Menu",
    contact: "Contattaci",
    shareWebsite: "Condividi sito",
    changeLang: "Cambia lingua",
    about: "Chi siamo",
    support: "Supporto",
    chooseLang: "Scegli la lingua",
    aboutTitle: "Informazioni su pezeex",
    aboutContent: "pezeex è il tuo assistente intelligente per trovare le migliori alternative ai prodotti a prezzi competitivi. Utilizziamo tecnologie avanzate di intelligenza artificiale per aiutarti a prendere decisioni d'acquisto intelligenti e risparmiare denaro suggerendo prodotti simili e alternative più economiche da vari negozi globali.",
    instagram: "Instagram", reddit: "Reddit",
    email: "E-mail",
    similarity: "Somiglianza",
    viewProduct: "Visualizza prodotto",
    aiDisclaimer: "L'IA può commettere errori, verifica prezzi e link prima dell'acquisto.",
    aiSuggestions: "pezeex",
    noResults: "Nessuna alternativa trovata per questo prodotto, prova a cercare qualcos'altro.",
    temuOffers: "Offerte speciali Temu",
    install: "Installa app",
    installDesc: "Aggiungi alla schermata iniziale per risparmiare sugli acquisti",
    introTitle: "Risparmia migliaia di dollari all'anno con pezeex!",
    introDesc: "Benvenuto in pezeex! Ti aiutiamo a cercare alternative reali e più economiche per qualsiasi prodotto utilizzando l'intelligenza artificiale, evitando sovrapprezzi e facendoti risparmiare migliaia di dollari all'anno durante i tuoi acquisti.",
    introOk: "Ok, ho capito",
    introDontShow: "Non mostrare più questo messaggio"
  },
  "한국어": {
    searchHistory: "검색 기록", clearHistory: "기록 지우기", emptyHistory: "기록이 비어 있습니다",
    dashboard: "대시보드",
    dir: "ltr",
    welcome: "오늘은 무엇을 도와드릴까요?",
    description: "제품 이름을 입력하시면 최저가로 최고의 대안을 찾아드립니다.",
    placeholder: "여기에 제품 이름 입력...",
    search: "검색",
    searching: "최고의 대안을 찾는 중...",
    generatingResponse: "답변을 생성하는 중...",
    menu: "메뉴",
    contact: "문의하기",
    shareWebsite: "웹사이트 공유",
    changeLang: "언어 변경",
    about: "소개",
    support: "지원",
    chooseLang: "언어 선택",
    aboutTitle: "pezeex 소개",
    aboutContent: "pezeex는 경쟁력 있는 가격으로 최고의 제품 대안을 찾을 수 있는 스마트 어시스턴트입니다. 당사는 고급 AI 기술을 사용하여 스마트한 구매 결정을 내릴 수 있도록 돕고 전 세계 다양한 매장에서 유사한 제품과 더 저렴한 대안을 제안하여 비용을 절감할 수 있도록 지원합니다.",
    instagram: "인스타그램", reddit: "레딧",
    email: "이메일",
    similarity: "유사도",
    viewProduct: "제품 보기",
    aiDisclaimer: "AI는 실수를 할 수 있습니다. 구매 전 가격과 링크를 확인하세요.",
    aiSuggestions: "pezeex",
    noResults: "이 제품에 대한 대안을 찾을 수 없습니다. 다른 것을 검색해 보세요.",
    temuOffers: "Temu 특별 혜택",
    install: "앱 설치",
    installDesc: "쇼핑 시 돈을 절약하려면 홈 화면에 추가하세요",
    introTitle: "pezeex와 함께 매년 수천 달러를 절약하세요!",
    introDesc: "pezeex에 오신 것을 환영합니다! 우리는 인공 지능을 사용하여 모든 제품에 대한 진짜이고 더 저렴한 대안을 검색하도록 도와드리며, 과도한 가격을 피하고 쇼핑하는 동안 매년 수천 달러를 절약할 수 있도록 해줍니다.",
    introOk: "네, 알겠습니다",
    introDontShow: "이 메시지 다시 보지 않기"
  },
  "فارسی": {
    searchHistory: "تاریخچه جستجو", clearHistory: "پاک کردن تاریخچه", emptyHistory: "تاریخچه خالی است",
    dashboard: "داشبورد",
    dir: "rtl",
    welcome: "چطور می‌توانم امروز به شما کمک کنم؟",
    description: "نام هر محصولی را وارد کنید و من بهترین جایگزین‌ها را با کمترین قیمت برای شما پیدا می‌کنم.",
    placeholder: "نام محصول را اینجا بنویسید...",
    search: "جستجو",
    searching: "در حال جستجو برای بهترین جایگزین‌ها...",
    generatingResponse: "در حال تولید پاسخ...",
    menu: "منو",
    contact: "تماس با ما",
    shareWebsite: "اشتراک‌گذاری وب‌سایت",
    changeLang: "تغییر زبان",
    about: "درباره ما",
    back: "بازگشت به منوی اصلی",
    support: "پشتیبانی",
    chooseLang: "انتخاب زبان",
    aboutTitle: "درباره pezeex",
    aboutContent: "pezeex دستیار هوشمند شما برای یافتن بهترین جایگزین‌های محصول با قیمت‌های رقابتی است. ما از فناوری‌های پیشرفته هوش مصنوعی استفاده می‌کنیم تا به شما در تصمیم‌گیری هوشمندانه برای خرید کمک کنیم و با پیشنهاد محصولات مشابه و جایگزین‌های ارزان‌تر از فروشگاه‌های مختلف جهانی، در هزینه‌های شما صرفه‌جویی کنیم.",
    instagram: "اینستاگرام", reddit: "ردیت",
    email: "ایمیل",
    similarity: "شباهت",
    viewProduct: "مشاهده محصول",
    aiDisclaimer: "هوش مصنوعی ممکن است اشتباه کند، لطفاً قبل از خرید قیمت‌ها и لینک‌ها را بررسی کنید.",
    aiSuggestions: "پیشنهادات هوشمند pezeex",
    noResults: "هیچ جایگزینی برای این محصول یافت نشد، جستجوی دیگری را امتحان کنید.",
    temuOffers: "پیشنهادات ویژه Temu",
    install: "نصب برنامه",
    installDesc: "برای صرفه‌جویی هنگام خرید، به صفحه اصلی اضافه کنید",
    introTitle: "با pezeex سالانه هزاران دلار پس‌انداز کنید!",
    introDesc: "به pezeex خوش آمدید! ما با استفاده از هوش مصنوعی به شما کمک می‌کنیم تا جایگزین‌های واقعی و ارزان‌تر برای هر محصولی را جستجو کنید تا از قیمت‌های گزاف دوری کرده و هنگام خرید سالانه هزاران دلار پس‌انداز کنید.",
    introOk: "بسیار خب، متوجه شدم",
    introDontShow: "این پیام را دوباره نشان نده"
  }
};

const Logo = ({ className }: { className?: string }) => (
  <svg viewBox="-20 -20 340 340" className={`text-foreground shrink-0 ${className}`} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="tag-cut-logo">
        <rect x="-50" y="-50" width="400" height="400" fill="white" />
        <g transform="translate(170, 230) rotate(-10)">
          <path d="M 0 -40 L 35 -5 L 35 55 L -35 55 L -35 -5 Z" fill="black" stroke="black" strokeWidth="32" strokeLinejoin="round" />
        </g>
      </mask>
      <mask id="tag-hole-text-logo">
        <rect x="-100" y="-100" width="200" height="200" fill="white" />
        <circle cx="0" cy="-24" r="7" fill="black" />
        <text x="0" y="24" fontSize="58" fontFamily="sans-serif" fontWeight="900" fill="black" textAnchor="middle" dominantBaseline="central">$</text>
      </mask>
    </defs>
    <g mask="url(#tag-cut-logo)">
      <line x1="166" y1="166" x2="250" y2="250" stroke="currentColor" strokeWidth="36" strokeLinecap="round" />
      <circle cx="110" cy="110" r="80" fill="none" stroke="currentColor" strokeWidth="22" />
      <g fill="none" stroke="currentColor" strokeWidth="6">
        <circle cx="110" cy="110" r="52" />
        <line x1="110" y1="58" x2="110" y2="162" />
        <line x1="58" y1="110" x2="162" y2="110" />
        <ellipse cx="110" cy="110" rx="26" ry="52" />
        <ellipse cx="110" cy="110" rx="52" ry="26" />
      </g>
    </g>
    <path d="M 166 206 Q 190 190 205 205" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    <g transform="translate(170, 230) rotate(-10)">
      <path d="M 0 -40 L 35 -5 L 35 55 L -35 55 L -35 -5 Z" fill="currentColor" stroke="currentColor" strokeWidth="12" strokeLinejoin="round" mask="url(#tag-hole-text-logo)" />
    </g>
  </svg>
);

const getLocalLogo = (store: string) => {
  const s = store.toLowerCase().trim();
  
  if (s.includes('aliexpress') || s.includes('علي اكسبرس') || s.includes('علي إكسبرس')) return 'aliexpress';
  if (s.includes('alibaba') || s.includes('علي بابا')) return 'alibaba';
  if (s.includes('temu') || s.includes('تيمو')) return 'temu';
  if (s.includes('zaful') || s.includes('زافول')) return 'zaful';
  if (s.includes('shein') || s.includes('شي ان') || s.includes('شي إن')) return 'shein';
  if (s.includes('geekbuying') || s.includes('جيك باينج')) return 'geekbuying';
  if (s.includes('tvc-mall') || s.includes('tvcmall')) return 'tvcmall';
  if (s.includes('gshopper')) return 'gshopper';
  if (s.includes('myprotein') || s.includes('ماي بروتين')) return 'myprotein';
  if (s.includes('asos') || s.includes('اسوس') || s.includes('أسوس')) return 'asos';
  
  // Just clean standard domains as fallback
  const clean = s.replace(/[^a-z0-9]/g, '');
  if (clean.length > 2) return clean;
  
  return 'default';
};

const StoreLogo = memo(({ store, inline, fullFrame, className }: { store: string, inline?: boolean, fullFrame?: boolean, className?: string }) => {
  const [errorStage, setErrorStage] = useState(0); 
  // 0: Try local, 1: Try Clearbit, 2: Try Google Favicon, 3: Error
  
  const name = getLocalLogo(store);
  const isSquare = ['aliexpress', 'temu', 'myprotein', 'banggood', 'asos'].includes(name);

  // Try to infer a standard domain from the store name
  const cleanStore = store.toLowerCase().replace(/[^a-z0-9]/g, '');
  const domain = cleanStore.length > 2 ? `${cleanStore}.com` : null;

  if (errorStage === 3 || (!domain && name === 'default')) {
    if (inline) return <Store size={12} className={className} />;
    if (fullFrame) {
      return (
        <div className={`w-full h-full flex flex-col items-center justify-center text-muted-foreground opacity-60 ${className || ''}`}>
          <Store size={28} className="mb-2" />
          <span className="text-xs">{store}</span>
        </div>
      );
    }
    return null;
  }

  const getImgSrc = () => {
    if (errorStage === 0 && name !== 'default') {
      return `/logos/${name}.png`;
    }
    if (errorStage <= 1 && domain) {
      return `https://logo.clearbit.com/${domain}`;
    }
    if (errorStage <= 2 && domain) {
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    }
    return '';
  };

  const imgSrc = getImgSrc();

  if (!imgSrc) {
    if (inline) return <Store size={12} className={className} />;
    if (fullFrame) {
      return (
        <div className={`w-full h-full flex flex-col items-center justify-center text-muted-foreground opacity-60 ${className || ''}`}>
          <Store size={28} className="mb-2" />
          <span className="text-xs">{store}</span>
        </div>
      );
    }
    return null;
  }

  if (inline) {
    return (
      <img 
        src={imgSrc}
        alt={store} 
        className={`w-3.5 h-3.5 object-contain ${className || ''} ${!isSquare ? 'mix-blend-multiply dark:mix-blend-normal' : ''} dark:bg-white/90 dark:p-0.5 dark:rounded`}
        onError={() => setErrorStage(prev => prev + 1)} 
      />
    );
  }

  if (fullFrame) {
    return (
      <div className={`w-full h-full flex items-center justify-center p-3 dark:bg-white/95 dark:rounded-lg ${className || ''}`}>
        <img 
          src={imgSrc}
          alt={store} 
          className={`w-full h-full max-w-[100px] max-h-[100px] object-contain opacity-90 dark:opacity-100 ${!isSquare ? 'mix-blend-multiply dark:mix-blend-normal' : ''} transition-transform duration-300`}
          onError={() => setErrorStage(prev => prev + 1)} 
        />
      </div>
    );
  }

  return (
    <div className={`shrink-0 flex items-center justify-center w-8 h-8 dark:bg-white/95 dark:p-1 dark:rounded-md ${isSquare ? 'rounded-md overflow-hidden' : ''}`}>
      <img 
        src={imgSrc}
        alt={store} 
        className={`w-full h-full object-contain ${!isSquare ? 'mix-blend-multiply dark:mix-blend-normal' : ''} transition-transform duration-300`}
        onError={() => setErrorStage(prev => prev + 1)} 
      />
    </div>
  );
});

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isConversationalRequest, setIsConversationalRequest] = useState(false);
  const [history, setHistory] = useState<{ type: "user" | "ai"; content: string | ProductAlternative[] | ProductsResponse }[]>([]);
  const [showLanguages, setShowLanguages] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({ visitors: 1, searches: 0, clicks: 0, activeUsers: 1 });
  const [currentLang, setCurrentLang] = useState("العربية");
  const [userCountry, setUserCountry] = useState<string>('us');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showIntroDialog, setShowIntroDialog] = useState(() => {
    return localStorage.getItem('hasDismissedIntro') !== 'true';
  });
  const [isIntroFromMenu, setIsIntroFromMenu] = useState(false);

  // PWA Install states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [hasDismissedInstall, setHasDismissedInstall] = useState(() => {
    return localStorage.getItem('hasDismissedInstall') === 'true';
  });

  // Automatically update searchProgress when loading is active
  const isSearchFinishingRef = useRef(false);

  useEffect(() => {
    if (!loading) {
      setSearchProgress(0);
      isSearchFinishingRef.current = false;
      return;
    }

    setSearchProgress(0);
    isSearchFinishingRef.current = false;
    let animationFrameId: number;
    let currentProgress = 0;
    const startTime = Date.now();

    const updateProgress = () => {
      if (isSearchFinishingRef.current) {
        setSearchProgress(prev => {
          if (prev < 100) {
            // Speed up to 100% smoothly
            const next = prev + (100 - prev) * 0.18;
            return next > 99.4 ? 100 : next;
          }
          return 100;
        });
        if (loading) {
          animationFrameId = requestAnimationFrame(updateProgress);
        }
        return;
      }

      const elapsed = Date.now() - startTime;
      
      // Asymptotically approach 98%. Decelerating over time.
      // e^(-elapsed/8000) will decay smoothly, making progress approach 98% beautifully without stopping.
      const target = 98 * (1 - Math.exp(-elapsed / 8000));
      
      // Smooth linear interpolation (lerp) for micro-interactions
      currentProgress += (target - currentProgress) * 0.04;
      
      setSearchProgress(currentProgress);

      if (loading) {
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [loading]);

  useEffect(() => {
    if (!loading) {
      setMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Fetch user country via IP
  useEffect(() => {
    fetch('https://get.geojs.io/v1/ip/country.json')
      .then(res => res.json())
      .then(data => {
        if (data && data.country) {
          setUserCountry(data.country.toLowerCase());
        }
      })
      .catch(err => console.error("Error fetching country info:", err));
  }, []);

  // PWA logic
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check if device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setIsAdmin(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.setItem('pezeex_admin', 'true');
    } else if (localStorage.getItem('pezeex_admin') === 'true') {
      setIsAdmin(true);
    }

    // Visitor tracking logic (Mock/Local)
    let visitorsTotal = parseInt(localStorage.getItem('pezeex_visitors') || "1420");
    let searchesTotal = parseInt(localStorage.getItem('pezeex_searches') || "5840");
    let clicksTotal = parseInt(localStorage.getItem('pezeex_clicks') || "9230");
    
    // Simulate some live activity based on hour
    const date = new Date();
    const hour = date.getHours();
    
    visitorsTotal += Math.floor(Math.random() * 5);
    localStorage.setItem('pezeex_visitors', visitorsTotal.toString());
    
    setDashboardStats({
      visitors: visitorsTotal,
      searches: searchesTotal,
      clicks: clicksTotal,
      activeUsers: Math.max(1, Math.floor(Math.random() * 15) + (hour > 8 && hour < 22 ? 20 : 5))
    });

  }, []);
  
  const handleProductClick = (item: ProductAlternative, uniqueId: string) => {
    // Admin tracking
    setDashboardStats(prev => {
      const next = { ...prev, clicks: prev.clicks + 1 };
      localStorage.setItem('pezeex_clicks', next.clicks.toString());
      return next;
    });
  };

  const t = { ...translations[currentLang], ...(installTranslations[currentLang] || {}) };
  const activeMessages = loadingMessages[currentLang] || loadingMessages["English"];
  const displayMessage = activeMessages[messageIndex % activeMessages.length];

  const handleShareWebsite = async () => {
    const url = window.location.href;
    const shareData = {
      title: 'pezeex',
      text: t.description,
      url: url,
    };
    if (navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing', err);
      }
    } else if (navigator.share) {
      try {
        await navigator.share({ title: 'pezeex', url });
      } catch (err) {
        console.error('Error sharing', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };

  const languages = [
    { name: "English", native: "English" },
    { name: "Hindi", native: "हिन्दी" },
    { name: "Mandarin", native: "中文 (普通话)" },
    { name: "Spanish", native: "Español" },
    { name: "French", native: "Français" },
    { name: "Portuguese", native: "Português" },
    { name: "German", native: "Deutsch" },
    { name: "Japanese", native: "日本語" },
    { name: "Russian", native: "Русский" },
    { name: "Urdu", native: "اردو" },
    { name: "Turkish", native: "Türkçe" },
    { name: "Italian", native: "Italiano" },
    { name: "Korean", native: "한국어" },
    { name: "Persian", native: "فارسی" },
    { name: "Arabic", native: "العربية" }
  ];

  const handleSearch = async (e?: any, queryOverride?: string) => {
    if (e) e.preventDefault();
    const queryToSearch = queryOverride || searchQuery;
    if (!queryToSearch.trim() || loading) return;

    // Detect if this is likely a conversational intent rather than a product search
    const q = queryToSearch.trim().toLowerCase();
    const isConv = q.length < 3 || 
                  /^(كيف|ما|من|هل|متى|اين|ماذا|لماذا|ايش|بكم|وش|كم)\b/i.test(q) || 
                  q.endsWith("؟") || 
                  q.endsWith("?") || 
                  /^(who|what|where|when|why|how|can|is|are|do|does|hi|hello|hey)\b/i.test(q);
    const isUrl = /^http/i.test(q);
    setIsConversationalRequest(!isUrl && isConv);

    const currentQuery = queryToSearch;
    setSearchQuery("");
    setLoading(true);
    
    // Admin tracking
    setDashboardStats(prev => {
      const next = { ...prev, searches: prev.searches + 1 };
      localStorage.setItem('pezeex_searches', next.searches.toString());
      return next;
    });
    
    // Add user message to history immediately for feedback
    setHistory(prev => [...prev, { type: "user", content: currentQuery }]);

    try {
      const response = await getProductAlternatives(currentQuery, currentLang);
      
      const mapItem = (item: ProductAlternative) => {
        let searchTerm = item.searchKey || currentQuery || "product";
        
        // Remove URLs from search term just in case
        searchTerm = searchTerm.replace(/https?:\/\/[^\s]+/g, '');
        // Ensure searchTerm is clean. Remove any hallucinated Arabic text, parentheses, brackets, etc.
        searchTerm = searchTerm.replace(/[\u0600-\u06FF\(\)\[\]\{\}«»""]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!searchTerm || searchTerm.length < 2) searchTerm = "gadget";
        // Limit string length to avoid wildly long searches which return 0 results
        if (searchTerm.length > 50) searchTerm = searchTerm.substring(0, 50).trim();
        
        // Use the exactUrl provided by Gemini API as the primary link
        let safeLink = (item.exactUrl || "").trim();
        // Extract URL if Gemini wrapped it in markdown or brackets
        const urlMatch = safeLink.match(/(https?:\/\/[^\s\)]+)/i);
        if (urlMatch) {
          safeLink = urlMatch[1];
        } else if (safeLink && !/^https?:\/\//i.test(safeLink)) {
          // If no protocol and looks like a URL, add https://
          safeLink = safeLink.replace(/^[\s<\[]+|[\s>\]]+$/g, ''); // strip brackets
          if (safeLink && safeLink.includes('.')) {
            safeLink = "https://" + safeLink;
          } else {
            safeLink = "";
          }
        }
        
        if (!safeLink || safeLink === "https://") {
          safeLink = "";
        }
        
        return { ...item, link: safeLink, isPromo: false };
      };

      let mappedResponse: ProductsResponse | ProductAlternative[] = [];

      if (response && 'alternatives' in response) {
        const mappedAlts = (response.alternatives || []).map(mapItem).filter(item => item.link !== "");
        mappedResponse = {
          alternatives: mappedAlts,
          message: response.message
        } as ProductsResponse;
      } else if (response && Array.isArray(response)) {
        // Fallback in case it still returns array
        mappedResponse = response.map(mapItem).filter(item => item.link !== "");
      }

      // Complete the progress bar smoothly
      isSearchFinishingRef.current = true;
      await new Promise(resolve => setTimeout(resolve, 500));

      // Add AI response to history with results
      setHistory(prev => [...prev, { type: "ai", content: mappedResponse }]);
    } catch (error) {
      console.error("Search error:", error);
      isSearchFinishingRef.current = true;
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setLoading(false);
    }
  };

  const handlePinClick = async () => {
    if (deferredPrompt) {
      // Trigger the native install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Always show manual instructions if explicitly clicked and no native prompt available
      setShowInstallDialog(true);
    }
  };

  const handleDismissInstall = () => {
    setShowInstallDialog(false);
    setHasDismissedInstall(true);
    localStorage.setItem('hasDismissedInstall', 'true');
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden" dir={t.dir}>
      {/* Header */}
      <header className="w-full h-12 sm:h-14 bg-background/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-8 shrink-0 z-50 sticky top-0 transition-colors duration-300">
        {/* Start Section */}
        <div className="flex flex-1 items-center justify-start z-50">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full text-foreground hover:bg-muted active:scale-90 transition-all duration-200"
            onClick={handlePinClick}
          >
            <Pin size={20} className="sm:w-6 sm:h-6" />
          </Button>
        </div>

        {/* Center Logo */}
        <div className="flex shrink-0 items-center justify-center z-50">
          <span className="text-foreground text-xl sm:text-2xl font-black tracking-[0.1em] sm:tracking-[0.15em] leading-none mb-[-2px] uppercase">Pezeex</span>
        </div>

        {/* End Section */}
        <div className="flex flex-1 items-center justify-end z-50">
          <Sheet onOpenChange={(open) => {
            if (!open) {
              setShowLanguages(false);
              setShowContact(false);
              setShowDashboard(false);
            }
          }}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full text-foreground hover:bg-muted active:scale-90 transition-all duration-200" />}>
              <Menu size={20} className="sm:w-6 sm:h-6" />
            </SheetTrigger>
            
            <SheetContent side={t.dir === "rtl" ? "right" : "left"} className="w-[300px] sm:w-[350px] flex flex-col h-full p-0">
              <div className="p-6 pb-2">
                <SheetHeader className={t.dir === "rtl" ? "text-right" : "text-left"}>
                  <SheetTitle className="text-2xl font-bold text-primary">
                  {showDashboard ? t.dashboard : showLanguages ? t.chooseLang : showContact ? t.contact : t.menu}
                  </SheetTitle>
                </SheetHeader>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <AnimatePresence mode="wait">
                  {!showLanguages && !showContact && !showDashboard ? (
                    <motion.div 
                      key="main-menu"
                      initial={{ opacity: 0, x: t.dir === "rtl" ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: t.dir === "rtl" ? -20 : 20 }}
                      className={`flex flex-col gap-2 p-6 pt-2 overflow-y-auto custom-scrollbar ${t.dir === "rtl" ? "text-right" : "text-left"}`}
                    >
                      <button 
                        onClick={() => setShowContact(true)}
                        className={`flex items-center gap-3 p-4 rounded-xl hover:bg-primary/5 transition-colors group ${t.dir === "rtl" ? "justify-end" : "justify-start"}`}
                      >
                        {t.dir === "ltr" && <Phone className="text-emerald-500" size={22} />}
                        <span className="text-lg font-medium group-hover:text-primary">{t.contact}</span>
                        {t.dir === "rtl" && <Phone className="text-emerald-500" size={22} />}
                      </button>

                      <button 
                        onClick={handleShareWebsite}
                        className={`flex items-center gap-3 p-4 rounded-xl hover:bg-primary/5 transition-colors group ${t.dir === "rtl" ? "justify-end" : "justify-start"}`}
                      >
                        {t.dir === "ltr" && <Share2 className="text-sky-500" size={22} />}
                        <span className="text-lg font-medium group-hover:text-primary">{t.shareWebsite}</span>
                        {t.dir === "rtl" && <Share2 className="text-sky-500" size={22} />}
                      </button>

                      <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`flex items-center gap-3 p-4 rounded-xl hover:bg-primary/5 transition-colors group ${t.dir === "rtl" ? "justify-end" : "justify-start"}`}
                      >
                        {t.dir === "ltr" && (isDarkMode ? <Sun className="text-amber-500" size={22} /> : <Moon className="text-indigo-400" size={22} />)}
                        <span className="text-lg font-medium group-hover:text-primary">
                          {isDarkMode ? (t.lightMode || (currentLang === "العربية" ? "الوضع النهاري" : "Light Mode")) : (t.darkMode || (currentLang === "العربية" ? "الوضع الليلي" : "Dark Mode"))}
                        </span>
                        {t.dir === "rtl" && (isDarkMode ? <Sun className="text-amber-500" size={22} /> : <Moon className="text-indigo-400" size={22} />)}
                      </button>

                      <button 
                        onClick={() => setShowLanguages(true)}
                        className={`flex items-center gap-3 p-4 rounded-xl hover:bg-primary/5 transition-colors group ${t.dir === "rtl" ? "justify-end" : "justify-start"}`}
                      >
                        {t.dir === "ltr" && <Languages className="text-primary" size={22} />}
                        <div className={`flex flex-col ${t.dir === "rtl" ? "items-end" : "items-start"}`}>
                          <span className="text-lg font-medium group-hover:text-primary">{t.changeLang}</span>
                          <span className="text-xs text-muted-foreground">{currentLang}</span>
                        </div>
                        {t.dir === "rtl" && <Languages className="text-primary" size={22} />}
                      </button>
                      <SheetClose 
                        onClick={() => {
                          setIsIntroFromMenu(true);
                          setShowIntroDialog(true);
                        }}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl hover:bg-primary/5 transition-colors group ${t.dir === "rtl" ? "justify-end" : "justify-start"}`}
                      >
                        {t.dir === "ltr" && <Info className="text-blue-500" size={22} />}
                        <span className="text-lg font-medium group-hover:text-primary">{t.about}</span>
                        {t.dir === "rtl" && <Info className="text-blue-500" size={22} />}
                      </SheetClose>

                      <a 
                        href="https://paypal.me/AbdullahAlbukhari37"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            const newWindow = window.open("https://paypal.me/AbdullahAlbukhari37", "_blank", "noopener,noreferrer");
                            if (newWindow) {
                              e.preventDefault();
                            }
                          } catch (err) {
                            console.error("Failed to open link via window.open:", err);
                          }
                        }}
                        className={`flex items-center gap-3 p-4 rounded-xl hover:bg-primary/5 transition-colors group ${t.dir === "rtl" ? "justify-end" : "justify-start"}`}
                      >
                        {t.dir === "ltr" && <Heart className="text-red-500" size={22} />}
                        <span className="text-lg font-medium group-hover:text-primary">{t.support}</span>
                        {t.dir === "rtl" && <Heart className="text-red-500" size={22} />}
                      </a>
                    </motion.div>
                  ) : showLanguages ? (
                    <motion.div 
                      key="lang-menu"
                      initial={{ opacity: 0, x: t.dir === "rtl" ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: t.dir === "rtl" ? 20 : -20 }}
                      className="flex flex-col h-full overflow-hidden"
                    >
                      <div className="px-6 shrink-0">
                        <Button 
                          variant="ghost" 
                          className={`w-full gap-2 mb-4 text-primary ${t.dir === "rtl" ? "justify-end" : "justify-start"}`}
                          onClick={() => setShowLanguages(false)}
                        >
                          {t.dir === "ltr" && <ChevronLeft size={18} className="rotate-180" />}
                          {t.back}
                          {t.dir === "rtl" && <ChevronLeft size={18} />}
                        </Button>
                      </div>
                      <div className="flex-1 px-6 overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col gap-2 pb-10">
                          {languages.map((lang) => (
                            <button
                              key={lang.name}
                              onClick={() => {
                                setCurrentLang(lang.native);
                                setShowLanguages(false);
                              }}
                              className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                                currentLang === lang.native 
                                ? "bg-primary text-primary-foreground shadow-md" 
                                : "hover:bg-primary/5 text-foreground"
                              }`}
                            >
                              <span className="text-sm opacity-70">{lang.name}</span>
                              <span className="text-lg font-bold">{lang.native}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ) : showContact ? (
                    <motion.div 
                      key="contact-menu"
                      initial={{ opacity: 0, x: t.dir === "rtl" ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: t.dir === "rtl" ? 20 : -20 }}
                      className="flex flex-col h-full overflow-hidden"
                    >
                      <div className="px-6 shrink-0">
                        <Button 
                          variant="ghost" 
                          className={`w-full gap-2 mb-4 text-primary ${t.dir === "rtl" ? "justify-end" : "justify-start"}`}
                          onClick={() => setShowContact(false)}
                        >
                          {t.dir === "ltr" && <ChevronLeft size={18} className="rotate-180" />}
                          {t.back}
                          {t.dir === "rtl" && <ChevronLeft size={18} />}
                        </Button>
                      </div>
                      <div className="flex-1 px-6 overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col gap-4 pb-10">
                          <a 
                            href="https://www.instagram.com/itti_fc4321?igsh=cHNuOGczbHc5OGd2&utm_source=qr" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex items-center gap-4 p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all group ${t.dir === "rtl" ? "flex-row-reverse" : "flex-row"}`}
                          >
                            <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform">
                              <Instagram size={24} />
                            </div>
                            <div className={`flex flex-col ${t.dir === "rtl" ? "items-end" : "items-start"}`}>
                              <span className="text-sm text-muted-foreground">{t.instagram}</span>
                              <span className="text-base font-bold text-primary">@itti_fc4321</span>
                            </div>
                          </a>
                          <a 
                            href="mailto:contact@pezeex.com"
                            className={`flex items-center gap-4 p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all group ${t.dir === "rtl" ? "flex-row-reverse" : "flex-row"}`}
                          >
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                              <Mail size={24} />
                            </div>
                            <div className={`flex flex-col ${t.dir === "rtl" ? "items-end" : "items-start"}`}>
                              <span className="text-sm text-muted-foreground">{t.email}</span>
                              <span className="text-base font-bold text-primary">contact@pezeex.com</span>
                            </div>
                          </a>
                          <a 
                            href="https://www.reddit.com/u/ExternalAd2358/?utm_source=share&utm_medium=ios_app&utm_name=ioscss&utm_content=1&utm_term=1" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex items-center gap-4 p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all group ${t.dir === "rtl" ? "flex-row-reverse" : "flex-row"}`}
                          >
                            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                              <RedditIcon size={24} />
                            </div>
                            <div className={`flex flex-col ${t.dir === "rtl" ? "items-end" : "items-start"}`}>
                              <span className="text-sm text-muted-foreground">{t.reddit}</span>
                              <span className="text-base font-bold text-primary">u/ExternalAd2358</span>
                            </div>
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  ) : showDashboard ? (
                    <motion.div 
                      key="dashboard-menu"
                      initial={{ opacity: 0, x: t.dir === "rtl" ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: t.dir === "rtl" ? 20 : -20 }}
                      className="flex flex-col h-full overflow-hidden"
                    >
                      <div className="px-6 shrink-0">
                        <Button 
                          variant="ghost" 
                          className={`w-full gap-2 mb-4 text-primary ${t.dir === "rtl" ? "justify-end" : "justify-start"}`}
                          onClick={() => setShowDashboard(false)}
                        >
                          {t.dir === "ltr" && <ChevronLeft size={18} className="rotate-180" />}
                          {t.back}
                          {t.dir === "rtl" && <ChevronLeft size={18} />}
                        </Button>
                      </div>
                      <div className="flex-1 px-6 overflow-y-auto custom-scrollbar">
                        <div className={`flex flex-col gap-4 pb-10 ${t.dir === "rtl" ? "text-right" : "text-left"}`}>
                          <div className="grid grid-cols-2 gap-3">
                            {/* Visitors */}
                            <div className="p-4 bg-primary/5 rounded-2xl border-2 border-primary/10 flex flex-col items-center justify-center text-center">
                              <Users className="text-primary mb-2" size={24} />
                              <span className="text-2xl font-bold text-foreground">{dashboardStats.visitors.toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground mt-1">الزوار</span>
                            </div>
                            
                            {/* Searches */}
                            <div className="p-4 bg-primary/5 rounded-2xl border-2 border-primary/10 flex flex-col items-center justify-center text-center">
                              <Search className="text-primary mb-2" size={24} />
                              <span className="text-2xl font-bold text-foreground">{dashboardStats.searches.toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground mt-1">عمليات البحث</span>
                            </div>

                            {/* Active Users */}
                            <div className="p-4 bg-primary/5 rounded-2xl border-2 border-primary/10 flex flex-col items-center justify-center text-center">
                              <TrendingUp className="text-emerald-500 mb-2" size={24} />
                              <span className="text-2xl font-bold text-foreground">{dashboardStats.activeUsers.toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground mt-1">الزوار حالياً</span>
                            </div>

                            {/* Clicks */}
                            <div className="p-4 bg-primary/5 rounded-2xl border-2 border-primary/10 flex flex-col items-center justify-center text-center">
                              <MousePointerClick className="text-primary mb-2" size={24} />
                              <span className="text-2xl font-bold text-foreground">{dashboardStats.clicks.toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground mt-1">النقرات على العروض</span>
                            </div>
                          </div>

                          <div className="p-4 bg-card rounded-2xl shadow-sm border mt-2">
                            <h3 className="font-bold text-sm mb-2 flex items-center justify-between">
                              <span>المعلومات التقنية</span>
                              <span className="text-foreground glow-text text-[10px] bg-foreground/10 px-2 py-0.5 rounded-full border border-foreground/20">نظام يعمل</span>
                            </h3>
                            <div className="text-xs text-muted-foreground space-y-2">
                              <div className="flex justify-between"><span>حالة الخادم:</span> <span>متصل</span></div>
                              <div className="flex justify-between"><span>API الذكاء الاصطناعي:</span> <span>يعمل</span></div>
                              <div className="flex justify-between border-t pt-2 mt-2">
                                <span>آخر تحديث:</span> 
                                <span dir="ltr">{new Date().toLocaleTimeString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Conversation Area */}
      <div className={`flex-1 w-full relative ${history.length > 0 ? "overflow-y-auto custom-scrollbar" : "overflow-hidden"}`}>
        <div className={`max-w-4xl mx-auto px-6 py-8 min-h-full flex flex-col ${history.length === 0 ? "justify-center" : "justify-start"}`}>
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center">
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-28 h-28 flex items-center justify-center text-foreground mb-6"
              >
                <svg viewBox="-20 -20 340 340" className="w-full h-full text-foreground drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <mask id="tag-cut-2">
                      <rect x="-50" y="-50" width="400" height="400" fill="white" />
                      <g transform="translate(170, 230) rotate(-10)">
                        <path d="M 0 -40 L 35 -5 L 35 55 L -35 55 L -35 -5 Z" fill="black" stroke="black" strokeWidth="32" strokeLinejoin="round" />
                      </g>
                    </mask>
                    <mask id="tag-hole-text-2">
                      <rect x="-100" y="-100" width="200" height="200" fill="white" />
                      <circle cx="0" cy="-24" r="7" fill="black" />
                      <text x="0" y="24" fontSize="58" fontFamily="sans-serif" fontWeight="900" fill="black" textAnchor="middle" dominantBaseline="central">$</text>
                    </mask>
                  </defs>
                  <g mask="url(#tag-cut-2)">
                    <line x1="166" y1="166" x2="250" y2="250" stroke="currentColor" strokeWidth="36" strokeLinecap="round" />
                    <circle cx="110" cy="110" r="80" fill="none" stroke="currentColor" strokeWidth="22" />
                    <g fill="none" stroke="currentColor" strokeWidth="6">
                      <circle cx="110" cy="110" r="52" />
                      <line x1="110" y1="58" x2="110" y2="162" />
                      <line x1="58" y1="110" x2="162" y2="110" />
                      <ellipse cx="110" cy="110" rx="26" ry="52" />
                      <ellipse cx="110" cy="110" rx="52" ry="26" />
                    </g>
                  </g>
                  <path d="M 166 206 Q 190 190 205 205" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                  <g transform="translate(170, 230) rotate(-10)">
                    <path d="M 0 -40 L 35 -5 L 35 55 L -35 55 L -35 -5 Z" fill="currentColor" stroke="currentColor" strokeWidth="12" strokeLinejoin="round" mask="url(#tag-hole-text-2)" />
                  </g>
                </svg>
              </motion.div>
              <h2 className="text-3xl font-bold mb-4">{t.welcome}</h2>
              <p className="text-muted-foreground text-lg max-w-md">
                {t.description}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-8 justify-start h-full">
              {history.map((msg, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${msg.type === "user" ? (t.dir === "rtl" ? "items-start" : "items-end") : (t.dir === "rtl" ? "items-end" : "items-start")}`}
                >
                  {msg.type === "user" ? (
                    <div className={`bg-primary text-primary-foreground px-6 py-3 rounded-2xl shadow-sm max-w-[80%] ${t.dir === "rtl" ? "rounded-tr-none" : "rounded-tl-none"}`}>
                      <p className="text-lg font-medium">{msg.content as string}</p>
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className={`flex items-center gap-2 mb-4 ${t.dir === "rtl" ? "justify-end" : "justify-start"}`}>
                        {t.dir === "ltr" && (
                          <div className="p-1 rounded-full flex items-center justify-center bg-primary/5 text-primary">
                            <Logo className="w-5 h-5" />
                          </div>
                        )}
                        <span className="text-lg font-black text-primary tracking-tight">pezeex</span>
                        {t.dir === "rtl" && (
                          <div className="p-1 rounded-full flex items-center justify-center bg-primary/5 text-primary">
                            <Logo className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-8 w-full">
                        {(() => {
                          const content = msg.content as any;
                          const renderCards = (items: ProductAlternative[], sectionTitle: string, isExact: boolean = false) => {
                            if (!items || items.length === 0) return null;

                            return (
                              <div className="flex flex-col gap-4 mt-2">
                                {sectionTitle && (
                                  <h3 className={`font-bold text-xl mb-1 text-foreground flex items-center gap-2 ${t.dir === "rtl" ? "text-right" : "text-left"}`}>
                                    {sectionTitle}
                                  </h3>
                                )}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                                  {items.map((item, idx) => {
                                    const uniqueId = `${i}-${isExact ? 'exact' : 'alt'}-${idx}`;
                                    const isPromo = item.isPromo;
                                    const isGeekbuying = item.store.toLowerCase().includes('geekbuying');
                                    
                                    // Premium minimal styling
                                    let cardStyle = "border-border/50 bg-card hover:bg-accent/30 hover:shadow-md hover:-translate-y-1";
                                    let badgeStyle = "bg-background/80 text-foreground border border-border/50";
                                    let buttonStyle = "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-medium";
                                    let iconColor = "text-muted-foreground";

                                    if (isExact) {
                                      cardStyle = "border-primary/20 bg-primary/5 hover:bg-primary/10 hover:shadow-md hover:-translate-y-1";
                                      badgeStyle = "bg-primary/10 text-primary border border-primary/20 font-medium";
                                      buttonStyle = "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-medium";
                                      iconColor = "text-primary";
                                    } else if (isPromo) {
                                      cardStyle = "border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 hover:shadow-md hover:-translate-y-1";
                                      badgeStyle = "bg-orange-500/10 text-orange-600 border border-orange-500/20 font-medium dark:text-orange-400";
                                      buttonStyle = "bg-orange-500 text-white hover:bg-orange-600 shadow-sm font-medium";
                                      iconColor = "text-orange-600 dark:text-orange-400";
                                    }

                                    return (
                                      <Card 
                                        key={idx} 
                                        className={`group relative rounded-xl transition-all duration-300 overflow-hidden flex flex-col p-2.5 sm:p-3 h-full justify-between ${cardStyle}`}
                                      >
                                        <div>
                                          {/* Product Image / Logo Container */}
                                          <div className="w-full h-24 sm:h-28 bg-muted/30 dark:bg-white/95 relative flex items-center justify-center p-1.5 rounded-lg border border-border/10 overflow-hidden mb-2">
                                            {item.imageUrl ? (
                                              <img 
                                                src={item.imageUrl} 
                                                alt={item.name} 
                                                className="max-w-full max-h-full object-contain drop-shadow-xs rounded-md group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                                onError={(e) => {
                                                  (e.target as HTMLImageElement).src = `https://placehold.co/100x100/png?text=${encodeURIComponent(item.store)}`;
                                                }}
                                              />
                                            ) : (
                                              <StoreLogo store={item.store} fullFrame className="p-1.5" />
                                            )}
                                          </div>

                                          {/* Title & Badges */}
                                          <div className="flex flex-col gap-1.5 mb-2">
                                            <div className={`flex flex-wrap gap-1 ${t.dir === "rtl" ? "justify-end" : "justify-start"}`}>
                                              <Badge className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold items-center whitespace-nowrap shadow-xs flex ${badgeStyle}`}>
                                                <Store size={8} className={t.dir === "rtl" ? "ml-0.5" : "mr-0.5"} />
                                                <span>{isExact ? item.store : isPromo ? (currentLang === "العربية" ? "عرض خاص" : "Special Deal") : item.store}</span>
                                              </Badge>
                                              {isGeekbuying && (
                                                <Badge variant="outline" className="text-[8px] bg-sky-500/10 text-sky-600 border-sky-500/20 shadow-none rounded-full px-1 flex items-center dark:text-sky-400">
                                                  EU & NA
                                                </Badge>
                                              )}
                                            </div>

                                            <h4 className={`text-[10px] sm:text-[11px] font-semibold leading-tight line-clamp-2 text-foreground/90 tracking-tight ${t.dir === "rtl" ? "text-right font-medium" : "text-left"}`}>
                                              {item.name}
                                            </h4>
                                          </div>
                                        </div>

                                        {/* Footer Action area */}
                                        <div className="mt-2 flex items-center justify-between gap-1.5 pt-1.5 border-t border-border/40 shrink-0">
                                          <div className={`flex items-center text-[9px] font-medium tracking-wide ${iconColor}`}>
                                            <Tag size={9} className={t.dir === "rtl" ? "ml-0.5" : "mr-0.5"} />
                                            {t.checkPrice || "Check Price"}
                                          </div>

                                          {item.link ? (
                                            <Button 
                                              render={
                                                <a 
                                                  href={item.link} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  onClick={() => handleProductClick(item, uniqueId)}
                                                />
                                              }
                                              nativeButton={false}
                                              size="xs"
                                              className={`shrink-0 rounded-md h-6 px-2 shadow-xs group/btn overflow-hidden relative ${buttonStyle}`}
                                            >
                                              <span className="relative z-10 flex items-center gap-0.5 text-[9px] sm:text-[10px]">
                                                {item.link && item.link.includes('google.com/search') 
                                                  ? (currentLang === "العربية" ? "بحث" : "Search")
                                                  : t.viewProduct}
                                                <MousePointerClick size={9} className={`transition-transform duration-300 ${t.dir === "rtl" ? "group-hover/btn:-translate-x-0.5" : "group-hover/btn:translate-x-0.5"}`} />
                                              </span>
                                            </Button>
                                          ) : (
                                            <Button 
                                              size="xs"
                                              disabled={true}
                                              className={`shrink-0 rounded-md h-6 px-2 shadow-xs group/btn overflow-hidden relative ${buttonStyle}`}
                                            >
                                              <span className="relative z-10 flex items-center gap-0.5 text-[9px] sm:text-[10px]">
                                                {currentLang === "العربية" ? "غير متاح" : "N/A"}
                                              </span>
                                            </Button>
                                          )}
                                        </div>
                                      </Card>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          };

                          if (Array.isArray(content)) {
                            // old format
                            return content.length > 0 ? renderCards(content, "", false) : (
                              <div className="text-center py-4 text-muted-foreground">{t.noResults}</div>
                            );
                          } else if (content && typeof content === 'object') {
                            const alternatives = content.alternatives || [];
                            const message = content.message;
                            
                            if (alternatives.length === 0 && !message) {
                              return <div className="text-center py-4 text-muted-foreground">{t.noResults}</div>;
                            }
                            
                            return (
                              <>
                                {message && (
                                  <div className="bg-muted/30 border border-border p-4 rounded-xl mb-6 text-sm text-foreground whitespace-pre-wrap leading-relaxed shadow-sm">
                                    {message}
                                  </div>
                                )}
                                {renderCards(alternatives, currentLang === "العربية" ? "الخيارات المقترحة" : "Suggested Options", false)}
                              </>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              {loading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full max-w-md mx-auto my-6 p-5 rounded-3xl bg-card/60 border border-border/40 shadow-xl backdrop-blur-md flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary flex-shrink-0">
                        <Loader2 size={16} className="animate-spin text-primary" />
                      </div>
                      <div className="relative h-6 flex-1 min-w-0 flex items-center">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={messageIndex}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.35, ease: "easeInOut" }}
                            className="text-xs sm:text-sm font-semibold tracking-wide text-foreground absolute truncate w-full"
                          >
                            {isConversationalRequest ? t.generatingResponse : displayMessage}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-black font-mono tracking-wider text-primary flex-shrink-0">
                      {Math.round(searchProgress)}%
                    </span>
                  </div>

                  {/* Progress bar container */}
                  <div className="relative w-full h-3 bg-muted/40 rounded-full overflow-hidden border border-border/10 shadow-inner">
                    {/* Progress bar fill */}
                    <motion.div 
                      className="absolute top-0 bottom-0 left-0 bg-primary rounded-full"
                      style={{ width: `${searchProgress}%` }}
                      transition={{ type: "spring", stiffness: 80, damping: 15 }}
                    >
                      {/* Smooth Shimmer overlay without pulsing */}
                      <div className="absolute inset-0 progress-shimmer-bg opacity-30" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </motion.div>
                  </div>


                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Input Area */}
      <div className="w-full p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent shrink-0">
        <div className="max-w-4xl mx-auto">
          <form 
            onSubmit={handleSearch}
            className="relative group"
          >
            <Input 
              placeholder={t.placeholder}
              className={`h-14 text-base rounded-2xl border-2 border-primary/20 focus-visible:border-primary focus-visible:ring-primary/20 transition-all shadow-xl bg-background/50 backdrop-blur-md ${t.dir === "rtl" ? "pr-12 pl-16" : "pl-12 pr-16"}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading}
            />
            <div className={`absolute top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors ${t.dir === "rtl" ? "right-4" : "left-4"}`}>
              <Search size={20} />
            </div>
            <Button 
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className={`absolute top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg disabled:opacity-50 disabled:bg-primary/30 ${t.dir === "rtl" ? "left-2" : "right-2"}`}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            </Button>
          </form>
          <p className="text-[10px] text-center text-muted-foreground mt-3">
            {t.aiDisclaimer}
          </p>
        </div>
      </div>

      {/* Manual Install Dialog */}
      <Dialog open={showInstallDialog} onOpenChange={(open) => !open && handleDismissInstall()}>
        <DialogContent showCloseButton={false} className={`max-w-[400px] ${t.dir === "rtl" ? "text-right" : "text-left"}`}>
          <DialogHeader>
            <DialogTitle>{t.install || "Add to Home Screen"}</DialogTitle>
            <DialogDescription>
              {t.installDesc || "Add this site to your home screen to save time every time you shop"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {isIOS ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. {t.iosStep1 || "Tap the Share button at the bottom of your screen."}</p>
                <p>2. {t.iosStep2 || "Scroll down and tap Add to Home Screen."}</p>
                {t.iosSafariTip && <p className="text-xs opacity-70 mt-2">{t.iosSafariTip}</p>}
              </div>
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. {t.androidStep1 || "Tap the browser menu (usually three dots)."}</p>
                <p>2. {t.androidStep2 || "Select Add to Home Screen or Install App."}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDismissInstall}>
              {t.installDismiss || "Dismiss"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Welcome / Intro Dialog */}
      <AnimatePresence>
        {showIntroDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-lg"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-sm bg-card/90 border border-border/60 shadow-2xl rounded-3xl p-5 md:p-6 flex flex-col items-center text-center overflow-hidden"
            >
              
              {/* Logo container */}
              <div className="relative mb-4 flex items-center justify-center">
                <Logo className="w-16 h-16 text-primary" />
              </div>

              {/* Title */}
              <h2 className="text-lg sm:text-xl font-black text-foreground mb-3 tracking-tight leading-tight">
                {t.introTitle || "وفّر آلاف الدولارات سنوياً مع pezeex!"}
              </h2>

              {/* Description */}
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">
                {t.introDesc || "مرحباً بك في pezeex! نحن نساعدك في البحث عن بدائل حقيقية وأرخص لأي منتج تريده باستخدام الذكاء الاصطناعي، لتتفادى الأسعار المبالغ فيها وتوفر آلاف الدولارات سنوياً عند التسوق."}
              </p>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-2">
                <Button 
                  onClick={() => setShowIntroDialog(false)}
                  className="w-full rounded-2xl h-10 text-xs sm:text-sm font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {t.introOk || "حسناً، فهمت"}
                </Button>
                
                {!isIntroFromMenu && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      localStorage.setItem('hasDismissedIntro', 'true');
                      setShowIntroDialog(false);
                    }}
                    className="w-full rounded-2xl h-10 text-xs sm:text-sm font-medium border-border/80 hover:bg-muted text-muted-foreground transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {t.introDontShow || "لا تظهر هذه الرسالة مرة أخرى"}
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-foreground/5 via-background to-background">
        <div className="absolute top-[10%] right-[10%] w-[40%] h-[40%] bg-foreground/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] left-[10%] w-[30%] h-[30%] bg-foreground/5 rounded-full blur-[120px]" />
      </div>

    </div>
  );
}
