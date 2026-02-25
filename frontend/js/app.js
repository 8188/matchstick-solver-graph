/**
 * 主应用控制器 - 重构版
 * 职责：协调各个管理器，处理主页面逻辑
 */

import { I18n } from './i18n.js';
import { MatchstickDisplay } from './components/MatchstickDisplay.js';
import { RulesManager } from './managers/RulesManager.js';

export class App {
    constructor() {
        this.i18n = new I18n();
        this.matchstickDisplay = new MatchstickDisplay();
        this.currentMode = 'standard';
        this.currentMoveCount = 1;
        this.currentTheme = 'dark';
        this.apiUrl = 'http://localhost:8080/api';
        this.filterSigns = false;
        
        // 初始化规则管理器
        this.rulesManager = new RulesManager(this);
        
        // 示例数据
        this.examples = {
            standard: ['8+3-4=0', '6-5=17', '5+7=2', '6+4=4', '9/3=2', '3*3=6'],
            handwritten: ['(0)H+(6)H=(9)H', '2+(4)H=5', '(1)H+2=5', '(4)H+5=(9)H', '2*3=(9)H', '6/3=3']
        };

        this.init();
    }

    /**
     * 初始化应用
     */
    init() {
        // 加载保存的设置
        this.i18n.loadSavedLanguage();
        this.loadSavedTheme();

        // 设置UI
        this.setupUI();

        // 加载第一个示例
        const firstExample = this.examples[this.currentMode] && this.examples[this.currentMode][0];
        const eqInput = document.querySelector('#equation');
        if (eqInput && firstExample) {
            eqInput.value = firstExample;
            this.updateEquationPreview(firstExample);
        }
    }

    /**
     * 设置UI
     */
    setupUI() {
        this.setupModeSelector();
        this.setupMoveCountSelector();
        this.setupThemeToggle();
        this.setupMusicToggle();
        this.setupLanguageToggle();
        this.setupInput();
        this.setupSolveButton();
        this.setupFilterSignsButton();
        this.setupRulesButton();
        this.renderSamples();
        this.renderCharPreview();
        this.updatePageText();

        // 规则页特殊设置
        if (document.querySelector('tbody')) {
            this.rulesManager.renderRulesTable();
        }
    }

    /**
     * 设置模式选择器
     */
    setupModeSelector() {
        const container = document.querySelector("#mode-selector");
        if (!container) return;

        const modes = [
            { name: 'standard', key: 'standardMode' },
            { name: 'handwritten', key: 'handwrittenMode' }
        ];

        container.innerHTML = '';
        modes.forEach(mode => {
            const btn = document.createElement('button');
            btn.className = mode.name === this.currentMode ? 'btn btn-primary' : 'btn btn-secondary';
            btn.textContent = this.i18n.t(mode.key);
            btn.style.cssText = 'flex: 1; font-size: 0.75rem; padding: 6px 12px;';
            btn.addEventListener('click', () => this.switchMode(mode.name));
            container.appendChild(btn);
        });
    }

