// 年页（/bazi/{year}）内容数据：年柱、纳音、生肖、24 节气、月令、月份内链与 FAQ。
//
// 所有节气日期均由 lunar-javascript 计算，不手写。页面正文由本文件的数据拼装，
// 同一份数据同时供页面渲染与 scripts/test-year-pages-content.mjs 做体积/相似度断言。

import { Solar } from 'lunar-javascript'
import { getYearGanZhi, getNaYin, getZodiac } from './baziData'
import { JIEQI } from './jieqiData'

export interface YearJieQi {
  name: string
  type: '节' | '中气'
  month: number
  day: number
  dateLabel: string
  monthZhi?: string
  monthName?: string
}

export interface YearMonthEntry {
  month: number
  days: number
  jie: YearJieQi
  zhong: YearJieQi
  description: string
  href: string
}

export interface YearFaq {
  q: string
  a: string
}

export interface YearPageData {
  year: number
  ganZhi: string
  gan: string
  zhi: string
  ganElement: string
  zhiElement: string
  zodiacName: string
  benmingfo: string
  naYin: string
  naYinElement: string
  isLeapYear: boolean
  daysInYear: number
  jan1Weekday: string
  prevGanZhi: string
  sameGanZhiYears: number[]
  firstJieQi: YearJieQi
  lastJieQi: YearJieQi
  lichun: YearJieQi
  jieqi: YearJieQi[]
  ganTrait: string
  zhiTrait: string
  naYinTrait: string
  relationTrait: string
  summary: string
  months: YearMonthEntry[]
  faqs: YearFaq[]
}

// 二十四节气里，lunar-javascript 对部分节气返回大写别名，这里统一回中文名。
const JIEQI_ALIAS: Record<string, string> = {
  DA_XUE: '大雪',
  DONG_ZHI: '冬至',
  XIAO_HAN: '小寒',
  DA_HAN: '大寒',
  LI_CHUN: '立春',
  YU_SHUI: '雨水',
  JING_ZHE: '惊蛰',
}

const JIEQI_META = new Map(JIEQI.map(j => [j.name, j]))

const GAN_ELEMENT: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
}

const ZHI_ELEMENT: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}

const SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

const GAN_TRAIT: Record<string, string> = {
  甲: '甲为阳木，传统取象为参天之木、栋梁之材，多与生发、担当、开拓相联系。',
  乙: '乙为阴木，传统取象为花草藤蔓、柔韧之木，多与婉转、协调、细致相联系。',
  丙: '丙为阳火，传统取象为太阳之火，多与外显、热忱、照拂相联系。',
  丁: '丁为阴火，传统取象为灯烛之火，多与内敛、专注、温养相联系。',
  戊: '戊为阳土，传统取象为城墙、高山之土，多与稳重、承载、守成相联系。',
  己: '己为阴土，传统取象为田园、湿润之土，多与包容、培育、变通相联系。',
  庚: '庚为阳金，传统取象为刀剑、矿石之金，多与刚健、决断、重整相联系。',
  辛: '辛为阴金，传统取象为珠玉、精巧之金，多与精致、敏锐、取舍相联系。',
  壬: '壬为阳水，传统取象为江海、奔流之水，多与开阔、流动、谋略相联系。',
  癸: '癸为阴水，传统取象为雨露、溪泉之水，多与渗透、智察、静守相联系。',
}

const ZHI_TRAIT: Record<string, string> = {
  子: '子为阳水，时为仲冬，取象夜半与江河，生肖鼠，藏癸水。',
  丑: '丑为阴土（湿土），时为季冬，为金之库，生肖牛，藏己土、癸水、辛金。',
  寅: '寅为阳木，时为孟春，为火之长生，生肖虎，藏甲木、丙火、戊土。',
  卯: '卯为阴木，时为仲春，为纯木之气，生肖兔，藏乙木。',
  辰: '辰为阳土（湿土），时为季春，为水之库，生肖龙，藏戊土、乙木、癸水。',
  巳: '巳为阴火，时为孟夏，为金之长生，生肖蛇，藏丙火、戊土、庚金。',
  午: '午为阳火，时为仲夏，为火之帝旺，生肖马，藏丁火、己土。',
  未: '未为阴土（燥土），时为季夏，为木之库，生肖羊，藏己土、丁火、乙木。',
  申: '申为阳金，时为孟秋，为水之长生，生肖猴，藏庚金、壬水、戊土。',
  酉: '酉为阴金，时为仲秋，为纯金之气，生肖鸡，藏辛金。',
  戌: '戌为阳土（燥土），时为季秋，为火之库，生肖狗，藏戊土、辛金、丁火。',
  亥: '亥为阴水，时为孟冬，为木之长生，生肖猪，藏壬水、甲木。',
}

