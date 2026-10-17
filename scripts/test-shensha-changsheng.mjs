// 免费排盘【神煞(51项)+十二长生+空亡】回归（纳入 npm run verify，纯本地不耗 API）
//
// 断言纪律（总纲 §8.6）：凡断言函数行为必须真调用；入口接线靠直调 route handler 横向比对；
// 页面文案与实现口径（SHEN_SHA_NOTE）一致性靠源码包含断言守护。
//
// 验证锚点：
//   ① 外部基准官方范例：1951-11-14 10:00 女命（广东）四柱 辛卯/己亥/戊午/丁巳，
//      十二长生 沐浴/绝/帝旺/临官（与官方排盘逐柱一致，见 eval/baziqa/report.md §可比性限制1）；
//      神煞/空亡为手算锚点（口诀逐条推得 + 旬空逐旬推得）
//   ② eval/baziqa/paipan-results.json：41 位命主的 standardText 内【十二长生】行
//      （上一任务与官方范例交叉验证过的已验证数据），全量逐柱比对
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { paipan, shenShaOf, SHEN_SHA_NOTE } from '../src/lib/paipan.ts'
import { POST as paipanPOST } from '../src/app/api/paipan/route.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

let failures = 0
const check = (ok, line) => {
  if (!ok) failures++
  console.log(`  ${ok ? '✓' : '✗'} ${line}`)
}

const KEYS = ['year', 'month', 'day', 'hour']
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const YANG_GAN = ['甲', '丙', '戊', '庚', '壬']
const ZHI_12 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
// 以下期望表均由古籍口诀独立推得（与实现同源不同写法），实现漂移即翻红
const TIAN_YI = { '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'], '乙': ['子', '申'], '己': ['子', '申'], '丙': ['亥', '酉'], '丁': ['亥', '酉'], '壬': ['卯', '巳'], '癸': ['卯', '巳'], '辛': ['午', '寅'] }
const WEN_CHANG = { '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申', '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯' }
const LU_SHEN = { '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳', '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子' }
const YANG_REN = { '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子' }
const TAI_JI = { '甲': ['子', '午'], '乙': ['子', '午'], '丙': ['卯', '酉'], '丁': ['卯', '酉'], '戊': ['辰', '戌', '丑', '未'], '己': ['辰', '戌', '丑', '未'], '庚': ['寅', '亥'], '辛': ['寅', '亥'], '壬': ['巳', '申'], '癸': ['巳', '申'] }
const FU_XING = { '甲': ['寅', '子'], '丙': ['寅', '子'], '乙': ['丑'], '丁': ['亥'], '戊': ['申'], '己': ['未'], '庚': ['午'], '辛': ['巳'], '壬': ['辰'], '癸': ['卯'] }
const GUO_YIN = { '甲': '戌', '乙': '亥', '丙': '丑', '丁': '寅', '戊': '丑', '己': '寅', '庚': '辰', '辛': '巳', '壬': '午', '癸': '未' }
const JIN_YU = { '甲': '辰', '乙': '巳', '丙': '未', '丁': '申', '戊': '未', '己': '申', '庚': '戌', '辛': '亥', '壬': '丑', '癸': '寅' }
const HONG_YAN = { '甲': '午', '乙': '申', '丙': '寅', '丁': '未', '戊': '辰', '己': '辰', '庚': '戌', '辛': '酉', '壬': '子', '癸': '申' }
const flat = r => r.flat()
// 合成四柱辅助：把目标支放到指定列（gan 默认甲，避免意外触发天干系命中——includes 断言本可容忍）
const synth = (zhis, gans) => zhis.map((z, i) => ({ gan: gans?.[i] || '甲', zhi: z }))

