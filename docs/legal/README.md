# 法律文本已迁至 src/content/legal/

正文（会被部署、由页面渲染）在：
- src/content/legal/terms.md
- src/content/legal/privacy.md

迁走原因：`.vercelignore` 排除 `docs/`，页面在服务端读文件时读不到。
★ 请勿在 docs/ 下再放一份副本 —— 法律文本只能有一个源。
