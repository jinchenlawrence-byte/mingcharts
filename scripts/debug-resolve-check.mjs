// 临时校验：27 座拟增华人城市能否从 world-cities.json 唯一解析（跑完即删）
import { readFileSync } from 'node:fs'
import { parseWorld } from '../src/lib/worldCitiesParse.ts'

const world = parseWorld(JSON.parse(readFileSync('public/data/world-cities.json', 'utf8')))
const WANT = [
  ['槟城', 'George Town', 'MY'], ['怡保', 'Ipoh', 'MY'], ['新山', 'Johor Bahru', 'MY'], ['马六甲', 'Malacca', 'MY'],
  ['古晋', 'Kuching', 'MY'], ['亚庇', 'Kota Kinabalu', 'MY'],
  ['棉兰', 'Medan', 'ID'], ['泗水', 'Surabaya', 'ID'], ['三宝垄', 'Semarang', 'ID'], ['坤甸', 'Pontianak', 'ID'], ['万隆', 'Bandung', 'ID'],
  ['曼德勒', 'Mandalay', 'MM'], ['达沃', 'Davao', 'PH'], ['普吉', 'Phuket', 'TH'], ['合艾', 'Hat Yai', 'TH'],
  ['斯里巴加湾市', 'Bandar Seri Begawan', 'BN'],
  ['横滨', 'Yokohama', 'JP'], ['神户', 'Kobe', 'JP'], ['仁川', 'Incheon', 'KR'],
  ['蒙特雷帕克', 'Monterey Park', 'US', 'California'], ['阿罕布拉', 'Alhambra', 'US', 'California'],
  ['罗兰岗', 'Rowland Heights', 'US', 'California'], ['库比蒂诺', 'Cupertino', 'US', 'California'],
  ['旺市', 'Vaughan', 'CA'], ['伯明翰', 'Birmingham', 'GB'], ['普拉托', 'Prato', 'IT'], ['瓦伦西亚', 'Valencia', 'ES'],
]
for (const [cn, wn, cc, admin] of WANT) {
  let hits = world.flat.filter(c => c.countryCode === cc && (c.ascii === wn || c.name === wn))
  if (hits.length > 1 && admin) hits = hits.filter(c => c.admin1Name.includes(admin))
  console.log(hits.length === 1
    ? `✓ ${cn} ← ${hits[0].name}(${hits[0].admin1Name},${hits[0].lat},${hits[0].lng})`
    : `✗ ${cn} 命中 ${hits.length}: ${hits.slice(0, 4).map(h => h.name + '(' + h.admin1Name + ')').join('、')}`)
}
