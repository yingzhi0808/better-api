import { createRequire } from 'node:module'
import path from 'node:path'

/**
 * Swagger UI 的选项配置
 *
 * @category Core
 */
export interface SwaggerUIHTMLOptions {
  /** Swagger JSON 文件的 URL 路径，默认为 '/openapi.json' */
  url?: string
  /** HTML 页面标题，默认为 'Swagger UI' */
  title?: string
  /** 自定义 CSS 样式 */
  customCss?: string
  /** 自定义 JavaScript 代码 */
  customJs?: string
  /** If set to true, it persists authorization data and it would not be lost on browser close/refresh。默认为 false */
  persistAuthorization?: boolean
}

/**
 * Swagger UI 静态资源路径
 *
 * @category Core
 */
export interface SwaggerUIAssetPaths {
  indexCss: string
  css: string
  bundleJs: string
  standalonePresetJs: string
  favicon32: string
  favicon16: string
}

/**
 * 获取 Swagger UI 静态资源目录。
 * @returns Swagger UI 静态资源目录。
 *
 * @category Core
 */
export function getSwaggerUIAssetDir() {
  const require = createRequire(import.meta.url)
  const packageJsonPath = require.resolve('swagger-ui-dist/package.json')
  const assetDir = path.dirname(packageJsonPath)
  return assetDir
}

/**
 * 生成 Swagger UI 的 HTML 字符串。
 * @param options 选项。
 * @returns 完整的 Swagger UI HTML 字符串。
 *
 * @category Core
 */
export function generateSwaggerUIHTML(options: SwaggerUIHTMLOptions = {}) {
  const {
    url = '/openapi.json',
    title = 'Swagger UI',
    customCss = '',
    customJs = '',
    persistAuthorization = false,
  } = options

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="icon" type="image/png" href="./favicon-32x32.png" sizes="32x32">
  <link rel="icon" type="image/png" href="./favicon-16x16.png" sizes="16x16">
  <link rel="stylesheet" href="./swagger-ui.css">
  <link rel="stylesheet" href="./index.css">
  ${customCss ? `<style>\n${customCss}\n</style>` : ''}
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="./swagger-ui-bundle.js"></script>
  <script src="./swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      const ui = SwaggerUIBundle({
        url: "${url}",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        persistAuthorization: ${persistAuthorization}
      });

      window.ui = ui;
    };
    ${customJs}
  </script>
</body>
</html>`

  return html
}
