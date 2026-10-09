// 命理辅助数据：生肖、本命佛、星座、纳音、二十八星宿等

// 生肖（按地支）
export const ZODIAC: Record<string, { name: string; benmingfo: string; element: string }> = {
  '子': { name: '鼠', benmingfo: '千手观音菩萨', element: '水' },
  '丑': { name: '牛', benmingfo: '虚空藏菩萨', element: '土' },
  '寅': { name: '虎', benmingfo: '虚空藏菩萨', element: '木' },
  '卯': { name: '兔', benmingfo: '文殊菩萨', element: '木' },
  '辰': { name: '龙', benmingfo: '普贤菩萨', element: '土' },
  '巳': { name: '蛇', benmingfo: '普贤菩萨', element: '火' },
  '午': { name: '马', benmingfo: '大势至菩萨', element: '火' },
  '未': { name: '羊', benmingfo: '大日如来', element: '土' },
  '申': { name: '猴', benmingfo: '大日如来', element: '金' },
  '酉': { name: '鸡', benmingfo: '不动尊菩萨', element: '金' },
  '戌': { name: '狗', benmingfo: '阿弥陀佛', element: '土' },
  '亥': { name: '猪', benmingfo: '阿弥陀佛', element: '水' }
}

// 星座
export interface Constellation {
  name: string
  start: [number, number] // [月, 日]
  end: [number, number]
}

export const CONSTELLATIONS: Constellation[] = [
  { name: '摩羯座', start: [12, 22], end: [1, 19] },
  { name: '水瓶座', start: [1, 20], end: [2, 18] },
  { name: '双鱼座', start: [2, 19], end: [3, 20] },
  { name: '白羊座', start: [3, 21], end: [4, 19] },
  { name: '金牛座', start: [4, 20], end: [5, 20] },
  { name: '双子座', start: [5, 21], end: [6, 21] },
  { name: '巨蟹座', start: [6, 22], end: [7, 22] },
  { name: '狮子座', start: [7, 23], end: [8, 22] },
  { name: '处女座', start: [8, 23], end: [9, 22] },
  { name: '天秤座', start: [9, 23], end: [10, 23] },
  { name: '天蝎座', start: [10, 24], end: [11, 22] },
  { name: '射手座', start: [11, 23], end: [12, 21] }
]

export function getConstellation(month: number, day: number): string {
  for (const c of CONSTELLATIONS) {
    const [sm, sd] = c.start
    const [em, ed] = c.end
    if (sm === em) {
      if (month === sm && day >= sd && day <= ed) return c.name
    } else {
      // 跨年的星座（摩羯座）
      if ((month === sm && day >= sd) || (month === em && day <= ed)) return c.name
    }
  }
  return '摩羯座'
}

// 纳音五行（六十甲子）
export const NA_YIN: Record<string, string> = {
  '甲子': '海中金', '乙丑': '海中金', '丙寅': '炉中火', '丁卯': '炉中火',
  '戊辰': '大林木', '己巳': '大林木', '庚午': '路旁土', '辛未': '路旁土',
  '壬申': '剑锋金', '癸酉': '剑锋金', '甲戌': '山头火', '乙亥': '山头火',
  '丙子': '涧下水', '丁丑': '涧下水', '戊寅': '城头土', '己卯': '城头土',
  '庚辰': '白蜡金', '辛巳': '白蜡金', '壬午': '杨柳木', '癸未': '杨柳木',
  '甲申': '泉中水', '乙酉': '泉中水', '丙戌': '屋上土', '丁亥': '屋上土',
  '戊子': '霹雳火', '己丑': '霹雳火', '庚寅': '松柏木', '辛卯': '松柏木',
  '壬辰': '长流水', '癸巳': '长流水', '甲午': '砂石金', '乙未': '砂石金',
  '丙申': '山下火', '丁酉': '山下火', '戊戌': '平地木', '己亥': '平地木',
  '庚子': '壁上土', '辛丑': '壁上土', '壬寅': '金箔金', '癸卯': '金箔金',
  '甲辰': '覆灯火', '乙巳': '覆灯火', '丙午': '天河水', '丁未': '天河水',
  '戊申': '大驿土', '己酉': '大驿土', '庚戌': '钗钏金', '辛亥': '钗钏金',
  '壬子': '桑柘木', '癸丑': '桑柘木', '甲寅': '大溪水', '乙卯': '大溪水',
  '丙辰': '沙中土', '丁巳': '沙中土', '戊午': '天上火', '己未': '天上火',
  '庚申': '石榴木', '辛酉': '石榴木', '壬戌': '大海水', '癸亥': '大海水'
}

// 二十八星宿（按出生日期，简化版）
const XIU_ORDER = ['角', '亢', '氐', '房', '心', '尾', '箕', '斗', '牛', '女', '虚', '危', '室', '壁', '奎', '娄', '胃', '昴', '毕', '觜', '参', '井', '鬼', '柳', '星', '张', '翼', '轸']

export function getXiu(month: number, day: number): string {
  // 简化计算：以立春为起点，实际应用需精确
  const baseMonth = 2
  const baseDay = 4
  let days = 0
  for (let m = baseMonth; m < month; m++) {
    days += new Date(2000, m, 0).getDate()
  }
  days += day - baseDay
  if (days < 0) days += 365
  return XIU_ORDER[days % 28]
}

// 三世书财运（简化版，按出生日）
export const SAN_SHI_CAI = [
  '正禄：勤俭成富，祖业福禄薄弱，一分一毫皆靠自己劳力赚取',
  '向禄：离乡别井，外出发展，财运亨通，中年后家业渐丰',
  '成禄：福禄双全，祖业丰厚，一生衣食无忧，财运稳定',
  '开禄：财源广进，善于经营，有商业天赋，可成大富',
  '禄库：财库丰盈，善于守财，积蓄丰厚，晚年富足',
  '耗禄：财来财去，不宜投机，宜稳扎稳打，量入为出',
  '天禄：天降之财，常有意外收获，偏财运佳',
  '病禄：财运多舛，需防破财，宜节俭度日，勿贪外财',
  '背禄：背井离乡方得财，异地发展有转机',
  '死禄：财禄浅薄，宜以技艺立身，勿强求财富',
  '亡禄：财禄空亡，不宜经商，宜工薪稳定',
  '建禄：财禄渐丰，早年辛苦，中年后财运渐开'
]

export function getSanShiCai(day: number): string {
  return SAN_SHI_CAI[(day - 1) % SAN_SHI_CAI.length]
}

// 根据年柱地支获取生肖
export function getZodiac(yearZhi: string) {
  return ZODIAC[yearZhi] || { name: '未知', benmingfo: '未知', element: '未知' }
}

// 根据年柱干支获取纳音
export function getNaYin(yearGanZhi: string): string {
  return NA_YIN[yearGanZhi] || '未知'
}

// 年柱天干地支计算（以立春为界，这里简化按公历年份）
export function getYearGanZhi(year: number): string {
  const ganIdx = ((year - 4) % 10 + 10) % 10
  const zhiIdx = ((year - 4) % 12 + 12) % 12
  const gans = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const zhis = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  return gans[ganIdx] + zhis[zhiIdx]
}
