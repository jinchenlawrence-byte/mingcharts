// English copy for the twelve Chinese zodiac pages.
//
// Structure comes from src/lib/shengxiaoData.ts (single source of truth for branches,
// elements, relations and years). This file holds only the English language layer:
// five native-English paragraphs per sign (the same five sections as the Chinese page)
// plus the structure-free fields (guardian buddha and lucky items).
//
// Rule: no CJK here. Branches and stems are rendered as pinyin by src/lib/enTerms.ts.
import type { ShengXiao } from './shengxiaoData'
import { LIU_CHONG, LIU_HAI, XIANG_XING } from './branchRelations'
import { ZHI_TO_ANIMAL, getYearGanZhi } from './shengxiaoData'
import { BRANCH_ELEMENT, ganZhiEn } from './enTerms'

/** Element display class for the round branch badge (same hw- palette as the Chinese tree). */
const ELEMENT_CLASS: Record<string, string> = {
  Wood: 'wood',
  Fire: 'fire',
  Earth: 'earth',
  Metal: 'metal',
  Water: 'water',
}

export function elementClass(zhi: string): string {
  return ELEMENT_CLASS[BRANCH_ELEMENT[zhi]] ?? 'earth'
}

export interface ShengXiaoEnCopy {
  slug: string
  name: string
  buddha: string
  personality: string
  career: string
  wealth: string
  marriage: string
  health: string
  luckyNumber: string
  luckyColor: string
  luckyDirection: string
  luckyFlower: string
  luckyStone: string
}

