'use client'

import { useState } from 'react'
import { track } from '@/lib/track'
import type { SiteLang } from '@/lib/lang'

// 站内视频嵌入（2026-11-21）：静帧 poster + 播放按钮，点击后才挂 iframe。
//
// 取舍：
//   · 点击前零 YouTube 请求——不预连、不预载 iframe，只有本地 poster 一张图；
//   · 外层 aspect-video 先占住高度，点击换成绝对定位的 iframe，CLS 为 0；
//   · 无 JS 时按钮点不动，用 <noscript> 给一条纯链接直接去 YouTube；
//   · YouTube 不认 UTM，来源靠 video_poster_click 的 page_path/slot 分辨（见 lib/track.ts）。

export default function VideoEmbed({
  videoId,
  title,
  locale,
  slot,
  poster,
}: {
  videoId: string
  title: string
  locale: SiteLang
  slot: string
  poster: string
}) {
  const [playing, setPlaying] = useState(false)

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
  // hl/cc_lang_pref 固定繁中：频道受众以繁体为主，简体页也优先繁中字幕
  const embedUrl =
    `https://www.youtube-nocookie.com/embed/${videoId}` +
    '?playsinline=1&rel=0&hl=zh-Hant&cc_lang_pref=zh-Hant&autoplay=1'

  const start = () => {
    track('video_poster_click', {
      page_path: window.location.pathname.slice(0, 120),
      video_id: videoId,
      locale,
      slot,
    })
    setPlaying(true)
  }

  return (
    <div className="mx-auto mb-6 w-full max-w-[720px] px-4 sm:px-0">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-gold/15 bg-paper-dark/40">
        {playing ? (
          <iframe
            src={embedUrl}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={start}
            aria-label={`播放影片：${title}`}
            className="group absolute inset-0 flex items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={poster}
              alt=""
              width={1280}
              height={720}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white transition-colors group-hover:bg-black/70">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-1 h-7 w-7 fill-current">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>
      <noscript>
        <p className="mt-2 text-sm text-ink-light">
          {locale === 'zh-Hant' ? '瀏覽器未開啟 JavaScript，' : '浏览器未开启 JavaScript，'}
          <a href={watchUrl} className="hw-c-link" target="_blank" rel="noopener noreferrer">
            {locale === 'zh-Hant' ? '直接在 YouTube 觀看這支影片' : '直接在 YouTube 观看这支视频'}
          </a>
          。
        </p>
      </noscript>
    </div>
  )
}
