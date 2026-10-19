/* eslint-disable no-undef */
// 明理 Service Worker（手写，根作用域 /）
//
// 职责仅三类监听，刻意【不做任何 HTML/API 缓存】：
//   install / activate —— 立即接管，跳过等待
//   fetch —— network-first 直通（满足 Chrome 可安装判据：有 fetch handler 即可）
//   push / notificationclick —— Web Push 展示与点击跳转
//
// ★ 必须放在 public/sw.js（root scope '/'）：放 src/ 会被 Next 特殊处理、scope 出错。
const SW_VERSION = 'mingli-sw-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// network-first 直通：不加缓存。命理内容与 API 一律走网络，避免陈旧数据。
// 仅接管【同源 GET】，其余（跨域字体/图片、非 GET）交浏览器默认处理。
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  if (new URL(req.url).origin !== self.location.origin) return
  event.respondWith(fetch(req))
})

// Web Push：服务端发来 JSON { title, body, url }
self.addEventListener('push', (event) => {
  let payload = { title: '明理', body: '今日日运已更新', url: '/daily' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch (e) {
    // 非 JSON 载荷：保留默认文案
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/pwa/icon-192.png',
      badge: '/pwa/icon-192.png',
      tag: SW_VERSION + '-daily',
      data: { url: payload.url || '/daily' },
    })
  )
})

// 点击通知：聚焦已有窗口或新开
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/daily'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          c.navigate(url)
          return c.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
