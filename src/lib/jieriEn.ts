// English copy for the ten traditional Chinese festivals.
//
// Structure mirrors src/lib/jieriData.ts one-to-one: the same ten slugs and the same fields
// (name / lunarDate / solarRange / alias / intro / customs / bazi / lucky). Dates and the
// Chinese source stay in jieriData.ts; this file is the English language layer only.
//
// Rule: no CJK here. Festival names and terms are rendered in English or pinyin.

export interface JieRiEn {
  slug: string
  name: string
  lunarDate: string
  solarRange: string
  alias: string
  intro: string
  customs: string[]
  bazi: string
  lucky: string
}

export const JIERI_EN: JieRiEn[] = [
  {
    slug: 'chunjie',
    name: 'Spring Festival',
    lunarDate: 'First day of the first lunar month',
    solarRange: 'Late January to mid or late February',
    alias: 'Chinese New Year, Lunar New Year, the New Year',
    intro:
      'The Spring Festival is the most important traditional festival in China and marks the start of the lunar year. From New Year’s Eve to the Lantern Festival it runs for more than twenty days, a season for family reunion, farewell to the old year, and offerings to gods and ancestors.',
    customs: [
      'Pasting spring couplets, the character for fortune and paper cuttings, and setting off firecrackers, today often electronic ones',
      'The New Year’s Eve dinner, staying up past midnight and giving children red envelopes',
      'Visiting relatives on the first day, wearing new clothes and exchanging greetings',
      'Returning to the wife’s family on the second day; on the fifth day welcoming the wealth god and reopening shops',
      'Dumplings in the north, rice cakes and glutinous rice balls in the south, symbols of treasure and rising fortune',
    ],
    bazi:
      'In Bazi, note carefully: the Spring Festival on the first day of the first lunar month is not the boundary of the zodiac animal. The animal and the year pillar follow Start of Spring. If Start of Spring falls after the Spring Festival, anyone born between the festival and Start of Spring still belongs to the previous animal; only after Start of Spring does the year pillar change. This is the most common mistake in casting a chart.',
    lucky:
      'The first day is for welcoming blessing: wear red, paste the fortune character and speak auspicious words. The fifth day welcomes the wealth god and is good for cleaning, opening a business and setting the year’s plans. Those said to offend the Grand Duke of Jupiter that year often make offerings early in the year for peace.',
  },
  {
    slug: 'yuanxiao',
    name: 'Lantern Festival',
    lunarDate: 'Fifteenth day of the first lunar month',
    solarRange: 'February to March',
    alias: 'Shangyuan Festival, Festival of Lights, Little First Month',
    intro:
      'The Lantern Festival is the first full-moon night of the year and the closing high point of the Spring Festival. The ancients called night xiao and the first month yuan, hence yuanxiao. In Daoist tradition it is Shangyuan, the day when the Heavenly Official bestows blessings.',
    customs: [
      'Viewing lanterns, guessing lantern riddles and walking through lantern fairs',
      'Eating yuanxiao or tangyuan, round dumplings that stand for reunion',
      'Dragon and lion dances, stilt walking and rowing the land boat',
      'In some regions, walking to dispel illness and “stealing the green”',
      'In the past, young men and women met while viewing lanterns, which makes it one of China’s traditional “Valentine’s Days”',
    ],
    bazi:
      'On the fifteenth night the full moon draws the tide, so Water and Fire — moonlight and lantern light — meet. In Bazi the mood is one of completion and reunion; the day favours mending relationships and strengthening family harmony.',
    lucky:
      'Lantern light is said to boost yang qi, and round dumplings symbolise completeness. Single people are advised to walk the lantern fair, traditionally a good time to invite a proper partner; families can eat together and speak of good things.',
  },
  {
    slug: 'duanwu',
    name: 'Dragon Boat Festival',
    lunarDate: 'Fifth day of the fifth lunar month',
    solarRange: 'June',
    alias: 'Duan Yang, Double Fifth, Duanwu',
    intro:
      'The Dragon Boat Festival falls in midsummer. It commemorates the patriotic poet Qu Yuan and was also an ancient season for driving out evil, warding off plague and praying for health. In 2009 it became China’s first festival inscribed on the UNESCO intangible cultural heritage list.',
    customs: [
      'Racing dragon boats, eating zongzi and drinking realgar wine',
      'Hanging mugwort and sweet flag at the door to repel evil and plague',
      'Wearing scented sachets and five-colour threads, with children wearing small gourds',
      'Bathing in water boiled with mugwort, the so-called orchid bath',
      'In older custom, “hiding from the noonday” and hanging pictures of Zhong Kui to drive out the five poisons',
    ],
    bazi:
      'The fifth lunar month is the Wu month, when yang qi and Fire are at their most intense; it was called the evil month, and the fifth day the evil day. In Bazi terms the festival sits at a peak of Fire and yang. Charts that dislike Fire should rest quietly that day, while strong-Fire charts should calm the Heart, lower Fire and avoid impulse.',
    lucky:
      'Hang mugwort and sweet flag at the door to purify the entrance, and wear a sachet or five-colour thread for protection. At noon, when yang peaks, sit quietly to nourish the Heart and bathe in mugwort water; avoid quarrels, anger and risky travel.',
  },
  {
    slug: 'qixi',
    name: 'Qixi Festival',
    lunarDate: 'Seventh day of the seventh lunar month',
    solarRange: 'August',
    alias: 'Festival of the Weaver Girl, Qiqiao, Chinese Valentine’s Day',
    intro:
      'Qixi comes from the romance of the Cowherd and the Weaver Girl, who meet once a year across the Milky Way on a bridge of magpies. It symbolises love. In the past, women prayed to the Weaver Star that night for skill in needlework and for a good marriage, hence the name Qiqiao, “praying for skill”.',
    customs: [
      'Women thread needles by moonlight to pray for skill and display their needlework',
      'Eating qiaoguo pastries and offering melons and fruit',
      'Watching the stars at night and praying for a good match',
      'Today it has become a Chinese Valentine’s Day, when couples meet and exchange gifts',
      'Folk custom also includes airing books and clothes and storing “double-seven water”',
    ],
    bazi:
      'In Bazi, marriage is read chiefly from the spouse palace, the day branch, and the spouse star — wealth for a man, officer for a woman — with Peach Blossom, Red Phoenix and Heavenly Joy as secondary indicators. Qixi is a fitting day to pray for a proper match or to deepen a relationship, but the root of any bond is still decided by the chart and the annual Peach Blossom.',
    lucky:
      'Single people may make a wish under the stars and wear rose quartz or rhodonite to strengthen Peach Blossom; couples may exchange keepsakes. Peach Blossom can be inside or outside the marriage, so married people should deepen their bond rather than invite outside attention.',
  },
  {
    slug: 'zhongyuan',
    name: 'Zhongyuan Festival',
    lunarDate: 'Fifteenth day of the seventh lunar month',
    solarRange: 'August',
    alias: 'Ghost Festival, Ullambana, Seventh Month Half',
    intro:
      'Zhongyuan is the traditional day for honouring ancestors and releasing wandering spirits. With New Year’s Eve, Clear and Bright and Double Ninth it forms the four great ancestral festivals of China. Daoists call it Zhongyuan and Buddhists call it Ullambana; its core is remembrance, universal compassion and gratitude to forebears.',
    customs: [
      'Tending ancestral graves and burning paper offerings, with civilised memorial practices now encouraged',
      'Floating river and lotus lanterns to guide wandering spirits',
      'Daoist rites and Buddhist Ullambana ceremonies in temples',
      'Offering food to lonely spirits, the so-called universal salvation',
      'Folk custom avoids weddings, moving house and late-night outings during the seventh month',
    ],
    bazi:
      'Folk belief holds that the seventh lunar month, the Shen month, is a time of shifting qi and growing yin, which is why it stresses reverence and good deeds. In Bazi terms the festival falls in the Shen month, when Metal begins to rule; the season is better used for remembering ancestors and cultivating the mind than for fear.',
    lucky:
      'The day is suited to honouring ancestors, doing good works and floating lanterns with prayers. Folk custom advises care, avoiding late-night risk and water activities during the month, especially for pregnant women, young children and the frail. Its real purpose is to remind people to respect nature and settle body and mind.',
  },
  {
    slug: 'zhongqiu',
    name: 'Mid-Autumn Festival',
    lunarDate: 'Fifteenth day of the eighth lunar month',
    solarRange: 'September to October',
    alias: 'Moon Festival, Reunion Festival, Eighth Month Festival',
    intro:
      'The Mid-Autumn Festival falls in the middle of autumn, on the night of the full moon, and is second only to the Spring Festival as a festival of reunion. The ancients offered to the moon, admired it and bowed to it, expressing deep feelings of family reunion and longing for absent loved ones.',
    customs: [
      'Family reunion, moon viewing and eating mooncakes',
      'Offerings to the moon, with osmanthus wine and seasonal fruit',
      'Playing with flower lanterns, guessing riddles, drinking osmanthus wine and eating taro',
      'In southern Fujian, the Mid-Autumn dice game for cakes',
      'Travellers write poems to the moon, as in the famous line wishing that loved ones far away may share the same moonlight',
    ],
    bazi:
      'Mid-Autumn falls in the You month, mid-autumn when Metal is strong, and the fifteenth is the full moon. In Bazi the full moon stirs Water qi, and strong Metal produces Water, so the day’s climate is clear and moist. The festival emphasises reunion and harmony, favouring family relationships and the joining of couples.',
    lucky:
      'Gather with family and admire the moon; mooncakes symbolise completeness. Wishes for family harmony and a smooth marriage are well made under the full moon. Because the full moon begins to wane, the custom also reminds people to be content and avoid arrogance.',
  },
  {
    slug: 'chongyang',
    name: 'Double Ninth Festival',
    lunarDate: 'Ninth day of the ninth lunar month',
    solarRange: 'October',
    alias: 'Double Nine, Senior Citizens’ Day, Climbing High Festival, Dogwood Festival',
    intro:
      'The Book of Changes treats nine as a yang number, and the ninth day of the ninth month doubles it, hence Double Ninth. The day traditionally involves climbing high, viewing chrysanthemums and drinking wine; it is now also Senior Citizens’ Day, expressing respect for elders and wishes for long life.',
    customs: [
      'Climbing high for distant views and autumn outings',
      'Viewing chrysanthemums, drinking chrysanthemum wine and wearing dogwood',
      'Eating Double Ninth cake, whose name sounds like “high” and suggests rising step by step',
      'Honouring and visiting elders',
      'Returning to visit parents, with ancestral offerings in some regions',
    ],
    bazi:
      'Double Ninth falls in the Xu month, late autumn, and nine is the extreme yang number, so the day marks yang at its height before it turns. In Bazi it is a day of firm yang qi: climbing high connects with heaven qi and avoids stale qi, while dogwood and chrysanthemum answer the austere Metal of autumn and pray for health.',
    lucky:
      'A good day to climb, walk in nature and free the flow of qi, and to wear a dogwood sachet or drink chrysanthemum tea or wine. It is suited to honouring elders and praying for parents’ long life, and to adding blessings for the older members of the household.',
  },
  {
    slug: 'laba',
    name: 'Laba Festival',
    lunarDate: 'Eighth day of the twelfth lunar month',
    solarRange: 'January',
    alias: 'Buddha’s Enlightenment Day, Laba Offering, Dharma Treasure Festival',
    intro:
      'The Laba Festival falls on the eighth day of the twelfth lunar month and opens the run-up to the Spring Festival. It is said to be the day of the Buddha’s enlightenment. Families cook Laba congee and pickle Laba garlic; once Laba is past, the New Year begins, and the festive mood grows from here.',
    customs: [
      'Cooking Laba congee, eating it together and sharing it with neighbours',
      'Pickling Laba garlic for the New Year dumplings',
      'Eating Laba noodles or wheat-grain rice, which varies by region',
      'Temples distribute congee, and the faithful make offerings and pray',
      'Starting to buy New Year goods and clean the house for the new year',
    ],
    bazi:
      'Laba falls in the Chou month, late winter, when cold is at its strongest and all things are stored away. In Bazi this is the time of cold Water and frozen Earth, which most needs Fire to warm it. Laba congee gathers the heat of the five grains, and temple incense adds warmth — both echo the idea of warming the chart.',
    lucky:
      'A hot bowl of congee warms body and stomach and gathers the qi of the grains, making this a good day for winter tonics and prayers. It suits a year-end review, charity and gratitude, storing merit for the coming year.',
  },
  {
    slug: 'xiaonian',
    name: 'Little New Year',
    lunarDate: '23rd (north) or 24th (south) of the twelfth lunar month',
    solarRange: 'January to February',
    alias: 'Kitchen God Festival, Farewell Festival',
    intro:
      'Little New Year is the dress rehearsal and opening of the Spring Festival, centred on sending off the Kitchen God and sweeping the house. From this day people buy New Year goods, clean their homes and paste paper cuttings, entering the busy run-up to the festival.',
    customs: [
      'Offering to the Kitchen God with malt sugar so that he reports good things in heaven',
      'Sweeping the house; the word for dust sounds like “old”, so the cleaning means out with the old',
      'Cutting window paper, writing spring couplets, bathing and haircuts',
      'Eating kitchen candy, dumplings and rice cakes',
      'A folk saying that men do not bow to the moon and women do not offer to the Kitchen God',
    ],
    bazi:
      'Little New Year falls in the Chou month near the end of the year. Bazi values the idea of leaving the old and welcoming the new; the custom of sweeping away dust and the old year mirrors clearing stale qi and making room for the new year’s vitality.',
    lucky:
      'A good day for a thorough clean and clearing clutter, which feng shui calls sweeping the house clean; bathe and cut hair to meet the new year fresh. Make offerings to the Kitchen God and give thanks for the year’s protection, and speak auspicious words.',
  },
  {
    slug: 'chuxi',
    name: 'New Year’s Eve',
    lunarDate: 'Last day of the twelfth lunar month',
    solarRange: 'January to February',
    alias: 'Great New Year’s Night, the Passing of the Year',
    intro:
      'New Year’s Eve is the last night of the lunar year: chu means to remove the old year and xi means night. It is the most important reunion night for Chinese families, when the whole household gathers to see the year out and welcome the spring.',
    customs: [
      'Pasting spring couplets and door gods, hanging lanterns and dressing the house anew',
      'The family reunion dinner — dumplings in the north, fish and rice cakes in the south, fish standing for surplus year after year',
      'Staying up to midnight and setting off fireworks to see out the old year',
      'Elders give children red envelopes to press down evil spirits',
      'At midnight, welcoming the gods and the wealth god, and exchanging New Year greetings',
    ],
    bazi:
      'New Year’s Eve is the key night when the qi of the old and new years changes hands. Note that the formal change of the Bazi year pillar still follows Start of Spring; New Year’s Eve crosses the lunar year. Staying up is about sending off the old and guarding health and blessing; at a turn of qi, a good heart matters most.',
    lucky:
      'The whole family should gather, speak auspiciously and avoid quarrels or tears, crossing the year in the most peaceful state possible. At midnight, make a quiet wish, bathe and change clothes, wear red and new things. Avoid breaking objects or speaking words of ill omen.',
  },
]

export function getJieRiEn(slug: string): JieRiEn | undefined {
  return JIERI_EN.find((j) => j.slug === slug)
}