export const SHENGXIAO_EN: ShengXiaoEnCopy[] = [
  {
    slug: 'shu',
    name: 'Rat',
    buddha: 'Thousand-Armed Avalokiteshvara',
    personality:
      'Rats are quick-witted and observant, with an instinct for noticing what others miss. They think several steps ahead, adapt easily to new surroundings and rarely act without a plan. Thrift comes naturally: they save, compare and prepare for the lean season. They are loyal to family and generous with the people inside their circle. The shadow side is caution pushed too far — second-guessing, suspicion and a reluctance to take one bold step that could have paid off. Widening the circle usually widens the luck as well.',
    career:
      'A methodical mind and a good head for numbers point Rats toward finance, accounting, information technology, trade, logistics and research. They do their best work when a problem can be studied, modelled and improved rather than rushed. Careers tend to rise steadily through accumulated expertise rather than one dramatic leap. Long-term speculation suits them less than patient, well-researched positions. Mentors often come from the Dragon, Monkey and Ox signs.',
    wealth:
      'Water governs flow, and Rat money behaves the same way: it arrives in steady streams rather than sudden floods. Salary and professional income tend to be reliable; windfalls come from information and timing. Saving is easy for Rats, so the real risk is the opposite of poverty — chasing a clever investment that sounds too good. Partnerships with Dragon, Monkey or Ox signs are usually safer than deals with Horse or Goat signs.',
    marriage:
      'Rats feel deeply and express it through practical care: a stocked fridge, a repaired shelf, a plan for the future. Ox partners (Six Harmony) and Dragon or Monkey partners (Three Harmony) tend to understand this language, while Horse (Clash), Goat (Harm) and Rabbit (Punishment) pairings require more patience. Marrying a little later usually gives a Rat the confidence to choose well rather than settle.',
    health:
      'The Water element points to the kidneys, bladder, urinary tract and ears, and late nights drain them fastest. Overthinking shows up first as poor sleep and a frayed nervous system, so a fixed bedtime does more for a Rat than any supplement. Swimming and walking by water are good outlets; just take care near rivers and pools.',
    luckyNumber: '2, 3',
    luckyColor: 'Blue, gold, white',
    luckyDirection: 'Southeast, northeast',
    luckyFlower: 'Lily, lily of the valley',
    luckyStone: 'Kyanite, aquamarine',
  },
  {
    slug: 'niu',
    name: 'Ox',
    buddha: 'Akasagarbha',
    personality:
      'Ox people are the ones others rely on without quite noticing why. They work steadily, keep their word and finish what they start, even when the finish line is years away. There is real moral weight to them: honesty, patience and a refusal to cut corners. Their difficulty is flexibility. Once an Ox has decided, new information struggles to get in, and they can carry far more responsibility than anyone asked them to. Learning to delegate is often the single biggest upgrade of their adult life.',
    career:
      'Deep, durable fields reward the Ox temperament: manufacturing, agriculture, construction, engineering, finance and administration. They are rarely the loudest person in the room, but they become indispensable because the work is always finished properly. Early careers often look slow compared with flashier peers; the advantage compounds and shows up in the second half. Frequent job-hopping wastes their greatest asset, which is accumulated trust.',
    wealth:
      'Wet Earth holds water, and an Ox household tends to hold money the same way — quietly, in property and savings rather than in showy purchases. Sudden riches are rare, and so is sudden ruin. The weak points are guarantees for friends and loosely kept partnership books; both can drain a lifetime of saving in one signature. By midlife the storehouse is usually full.',
    marriage:
      'Ox partners are faithful and dependable, though not always verbally affectionate. Rat (Six Harmony) and Snake or Rooster (Three Harmony) partners share their pace and values. Goat (Clash), Horse (Harm) and Dog (Punishment) pairings need conscious effort, because both sides can dig in. A few words of appreciation go a long way in an Ox marriage — silence can be read as distance.',
    health:
      'Earth rules the stomach and spleen, so irregular meals and too much cold or raw food are the main enemies. Joints and tendons suffer when an Ox works through fatigue instead of resting. Balance effort with recovery, and from middle age onward keep an eye on weight and blood pressure.',
    luckyNumber: '1, 4',
    luckyColor: 'Yellow, brown, white',
    luckyDirection: 'North, southeast',
    luckyFlower: 'Tulip, evergreen',
    luckyStone: "Citrine, tiger's eye",
  },
  {
    slug: 'hu',
    name: 'Tiger',
    buddha: 'Akasagarbha',
    personality:
      'Tigers carry a natural authority that shows up before they say anything. They are brave, direct and allergic to injustice, and they would rather take a difficult challenge than a boring certainty. People follow them because they move first and mean what they say. The cost is impulsiveness: a Tiger can decide in a minute and spend a year living with it. Learning to pause — even briefly — turns raw courage into strategy.',
    career:
      'Tigers belong in roles with a frontier: management, entrepreneurship, law enforcement, sales, public relations and anything that requires someone to go first. Early careers often include sharp setbacks, then a rapid rise once they find the right arena. Building a strong second-in-command protects them from the classic Tiger failure — charging ahead alone and calling it leadership.',
    wealth:
      'Yang Wood makes for dramatic financial swings: big opportunities, big risks and a tendency to spend on reputation. Salary follows position, so career advancement matters more than stock tips. The recurring leak is pride — picking up the bill, backing a friend’s venture, refusing to look cautious. A cash buffer and a partner who checks the numbers turn a volatile income into a comfortable one.',
    marriage:
      'Tigers love intensely and want to lead. Pig (Six Harmony) and Horse or Dog (Three Harmony) partners can admire that energy without being flattened by it. Monkey (Clash) and Snake (Harm and Punishment) pairings tend to produce spectacular arguments. Marrying later, and choosing someone calm enough to say no, usually produces the happiest version of a Tiger.',
    health:
      'Wood governs the liver, eyes and tendons, and a Tiger’s temper puts pressure on all three. Traffic, sharp tools and contact sports deserve extra care. The most useful health habit is not a supplement but a pause: breathe before reacting, and the blood pressure takes care of itself.',
    luckyNumber: '1, 3, 4',
    luckyColor: 'Green, teal, blue',
    luckyDirection: 'South, east',
    luckyFlower: 'Cotton rose, chrysanthemum',
    luckyStone: 'Turquoise, obsidian',
  },
  {
    slug: 'tu',
    name: 'Rabbit',
    buddha: 'Manjushri',
    personality:
      'Rabbits read a room faster than most people read a sentence. They are gentle, observant and skilled at defusing friction before it becomes conflict. Good taste is part of their nature — in clothes, interiors, food and the way they treat people. What they lack is decisiveness under pressure; a Rabbit can see every side of a question and then avoid answering it. Confidence is a muscle they have to build deliberately.',
    career:
      'Rabbits thrive where relationships and aesthetics matter: public relations, education, design, culture, hospitality and human resources. Colleagues like them, and quiet allies tend to appear when they need one. High-conflict, scoreboard-driven workplaces wear them down. Their superpower is collaboration; their trap is waiting to be invited instead of asking.',
    wealth:
      'Yin Wood produces a gentle financial curve — reliable income, modest windfalls and a taste for quality that quietly raises expenses. Rabbits rarely go hungry, but large wealth usually arrives through a platform or a well-connected partner rather than a solo gamble. Dog, Pig and Goat partners are the safest co-investors. Impulse spending on beautiful things is the leak to watch.',
    marriage:
      'Rabbits want romance and emotional understanding, not just companionship. Dog (Six Harmony) and Pig or Goat (Three Harmony) partners create the warmth they crave. Rooster (Clash), Dragon (Harm) and Rat (Punishment) pairings ask for more honest conversation than either side finds comfortable. Choosing steadiness over charm is the Rabbit’s most important relationship decision.',
    health:
      'Wood again points to the liver and nervous system; suppressed feelings show up as insomnia, tension and skin flare-ups. Time outdoors, unhurried meals and a hobby that absorbs them completely do more than most treatments. Digestive sensitivity is common, so rich food in large quantities is worth avoiding.',
    luckyNumber: '3, 4, 9',
    luckyColor: 'Green, blue, pink',
    luckyDirection: 'East, southeast',
    luckyFlower: 'Cyclamen, hosta',
    luckyStone: 'Moonstone, pearl',
  },
  {
    slug: 'long',
    name: 'Dragon',
    buddha: 'Samantabhadra',
    personality:
      'Dragons are ambitious, charismatic and convinced that ordinary limits are for other people. They think in scale, work with unusual stamina and often inspire loyalty simply by believing in a bigger outcome. Their weakness is the mirror image of that strength: pride, impatience with detail and a tendency to assume the plan will work because it is theirs. A Dragon who learns to listen becomes genuinely formidable.',
    career:
      'Leadership is the natural habitat: executive management, politics, public institutions, creative direction and large-scale projects. Dragons can rise young or make a decisive leap in midlife, and their ceiling is high. The recurring risk is making enemies through sheer self-belief. Surrounding themselves with capable people who disagree out loud is the difference between a bright career and a durable one.',
    wealth:
      'Chen is a reservoir of water, and Dragon finances have a large capacity — money comes in impressive amounts. It also leaves quickly, usually through prestige spending or a bold investment made on instinct. Protecting capital matters more than chasing the next opportunity. A conservative asset base under the ambitious projects is what keeps a Dragon wealthy rather than merely well paid.',
    marriage:
      'Dragons are magnetic and inclined to take charge. Rooster (Six Harmony) partners make the classic pairing, while Rat and Monkey (Three Harmony) partners match their ambition. Dog (Clash) and Rabbit (Harm) relationships need deliberate respect for each other’s pace. A partner who admires the vision but questions the spreadsheet is the best long-term choice.',
    health:
      'Earth governs digestion and skin, while Chen’s water quality makes kidneys and fluid balance worth watching. Dragons burn through energy and then wonder why they are exhausted; regular sleep and scheduled check-ups are not optional extras. The liver also carries the cost of constant pressure and late nights.',
    luckyNumber: '1, 6, 7',
    luckyColor: 'Gold, silver, yellow',
    luckyDirection: 'West, north',
    luckyFlower: 'Bleeding heart vine, broom',
    luckyStone: 'Amber, amethyst',
  },
  {
    slug: 'she',
    name: 'Snake',
    buddha: 'Samantabhadra',
    personality:
      'Snakes are quiet in a way that makes other people talk more. They observe, remember and wait for the moment when action will actually count. Their intuition is strong, their taste is distinctive and their patience is unusual. The cost is trust: a Snake holds back, reads motives twice and can carry a grudge long after the other person has forgotten. Choosing openness is the discipline that turns insight into influence.',
    career:
      'Snakes excel where depth beats speed: research, investment analysis, strategy, psychology, technical specialism and any advisory role. They are the person who finds the overlooked detail that changes the conclusion. Networking for its own sake exhausts them; a small circle of trusted professionals serves them better. Expertise, not visibility, is their route upward.',
    wealth:
      'Yin Fire with hidden metal gives a Snake an excellent nose for a mispriced asset. Money tends to be made quietly and kept privately. The risk is not laziness but temptation: an opportunity that is slightly too secret, slightly too clever. Conservative allocation and a clear line about what they will not touch protect everything they have built.',
    marriage:
      'Snakes love deeply but say little, which partners can read as distance. Monkey (Six Harmony) and Ox or Rooster (Three Harmony) partners usually understand the silence. Pig (Clash) and Tiger (Harm and Punishment) pairings can turn into long cold wars. Talking before resentment sets in is the single habit that changes the outcome.',
    health:
      'Fire rules the heart, circulation and eyes, while hidden metal in Si makes the throat and intestines sensitive. Long hours at a desk slow the circulation, so gentle, regular movement matters more than an occasional intense workout. Suppressed emotion is a genuine health factor here — a trusted confidant is part of the treatment.',
    luckyNumber: '2, 8, 9',
    luckyColor: 'Red, yellow, black',
    luckyDirection: 'Southwest, south',
    luckyFlower: 'Orchid, cactus',
    luckyStone: 'Red agate, smoky quartz',
  },
  {
    slug: 'ma',
    name: 'Horse',
    buddha: 'Mahasthamaprapta',
    personality:
      'Horses are warm, fast-moving and easy to like. They speak well, start enthusiastically and bring energy into a room within minutes. Freedom matters to them more than security, and they will accept a smaller paycheque for a wider horizon. The pattern to watch is follow-through: a Horse can begin five things in a season and finish one. Stamina plus a chosen direction is what converts charm into achievement.',
    career:
      'Movement-heavy, people-facing work suits them: sales, marketing, media, travel, international trade, performance and self-employment. They spot opportunities quickly and are willing to act before the crowd. The missing piece is usually depth, so choosing one field and staying for three to five years often doubles their results. A patient partner or operations manager covers their blind spot.',
    wealth:
      'Yang Fire makes for a lively financial life: money arrives quickly and leaves just as quickly, often in generosity or enjoyment. Income tends to improve once a Horse settles into a specialty in midlife. Blindly following trends and guaranteeing loans are the two reliable ways to lose ground. A simple automatic saving rule works better than any budget spreadsheet.',
    marriage:
      'Horses are direct and affectionate, and they need room to move. Goat (Six Harmony) and Tiger or Dog (Three Harmony) partners share their appetite for life. Rat (Clash) and Ox (Harm) pairings often feel restrictive to one side and unreliable to the other. Space, honest communication and a shared project keep a Horse marriage lively.',
    health:
      'Fire points to the heart, blood pressure, eyes and nervous system, all of which suffer when a Horse runs nonstop. Road safety deserves real attention, since fatigue and speed are a poor combination. Built-in downtime — even twenty quiet minutes a day — is more effective than waiting for a holiday.',
    luckyNumber: '2, 3, 7',
    luckyColor: 'Red, purple, green',
    luckyDirection: 'South, east',
    luckyFlower: 'Jasmine, carnation',
    luckyStone: 'Rhodochrosite, South Red agate',
  },
  {
    slug: 'yang',
    name: 'Goat',
    buddha: 'Vairocana',
    personality:
      'Goats are gentle, artistic and quietly resilient. They notice how others feel, care about beauty in everyday things and often hold a family together without being credited for it. Beneath the soft surface is real endurance: a Goat can absorb hardship that would stop louder signs. The difficulty is dependence — on approval, on comfort, on someone else making the decision. Building independence is their central life task.',
    career:
      'Creative and caring professions suit Goats: art, design, education, healthcare, charity work and publishing. They do well in stable environments where relationships are harmonious and quality is valued. Aggressive sales floors and political offices drain them. Their patience is an asset in long projects, and their taste is an asset anywhere a product has to feel good.',
    wealth:
      'Wei is dry earth holding wood and fire, which produces a moderate, steady financial life. Goats rarely take big risks, and they rarely starve; older relatives or mentors often help along the way. Conservative saving suits them. Lending money to friends and entering informal partnerships are the two habits most likely to cost them.',
    marriage:
      'Goats want to be looked after as much as they want to look after someone. Horse (Six Harmony) and Pig or Rabbit (Three Harmony) partners give them warmth and security. Ox (Clash), Rat (Harm) and Dog (Punishment) pairings can leave a Goat feeling unseen. Choosing a mature partner matters more than choosing an exciting one, and learning to stand alone first makes that choice clearer.',
    health:
      'Earth governs digestion; as dry earth, Wei also points to dryness in the skin and stomach. A sensitive temperament affects appetite and sleep first, so regular meals and morning daylight are genuinely medicinal. Gentle exercise and time with animals or nature lift the mood more reliably than isolation.',
    luckyNumber: '3, 4, 9',
    luckyColor: 'Green, red, purple',
    luckyDirection: 'South, southeast',
    luckyFlower: 'Carnation, lavender',
    luckyStone: 'Amethyst, rose quartz',
  },
  {
    slug: 'hou',
    name: 'Monkey',
    buddha: 'Vairocana',
    personality:
      'Monkeys are quick, inventive and rarely bored. They learn new systems fast, find shortcuts that nobody else noticed and keep a conversation entertaining. Resourcefulness is their signature. The risk is treating every situation as a puzzle to win: cutting a corner, over-promising, or moving on before the boring part is finished. Reliability is the quality that turns a clever Monkey into an indispensable one.',
    career:
      'Monkeys do well in fast, competitive environments — business, finance, technology, sales, media and startups. They solve problems quickly and spot openings while others are still planning. The danger is a reputation for cleverness without follow-through. Deep expertise, a track record of delivered work and long-term client relationships are what convert their talent into lasting income.',
    wealth:
      'Yang Metal with hidden water makes for wide, active money channels: business income, commissions, side ventures and opportunistic gains. Earning is rarely the problem; keeping is. Monkeys are prone to overconfidence and to chasing a clever trade. A hard stop-loss rule and a boring savings account do more for them than another strategy.',
    marriage:
      'Monkeys are charming, funny and easily bored, which makes them attractive and sometimes hard to pin down. Snake (Six Harmony) and Rat or Dragon (Three Harmony) partners match their intelligence and keep them interested. Tiger (Clash) and Pig (Harm) pairings need clear ground rules. Commitment improves a Monkey’s life more than it restricts it — the evidence is consistent.',
    health:
      'Metal governs the lungs, respiratory tract and large intestine, and Shen’s restlessness makes accidents and tendon injuries more likely. Mental overdrive shows up as insomnia and tension. Sleep, regular exercise and a genuine hobby that does not earn money are the practical prescriptions.',
    luckyNumber: '1, 7, 8',
    luckyColor: 'White, gold, blue',
    luckyDirection: 'West, north',
    luckyFlower: 'Chrysanthemum, gardenia',
    luckyStone: 'Clear quartz, rutilated quartz',
  },
  {
    slug: 'ji',
    name: 'Rooster',
    buddha: 'Acala',
    personality:
      'Roosters are precise, punctual and honest to the point of bluntness. They notice what is out of place and usually say so. Standards are high, both for themselves and everyone nearby, and their work is meticulous. The cost is tone: a correct observation delivered as criticism lands badly. Softening the delivery while keeping the standards is the skill that changes how a Rooster’s life goes.',
    career:
      'Structured, detail-driven fields reward them: finance, auditing, administration, law, quality control, fashion and hospitality. They excel inside organisations that have real rules, because they take those rules seriously. The block to promotion is usually interpersonal rather than technical. A Rooster who learns to praise before correcting becomes a natural manager.',
    wealth:
      'Yin Metal produces careful, professional money: income grows with expertise and reputation, and spending is tracked. Roosters will pay for quality and for appearances, which is where the budget leaks. Speculative investing does not suit them, and neither does lending to preserve face. By later life their finances are usually orderly and comfortable.',
    marriage:
      'Roosters take relationships seriously and manage the household well. Dragon (Six Harmony) and Ox or Snake (Three Harmony) partners share their practical values. Rabbit (Clash) and Dog (Harm) pairings tend to expose the Rooster’s critical streak. More appreciation and fewer corrections is the single change that improves these relationships most.',
    health:
      'Metal again points to the lungs, throat, respiratory tract and skin, with autumn dryness the season to watch. A Rooster’s nervous system runs hot — tension, insomnia and a dry throat are common when they overwork. Relaxed meals, unhurried evenings and less spicy food help more than they expect.',
    luckyNumber: '5, 7, 8',
    luckyColor: 'Gold, yellow, brown',
    luckyDirection: 'Southwest, northeast',
    luckyFlower: 'Impatiens, cockscomb',
    luckyStone: 'Citrine, clear quartz',
  },
  {
    slug: 'gou',
    name: 'Dog',
    buddha: 'Amitabha',
    personality:
      'Dogs are loyal to a fault and quietly watchful. They remember who stood by them, keep promises that cost them something and have a strong instinct for right and wrong. People trust them quickly, and that trust is usually justified. The weak spot is anxiety: a Dog can worry a situation into the ground and read too much into a short reply. Learning to trust without needing guarantees is their lifelong lesson.',
    career:
      'Roles built on responsibility and trust suit Dogs: security, law, law enforcement, medicine, quality assurance, compliance and service. They are the colleague who notices the risk nobody logged and the one who stays until the job is properly done. Self-promotion does not come naturally, so their reputation does the work. Long, stable careers are common.',
    wealth:
      'Dusty earth with hidden metal and fire gives steady, principled finances. Dogs are careful with money, reluctant to owe anyone and generous when a friend is in trouble. They will not chase easy gains, which protects them, but they also miss some legitimate ones. Guarantees and a too-loose attitude to shared expenses are the two things to guard.',
    marriage:
      'Dogs are devoted partners with a strong sense of duty. Rabbit (Six Harmony) and Tiger or Horse (Three Harmony) partners bring out their warmer side. Dragon (Clash), Rooster (Harm) and Ox or Goat (Punishment) pairings can become a contest of principles. Saying the affection out loud, rather than assuming it is understood, matters enormously here.',
    health:
      'Earth rules the stomach and spleen, while Xu as a fire storehouse adds heat and skin sensitivity. Anxiety hits the digestion first, so a regular routine and a hobby that absorbs worry are real treatments. Keep warm, eat at consistent times and do not treat every symptom as a catastrophe.',
    luckyNumber: '3, 4, 9',
    luckyColor: 'Green, red, purple',
    luckyDirection: 'East, south',
    luckyFlower: 'Rose, oncidium',
    luckyStone: 'Red agate, smoky quartz',
  },
  {
    slug: 'zhu',
    name: 'Pig',
    buddha: 'Amitabha',
    personality:
      'Pigs are generous, easy-going and genuinely good company. They forgive quickly, dislike conflict and bring a relaxed warmth that makes people want to be around them. Luck seems to find them, partly because they do not grip too tightly. The downside is complacency: a Pig can drift, trust the wrong person and put off difficult decisions indefinitely. Discipline is the missing ingredient in an otherwise fortunate sign.',
    career:
      'Harmonious, people-centred work suits them: education, healthcare, hospitality, culture, finance and public service. Pigs are not obviously competitive, yet they often receive opportunities because people like working with them. Their focus, once engaged, is stronger than it looks. Setting a clear goal matters more than waiting for inspiration.',
    wealth:
      'Water with hidden wood makes Pig one of the better-favoured signs financially: steady income, occasional pleasant surprises and a comfortable life. The vulnerability is soft-heartedness — lending money, guaranteeing loans, trusting a friendly proposal. Enjoyment spending also adds up. Keep assets protected first, then enjoy what is left.',
    marriage:
      'Pigs are sincere, forgiving and genuinely good partners. Tiger (Six Harmony) and Rabbit or Goat (Three Harmony) partners create an easy, mutually supportive home. Snake (Clash) and Monkey (Harm) pairings need clearer boundaries. A Pig thrives in love when generosity is reciprocated rather than assumed.',
    health:
      'Water rules the kidneys, urinary tract and ears; Hai’s abundance also means a tendency toward dampness, weight gain and metabolic sluggishness. Rich food, alcohol and long periods of inactivity are the main risks. Regular movement and a lighter evening meal do a lot for a Pig’s energy and mood.',
    luckyNumber: '2, 5, 8',
    luckyColor: 'Yellow, grey, blue',
    luckyDirection: 'Southeast, north',
    luckyFlower: 'Hydrangea, pitcher plant',
    luckyStone: 'Aquamarine, smoky quartz',
  },
]

