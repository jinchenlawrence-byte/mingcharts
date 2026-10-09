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