/**
 * 等式分词器
 * 支持手写模式的 (数字)H 和 (11)H 以及标准模式的 11
 * 兼容小写 h（会在内部分词前归一化为大写 H）
 */

export function tokenizeEquation(equation) {
    // 将所有 (数字)h / (数字)H 归一化为 (数字)H，避免上游处理分支重复
    const eq = (equation || '').replace(/(\(\d+\))h/gi, '$1H');

    const tokens = [];
    let i = 0;

    while (i < eq.length) {
        // (11)H
        if (eq.substring(i, i + 5) === '(11)H') {
            tokens.push('(11)H');
            i += 5;
            continue;
        }

        // 11
        if (eq.substring(i, i + 2) === '11') {
            tokens.push('11');
            i += 2;
            continue;
        }

        // (数字)H
        if (
            eq[i] === '(' &&
            i + 3 < eq.length &&
            eq[i + 2] === ')' &&
            (eq[i + 3] === 'H')
        ) {
            tokens.push(eq.substring(i, i + 4));
            i += 4;
            continue;
        }

        tokens.push(eq[i]);
        i += 1;
    }

    return tokens;
}
