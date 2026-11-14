import type { ArticleEn } from './types'
import { wuxingPart2 } from './wuxing-2'

// Batch 1 (2026-11-14): English articles for the wuxing category
const wuxingFirst: ArticleEn[] = [
  {
    slug: 'wuxing-xiangsheng-xiangke',
    title: 'The Five Elements Generating and Controlling Each Other, Explained',
    category: 'wuxing',
    keywords: [
      'Five Elements generating',
      'Five Elements controlling',
      'Wood Fire Earth Metal Water',
      'element cycles in bazi',
    ],
    description:
      'The generating and controlling cycles of the Five Elements are the foundation of bazi. This article explains how the elements generate and control one another, how over-controlling and insulting arise, and how the cycles are read in a chart.',
    sections: [
      {
        heading: '1. The generating cycle',
        body: [
          'The generating cycle runs in a fixed order: Wood generates Fire, Fire generates Earth, Earth generates Metal, Metal generates Water, and Water generates Wood. The generating element is the mother and the generated element is the child, so because Wood generates Fire, Wood is the mother of Fire and Fire is the child of Wood.',
          'Generating is a relationship of nourishment and support. In a chart, a favorable god that is being generated grows stronger, while an unfavorable god that is being generated makes the trouble heavier. The Resource star that generates the Day Master counts as what generates me, while the Output stars that drain it count as what I generate.',
        ],
      },
      {
        heading: '2. The controlling cycle',
        body: [
          'The controlling cycle runs: Wood controls Earth, Earth controls Water, Water controls Fire, Fire controls Metal, and Metal controls Wood. Whatever controls me is the Officer and Killing stars; whatever I control is the Wealth star.',
          'Controlling is essentially about balance and restraint, and moderation is what works best, as when the Officer star restrains the Day Master and helps the person mature. Carried too far it becomes a disaster, as when the Killing star is heavy and the Day Master is light.',
        ],
      },
      {
        heading: '3. Generating and controlling as a dialectic',
        body: [
          'Generating and controlling are not absolute: too much generation harms, as when Resource is abundant and the Day Master is already strong and the mother smothers the child, while control can be useful, as when Seven Killing is restrained and transformed into authority. Di Tian Sui stresses that qi must flow freely: when the Five Elements circulate in sympathy the chart is harmonious, and when they are blocked or lopsided, misfortune follows.',
          'There are also over-controlling, where control is taken too far, and insulting, where the controlled element turns against its controller. Both are used to judge when the strength of the Five Elements has fallen out of balance.',
        ],
      },
    ],
  },
  {
    slug: 'shi-tiangan-xingge',
    title: 'The Character of the Ten Heavenly Stems: Jia, Yi, Bing, Ding, Wu, Ji, Geng, Xin, Ren and Gui',
    category: 'wuxing',
    keywords: [
      'Ten Heavenly Stems',
      'Day Master personality',
      'Jia Wood',
      'Bing Fire',
      'Ren Water',
    ],
    description:
      'Each of the Ten Heavenly Stems has its own temperament: Jia Wood like a towering tree, Yi Wood like flowers and vines, Bing Fire like the sun, Ding Fire like a lamp, Ren Water like a river and Gui Water like rain and dew. Here is how each Day Master tends to behave.',
    sections: [
      {
        heading: '1. The Wood, Fire and Earth stems',
        body: [
          'Jia (Yang Wood): a towering roof beam, upright and kind, ambitious and with a gift for leadership; the fault is stubbornness. Yi (Yin Wood): flowers, grass and climbing vines, soft on the outside and resilient within, adaptable, with an artistic gift.',
          'Bing (Yang Fire): the sun shining over everything, warm and outgoing, open and above board; the fault is impatience. Ding (Yin Fire): a lamp or a spark, gentle and finely tuned, a steady and lasting warmth; the fault is suspicion.',
          'Wu (Yang Earth): city walls and thick soil, honest and substantial, willing to carry responsibility; the fault is slowness. Ji (Yin Earth): a fertile field, mild and accommodating, quietly giving; the fault is having no opinions of its own.',
        ],
      },
      {
        heading: '2. The Metal and Water stems',
        body: [
          'Geng (Yang Metal): a sword blade or raw ore, decisive and firm, loyal, prizing righteousness above money, with a chivalrous streak; the fault is combativeness. Xin (Yin Metal): pearl and jade jewellery, refined and delicate, a perfectionist, with an eye for beauty; the fault is vanity.',
          'Ren (Yang Water): rivers, lakes and seas, clever and quick-witted, broad-minded and changeable; the fault is drifting without a fixed course. Gui (Yin Water): sweet rain and spring water, gentle and inward, nourishing things without a sound; the fault is melancholy.',
        ],
      },
      {
        heading: '3. The Day Master is only the base colour',
        body: [
          'The Day Master stem sets the base colour of the personality, but a complete reading also needs the strength of the month branch, the configuration of the Ten Gods and the balance of the Five Elements. Jia Wood born in a spring month and Jia Wood born in an autumn month behave quite differently.',
          'The chapter on temperament in Di Tian Sui is devoted to the relation between temperament and the Five Elements. It holds that character is rooted in the heart and shows itself on the outside, so that later cultivation can correct a bias and bring a person into full use.',
        ],
      },
    ],
  },
  {
    slug: 'wuxing-queshenme-zenmebu',
    title: 'Which Element Is Missing from Your Chart, and How Should You Remedy It?',
    category: 'wuxing',
    keywords: [
      'missing element',
      'Five Elements check',
      'remedy a missing element',
      'Five Elements balance',
      'naming and elements',
    ],
    description:
      'A chart that lacks one of the Five Elements does not automatically need that element. What matters is whether it is favorable or unfavorable. This article explains how to check and what a sound remedy looks like.',
    sections: [
      {
        heading: '1. How to see which element is missing',
        body: [
          'Once the chart is cast, look at how the Five Elements are distributed across the eight characters of the Four Pillars, which is finer still when the hidden stems of the branches are counted, and tally how much Wood, Fire, Earth, Metal and Water there is. Whichever one is absent is the missing element.',
          'Note that hidden stems have to be counted as well: the branch Yin hides Jia Wood, Bing Fire and Wu Earth, so it is not enough to look only at the eight characters on the surface.',
        ],
      },
      {
        heading: '2. What is missing is not necessarily what is needed',
        body: [
          'This is the biggest misunderstanding of all: what a chart lacks is not always what should be supplied. Whether to supply it depends on whether that element is favorable or unfavorable. If the missing element is unfavorable, its absence is a blessing; only when the missing element is the useful god does it need supplying.',
          'For example, in a chart where Wood is strong and controls Earth, a lack of Earth, the Wealth star, may be a flaw that needs remedying. If instead Water is strong and unfavorable, then a lack of Fire, the Wealth star, actually lessens the drain on the Day Master.',
        ],
      },
      {
        heading: '3. The right way to supply an element',
        body: [
          'Supplying an element is not only a matter of choosing a name. It can be adjusted through career, by working in industries that belong to the favorable element; through direction, by developing towards favorable directions; through colour, in clothing and the home; and through habit, by cultivating the matching virtue.',
          'The highest form of remedy is cultivating the mind and building virtue. Wood stands for benevolence, Fire for propriety, Earth for trustworthiness, Metal for righteousness and Water for wisdom. Working on the corresponding virtue is the fundamental way of changing fortune that Di Tian Sui speaks of.',
        ],
      },
    ],
  },
]

// Batch 2 (2026-11-14): the remaining wuxing article.
export const wuxingEn: ArticleEn[] = [...wuxingFirst, ...wuxingPart2]
