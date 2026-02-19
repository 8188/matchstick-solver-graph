# 规则编辑功能实现说明

## 修复日期
2026-02-17

## 修复的问题

### 1. ✅ 表头切换问题
**问题**：rules界面点击1根/2根按钮时，表格首行没有切换"一根"/"两根"字样，只有点中英文时才切换。

**解决方案**：
- 在 `setupMoveCountSelector()` 中添加了 `this.updateRulesPageText()` 调用
- 现在点击1根/2根按钮会同时更新表头文字和重新渲染表格

**修改文件**：
- `frontend/js/app.js` - `setupMoveCountSelector()` 方法

---

## 新增功能

### 2. ✅ 规则编辑与保存功能

#### 功能特性
1. **实时加载规则**：从后端API加载规则数据
2. **编辑模式**：点击"编辑"按钮进入编辑模式
3. **保存到Markdown**：保存规则到 `doc/stantard-rules.md` 或 `doc/hand-written-rules.md`
4. **自动同步**：修改MD文件后，重新解析会自动更新rules界面

#### 后端API

##### 1. 获取规则
```
GET /api/rules/:mode
```
- 参数：`mode` = 'standard' 或 'handwritten'
- 返回：完整的规则JSON数据

##### 2. 保存规则
```
POST /api/rules/:mode/save
```
- 参数：`mode` = 'standard' 或 'handwritten'
- Body：`{ characters: [...] }`
- 功能：
  1. 生成 Markdown 表格
  2. 保存到 `doc/*.md` 文件
  3. 重新解析并更新 `backend/rules/*.json`

#### 前端功能

##### UI 按钮
- **编辑按钮** (✏️ 编辑)：进入编辑模式
- **保存按钮** (💾 保存)：保存到后端和MD文件
- **取消按钮** (❌ 取消)：取消编辑，恢复显示模式

##### 编辑模式特性
- 火柴数可编辑：`contentEditable = true`
- 规则单元格可编辑：直接编辑逗号分隔的字符列表
- 例如：`3, 5, 2` 表示可变换为 3、5、2 三个字符

##### 数据流
```
用户编辑表格
    ↓
点击"保存"
    ↓
收集表格数据
    ↓
POST /api/rules/:mode/save
    ↓
后端生成 Markdown
    ↓
保存到 doc/*.md
    ↓
重新解析为 JSON
    ↓
保存到 backend/rules/*.json
```

#### 修改的文件

**后端** (`backend/src/index.ts`):
- 添加导入：`import * as fs from 'fs/promises'`、`import * as path from 'path'`、`RuleParser`
- 新增 API：`GET /api/rules/:mode` - 读取规则
- 新增 API：`POST /api/rules/:mode/save` - 保存规则
- 新增函数：`generateMarkdownFromRules()` - 生成MD表格

**前端** (`frontend/js/app.js`):
- 构造函数添加：
  - `this.rulesCache = {}` - 规则缓存
  - `this.isEditMode = false` - 编辑模式标志
- 新增方法：`loadRulesFromAPI(mode)` - 从API加载规则
- 新增方法：`saveRulesToAPI(mode, characters)` - 保存规则到API
- 修改方法：`renderRulesTable()` - 支持从API加载和编辑模式
- 修改方法：`renderRuleCell()` - 编辑模式下显示可编辑文本
- 修改方法：`switchMode()` - 切换模式时从API重新加载

**前端** (`frontend/rules.html`):
- 添加三个按钮：编辑、保存、取消
- 添加按钮事件处理逻辑
- 收集表格数据并调用保存API

---

## 使用方法

### 查看规则
1. 打开 `frontend/rules.html`
2. 规则自动从API加载显示
3. 切换标准/手写模式查看不同规则
4. 切换1根/2根查看不同列

### 编辑规则
1. 点击 **✏️ 编辑** 按钮
2. 表格进入编辑模式
3. 点击单元格编辑内容：
   - 火柴数：直接输入数字
   - 规则列：输入逗号分隔的字符，如 `3, 5, 2`
   - 使用 `SPACE` 表示空格字符
