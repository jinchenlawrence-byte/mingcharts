import type { ArticleEn } from './types'
import { baziPart2 } from './bazi-2'

// Batch 1 (2026-11-14): English articles in the bazi category
const baziFirst: ArticleEn[] = [
  {
    slug: 'shenme-shi-bazi',
    title: 'What Is Bazi? A Beginner Guide to the Four Pillars',
    category: 'bazi',
    keywords: ['what is bazi', 'four pillars', 'bazi basics', 'heavenly stems and earthly branches'],
    description:
      'Bazi, or the Four Pillars, turns a birth moment into eight characters. It explains the Heavenly Stems and Earthly Branches, what a reading can reveal, and how a chart is built.',
    sections: [
      {
        heading: '1. What Bazi Is',
        body: [
          'Bazi, also known as the Four Pillars, is the central and most systematic predictive system in traditional Chinese metaphysics. The word means "eight characters": the year, month, day and hour of birth, each written as one Heavenly Stem placed above one Earthly Branch. Four pillars, eight characters in total, and so the name.',
          'Take a person born on 12 April 1991 in the Yin hour, between 3 and 5 a.m. Their four pillars are Xin Wei for the year, Ren Chen for the month, Ren Zi for the day and Ren Yin for the hour; those eight characters are their bazi. Reading how the five elements generate and control one another across the eight, how the Ten Gods are arranged, and whether the chart pattern holds or breaks is how a life is read.',
        ],
      },
      {
        heading: '2. The Heavenly Stems and Earthly Branches',
        body: [
          'There are ten Heavenly Stems: Jia (Yang Wood), Yi (Yin Wood), Bing (Yang Fire), Ding (Yin Fire), Wu (Yang Earth), Ji (Yin Earth), Geng (Yang Metal), Xin (Yin Metal), Ren (Yang Water) and Gui (Yin Water). There are twelve Earthly Branches: Zi (Yang Water, Rat), Chou (Yin Earth, Ox), Yin (Yang Wood, Tiger), Mao (Yin Wood, Rabbit), Chen (Yang Earth, Dragon), Si (Yin Fire, Snake), Wu (Yang Fire, Horse), Wei (Yin Earth, Goat), Shen (Yang Metal, Monkey), You (Yin Metal, Rooster), Xu (Yang Earth, Dog) and Hai (Yin Water, Pig). Stems and branches are paired in order to form sixty combinations, known as the sixty Jia Zi cycle, which repeats without end.',
          'Every stem and branch carries a Five Element attribute: Jia and Yi are Wood, Bing and Ding Fire, Wu and Ji Earth, Geng and Xin Metal, Ren and Gui Water; Yin and Mao are Wood, Si and Wu Fire, Shen and You Metal, Hai and Zi Water; Chen, Xu, Chou and Wei are Earth.',
        ],
      },
      {
        heading: '3. What a Bazi Reading Can Tell You',
        body: [
          'A bazi reading works through several layers. The first is character and natural talent, read from the element of the Day Master and the arrangement of the Ten Gods. The second is career and money, read from the Officer and Seven Killing stars, the Wealth stars, and the Eating God and Hurting Officer stars. The third is marriage and relationships, read from the spouse palace and the spouse star. The fourth is health, read from elements that are excessive or missing. The fifth is timing, read through the Luck Pillars and Annual Pillars that shape each stage of life.',
          'It is worth stressing that bazi describes a tendency and a set of probabilities, not a fixed fate. As Di Tian Sui (Drip of Heavenly Marrow) puts it, "Rest and decline depend on the luck cycle, and even more on the year." Effort, environment and the choices made later all change the final outcome.',
        ],
      },
      {
        heading: '4. How a Bazi Reading Is Done',
        body: [
          'Step one is casting the chart: from the birth time, set out the Four Pillars together with the Luck Pillars and Annual Pillars. Step two is settling strength: decide whether the Day Master is strong or weak. Step three is defining the chart pattern, taking it from the month branch and its hidden stems. Step four is checking seasonal adjustment, looking up the favorable element from the day stem and the month branch. Step five is reading the luck cycles, weighing what is favorable and unfavorable in the Luck Pillars and Annual Pillars. Step six is interpretation, drawing the strands together for career, marriage, health and the rest.',
          'The system has developed over more than a thousand years. Its core classics include Yuan Hai Zi Ping, Zi Ping Zhen Quan (True Interpretations of Ziping), Di Tian Sui (Drip of Heavenly Marrow), Qiong Tong Bao Jian, San Ming Tong Hui and Qian Li Ming Gao.',
        ],
      },
    ],
  },
  {
    slug: 'shenwang-shenruo-zenme-panduan',
    title: 'How to Tell a Strong Day Master from a Weak One: Season, Root and Support',
    category: 'bazi',
    keywords: ['day master strength', 'strong and weak day master', 'month branch', 'rooting'],
    description:
      'Day Master strength decides every later step in a reading. This guide explains the three tests (season, ground, support), plus rooting and visible stems.',
    sections: [
      {
        heading: '1. Why Strength Comes First',
        body: [
          'The Day Master, the Heavenly Stem of the day of birth, stands for the person whose chart it is. Whether that stem is strong or weak within the whole chart is the precondition for choosing the favorable element and for judging what helps and what harms. A strong Day Master needs control, drainage and consumption, which come from the Officer and Seven Killing stars, the Wealth stars and the Eating God and Hurting Officer stars. A weak Day Master needs generation and support, which come from the Resource stars and the Companion and Rob Wealth stars. Judge strength wrongly and every conclusion that follows will be wrong too.',
          'Qian Li Ming Gao reduced the judgement to three tests: gaining the season (de ling), gaining ground (de di) and gaining support (de shi).',
        ],
      },
      {
        heading: '2. Gaining the Season: the Month Branch',
        body: [
          'The month branch is the Earthly Branch of the birth month, and it is the single most powerful character in the chart. If the Day Master occupies a strong phase there, it is said to gain the season. The test is simple: when the Companion and Rob Wealth stars (the same element as the Day Master) and the Resource stars (the element that generates it) are strong in the month branch, the Day Master gains the season.',
          'For example, a Jia Wood Day Master born in the Yin month, when Wood is at its strongest, gains the season. The same Day Master born in the Shen month, when Metal is strong and cuts Wood, loses it. Gaining the season already supplies about half of the foundation for a strong chart.',
        ],
      },
      {
        heading: '3. Gaining Ground: Rooting',
        body: [
          'When the Day Master has a root among the Earthly Branches, this is called rooting, and it counts as gaining ground. Roots are graded by strength: the Lu and Blade positions (the Office and Peak stages) are the strongest, the Growth stage comes next, and the residual qi held in the tomb and storage branches is weaker again.',
          'Take a Ren Water Day Master with Zi (the Peak stage) in the day branch and Hai (the Office stage) in the year branch. The root is extremely strong, and the Day Master may still be strong even without the season. Rooting is the factor most often overlooked in judging strength, and one of the most important.',
        ],
      },
      {
        heading: '4. Gaining Support: the Heavenly Stems',
        body: [
          'When the Heavenly Stems around the Day Master contain many Resource stars (the element that generates it) and Companion and Rob Wealth stars (the same element), the Day Master gains support. For a Ren Water Day Master, several Geng or Xin Metal stems (Resource) or Ren or Gui Water stems (Companion and Rob Wealth) give it backing.',
          'The three tests are weighed together. All three present means a strong Day Master; all three absent means a weak one; a mixture requires judgement about which side carries more weight. Di Tian Sui stresses that the true mechanism of strength and weakness cannot be read from one point alone: the whole chart has to be taken into account.',
        ],
      },
    ],
  },
  {
    slug: 'yongshen-xishen-jishen',
    title: 'Favorable, Supporting and Unfavorable Elements in Bazi',
    category: 'bazi',
    keywords: ['favorable element', 'supporting element', 'unfavorable element', 'choosing the favorable element'],
    description:
      'The favorable element is the pivot of a chart: the element the whole structure needs. This guide explains favorable, supporting and unfavorable elements and how each is chosen.',
    sections: [
      {
        heading: '1. What the Favorable Element Is',
        body: [
          'The favorable element is the one element in a chart that benefits the person most and is most needed. It is the pivot of the whole structure and its medicine. As Zi Ping Zhen Quan (True Interpretations of Ziping) says, "The favorable element is the spirit the chart employs." Find it, and the balancing point of the chart has been found.',
          'Think of a chart as a prescription: excess is drained, deficiency is tonified, cold is warmed and heat is cooled. The single most important ingredient in that prescription is the favorable element.',
        ],
      },
      {
        heading: '2. Supporting and Unfavorable Elements',
        body: [
          'The supporting element is the element that generates and reinforces the favorable element; it acts like a minister who assists. The unfavorable element is the element that attacks or damages the favorable element and works against the person; it is the disease in the prescription.',
          'For example, when a strong Day Master takes the Officer and Seven Killing stars (the element that controls it) as its favorable element, then those stars are favorable, the Wealth stars that generate them are supporting, and the Resource and Companion stars that reinforce the Day Master are unfavorable. Luck that brings the favorable or supporting element is auspicious; luck that brings the unfavorable element stalls progress.',
        ],
      },
      {
        heading: '3. Choosing the Element for a Strong or Weak Day Master',
        body: [
          'For a strong Day Master, the favorable element is found by control, drainage and consumption. The element that controls the Day Master, the Officer and Seven Killing stars, comes first; the element the Day Master generates, the Eating God and Hurting Officer stars, drains its excess; the element it controls, the Wealth stars, consumes its strength. Any of the three can serve.',
          'For a weak Day Master, the favorable element is found by generation and support. The element that generates the Day Master, the Resource stars, comes first; the element identical to it, the Companion and Rob Wealth stars, gives direct help. Both are favorable or supporting.',
          'There is a special case. If the Day Master is extremely weak and has no root at all, it cannot receive support, and the chart may form a follow pattern. Control, drainage and consumption then become favorable instead. True and false cases of this must be distinguished with care, as the chapter on following and transformation in Di Tian Sui explains.',
        ],
      },
      {
        heading: '4. Seasonal Adjustment',
        body: [
          'Besides the favorable element chosen by support and restraint, there is a second important kind, the element used for seasonal adjustment. Qiong Tong Bao Jian lists 120 seasonal adjustment elements, keyed to the day stem and the month branch, and their core purpose is to regulate cold and heat, dryness and dampness in the chart.',
          'A person born in midsummer, with Fire in excess, needs Water to adjust the season; a person born in midwinter, with cold Water, needs Fire to thaw it. The seasonal adjustment element is often exactly what the chart most needs, and the reading is at its best when it coincides with the favorable element chosen by support and restraint.',
        ],
      },
    ],
  },
]

// Batch 2 (2026-11-14): the remaining bazi articles.
export const baziEn: ArticleEn[] = [...baziFirst, ...baziPart2]
