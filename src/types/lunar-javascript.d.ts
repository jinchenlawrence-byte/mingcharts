declare module 'lunar-javascript' {
  export class Solar {
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Solar
    getLunar(): Lunar
    getYear(): number
    getMonth(): number
    getDay(): number
    next(days: number): Solar
  }

  export class Lunar {
    getYearInGanZhi(): string
    getMonthInGanZhi(): string
    getDayInGanZhi(): string
    getTimeInGanZhi(): string
    toFullString(): string
    getEightChar(): EightChar
    getJieQiTable(): Record<string, Solar>
  }

  export class EightChar {
    /** 流派：1＝晚子时（23:00 换日）；2＝民用日 00:00（库默认）。详见 paipan.ts 换日约定注释 */
    setSect(sect: number): void
    getYear(): string
    getMonth(): string
    getDay(): string
    getTime(): string
    getTaiYuan(): string
    getMingGong(): string
    getShenGong(): string
    getYun(sex: number): Yun
    /** 十二长生（此支对日干所处阶段）：CHANG_SHENG_OFFSET 表 + 阳加阴减 mod 12 */
    getYearDiShi(): string
    getMonthDiShi(): string
    getDayDiShi(): string
    getTimeDiShi(): string
    /** 空亡（该柱干支所在旬空二支，如「子丑」；日柱版按 sect 处理晚子时） */
    getYearXunKong(): string
    getMonthXunKong(): string
    getDayXunKong(): string
    getTimeXunKong(): string
  }

  export class Yun {
    getStartYear(): number
    getStartMonth(): number
    getStartDay(): number
    getDaYun(): DaYun[]
  }

  export class DaYun {
    getGanZhi(): string
    getStartAge(): number
    getStartYear(): number
    getEndYear(): number
  }
}