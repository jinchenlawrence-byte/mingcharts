// 神煞名 → 命理知识文章 slug 映射（/chart 排盘结果页神煞跳转的唯一事实源）。
//
// 映射完整性由 scripts/test-shensha-articles.mjs 守护：
//   SHEN_SHA_SLUG 键集 === paipan.SHEN_SHA_NAMES（38 项），值必须能在 articles.ts
//   的「神煞查询」分类下找到对应文章（slug 唯一、标题含神煞名）。
// 新增神煞须同步三处：paipan.ts 神煞表、本映射、articles.ts 文章。
export const SHEN_SHA_SLUG: Record<string, string> = {
  // ① 日干起
  '天乙贵人': 'tianyi-guiren-chafa',
  '文昌': 'wenchang-chafa',
  '禄神': 'lushen-chafa',
  '羊刃': 'yangren-chafa',
  '太极贵人': 'taiji-guiren-chafa',
  '福星贵人': 'fuxing-guiren-chafa',
  '国印贵人': 'guoyin-guiren-chafa',
  '金舆': 'jinyu-chafa',
  '红艳煞': 'hongyansha-chafa',
  // ② 年支/日支三合局起
  '桃花': 'taohua-xing-chafa',
  '驿马': 'yima-xing-chafa',
  '华盖': 'huagai-chafa',
  '将星': 'jiangxing-chafa',
  '劫煞': 'jiesha-chafa',
  '灾煞': 'zaisha-chafa',
  '亡神': 'wangshen-chafa',
  // ③ 年支起
  '孤辰': 'guchen-chafa',
  '寡宿': 'guasu-chafa',
  '红鸾': 'hongluan-chafa',
  '天喜': 'tianxi-chafa',
  // ④ 月支起
  '天德贵人': 'tiande-guiren-chafa',
  '月德贵人': 'yuede-guiren-chafa',
  '天医': 'tianyi-chafa',
  '天赦': 'tianshe-chafa',
  '四废': 'sifei-chafa',
  // ⑤ 日柱系
  '魁罡': 'kuigang-chafa',
  '阴阳差错': 'yinyang-chacuo-chafa',
  '十恶大败': 'shiedabai-chafa',
  '孤鸾煞': 'guluan-sha-chafa',
  '三奇贵人': 'sanqi-guiren-chafa',
  // ⑥ 第二批
  '童子煞': 'tongzisha-chafa',
  '德秀贵人': 'dexiu-guiren-chafa',
  '金神': 'jinshen-chafa',
  '飞刃': 'feiren-chafa',
  '流霞': 'liuxia-chafa',
  '天罗地网': 'tianluo-wang-chafa',
  '六秀日': 'liuxiuri-chafa',
  '十灵日': 'shilingri-chafa'
}

/** 空亡严格说不属神煞，但 chart 页空亡行同样挂知识文章（文章已存在） */
export const KONG_WANG_SLUG = 'kongwang-shensha'

/** 十二长生严格说不属神煞，chart 页十二长生行同样挂知识文章（单篇覆盖十二阶段） */
export const CHANG_SHENG_SLUG = 'changsheng-chafa'

/** 神煞名 → 文章路径；未知名返回 null（调用方不渲染链接，避免死链） */
export function shenshaHref(name: string): string | null {
  const slug = SHEN_SHA_SLUG[name]
  return slug ? `/article/${slug}` : null
}