export function getShengXiaoEn(slug: string): ShengXiaoEnCopy | undefined {
  return SHENGXIAO_EN.find((s) => s.slug === slug)
}

// ---------- pairing ----------

export type PairKind = 'liuHe' | 'sanHe' | 'liuChong' | 'liuHai' | 'sanXing' | 'neutral'

/** Pure classifier mirroring getPeiDui in the Chinese data file, but returning a stable key. */
export function pairKindOf(a: ShengXiao, otherNameZh: string): PairKind {
  if (a.liuHe === otherNameZh) return 'liuHe'
  if (a.sanHe.includes(otherNameZh)) return 'sanHe'
  if (a.liuChong === otherNameZh) return 'liuChong'
  if (a.liuHai === otherNameZh) return 'liuHai'
  if (a.sanXing.includes(otherNameZh)) return 'sanXing'
  return 'neutral'
}

export const PAIR_EN: Record<PairKind, { level: string; desc: string }> = {
  liuHe: {
    level: 'Excellent match (Six Harmony)',
    desc: 'A hidden, supportive bond. The two signs reinforce each other’s luck and settle into an easy, generous rhythm.',
  },
  sanHe: {
    level: 'Excellent match (Three Harmony)',
    desc: 'Kindred energies and shared goals. Family life is harmonious and both partners keep growing in the same direction.',
  },
  liuChong: {
    level: 'Needs work (Six Clash)',
    desc: 'Very different temperaments and rhythms. Friction is frequent, though the tension can also be complementary when both sides work at it.',
  },
  liuHai: {
    level: 'Needs patience (Six Harm)',
    desc: 'Quiet, cumulative friction and frequent misreadings. Honest, unhurried communication matters more here than in most pairings.',
  },
  sanXing: {
    level: 'Needs tolerance (Punishment)',
    desc: 'Strong wills meeting head-on, and arguments escalate quickly. One side has to step back first; a later marriage often softens the pattern.',
  },
  neutral: {
    level: 'Neutral match',
    desc: 'A calm, unremarkable pairing. Nothing is amplified either way, so the relationship depends on the two people rather than on the signs.',
  },
}

