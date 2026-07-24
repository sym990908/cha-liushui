import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const NODE_VERSION = '22.16.0'
const NODE_ZIP = `node-v${NODE_VERSION}-win-x64.zip`

const MIRRORS = [
  `https://npmmirror.com/mirrors/node/v${NODE_VERSION}/${NODE_ZIP}`,
  `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ZIP}`,
]

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const runtimeDir = resolve(root, 'runtime')
const nodeDir = resolve(runtimeDir, 'node')
const zipPath = resolve(runtimeDir, NODE_ZIP)

if (existsSync(join(nodeDir, 'node.exe'))) {
  console.log('便携 Node.js 已存在，跳过下载')
  process.exit(0)
}

mkdirSync(runtimeDir, { recursive: true })

function downloadWithPowerShell(url) {
  const tmpZip = resolve(runtimeDir, 'node-download.zip')
  if (existsSync(tmpZip)) {
    try { rmSync(tmpZip) } catch { /* ignore locked temp */ }
  }
  execSync(
    `powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri '${url.replace(/'/g, "''")}' -OutFile '${tmpZip.replace(/'/g, "''")}' -UseBasicParsing -TimeoutSec 600"`,
    { stdio: 'inherit' },
  )
  const size = statSync(tmpZip).size
  if (size < 1_000_000) {
    throw new Error(`下载文件过小 (${size} bytes)，可能不完整`)
  }
  return tmpZip
}

let downloaded = false
let archivePath = zipPath
for (const url of MIRRORS) {
  try {
    console.log(`下载 Node.js v${NODE_VERSION} ...`)
    console.log(`来源: ${url}`)
    archivePath = downloadWithPowerShell(url)
    downloaded = true
    break
  } catch (err) {
    console.warn(`镜像下载失败: ${err instanceof Error ? err.message : err}`)
  }
}

if (!downloaded) {
  console.error('所有镜像均下载失败，请检查网络后重试')
  process.exit(1)
}

console.log('解压中...')
const extractTmp = resolve(runtimeDir, '_extract')
if (existsSync(extractTmp)) rmSync(extractTmp, { recursive: true })
mkdirSync(extractTmp)

execSync(
  `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${extractTmp.replace(/'/g, "''")}' -Force"`,
  { stdio: 'inherit' },
)

const extracted = readdirSync(extractTmp).find((f) => f.startsWith('node-v'))
if (!extracted) {
  throw new Error('解压后未找到 Node.js 目录')
}

if (existsSync(nodeDir)) rmSync(nodeDir, { recursive: true })
cpSync(join(extractTmp, extracted), nodeDir, { recursive: true })

rmSync(extractTmp, { recursive: true })
for (const p of [zipPath, resolve(runtimeDir, 'node-download.zip')]) {
  try { if (existsSync(p)) rmSync(p) } catch { /* ignore */ }
}

console.log('便携 Node.js 就绪:', nodeDir)
