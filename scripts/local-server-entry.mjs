import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { handler as ocr } from '../netlify/functions/ocr.ts'
import { handler as ocrStatus } from '../netlify/functions/ocr-status.ts'
import { handler as parseExcel } from '../netlify/functions/parse-excel.ts'
import { handler as parseTransactions } from '../netlify/functions/parse-transactions.ts'
import { handler as inferTableSchema } from '../netlify/functions/infer-table-schema.ts'
import { handler as analyzeScenario } from '../netlify/functions/analyze-scenario.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const PORT = Number(process.env.PORT || 8888)

const routes = {
  ocr,
  'ocr-status': ocrStatus,
  'parse-excel': parseExcel,
  'parse-transactions': parseTransactions,
  'infer-table-schema': inferTableSchema,
  'analyze-scenario': analyzeScenario,
}

function wrapHandler(handler) {
  return async (req, res) => {
    let body = req.body
    if (Buffer.isBuffer(body)) body = body.toString('utf8')
    else if (body !== undefined && body !== null && typeof body !== 'string') body = JSON.stringify(body)

    const event = {
      httpMethod: req.method,
      path: req.path,
      headers: req.headers,
      body: body ?? '',
      isBase64Encoded: false,
    }

    try {
      const result = await handler(event, {})
      if (result.headers) {
        for (const [key, value] of Object.entries(result.headers)) {
          if (value != null) res.setHeader(key, String(value))
        }
      }
      res.status(result.statusCode || 200).send(result.body ?? '')
    } catch (err) {
      console.error(`[${req.path}]`, err)
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
    }
  }
}

const app = express()
app.use(express.json({ limit: '12mb' }))
app.use(express.text({ limit: '12mb', type: '*/*' }))

for (const [name, handler] of Object.entries(routes)) {
  app.post(`/.netlify/functions/${name}`, wrapHandler(handler))
}

app.use(express.static(distDir, { maxAge: '1h' }))
app.get(/^(?!\/\.netlify\/).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Flow Analysis ready: http://localhost:${PORT}`)
})