// ═══════════════════════════════════════════════════════════
// ① 官方范例锚点（外部基准已验证 + 手算锚点）
// ═══════════════════════════════════════════════════════════
console.log('① 官方范例锚点：1951-11-14 10:00 女命（广东）')
{
  const c = paipan({ year: 1951, month: 11, day: 14, hour: 10, minute: 0, gender: 0, birthLng: 113.3, birthZone: 'Asia/Shanghai' })
  const pillars4 = KEYS.map(k => c.pillars[k].ganZhi)
  check(pillars4.join(' ') === '辛卯 己亥 戊午 丁巳', `四柱=辛卯 己亥 戊午 丁巳（实测 ${pillars4.join(' ')}）`)
  const cs = KEYS.map(k => c.pillars[k].changSheng)
  check(cs.join('/') === '沐浴/绝/帝旺/临官', `十二长生=沐浴/绝/帝旺/临官（实测 ${cs.join('/')}）`)
  const ss = KEYS.map(k => c.pillars[k].shenSha)
  // 手算锚点（六组口径逐条推）：戊日主、辛卯阴年女命（阳男阴女取法）
  //   年柱＋将星/桃花（亥卯未局将星卯、寅午戌局桃花卯）＋金匮（亥卯未局帝旺卯）
  //   月柱＋劫煞（寅午戌局劫煞亥）＋月德合（亥卯未月合干己，月干己）
  //   日柱＋羊刃/天厨贵人（戊日干见午）＋六厄（亥卯未局死位午）＋将星（寅午戌局中神午）＋天喜（卯年冲酉取午）
  //        ＋勾绞煞（辛为阴年女命＝阳男阴女：命前3辰午）＋九丑日（戊午）＋童子煞（辛卯纳音松柏木木命日支午）＋六秀日/十灵日（戊午双中）
  //   时柱＋禄神（戊禄巳）＋词馆（戊临官丁巳）＋驿马（亥卯未马巳）＋亡神（寅午戌亡神巳）＋孤辰（卯年孤辰巳）
  //        ＋破碎（卯年暗金的煞见巳）＋德秀贵人（亥卯未秀干丁，时干丁）＋流霞（戊日干见巳）
  // 负例仍在：天乙贵人（戊见丑未，无）、文昌贵人（戊见申，无）、金神（丁巳≠乙丑/己巳/癸酉）、飞刃（戊飞刃子，无）、天罗地网（年柱纳音木命不论）
  const EXPECT_SS = [
    ['将星', '桃花', '金匮'],
    ['劫煞', '月德合'],
    ['羊刃', '天厨贵人', '六厄', '将星', '天喜', '勾绞煞', '九丑日', '童子煞', '六秀日', '十灵日'],
    ['禄神', '词馆', '驿马', '亡神', '孤辰', '破碎', '德秀贵人', '流霞']
  ]
  check(JSON.stringify(ss) === JSON.stringify(EXPECT_SS),
    `神煞逐柱（实测 ${JSON.stringify(ss)}）`)
  const kw = KEYS.map(k => c.pillars[k].kongWang)
  // 手算旬空：辛卯(甲申旬)→午未；己亥(甲午旬)→辰巳；戊午(甲寅旬)→子丑；丁巳(甲寅旬)→子丑
  check(kw.join('/') === '午未/辰巳/子丑/子丑', `空亡=午未/辰巳/子丑/子丑（实测 ${kw.join('/')}）`)
}

// ═══════════════════════════════════════════════════════════
// ② 41 例全量交叉核对（eval/baziqa/paipan-results.json 已验证数据）
// ═══════════════════════════════════════════════════════════
console.log('② 已验证数据交叉核对：41 位命主十二长生逐柱比对')
{
  const data = JSON.parse(readFileSync(join(ROOT, 'eval/baziqa/paipan-results.json'), 'utf8'))
  const records = data.records
  check(records.length === 41, `41 位命主全有（实测 ${records.length}）`)
  let pillarMismatch = 0
  let diShiMismatch = 0
  let matched = 0
  for (const rec of records) {
    const chart = paipan({
      year: rec.birth.year, month: rec.birth.month, day: rec.birth.day,
      hour: rec.birth.hour, minute: rec.birth.minute ?? 0,
      gender: rec.gender === 'male' ? 1 : 0,
      birthZone: rec.mapping.zone, birthLng: rec.mapping.lng
    })
    // 守护重放路径本身：四柱必须与 bench 记录一致（不一致说明重放方式漂移，先修这里）
    const replay4 = KEYS.map(k => chart.pillars[k].ganZhi)
    const expect4 = KEYS.map(k => rec.pillars[k])
    if (!replay4.every((v, i) => v === expect4[i])) {
      pillarMismatch++
      console.log(`    ✗ ${rec.person_id} 四柱重放不一致：${replay4.join(' ')} ≠ ${expect4.join(' ')}`)
      continue
    }
    // standardText 内【十二长生】行：年柱：X、月柱：Y、日柱：Z、时柱：W
    const m = rec.standardText.match(/【十二长生】\s*\n\s*年柱：(.+?)、月柱：(.+?)、日柱：(.+?)、时柱：(.+?)\n/)
    if (!m) {
      diShiMismatch++
      console.log(`    ✗ ${rec.person_id} standardText 无【十二长生】行（解析失败）`)
      continue
    }
    const expect = [m[1], m[2], m[3], m[4]]
    const actual = KEYS.map(k => chart.pillars[k].changSheng)
    if (!expect.every((v, i) => v === actual[i])) {
      diShiMismatch++
      console.log(`    ✗ ${rec.person_id} 十二长生不一致：实测 ${actual.join('/')} ≠ 已验证 ${expect.join('/')}`)
      continue
    }
    matched++
  }
  check(pillarMismatch === 0, `四柱重放全部一致（不一致 ${pillarMismatch} 例）`)
  check(diShiMismatch === 0 && matched === records.length, `十二长生 41 例逐柱全一致（通过 ${matched}/${records.length}）`)
}

