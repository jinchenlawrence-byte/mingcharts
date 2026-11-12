// 繁體頁面補完驗收（2026-11-03）
//
// 斷的是什麼：
//   ① 頁面覆蓋：公開頁（首頁/排盤/命盤/合婚/紫微/方位/命書/日運/價目/條款/隱私）在 /tw 下有路由
//   ② 每頁 metadata：canonical 指自身、hreflang 由 hantAlternates 單一來源生成
//   ③ 內鏈不回退：/tw 頁面不得再 href="/"（會把繁體用戶送回簡體首頁）
//   ④ 共用元件接受 locale：避免「頁面轉繁、結果區仍是简体」的半成品
//   ⑤ sitemap 收錄新增的繁體公開頁

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { toHant, hantTaiSui } from '../src/lib/hant.ts'

let allPass = true
const fail = (m) => { allPass = false; console.log('  ✗ ' + m) }
const ok = (m) => console.log('  · ' + m)

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => readFileSync(join(root, p), 'utf8')

// ---------- ① 路由覆盖 ----------
console.log('—— ① /tw 路由覆盖 ——')
{
  const routes = [
    'src/app/tw/page.tsx',
    'src/app/tw/chart/page.tsx',
    'src/app/tw/charts/page.tsx',
    'src/app/tw/hemun/page.tsx',
    'src/app/tw/ziwei/page.tsx',
    'src/app/tw/geo/page.tsx',
    'src/app/tw/mingshu/page.tsx',
    'src/app/tw/mingshu/demo/page.tsx',
    'src/app/tw/daily/page.tsx',
    'src/app/tw/pricing/page.tsx',
    'src/app/tw/terms/page.tsx',
    'src/app/tw/privacy/page.tsx',
    'src/app/tw/reports/page.tsx',
    'src/app/tw/reports/[id]/page.tsx',
    'src/app/tw/auth/page.tsx',
    'src/app/tw/jieqi/page.tsx',
    'src/app/tw/jieqi/[name]/page.tsx',
    'src/app/tw/jieri/page.tsx',
    'src/app/tw/jieri/[slug]/page.tsx',
  ]
  const missing = routes.filter((f) => !existsSync(join(root, f)))
  if (missing.length) fail(`缺繁體路由：${missing.join(', ')}`)
  else ok(`${routes.length} 个繁體路由齐备`)
}

// ---------- ② canonical + hreflang ----------
console.log('—— ② canonical 与 hreflang ——')
{
  const metaFiles = [
    ['src/app/tw/chart/page.tsx', '/tw/chart'],
    ['src/app/tw/charts/page.tsx', '/tw/charts'],
    ['src/app/tw/hemun/page.tsx', '/tw/hemun'],
    ['src/app/tw/ziwei/page.tsx', '/tw/ziwei'],
    ['src/app/tw/geo/page.tsx', '/tw/geo'],
    ['src/app/tw/mingshu/page.tsx', '/tw/mingshu'],
    ['src/app/tw/mingshu/demo/page.tsx', '/tw/mingshu/demo'],
    ['src/app/tw/daily/page.tsx', '/tw/daily'],
    ['src/app/tw/pricing/page.tsx', '/tw/pricing'],
    ['src/app/tw/terms/page.tsx', '/tw/terms'],
    ['src/app/tw/privacy/page.tsx', '/tw/privacy'],
    ['src/app/tw/reports/page.tsx', '/tw/reports'],
    ['src/app/tw/auth/page.tsx', '/tw/auth'],
  ]
  let mf = 0
  for (const [f, canonical] of metaFiles) {
    const src = read(f)
    if (!src.includes(`canonical: '${canonical}'`)) { mf++; fail(`${f} 缺 canonical ${canonical}`) }
    if (!src.includes('hantAlternates(') && !src.includes('triAlternates(')) { mf++; fail(`${f} 的 hreflang 未走 hantAlternates/triAlternates（会单向失效）`) }
  }
  // 详情的 canonical 指向列表页（不按 id 生成）
  const detail = read('src/app/tw/reports/[id]/page.tsx')
  if (!detail.includes("canonical: '/tw/reports'") || !detail.includes('hantAlternates(')) {
    mf++; fail('src/app/tw/reports/[id]/page.tsx 的 canonical/hreflang 未接上')
  }
  if (mf === 0) ok(`${metaFiles.length + 1} 个繁體页的 canonical 指自身、hreflang 同源生成`)
}

