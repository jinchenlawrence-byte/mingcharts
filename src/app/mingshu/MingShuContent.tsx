'use client'

import Link from 'next/link'
import Nav from '@/components/Nav'
import BirthForm from '@/components/BirthForm'
import { SKUS, formatPriceUSD } from '@/lib/pricing'

// 价格一律取自 SKUS（单一事实源），本文件不得硬编码价格
const FATEBOOK_PRICE = formatPriceUSD(SKUS.fatebook.priceUSD)
const MEMBER_MONTHLY_PRICE = formatPriceUSD(SKUS.member_monthly.priceUSD)

const SECTIONS: Array<{ title: string; desc: string }> = [
  { title: '八字总览', desc: '日主、月令、旺衰、格局与五行分布，一句话点明人生主题' },
  { title: '性格天赋', desc: '日主五行本性与十神组合，优势、短板与天赋所在' },
  { title: '用神喜忌', desc: '明确用神、喜神、忌神，对应方位、颜色与行业建议' },
  { title: '格局成败', desc: '按《子平真诠》论格局，相神有无、忌神透藏与层次' },
  { title: '调候用神', desc: '按《穷通宝鉴》论寒暖燥湿之病与调候之药' },
  { title: '大运流年', desc: '逐运点评吉凶基调，重点展开当前大运与近三年流年' },
  { title: '事业财运', desc: '格局、用神与财官配置，行业方向与财富层次趋势' },
  { title: '婚姻感情', desc: '妻星/夫星与夫妻宫，感情模式、配偶特征与注意事项' },
  { title: '子女六亲', desc: '子女星与子女宫，及与父母、兄弟姐妹的六亲关系' },
  { title: '健康提示', desc: '五行偏旺偏弱对应脏腑养护，与生活方式建议' },
]

const FAQS = [
  {
    q: '命书报告怎么生成？',
    a: '先输入出生信息排盘，系统算出你的四柱、十神、大运、旺衰与格局，再由 AI 命理师结合六部经典把这些信息展开成万字解读。排盘数据是确定性算法，解读内容紧扣你的具体命局，不是套话。',
  },
  {
    q: '要提供哪些信息？',
    a: '出生年、月、日、时（精确到分）、性别即可。出生时间越准确，时柱与命盘越精准；时间不确定时，解读精度会相应下降。',
  },
  {
    q: '多久能生成？',
    a: '通常 30 秒左右。AI 服务偶发不可用时，会自动回退到规则引擎，仍能给出完整的十大板块解读。',
  },
  {
    q: '命书能保存吗？',
    a: '购买后自动保存到你的账号「我的命盘」，永久可查，刷新或换设备都不丢失。',
  },
  {
    q: '能保证准确吗？',
    a: '不能。命理无法保证某事一定发生，也不替代医疗、法律、财务或心理健康建议。它是一套有结构的自我观察视角，请理性看待。',
  },
]

