// 现居城市影响实测
const post = async (body) => {
  const r = await fetch('http://localhost:3000/api/geo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return r.json()
}

// 案例：1990-5-8 16:30 男（壬水日主），出生地广州，现居成都
const r1 = await post({
  year: 1990, month: 5, day: 8, hour: 16, minute: 30, gender: 1,
  birthplace: '广州', currentCity: '成都'
})
console.log('=== 案例1：壬水日主，出生广州，现居成都 ===')
const cc1 = r1.data?.geo?.currentCity
console.log('dayMaster:', r1.data?.geo?.dayMaster, r1.data?.geo?.wangShuai, '| 喜用:', r1.data?.geo?.favorableWx.join(''))
console.log('currentCity:', cc1 && `${cc1.name} 主${cc1.wx}${cc1.wx2 ? '/次' + cc1.wx2 : ''} ${cc1.godRelation} ${cc1.favorable ? '喜用' : '忌神'} ${cc1.score}分【${cc1.level}】${cc1.direction} 约${cc1.distanceKm}km`)
cc1?.effects?.forEach(f => console.log('  ·', f))
cc1?.advice?.forEach(f => console.log('  建议:', f))
console.log('AI currentCity 段字数:', r1.data?.ai?.currentCity?.length ?? 0, '| aiSource:', r1.data?.aiSource)

// 案例2：不提供现居城市（回归测试：不应报错、无 currentCity）
const r2 = await post({
  year: 1990, month: 5, day: 8, hour: 16, minute: 30, gender: 1, birthplace: '广州'
})
console.log('\n=== 案例2：不提供现居城市（回归） ===')
console.log('currentCity:', r2.data?.geo?.currentCity, '| AI段为空:', r2.data?.ai?.currentCity === '')

// 案例3：现居忌神城市（换强旺命例试吉/忌两态）
const r3 = await post({
  year: 1992, month: 8, day: 15, hour: 9, minute: 0, gender: 0,
  birthplace: '哈尔滨', currentCity: '深圳'
})
console.log('\n=== 案例3：另一命例，出生哈尔滨，现居深圳 ===')
const g3 = r3.data?.geo
const cc3 = g3?.currentCity
console.log('dayMaster:', g3?.dayMaster, g3?.wangShuai, '| 喜用:', g3?.favorableWx.join(''))
console.log('currentCity:', cc3 && `${cc3.name} 主${cc3.wx} ${cc3.godRelation} ${cc3.favorable ? '喜用' : '忌神'} ${cc3.score}分【${cc3.level}】${cc3.direction} 约${cc3.distanceKm}km`)