// ═══════════════════════════════════════════════════════════
// ③ shenShaOf 表完整性（真调用，合成用例逐表覆盖 51 项）
// ═══════════════════════════════════════════════════════════
console.log('③ 神煞表完整性（合成四柱逐表覆盖）')
// 天乙贵人：10 干 × 2 支 都必须命中
for (const g of GAN) {
  const t = TIAN_YI[g]
  const r = shenShaOf(synth([t[0], t[1], '子', '子']), g)
  check(r[0].includes('天乙贵人') && r[1].includes('天乙贵人'), `天乙贵人 ${g}日主见${t.join('、')}`)
}
// 文昌 + 禄神：10 干各一
for (const g of GAN) {
  const r = shenShaOf(synth([WEN_CHANG[g], LU_SHEN[g], '子', '子']), g)
  check(r[0].includes('文昌贵人'), `文昌贵人 ${g}日主见${WEN_CHANG[g]}`)
  check(r[1].includes('禄神'), `禄神 ${g}日主见${LU_SHEN[g]}`)
}
// 羊刃：5 阳干命中；5 阴干扫全 12 支不得命中
for (const g of YANG_GAN) {
  const r = shenShaOf(synth([YANG_REN[g], '子', '子', '子']), g)
  check(r[0].includes('羊刃'), `羊刃 ${g}日主见${YANG_REN[g]}`)
}
{
  const yinGans = GAN.filter(g => !YANG_GAN.includes(g))
  let falseHit = 0
  for (const g of yinGans) {
    for (let i = 0; i < 12; i += 4) {
      const r = shenShaOf(synth(ZHI_12.slice(i, i + 4)), g)
      if (flat(r).includes('羊刃')) falseHit++
    }
  }
  check(falseHit === 0, `阴干（${yinGans.join('')}）扫全 12 支均不取羊刃（误命中 ${falseHit} 次）`)
}
// 太极贵人：10 干全目标命中
for (const g of GAN) {
  const t = TAI_JI[g]
  const r = shenShaOf(synth(t.length >= 4 ? t : [t[0], t[1], '子', '子']), g)
  check(flat(r).includes('太极贵人'), `太极贵人 ${g}日主见${t.join('、')}`)
}
// 福星贵人：10 干全目标命中
for (const g of GAN) {
  const t = FU_XING[g]
  const r = shenShaOf(synth(t.length >= 2 ? [t[0], t[1], '子', '子'] : [t[0], '子', '子', '子']), g)
  check(flat(r).includes('福星贵人'), `福星贵人 ${g}日主见${t.join('、')}`)
}
// 国印/金舆/红艳：10 干各一（三表一测：列 0/1/2 分置）
for (const g of GAN) {
  const r = shenShaOf(synth([GUO_YIN[g], JIN_YU[g], HONG_YAN[g], '子']), g)
  check(r[0].includes('国印贵人'), `国印贵人 ${g}日主见${GUO_YIN[g]}`)
  check(r[1].includes('金舆'), `金舆 ${g}日主见${JIN_YU[g]}`)
  check(r[2].includes('红艳煞'), `红艳煞 ${g}日主见${HONG_YAN[g]}`)
}
// 桃花/驿马/华盖/将星/劫煞/灾煞/亡神：4 组 × 7（年支=组员m1，目标支分置月/日/时）
{
  const GROUPS = [
    { m: ['申', '子', '辰'], th: '酉', ym: '寅', hg: '辰', jx: '子', js: '巳', zs: '午', ws: '亥' },
    { m: ['寅', '午', '戌'], th: '卯', ym: '申', hg: '戌', jx: '午', js: '亥', zs: '子', ws: '巳' },
    { m: ['巳', '酉', '丑'], th: '午', ym: '亥', hg: '丑', jx: '酉', js: '寅', zs: '卯', ws: '申' },
    { m: ['亥', '卯', '未'], th: '子', ym: '巳', hg: '未', jx: '卯', js: '申', zs: '酉', ws: '寅' }
  ]
  for (const { m, th, ym, hg, jx, js, zs, ws } of GROUPS) {
    const r1 = shenShaOf(synth([m[0], th, m[2], ym]), '甲')
    check(flat(r1).includes('桃花') && flat(r1).includes('驿马'), `${m.join('')}局起：桃花${th}/驿马${ym} 命中`)
    const r2 = shenShaOf(synth([m[0], hg, m[2], jx]), '甲')
    check(flat(r2).includes('华盖') && flat(r2).includes('将星'), `${m.join('')}局起：华盖${hg}/将星${jx} 命中`)
    const r3 = shenShaOf(synth([m[0], js, zs, ws]), '甲')
    check(r3[1].includes('劫煞') && r3[2].includes('灾煞') && r3[3].includes('亡神'),
      `${m.join('')}局起：劫煞${js}/灾煞${zs}/亡神${ws} 命中（实测 ${JSON.stringify(r3)}）`)
  }
}
// 孤辰/寡宿/红鸾/天喜：年支起，代表性 4 支
{
  const CASES = [
    { y: '子', gc: '寅', gs: '戌', hl: '卯', tx: '酉' },
    { y: '卯', gc: '巳', gs: '丑', hl: '子', tx: '午' },
    { y: '午', gc: '申', gs: '辰', hl: '酉', tx: '卯' },
    { y: '酉', gc: '亥', gs: '未', hl: '午', tx: '子' }
  ]
  for (const { y, gc, gs, hl, tx } of CASES) {
    const r1 = shenShaOf(synth([y, gc, gs, '子']), '甲')
    check(r1[1].includes('孤辰') && r1[2].includes('寡宿'), `年支${y}：孤辰${gc}/寡宿${gs} 命中`)
    const r2 = shenShaOf(synth([y, hl, '子', tx]), '甲')
    check(r2[1].includes('红鸾') && r2[3].includes('天喜'), `年支${y}：红鸾${hl}/天喜${tx} 命中`)
  }
}
// 天德贵人：月支起见天干（寅月见丁）与见地支（卯月见申）两路径（月支=pillars[1].zhi）
{
  const r1 = shenShaOf(synth(['子', '寅', '子', '子'], ['甲', '丁', '甲', '甲']), '甲')
  check(flat(r1).includes('天德贵人'), '天德贵人 寅月见天干丁 命中')
  const r2 = shenShaOf(synth(['子', '卯', '申', '子']), '甲')
  check(flat(r2).includes('天德贵人'), '天德贵人 卯月见地支申 命中')
}
// 月德贵人：寅月见丙
{
  const r = shenShaOf(synth(['子', '寅', '子', '子'], ['甲', '甲', '丙', '甲']), '甲')
  check(flat(r).includes('月德贵人'), '月德贵人 寅月（寅午戌）见天干丙 命中')
}
// 天医：月支前一支（寅月见丑）
{
  const r = shenShaOf(synth(['丑', '寅', '子', '子']), '甲')
  check(flat(r).includes('天医'), '天医 寅月见丑 命中')
}
// 天赦/四废：月支定季节 × 日柱干支
{
  const r1 = shenShaOf(synth(['子', '寅', '寅', '子'], ['甲', '甲', '戊', '甲']), '甲')
  check(r1[2].includes('天赦'), '天赦 寅月（春）日柱戊寅 命中')
  const r2 = shenShaOf(synth(['子', '卯', '酉', '子'], ['甲', '甲', '辛', '甲']), '甲')
  check(r2[2].includes('四废'), '四废 卯月（春）日柱辛酉 命中')
  const r3 = shenShaOf(synth(['子', '寅', '子', '子'], ['甲', '甲', '甲', '甲']), '甲')
  check(!flat(r3).includes('天赦') && !flat(r3).includes('四废'), '负探针：春月日柱甲子 不应命中天赦/四废')
}
// 魁罡/阴阳差错/十恶大败/孤鸾煞：日柱系
{
  const mk = (dgz) => shenShaOf(
    [0, 1, 2, 3].map(i => ({ gan: i === 2 ? dgz[0] : '甲', zhi: i === 2 ? dgz[1] : '子' })), '甲')
  check(mk('庚辰')[2].includes('魁罡'), '魁罡 日柱庚辰 命中')
  check(mk('丙子')[2].includes('阴阳差错'), '阴阳差错 日柱丙子 命中')
  check(mk('甲辰')[2].includes('十恶大败'), '十恶大败 日柱甲辰 命中')
  check(mk('乙巳')[2].includes('孤鸾煞'), '孤鸾煞 日柱乙巳 命中')
  check(!mk('甲子')[2].includes('魁罡') && !mk('甲子')[2].includes('孤鸾煞'), '负探针：日柱甲子 不命中魁罡/孤鸾煞')
}
// 三奇贵人：年月日顺布（乙丙丁）与 月日时顺布（甲戊庚）；乱序负探针
{
  const r1 = shenShaOf(synth(['子', '子', '子', '子'], ['乙', '丙', '丁', '甲']), '甲')
  check(r1[0].includes('三奇贵人') && r1[1].includes('三奇贵人') && r1[2].includes('三奇贵人'),
    '三奇贵人 年月日乙丙丁顺布 命中（三柱齐挂）')
  const r2 = shenShaOf(synth(['子', '子', '子', '子'], ['壬', '甲', '戊', '庚']), '甲')
  check(r2[1].includes('三奇贵人') && r2[2].includes('三奇贵人') && r2[3].includes('三奇贵人'),
    '三奇贵人 月日时甲戊庚顺布 命中')
  const r3 = shenShaOf(synth(['子', '子', '子', '子'], ['乙', '丁', '丙', '甲']), '甲')
  check(!flat(r3).includes('三奇贵人'), '负探针：乙丁丙乱序 不命中三奇贵人')
}
// 童子煞：季节路径（春秋寅子/冬夏卯未辰）＋纳音路径（金木午卯/水火酉戌/土辰巳），仅日支、时支
{
  // 春月（寅）季节路径：日支寅命中、时支巳非目标不命中（年柱丙子=涧下水命，纳音目标酉戌亦不涉寅巳）
  const r1 = shenShaOf(synth(['子', '寅', '寅', '巳'], ['丙', '甲', '甲', '甲']), '甲')
  check(r1[2].includes('童子煞') && !r1[3].includes('童子煞'), '童子煞 春月日支寅 命中（时支巳不误中）')
  // 冬月（亥）季节路径：时支未命中（年柱甲申=泉中水命，纳音目标酉戌不涉未）
  const r2 = shenShaOf(synth(['申', '亥', '午', '未'], ['甲', '甲', '甲', '甲']), '甲')
  check(r2[3].includes('童子煞'), '童子煞 冬月时支未 命中')
  // 纳音路径：年柱庚子=壁上土（土命目标辰巳），春月日支辰非季节目标（寅子）但纳音命中——验证双路径任一即入
  const r3 = shenShaOf(synth(['子', '寅', '辰', '午'], ['庚', '甲', '甲', '甲']), '甲')
  check(r3[2].includes('童子煞'), '童子煞 土命（庚子纳音壁上土）日支辰 命中')
  // 负探针：年支子虽属春月季节目标，但童子煞仅查日支/时支——甲子金命（目标午卯）四柱无涉，全年不命中
  const r4 = shenShaOf(synth(['子', '寅', '辰', '未'], ['甲', '甲', '甲', '甲']), '甲')
  check(!flat(r4).includes('童子煞'), '负探针：年支子在目标集但不取（仅日支/时支）；金命见辰未 不命中')
}
// 德秀贵人（三命通会）：月支三合局定德干、秀干，见四柱天干
{
  const r1 = shenShaOf(synth(['子', '寅', '子', '子'], ['甲', '甲', '丙', '甲']), '甲')
  check(r1[2].includes('德秀贵人'), '德秀贵人 寅月（寅午戌）德干丙 命中')
  const r2 = shenShaOf(synth(['子', '寅', '子', '子'], ['甲', '甲', '甲', '癸']), '甲')
  check(r2[3].includes('德秀贵人'), '德秀贵人 寅月秀干癸（时干） 命中')
  const r3 = shenShaOf(synth(['子', '子', '子', '子'], ['己', '甲', '甲', '甲']), '甲')
  check(r3[0].includes('德秀贵人'), '德秀贵人 子月（申子辰）宽版德干己（年干） 命中')
  const r4 = shenShaOf(synth(['子', '酉', '子', '子'], ['甲', '辛', '甲', '甲']), '甲')
  check(r4[1].includes('德秀贵人'), '德秀贵人 酉月（巳酉丑）德干辛（月干） 命中')
  const r5 = shenShaOf(synth(['子', '寅', '子', '子'], ['甲', '甲', '甲', '甲']), '甲')
  check(!flat(r5).includes('德秀贵人'), '负探针：寅月无德干秀干 不命中')
}
// 金神：乙丑、己巳、癸酉，见日柱或时柱
{
  const mk = (dg, dz, hg, hz) => shenShaOf(
    [{ gan: '甲', zhi: '子' }, { gan: '甲', zhi: '子' }, { gan: dg, zhi: dz }, { gan: hg, zhi: hz }], '甲')
  check(mk('甲', '子', '己', '巳')[3].includes('金神'), '金神 时柱己巳 命中')
  check(mk('乙', '丑', '甲', '子')[2].includes('金神'), '金神 日柱乙丑 命中')
  check(!mk('甲', '子', '甲', '子')[2].includes('金神') && !mk('甲', '子', '甲', '子')[3].includes('金神'),
    '负探针：日柱甲子/时柱甲子 不命中金神')
}
// 飞刃：仅阳干，羊刃对冲（甲酉/丙子/戊子/庚卯/壬午）；阴干不取
{
  const FEI = { '甲': '酉', '丙': '子', '戊': '子', '庚': '卯', '壬': '午' }
  for (const g of YANG_GAN) {
    const r = shenShaOf(synth(['子', '子', FEI[g], '子']), g)
    check(r[2].includes('飞刃'), `飞刃 ${g}日主见${FEI[g]} 命中`)
  }
  const yin = shenShaOf(synth(['子', '子', '酉', '子']), '乙')
  check(!flat(yin).includes('飞刃'), '负探针：乙日主见酉（甲之飞刃）不命中（阴干不取飞刃）')
}
// 流霞（日干起）：甲酉、乙戌、丙未、丁申、戊巳、己午、庚辰、辛卯、壬亥、癸寅——10 干全覆盖
{
  const LIU = { '甲': '酉', '乙': '戌', '丙': '未', '丁': '申', '戊': '巳', '己': '午', '庚': '辰', '辛': '卯', '壬': '亥', '癸': '寅' }
  for (const g of GAN) {
    const r = shenShaOf(synth(['子', '子', LIU[g], '子']), g)
    check(r[2].includes('流霞'), `流霞 ${g}日主见${LIU[g]} 命中`)
  }
}
// 天罗地网：年柱纳音火命见戌亥（天罗）、水土命见辰巳（地网），金木命不论；仅日支、时支
{
  // 年柱丙寅=炉中火（火命）：日支戌、时支亥皆天罗
  const r1 = shenShaOf(synth(['寅', '子', '戌', '亥'], ['丙', '甲', '甲', '甲']), '甲')
  check(r1[2].includes('天罗地网') && r1[3].includes('天罗地网'), '天罗地网 火命（丙寅纳音炉中火）日支戌/时支亥 命中')
  // 年柱庚子=壁上土（土命）：日支辰地网
  const r2 = shenShaOf(synth(['子', '子', '辰', '子'], ['庚', '甲', '甲', '甲']), '甲')
  check(r2[2].includes('天罗地网'), '天罗地网 土命（庚子纳音壁上土）日支辰 命中')
  // 负探针：年柱甲子=海中金（金命不论）；且日支戌虽是火命目标，但纳音按年柱取——日柱甲戌不自证
  const r3 = shenShaOf(synth(['子', '子', '戌', '子'], ['甲', '甲', '甲', '甲']), '甲')
  check(!flat(r3).includes('天罗地网'), '负探针：金命（甲子纳音海中金）见戌 不命中')
}
// 六秀日/十灵日：仅日柱干支（月柱/时柱同干支不取）
{
  const mk = (dgz) => shenShaOf(
    [0, 1, 2, 3].map(i => ({ gan: i === 2 ? dgz[0] : '甲', zhi: i === 2 ? dgz[1] : '子' })), '甲')
  check(mk('戊午')[2].includes('六秀日') && mk('戊午')[2].includes('十灵日'), '六秀日+十灵日 日柱戊午 双中（戊午两表重叠属正常）')
  check(mk('丙午')[2].includes('六秀日') && !mk('丙午')[2].includes('十灵日'), '六秀日 日柱丙午 单中（不入十灵日）')
  check(mk('甲辰')[2].includes('十灵日') && !mk('甲辰')[2].includes('六秀日'), '十灵日 日柱甲辰 单中（不入六秀日）')
  check(!mk('甲子')[2].includes('六秀日') && !mk('甲子')[2].includes('十灵日'), '负探针：日柱甲子 两表均不命中')
  const month = shenShaOf(synth(['子', '午', '子', '子'], ['甲', '丙', '甲', '甲']), '甲')
  check(!flat(month).includes('六秀日'), '负探针：月柱丙午 不取六秀日（仅日柱）')
  const hour = shenShaOf(synth(['子', '子', '子', '午'], ['甲', '甲', '甲', '戊']), '甲')
  check(!flat(hour).includes('十灵日') && !flat(hour).includes('六秀日'), '负探针：时柱戊午 不取十灵日/六秀日（仅日柱）')
}
// —— 本轮新增 13 项：天官贵人/天厨贵人/学堂/词馆/六厄/金匮/元辰/勾绞煞/血刃/破碎/天德合/月德合/九丑日 ——
// 期望表由古籍口诀独立推得（与实现同源不同写法），实现漂移即翻红
const T_GUAN = { '甲': '未', '乙': '辰', '丙': '巳', '丁': '酉', '戊': '戌', '己': '卯', '庚': '亥', '辛': '申', '壬': '寅', '癸': '午' }
const T_CHU = { '甲': '巳', '乙': '午', '丙': '子', '丁': '巳', '戊': '午', '己': '申', '庚': '寅', '辛': '午', '壬': '酉', '癸': '亥' }
const XUETANG = { '甲': '己亥', '乙': '壬午', '丙': '丙寅', '丁': '丁酉', '戊': '戊寅', '己': '己酉', '庚': '辛巳', '辛': '甲子', '壬': '甲申', '癸': '乙卯' }
const CIGUAN = { '甲': '庚寅', '乙': '辛卯', '丙': '乙巳', '丁': '戊午', '戊': '丁巳', '己': '庚午', '庚': '壬申', '辛': '癸酉', '壬': '癸亥', '癸': '壬戌' }
const LIUE = { '申子辰': '卯', '寅午戌': '酉', '巳酉丑': '子', '亥卯未': '午' }
const JINKUI = { '申子辰': '子', '寅午戌': '午', '巳酉丑': '酉', '亥卯未': '卯' }
const XUEREN = { '子': '戌', '丑': '酉', '寅': '申', '卯': '未', '辰': '午', '巳': '巳', '午': '辰', '未': '卯', '申': '寅', '酉': '丑', '戌': '子', '亥': '亥' }
const POSUI = { '子': '巳', '午': '巳', '卯': '巳', '酉': '巳', '寅': '酉', '申': '酉', '巳': '酉', '亥': '酉', '辰': '丑', '戌': '丑', '丑': '丑', '未': '丑' }
const TIANDEHE = { '寅': '壬', '卯': '巳', '辰': '丁', '巳': '丙', '午': '寅', '未': '己', '申': '戊', '酉': '亥', '戌': '辛', '亥': '庚', '子': '申', '丑': '乙' }
const YUEDEHE = { '申子辰': '丁', '寅午戌': '辛', '巳酉丑': '乙', '亥卯未': '己' }
const JIUCHOU = ['乙卯', '己卯', '辛卯', '乙酉', '己酉', '辛酉', '戊子', '戊午', '壬子', '壬午']
const GAN10 = '甲乙丙丁戊己庚辛壬癸'
const SANHE4 = [['申', '子', '辰'], ['寅', '午', '戌'], ['巳', '酉', '丑'], ['亥', '卯', '未']]
// ① 日干起：天官贵人、天厨贵人 10 干全覆盖（目标支置年柱）
for (const g of GAN) {
  check(shenShaOf(synth([T_GUAN[g], '子', '子', '子']), g)[0].includes('天官贵人'), `天官贵人 ${g}日主见${T_GUAN[g]}`)
  check(shenShaOf(synth([T_CHU[g], '子', '子', '子']), g)[0].includes('天厨贵人'), `天厨贵人 ${g}日主见${T_CHU[g]}`)
}
// ① 日干起（配干支）：学堂（长生）、词馆（临官）10 干全覆盖（目标干支置月柱）
for (const g of GAN) {
  const x = XUETANG[g]
  check(shenShaOf(synth(['子', x[1], '子', '子'], ['甲', x[0], '甲', '甲']), g)[1].includes('学堂'), `学堂 ${g}日主见${x}`)
  const cg = CIGUAN[g]
  check(shenShaOf(synth(['子', cg[1], '子', '子'], ['甲', cg[0], '甲', '甲']), g)[1].includes('词馆'), `词馆 ${g}日主见${cg}`)
}
// ② 三合局：六厄（死位，年支/日支起）、金匮（帝旺，仅年支起）4 局覆盖
for (const m of SANHE4) {
  const key = m.join('')
  check(shenShaOf(synth([m[0], LIUE[key], '子', '子']), '甲')[1].includes('六厄'), `六厄 ${key}局见${LIUE[key]} 命中`)
  check(shenShaOf(synth([m[0], JINKUI[key], '子', '子']), '甲')[1].includes('金匮'), `金匮 年支${m[0]}（${key}局）见${JINKUI[key]} 命中`)
}
// ③ 年支起：血刃（果老星宗驾后神煞戌上起子逆行）12 支全覆盖
for (const y of ZHI_12) {
  check(shenShaOf(synth([y, XUEREN[y], '子', '子']), '甲')[1].includes('血刃'), `血刃 年支${y}见${XUEREN[y]} 命中`)
}
// ③ 年支起：破碎（暗金的煞）12 支全覆盖
for (const y of ZHI_12) {
  check(shenShaOf(synth([y, POSUI[y], '子', '子']), '甲')[1].includes('破碎'), `破碎 年支${y}见${POSUI[y]} 命中`)
}
// ③ 年支起 + 性别：元辰/勾绞煞（阳男阴女 vs 阴男阳女两取法；未传性别不取）
{
  // 甲子阳年男命＝阳男：元辰＝年支冲前一位（子冲午→未）；勾绞煞＝命前3辰卯、命后3辰酉
  const rYang = shenShaOf([{ gan: '甲', zhi: '子' }, { gan: '甲', zhi: '未' }, { gan: '甲', zhi: '卯' }, { gan: '甲', zhi: '酉' }], '甲', 1)
  check(rYang[1].includes('元辰') && rYang[2].includes('勾绞煞') && rYang[3].includes('勾绞煞'),
    '元辰/勾绞煞 甲子阳年男命（阳男）：元辰未、勾卯、绞酉 命中')
  // 乙子阴年男命＝阴男：元辰＝年支冲后一位（子冲午→巳）；勾绞煞命前3辰酉、命后3辰卯（反是）
  const rYin = shenShaOf([{ gan: '乙', zhi: '子' }, { gan: '甲', zhi: '巳' }, { gan: '甲', zhi: '酉' }, { gan: '甲', zhi: '卯' }], '甲', 1)
  check(rYin[1].includes('元辰') && rYin[2].includes('勾绞煞') && rYin[3].includes('勾绞煞'),
    '元辰/勾绞煞 乙子阴年男命（阴男）：元辰巳、勾酉、绞卯 命中')
  // 乙子阴年女命＝阳男阴女 → 与甲子阳男同取法（元辰未、勾卯、绞酉）
  const rNv = shenShaOf([{ gan: '乙', zhi: '子' }, { gan: '甲', zhi: '未' }, { gan: '甲', zhi: '卯' }, { gan: '甲', zhi: '酉' }], '甲', 0)
  check(rNv[1].includes('元辰') && rNv[2].includes('勾绞煞') && rNv[3].includes('勾绞煞'),
    '元辰/勾绞煞 乙子阴年女命（阳男阴女）同阳男取法 命中')
  // 负探针：未传性别 → 元辰/勾绞煞 一律不取（不臆断）
  const rNo = shenShaOf([{ gan: '甲', zhi: '子' }, { gan: '甲', zhi: '未' }, { gan: '甲', zhi: '卯' }, { gan: '甲', zhi: '酉' }], '甲')
  check(!flat(rNo).includes('元辰') && !flat(rNo).includes('勾绞煞'), '负探针：未传性别 不取元辰/勾绞煞')
}
// 月支起：天德合（天德之六合，可为干或支）12 月全覆盖（目标置年柱对应干/支）
for (const [m, t] of Object.entries(TIANDEHE)) {
  const pillars = GAN10.includes(t)
    ? [{ gan: t, zhi: '子' }, { gan: '甲', zhi: m }, { gan: '甲', zhi: '子' }, { gan: '甲', zhi: '子' }]
    : [{ gan: '甲', zhi: t }, { gan: '甲', zhi: m }, { gan: '甲', zhi: '子' }, { gan: '甲', zhi: '子' }]
  check(shenShaOf(pillars, '甲')[0].includes('天德合'), `天德合 月支${m}见${t} 命中`)
}
// 月支起：月德合（月德之合干）4 局覆盖（目标干置年柱）
for (const m of SANHE4) {
  const t = YUEDEHE[m.join('')]
  check(shenShaOf(synth(['子', m[0], '子', '子'], [t, '甲', '甲', '甲']), '甲')[0].includes('月德合'), `月德合 ${m.join('')}月见${t} 命中`)
}
// 日柱系：九丑日 10 日全覆盖 + 负探针
for (const dgz of JIUCHOU) {
  const r = shenShaOf([{ gan: '甲', zhi: '子' }, { gan: '甲', zhi: '子' }, { gan: dgz[0], zhi: dgz[1] }, { gan: '甲', zhi: '子' }], '甲')
  check(r[2].includes('九丑日'), `九丑日 日柱${dgz} 命中`)
}
{
  const r = shenShaOf([{ gan: '甲', zhi: '子' }, { gan: '甲', zhi: '子' }, { gan: '甲', zhi: '子' }, { gan: '甲', zhi: '子' }], '甲')
  check(!r[2].includes('九丑日'), '负探针：日柱甲子 不命中九丑日')
}

