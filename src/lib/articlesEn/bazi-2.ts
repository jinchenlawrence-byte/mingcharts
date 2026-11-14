import type { ArticleEn } from './types'

// Batch 2 (2026-11-14): remaining bazi articles, Chinese source order.
export const baziPart2: ArticleEn[] = [
  {
    slug: 'dayun-liunian-zenme-kan',
    title: 'How to Read Luck Pillars and Annual Pillars: Ten Years at a Time, One Year at a Time',
    category: 'bazi',
    keywords: ['luck pillar', 'annual pillar', 'start of the luck cycle', 'ten year cycle'],
    description:
      'One Luck Pillar rules ten years, one Annual Pillar a year. This guide covers how Luck Pillars come from the month pillar, how the starting age is set, and how to read them.',
    sections: [
      {
        heading: '1. What a Luck Pillar Is',
        body: [
          'In bazi, the Luck Pillar (dayun) is the concept that describes the fortune of each stage of a life. One pillar covers ten years and is written as a Heavenly Stem above an Earthly Branch. Luck Pillars are derived from the month pillar: yang-year men and yin-year women run forward, yin-year men and yang-year women run backward.',
          'A person passes through roughly eight to ten Luck Pillars in a lifetime, covering everything from the start of the luck cycle to old age. A Luck Pillar sets the tone for ten years: a favorable cycle brings a decade of steady progress, a stalled cycle a decade in which it is wiser to hold ground.',
        ],
      },
      {
        heading: '2. When the Luck Cycle Begins',
        body: [
          'The luck cycle does not begin at birth. Instead, the number of days between the birth date and the nearest solar term is converted into the age at which the cycle starts. The old rule is "three days to one year": three days after birth counts as age one, six days as age two, and so on.',
          'Before the cycle begins, the month pillar is taken as the governing influence, and some schools use the year pillar instead. Calculating the exact year, month, day and hour at which the cycle starts requires a professional charting tool.',
        ],
      },
      {
        heading: '3. What Helps and What Harms in a Luck Pillar',
        body: [
          'When the elements of the Luck Pillar stem and branch match the elements the chart favors, the cycle is favorable; when they match the elements the chart avoids, the cycle stalls. But the stem and branch elements cannot be judged on their own: the clash, combination, punishment and harm between the Luck Pillar and the natal chart, and whether the pillar activates a favorable or an unfavorable element, must also be weighed.',
          'Zi Ping Zhen Quan sets out "six distinctions in reading a luck cycle", among them whether a chart pattern is completed or broken and how the favorable and unfavorable elements should be weighed, and it insists that luck and chart be read together, never in isolation.',
        ],
      },
      {
        heading: '4. How Annual Pillars Relate to Luck Pillars',
        body: [
          'The Annual Pillar governs the fortune of a single year, and it must be read together with the Luck Pillar and the natal chart. A favorable cycle with a favorable year brings a large gain; a favorable cycle with an unfavorable year, a small setback; an unfavorable cycle with a favorable year, a small reprieve; an unfavorable cycle with an unfavorable year, a year to guard against.',
          'Within the Annual Pillar the Heavenly Stem governs the first half of the year and the Earthly Branch the second half. When the Annual Pillar clashes with the day pillar in both stem and branch, this is the "natal year" or "clash with the year deity" (Tai Sui), a year of movement and change. When the Annual Pillar combines with and holds the favorable element the year is good; when it clashes with and breaks that element, the year is bad.',
        ],
      },
    ],
  },
  {
    slug: 'zhentaiyangshi',
    title: 'What Is True Solar Time, and Why a Chart Must Be Cast With It',
    category: 'bazi',
    keywords: ['true solar time', 'beijing time offset', 'longitude correction', 'birth hour'],
    description:
      'China runs on one clock, but a chart runs on the sun. Learn why Beijing time can be an hour or two off, the four minutes per degree correction, and the offsets for major cities.',
    sections: [
      {
        heading: '1. Why True Solar Time Must Be Corrected',
        body: [
          'China uses Beijing time throughout the country, the standard time of the 120th meridian east, yet the country is vast: it spans about 60 degrees of longitude from its easternmost point to its westernmost. Each degree of longitude is worth four minutes, and at the western edge, in Xinjiang, local time differs from Beijing time by roughly two hours.',
          'Bazi sets the hour pillar by the actual position of the sun. If the hour is wrong, the hour pillar is wrong, and the whole chart may come out completely different. This matters most for people born right at a boundary between hours, such as 2:50 or 4:55, who need exact correction.',
        ],
      },
      {
        heading: '2. How to Convert to True Solar Time',
        body: [
          'The formula is: true solar time = Beijing time + (local longitude - 120) x 4 minutes. East of the 120th meridian east the correction is added; west of it, subtracted.',
          'Offsets for common cities: Shanghai about +6 minutes, Hangzhou about +1 minute, Beijing about -15 minutes, Guangzhou about -27 minutes, Xi\'an about -44 minutes, Chengdu about -64 minutes, Urumqi about -128 minutes.',
        ],
      },
      {
        heading: '3. What to Do When the Birth Hour Is Uncertain',
        body: [
          'If the birth hour is uncertain, cast charts for the two neighboring hours and work backward from major events that have already happened. Qian Li Ming Gao records several methods for fixing the hour, such as the position of the whorl on the crown of the head, facial features, and a person\'s rank among the siblings.',
          'The hour strongly affects the chart pattern, especially the question of which day the late Zi hour (23:00-24:00) belongs to, which different schools handle differently. A professional charting tool is recommended.',
        ],
      },
    ],
  },
  {
    slug: 'haiwai-chusheng-paipan',
    title: 'Born Abroad: Time Zones, Daylight Saving and True Solar Time Before You Cast a Chart',
    category: 'bazi',
    keywords: [
      'chart for overseas birth',
      'time zone conversion',
      'daylight saving time',
      'true solar time',
      'birth longitude',
    ],
    description:
      'Born abroad, the clock time must first be turned into true solar time. Time zones, daylight saving and longitude each shift the hour; four worked examples show by how many minutes.',
    sections: [
      {
        heading: '1. Three Things Most Often Got Wrong When the Birth Was Abroad',
        body: [
          'Casting a chart does not begin with the Four Pillars. It begins with restoring the moment of birth to the true position of the sun in the sky. For someone born abroad this step goes wrong most easily: get the time zone, daylight saving time or longitude wrong at any one point, and the hour may land in the neighboring slot.',
          'The first point: the time zone of the birthplace is not Beijing time. US Eastern Standard Time is UTC-5 and UTC-4 in summer; Britain is UTC+0 in winter and UTC+1 in summer. Treating the local clock reading as UTC+8 is the same as moving the birth several thousand kilometers away.',
          'The second point: during daylight saving time the clock runs one hour ahead of standard time. A birth certificate records the clock reading of that moment, which includes daylight saving time; casting a chart uses standard time plus a longitude correction. The two cannot be mixed.',
          'The third point: the gap between the longitude of the birthplace and the central meridian of its time zone. The earth is divided into a time zone every 15 degrees, and each degree of longitude moves solar noon by four minutes. The further east or west a city sits, the larger this difference becomes.',
        ],
      },
      {
        heading: '2. How Much "Calculating by Beijing Time" Actually Gets Wrong, Worked Out',
        body: [
          'There is only one formula: true solar time equals the local clock time plus (birthplace longitude minus the actual UTC offset in hours at that place and moment multiplied by 15) multiplied by 4 minutes. The four examples below are computed with the same function and rounded to the minute.',
          'Shanghai, 121°28\'12" east, 15 June 1992. China had already suspended daylight saving time, so the offset was UTC+8 and the central meridian 120° east. The two differ by 1°28\'12", which at four minutes per degree rounds to 6 minutes. Shanghai lies east of the central meridian, so solar noon comes six minutes earlier than clock noon.',
          'New York, 74°0\'36" west, 15 January 1990. Winter runs on standard time, UTC-5, and the central meridian is 75° west. The two differ by 0°59\'24", which rounds to 4 minutes.',
          'The same city on 15 July 1990: New York is on daylight saving time at UTC-4, so the central meridian becomes 60° west. Against 74°0\'36" the gap is 14°0\'36", which rounds to -56 minutes. One longitude, and only because of daylight saving time, turns a result of +4 minutes into -56 minutes.',
          'One more example is easy to overlook. Shanghai on 15 June 1990 fell inside China\'s daylight saving period, with an offset of UTC+9 and a central meridian of 135° east. Against 121°28\'12" the gap is 13°31\'48", which rounds to -54 minutes.',
          'Compared with +6 minutes in the same month of 1992, that is 60 minutes apart, exactly one hour. For a birth time sitting on the edge of an hour, that hour is enough to push the hour pillar into the neighboring one.',
        ],
      },
      {
        heading: '3. What True Solar Time Actually Corrects',
        body: [
          'True solar time corrects the difference between clock time and the position of the sun; it does not convert local time into Beijing time. The sun stands at its highest point due south at local noon, while the clock 12 o\'clock is defined by the central meridian of the time zone. The gap between the two is the correction.',
          'The four minutes in the formula comes from the rotation of the earth: 360 degrees to 24 hours means 15 degrees an hour and one degree every four minutes. Each degree of longitude difference is multiplied by four minutes; east of the central meridian is positive, west of it negative.',
          'One point should be stated plainly: this site uses mean solar time as an approximation and does not apply the equation of time, which leaves an error of within plus or minus 16 minutes. That is sufficient for casting a bazi chart. The equation of time comes from the angle between the orbital plane of the earth and its axis of rotation and swings by up to sixteen minutes either way across the year; correcting it belongs to a higher level of precision.',
          'The result is therefore not an exact instant to the second but a correction of one item, the longitude offset. For most birth times a few minutes will not change the hour; for times that fall on a boundary, those minutes decide everything.',
        ],
      },
      {
        heading: '4. What to Do If You Were Born During Daylight Saving Time',
        body: [
          'Daylight saving time is not a permanent historical convention of adding one hour; it is a set of rules that changes by year and by region. The United States has observed it since 1967, under the Uniform Time Act passed in 1966; China applied it between 1986 and 1991; Europe, Australia and South America each have their own start and end years and months.',
          'There is only one standard to apply: what rule the birthplace actually followed in the year and month of birth. Running the modern calendar backward twenty or thirty years often goes wrong. US states also differ in their attitude to daylight saving time, so places on the same latitude but in different states may follow different rules.',
          'In practice this takes two steps. First establish whether the birthplace was on daylight saving time at that moment; if it was, turn the clock back one hour to get standard time. Then take the standard UTC offset that applied there at the time and put it into the formula for the longitude correction. The order of the two steps cannot be reversed.',
          'The conversion on this site decides automatically from the birth date: the program reads the actual offset that applied in the time zone of the birthplace at that moment, including every historical daylight saving change, rather than applying current rules. So the birthplace must be entered down to the city or the specific time zone; a country alone is often not enough.',
        ],
      },
      {
        heading: '5. Four Things to Confirm Before Casting the Chart',
        body: [
          'First, the longitude of the birthplace. Naming the city is not enough; where a city spans a wide area, take the specific coordinates, precise to the minute. Each degree of longitude is four minutes of correction, so entering the wrong city changes the result directly.',
          'Second, the time zone and daylight saving status of that time. Note the standard offset that corresponds to the birth year and confirm whether daylight saving time was in force that year. Together they decide the central meridian, and with it the direction and size of the correction.',
          'Third, the source of the birth time. A birth certificate or hospital record outranks family memory; spoken times are often rounded to the hour or half hour. Where the exact hour is uncertain, mark it as uncertain and watch the hour boundaries when casting.',
          'Fourth, the order of conversion. First turn the clock back for daylight saving time to get standard time, then apply the longitude correction to get true solar time, and only then fix the hour and set out the Four Pillars. Get the order wrong and every later step follows it wrong.',
          'Only once all four points are confirmed does the chart have a reliable starting point. However detailed the later analysis of chart pattern, Ten Gods and Luck Pillars, if the input time is wrong the conclusions are only deductions built on a faulty foundation.',
        ],
      },
    ],
  },
]