// ---------- ③ 內鏈不回退 ----------
console.log('—— ③ 繁體內鏈不回退 ——')
{
  const files = [
    'src/app/tw/page.tsx',
    'src/app/tw/chart/Client.tsx',
    'src/app/tw/charts/Client.tsx',
    'src/app/tw/hemun/Client.tsx',
    'src/app/tw/ziwei/Client.tsx',
    'src/app/tw/geo/Client.tsx',
    'src/app/tw/mingshu/MingShuContent.tsx',
    'src/app/tw/mingshu/demo/page.tsx',
    'src/app/tw/daily/page.tsx',
    'src/app/tw/pricing/page.tsx',
    'src/app/tw/reports/Client.tsx',
    'src/app/tw/reports/[id]/Client.tsx',
  ]
  let lf = 0
  for (const f of files) {
    const src = read(f)
    if (/href="\/"/.test(src)) { lf++; fail(`${f} 仍有 href="/"（會回到簡體首頁）`) }
    if (/\brouter\.push\('/.test(src)) {
      const pushes = src.match(/router\.push\('([^']*)'/g) || []
      for (const p of pushes) {
        const target = p.slice("router.push('".length, -1)
        if (!target.startsWith('/tw') && target !== '/tw') { lf++; fail(`${f} 的 router.push('${target}') 未走 /tw`) }
      }
    }
  }
  if (lf === 0) ok(`${files.length} 个繁體页/客户端组件无回退到簡體首頁的内链`)
}

// ---------- ④ 共用元件 locale ----------
console.log('—— ④ 共用元件 locale ——')
{
  const components = [
    ['src/components/BirthPlacePicker.tsx', 'locale?: SiteLang'],
    ['src/components/reports/HemunResultView.tsx', 'locale?: SiteLang'],
    ['src/components/reports/ZiweiResultView.tsx', 'locale?: SiteLang'],
    ['src/components/reports/GeoResultView.tsx', 'locale?: SiteLang'],
    ['src/components/reports/LiunianResultView.tsx', 'locale?: SiteLang'],
    ['src/components/reports/PreviewLock.tsx', 'locale?: SiteLang'],
    ['src/components/DailyShareCard.tsx', 'locale?: SiteLang'],
    ['src/components/PersonalDailySection.tsx', 'locale?: SiteLang'],
    ['src/components/AskPanel.tsx', 'locale?: SiteLang'],
    ['src/components/SaveChart.tsx', 'locale?: SiteLang'],
    ['src/components/ShareLink.tsx', 'locale?: SiteLang'],
    ['src/components/BirthForm.tsx', 'locale?: SiteLang'],
  ]
  let cf = 0
  for (const [f, needle] of components) {
    if (!read(f).includes(needle)) { cf++; fail(`${f} 未提供 ${needle}（繁體頁會露简体）`) }
  }
  // 繁體頁必須顯式傳 zh-Hant（不能依賴預設值）
  const twPages = [
    'src/app/tw/hemun/Client.tsx',
    'src/app/tw/ziwei/Client.tsx',
    'src/app/tw/geo/Client.tsx',
    'src/app/tw/liunian/Client.tsx',
    'src/app/tw/chart/Client.tsx',
    'src/app/tw/daily/page.tsx',
    'src/app/tw/mingshu/MingShuContent.tsx',
    'src/app/tw/reports/[id]/Client.tsx',
  ]
  for (const f of twPages) {
    if (!read(f).includes('"zh-Hant"')) { cf++; fail(`${f} 未向共用元件下傳 zh-Hant`) }
  }
  if (cf === 0) ok(`${components.length} 个共用元件接受 locale；${twPages.length} 个繁體页显式下传 zh-Hant`)
}

// ---------- ⑤ sitemap ----------
console.log('—— ⑤ sitemap 收錄 ——')
{
  const { default: sitemap } = await import('../src/app/sitemap.ts')
  const urls = sitemap().map((e) => e.url)
  const need = ['/tw/hemun', '/tw/ziwei', '/tw/geo', '/tw/mingshu', '/tw/mingshu/demo',
    '/tw/daily', '/tw/pricing', '/tw/terms', '/tw/privacy', '/tw/jieqi', '/tw/jieri']
  const missing = need.filter((p) => !urls.some((u) => u.endsWith(p)))
  if (missing.length) fail(`sitemap 缺：${missing.join(', ')}`)
  else ok(`sitemap 已收錄新增的 ${need.length} 條繁體公開頁`)
  // 帳戶/交易頁不得進 sitemap（避免薄內容與隱私頁被索引）
  for (const p of ['/tw/auth', '/tw/charts', '/tw/reports', '/tw/chart']) {
    if (urls.some((u) => u.endsWith(p))) fail(`sitemap 不應收錄 ${p}（noindex 帳戶頁）`)
  }
}

// ---------- ⑥ 繁體文案純度 / 術語校正 ----------
console.log('—— ⑥ 繁體文案純度與術語 ——')
{
  // 只列「简体专用、且在繁體里不会作为正字出现」的字，避免 干/斗/丑/后/里 这类
  // 简繁同形或一简对多繁的字误伤（那些由 toHant 的术语保护单独处理）。
  const HANS_ONLY = new Set((
    '龙马鸡猪国门见说时东业为这个体运盘历势费农节气机关现话词种问题实际场长让认为会应该还号义阴阳买卖贵贱寿网岁师书学' +
    '张赵钱孙刘陈杨黄吴郑冯爱丽华萨别经区线发请输邮验确录页载链键选择换删闭开设览错复图标题类资讯记户转备环贡献识读听写谈谢继续显单双无与众优伤价传仅们够处务动压县参变叶吗员响块坚声夺奖妇妈娱婴宁军决冻净减几凤凭击则刚创劳勋协卫却厅吓启呜哑唤啰团园围圆圣坏坛坟垄垒垦垫壮壳妆姗娄婵嫒嫔宝宠审宪宾寝对寻导将尔尘尝尽层屉届属岁岂岗岘岛岭峡峦币帅帐帘帮带帧并广庄庆庐库庙庞废异弃弥弯弹强归当彻径忆忏忧怀态怂怅怆怜总恋恳恶恸恺恻恼悦悬惊惧惨惩惫惭惮惯愤愿慑懒' +
    '顶项顺须显险检简厉励扬执扩扫护报担拟拢拥择挂挤挥损据掷扰抚抢诉诊译试诚详语误诵课谁调诸读谜谨谱贝负贡财责贤败货质贩贪贫购贮贯贴贷贸贺贼贾赁资赋赌赎赏赐赔赖赚赛赞赠赢赶趋车轨轩转轮软轰轻载较辅辆辈辉辑辖辗辙边达迁过运还进远违连迟适选逊递逻遗遥邓邻酝酱释钉针钓钝钞钟钠钢钥钦钩钮钳钻铁铃铅铜铝银铸铺链销锁锄锅锋锐锚锡锣锤锦锯镀镁镇镑镖镜闪问闯闲间闵闻阀阁阅阐阔阕阙阳阴阵阶际陆陈陨随隐隶难雾静韦韧韩页顽顾顿颁颂预领颇颈颊频颓颖颗颜额颠颤飘飞饱饲饵饶饺饼饿馀馈馄馅馆馋馏马驭驮驯驰驱驳驴驶驷驹驻驼驾驿骂骄骆骇骋验骏骐骑骗骚骛骜骝骞骠骡骢骤骥鱼鲁鲂鲅鲆鲇鲈鲋鲍鲐鲑鲒鲔鲚鲛鲜鲞鲟鲠鲡鲢鲣鲥鲦鲨鲩鲫鲭鲮鲰鲱鲲鲳鲴鲵鲶鲷鲸鲻鲼鲽鳃鳄鳅鳆鳇鳊鳌鳍鳎鳏鳐鳓鳔鳕鳖鳗鳙鳜鳝鳞鳟鸟鸠鸡鸢鸣鸥鸦鸨鸩鸪鸭鸯鸳鸵鸽鸾鸿鹂鹃鹄鹅鹉鹊鹌鹏鹑鹕鹗鹘鹚鹜鹞鹤鹦鹧鹨鹩鹪鹫鹬鹭鹰黄黉齐齿龄龅龆龇龈龉龊龋龌龙龚龛龟'
  ).split(''))
  // 已知錯串：鬥=争斗，斗數的斗是北斗之斗；衝=衝動/衝擊，命理相冲一律用沖。
  const BAD_STRINGS = ['紫微鬥數', '鬥數', '屬龙', '屬马', '屬鸡', '屬猪',
    '衝合', '刑衝合害', '相衝', '衝太歲', '衝刑', '衝害', '醜未']

  const findHits = (text) => {
    // 「简体 / 简体版」是语言切换里对简体版的自称，属于有意保留，不是混用。
    const t = text.split('简体').join('')
    const hits = []
    for (const bad of BAD_STRINGS) if (t.includes(bad)) hits.push(`错串:${bad}`)
    for (const ch of t) if (HANS_ONLY.has(ch)) hits.push(`简体字:${ch}`)
    return [...new Set(hits)]
  }

  // 转换层常量断言：术语校正必须真的生效
  const cases = [
    ['紫微斗數', '紫微斗數'], ['紫微斗数', '紫微斗數'], ['北斗', '北斗'], ['斗柄', '斗柄'],
    ['冲合', '沖合'], ['刑冲合害', '刑沖合害'], ['相冲', '相沖'], ['子午相冲', '子午相沖'],
    ['冲太岁', '沖太歲'], ['冲动', '衝動'], ['冲突', '衝突'], ['冲击', '衝擊'],
    ['冲动用神', '沖動用神'], ['丑未冲', '丑未沖'], ['丑时', '丑時'],
    ['属龙', '屬龍'], ['属马', '屬馬'], ['属鸡', '屬雞'], ['属猪', '屬豬'],
  ]
  let tf = 0
  for (const [input, expect] of cases) {
    const got = toHant(input)
    if (got !== expect) { tf++; fail(`toHant('${input}') = '${got}'，期望 '${expect}'`) }
  }
  // 单字「冲」保持既有输出（单字太岁关系由 hantTaiSui 直接给「沖」，不受影响）
  if (toHant('冲') !== '衝') { tf++; fail('toHant(单字冲) 被改变，需重新审视 hantTaiSui') }
  for (const r of ['值', '冲', '害', '刑', '合']) {
    const got = hantTaiSui(r)
    const hits = findHits(got)
    if (hits.length) { tf++; fail(`hantTaiSui('${r}') = '${got}' 命中 ${hits.join(',')}`) }
  }
  if (tf === 0) ok(`${cases.length + 6} 条转换/术语常量断言通过`)

  // 源码里不得再出现已知错串（含注释，防止复制回潮）
  const twSrcFiles = []
  const walkTw = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name)
      if (e.isDirectory()) walkTw(p)
      else if (/\.(ts|tsx)$/.test(p)) twSrcFiles.push(p)
    }
  }
  walkTw(join(root, 'src/app/tw'))
  let sf = 0
  for (const p of twSrcFiles) {
    const src = readFileSync(p, 'utf8')
    for (const bad of BAD_STRINGS) {
      if (src.includes(bad)) { sf++; fail(`${p.replace(root, '')} 仍含错串「${bad}」`) }
    }
  }
  if (sf === 0) ok(`${twSrcFiles.length} 个 /tw 源码文件无已知错串`)

  // 构建产物 HTML：可见文案 + title/meta/属性；产物落后于源码时跳过（build 后复跑）
  const htmlFiles = []
  const twHtml = join(root, '.next/server/app/tw.html')
  if (existsSync(twHtml)) htmlFiles.push(twHtml)
  const twDir = join(root, '.next/server/app/tw')
  if (existsSync(twDir)) {
    const walkHtml = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name)
        if (e.isDirectory()) walkHtml(p)
        else if (p.endsWith('.html')) htmlFiles.push(p)
      }
    }
    walkHtml(twDir)
  }
  if (htmlFiles.length) {
    const newest = (files) => Math.max(...files.map((p) => statSync(p).mtimeMs))
    const newestSrc = Math.max(
      newest(twSrcFiles),
      statSync(join(root, 'src/lib/hant.ts')).mtimeMs,
      statSync(join(root, 'src/components/ShenshaCheck.tsx')).mtimeMs,
    )
    if (newest(htmlFiles) < newestSrc) {
      ok('构建产物早于本次源码，跳过 HTML 扫描（build 后复跑本脚本即可覆盖）')
    } else {
      let hf = 0
      for (const p of htmlFiles) {
        const html = readFileSync(p, 'utf8')
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<!--[\s\S]*?-->/g, '')
        const hits = findHits(html)
        if (hits.length) { hf++; fail(`${p.replace(root, '')} 命中 ${hits.slice(0, 12).join(', ')}`) }
      }
      if (hf === 0) ok(`${htmlFiles.length} 个 /tw 构建 HTML 无简体字/已知错串`)
    }
  } else {
    ok('未找到 /tw 构建产物，跳过 HTML 扫描（build 后复跑本脚本即可覆盖）')
  }

  // 牙口：人为注入必须翻红
  const injected = '<div>屬龙 紫微鬥數 衝合</div>'
  const injectedHits = findHits(injected)
  if (!injectedHits.includes('错串:屬龙') || !injectedHits.includes('错串:紫微鬥數') || !injectedHits.includes('错串:衝合')) {
    fail('牙口：注入「屬龙/紫微鬥數/衝合」未被断言捕获')
  } else {
    ok('牙口：注入简体/错串样本可触发 ⑥')
  }
}

// ---------- 牙口 ----------
console.log('—— 牙口自检 ——')
{
  let tf = 0
  if (/href="\/"/.test('href="/"')) tf++ // 判据本身可命中
  if (!read('src/components/BirthPlacePicker.tsx').includes('localize(')) { tf++; fail('牙口：BirthPlacePicker 没有 localize，④ 会假通过') }
  if (tf === 0) ok('牙口：内链/ locale 判据样本可触发')
}

console.log('\n' + (allPass ? 'HANT_PAGES_PASS' : 'HANT_PAGES_FAIL'))
process.exit(allPass ? 0 : 1)
