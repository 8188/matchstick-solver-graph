/**
 * 规则页面控制器
 * 负责 rules.html 页面的初始化和事件处理
 */

export class RulesPageController {
    constructor(app) {
        this.app = app;
        this.init();
    }

    /**
     * 初始化规则页面
     */
    init() {
        // 同步主题
        this.syncTheme();
        
        // 设置事件监听
        this.setupEditButton();
        this.setupSaveButton();
        this.setupCancelButton();
        
        // 更新页面文本
        if (this.app.updateRulesPageText) {
            this.app.updateRulesPageText();
        }
    }

    /**
     * 同步主题
     */
    syncTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeToggle = document.querySelector('#theme-toggle');
        if (themeToggle) {
            themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
        }
    }

    /**
     * 设置编辑按钮
     */
    setupEditButton() {
        const editBtn = document.querySelector('#edit-rules-btn');
        if (!editBtn) return;

        editBtn.addEventListener('click', () => {
            this.app.rulesManager.isEditMode = true;
            this.toggleEditMode(true);
            this.app.rulesManager.renderRulesTable();
        });
    }

    /**
     * 设置保存按钮
     */
    setupSaveButton() {
        const saveBtn = document.querySelector('#save-rules-btn');
        if (!saveBtn) return;

        saveBtn.addEventListener('click', async () => {
            try {
                await this.saveRules();
                alert(`规则已保存到 ${this.app.currentMode === 'standard' ? 'stantard-rules.md' : 'hand-written-rules.md'}`);
                this.app.rulesManager.isEditMode = false;
                this.toggleEditMode(false);
                this.app.rulesManager.renderRulesTable();
            } catch (error) {
                alert('保存失败: ' + error.message);
            }
        });
    }

    /**
     * 设置取消按钮
     */
    setupCancelButton() {
        const cancelBtn = document.querySelector('#cancel-edit-btn');
        if (!cancelBtn) return;

        cancelBtn.addEventListener('click', () => {
            this.app.rulesManager.isEditMode = false;
            this.toggleEditMode(false);
            this.app.rulesManager.renderRulesTable();
        });
    }

    /**
     * 切换编辑模式UI
     */
    toggleEditMode(isEdit) {
        const editBtn = document.querySelector('#edit-rules-btn');
        const saveBtn = document.querySelector('#save-rules-btn');
        const cancelBtn = document.querySelector('#cancel-edit-btn');

        if (editBtn) editBtn.style.display = isEdit ? 'none' : 'inline-block';
        if (saveBtn) saveBtn.style.display = isEdit ? 'inline-block' : 'none';
        if (cancelBtn) cancelBtn.style.display = isEdit ? 'inline-block' : 'none';
    }

    /**
     * 保存规则
     */
    async saveRules() {
        const tbody = document.querySelector('tbody');
        const rows = tbody.querySelectorAll('tr');
        const updatedCharacters = [];
        
        // 获取当前缓存的完整规则
        const cachedRules = this.app.rulesManager.rulesCache[this.app.currentMode] || [];
        
        rows.forEach((row, index) => {
            const cells = row.querySelectorAll('td, th');
            
            // 从缓存中获取原始字符（因为DOM中的SVG没有textContent）
            const cachedChar = cachedRules[index] || {};
            const charText = cachedChar.char || cachedChar.character || '';
            
            // 根据当前显示的是1根还是2根，更新对应的数据
            const char = {
                character: charText,
                matchsticks: parseInt(cells[1].textContent) || 0,
                mode: this.app.currentMode,
                category: cachedChar.category || 'digit',
                // 保留未显示的数据
                move1: this.app.currentMoveCount === 1 ? 
                    this.parseCell(cells[2]) : (cachedChar.move1 || []),
                add1: this.app.currentMoveCount === 1 ? 
                    this.parseCell(cells[3]) : (cachedChar.add1 || []),
                remove1: this.app.currentMoveCount === 1 ? 
                    this.parseCell(cells[4]) : (cachedChar.remove1 || []),
                move2: this.app.currentMoveCount === 2 ? 
                    this.parseCell(cells[2]) : (cachedChar.move2 || []),
                add2: this.app.currentMoveCount === 2 ? 
                    this.parseCell(cells[3]) : (cachedChar.add2 || []),
                remove2: this.app.currentMoveCount === 2 ? 
                    this.parseCell(cells[4]) : (cachedChar.remove2 || [])
            };
            updatedCharacters.push(char);
        });
        
        // 保存到后端
        await this.app.rulesManager.saveRulesToAPI(this.app.currentMode, updatedCharacters);
        
        // 更新缓存
        this.app.rulesManager.rulesCache[this.app.currentMode] = updatedCharacters;
    }

    /**
     * 解析单元格内容
     */
    parseCell(cell) {
        if (!cell) return [];
        // 允许小写 h，归一化为大写 H： (1)h -> (1)H
        let text = cell.textContent.trim();
        text = text.replace(/(\(\d+\))h/gi, '$1H');
        // 如果是空单元格标记（单独的 '-'），返回空数组
        if (text === '-' || text === '') return [];
        // 否则按逗号分割，保留 '-' 字符
        return text.split(',')
            .map(s => s.trim())
            .filter(s => s);
    }
}