// ═══════════════════════════════════════════════════════════
// ④ 入口接线：直调 /api/paipan route handler，新字段必须下发且与库级直算一致
// ═══════════════════════════════════════════════════════════
console.log('④ 入口接线断言：/api/paipan 下发 changSheng/shenSha/kongWang')
{
  const payload = { year: 1951, month: 11, day: 14, hour: 10, minute: 0, gender: 0, birthLng: 113.3, birthZone: 'Asia/Shanghai' }
  const req = new Request('http://localhost/api/paipan', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  })
  const res = await paipanPOST(req)
  const json = await res.json()
  check(res.status === 200 && json.success === true, `route 返回 200 success（实测 ${res.status}）`)
  const lib = paipan({ year: 1951, month: 11, day: 14, hour: 10, minute: 0, gender: 0, birthLng: 113.3, birthZone: 'Asia/Shanghai' })
  const apiOK = KEYS.every(k =>
    json.data.pillars[k].changSheng === lib.pillars[k].changSheng &&
    json.data.pillars[k].kongWang === lib.pillars[k].kongWang &&
    JSON.stringify(json.data.pillars[k].shenSha) === JSON.stringify(lib.pillars[k].shenSha)
  )
  check(apiOK, `route 下发的 changSheng/shenSha/kongWang 与库级 paipan() 逐柱一致`)
}

