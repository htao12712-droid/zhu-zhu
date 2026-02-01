import { createWorker, Worker } from 'tesseract.js'

let workerPromise: Promise<Worker> | null = null

/**
 * Create a singleton OCR worker.
 * Uses unpkg CDN for worker/core/lang data to avoid bundling heavy assets.
 * Note: requires outbound network on first run (cached afterwards by browser).
 */
export async function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const w = await createWorker('chi_sim', 1, {
        // Faster / more stable in many regions than jsDelivr; change if needed.
        workerPath: 'https://unpkg.com/tesseract.js@v5/dist/worker.min.js',
        corePath: 'https://unpkg.com/tesseract.js-core@v5/tesseract-core-simd-lstm.wasm.js',
        langPath: 'https://unpkg.com/@tesseract.js-data/chi_sim@1.0.0/4.0.0_best_int',
        logger: () => {}
      })
      return w
    })()
  }
  return workerPromise
}

export type OcrExtract = {
  fundCode?: string
  amount?: number
  rawText: string
}

/**
 * Extract fund code & amount from OCR text.
 * - fundCode: 6 digits, prefer those starting with 0/1/2/3 (common fund code patterns)
 * - amount: pick the most plausible number near "金额/买入/申购/投入/¥/元"
 */
export function extractFromText(rawText: string): OcrExtract {
  const text = (rawText || '').replace(/\s+/g, ' ').trim()

  // Fund code: 6 digits
  const codeCandidates = Array.from(text.matchAll(/\b([0-9]{6})\b/g)).map(m => m[1])
  let fundCode: string | undefined
  if (codeCandidates.length) {
    // Prefer codes starting with 0/1/2/3, otherwise take the first
    fundCode = codeCandidates.find(c => /^[0123]/.test(c)) || codeCandidates[0]
  }

  // Amount candidates
  const amountCandidates: number[] = []

  // 1) Numbers with currency markers nearby
  const moneyRegexes = [
    /(?:买入|申购|投入|金额|本金|支付|实付)[^0-9]{0,6}([0-9]{1,9}(?:\.[0-9]{1,2})?)/g,
    /([0-9]{1,9}(?:\.[0-9]{1,2})?)\s*(?:元|￥|¥|RMB|CNY)/gi
  ]
  for (const r of moneyRegexes) {
    for (const m of text.matchAll(r)) {
      const n = Number(m[1])
      if (Number.isFinite(n)) amountCandidates.push(n)
    }
  }

  // 2) Fallback: any number, later filtered
  if (!amountCandidates.length) {
    for (const m of text.matchAll(/\b([0-9]{1,9}(?:\.[0-9]{1,2})?)\b/g)) {
      const n = Number(m[1])
      if (Number.isFinite(n)) amountCandidates.push(n)
    }
  }

  // Filter and pick the most plausible: between 1 and 1e7, prefer integers or 2-decimals.
  const plausible = amountCandidates
    .filter(n => n >= 1 && n <= 10_000_000)
    .sort((a, b) => b - a) // often the buy amount is the largest visible number

  const amount = plausible.length ? Number(plausible[0].toFixed(2)) : undefined

  return { fundCode, amount, rawText }
}

export async function recognizeImage(file: File): Promise<OcrExtract> {
  const worker = await getOcrWorker()
  const { data } = await worker.recognize(file)
  const rawText = (data?.text || '').trim()
  return extractFromText(rawText)
}
