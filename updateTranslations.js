const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  { lang: "العربية", search: `searching: "جاري البحث عن أفضل البدائل...",`, replace: `searching: "جاري البحث عن أفضل البدائل...",\n    generatingResponse: "جاري توليد الرد...",` },
  { lang: "English", search: `searching: "Searching for the best alternatives...",`, replace: `searching: "Searching for the best alternatives...",\n    generatingResponse: "Generating response...",` },
  { lang: "हिन्दी", search: `searching: "सर्वोत्तम विकल्पों की खोज की जा रही है...",`, replace: `searching: "सर्वोत्तम विकल्पों की खोज की जा रही ہے...",\n    generatingResponse: "जवाब तैयार किया जा रहा है...",` },
  { lang: "中文 (普通话)", search: `searching: "正在寻找最佳替代品...",`, replace: `searching: "正在寻找最佳替代品...",\n    generatingResponse: "正在生成回复...",` },
  { lang: "Español", search: `searching: "Buscando las mejores alternativas...",`, replace: `searching: "Buscando las mejores alternativas...",\n    generatingResponse: "Generando respuesta...",` },
  { lang: "Français", search: `searching: "Recherche des meilleures alternatives...",`, replace: `searching: "Recherche des meilleures alternatives...",\n    generatingResponse: "Génération de la réponse...",` },
  { lang: "Português", search: `searching: "Procurando as melhores alternativas...",`, replace: `searching: "Procurando as melhores alternativas...",\n    generatingResponse: "Gerando resposta...",` },
  { lang: "Deutsch", search: `searching: "Suche nach den besten Alternativen...",`, replace: `searching: "Suche nach den besten Alternativen...",\n    generatingResponse: "Antwort wird generiert...",` },
  { lang: "日本語", search: `searching: "最適な代替品を検索中...",`, replace: `searching: "最適な代替品を検索中...",\n    generatingResponse: "応答を生成中...",` },
  { lang: "Русский", search: `searching: "Поиск лучших альтернатив...",`, replace: `searching: "Поиск лучших альтернатив...",\n    generatingResponse: "Создание ответа...",` },
  { lang: "اردو", search: `searching: "بہترین متبادل تلاش کیے جا رہے ہیں...",`, replace: `searching: "بہترین متبادل تلاش کیے جا رہے ہیں...",\n    generatingResponse: "جواب تیار کیا جا رہا ہے...",` },
  { lang: "Türkçe", search: `searching: "En iyi alternatifler aranıyor...",`, replace: `searching: "En iyi alternatifler aranıyor...",\n    generatingResponse: "Yanıt oluşturuluyor...",` },
  { lang: "Italiano", search: `searching: "Ricerca delle migliori alternative...",`, replace: `searching: "Ricerca delle migliori alternative...",\n    generatingResponse: "Generazione della risposta...",` },
  { lang: "한국어", search: `searching: "최고의 대안을 찾는 중...",`, replace: `searching: "최고의 대안을 찾는 중...",\n    generatingResponse: "답변을 생성하는 중...",` },
  { lang: "فارسی", search: `searching: "در حال جستجو برای بهترین جایگزین‌ها...",`, replace: `searching: "در حال جستجو برای بهترین جایگزین‌ها...",\n    generatingResponse: "در حال تولید پاسخ...",` }
];

replacements.forEach(r => {
  content = content.replace(r.search, r.replace);
  // fix hindi typo
  content = content.replace('सर्वोत्तम विकल्पों की खोज की जा रही है...', 'सर्वोत्तम विकल्पों की खोज की जा रही है...');
  content = content.replace('सर्वोत्तम विकल्पों की खोज की जा रही है...', 'सर्वोत्तम विकल्पों की खोज की जा रही है...'); 

});
// my hindi typo above needs standard fix
content = content.replace('सर्वोत्तम विकल्पों की खोज की जा रही ہے...', 'सर्वोत्तम विकल्पों की खोज की जा रही है...');

fs.writeFileSync('src/App.tsx', content);
console.log("Replaced successfully!");