const NAYIN_TRAIT: Record<string, string> = {
  海中金: '取象沉潜于海水中的金气，传统喻含藏待显。',
  炉中火: '取象炉冶之火，传统喻集中与锻炼。',
  大林木: '取象成片林木，传统喻根基宽厚、成林之势。',
  路旁土: '取象道路旁承载往来的土，传统喻通达与承载。',
  剑锋金: '取象经锻炼的锋刃之金，传统喻锐利与成器。',
  山头火: '取象山巅之火，传统喻显扬与外照。',
  涧下水: '取象山涧细流，传统喻清冽与循势而行。',
  城头土: '取象城墙夯土，传统喻守御与界分。',
  白蜡金: '取象初成之金，传统喻洁净与可塑。',
  杨柳木: '取象柔条之木，传统喻柔韧与易感。',
  泉中水: '取象泉眼之水，传统喻生生不息与内蓄。',
  屋上土: '取象覆屋之土，传统喻遮蔽与庇护。',
  霹雳火: '取象雷电之火，传统喻突发与震动。',
  松柏木: '取象经冬不凋之木，传统喻坚贞与耐守。',
  长流水: '取象绵延不断的流水，传统喻持续与远行。',
  砂石金: '取象沙砾中的金屑，传统喻细碎待淘。',
  山下火: '取象山脚之火，传统喻近人与渐燃。',
  平地木: '取象平野之木，传统喻平实与铺展。',
  壁上土: '取象粉饰墙壁之土，传统喻依附与修饰。',
  金箔金: '取象锤打成的金箔，传统喻薄而广、装饰之用。',
  覆灯火: '取象灯罩内之火，传统喻守静与内明。',
  天河水: '取象天上云汉之水，传统喻高远与降落。',
  大驿土: '取象驿道之土，传统喻往来与枢纽。',
  钗钏金: '取象首饰之金，传统喻精巧与贵重。',
  桑柘木: '取象桑柘之木，传统喻实用与滋养。',
  大溪水: '取象大溪奔流，传统喻汇聚与奔涌。',
  沙中土: '取象沙中夹杂之土，传统喻混杂待淀。',
  天上火: '取象日轮之火，传统喻普照与炽盛。',
  石榴木: '取象石榴之木，传统喻结实与繁茂。',
  大海水: '取象汪洋之水，传统喻浩瀚与包容。',
}

// 12 个公历月各自的月令说明（与年份无关的部分；具体节气日期由程序计算）。
const MONTH_BLURB: Record<number, string> = {
  1: '小寒、大寒相继，寒气最盛，月令自小寒起转入丑月（湿土）。',
  2: '立春开启寅月，雨水紧随其后，木气由藏转显。',
  3: '惊蛰雷动而入卯月，春分昼夜均分，木气最旺。',
  4: '清明入辰月，谷雨润物，辰为湿土、又为水库。',
  5: '立夏入巳月，小满湿热渐升，火气初旺。',
  6: '芒种入午月，夏至阳极阴生，火气最盛。',
  7: '小暑入未月，大暑湿热交蒸，未为燥土、木之库。',
  8: '立秋入申月，处暑暑止，金气始旺。',
  9: '白露入酉月，秋分昼夜再均，金气最旺。',
  10: '寒露入戌月，霜降转寒，戌为燥土、火之库。',
  11: '立冬入亥月，小雪寒渐深，水气始旺。',
  12: '大雪入子月，冬至一阳生，水气最盛。',
}

const MONTH_JIE: Record<number, string> = {
  1: '小寒', 2: '立春', 3: '惊蛰', 4: '清明', 5: '立夏', 6: '芒种',
  7: '小暑', 8: '立秋', 9: '白露', 10: '寒露', 11: '立冬', 12: '大雪',
}

const MONTH_ZHONG: Record<number, string> = {
  1: '大寒', 2: '雨水', 3: '春分', 4: '谷雨', 5: '小满', 6: '夏至',
  7: '大暑', 8: '处暑', 9: '秋分', 10: '霜降', 11: '小雪', 12: '冬至',
}

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六']

