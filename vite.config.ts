
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  // ==================================================================
  // 🔑 SECURITY STEP: PASTE YOUR KEY BELOW
  // ==================================================================
  const MANUAL_API_KEY = "PASTE_YOUR_KEY_HERE"; 

  const API_KEY = env.API_KEY || (MANUAL_API_KEY !== "PASTE_YOUR_KEY_HERE" ? MANUAL_API_KEY : "");

  return {
    plugins: [react()],
    base: './', 
    define: {
      '__GEMINI_API_KEY__': JSON.stringify(API_KEY),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    }
  };
});
