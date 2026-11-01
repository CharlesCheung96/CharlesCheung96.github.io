# 央企名录维护

数据在 `static/central-soes/data.json`；每条企业记录保存类别、行业、官网、招聘入口及官方来源。官网或招聘入口无法核实时使用 `null`，不要推测 URL。名单来源及历史变更说明放在顶层 `sources` 中，实际完成整理后更新 `checkedOn`。

修改数据或 `scripts/central-soes.template.html` 后，在仓库根目录执行：

```sh
python3 scripts/build-central-soes.py
```

将数据、模板和生成的 `static/central-soes/index.html` 一起提交。现有 Hugo 工作流将 `static/` 内容复制到 `docs/` 并发布，无需额外依赖。
