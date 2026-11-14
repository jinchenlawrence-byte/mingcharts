import type { ArticleEn } from './types'
import { shenshaPart2 } from './shensha-2'
import { shenshaPart3 } from './shensha-3'
import { shenshaPart4 } from './shensha-4'
import { shenshaPart5 } from './shensha-5'
import { shenshaPart6 } from './shensha-6'

// Batch 1 (2026-11-14): English articles for the shensha category
const shenshaFirst: ArticleEn[] = [
  {
    slug: 'tianyi-guiren-chafa',
    title: 'Heavenly Noble Lookup: The Foremost Noble Star in Bazi',
    category: 'shensha',
    keywords: [
      'Heavenly Noble',
      'Tianyi Guiren lookup',
      'noble star in bazi',
      'benefactor luck',
    ],
    description:
      'The Heavenly Noble is the most auspicious star in bazi, said to turn misfortune into fortune and bring the support of helpful people. This article explains its lookup rule and its role in a reading.',
    sections: [
      {
        heading: '1. What the Heavenly Noble is',
        body: [
          'The Heavenly Noble (Tianyi Guiren) is the most honored auspicious spirit among the shensha, and San Ming Tong Hui (Comprehensive Compendium of the Three Destinies) calls it "the first of all shensha". A person whose chart carries the Heavenly Noble is intelligent and wise, meets helpful people in most situations, and can turn misfortune into fortune.',
          'The Heavenly Noble governs the luck of having benefactors, of being promoted by society, and of finding a turning point in a crisis.',
        ],
      },
      {
        heading: '2. The Heavenly Noble lookup rule (from the day stem)',
        body: [
          'Mnemonic: Jia, Wu and Geng rest with the ox and the goat; Yi and Ji are found in the rat and monkey; Bing and Ding sit with the pig and rooster; Ren and Gui hide with the rabbit and the snake; Geng and Xin meet the tiger and the horse. These are the directions of the noble.',
          'That is: a Day Master of Jia, Wu or Geng sees Chou or Wei; a Day Master of Yi or Ji sees Zi or Shen; a Day Master of Bing or Ding sees Hai or You; a Day Master of Ren or Gui sees Mao or Si; a Xin day sees Yin or Wu. The year stem may also be consulted. Look up the Earthly Branches of the Four Pillars from the day stem, and whichever branch appears carries the noble.',
        ],
      },
      {
        heading: '3. Shensha are only a reference',
        body: [
          'Bazi analysis takes the generating and controlling of the Five Elements and the strength of the chart pattern as its main body, while shensha are only an auxiliary ornament. The Heavenly Noble needs to appear together with a favorable and useful element before it has real force; if the noble sits on an unfavorable god, its help is limited.',
          'One must not call a chart fortunate merely because a noble appears, nor unfortunate merely because a malefic star appears; everything is judged by generating and controlling and by the pattern, which is the basic principle of the Zi Ping method.',
        ],
      },
    ],
  },
  {
    slug: 'taohua-xing-chafa',
    title: 'Peach Blossom (Xianchi) Lookup: Reading Romance in Bazi',
    category: 'shensha',
    keywords: [
      'Peach Blossom',
      'Xianchi lookup',
      'romance in bazi',
      'attraction to the opposite sex',
      'Red Phoenix',
    ],
    description:
      'The Peach Blossom star governs attraction, charm and romantic fortune. This article explains the Peach Blossom (Xianchi) lookup rule and the difference between Peach Blossom inside the wall and outside the wall.',
    sections: [
      {
        heading: '1. The Peach Blossom lookup rule',
        body: [
          'Peach Blossom, also called Xianchi, is looked up from the year branch or the day branch against the Earthly Branches of the Four Pillars: with Shen, Zi or Chen, see You; with Yin, Wu or Xu, see Mao; with Hai, Mao or Wei, see Zi; with Si, You or Chou, see Wu.',
          'In other words, a person born in the monkey, rat or dragon years whose chart shows You, a person born in the tiger, horse or dog years whose chart shows Mao, a person born in the pig, rabbit or goat years whose chart shows Zi, or a person born in the snake, rooster or ox years whose chart shows Wu carries Peach Blossom in the chart.',
        ],
      },
      {
        heading: '2. Peach Blossom inside the wall and outside the wall',
        body: [
          'Peach Blossom in the year or month branch is "Peach Blossom inside the wall", which points to a loving couple and a harmonious relationship, and is auspicious; in the day or hour branch it is "Peach Blossom outside the wall", which points to strong attraction to the opposite sex and a tendency to outside affairs, so one must guard against romantic entanglements.',
          'Peach Blossom sitting on a favorable and useful element or carrying a noble star means help gained through the opposite sex; Peach Blossom sitting on an unfavorable god or meeting a clash or combination means trouble arising from desire.',
        ],
      },
      {
        heading: '3. Peach Blossom is no monster',
        body: [
          'The essence of Peach Blossom is charm and popularity; for performers, salespeople and public relations professionals it is actually an asset. Married people need to keep proper boundaries, while unmarried people with strong Peach Blossom have many choices but must beware of bad romances.',
          'Romance is still judged mainly by the spouse palace and the spouse star; Peach Blossom serves only as a reference.',
        ],
      },
    ],
  },
  {
    slug: 'yima-xing-chafa',
    title: 'Traveling Horse Lookup: Movement, Change and Travel in Bazi',
    category: 'shensha',
    keywords: [
      'Traveling Horse',
      'Yima lookup',
      'relocation in bazi',
      'travel and career change',
    ],
    description:
      'The Traveling Horse star governs movement, relocation, change and rushing about. This article explains its lookup rule and how it affects career and travel.',
    sections: [
      {
        heading: '1. The Traveling Horse lookup rule',
        body: [
          'The Traveling Horse is looked up from the year branch or the day branch against the Earthly Branches of the Four Pillars: with Shen, Zi or Chen, see Yin; with Yin, Wu or Xu, see Shen; with Hai, Mao or Wei, see Si; with Si, You or Chou, see Hai.',
          'In other words, a person born in the monkey, rat or dragon years whose chart shows Yin, a person born in the tiger, horse or dog years whose chart shows Shen, a person born in the pig, rabbit or goat years whose chart shows Si, or a person born in the snake, rooster or ox years whose chart shows Hai has the Traveling Horse in the chart.',
        ],
      },
      {
        heading: '2. What the Traveling Horse means in a chart',
        body: [
          'The Traveling Horse governs movement: frequent travel, long business trips, building a career in another place, job changes and relocating house. When the Traveling Horse meets a clash, the movement is severe; when it meets a combination, the movement comes with a tether.',
          'If the Traveling Horse is a favorable and useful element, one gains wealth through movement, succeeds by developing elsewhere, or works in "moving" industries such as logistics, tourism and foreign trade; if it is unfavorable, one toils and rushes about and has no fixed home.',
        ],
      },
      {
        heading: '3. The Traveling Horse and other shensha',
        body: [
          'A Traveling Horse carrying a Wealth star is "a horse that generates wealth", seeking money through movement; carrying an Officer star it is "a horse with an officer", promotion in a distant place; carrying Peach Blossom it is "Peach Blossom beside the horse", romance in a foreign land.',
          'When a Luck Pillar or Annual Pillar meets the Traveling Horse, there are often changes such as moving house, changing jobs or travelling far.',
        ],
      },
    ],
  },
]

// Batch 2 (2026-11-14): the remaining 50 shensha articles.
// Split into part files so each batch can be translated and reviewed independently;
// order follows the Chinese source order.
export const shenshaEn: ArticleEn[] = [
  ...shenshaFirst,
  ...shenshaPart2,
  ...shenshaPart3,
  ...shenshaPart4,
  ...shenshaPart5,
  ...shenshaPart6,
]
