// 实测 API：真太阳时 + 出生地
const post = async (url, body) => {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return r.json()
}

const ziwei = await post('http://localhost:3000/api/ziwei', {
  year: 1990, month: 5, day: 8, hour: 16, minute: 30, gender: 1, birthplace: '成都'
})
console.log('=== 紫微 API ===')
console.log('trueSolar:', JSON.stringify(ziwei.data?.trueSolar))
console.log('lunarDate:', ziwei.data?.chart?.lunarDate)

const paipan = await post('http://localhost:3000/api/paipan', {
  year: 1990, month: 5, day: 8, hour: 16, minute: 30, gender: 1, birthplace: '成都'
})
console.log('\n=== 八字 API ===')
console.log('trueSolar:', JSON.stringify(paipan.data?.trueSolar))
console.log('时柱:', paipan.data?.pillars?.hour?.ganZhi)

const paipanNoCity = await post('http://localhost:3000/api/paipan', {
  year: 1990, month: 5, day: 8, hour: 16, minute: 30, gender: 1
})
console.log('无城市时柱:', paipanNoCity.data?.pillars?.hour?.ganZhi, '| trueSolar:', paipanNoCity.data?.trueSolar)

// 跨时辰边界验证：乌鲁木齐 -130 分钟，17:00 → 14:50（申时→未时）
const edge = await post('http://localhost:3000/api/paipan', {
  year: 1990, month: 5, day: 8, hour: 17, minute: 0, gender: 1, birthplace: '乌鲁木齐'
})
console.log('\n=== 边界验证（乌鲁木齐 17:00）===')
console.log('trueSolar:', JSON.stringify(edge.data?.trueSolar), '| 时柱:', edge.data?.pillars?.hour?.ganZhi, '（应从未时）')

const geo = await post('http://localhost:3000/api/geo', {
  year: 1990, month: 5, day: 8, hour: 16, minute: 30, gender: 1, birthplace: '绵阳'
})
console.log('\n=== Geo API ===')
console.log('birthplace:', JSON.stringify(geo.data?.geo?.birthplace))