export default function MingShuContent() {
  const scrollToForm = () => {
    document.getElementById('paipan')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <Nav />

      {/* Hero */}
      <section className="container mx-auto px-4 py-14 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full mb-5">
            六书精要 · AI 深度解读
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-4">
            命书报告
          </h1>
          <p className="text-xl text-amber-800 font-medium mb-3">
            一份万字深度详批，看懂你的八字命盘
          </p>
          <p className="text-gray-600 mb-8 leading-relaxed">
            先排盘、再解读。系统算出你的四柱、十神、旺衰与格局，AI 命理师把盘中的关系，
            以清晰、克制、现代化的语言讲清楚——从性格、事业到婚姻、健康，一次看清全局。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={scrollToForm}
              className="bg-amber-600 text-white px-8 py-3 rounded-full font-bold hover:bg-amber-700 transition shadow-lg"
            >
              立即生成我的命书 {FATEBOOK_PRICE}
            </button>
            <Link
              href="/"
              className="bg-white text-amber-700 px-8 py-3 rounded-full font-semibold border border-amber-200 hover:bg-amber-50 transition"
            >
              先免费排盘
            </Link>
          </div>
          <div className="mt-4">
            <Link href="/mingshu/demo" className="text-sm text-amber-700 hover:underline">
              先看公开示例命书（虚构资料 · 展示前约 30%）→
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            已生成命盘永久保存 · 30 秒左右出结果 · 可反复查看
          </p>
        </div>
      </section>

      {/* 报告包含什么 */}
      <section className="container mx-auto px-4 py-10 max-w-5xl">
        <h2 className="text-2xl font-bold text-amber-900 text-center mb-8">
          命书报告包含十大板块
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {SECTIONS.map((s, i) => (
            <div key={s.title} className="bg-white rounded-lg shadow p-5">
              <div className="text-amber-600 font-bold text-sm mb-2">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="font-bold text-amber-900 mb-1">{s.title}</div>
              <p className="text-xs text-gray-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 为什么值得 / 信任点 */}
      <section className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl mb-3">📖</div>
            <h3 className="font-bold text-amber-900 mb-2">六书为据</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              基于《子平真诠》《滴天髓》《穷通宝鉴》《渊海子平》《三命通会》《千里命稿》，解读有经典原文可循。
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl mb-3">🧮</div>
            <h3 className="font-bold text-amber-900 mb-2">先算后讲</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              排盘、旺衰、格局均为确定性算法，AI 只做解读，不改盘面结论——结论有出处，不是「编」出来的。
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-bold text-amber-900 mb-2">克制不吓唬</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              吉凶判词分七档、只描述时段倾向并标注结构依据；不作确定性承诺，不给行动指令，拒绝恐吓式营销。
            </p>
          </div>
        </div>
      </section>

      {/* 排盘表单 */}
      <section id="paipan" className="container mx-auto px-4 py-10 scroll-mt-20">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-1 text-center text-amber-800">
            输入出生信息，生成你的命书
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            免费排盘 → 查看命盘骨架 → 解锁万字命书详批
          </p>
          <BirthForm ctaText="开始排盘（免费）" />
        </div>
      </section>

      {/* 价格 */}
      <section className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl shadow-lg p-8 text-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">命书报告 {FATEBOOK_PRICE} / 次</h2>
              <p className="opacity-90 text-sm">
                十大板块万字详批 · 永久保存 · AI 深度解读
              </p>
            </div>
            <button
              onClick={scrollToForm}
              className="bg-white text-amber-600 px-8 py-3 rounded-full font-bold hover:bg-amber-50 transition whitespace-nowrap"
            >
              立即获取
            </button>
          </div>
        </div>
        <p className="text-center text-sm text-gray-500 mt-4">
          高频用户可选 <Link href="/pricing" className="text-amber-700 hover:underline">会员订阅 {MEMBER_MONTHLY_PRICE}/月</Link>（订阅权益见价目页）
        </p>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-10 max-w-3xl">
        <h2 className="text-2xl font-bold text-amber-900 text-center mb-6">常见问题</h2>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="bg-white rounded-lg shadow p-5 group">
              <summary className="font-semibold text-amber-900 cursor-pointer list-none flex justify-between items-center">
                {f.q}
                <span className="text-amber-500 group-open:rotate-45 transition-transform">＋</span>
              </summary>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 底部 */}
      <footer className="container mx-auto px-4 py-8 text-center">
        <p className="text-xs text-gray-400">
          本站内容基于传统命理文化整理，仅供学习参考与娱乐，不构成任何人生、医疗、法律、财务决策建议。
        </p>
        <p className="text-xs text-gray-400 mt-2">
          <Link href="/pricing" className="hover:text-amber-700">价格方案</Link>
          <span className="mx-2">·</span>
          <Link href="/article" className="hover:text-amber-700">命理知识</Link>
        </p>
      </footer>
    </main>
  )
}
