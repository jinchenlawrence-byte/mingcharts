// 神煞索引（第 36 轮）：给命理师用的「一页看完」工具页
//
// 为什么要有这一页：
//   53 篇神煞查法散在文章库里，命理师搜到一篇、看完就走 —— 没有「收藏这一页」的理由。
//   这一页把 53 个神煞按用途分组，一屏能扫完，可打印贴墙。
//   ★ 分组是编辑判断（按用途），不是数据层推论；slug 清单必须与 articles.ts 完全对齐，
//     少一个、多一个都会在 test-shensha-index-accept 里判红。
//
// 文案原则：每条的一句话作用取自该文章自己的 description（不另写、不夸大），
//   只做截断，不改写 —— 这样索引与详解永远同源。

import { articles } from './articles'

export interface ShenshaGroup {
  /** 锚点 id */
  id: string
  /** 分组名（简体原文；繁体页经 toHant 派生） */
  label: string
  /** 这一组解决什么问题（一句） */
  hint: string
  slugs: string[]
}

export const SHENSHA_GROUPS: ShenshaGroup[] = [
  {
    id: 'gui-ren',
    label: '貴人吉神',
    hint: '看有沒有助力、能不能逢凶化吉',
    slugs: [
      'tianyi-guiren-chafa', 'taiji-guiren-chafa', 'fuxing-guiren-chafa', 'guoyin-guiren-chafa',
      'tiande-guiren-chafa', 'yuede-guiren-chafa', 'tiande-he-chafa', 'yuede-he-chafa',
      'sanqi-guiren-chafa', 'dexiu-guiren-chafa', 'tianguan-guiren-chafa', 'tianchu-guiren-chafa',
      'tianshe-chafa', 'tianyi-chafa', 'lushen-chafa', 'jinkui-chafa', 'jinyu-chafa',
    ],
  },
  {
    id: 'cai-neng',
    label: '才學文事',
    hint: '看讀書、考試、文筆與才藝',
    slugs: ['wenchang-chafa', 'xuetang-chafa', 'ciguan-chafa', 'huagai-chafa'],
  },
  {
    id: 'quan-bing',
    label: '權柄與性情',
    hint: '看領導力、性格剛柔與身強弱',
    slugs: ['jiangxing-chafa', 'kuigang-chafa', 'jinshen-chafa', 'changsheng-chafa'],
  },
  {
    id: 'qing-yuan',
    label: '情緣六親',
    hint: '看感情、婚姻與親緣厚薄',
    slugs: [
      'taohua-xing-chafa', 'hongyansha-chafa', 'hongluan-chafa', 'tianxi-chafa',
      'yinyang-chacuo-chafa', 'guluan-sha-chafa', 'guchen-chafa', 'guasu-chafa',
    ],
  },
  {
    id: 'dong-xiang',
    label: '動向與空亡',
    hint: '看變動、遠行、落空與糾纏',
    slugs: [
      'yima-xing-chafa', 'kongwang-shensha', 'tianluo-wang-chafa',
      'yuanchen-chafa', 'goujiao-sha-chafa', 'liue-chafa',
    ],
  },
  {
    id: 'xing-shang',
    label: '刑傷破敗',
    hint: '看風險、破耗與需要留意的年份',
    slugs: [
      'yangren-chafa', 'feiren-chafa', 'jiesha-chafa', 'zaisha-chafa', 'wangshen-chafa',
      'liuxia-chafa', 'xueren-chafa', 'posui-chafa', 'sifei-chafa', 'shiedabai-chafa',
    ],
  },
  {
    id: 'ri-zhu',
    label: '日柱特格',
    hint: '只看日柱干支即可判定',
    slugs: ['liuxiuri-chafa', 'shilingri-chafa', 'jiuchou-ri-chafa', 'tongzisha-chafa'],
  },
]

/** 索引里的一行 */
export interface ShenshaEntry {
  slug: string
  /** 神煞名（取标题冒号前那一段，如「天乙贵人查法：…」→「天乙贵人」） */
  name: string
  /** 一句话作用（取自该文 description 的第一句，仅截断不改写） */
  brief: string
  href: string
}

const MAX_BRIEF = 30

function toEntry(slug: string, prefix: string): ShenshaEntry | null {
  const a = articles.find((x) => x.slug === slug)
  if (!a) return null
  const name = (a.title.split('：')[0] ?? a.title).replace(/查法$/, '').trim()
  const firstSentence = (a.description.split('。')[0] ?? a.description).trim()
  const brief = firstSentence.length > MAX_BRIEF ? firstSentence.slice(0, MAX_BRIEF) + '…' : firstSentence
  return { slug, name, brief, href: `${prefix}/article/${slug}` }
}

/** 取全部分组（prefix: '' 简体 / '/tw' 繁体） */
export function shenshaIndex(prefix = ''): Array<ShenshaGroup & { entries: ShenshaEntry[] }> {
  return SHENSHA_GROUPS.map((g) => ({
    ...g,
    entries: g.slugs.map((s) => toEntry(s, prefix)).filter((e): e is ShenshaEntry => e !== null),
  }))
}

/** 文章库里所有神煞 slug（用于测试对齐：索引不得漏、不得多） */
export function allShenshaSlugs(): string[] {
  return articles.filter((a) => a.category === 'shensha').map((a) => a.slug)
}
