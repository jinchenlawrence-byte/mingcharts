// 英文文章库（/en/article）数据类型
//
// 与简体 /article 一一对应：slug 必须与 src/lib/articles.ts 完全一致，不得重命名；
// 分类集合与顺序也和简体 ARTICLE_CATEGORIES 保持一致。
// 硬约束：本目录下所有字符串不得出现任何中日韩字符（断言 scripts/test-en-articles.mjs 守住）。
export type ArticleCategorySlug =
  | 'bazi'
  | 'shishen'
  | 'geju'
  | 'wuxing'
  | 'shensha'
  | 'hemun'
  | 'ziwei'
  | 'liunian'

export interface ArticleEnSection {
  heading: string
  body: string[]
}

export interface ArticleEn {
  /** 与简体文章完全一致（逐字），不翻译、不改写 */
  slug: string
  title: string
  category: ArticleCategorySlug
  keywords: string[]
  description: string
  sections: ArticleEnSection[]
}