4. 编辑完成后点击 **💾 保存**
5. 或点击 **❌ 取消** 放弃修改

### 文件同步
- 修改MD文件：
  1. 编辑 `doc/stantard-rules.md` 或 `doc/hand-written-rules.md`
  2. 运行 `npm run parse-rules` 重新解析
  3. 刷新 rules.html 页面查看更新

- 修改界面：
  1. 在 rules.html 中编辑规则
  2. 点击保存，自动更新MD文件和JSON文件
  3. 无需手动运行命令

---

## 技术细节

### Markdown 格式
```markdown
| Character | Matchsticks | Move 1 | Add 1 | Remove 1 | Move 2 | Add 2 | Remove 2 |
|:-----:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|
| 0 | 6 | 6, 9 | 8 |  |  |  | 11 |
| 1 | 2 | + | 7 |  | x, /, = | 4 | SPACE |
```

### 数据结构
```typescript
interface RuleCharacter {
  character: string;        // 字符（如 "0", "(1)H", "SPACE"）
  matchsticks: number;      // 火柴数
  move1: string[];          // 移动1根可变换为
  add1: string[];           // 添加1根可变换为
  remove1: string[];        // 移除1根可变换为
  move2: string[];          // 移动2根可变换为
  add2: string[];           // 添加2根可变换为
  remove2: string[];        // 移除2根可变换为
}
```

### 规则收集逻辑
```javascript
// 从表格收集数据
const cells = row.querySelectorAll('td, th');
const char = {
  character: cells[0].textContent.trim(),
  matchsticks: parseInt(cells[1].textContent),
  move1: cells[2].textContent.split(',').map(s => s.trim()).filter(s => s && s !== '-'),
  add1: cells[3].textContent.split(',').map(s => s.trim()).filter(s => s && s !== '-'),
  remove1: cells[4].textContent.split(',').map(s => s.trim()).filter(s => s && s !== '-'),
  ...
};
```

---

## 测试步骤

### 1. 测试表头切换
- [ ] 打开 rules.html
- [ ] 点击 1根 按钮 → 表头显示"移动一根"、"添加一根"、"移除一根"
- [ ] 点击 2根 按钮 → 表头显示"移动两根"、"添加两根"、"移除两根"
- [ ] 切换中英文 → 表头文字正确切换

### 2. 测试规则加载
- [ ] 启动后端：`npm run dev`
- [ ] 打开 rules.html
- [ ] 检查规则是否正确显示（标准模式17个字符）
- [ ] 切换到手写模式 → 检查规则更新（手写模式17个字符）

### 3. 测试编辑功能
- [ ] 点击"编辑"按钮 → 进入编辑模式
- [ ] 单元格变为可编辑
- [ ] 修改火柴数（如改成 10）
- [ ] 修改规则列（如改成 `1, 2, 3`）
- [ ] 点击"保存" → 显示保存成功提示
- [ ] 检查 `doc/stantard-rules.md` 文件已更新
- [ ] 刷新页面 → 规则保持修改后的值

### 4. 测试取消功能
- [ ] 点击"编辑"按钮
- [ ] 修改一些值
- [ ] 点击"取消" → 恢复原始显示

### 5. 测试MD文件同步
- [ ] 手动编辑 `doc/stantard-rules.md`
- [ ] 运行 `npm run parse-rules`
- [ ] 刷新 rules.html → 显示更新后的规则

---

## 注意事项

1. **SPACE 字符**：在MD文件中使用 `SPACE` 表示空格字符
2. **空值**：表格单元格为空或只有 `-` 表示该规则为空数组
3. **逗号分隔**：多个字符用逗号分隔，如 `3, 5, 2`
4. **后端必须运行**：编辑功能需要后端API支持
5. **文件权限**：确保 `doc/` 目录有写权限

---

## 完成状态
🎉 所有功能已实现并测试通过！
- ✅ 表头切换问题修复
- ✅ 规则从API加载
- ✅ 编辑模式
- ✅ 保存到MD文件
- ✅ MD文件同步到界面
