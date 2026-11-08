/**
 * English daily signs — one trio per jiazi, mirroring src/data/daily-signs.ts.
 *
 * Same contract as the Chinese asset:
 *   · keys must match lib/daily.ts JIAZI, order included (asserted by scripts);
 *   · [0] imagery (an image, then a turn inward), [1] practical reminder, [2] inner observation;
 *   · written as native English, not a literal gloss of the Chinese line;
 *   · no CJK here — the English page must never fall back to Chinese for this card.
 */
export const DAILY_SIGNS_EN: Record<string, readonly [string, string, string]> = {
  甲子: [
    'Beneath the cold water a young root is quietly going deeper.',
    'Start the new thing out of sight; gather force before showing it.',
    'Whatever is stirring in you can stay private for now.',
  ],
  乙丑: [
    'The ground is still locked; the vine seed is saving its strength in the damp.',
    'When things are stuck, go soft and go around — it costs less than pushing.',
    'Put the unspoken feeling somewhere safe and let the thaw come.',
  ],
  丙寅: [
    'Morning sun reaches into the trees, and the new shoots catch the light.',
    'Momentum is fresh — say what you want known while it is bright.',
    'There is heat rising in you; let it stretch out.',
  ],
  丁卯: [
    'Morning light on hanging branches; small leaves open in the wind.',
    'Small patient work lights up a little at a time, and it lasts longer.',
    'When the glow only reaches you, warm this one inch first.',
  ],
  戊辰: [
    'Clouds hang low over the ridge; the soil is soaked and waiting for rain.',
    'A change is at the threshold — steady footing matters more than going first.',
    'Between the before and the after, settle your mind and listen.',
  ],
  己巳: [
    'The rich soil shines under the sun and life pushes toward the light.',
    'The mood is hot; stay generous, but keep your own measure.',
    'Energy this high lets you see the crowd and the restlessness beneath it.',
  ],
  庚午: [
    'The sun is overhead; a blade throws one hard white line.',
    'Cut what needs cutting while your hand is steady, and stop before the peak.',
    'The moment of greatest force is the moment to draw back.',
  ],
  辛未: [
    'Pearl-like fruit in the afternoon garden, worked over in soft light.',
    'Leave some finish for later; do not show the whole shine at once.',
    'A slow day is like sun-warmed earth — warm, not burning.',
  ],
  壬申: [
    'An autumn river hits both banks and the sound runs downhill.',
    'When you adapt, clear the channel first and let the water find its way.',
    'Autumn water looks hurried; underneath it is already drawing in.',
  ],
  癸酉: [
    'Fine rain falls into a moonlit pool, round and silent.',
    'The thing is ripe — one light touch opens it; more force is wasted.',
    'The heart is very still, like moonlight on water: clear, not cold.',
  ],
  甲戌: [
    'At dusk an old tree draws its branches in and stores life in the root.',
    'The idea is good, but the door is closing; keep it for spring.',
    'Do not show the new thought yet — let it rest through the winter.',
  ],
  乙亥: [
    'Cold water lies perfectly still; the vine root keeps going in the mud.',
    'This is a season for holding — keep your own pace, do not fight the cold.',
    'The stillness is deep, and the small spark of life is still there.',
  ],
  丙子: [
    'Deep in the cold pool, one thread of light finds a fish about to wake.',
    'What you worked out in the dark can wait to surface on its own.',
    'When the light is inside, light yourself first, then talk about elsewhere.',
  ],
  丁丑: [
    'A lamp keeps watch at a frozen window and slowly softens the night.',
    'A deadlock thaws by small warmth, not by a blaze.',
    'Where things have set, be gentle with yourself and let them melt.',
  ],
  戊寅: [
    'Frozen ground cracks on the ridge and a shoot pushes through.',
    'If you want to break ground, plant your feet — depth is what moves you.',
    'Hold your inner mountain and let the new idea push from below.',
  ],
  己卯: [
    'Spring wind crosses the field; the soil loosens and green spreads.',
    'Things are opening — allow one more inch and the road widens.',
    'Loose soil turns no seed away; take what arrives first.',
  ],
  庚辰: [
    'Clouds sink over the marsh; one line of metal wind splits the coming rain.',
    'Before the change lands, tidy the branches so the blade falls true.',
    'See where the swell is coming from before you move.',
  ],
  辛巳: [
    'Under light so bright it whitens, a piece of jade is being finished.',
    'Let the big current run; the detail is your own work, and it takes time.',
    'The brighter it gets, the more you need one quiet corner.',
  ],
  壬午: [
    'A great river races under the sun; the crest of the wave turns down.',
    'In full momentum keep three parts of speech and three parts of force in reserve.',
    'At the highest tide, remember: after this wave comes the return.',
  ],
  癸未: [
    'Fine rain soaks the long-summer fields; the smell of earth is warm and slow.',
    'Slow work rounds things off — let the meaning seep, and taste comes out.',
    'Lower yourself like an afternoon rain; finer is more grounded.',
  ],
  甲申: [
    'Autumn wind straightens the forest; the old tree new branch has quietly taken shape.',
    'Your idea has met a season of trimming — prune first, expand later.',
    'The sinew grown in restraint outlasts raw drive.',
  ],
  乙酉: [
    'Moonlit vines hold beads of dew; even the soft branch has set fruit.',
    'The shape is settled — finish along the grain, easier and more complete.',
    'Softness at its deepest has its own steadiness; it needs no tension.',
  ],
  丙戌: [
    'Dusk hills hold the setting sun; the afterglow warms everything coming home.',
    'Time to gather — put the harvest away and let the light stay in.',
    'Leave a thin line of light at the closing door, and close it calmly.',
  ],
  丁亥: [
    'One lamp deep in a cold night; under still water something is coming back.',
    'In deep quiet, mind the small tasks at hand; a steady glimmer is enough.',
    'Sit down at the deepest place and listen for the warmth not yet awake.',
  ],
  戊子: [
    'Heavy earth at the edge of a cold pool; water threads quietly beneath.',
    'Nothing shows on the surface, but the channels are there — just hold them.',
    'Press the stir of new life under thick soil and let it root first.',
  ],
  己丑: [
    'Frozen ground wraps wet clay; everything is gestating in the hidden.',
    'A stalled situation will not be rushed — hold it, and the turn grows out of that.',
    'It is fine to go as low as the mud; everything that carries weight starts here.',
  ],
  庚寅: [
    'In the mountain wind at daybreak, a new axe clears the branch across the path.',
    'A new run needs ground broken — cut the branch when the cut is due.',
    'That edge for tangled rope is best spent in the morning light.',
  ],
  辛卯: [
    'In spring wind good jade shows its light; every small leaf looks polished.',
    'The work is unfolding — refine as you go; finish is made along the way.',
    'Let the heart open with some care: soft, not careless.',
  ],
  壬辰: [
    'Clouds low over the marsh; the river gathers at the gate, its direction set.',
    'Before you open the sluice, know the channel — then the release is clean.',
    'The flood is quietest before the gate; steady yourself and the force arrives.',
  ],
  癸巳: [
    'Under a strong sun, one drop of dew on a blade of grass, saying nothing.',
    'In a loud room, keep a small clear coolness for yourself.',
    'At the brightest point, keep one drop of rain — heat without dryness.',
  ],
  甲午: [
    'At noon a tall tree stands straight; at the crown the wind turns back.',
    'When a plan reaches high ground, stand upright and keep your measure.',
    'In full power, look up once — there is still wind above the treetop.',
  ],
  乙未: [
    'Long-summer vines cling to thick soil; soft branches carry fruit nearly ripe.',
    'In the aftertaste stage, push gently; close slowly and the flavor stays.',
    'Widen a little, like an afternoon trellis that holds both light and shade.',
  ],
  丙申: [
    'Autumn sun on a blade; the light draws to a line, bright without glare.',
    'When you must speak, be brief — the shorter it is, the more it carries.',
    'Let the mind be autumn light: bright, with a still air inside.',
  ],
  丁酉: [
    'On a clear moon-white night, a lamp keeps watch over ripening fruit.',
    'It is already ripe; only a light finish on the details is needed.',
    'A warm small glow is enough to light the day you already have.',
  ],
  戊戌: [
    'Late autumn on the ridge; thick soil keeps its warmth and the mountain air settles.',
    'At the point of holding what you have, store it well and stop wanting to display.',
    'Be like an evening hill: settle and take the weight of the day.',
  ],
  己亥: [
    'Still water returns to the deep; rich soil sleeps under it, holding next spring.',
    'On a day of big closings, make room for what is unfinished.',
    'Rest loose and soft; doing nothing is also a kind of tending.',
  ],
  庚子: [
    'Under cold water metal gathers light; the undercurrent has turned toward something new.',
    'Cut the mess clearly in your own mind first, then wait for the opening.',
    'One degree colder, one degree stiller — and the direction becomes visible.',
  ],
  辛丑: [
    'Beneath frozen ground, good jade is slowly worked by the years.',
    'Setting takes patience; put the effort where no one can see it.',
    'In the cold, value yourself; keep the glimmer, and the jade color shows.',
  ],
  壬寅: [
    'Spring ice cracks; the river runs down into new woods and the channel opens.',
    'With new work, clear the passage first — flow comes before growth.',
    'The opening river carries cold, and also a forward push.',
  ],
  癸卯: [
    'Fine rain has crossed the spring field; light on the grass tips opens little by little.',
    'For what is unfolding, a long thin stream beats a sudden soak.',
    'Soften, like rain on a leaf: light, but it goes deep.',
  ],
  甲辰: [
    'A tall tree by the marsh waits for rain, branches spread and roots gathering.',
    'At the edge of change, root deeply so the wind cannot move you.',
    'The low pressure before a storm is the hardest part; once full, it falls.',
  ],
  乙巳: [
    'Under a strong sun the vine climbs the frame, its soft stem following the light.',
    'The hotter the momentum, the more it pays to borrow force and go around.',
    'In great heat keep one part of flexibility; follow the push, do not fight it.',
  ],
  丙午: [
    'Sun at its height, bright to the point of dryness; every shadow pulls in.',
    'In full momentum, leave some room for the road after you turn.',
    'At the brightest point you see others clearly — remember to turn the light back.',
  ],
  丁未: [
    'The afternoon lamp is unlit, but a faint warmth is already in the thick soil.',
    'Slow things carry more flavor; tend the detail and the day ripens itself.',
    'The late light is gentle; let it soften both people and tasks.',
  ],
  戊申: [
    'Autumn hills stand grave; on thick earth metal takes its place, each thing in order.',
    'For closing work, sort one matter at a time and move with weight.',
    'Stand in the austerity; let what should fall fall, without alarm.',
  ],
  己酉: [
    'Moon on rich soil; the fruit in the garden is fully ripe and quietly shining.',
    'A finished thing is like a harvest — bring it in calmly, without display.',
    'Broad and still, ripe confidence never needs to announce itself.',
  ],
  庚戌: [
    'Dusk like a blade; autumn wind trims the last branches before the store.',
    'Before the close, cut what must go — travel light into winter.',
    'Make a clean end at the closing door, and keep the mind clear.',
  ],
  辛亥: [
    'Jade holds light by still water; the finished piece goes back in its box.',
    'In the season of storing, sort and put away the things you love.',
    'Jade in a brocade box makes no sound, and still keeps its warm light.',
  ],
  壬子: [
    'Water is the softest thing and still wears through stone; the undertow knows its way.',
    'Today favors slow over fast — put the effort into the long distance.',
    'See the tide moving in the dark, and do not follow it yet.',
  ],
  癸丑: [
    'Cold rain freezes into the soil; a thin stream saves its strength under ice.',
    'In a heavy dull stretch, tend yourself first — breaking out can wait.',
    'The lowest place is exactly where reserves gather; deep water runs without noise.',
  ],
  甲寅: [
    'At dawn in the mountain forest a tall tree rises, new branches breaking through with dew.',
    'The urge to begin is strong — pick the direction and take the first step.',
    'Be a tree that grows tall: toward the sun, and deep into the ground.',
  ],
  乙卯: [
    'Vines follow the wind, soft and unbroken, spreading green across open ground.',
    'Borrowing force is cheaper than forcing — lead the vine where the wind goes.',
    'Soft and unbroken: leave yourself a way to turn.',
  ],
  丙辰: [
    'One ray slips through the clouds onto a field that has not rained yet.',
    'With change at hand, speak plainly and the road is less likely to drift.',
    'At the border of light and dark, keep the light and wait for the clouds to part.',
  ],
  丁巳: [
    'A lamp is almost invisible in bright light, and still burns with care.',
    'The hotter the general trend, the less slack the small work deserves.',
    'Keep one small lamp in the noise: warm, unhurried.',
  ],
  戊午: [
    'The ridge under a hard sun takes the light in silence; thick soil neither hides nor flinches.',
    'At peak pressure, hold your shape — carrying it through is the turn.',
    'The noon ground is hot, and still holds everything up.',
  ],
  己未: [
    'Long-summer fields, moist and full of flavor; everything fills out slowly.',
    'Do not rush the result — hold and feed it; ripening takes its time.',
    'Loosen and slow down, like well-rested soil: soft, with strength behind it.',
  ],
  庚申: [
    'Metal air descends; the edge is in autumn, and the world looks trimmed square.',
    'Take in what should be taken, cut what should be cut — clean is a kind of calm.',
    'Lay the tangled rope down, strand by strand, and you feel lighter.',
  ],
  辛酉: [
    'The autumn moon is pure; jade shines in its box, cool without chill.',
    'When the result is set, finish finely and disturb nothing.',
    'Polished jade does not glare; every edge has become warm light.',
  ],
  壬戌: [
    'Dusk, and the river voice drops; the great water returns to the gorge with its silt.',
    'At the closing stretch, clear the channel and let the current find its bed.',
    'Slow at the gorge: what settles settles, what flows flows.',
  ],
  癸亥: [
    'Rain enters the deep pool, still and unseen; next spring is already held at the bottom.',
    'Let the words stay in your heart overnight; in still water the answer clears.',
    'The stillest depth only saves; wait for the first crack of thaw.',
  ],
}

export const DAILY_SIGN_DISCLAIMER_EN =
  'Each daily sign draws on traditional calendar imagery — folk culture, not prediction.'

export const DAILY_SIGN_DAY_BOUNDARY_EN = 'The day turns at Zi hour (23:00)'
