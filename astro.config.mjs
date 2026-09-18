import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://vyrx.de',
  output: 'static',
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en'],
    routing: {
      prefixDefaultLocale: false
    }
  }
});
