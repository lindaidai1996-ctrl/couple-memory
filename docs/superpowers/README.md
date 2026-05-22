# Superpowers 文档约定

`docs/superpowers/` 是仓库内承载 Superpowers 相关正式文档的唯一入口。

## 目录职责

- `plans/`
  - 存放实施计划、执行路线图、阶段计划、已落地工作的后续推进文档
- `specs/`
  - 存放设计规格、方案文档、边界定义、实现前的结构化设计

## 落地规则

- 新的正式计划文档统一写入 `docs/superpowers/plans/`
- 新的正式设计文档统一写入 `docs/superpowers/specs/`
- 文件名统一采用 `YYYY-MM-DD-topic.md` 风格
- 如果同一主题有分阶段文档，优先使用 `YYYY-MM-DD-topic-phase-n.md` 或等价的可读命名

## 与其他目录的边界

- `docs/design/`
  - 存放项目级长期设计文档，如产品、架构、数据库、API、部署等主文档
- `.superpowers/`
  - 仅保留工具运行过程产物，例如 brainstorm 生成内容
  - 不再放置正式计划或设计文档
