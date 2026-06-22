import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_SITE_URL = 'https://rootin.duckdns.org'
// 인증 뒤의 앱 화면은 검색 노출 대상이 아니므로 공개 진입 페이지만 sitemap에 포함한다.
const SITEMAP_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/landing', changefreq: 'weekly', priority: '0.8' },
]

function normalizeSiteUrl(value) {
  return (value || DEFAULT_SITE_URL).replace(/\/+$/, '')
}

function createSitemap(siteUrl, lastmod) {
  const urls = SITEMAP_ROUTES.map(({ path: routePath, changefreq, priority }) => {
    const loc = routePath === '/' ? `${siteUrl}/` : `${siteUrl}${routePath}`
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      '  </url>',
    ].join('\n')
  }).join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n')
}

function createRobotsTxt(siteUrl) {
  return [
    'User-agent: *',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')
}

function rootinSeoPlugin(siteUrl) {
  const robotsTxt = createRobotsTxt(siteUrl)
  const sitemapXml = createSitemap(siteUrl, new Date().toISOString().split('T')[0])

  return {
    name: 'rootin-seo',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0]
        if (pathname === '/robots.txt') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(robotsTxt)
          return
        }
        if (pathname === '/sitemap.xml') {
          res.setHeader('Content-Type', 'application/xml; charset=utf-8')
          res.end(sitemapXml)
          return
        }
        next()
      })
    },
    transformIndexHtml(html) {
      return html.replaceAll('%ROOTIN_SITE_URL%', siteUrl)
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: robotsTxt,
      })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: sitemapXml,
      })
    },
  }
}

function getConfigValue(env, key, fallback) {
  // loadEnv는 .env 파일을 읽고, process.env fallback은 CI/CD 주입 값을 지원한다.
  return env[key] ?? process.env[key] ?? fallback
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = normalizeSiteUrl(getConfigValue(env, 'VITE_SITE_URL'))

  return {
    plugins: [
      react(),
      tailwindcss(),
      rootinSeoPlugin(siteUrl),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: getConfigValue(env, 'VITE_API_PROXY_TARGET', 'http://localhost:8080'),
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
            });
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
    },
  }
})
