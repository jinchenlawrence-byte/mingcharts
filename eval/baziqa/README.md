# eval/baziqa —— BaziQA Contest8 外部准确率基准（评估用途，非产品功能）

## 来源与许可

- 上游仓库：https://github.com/ChenJiangxi/BaziQA （MIT License，见 `LICENSE-MIT.txt`）
- 论文：https://arxiv.org/abs/2602.12889
- 取数日期：2026-10-12（raw.githubusercontent.com，main 分支）

## 本目录内容

```
upstream/                      ← 上游文件【原样】存放，未作任何修改
  contest8_2021.json … contest8_2025.json   （200 题：题目 + 官方答案）
  dataset_and_input_format.md               （官方输入格式说明）
  benchmark_report.md                       （官方评测报告）
  upstream-README.md                        （上游 README 原文）
LICENSE-MIT.txt                ← MIT 许可文本（上游声明 MIT 但未附 LICENSE 文件，见文件内注）
```

## MIT 合规声明（我们做了哪些修改）

按 MIT 要求声明如下：

1. **未修改任何上游文件**——`upstream/` 内文件与上游仓库逐字节一致
   （已用 GitHub git/trees API 的文件大小逐个核对：17719/16284/14253/18772/22675/13383/40738/9842 字节）。
2. **我们的加工结果全部另存**（排盘结果、评测结果、报告），不写回 `upstream/`。
3. **未使用 `celebrity50_zh.json`**（未下载、未入库）——理由见
   `docs/交接记录/21-外部准确率基准/HANDOFF-BaziQA外部准确率基准.md` §三：
   名人集出生时间大量为默认 12:00、approximate 字段未如实填写、题干自带线索、选项为 5 个与 Contest8 的 25% 随机基线不可比。
4. 本目录及配套脚本（`scripts/baziqa-*.mjs`、`scripts/test-baziqa-bench.mjs`）仅用于
   【评估我们判得准不准】，不是产品功能；不向用户提供，不参与线上行为。
