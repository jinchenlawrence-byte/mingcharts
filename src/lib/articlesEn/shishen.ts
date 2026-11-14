import type { ArticleEn } from './types'
import { shishenPart2 } from './shishen-2'

// Batch 1 (2026-11-14): shishen category English articles
const shishenFirst: ArticleEn[] = [
  {
    slug: 'zhengguan-shishen',
    title: 'What Does the Direct Officer Mean in Bazi? A Complete Guide',
    category: 'shishen',
    keywords: ['Direct Officer', 'Direct Officer chart', 'Ten Gods', 'bazi career', 'bazi marriage'],
    description:
      'Direct Officer is the Ten God that controls the Day Master with the opposite polarity. It rules reputation, duty, rank and legitimate authority, and shapes career and marriage.',
    sections: [
      {
        heading: '1. What the Direct Officer Is',
        body: [
          'Direct Officer is one of the Ten Gods. It is the element that controls the Day Master while differing from it in polarity. Take a Jia (Yang Wood) Day Master: Xin (Yin Metal) controls Jia Wood. Jia is yang and Xin is yin, so their polarities differ, and Xin is therefore the Direct Officer of Jia.',
          'Zi Ping Zhen Quan (True Exposition of Zi Ping) says: "The Officer star is the qi of nobility." Direct Officer stands for legitimate discipline, reputation, status and office. It is a benevolent god, so it is best used by support rather than by clash or attack.',
        ],
      },
      {
        heading: '2. The Character of a Direct Officer Person',
        body: [
          'People with Direct Officer in their chart tend to follow the rules, carry a strong sense of responsibility, value reputation and do things by the book. They are upright and principled, with good self-restraint, and they fit well in structured settings such as public institutions, large corporations and administrative management.',
          'When Direct Officer is too strong, a person becomes over-cautious, rigid and short of boldness. When Direct Officer is broken by the Hurting Officer, it often brings gossip, disputes and friction with superiors.',
        ],
      },
      {
        heading: '3. Direct Officer and Career',
        body: [
          'Direct Officer is the star of nobility and governs fame and official advancement. When it is strong and the Day Master is strong enough to carry it, the path upward at work runs smoothly and management authority follows. Direct Officer with Direct Wealth is called "wealth and office both in beauty", bringing both status and money; Direct Officer with Direct Resource is called "Officer and Resource generating each other", which favours literary, clerical and academic work.',
          'What it dislikes is the Hurting Officer meeting the Officer, and a mixture of Officer and Killer. These point to a blocked career path and repeated ups and downs in work.',
        ],
      },
      {
        heading: '4. Direct Officer and Marriage',
        body: [
          'For a woman, Direct Officer is the husband star. A single, clean and strong Direct Officer points to a husband of good character and a stable marriage. If it is too weak, the bond with the husband is thin; if it is excessive, or mixed with the Seven Killing, emotional life becomes complicated.',
          'For a man, Direct Officer represents daughters (the Seven Killing represents sons), and it also describes career pressure and relationships with superiors.',
        ],
      },
    ],
  },
  {
    slug: 'qisha-shishen',
    title: 'What Does the Seven Killing Mean? Reading a Seven Killing Chart',
    category: 'shishen',
    keywords: ['Seven Killing', 'Seven Killing chart', 'Indirect Officer', 'controlling the Killer', 'Eating God'],
    description:
      'Seven Killing, also called the Indirect Officer, controls the Day Master with the same polarity. It rules authority and pressure: tamed it becomes power, untamed it becomes harm.',
    sections: [
      {
        heading: '1. What the Seven Killing Is',
        body: [
          'Seven Killing, also called the Indirect Officer, is the element that controls the Day Master with the same polarity. Take a Jia (Yang Wood) Day Master: Geng (Yang Metal) controls Jia Wood. Both Jia and Geng are yang, so their polarities match, and Geng is therefore the Seven Killing of Jia.',
          'Zi Ping Zhen Quan says: "The Killer attacks the self and hardly looks like a fine thing, yet the most noble charts often keep the Seven Killing." The Seven Killing is a fierce god and must be handled in reverse: either the Eating God controls it, or the Resource star transforms it. Only then does it work for you.',
        ],
      },
      {
        heading: '2. The Character of the Seven Killing',
        body: [
          'People with Seven Killing in their chart are decisive, bold, rebellious and competitive, with a pioneering spirit. They act fast and hard and do not bow to power. Military and police careers, law enforcement and other martial professions are often built on a Seven Killing chart.',
          'Without control, the Seven Killing makes a person hot-tempered, combative and prone to trouble. When the Day Master is weak and the Killer is heavy, the person becomes timid, feels constant pressure and suffers in health.',
        ],
      },
      {
        heading: '3. Taming and Transforming the Seven Killing',
        body: [
          'There are three ways to handle the Seven Killing. The first is the Eating God controlling the Killer: the Eating God restrains the Seven Killing the way a tiger is tamed for use, and the person gains both civil and martial talent. The second is the Resource star transforming the Killer: the Resource drains the Killer and feeds the Day Master, turning an enemy into a friend, and the person wins by softness. The third is the Yang Blade combining with the Killer: Rob Wealth binds the Seven Killing, producing formidable authority.',
          'Zi Ping Zhen Quan gives the greatest weight to taming and transforming the Seven Killing. With control it becomes authority; without control it becomes disaster. The most noble charts are usually Seven Killing charts that are properly balanced.',
        ],
      },
      {
        heading: '4. Seven Killing and Family',
        body: [
          'For a woman, the Seven Killing is the secondary husband or the lover. A chart with Officer and Killer mixed and no clear resolution points to complicated relationships. A single Seven Killing that is controlled means a husband of courage and accomplishment.',
          'For a man, the Seven Killing represents sons. It also stands for petty opponents, pressure and sudden misfortune, so extra care with safety is wise when the Luck Pillar or Annual Pillar activates it.',
        ],
      },
    ],
  },
  {
    slug: 'zhengcai-piancai',
    title: 'Direct Wealth and Indirect Wealth: Reading Wealth in Bazi',
    category: 'shishen',
    keywords: ['Direct Wealth', 'Indirect Wealth', 'wealth stars', 'bazi wealth', 'Ten Gods'],
    description:
      'The wealth stars are the elements the Day Master controls. Opposite polarity gives Direct Wealth and steady income; matching polarity gives Indirect Wealth and windfall gains.',
    sections: [
      {
        heading: '1. Direct Wealth versus Indirect Wealth',
        body: [
          'The wealth stars are the element that the Day Master controls. When the polarity is opposite it is Direct Wealth (for example, Jia Yang Wood controls Ji Yin Earth). When the polarity is the same it is Indirect Wealth (for example, Jia Yang Wood controls Wu Yang Earth).',
          'Direct Wealth governs money earned by honest means: salary, wages, steady income, thrift and practicality. Indirect Wealth governs money shared among many: business, investment, windfalls and open-handed generosity.',
        ],
      },
      {
        heading: '2. The Character of a Wealth Star Person',
        body: [
          'With Direct Wealth in the chart: thrifty, practical, focused on accumulation and orderly in daily life, and dependable in work. But when Direct Wealth is too strong, a person turns stingy and overly materialistic.',
          'With Indirect Wealth in the chart: generous, sociable and quick to spot opportunity, and free with money. But when Indirect Wealth is too strong, a person spends without limit and is not constant in love.',
        ],
      },
      {
        heading: '3. A Strong Day Master Is Needed to Hold Wealth',
        body: [
          'The key question in reading wealth is whether the Day Master can carry it. A strong Day Master with strong wealth is called "self and wealth in balance": the person can both reach wealth and keep it, and rises to a high level of fortune. A weak Day Master with strong wealth is called "much wealth, weak self", a poor man in a rich house who sees the money but cannot take it, and may even be harmed by it.',
          'Di Tian Sui (Drip of Heavenly Marrow) says: "How do we know a person is wealthy? The wealth qi flows through the gate." Wealth is truly rich only when it has a source (the Eating God and Hurting Officer producing wealth), a guard (the Officer star protecting wealth), and a strong Day Master able to hold it.',
        ],
      },
      {
        heading: '4. Wealth Stars and Marriage',
        body: [
          'For a man, wealth is the wife star: Direct Wealth is the wife, while Indirect Wealth is the lover or a second marriage. A single, clean Direct Wealth points to a virtuous wife; strong Indirect Wealth with weak Direct Wealth gives much romantic attention but a risk of entanglement.',
          'The wealth star also represents the father (specifically the Indirect Wealth). When the wealth star is severely attacked, pay attention to the father\'s health.',
        ],
      },
    ],
  },
]

// Batch 2 (2026-11-14): the remaining shishen articles.
export const shishenEn: ArticleEn[] = [...shishenFirst, ...shishenPart2]