// ---------- annual pillars ----------
//
// Computed here instead of reusing getLiunian(), because getLiunian returns Chinese
// relation words and this English layer must stay free of CJK literals.
// The relation table itself still comes from branchRelations (single source of truth).

export type RelationKey = 'zhi' | 'chong' | 'hai' | 'xing' | 'he' | 'neutral'
export type ToneKey = 'favourable' | 'caution' | 'changing' | 'steady'

export interface YearNoteEn {
  year: number
  ganZhi: string
  relation: RelationKey
  relationText: string
  tone: ToneKey
  toneText: string
}

export const RELATION_EN: Record<RelationKey, string> = {
  zhi: 'Zhi Tai Sui (benming year)',
  chong: 'Chong Tai Sui (clash)',
  hai: 'Hai Tai Sui (harm)',
  xing: 'Xing Tai Sui (punishment)',
  he: 'He Tai Sui (harmony)',
  neutral: 'Neutral year',
}

export const TONE_EN: Record<ToneKey, string> = {
  favourable: 'Favourable',
  caution: 'Caution',
  changing: 'Changing',
  steady: 'Steady',
}

const RELATION_TONE: Record<RelationKey, ToneKey> = {
  zhi: 'steady',
  chong: 'changing',
  hai: 'caution',
  xing: 'caution',
  he: 'favourable',
  neutral: 'steady',
}

/** 2024–2031 notes for one sign, in English, with pinyin stem-branch. */
export function yearNotesEn(sx: ShengXiao, years: number[]): YearNoteEn[] {
  return years.map((year) => {
    const gz = getYearGanZhi(year)
    const yearZhi = gz[1]
    const yearAnimal = ZHI_TO_ANIMAL[yearZhi]
    const zhi = sx.zhi as keyof typeof LIU_CHONG
    let relation: RelationKey = 'neutral'
    if (yearZhi === sx.zhi) relation = 'zhi'
    else if (LIU_CHONG[zhi] === yearZhi) relation = 'chong'
    else if (LIU_HAI[zhi] === yearZhi) relation = 'hai'
    else if (XIANG_XING[zhi]?.includes(yearZhi as (typeof XIANG_XING)[typeof zhi][number])) relation = 'xing'
    else if (sx.liuHe === yearAnimal || sx.sanHe.includes(yearAnimal)) relation = 'he'

    const tone = RELATION_TONE[relation]
    return {
      year,
      ganZhi: ganZhiEn(gz),
      relation,
      relationText: RELATION_EN[relation],
      tone,
      toneText: TONE_EN[tone],
    }
  })
}
