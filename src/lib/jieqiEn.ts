// English copy for the 24 solar terms.
//
// Structure mirrors src/lib/jieqiData.ts one-to-one: the same 24 slugs, the same fields
// (name / season / type / dateRange / monthZhi / monthName / meaning / hou / custom /
// yangsheng / bazi). Slugs, solar longitudes and month branches come from the Chinese
// source; this file holds only the English language layer.
//
// Rule: no CJK here. Branches are rendered as pinyin (Yin, Mao, Chen ...).

export type JieQiSeasonEn = 'Spring' | 'Summer' | 'Autumn' | 'Winter'
export type JieQiTypeEn = 'Node' | 'Middle qi'

export interface JieQiEn {
  slug: string
  name: string
  season: JieQiSeasonEn
  type: JieQiTypeEn
  dateRange: string
  monthZhi?: string
  monthName?: string
  meaning: string
  hou: [string, string, string]
  custom: string
  yangsheng: string
  bazi: string
}

export const JIEQI_EN: JieQiEn[] = [
  // ============ Spring ============
  {
    slug: 'lichun',
    name: 'Start of Spring',
    season: 'Spring',
    type: 'Node',
    dateRange: '3–5 February',
    monthZhi: 'Yin',
    monthName: 'the first lunar month (Yin month)',
    meaning:
      'Start of Spring opens the 24 solar terms and is the true beginning of the year in Bazi. The sun reaches 315° of ecliptic longitude, yang qi stirs, all things begin to grow, and the elemental climate of the new year turns over on this day.',
    hou: [
      'The east wind thaws the ice',
      'Hibernating insects begin to stir',
      'Fish rise beneath the melting ice',
    ],
    custom:
      'Biting the spring — eating spring pancakes and spring rolls — whipping the spring ox, wearing spring ribbons and welcoming the season with offerings to the grain god. Families also observe “hiding from spring” to avoid clashing with the new qi, and paste spring couplets wishing for a smooth year.',
    yangsheng:
      'Wellness at Start of Spring centres on growth: go to bed a little later, rise early, stretch the sinews and spend time outdoors to meet the spring qi. Eat less sour and more sweet to nourish the Stomach and Spleen — chives, bamboo shoots and sprouts. Keep the mood open and easy, because suppressed anger injures the Liver.',
    bazi:
      'Key point: Start of Spring is the boundary of the zodiac animal and the year pillar. Anyone born between 1 January and the moment of Start of Spring still belongs to the previous animal. For example, a birth before Start of Spring on 4 February 2026 is still a Snake (Yi Si year); only after that moment does the Horse (Bing Wu) year begin. The month pillar also changes here, entering the Yin month.',
  },
  {
    slug: 'yushui',
    name: 'Rain Water',
    season: 'Spring',
    type: 'Middle qi',
    dateRange: '18–20 February',
    meaning:
      'At Rain Water the sun reaches 330°. Ice and snow melt, precipitation increases, temperatures climb, and the world turns from cold to warm, moistening everything that grows.',
    hou: [
      'Otters begin to fish and arrange their catch like offerings',
      'Wild geese return north',
      'Grass and trees stir into growth',
    ],
    custom:
      'In western Sichuan, godparents are formally chosen for children, and married daughters return home with gifts to “receive long life” for their parents — both prayers for healthy children and long-lived elders.',
    yangsheng:
      'Dampness grows as warm and cold alternate. Protect the Spleen, drain dampness and guard yang qi. Do not shed winter clothes too early against late cold snaps; eat warm, mild food and avoid raw, cold or greasy dishes — Chinese yam, barley and red dates suit the season.',
    bazi:
      'Rain Water is the middle qi of the Yin month and does not change the month. Those born now already have a new year pillar from Start of Spring, while the month pillar remains Yin. Wood grows stronger with the season and water feeds wood, so Wood Day Masters gain support.',
  },
  {
    slug: 'jingzhe',
    name: 'Awakening of Insects',
    season: 'Spring',
    type: 'Node',
    dateRange: '5–7 March',
    monthZhi: 'Mao',
    monthName: 'the second lunar month (Mao month)',
    meaning:
      'At Awakening of Insects the sun reaches 345°. The first thunder sounds and wakes the insects that have hibernated underground: the weather warms, thunder rolls and life stirs everywhere.',
    hou: [
      'Peach trees come into blossom',
      'Orioles begin to sing',
      'Hawks turn into doves as the hawk’s cry fades',
    ],
    custom:
      'Offerings to the White Tiger to defuse gossip and quarrels, “beating the petty person” to drive out bad luck, and eating pears — the name sounds like separation from pests. Some regions stretch new drum skins on this day.',
    yangsheng:
      'Yang qi rises and Liver qi is strong. Follow the Liver’s nature: sleep early, rise early, and keep meals light with plant protein and vitamins. Pears, lily bulbs and white fungus moisten the Lungs against dryness; watch for flu, allergies and irritability.',
    bazi:
      'Key point: Awakening of Insects begins the Mao month (mid-spring), when Wood is at its peak because Mao is pure Wood. Jia and Yi Day Masters gain strength from the season; charts that dislike Wood may meet obstruction this month. Mao is also where Peach Blossom rules, governing romance and social charm.',
  },
  {
    slug: 'chunfen',
    name: 'Spring Equinox',
    season: 'Spring',
    type: 'Middle qi',
    dateRange: '20–22 March',
    meaning:
      'At the Spring Equinox the sun reaches 0° and stands directly over the equator: day and night are nearly equal and cold and heat are balanced. Afterwards the northern hemisphere’s days lengthen, yin and yang are half and half, and all things flourish.',
    hou: [
      'Swallows return',
      'Thunder begins to sound',
      'The first lightning appears',
    ],
    custom:
      'The egg-standing game, eating spring greens, flying kites, and the ancient imperial rite of offering to the sun at the eastern suburb — all express the season’s balance of yin and yang.',
    yangsheng:
      'The theme is balance: harmonise yin and yang, qi and blood. Avoid very heating or very cooling food and aim for the middle; keep regular hours and moderate exercise; stay emotionally even and avoid sharp swings of mood.',
    bazi:
      'Spring Equinox is the middle qi of the Mao month and does not change the month. Those born now have strong Wood fed by Water; the classical insistence on balance echoes the equinox’s equal day and night. The Useful God is, in essence, whatever balances warmth and cold in the chart.',
  },
  {
    slug: 'qingming',
    name: 'Clear and Bright',
    season: 'Spring',
    type: 'Node',
    dateRange: '4–6 April',
    monthZhi: 'Chen',
    monthName: 'the third lunar month (Chen month)',
    meaning:
      'At Clear and Bright the sun reaches 15°. The air is clear, the light bright and the plants lush. It is both a solar term and the festival for tending graves and honouring ancestors.',
    hou: [
      'Paulownia begins to flower',
      'Field mice turn into quails as yang grows',
      'Rainbows first appear',
    ],
    custom:
      'Sweeping ancestral graves and making offerings, spring outings, wearing willow branches, flying kites and swinging. The day holds both solemn remembrance and the pleasure of being close to nature.',
    yangsheng:
      'Rain and dampness are common. Nourish the Liver, protect the Spleen and dispel damp-cold. Eat Liver-friendly, Lung-soothing foods such as shepherd’s purse, spinach and white fungus; allergy sufferers should guard against pollen, and mourners should avoid prolonged grief.',
    bazi:
      'Key point: Clear and Bright begins the Chen month (late spring). Chen is damp Earth and the Water reservoir, holding Wu Earth, Yi Wood and Gui Water. Earth begins to rule; Chen-month charts carry a water storehouse and tend to be damp, often needing Bing Fire to warm the structure.',
  },
  {
    slug: 'guyu',
    name: 'Grain Rain',
    season: 'Spring',
    type: 'Middle qi',
    dateRange: '19–21 April',
    meaning:
      'At Grain Rain the sun reaches 30°. The name means “rain gives birth to a hundred grains”. The last solar term of spring brings markedly more rain, exactly when seedlings and newly sown crops need it.',
    hou: [
      'Duckweed begins to grow',
      'The cuckoo calls and preens its feathers',
      'Hoopoes descend on the mulberry trees',
    ],
    custom:
      'Drinking Grain Rain tea, eating Chinese toon, viewing peonies, offerings to Cangjie — the legendary inventor of writing, said to have brought a grain rain from heaven — and, along the coast, sacrifices to the sea for a good catch.',
    yangsheng:
      'Dampness increases. Strengthen the Spleen, drain dampness and build blood and qi. Barley, adzuki beans, toon and bean sprouts are good choices; keep clothes dry and watch for joint and nerve pain, the so-called Grain Rain ailments.',
    bazi:
      'Grain Rain is the middle qi of the Chen month and does not change the month. Earth grows while Water remains plentiful, since Chen is the Water reservoir. Chen-month charts often need Fire to warm them and Earth to control Water, though the whole chart decides.',
  },

  // ============ Summer ============
  {
    slug: 'lixia',
    name: 'Start of Summer',
    season: 'Summer',
    type: 'Node',
    dateRange: '5–7 May',
    monthZhi: 'Si',
    monthName: 'the fourth lunar month (Si month)',
    meaning:
      'At Start of Summer the sun reaches 45°. Summer begins, all things grow larger, temperatures rise sharply, thunderstorms increase and crops enter their vigorous season.',
    hou: [
      'Frogs begin to croak',
      'Earthworms come out',
      'Snake gourds grow',
    ],
    custom:
      'Weighing people to check whether winter fat has been lost, eating Start of Summer eggs and Start of Summer rice, egg-cracking contests, and tasting the first three fruits — cherries, green plums and wheat — all pray for a safe summer.',
    yangsheng:
      'Nourish the Heart, which resonates with summer. Calm the mind, avoid agitation and anger; eat lightly with more sour and less bitter flavours, and take plenty of vegetables, fruit and whole grains. A short midday rest feeds the Heart; avoid sweating so heavily that yang qi is drained.',
    bazi:
      'Key point: Start of Summer begins the Si month (early summer). Si is yin Fire holding Bing Fire, Geng Metal and Wu Earth, and Fire grows. Bing and Ding Day Masters come into season, while Fire as wealth or officer shows results this month. Si is also a Traveling Horse for Monkey, Rat and Dragon charts, signalling movement.',
  },
  {
    slug: 'xiaoman',
    name: 'Grain Buds',
    season: 'Summer',
    type: 'Middle qi',
    dateRange: '20–22 May',
    meaning:
      'At Grain Buds the sun reaches 60°. In the north the grain of summer crops swells but is not yet ripe, hence “small full”. In the south the saying is “Grain Buds, rivers full”, as rain becomes abundant.',
    hou: [
      'Sow thistle comes into flower',
      'Delicate grasses wither',
      'The wheat harvest arrives',
    ],
    custom:
      'Offerings to the cart gods of water, oil and silk reeling for irrigation, eating bitter herbs, and silkworm offerings in sericulture villages — prayers for water and harvest.',
    yangsheng:
      'Heat and dampness intensify. Guard against damp-heat and protect the Spleen and Stomach. Keep food light: winter melon, bitter melon and mung beans clear heat and drain dampness. Avoid heavy meat, raw food and excess spice, and watch for eczema and stomach complaints.',
    bazi:
      'Grain Buds is the middle qi of the Si month and does not change the month. Its philosophy — full but not overflowing, content with enough — mirrors the classical warning that excess invites loss. A chart is best when the five elements are balanced rather than lopsided.',
  },
  {
    slug: 'mangzhong',
    name: 'Grain in Ear',
    season: 'Summer',
    type: 'Node',
    dateRange: '5–7 June',
    monthZhi: 'Wu',
    monthName: 'the fifth lunar month (Wu month)',
    meaning:
      'At Grain in Ear the sun reaches 75°. Awned wheat is ready to reap and awned rice ready to plant; the name also puns on “busy planting”, the farmer’s busiest season and the true start of midsummer.',
    hou: [
      'Mantises are born',
      'Shrikes begin to call',
      'The mockingbird falls silent',
    ],
    custom:
      'Sending off the flower god as blossom ends, village offerings for a good harvest, and boiling green plums in wine.',
    yangsheng:
      'Hot weather and summer dampness combine. Prevent heatstroke and drain dampness, clear the Heart and dispel irritability. With long days, sleep later and rise earlier, adding a midday nap; eat watermelon, smoked plum and barley to clear summer heat and generate fluids, and avoid over-chilling the body.',
    bazi:
      'Key point: Grain in Ear begins the Wu month (midsummer). Wu is the peak of yang Fire, holding Ding Fire and Ji Earth. Bing and Ding Day Masters are strong; the classics say summer Fire blazes and usually needs Ren or Gui Water for seasonal adjustment. Wu is also Peach Blossom for Tiger, Horse and Dog charts.',
  },
  {
    slug: 'xiazhi',
    name: 'Summer Solstice',
    season: 'Summer',
    type: 'Middle qi',
    dateRange: '21–22 June',
    meaning:
      'At the Summer Solstice the sun reaches 90° and stands over the Tropic of Cancer: the northern hemisphere has its longest day and shortest night. Yang reaches its height and begins to decline as yin is born — “one yin is born at the Summer Solstice”.',
    hou: [
      'Deer shed their antlers',
      'Cicadas begin to sing',
      'Pinellia sprouts',
    ],
    custom:
      'Eating noodles — “dumplings at the Winter Solstice, noodles at the Summer Solstice” — eating zongzi, and the ancient imperial rite of offering to the Earth at the northern suburb; some regions weigh themselves and avoid haircuts.',
    yangsheng:
      'Protect yang and nourish the Heart: just as yin is born at the peak of yang, yang qi must be guarded. Eat lightly with bitter and sour flavours to clear the Heart and lower Fire; calm the breath and the mind, avoid outbursts, and do not overdo cold drinks while preventing heatstroke.',
    bazi:
      'The Summer Solstice is the middle qi of the Wu month and does not change the month. “One yin is born” illustrates the principle that extremes reverse: an element that is excessively strong and uncontrolled turns harmful, as when Fire too strong burns Wood or Water too much floats Wood. Harmony and flow are prized.',
  },
  {
    slug: 'xiaoshu',
    name: 'Minor Heat',
    season: 'Summer',
    type: 'Node',
    dateRange: '6–8 July',
    monthZhi: 'Wei',
    monthName: 'the sixth lunar month (Wei month)',
    meaning:
      'At Minor Heat the sun reaches 105°. Heat begins: the weather turns hot but has not yet reached its worst. Thunderstorms are frequent and the dog days are near.',
    hou: [
      'Warm winds arrive',
      'Crickets move indoors',
      'Young hawks begin to hunt',
    ],
    custom:
      'Tasting the new grain, eating dumplings and chilled noodles, airing books and clothes against mould, and playing chess to pass the heat; the counting of the dog days begins.',
    yangsheng:
      'Prevent heat and protect Heart yang. “A calm mind brings its own coolness”: avoid going out in the hottest afternoon hours. Eat melons, bean sprouts and lotus root to clear heat, replace water and salt, limit icy food and protect sleep.',
    bazi:
      'Key point: Minor Heat begins the Wei month (late summer). Wei is dry Earth holding Ji Earth, Ding Fire and Yi Wood — the Wood storehouse. Earth is strong and dry, so charts usually need Water to moisten and Metal to release the show. Wei clashes with Chou; Goat and Ox charts should take note.',
  },
  {
    slug: 'dashu',
    name: 'Major Heat',
    season: 'Summer',
    type: 'Middle qi',
    dateRange: '22–24 July',
    meaning:
      'At Major Heat the sun reaches 120°. This is the hottest stretch of the year, when damp and heat together reach their peak, with severe heat, heavy rain and frequent drought or flood.',
    hou: [
      'Fireflies hatch from rotting grass',
      'The earth is damp and the air steams',
      'Great rains fall from time to time',
    ],
    custom:
      'Drinking dog-day tea, sun-drying ginger, burning dog-day incense, eating grass jelly and pineapple, and sending off the “Major Heat boat” — all to clear heat and pray for health.',
    yangsheng:
      'Clear summer heat and drain dampness, boost qi and nourish yin. Mung bean soup, winter melon soup and lotus-leaf congee are classic; avoid long hours of outdoor labour and watch for air-conditioning sickness, stomach trouble and heatstroke. Exercise in early morning or evening.',
    bazi:
      'Major Heat is the middle qi of the Wei month and does not change the month. With Fire at its strongest, classical texts treat seasonal adjustment as urgent and Water as the first Useful God. Charts born around Major Heat that are hot and dry with no drop of Water tend to be lopsided.',
  },

  // ============ Autumn ============
  {
    slug: 'liqiu',
    name: 'Start of Autumn',
    season: 'Autumn',
    type: 'Node',
    dateRange: '7–9 August',
    monthZhi: 'Shen',
    monthName: 'the seventh lunar month (Shen month)',
    meaning:
      'At Start of Autumn the sun reaches 135°. Autumn begins and heat gives way to cool, though an “autumn tiger” often lingers. Growth turns toward ripeness and gathering; yang qi withdraws and yin grows.',
    hou: [
      'Cool winds arrive',
      'White dew forms',
      'Cicadas sing their cold song',
    ],
    custom:
      '“Putting on autumn fat” by eating meat, “biting the autumn” with watermelon, sun-drying the harvest, and offerings to the earth god for a good crop.',
    yangsheng:
      'Nourish the gathering phase: go to bed early and rise early, calming the spirit. Food should enrich yin and moisten the Lungs, with less pungent and more sour flavour — pears, lily bulbs, honey and sesame. Guard against early autumn dryness in the airways and skin, and avoid sadness.',
    bazi:
      'Key point: Start of Autumn begins the Shen month (early autumn). Shen is yang Metal holding Geng Metal, Ren Water and Wu Earth, and Metal begins to rule. Geng and Xin Day Masters come into season. Shen is a Traveling Horse for Tiger, Horse and Dog charts, bringing movement, and is also where Water is born.',
  },
  {
    slug: 'chushu',
    name: 'End of Heat',
    season: 'Autumn',
    type: 'Middle qi',
    dateRange: '22–24 August',
    meaning:
      'At End of Heat the sun reaches 150°. “Chu” means to stop: the heat ends here. Temperatures fall and clear, crisp autumn weather begins to appear.',
    hou: [
      'Hawks begin to hunt and arrange their prey',
      'Heaven and earth turn austere',
      'Grain ripens for harvest',
    ],
    custom:
      'Floating river lanterns for ancestors, the fishing-season opening festival, brewing medicinal tea, and eating duck.',
    yangsheng:
      'Moisten the Lungs, strengthen the Spleen and counter autumn fatigue. Get enough sleep, including a short nap; eat white fungus, lily bulb, lotus seed and duck to clear heat and calm the spirit; as day and night temperatures diverge, add clothing in good time.',
    bazi:
      'End of Heat is the middle qi of the Shen month and does not change the month. Shen Metal rules and hides Ren Water; strong Metal produces Water, so Water quietly gathers. Charts that favour Metal and Water gain support, while charts that favour Wood and Fire enter a more restrained season.',
  },
  {
    slug: 'bailu',
    name: 'White Dew',
    season: 'Autumn',
    type: 'Node',
    dateRange: '7–9 September',
    monthZhi: 'You',
    monthName: 'the eighth lunar month (You month)',
    meaning:
      'At White Dew the sun reaches 165°. Yin grows heavier and night moisture condenses on plants as white dewdrops, hence the name. The weather truly turns cool and autumn deepens.',
    hou: [
      'Wild geese arrive',
      'Swallows leave',
      'Birds store food for winter',
    ],
    custom:
      'Collecting morning dew, drinking White Dew tea, brewing White Dew rice wine, eating longan and honouring Yu the Great. The saying “at White Dew, do not bare the body” marks the start of careful keeping warm.',
    yangsheng:
      'Nourish yin and moisten dryness, guarding against both cold and dryness. Add clothing morning and evening and keep the abdomen, feet and neck covered. Eat pears, white fungus, honey and bird’s nest to moisten the Lungs, and prevent dry nose and throat and itchy skin.',
    bazi:
      'Key point: White Dew begins the You month (mid-autumn). You is pure Metal, where Metal is strongest. Geng and Xin Day Masters are strong; strong Metal controls Wood, so Wood Day Masters are restrained. Classical texts say autumn Metal in season usually needs Fire to forge it or Water to release it. You is Peach Blossom for Snake, Rooster and Ox charts.',
  },
  {
    slug: 'qiufen',
    name: 'Autumn Equinox',
    season: 'Autumn',
    type: 'Middle qi',
    dateRange: '22–24 September',
    meaning:
      'At the Autumn Equinox the sun reaches 180° and again stands over the equator: day and night are equal and cold and heat are balanced. Afterwards the northern hemisphere’s nights lengthen, autumn colour deepens and the chill grows.',
    hou: [
      'Thunder ceases',
      'Insects seal their burrows',
      'Water begins to dry up',
    ],
    custom:
      'The ancient rite of offering to the moon, from which the Mid-Autumn Festival grew; the egg-standing game, eating autumn greens, giving pictures of the autumn ox, and flying kites. The day is now also China’s Farmers’ Harvest Festival.',
    yangsheng:
      'Balance yin and yang and nourish yin against dryness. Keep regular hours and an inward, settled mood; cultivate optimism against the season’s austerity. Harmonise warm and cool foods — sesame, walnut, glutinous rice and lotus root are gentle and moistening.',
    bazi:
      'The Autumn Equinox is the middle qi of the You month and does not change the month. Mirroring the Spring Equinox, it is the year’s second balance point. When Metal is strong its nature shows most clearly: righteousness, decision and austerity, yet it must be forged by Fire to become a vessel, and Geng Metal likes Ding Fire.',
  },
  {
    slug: 'hanlu',
    name: 'Cold Dew',
    season: 'Autumn',
    type: 'Node',
    dateRange: '8–9 October',
    monthZhi: 'Xu',
    monthName: 'the ninth lunar month (Xu month)',
    meaning:
      'At Cold Dew the sun reaches 195°. Temperatures fall further and the dew itself is cold, hence the name. Autumn turns from cool to cold; the north is already deep in autumn, with white clouds, red leaves and occasional early frost.',
    hou: [
      'Wild geese arrive as guests',
      'Sparrows enter the great water and become clams',
      'Chrysanthemums bloom yellow',
    ],
    custom:
      'Climbing high, viewing chrysanthemums, drinking chrysanthemum wine, eating flower cakes, wearing dogwood and watching red leaves — a last outing before the harvest is stored away.',
    yangsheng:
      'Moisten the Lungs, generate fluids, strengthen the Spleen and Stomach. Keep the feet warm — “at Cold Dew the feet stay covered” — and soak them in hot water. Eat Chinese yam, lotus root, lily bulb and persimmon; guard against colds and low mood.',
    bazi:
      'Key point: Cold Dew begins the Xu month (late autumn). Xu is dry Earth and the Fire storehouse, holding Wu Earth, Xin Metal and Ding Fire. Earth and Metal are strong while Fire is stored away; the Chen–Xu clash is called “opening the storehouse”. Charts that favour Fire find hidden help in Xu’s Ding Fire, while charts that favour Water feel the drag of dry Earth.',
  },
  {
    slug: 'shuangjiang',
    name: 'Frost’s Descent',
    season: 'Autumn',
    type: 'Middle qi',
    dateRange: '23–24 October',
    meaning:
      'At Frost’s Descent the sun reaches 210°, the last solar term of autumn. It grows colder, dew freezes into frost, all things complete their growth and prepare to withdraw before winter; leaves yellow and fall.',
    hou: [
      'Jackals hunt and arrange their prey',
      'Grass and trees yellow and shed',
      'Hibernating insects all bow down',
    ],
    custom:
      'Eating persimmons, viewing chrysanthemums, climbing high for distant views, and tonifying the body — “better to tonify at Frost’s Descent than at the start of winter”. Folk custom especially values persimmons on this day.',
    yangsheng:
      'A good season for tonics: strengthen the Spleen, nourish yin, moisten dryness and protect the Stomach. Chestnuts, radish, duck and persimmons in moderation suit. Keep the stomach and abdomen warm, prevent cold legs and joint pain, and exercise moderately without heavy sweating.',
    bazi:
      'Frost’s Descent is the middle qi of the Xu month and does not change the month. Xu is a Fire storehouse and dry Earth; Earth and Metal are strong and Fire is gathered away. Charts that want Fire but have little find a root in Xu’s storehouse. The punishments and clashes among the four storehouses Chen, Xu, Chou and Wei are key to reading charts born this month.',
  },

  // ============ Winter ============
  {
    slug: 'lidong',
    name: 'Start of Winter',
    season: 'Winter',
    type: 'Node',
    dateRange: '7–8 November',
    monthZhi: 'Hai',
    monthName: 'the tenth lunar month (Hai month)',
    meaning:
      'At Start of Winter the sun reaches 225°. Winter begins, all things store themselves and withdraw from the cold. Water starts to freeze and the ground to harden; daylight keeps shrinking, yang hides and yin reaches its height.',
    hou: [
      'Water begins to freeze',
      'The ground begins to harden',
      'Pheasants enter the great water and become clams',
    ],
    custom:
      '“Tonifying the winter” with dumplings in the north and glutinous rice, chicken, duck and fish elsewhere; ancestral offerings and family feasts — “tonify at Start of Winter to fill the mouth” and store energy for the cold.',
    yangsheng:
      'The theme is storage: go to bed early, rise late and wait for daylight, gathering yin and protecting yang. Warm tonics are appropriate — lamb, walnut, chestnut and black sesame nourish the Kidneys. Keep back and feet warm, stop exercise at a light sweat and avoid over-spending energy.',
    bazi:
      'Key point: Start of Winter begins the Hai month (early winter). Hai is where Water is born, holding Ren Water and Jia Wood. Water starts to rule; Ren and Gui Day Masters come into season. Classical texts say winter Water is cold and congealed and most needs Bing Fire to thaw it. Hai is also where Wood is born and a Traveling Horse for Snake, Rooster and Ox charts.',
  },
  {
    slug: 'xiaoxue',
    name: 'Minor Snow',
    season: 'Winter',
    type: 'Middle qi',
    dateRange: '22–23 November',
    meaning:
      'At Minor Snow the sun reaches 240°. Snow begins in the north but stays light and melts by day, hence “minor snow”. Temperatures keep falling and the world closes into deep winter.',
    hou: [
      'Rainbows are hidden and unseen',
      'Heaven qi rises and earth qi sinks',
      'All is closed and winter is complete',
    ],
    custom:
      'Curing bacon and sausages, eating glutinous rice cakes, drying fish and sharing the fresh-kill soup of the Tujia people — laying in preserved food for winter.',
    yangsheng:
      'Warm the Kidneys, preserve essence and steady the mood. Short daylight can bring low spirits, so seek sunshine and company. Eat warming tonics and black foods such as black beans, black sesame and black fungus to nourish the Kidneys, and avoid excess hot, dry food.',
    bazi:
      'Minor Snow is the middle qi of the Hai month and does not change the month. Water grows and cold deepens. Charts born in Hai or Zi months are often cold and damp; without Bing or Ding Fire to adjust them they can look like “cold water with no flame”, and the person may need to supply Fire deliberately through work, direction and conduct.',
  },
  {
    slug: 'daxue',
    name: 'Major Snow',
    season: 'Winter',
    type: 'Node',
    dateRange: '6–8 December',
    monthZhi: 'Zi',
    monthName: 'the eleventh lunar month (Zi month)',
    meaning:
      'At Major Snow the sun reaches 255°. Snow becomes more likely and heavier and can lie on the ground, hence “major snow”. Midwinter begins in earnest and temperatures fall markedly.',
    hou: [
      'The heather bird stops calling',
      'Tigers begin to mate',
      'Blades of grass push through',
    ],
    custom:
      'Curing meat, watching rivers freeze over, eating sweet-potato congee and taking winter tonics of lamb and beef — “tonify at Major Snow and you can fight a tiger in spring”.',
    yangsheng:
      'Warm tonics, avoiding cold, nourishing the Kidneys and storing essence. Sleep early and rise late, keep head, neck and back warm; eat lamb, beef, Chinese yam and goji berries, exercise without exposure to wind and cold, and keep the mood settled.',
    bazi:
      'Key point: Major Snow begins the Zi month (midwinter). Zi is pure Water, where Water is strongest. Ren and Gui Day Masters are strong; strong Water is cold, and classical texts make Bing Fire the first Useful God for Zi-month charts. The Zi–Wu clash and the Zi–Mao punishment are key to judging this month’s luck.',
  },
  {
    slug: 'dongzhi',
    name: 'Winter Solstice',
    season: 'Winter',
    type: 'Middle qi',
    dateRange: '21–23 December',
    meaning:
      'At the Winter Solstice the sun reaches 270° and stands over the Tropic of Capricorn: the northern hemisphere has its shortest day and longest night. Yang then begins to return — “one yang is born at the Winter Solstice” — a key turn in yin and yang; folk saying calls it “as important as the New Year”.',
    hou: [
      'Earthworms tie themselves in knots',
      'Elk shed their antlers',
      'Spring water begins to move',
    ],
    custom:
      'Dumplings in the north and glutinous rice balls in the south, ancestral offerings, the nine-nine cold-dispelling chart and lamb soup. In antiquity it was once the start of the year and remains one of the most important solar terms.',
    yangsheng:
      'A major wellness festival: store yang and reinforce the root. Rest quietly, sleep early and rise late, and avoid strenuous exercise or heavy sweating. Warm tonics such as lamb soup, rice balls and nuts suit; keep warm, protect heart and circulation, and keep the mind calm.',
    bazi:
      'The Winter Solstice is the middle qi of the Zi month and does not change the month. “One yang is born” answers “one yin is born” at the Summer Solstice and is the best illustration of yin reaching its limit and yang returning. Even a Useful God that has been badly injured can recover at a change of luck — the classical idea of exhaustion and passage fits exactly here.',
  },
  {
    slug: 'xiaohan',
    name: 'Minor Cold',
    season: 'Winter',
    type: 'Node',
    dateRange: '5–7 January',
    monthZhi: 'Chou',
    monthName: 'the twelfth lunar month (Chou month)',
    meaning:
      'At Minor Cold the sun reaches 285° and the coldest stretch of the year begins — “minor cold and major cold, frozen into a ball of ice”. Cold has gathered for a long time but has not yet peaked, hence “minor”.',
    hou: [
      'Wild geese fly north',
      'Magpies begin to build nests',
      'Pheasants begin to call',
    ],
    custom:
      'Eating Laba congee, since Laba falls near this term, glutinous rice, vegetable rice and yellow sprout greens, and painting the nine-nine cold chart; the year’s tonics and New Year flavour begin.',
    yangsheng:
      'Nourish the Kidneys, guard against cold and build reserves. Warming tonics suit — lamb, chestnuts, walnuts and lamb soup with angelica and ginger. Keep joints, shoulders, neck and feet warm, prevent colds and cardiovascular trouble, and exercise indoors in moderation.',
    bazi:
      'Key point: Minor Cold begins the Chou month (late winter). Chou is damp Earth and the Metal storehouse, holding Ji Earth, Gui Water and Xin Metal. Earth and Water are strong and cold; classical texts still make Bing Fire the urgent remedy for Chou-month charts. The Chou–Wei clash, Chou–Wu harm and the Chou–Xu–Wei triple punishment are the points to examine.',
  },
  {
    slug: 'dahan',
    name: 'Major Cold',
    season: 'Winter',
    type: 'Middle qi',
    dateRange: '20–21 January',
    meaning:
      'At Major Cold the sun reaches 310°, the last of the 24 solar terms. Cold waves push south and the weather reaches its coldest — but extreme cold turns toward warmth, for Start of Spring follows and a new cycle begins.',
    hou: [
      'Hens begin to hatch',
      'Birds of prey hunt fiercely',
      'The water in ponds and lakes freezes to the centre',
    ],
    custom:
      'The tail-tooth feast for employees, eating glutinous rice, sweeping the house clean, preparing New Year goods and steaming cured meats — the new year is near and the mood is one of leave-taking and welcome.',
    yangsheng:
      'Consolidate the root and store the spirit. Calm the mind, sleep early and rise late. Reduce salt and increase bitter flavours to nourish Heart qi; eight-treasure rice, Chinese yam and goji berries suit. Keep warm, exercise away from wind and cold, and build vitality for spring.',
    bazi:
      'Major Cold is the middle qi of the Chou month and does not change the month. It is winter’s extreme and spring’s precursor. Note especially: anyone born after Major Cold but before Start of Spring still takes the previous year pillar, for example a late-January birth. The zodiac and year pillar must always follow Start of Spring — the most common error in casting a chart.',
  },
]

export function getJieqiEn(slug: string): JieQiEn | undefined {
  return JIEQI_EN.find((j) => j.slug === slug)
}

export const SEASONS_EN = [
  {
    key: 'Spring',
    label: 'Spring · Wood',
    desc: 'Start of Spring to Grain Rain — growth, the Liver, Wood',
  },
  {
    key: 'Summer',
    label: 'Summer · Fire',
    desc: 'Start of Summer to Major Heat — flourishing, the Heart, Fire',
  },
  {
    key: 'Autumn',
    label: 'Autumn · Metal',
    desc: 'Start of Autumn to Frost’s Descent — gathering, the Lungs, Metal',
  },
  {
    key: 'Winter',
    label: 'Winter · Water',
    desc: 'Start of Winter to Major Cold — storing, the Kidneys, Water',
  },
] as const
