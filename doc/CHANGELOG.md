# 更新日志

本文档记录了 matchstick-solver-graph 项目的所有重要变更。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [未发布]

---

## [v0.2] - 2026-02-19

### 新增
- 添加了三种新的2根火柴变换方式
  - `moveSubThenAdd`: 移动1根 + 移除1根 + 添加1根（净-1根）
  - `moveAddThenSub`: 移动1根 + 添加1根 + 移除1根（净+1根）
  - `removeRemoveAdd2`: 移除2根 + 添加2根（净0根）
- 前端新增搜索上限输入框（1000-500000节点）
- 前端新增过滤正负号按钮，可过滤包含前导符号的解
- 规则页面（移动2根模式）新增两列：
  - "移1减1根得到..." (moveSub)
  - "移1加1根得到..." (moveAdd)
- 新增测试用例：94-35=48 和 1+7=8+8

### 改进
- 优化过滤逻辑，仅过滤开头或等号后的正负号（如 +8=8, 1+7=+8）
- 调整过滤按钮位置至搜索上限同一行
- 更新 i18n 翻译（moveSub, moveAdd, filterSigns）
- parse-rules.ts 自动解析 markdown 规则表第9和第10列
- graph-builder.ts 自动创建 MOVE_SUB 和 MOVE_ADD 有向边

### 修复
- 修正过滤按钮误过滤所有含加减号的表达式问题

---

## [v0.1] - 2026-02-18