// ═══════════════════════════════════════════════════════════
// ⑤ 页面接线：/chart 展示三行新信息 + 口径说明与 SHEN_SHA_NOTE 同步
// ═══════════════════════════════════════════════════════════
console.log('⑤ 页面接线断言：chart/page.tsx 含十二长生/神煞/空亡行与口径说明')
{
  const pageSrc = readFileSync(join(ROOT, 'src/app/chart/page.tsx'), 'utf8')
  check(pageSrc.includes('十二长生'), '页面含「十二长生」行标签')
  check(pageSrc.includes('神煞'), '页面含「神煞」行标签')
  check(pageSrc.includes('空亡'), '页面含「空亡」行标签')
  check(pageSrc.includes(SHEN_SHA_NOTE), '页面口径说明与 SHEN_SHA_NOTE 逐字同步（文案漂移即翻红）')
  check(pageSrc.includes('p.changSheng') && pageSrc.includes('p.shenSha') && pageSrc.includes('p.kongWang'), '页面消费 changSheng/shenSha/kongWang 字段')
  check(pageSrc.includes('CHANG_SHENG_SLUG'), '十二长生值渲染为知识文章链接（CHANG_SHENG_SLUG 接线）')
}

console.log(failures === 0 ? '\n全部通过 ✓' : `\n${failures} 项失败 ✗`)
process.exit(failures === 0 ? 0 : 1)
