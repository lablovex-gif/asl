import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const allEnv = { ...process.env, ...env };

  let detectedKey = '';
  for (const [k, v] of Object.entries(allEnv)) {
    if (!v || typeof v !== 'string') continue;
    const val = v.trim();
    if (val.length < 15 || val.length > 400) continue;
    const ku = k.toUpperCase();
    if (
      ku.includes('GEMINI') ||
      ku.includes('API_KEY') ||
      ku.includes('OPENAI') ||
      ku.includes('GROQ') ||
      ku.includes('DEEPSEEK') ||
      ku.includes('AI_KEY') ||
      val.startsWith('AIzaSy') ||
      val.startsWith('gsk_') ||
      val.startsWith('sk-')
    ) {
      detectedKey = val;
      break;
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_AI_API_KEY': JSON.stringify(detectedKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
