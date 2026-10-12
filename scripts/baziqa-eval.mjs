/**
 * BaziQA Contest8 A/B 两组 AI 评测（HANDOFF-21 §4.4/§6.1③④）
 * 用法：node --import tsx scripts/baziqa-eval.mjs --group A   （或 --group B）
 *
 * 协议（与官方对齐的说明见报告可比性限制）：
 *   · 同命主多轮连续（官方 Multi-turn 同做法）：system → [排盘] → ack → 问题1…问题5
 *   · 固定 temperature=0（可复现；官方未公开其解码参数，属可比性限制）
 *   · model 取 env AI_MODEL（默认 deepseek-chat，与官方基线 DeepSeek-Chat-v3 同款）
 *   · ack 为合成的固定语句（确定性、可复现；官方 ack 为模型真实回复，属可比性限制）
 *   · ★ 绝不把 answer 喂给 AI（本脚本构建 prompt 的路径根本不读 q.answer——buildQuestionMessage 只收 question+options）
 *   · 断点续跑：结果文件中已有的 question_id 跳过；每答一题落盘一次
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadAllPersons, EVAL_DIR, SYSTEM_PROMPT, ACK_MESSAGE, buildFirstUserMessage, buildQuestionMessage, parseAnswer } from './baziqa-lib.mjs'

const args = process.argv.slice(2)
const group = args.includes('--group') ? args[args.indexOf('--group') + 1] : 'A'
if (group !== 'A' && group !== 'B') {
  console.error('用法：node --import tsx scripts/baziqa-eval.mjs --group A|B [--limit N]')
  process.exit(2)
}
// --limit N：仅评测前 N 位命主（冒烟测试用），正式全量跑不带此参
const limitIdx = args.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity

// ★ 先读本地 .env.local 的 AI_* 键（评测脚本独立运行，不经 Next.js），再检查——
//   顺序反了会导致独立运行时因 env 还没加载而误退出
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^(AI_[A-Z_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}
const KEY = process.env.AI_API_KEY || ''
const BASE = (process.env.AI_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')
const MODEL = process.env.AI_MODEL || 'deepseek-chat'
const TEMPERATURE = 0 // 固定解码参数（任务书 §4.4）
const CONCURRENCY = 3
const MAX_RETRIES = 4

if (!KEY) {
  console.error('[baziqa-eval] 未配置 AI_API_KEY，无法评测')
  process.exit(2)
}

const paipanData = JSON.parse(readFileSync(join(EVAL_DIR, 'paipan-results.json'), 'utf8'))
const recordByPerson = new Map(paipanData.records.map(r => [r.person_id, r]))
const persons = loadAllPersons()

const resultsDir = join(EVAL_DIR, 'results')
mkdirSync(resultsDir, { recursive: true })
const outFile = join(resultsDir, `group${group}.json`)

// 载入已有进度（断点续跑）
let records = []
let usageTotal = { promptTokens: 0, completionTokens: 0 }
if (existsSync(outFile)) {
  const prev = JSON.parse(readFileSync(outFile, 'utf8'))
  records = prev.records || []
  usageTotal = prev.usageTotal || usageTotal
}
const doneIds = new Set(records.map(r => r.question_id))

function callChat(messages) {
  const body = JSON.stringify({ model: MODEL, temperature: TEMPERATURE, max_tokens: 1024, messages })
  return fetch(`${BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body,
  })
}

async function askOnce(messages) {
  let lastErr = null
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await callChat(messages)
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`)
        await new Promise(r => setTimeout(r, 2000 * attempt))
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
      const data = await res.json()
      if (data.usage) {
        usageTotal.promptTokens += data.usage.prompt_tokens || 0
        usageTotal.completionTokens += data.usage.completion_tokens || 0
      }
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('空回复')
      return content
    } catch (e) {
      lastErr = e
      await new Promise(r => setTimeout(r, 1500 * attempt))
    }
  }
  throw lastErr
}

async function evalPerson(p) {
  const pr = recordByPerson.get(p.person_id)
  if (!pr) throw new Error(`排盘结果缺命主 ${p.person_id}（先跑 baziqa-paipan.mjs）`)
  const facts = group === 'B' ? pr.enhancedFacts : null
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildFirstUserMessage(pr.standardText, facts, p.contestYear) },
    { role: 'assistant', content: ACK_MESSAGE },
  ]
  for (let i = 0; i < p.questions.length; i++) {
    const q = p.questions[i]
    if (doneIds.has(q.question_id)) {
      messages.push({ role: 'assistant', content: `（已答，续跑跳过）` })
      continue
    }
    messages.push({ role: 'user', content: buildQuestionMessage(i + 1, q) })
    const reply = await askOnce(messages)
    messages.push({ role: 'assistant', content: reply })
    const ourAnswer = parseAnswer(reply)
    records.push({
      question_id: q.question_id,
      person_id: p.person_id,
      contestYear: p.contestYear,
      questionIndex: i + 1,
      ourAnswer,               // null = 解析失败（无效作答）
      correctAnswer: q.answer, // 仅存于结果文件（评分侧）；prompt 侧从未接触
      isCorrect: ourAnswer === q.answer,
      invalid: ourAnswer === null,
      reply,
    })
    doneIds.add(q.question_id)
    writeFileSync(outFile, JSON.stringify({
      _meta: {
        group, model: MODEL, temperature: TEMPERATURE,
        protocol: 'multi-turn：system → 排盘 → 合成ack → 问题逐轮，回复逐轮入上下文',
        concurrency: CONCURRENCY,
        usageTotal, generatedAt: new Date().toISOString(),
      },
      records,
    }, null, 2), 'utf8')
  }
}

// 命主级并行池
const pending = persons.filter(p => p.questions.some(q => !doneIds.has(q.question_id))).slice(0, LIMIT)
console.log(`[baziqa-eval] 组${group} 模型=${MODEL} 温度=${TEMPERATURE} 命主=${pending.length}/${persons.length}（已完成题数 ${records.length}/200）`)
let idx = 0
async function worker(wid) {
  while (true) {
    const my = idx++
    if (my >= pending.length) return
    const p = pending[my]
    try {
      await evalPerson(p)
      console.log(`  [w${wid}] ✓ ${p.person_id}`)
    } catch (e) {
      console.error(`  [w${wid}] ✗ ${p.person_id}: ${e.message}`)
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)))

const nDone = records.length
const nCorrect = records.filter(r => r.isCorrect).length
const nInvalid = records.filter(r => r.invalid).length
console.log(`[baziqa-eval] 组${group} 完成：${nDone}/200 题，答对 ${nCorrect}（${nDone ? (nCorrect / nDone * 100).toFixed(1) : '—'}%），无效作答 ${nInvalid}`)
console.log(`[baziqa-eval] token 合计：input=${usageTotal.promptTokens} output=${usageTotal.completionTokens}`)
