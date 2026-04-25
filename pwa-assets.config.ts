import {defineConfig} from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: {
    transparent: {
      sizes: [64, 192, 512],
      favicons: [[48, 'favicon.ico']],
      padding: 0.05,
    },
    maskable: {
      sizes: [512],
      padding: 0.15,
    },
    apple: {
      sizes: [180],
      padding: 0.15,
    },
  },
  images: ['public/favicon.svg'],
});
