import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const releaseDir = resolve(root, 'release/flow-analysis-portable')
const zipPath = resolve(root, 'release/flow-analysis-portable-win.zip')

/** Windows CMD 要求 .bat 使用 CRLF，否则双击会闪退 */
function fixBatCrlf(filePath) {
  const raw = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  writeFileSync(filePath, raw.replace(/\r?\n/g, '\r\n'), 'utf8')
}

function parseEnvFile(path) {
  const content = readFileSync(path, 'utf8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

const envPath = resolve(root, '.env')
if (!existsSync(envPath)) {
  console.error('缺少 .env 文件，请先配置 SILICONFLOW_API_KEY 和 PADDLEOCR_TOKEN')
  process.exit(1)
}

const env = parseEnvFile(envPath)
const siliconflow = env.SILICONFLOW_API_KEY
const paddleocr = env.PADDLEOCR_TOKEN

if (env.VITE_SUPABASE_URL || env.VITE_SUPABASE_ANON_KEY) {
  console.warn('警告: .env 含 Supabase 配置，便携版将自动排除（无需登录）')
}

if (!siliconflow || siliconflow === 'your-siliconflow-api-key') {
  console.error('请在 .env 中配置有效的 SILICONFLOW_API_KEY')
  process.exit(1)
}
if (!paddleocr || paddleocr === 'your-paddleocr-token') {
  console.error('请在 .env 中配置有效的 PADDLEOCR_TOKEN')
  process.exit(1)
}

console.log('1/5 npm install...')
execSync('npm install', { cwd: root, stdio: 'inherit' })

console.log('2/5 npm run build...')
execSync('npm run build', { cwd: root, stdio: 'inherit' })

console.log('3/5 下载便携 Node.js...')
execSync('node scripts/download-node.mjs', { cwd: root, stdio: 'inherit' })

console.log('4/5 组装发布目录...')
rmSync(releaseDir, { recursive: true, force: true })
mkdirSync(releaseDir, { recursive: true })

const copies = [
  'dist',
  'netlify',
  'public',
  'node_modules',
  'package.json',
  'netlify.toml',
  'start.bat',
  'stop.bat',
  'runtime',
]

for (const item of copies) {
  const src = resolve(root, item)
  const dest = resolve(releaseDir, item)
  if (!existsSync(src)) {
    console.warn(`跳过缺失项: ${item}`)
    continue
  }
  cpSync(src, dest, { recursive: true })
}

for (const bat of ['start.bat', 'stop.bat']) {
  const p = resolve(releaseDir, bat)
  if (existsSync(p)) fixBatCrlf(p)
}

writeFileSync(
  resolve(releaseDir, '.env'),
  [
    '# 本地便携版 — 无需登录，数据保存在浏览器',
    `SILICONFLOW_API_KEY=${siliconflow}`,
    `PADDLEOCR_TOKEN=${paddleocr}`,
    '',
  ].join('\n'),
)

writeFileSync(
  resolve(releaseDir, '使用说明.txt'),
  [
    'Flow Analysis 流水分析 — 本地便携版',
    '================================',
    '',
    '使用方法：',
    '  1. 解压本文件夹到任意位置',
    '  2. 双击 start.bat 启动',
    '  3. 浏览器将自动打开 http://localhost:8888',
    '  4. 关闭命令行窗口或按 Ctrl+C 停止服务',
    '',
    '如需停止后台服务，可双击 stop.bat',
    '',
    '数据说明：',
    '  - 无需登录账号',
    '  - 项目数据保存在本机浏览器中（localStorage）',
    '  - 清除浏览器数据或换电脑会导致数据丢失',
    '  - 建议定期导出 Excel / PDF 报告备份',
    '',
    '功能说明：',
    '  - Excel/CSV 流水：直接导入解析',
    '  - PDF/图片流水：OCR 识别后结构化',
    '  - 场景报告：AI 智能分析（需联网）',
    '',
    '安全提示：',
    '  - 本程序仅在 localhost 运行，外网无法访问',
    '  - 内置 API 密钥仅供本工具使用，请勿外传压缩包',
    '',
  ].join('\n'),
)

console.log('5/5 压缩 zip...')
mkdirSync(resolve(root, 'release'), { recursive: true })
if (existsSync(zipPath)) rmSync(zipPath)

execSync(
  `powershell -NoProfile -Command "Compress-Archive -LiteralPath '${releaseDir.replace(/'/g, "''")}' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force"`,
  { stdio: 'inherit' },
)

const sizeMb = (readFileSync(zipPath).length / 1024 / 1024).toFixed(1)
console.log(`\n打包完成: ${zipPath} (${sizeMb} MB)`)
console.log('将 zip 发给对方，解压后双击 start.bat 即可使用。')
