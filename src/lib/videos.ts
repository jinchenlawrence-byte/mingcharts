// 站内视频嵌入的影片 ID（2026-11-21）
//
// ★ 这里只登记 ID，不决定哪个页面挂哪支：接入与否在各页 page.tsx 里白名单式判断。
// ★ 只存 11 位影片 ID；分享令牌（?si=）与 UTM 一律不进这个文件。
// ★ 2026-11-21 只接入《大運》一篇；《2027 丁未年運勢：十干定位》先登记，不接页面。

export const VIDEO_IDS = {
  /** 《2027 丁未年運勢：十干定位》——第一支長片，本次不接入 */
  dingwei2027: 'fOBeM6s6rw8',
  /** 《大運》4:05——第二支長片，接入 /article/2027-dingwei-nian-yunshi */
  dayun: '0Adgmlc9sGo',
} as const

export type VideoKey = keyof typeof VIDEO_IDS