/** 计算指定公历年的 24 个节气（按日期升序），全部来自 lunar-javascript。 */
export function getYearJieQi(year: number): YearJieQi[] {
  const byName = new Map<string, YearJieQi>()
  // 逐月取月中任意一天查询节气表；表覆盖前后相邻节气，按目标年份过滤并去重即可得全年 24 条。
  for (let m = 1; m <= 12; m++) {
    const table = Solar.fromYmdHms(year, m, 15, 12, 0, 0).getLunar().getJieQiTable()
    for (const [key, solar] of Object.entries(table)) {
      if (solar.getYear() !== year) continue
      const name = JIEQI_ALIAS[key] || key
      const meta = JIEQI_META.get(name)
      if (!meta) continue
      if (byName.has(name)) continue
      byName.set(name, {
        name,
        type: meta.type,
        month: solar.getMonth(),
        day: solar.getDay(),
        dateLabel: `${solar.getMonth()}月${solar.getDay()}日`,
        monthZhi: meta.monthZhi,
        monthName: meta.monthName,
      })
    }
  }

  const list = [...byName.values()].sort((a, b) => a.month - b.month || a.day - b.day)
  if (list.length !== 24) {
    throw new Error(`${year} 年节气计算异常：期望 24 个，实际 ${list.length} 个`)
  }
  return list
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function relationTrait(gan: string, ganElement: string, zhi: string, zhiElement: string): string {
  if (ganElement === zhiElement) {
    return `${gan}${zhi}为天干${gan}（${ganElement}）配地支${zhi}（${zhiElement}），同气相求，传统视为一气相聚之象。`
  }
  if (SHENG[ganElement] === zhiElement) {
    return `${gan}${zhi}为天干${gan}（${ganElement}）生地支${zhi}（${zhiElement}），上生下，传统视为气有所泄、偏于输出之象。`
  }
  if (SHENG[zhiElement] === ganElement) {
    return `${gan}${zhi}为地支${zhi}（${zhiElement}）生天干${gan}（${ganElement}），下生上，传统视为得根而助、偏于承载之象。`
  }
  if (KE[ganElement] === zhiElement) {
    return `${gan}${zhi}为天干${gan}（${ganElement}）克地支${zhi}（${zhiElement}），上制下，传统视为约束、整肃之象。`
  }
  return `${gan}${zhi}为地支${zhi}（${zhiElement}）克天干${gan}（${ganElement}），下制上，传统视为受制、磨砺之象。`
}

/** 生成某个公历年的年页数据；页面与断言脚本共用同一份结果。 */
export function getYearPageData(year: number): YearPageData {
  const ganZhi = getYearGanZhi(year)
  const gan = ganZhi[0]
  const zhi = ganZhi[1]
  const zod = getZodiac(zhi)
  const naYin = getNaYin(ganZhi)
  const ganElement = GAN_ELEMENT[gan]
  const zhiElement = ZHI_ELEMENT[zhi]
  const naYinElement = naYin.slice(-1)
  const leap = isLeapYear(year)
  const daysInYear = leap ? 366 : 365
  const jan1Weekday = WEEKDAY[new Date(Date.UTC(year, 0, 1)).getUTCDay()]
  const jieqi = getYearJieQi(year)
  const lichun = jieqi.find(j => j.name === '立春')!
  const firstJieQi = jieqi[0]
  const lastJieQi = jieqi[jieqi.length - 1]
  const prevGanZhi = getYearGanZhi(year - 1)

  const sameGanZhiYears: number[] = []
  for (let y = 1950; y <= 2010; y++) {
    if (y !== year && getYearGanZhi(y) === ganZhi) sameGanZhiYears.push(y)
  }

  const months: YearMonthEntry[] = []
  for (let m = 1; m <= 12; m++) {
    const jie = jieqi.find(j => j.name === MONTH_JIE[m])!
    const zhong = jieqi.find(j => j.name === MONTH_ZHONG[m])!
    const days = new Date(Date.UTC(year, m, 0)).getUTCDate()
    const firstHalf = m === 1
      ? `1月1日至小寒前仍属子月，`
      : ''
    months.push({
      month: m,
      days,
      jie,
      zhong,
      href: `/bazi/${year}/${String(m).padStart(2, '0')}`,
      description: `${year}年${m}月：${firstHalf}${jie.name}在${jie.dateLabel}交节后进入${jie.monthZhi}月，${zhong.name}在${zhong.dateLabel}；本月 ${days} 天；${MONTH_BLURB[m].replace(/。/g, '')}。`,
    })
  }

  const summary =
    `${year} 年按公历年归档为 ${ganZhi} 年，生肖属${zod.name}，纳音${naYin}（五行归${naYinElement}）。` +
    `该年 1 月 1 日为星期${jan1Weekday}，全年 ${daysInYear} 天，${leap ? '是闰年，2 月有 29 天' : '是平年，2 月有 28 天'}。` +
    `24 节气自${firstJieQi.name}（${firstJieQi.dateLabel}）开始，至${lastJieQi.name}（${lastJieQi.dateLabel}）结束；` +
    `其中立春在 ${lichun.dateLabel}，是传统命理更换年柱与生肖的节点——立春前出生按 ${prevGanZhi} 年计。`

  const faqPool: YearFaq[] = [
    {
      q: `${year}年出生的人属什么生肖？`,
      a: `${year} 年按公历年对应干支 ${ganZhi}，地支为${zhi}，生肖属${zod.name}；纳音为${naYin}；该年元旦为星期${jan1Weekday}。`,
    },
    {
      q: `${year}年的年柱和纳音是什么？`,
      a: `${year} 年年柱为 ${ganZhi}：天干${gan}属${ganElement}，地支${zhi}属${zhiElement}；纳音为${naYin}，五行归${naYinElement}；立春在 ${lichun.dateLabel}。`,
    },
    {
      q: `${year}年的立春是哪一天？立春前后出生生肖会不同吗？`,
      a: `${year} 年立春在 ${lichun.dateLabel}；传统命理以立春换年，${year} 年立春前出生按上一干支年 ${prevGanZhi} 计，立春后按 ${ganZhi} 计，本站年页按公历年归档，故统一标注为 ${ganZhi}。`,
    },
    {
      q: `${year}年是闰年吗？全年有多少天？`,
      a: `${year} 年${leap ? '是闰年' : '是平年'}，全年 ${daysInYear} 天，其中 2 月有 ${leap ? 29 : 28} 天。`,
    },
    {
      q: `${year}年的二十四节气从哪个节气开始、到哪个结束？`,
      a: `按公历 ${year} 年计，自${firstJieQi.name}（${firstJieQi.dateLabel}）开始，到${lastJieQi.name}（${lastJieQi.dateLabel}）结束，共 24 个节气；其中 12 个“节”依次更换月令。`,
    },
    {
      q: `${year}年1月1日是星期几？`,
      a: `${year} 年 1 月 1 日为星期${jan1Weekday}。`,
    },
    {
      q: `${year}年的冬至是哪一天？`,
      a: `${year} 年冬至在 ${lastJieQi.name === '冬至' ? lastJieQi.dateLabel : '12月下旬'}，此后北半球白昼渐长；传统以冬至为阴极阳生之节点。`,
    },
    {
      q: `${year}年的小暑和大暑分别在几月几日？`,
      a: `小暑在 ${months[6].jie.dateLabel}，大暑在 ${months[6].zhong.dateLabel}，两者同属未月（季夏）。`,
    },
    {
      q: `${year}年出生的人，年柱在八字中代表什么？`,
      a: `年柱为 ${ganZhi}。传统以年柱主根基、早年与家族渊源；完整命理仍需结合月、日、时三柱与用神，单看年柱不能定论。`,
    },
  ]

  // 以年份取模决定 FAQ 起点，61 个年页的问答组合不完全相同。
  const start = ((year % faqPool.length) + faqPool.length) % faqPool.length
  const faqs: YearFaq[] = []
  for (let i = 0; i < 5; i++) faqs.push(faqPool[(start + i) % faqPool.length])

  return {
    year,
    ganZhi,
    gan,
    zhi,
    ganElement,
    zhiElement,
    zodiacName: zod.name,
    benmingfo: zod.benmingfo,
    naYin,
    naYinElement,
    isLeapYear: leap,
    daysInYear,
    jan1Weekday,
    prevGanZhi,
    sameGanZhiYears,
    firstJieQi,
    lastJieQi,
    lichun,
    jieqi,
    ganTrait: `${year} 年的年干为${gan}（${ganElement}）；${GAN_TRAIT[gan]}`,
    zhiTrait: `${year} 年的年支为${zhi}（${zhiElement}）；${ZHI_TRAIT[zhi]}`,
    naYinTrait: `${year} 年的纳音为${naYin}（${naYinElement}）；${NAYIN_TRAIT[naYin] || '传统以纳音取象，须结合完整四柱参看。'}`,
    relationTrait: `${year} 年的年柱组合为 ${ganZhi}；${relationTrait(gan, ganElement, zhi, zhiElement)}`,
    summary,
    months,
    faqs,
  }
}
