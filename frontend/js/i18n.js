/**
 * 国际化支持
 * 管理中英文语言切换
 */

export class I18n {
    constructor() {
        this.currentLang = 'zh'; // 默认中文
        this.translations = {
            zh: {
                // 页面标题和导航
                appTitle: '火柴棒等式求解器',
                pageTitle: '火柴棒等式求解器',
                themeToggle: '切换主题',
                
                // 模式选择
                selectMode: '模式',
                standardMode: '标准模式',
                handwrittenMode: '手写模式',
                standardDesc: '标准七段数码管显示',
                handwrittenDesc: '手写风格数字',
                
                // 示例和输入
                sampleProblems: '示例',
                inputEquation: '输入',
                inputPlaceholder: '例如: 8+3-4=0',
                solveButton: '求解',
                
                // 结果显示
                foundSolutions: '找到',
                solutions: '个解',
                noSolutions: '没有找到解',
                computing: '正在计算中...',
                solutionCount: '解的数量',
                executionTime: '执行时间',
                candidatesExplored: '候选解数量',
                method: '求解方法',
                solveError: '求解错误',
                
                // 规则表
                conversionRules: '转换规则',
                rulesPageTitle: '规则表',
                backButton: '返回',
                editButton: '编辑',
                saveButton: '保存',
                cancelButton: '取消',
                character: '字符',
                matchCount: '火柴数',
                selfTransform: '自身变换（移动一根）',
                addOne: '添加一根得到...',
                removeOne: '移除一根得到...',
                selfTransform2: '自身变换（移动两根）',
                addTwo: '添加两根得到...',
                removeTwo: '移除两根得到...',
                moveSub: '移1减1根得到...',
                moveAdd: '移1加1根得到...',
                emptySpace: '空格',
                
                // 移动火柴数选择
                moveCount: '移动火柴数',
                oneMatch: '1根',
                twoMatches: '2根',
                musicOn: '开启音乐',
                musicOff: '关闭音乐',
                langToggle: '切换语言',
                backButtonTitle: '返回',
                rulesButton: '规则',
                
                // 高级配置
                maxMutations: '搜索上限',
                filterSigns: '过滤±号',
                filterSignsTooltip: '过滤带正负号的解',
                position: '位置',
                
                // 页脚
                madeWith: '由 FalkorDB 驱动 |',
                github: 'GitHub'
            },
            en: {
                // Page title and navigation
                appTitle: 'MATCHSTICK SOLVER',
                pageTitle: 'Matchstick Puzzle Solver',
                themeToggle: 'Toggle Theme',
                
                // Mode selection
                selectMode: 'MODE',
                standardMode: 'STANDARD',
                handwrittenMode: 'HANDWRITTEN',
                standardDesc: 'Seven-segment display',
                handwrittenDesc: 'Handwritten style digits',
                
                // Samples and input
                sampleProblems: 'EXAMPLES',
                inputEquation: 'INPUT',
                inputPlaceholder: 'e.g.: 8+3-4=0',
                solveButton: 'SOLVE',
                
                // Results display
                foundSolutions: 'Found',
                solutions: 'solution(s)',
                noSolutions: 'No solutions found',
                computing: 'Computing...',
                solutionCount: 'Solutions',
                executionTime: 'Execution Time',
                candidatesExplored: 'Candidates',
                method: 'Method',
                solveError: 'Solve Error',
                
                // Rules table
                conversionRules: 'CONVERSION RULES',
                rulesPageTitle: 'RULES TABLE',
                backButton: 'BACK',
                editButton: 'Edit',
                saveButton: 'Save',
                cancelButton: 'Cancel',
                character: 'Character',
                matchCount: 'Matches',
                selfTransform: 'Self Transform (move 1)',
                addOne: 'Add one to get...',
                removeOne: 'Remove one to get...',
                selfTransform2: 'Self Transform (move 2)',
                addTwo: 'Add two to get...',
                removeTwo: 'Remove two to get...',
                moveSub: 'Move 1 & Remove 1 to get...',
                moveAdd: 'Move 1 & Add 1 to get...',
                emptySpace: 'space',
                
                // Move count selection
                moveCount: 'Move Count',
                oneMatch: '1 Match',
                twoMatches: '2 Matches',
                musicOn: 'Enable Music',
                musicOff: 'Disable Music',
                langToggle: 'Switch Language',
                backButtonTitle: 'Back',
                rulesButton: 'RULES',
                
                // Advanced Configuration
                maxMutations: 'Search Limit',
                filterSigns: 'Filter ±',
                filterSignsTooltip: 'Filter solutions with +/- signs',
                position: 'Position',
                
                // Footer
                madeWith: 'Powered by FalkorDB |',
                github: 'GitHub'
            }
        };
    }

    /**
     * 切换语言
     * @param {string} lang - 语言代码 ('zh' 或 'en')
     */
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('matchstick-lang', lang);
        }
    }

    /**
     * 获取当前语言
     */
    getCurrentLanguage() {
        return this.currentLang;
    }

    /**
     * 获取翻译文本
     * @param {string} key - 翻译键
     */
    t(key) {
        return this.translations[this.currentLang][key] || key;
    }

    /**
     * 加载保存的语言设置
     */
    loadSavedLanguage() {
        const saved = localStorage.getItem('matchstick-lang');
        if (saved && this.translations[saved]) {
            this.currentLang = saved;
        }
    }
}
