/**
 * 规则管理器
 * 负责规则的加载、渲染和保存
 */

export class RulesManager {
    constructor(app) {
        this.app = app;
        this.rulesCache = {};
        this.isEditMode = false;
    }

    /**
     * 从API加载规则
     */
    async loadRulesFromAPI(mode) {
        try {
            const response = await fetch(`${this.app.apiUrl}/rules/${mode}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            this.rulesCache[mode] = data.characters || [];
            return this.rulesCache[mode];
        } catch (error) {
            console.error('Failed to load rules from API:', error);
            // 如果API失败，返回内置规则
            return this.getMockRules(mode);
        }
    }

    /**
     * 保存规则到后端
     */
    async saveRulesToAPI(mode, characters) {
        try {
            const response = await fetch(`${this.app.apiUrl}/rules/${mode}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characters })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to save rules:', error);
            throw error;
        }
    }

    /**
     * 渲染规则表
     */
    async renderRulesTable() {
        const tbody = document.querySelector('tbody');
        if (!tbody) return;

        // 尝试从API加载规则，失败则使用内置规则
        let rules;
        if (this.rulesCache[this.app.currentMode]) {
            rules = this.rulesCache[this.app.currentMode];
        } else {
            rules = await this.loadRulesFromAPI(this.app.currentMode);
        }
        
        const isHandwritten = (this.app.currentMode === 'handwritten');
        
        tbody.innerHTML = '';
        rules.forEach(rule => {
            const row = document.createElement('tr');
            row.className = 'fade-in';
            
            // 字符列 - 使用 SVG
            const charCell = document.createElement('th');
            const charValue = rule.char || rule.character || '';
            if (charValue === 'SPACE') {
                charCell.textContent = this.app.i18n.t('emptySpace');
            } else {
                const charSvg = this.app.matchstickDisplay.createEquationDisplay(charValue, isHandwritten);
                charCell.appendChild(charSvg);
            }
            row.appendChild(charCell);
            
            // 火柴数
            const matchCell = document.createElement('td');
            matchCell.textContent = rule.matches || rule.matchsticks || 0;
            if (this.isEditMode) {
                matchCell.contentEditable = true;
                matchCell.style.cursor = 'text';
            }
            row.appendChild(matchCell);
            
            // 根据移动火柴数选择对应列
            if (this.app.currentMoveCount === 1) {
                // 自身变换（移动1根）
                const move1Cell = document.createElement('td');
                this.renderRuleCell(move1Cell, rule.move1 || []);
                row.appendChild(move1Cell);
                
                // 添加1根
                const add1Cell = document.createElement('td');
                this.renderRuleCell(add1Cell, rule.add1 || []);
                row.appendChild(add1Cell);
                
                // 移除1根
                const remove1Cell = document.createElement('td');
                this.renderRuleCell(remove1Cell, rule.remove1 || []);
                row.appendChild(remove1Cell);
            } else {
                // 自身变换（移动2根）
                const move2Cell = document.createElement('td');
                this.renderRuleCell(move2Cell, rule.move2 || []);
                row.appendChild(move2Cell);
                
                // 添加2根
                const add2Cell = document.createElement('td');
                this.renderRuleCell(add2Cell, rule.add2 || []);
                row.appendChild(add2Cell);
                
                // 移除2根
                const remove2Cell = document.createElement('td');
                this.renderRuleCell(remove2Cell, rule.remove2 || []);
                row.appendChild(remove2Cell);
            }
            
            tbody.appendChild(row);
        });
    }

    /**
     * 渲染规则单元格（使用 SVG）
     */
    renderRuleCell(cell, chars) {
        // 在编辑模式下，直接显示文本让用户编辑
        if (this.isEditMode) {
            cell.contentEditable = true;
            cell.style.cursor = 'text';
            cell.textContent = (!chars || chars.length === 0) ? '' : chars.join(', ');
            return;
        }
        
        if (!chars || chars.length === 0) {
            cell.textContent = '-';
            return;
        }

        const container = document.createElement('div');
        container.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap; align-items: center;';
        const isHandwritten = (this.app.currentMode === 'handwritten');
        
        chars.forEach((char, index) => {
            if (index > 0) {
                const comma = document.createElement('span');
                comma.textContent = ',';
                comma.style.cssText = 'margin: 0 -2px; font-size: 12px;';
                container.appendChild(comma);
            }
            
            if (char === 'SPACE') {
                const span = document.createElement('span');
                span.textContent = this.app.i18n.t('emptySpace');
                span.style.cssText = 'color: var(--text-secondary); font-size: 0.8rem;';
                container.appendChild(span);
            } else if (char === '11' || char === '(11)H') {
                const svg1 = this.app.matchstickDisplay.createDigitSVG(isHandwritten ? '(1)H' : '1', isHandwritten);
                svg1.style.cssText = 'width: 20px; height: 28px; flex-shrink: 0;';
                const svg2 = this.app.matchstickDisplay.createDigitSVG(isHandwritten ? '(1)H' : '1', isHandwritten);
                svg2.style.cssText = 'width: 20px; height: 28px; flex-shrink: 0; margin-left: -6px;';
                container.appendChild(svg1);
                container.appendChild(svg2);
            } else {
                const svg = this.app.matchstickDisplay.createDigitSVG(char, isHandwritten);
                svg.style.cssText = 'width: 20px; height: 28px; flex-shrink: 0;';
                container.appendChild(svg);
            }
        });
        
        cell.appendChild(container);
    }

    /**
     * 获取规则数据（内置备用）
     */
    getMockRules(mode) {
        const isHandwritten = (mode === 'handwritten');
        
        if (!isHandwritten) {
            // 标准模式规则
            return [
                { char: 'SPACE', matches: 0, move1: [], add1: ['-'], remove1: [], move2: [], add2: ['+', 'x', '/', '=', '1'], remove2: [] },
                { char: '-', matches: 1, move1: [], add1: ['+', '='], remove1: ['SPACE'], move2: [], add2: ['7'], remove2: [] },
                { char: 'x', matches: 2, move1: ['/'], add1: [], remove1: [], move2: ['+', '=', '1'], add2: [], remove2: ['SPACE'] },
                { char: '=', matches: 2, move1: ['+'], add1: [], remove1: ['-'], move2: ['+', 'x', '/', '1'], add2: [], remove2: ['SPACE'] },
                { char: '+', matches: 2, move1: ['1', '='], add1: [], remove1: ['-'], move2: ['x', '/', '=', '1'], add2: [], remove2: ['SPACE'] },
                { char: '/', matches: 2, move1: ['x'], add1: [], remove1: [], move2: ['+', '=', '1'], add2: [], remove2: ['SPACE'] },
                { char: '1', matches: 2, move1: ['+'], add1: ['7'], remove1: [], move2: ['x', '/', '='], add2: ['4'], remove2: ['SPACE'] },
                { char: '7', matches: 3, move1: [], add1: [], remove1: ['1'], move2: [], add2: ['3'], remove2: ['-'] },
                { char: '4', matches: 4, move1: ['11'], add1: [], remove1: [], move2: [], add2: ['9'], remove2: ['1'] },
                { char: '11', matches: 4, move1: ['4'], add1: [], remove1: [], move2: [], add2: ['0'], remove2: [] },
                { char: '5', matches: 5, move1: ['3'], add1: ['9', '6'], remove1: [], move2: ['2'], add2: ['8'], remove2: [] },
                { char: '3', matches: 5, move1: ['5', '2'], add1: ['9'], remove1: [], move2: [], add2: ['8'], remove2: ['7'] },
                { char: '2', matches: 5, move1: ['3'], add1: [], remove1: [], move2: ['5'], add2: ['8'], remove2: [] },
                { char: '6', matches: 6, move1: ['0', '9'], add1: ['8'], remove1: ['5'], move2: [], add2: [], remove2: [] },
                { char: '9', matches: 6, move1: ['0', '6'], add1: ['8'], remove1: ['3', '5'], move2: [], add2: [], remove2: [] },
                { char: '0', matches: 6, move1: ['6', '9'], add1: ['8'], remove1: [], move2: [], add2: [], remove2: ['11'] },
                { char: '8', matches: 7, move1: [], add1: [], remove1: ['0', '6', '9'], move2: [], add2: [], remove2: ['2', '3', '5'] },
            ];
        } else {
            // 手写模式规则
            return [
                { char: 'SPACE', matches: 0, move1: [], add1: ['-', '(1)H'], remove1: [], move2: [], add2: ['x', '=', '+', '/', '(7)H', '(11)H'], remove2: [] },
                { char: '(1)H', matches: 1, move1: ['-'], add1: ['(7)H', '(11)H', '+'], remove1: ['SPACE'], move2: [], add2: ['(4)H'], remove2: [] },
                { char: '-', matches: 1, move1: ['(1)H'], add1: ['(7)H', '+', '='], remove1: ['SPACE'], move2: [], add2: ['(4)H'], remove2: [] },
                { char: 'x', matches: 2, move1: ['/'], add1: [], remove1: [], move2: ['=', '+', '/', '(7)H', '(11)H'], add2: [], remove2: ['SPACE'] },
                { char: '=', matches: 2, move1: ['+', '(7)H'], add1: [], remove1: ['-'], move2: ['x', '+', '/', '(7)H', '(11)H'], add2: ['(0)H'], remove2: ['SPACE'] },
                { char: '+', matches: 2, move1: ['(7)H', '(11)H', '='], add1: ['(4)H'], remove1: ['(1)H', '-'], move2: ['x', '=', '/', '(7)H', '(11)H'], add2: [], remove2: ['SPACE'] },
                { char: '/', matches: 2, move1: ['x'], add1: [], remove1: [], move2: ['x', '=', '+', '(7)H', '(11)H'], add2: [], remove2: ['SPACE'] },
                { char: '(7)H', matches: 2, move1: ['(11)H', '+', '='], add1: [], remove1: ['(1)H', '-'], move2: ['x', '=', '+', '/', '(11)H'], add2: ['(0)H'], remove2: ['SPACE'] },
                { char: '(11)H', matches: 2, move1: ['(7)H', '+'], add1: [], remove1: ['(1)H'], move2: ['x', '=', '+', '/', '(7)H'], add2: ['(0)H'], remove2: ['SPACE'] },
                { char: '(4)H', matches: 3, move1: [], add1: [], remove1: ['+'], move2: [], add2: [], remove2: ['(1)H', '-'] },
                { char: '(0)H', matches: 4, move1: [], add1: ['(6)H', '(9)H'], remove1: [], move2: [], add2: [], remove2: ['=', '(7)H', '(11)H'] },
                { char: '5', matches: 5, move1: ['3', '(6)H', '(9)H'], add1: [], remove1: [], move2: ['2'], add2: ['8'], remove2: [] },
                { char: '(9)H', matches: 5, move1: ['3', '5', '(6)H'], add1: [], remove1: ['(0)H'], move2: ['2'], add2: ['8'], remove2: [] },
                { char: '(6)H', matches: 5, move1: ['5', '(9)H'], add1: [], remove1: ['(0)H'], move2: ['2'], add2: ['8'], remove2: [] },
                { char: '3', matches: 5, move1: ['2', '5', '(9)H'], add1: [], remove1: [], move2: [], add2: ['8'], remove2: [] },
                { char: '2', matches: 5, move1: ['3'], add1: [], remove1: [], move2: ['5', '(6)H', '(9)H'], add2: ['8'], remove2: [] },
                { char: '8', matches: 7, move1: [], add1: [], remove1: [], move2: [], add2: [], remove2: ['2', '3', '5', '(6)H', '(9)H'] },
            ];
        }
    }
}