    /**
     * 设置移动火柴数选择器
     */
    setupMoveCountSelector() {
        const buttons = document.querySelectorAll('.move-count-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.className = 'btn btn-secondary move-count-btn');
                btn.className = 'btn btn-primary move-count-btn';
                this.currentMoveCount = parseInt(btn.dataset.count);
                
                // 规则页重新渲染表格
                if (document.querySelector('tbody')) {
                    this.updateRulesPageText();
                    this.rulesManager.renderRulesTable();
                }
            });
        });
    }

    /**
     * 设置主题切换
     */
    setupThemeToggle() {
        const themeToggle = document.querySelector("#theme-toggle");
        if (!themeToggle) return;

        themeToggle.addEventListener('click', () => {
            this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', this.currentTheme);
            themeToggle.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
            localStorage.setItem('theme', this.currentTheme);
        });
    }

    /**
     * 加载保存的主题
     */
    loadSavedTheme() {
        const saved = localStorage.getItem('theme') ?? 'dark';
        this.currentTheme = saved;
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        const themeToggle = document.querySelector("#theme-toggle");
        if (themeToggle) {
            themeToggle.textContent = this.currentTheme === 'light' ? '🌙' : '☀️';
        }
    }

    /**
     * 设置音乐切换
     */
    setupMusicToggle() {
        const musicToggle = document.querySelector('#music-toggle');
        const bgm = document.querySelector('#bgm');
        if (!musicToggle || !bgm) return;

        musicToggle.addEventListener('click', () => {
            if (bgm.paused) {
                bgm.play();
                musicToggle.textContent = '🔇';
            } else {
                bgm.pause();
                musicToggle.textContent = '🔊';
            }
        });
    }

    /**
     * 设置语言切换
     */
    setupLanguageToggle() {
        const langToggle = document.querySelector('#lang-toggle');
        if (!langToggle) return;

        langToggle.textContent = '🌐';
        langToggle.title = this.i18n.getCurrentLanguage() === 'zh' ? 'Switch to English' : '切换到中文';

        langToggle.addEventListener('click', () => {
            const newLang = this.i18n.getCurrentLanguage() === 'zh' ? 'en' : 'zh';
            this.i18n.setLanguage(newLang);
            langToggle.title = newLang === 'zh' ? 'Switch to English' : '切换到中文';
            this.updatePageText();
            this.setupModeSelector();
            this.renderSamples();
            
            // 规则页重新渲染
            if (document.querySelector('tbody')) {
                this.updateRulesPageText();
                this.rulesManager.renderRulesTable();
            }
        });
    }

    /**
     * 设置输入框
     */
    setupInput() {
        const eqInput = document.querySelector('#equation');
        if (!eqInput) return;

        eqInput.addEventListener('input', (e) => {
            this.renderCharPreview();
            this.updateEquationPreview(e.target.value);
        });

        eqInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.solve();
            }
        });
    }

    /**
     * 设置求解按钮
     */
    setupSolveButton() {
        const solveBtn = document.querySelector('#solve-btn');
        if (!solveBtn) return;

        solveBtn.addEventListener('click', () => this.solve());
    }

    /**
     * 设置过滤正负号按钮
     */
    setupFilterSignsButton() {
        const filterBtn = document.querySelector('#filter-signs-btn');
        if (!filterBtn) return;

        filterBtn.addEventListener('click', () => {
            this.filterSigns = !this.filterSigns;
            
            // 切换按钮样式
            if (this.filterSigns) {
                filterBtn.className = 'btn btn-primary';
                filterBtn.dataset.active = 'true';
                filterBtn.textContent = '✓ 过滤±号';
            } else {
                filterBtn.className = 'btn btn-secondary';
                filterBtn.dataset.active = 'false';
                filterBtn.textContent = '▸ 过滤±号';
            }
        });
    }

    /**
     * 设置规则按钮
     */
    setupRulesButton() {
        const rulesBtn = document.querySelector('#show-rules');
        if (!rulesBtn) return;

        rulesBtn.addEventListener('click', () => {
            window.location.href = 'rules.html';
        });
    }

    /**
     * 切换模式
     */
    switchMode(mode) {
        this.currentMode = mode;
        this.setupModeSelector();
        this.renderSamples();
        this.renderCharPreview();
        this.updatePageText();

        // 规则页重新渲染表格
        if (document.querySelector('tbody')) {
            this.rulesManager.renderRulesTable();
        }

        // 更新示例
        const eqInput = document.querySelector('#equation');
        if (eqInput && this.examples[mode]) {
            eqInput.value = this.examples[mode][0];
            this.updateEquationPreview(eqInput.value);
        }
    }

    /**
     * 渲染示例按钮
     */
    renderSamples() {
        const samplesDiv = document.querySelector('#samples');
        if (!samplesDiv) return;

        const examples = this.examples[this.currentMode] || [];
        const isHandwritten = (this.currentMode === 'handwritten');
        samplesDiv.innerHTML = '';

        examples.forEach(example => {
            const btn = document.createElement('button');
            btn.className = 'example-btn';
            
            // 使用 SVG 显示示例
            const svgDisplay = this.matchstickDisplay.createEquationDisplay(example, isHandwritten);
            btn.appendChild(svgDisplay);
            
            btn.addEventListener('click', () => this.loadSample(example));
            samplesDiv.appendChild(btn);
        });
    }

    /**
     * 加载示例
     */
    loadSample(equation) {
        const input = document.querySelector('#equation');
        if (input) {
            input.value = equation;
            this.updateEquationPreview(equation);
            this.renderCharPreview();
        }
    }

    /**
     * 渲染字符预览
     */
    renderCharPreview() {
        const preview = document.querySelector('#char-preview');
        if (!preview) return;

        preview.innerHTML = '';
        const isHandwritten = (this.currentMode === 'handwritten');
        
        const chars = isHandwritten
            ? ['(0)H', '(1)H', '2', '3', '(4)H', '5', '(6)H', '(7)H', '8', '(9)H', '+', '-', 'x', '/', '=', '(11)H']
            : ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', 'x', '/', '=', '11'];

        chars.forEach(char => {
            const charSpan = document.createElement('span');
            charSpan.style.cssText = 'display: inline-block; padding: 4px 6px;';
            
            if (char === '11' || char === '(11)H') {
                const svg1 = this.matchstickDisplay.createDigitSVG(isHandwritten ? '(1)H' : '1', isHandwritten);
                svg1.style.cssText = 'width: 16px; height: 24px; vertical-align: middle;';
                const svg2 = this.matchstickDisplay.createDigitSVG(isHandwritten ? '(1)H' : '1', isHandwritten);
                svg2.style.cssText = 'width: 16px; height: 24px; vertical-align: middle; margin-left: -4px;';
                charSpan.appendChild(svg1);
                charSpan.appendChild(svg2);
            } else {
                const svg = this.matchstickDisplay.createDigitSVG(char, isHandwritten);
                svg.style.cssText = 'width: 16px; height: 24px; vertical-align: middle;';
                charSpan.appendChild(svg);
            }
            
            preview.appendChild(charSpan);
        });
    }

    /**
     * 更新方程式预览
     */
    updateEquationPreview(equation) {
        const preview = document.querySelector("#equation-preview");
        if (!preview) return;

        preview.innerHTML = '';
        
        if (!equation) {
            preview.style.opacity = '0.5';
            preview.textContent = this.i18n.t('inputPlaceholder');
            return;
        }

        preview.style.opacity = '1';
        const isHandwritten = (this.currentMode === 'handwritten');
        
        const display = this.matchstickDisplay.createEquationDisplay(equation, isHandwritten);
        display.style.transform = 'scale(1)';
        preview.appendChild(display);
    }

    /**
     * 更新页面文本
     */
    updatePageText() {
        // 更新主标题
        const mainTitle = document.querySelector('.main-title');
        if (mainTitle) mainTitle.textContent = `■ ${this.i18n.t('appTitle')}`;
        
        // 更新标题
        const modeTitle = document.querySelector('.mode-title');
        if (modeTitle) modeTitle.textContent = `▸ ${this.i18n.t('selectMode').toUpperCase()}`;

        const inputTitle = document.querySelector('.input-title');
        if (inputTitle) inputTitle.textContent = `▸ ${this.i18n.t('inputEquation').toUpperCase()}`;

        const examplesTitle = document.querySelector('.examples-title');
        if (examplesTitle) examplesTitle.textContent = `▸ ${this.i18n.t('sampleProblems').toUpperCase()}`;

        // 更新按钮
        const solveBtn = document.querySelector('#solve-btn');
        if (solveBtn) solveBtn.textContent = `▶ ${this.i18n.t('solveButton')}`;

        const rulesBtn = document.querySelector('#show-rules');
        if (rulesBtn) rulesBtn.textContent = `▸ ${this.i18n.t('rulesButton')}`;

        // 更新移动火柴数按钮
        document.querySelectorAll('.move-count-btn').forEach(btn => {
            const key = btn.dataset.textKey;
            if (key) btn.textContent = this.i18n.t(key);
        });

        // 更新标签
        const moveCountLabel = document.querySelector('.move-count-label');
        if (moveCountLabel) moveCountLabel.textContent = this.i18n.t('moveCount') + ':';

        // 更新输入框占位符
        const input = document.querySelector('#equation');
        if (input) input.placeholder = this.i18n.t('inputPlaceholder');

        // 更新所有带 data-i18n 的元素
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.i18n.t(key);
            if (el.tagName === 'BUTTON' && text.indexOf('▸') === -1 && text.indexOf('◀') === -1 && text.indexOf('■') === -1) {
                el.textContent = `▸ ${text}`;
            } else {
                el.textContent = text;
            }
        });

        // 更新所有带 data-i18n-title 的元素
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.i18n.t(key);
        });

        // 更新规则页文本
        this.updateRulesPageText();
    }

    /**
     * 更新规则页文本
     */
    updateRulesPageText() {
        const rulesMainTitle = document.querySelector('.rules-main-title');
        if (rulesMainTitle) {
            rulesMainTitle.textContent = `■ ${this.i18n.t('conversionRules').toUpperCase()}`;
        }

        const rulesPageTitle = document.querySelector('.rules-page-title');
        if (rulesPageTitle) {
            rulesPageTitle.textContent = `▸ ${this.i18n.t('rulesPageTitle').toUpperCase()}`;
        }

        // 更新表头
        const thead = document.querySelector('thead tr');
        if (thead) {
            if (this.currentMoveCount === 1) {
                thead.innerHTML = `
                    <th>${this.i18n.t('character')}</th>
                    <th>${this.i18n.t('matchCount')}</th>
                    <th>${this.i18n.t('selfTransform')}</th>
                    <th>${this.i18n.t('addOne')}</th>
                    <th>${this.i18n.t('removeOne')}</th>
                `;
            } else {
                thead.innerHTML = `
                    <th>${this.i18n.t('character')}</th>
                    <th>${this.i18n.t('matchCount')}</th>
                    <th>${this.i18n.t('selfTransform2')}</th>
                    <th>${this.i18n.t('addTwo')}</th>
                    <th>${this.i18n.t('removeTwo')}</th>
                    <th>${this.i18n.t('moveSub')}</th>
                    <th>${this.i18n.t('moveAdd')}</th>
                `;
            }
        }

        // 更新按钮
        const backBtn = document.querySelector('.back-button');
        if (backBtn) backBtn.textContent = `◀ ${this.i18n.t('backButton')}`;
        
        const editBtn = document.querySelector('#edit-rules-btn');
        if (editBtn) editBtn.textContent = `▸ ${this.i18n.t('editButton')}`;
        
        const saveBtn = document.querySelector('#save-rules-btn');
        if (saveBtn) saveBtn.textContent = `▸ ${this.i18n.t('saveButton')}`;
        
        const cancelBtn = document.querySelector('#cancel-edit-btn');
        if (cancelBtn) cancelBtn.textContent = `▸ ${this.i18n.t('cancelButton')}`;
    }

    /**
     * 求解方程
     */
    async solve() {
        const eqInput = document.querySelector('#equation');
        const statusElement = document.querySelector('#status');

        if (!eqInput || !statusElement) return;

        const equation = eqInput.value.trim();
        if (!equation) {
            this.showMessage('请输入一个等式', 'error');
            return;
        }

        // 显示计算中提示
        statusElement.innerHTML = `
            <div class="card fade-in" style="text-align: center; padding: var(--spacing-lg);">
                <p style="color: var(--text-secondary); font-size: 0.85rem; letter-spacing: 0.06em; text-transform: uppercase;">[ ${this.i18n.t('computing')} ]</p>
            </div>
        `;

        try {
            const response = await fetch(`${this.apiUrl}/solve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    equation,
                    mode: this.currentMode,
                    moveCount: this.currentMoveCount,
                    maxSolutions: parseInt(document.querySelector('#max-mutations')?.value || '10000')
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            this.displayResults(data);
        } catch (error) {
            console.error('Solve error:', error);
            this.showMessage(`${this.i18n.t('solveError')}: ${error.message}`, 'error');
        }
    }

    /**
     * 显示结果
     */
    displayResults(data) {
        const statusElement = document.querySelector('#status');
        if (!statusElement) return;
        
        if (!data.success) {
            this.showMessage(data.error || '求解失败', 'error');
            return;
        }

        // 如果启用过滤，过滤掉开头或等号后带正负号的解
        let solutions = data.solutions || [];
        if (this.filterSigns && solutions.length > 0) {
            const originalCount = solutions.length;
            solutions = solutions.filter(sol => {
                const eq = sol.equation || '';
                // 过滤掉开头或等号后有正负号的等式（如 +8=8, 8=-8, 1+7=+8 等）
                return !/^[+\-]|=[+\-]/.test(eq);
            });
            
            // 如果过滤后没有解，显示提示
            if (solutions.length === 0) {
                statusElement.innerHTML = `
                    <div class="card">
                        <div style="text-align: center; padding: var(--spacing-lg); color: var(--text-secondary);">
                            原有 ${originalCount} 个解，过滤后无符合条件的解<br>
                            <small style="opacity:0.6;">请关闭过滤或尝试其他输入</small>
                        </div>
                    </div>
                `;
                return;
            }
        }

        if (solutions.length === 0) {
            statusElement.innerHTML = `
            <div class="card">
                <div style="text-align: center; padding: var(--spacing-lg); color: var(--text-secondary); font-size: 0.85rem;">
                    ${this.i18n.t('noSolutions')}<br>
                    <small style="opacity:0.6;">${this.i18n.t('tryMoreMoves') || '尝试增加移动火柴数量或检查输入'}</small>
                </div>
            </div>
        `;
            return;
        }

        const html = `
            <div class="card fade-in">
                <div style="font-size: 0.85rem; margin-bottom: var(--spacing-md); color: var(--accent-primary); font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase;">
                    ▸ ${this.i18n.t('foundSolutions')} ${solutions.length} ${this.i18n.t('solutions')}
                    ${this.filterSigns ? '<span style="color: var(--accent-secondary);"> (已过滤±号)</span>' : ''}
                </div>
                
                <div class="stats">
                    <div class="stat-item">
                        <div class="stat-value">${solutions.length}</div>
                        <div class="stat-label">${this.i18n.t('solutionCount')}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${data.executionTime.toFixed(2)}ms</div>
                        <div class="stat-label">${this.i18n.t('executionTime')}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${data.candidatesExplored || 0}</div>
                        <div class="stat-label">${this.i18n.t('candidatesExplored')}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${data.method || 'Graph'}</div>
                        <div class="stat-label">${this.i18n.t('method')}</div>
                    </div>
                </div>

                <div class="solutions-grid" id="solutions-grid-container">
                </div>
                
                ${solutions.length > 20 ? `
                    <div style="text-align: center; margin-top: var(--spacing-md); color: var(--text-secondary); font-size: 0.75rem; letter-spacing: 0.05em;">
                        ... ${solutions.length - 20} ${this.i18n.t('moreSolutions') || 'more solutions'}
                    </div>
                ` : ''}
            </div>
        `;

        statusElement.innerHTML = html;
        
        // 使用 SVG 渲染解决方案
        this.renderSolutionsWithSVG(solutions.slice(0, 20));
    }

    /**
     * 使用 SVG 渲染解决方案
     */
    renderSolutionsWithSVG(solutions) {
        const gridContainer = document.querySelector('#solutions-grid-container');
        if (!gridContainer) return;

        const isHandwritten = (this.currentMode === 'handwritten');

        solutions.forEach((sol, idx) => {
            const card = document.createElement('div');
            card.className = 'solution-card';
            
            // 使用 SVG 显示等式
            const equationDiv = document.createElement('div');
            equationDiv.className = 'solution-equation';
            const svgDisplay = this.matchstickDisplay.createEquationDisplay(sol.equation, isHandwritten);
            equationDiv.appendChild(svgDisplay);
            card.appendChild(equationDiv);
            
            // 显示变更信息
            if (sol.changes && sol.changes.length > 0) {
                const changesDiv = document.createElement('div');
                changesDiv.className = 'solution-changes';
                changesDiv.innerHTML = sol.changes.map(c => 
                    `${this.i18n.t('position')}${c.position}: ${c.from} → ${c.to} (${c.operation})`
                ).join('<br>');
                card.appendChild(changesDiv);
            }
            
            gridContainer.appendChild(card);
        });
    }

    /**
     * 显示消息
     */
    showMessage(message, type = 'success') {
        const statusElement = document.querySelector('#status');
        if (!statusElement) return;
        
        const typeClass = type === 'error' ? 'error-message' : 'success-message';
        statusElement.innerHTML = `
            <div class="card fade-in ${typeClass}" style="text-align: center; padding: var(--spacing-lg);">
                <p>${message}</p>
            </div>
        `;
    }
}

// 页面加载时初始化应用 - 仅在主页面
if (document.querySelector('#equation')) {
    window.app = new App();
}
