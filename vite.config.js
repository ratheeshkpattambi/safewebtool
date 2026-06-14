import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    exclude: ['tests/**', '**/*.spec.js', '**/*.test.js', 'playwright.config.js'],
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        // Preserve source directory structure for tool files
        entryFileNames: (chunkInfo) => {
          const id = chunkInfo.facadeModuleId || '';
          // Preserve the structure of any category tool module (not shared/common).
          // Matches any src/<category>/<toolId>.js, including digit-containing ids like ml/image2text.
          if (id.match(/\/src\/(?!common\/)[a-z0-9-]+\/[a-z0-9-]+\.js$/)) {
            // Preserve the full path including src
            const path = id.includes('/src/') ? id.split('/src/')[1] : id;
            return `src/${path}`;
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: (id) => {
          if (id.includes('/tests/') || id.includes('.spec.js') || id.includes('.test.js')) {
            return undefined;
          }
          
          if (id.includes('node_modules')) {
            if (id.includes('@ffmpeg/core')) {
              return 'vendor-ffmpeg-core';
            }
            if (id.includes('@ffmpeg/ffmpeg') || id.includes('@ffmpeg/util')) {
              return 'vendor-ffmpeg-wasm';
            }
            if (id.includes('js-yaml')) {
              return 'vendor-js-yaml';
            }
            if (id.includes('@playwright')) {
              return undefined;
            }
            return 'vendor';
          }
          
          if (id.includes('/video/ffmpeg-utils.js')) {
            return 'video-utils';
          }
          
          if (id.includes('/common/')) {
            return 'common';
          }
          
          return null;
        }
      }
    },
    // Ensure source files are copied to the build output
    copyPublicDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    }
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@ffmpeg/core', 'js-yaml', '@playwright/test']
  }
}); 