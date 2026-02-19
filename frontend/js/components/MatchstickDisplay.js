/**
 * 火柴棒显示组件
 * 使用SVG绘制火柴棒数字和符号
 */

import { tokenizeEquation } from '../utils/tokenizer.js';

export class MatchstickDisplay {
    constructor(mode = 'standard') {
        this.mode = mode;
        this.matchColor = '#ff6b35';
        this.matchWidth = 4;
        this.matchLength = 30;
        this.gap = 4;
    }

    /**
     * 创建数字的SVG表示
     * @param {string} digit - 数字或符号
     * @param {boolean} useHandwritten - 是否使用手写模式
     * @returns {SVGElement}
     */
    createDigitSVG(digit, useHandwritten = false) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'matchstick-digit');
        svg.setAttribute('viewBox', '0 0 50 80');

        const segments = this.getSegments(digit, useHandwritten);
        segments.forEach(segment => {
            const line = this.createMatchstick(segment);
            svg.appendChild(line);
        });

        return svg;
    }

    /**
     * 创建单根火柴棒
     * @param {Object} segment - 线段定义 {x1, y1, x2, y2}
     * @returns {SVGGElement}
     */
    createMatchstick(segment) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // 火柴棍体（更浅的木色）
        const stick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        stick.setAttribute('x1', segment.x1);
        stick.setAttribute('y1', segment.y1);
        stick.setAttribute('x2', segment.x2);
        stick.setAttribute('y2', segment.y2);
        stick.setAttribute('stroke', '#DEB887');
        stick.setAttribute('stroke-width', this.matchWidth);
        stick.setAttribute('stroke-linecap', 'round');
        stick.setAttribute('class', 'match-stick');
        
        // 火柴头（鲜红色，更明显）
        const headSize = this.matchWidth * 1.5;
        const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        head.setAttribute('cx', segment.x2);
        head.setAttribute('cy', segment.y2);
        head.setAttribute('r', headSize);
        head.setAttribute('fill', '#FF4444');
        head.setAttribute('class', 'match-head');
        
        group.appendChild(stick);
        group.appendChild(head);
        
        return group;
    }

    /**
     * 获取数字/符号的线段定义
     * @param {string} char - 字符（可能包含()H标记）
     * @param {boolean} handwritten - 手写模式
     * @returns {Array<Object>}
     */
    getSegments(char, handwritten = false) {
        // 容错：接受 (n)H 或 (n)h
        const isHandwritten = /\)H/i.test(char);
        let baseChar = char;
        
        if (isHandwritten) {
            const match = char.match(/\((\d+)\)H/i);
            if (match) {
                baseChar = match[1];
            }
        }
        
        const segments = {
            '0': isHandwritten ?
                [
                    { x1: 15, y1: 20, x2: 35, y2: 20 },
                    { x1: 15, y1: 60, x2: 35, y2: 60 },
                    { x1: 15, y1: 20, x2: 15, y2: 60 },
                    { x1: 35, y1: 20, x2: 35, y2: 60 },
                ] : [
                    { x1: 15, y1: 10, x2: 35, y2: 10 },
                    { x1: 15, y1: 70, x2: 35, y2: 70 },
                    { x1: 15, y1: 10, x2: 15, y2: 40 },
                    { x1: 15, y1: 40, x2: 15, y2: 70 },
                    { x1: 35, y1: 10, x2: 35, y2: 40 },
                    { x1: 35, y1: 40, x2: 35, y2: 70 },
                ],

            '1': isHandwritten ?
                [
                    { x1: 35, y1: 20, x2: 35, y2: 60 },
                ] : [
                    { x1: 35, y1: 10, x2: 35, y2: 40 },
                    { x1: 35, y1: 40, x2: 35, y2: 70 },
                ],

            '2': [
                { x1: 15, y1: 10, x2: 35, y2: 10 },
                { x1: 15, y1: 40, x2: 35, y2: 40 },
                { x1: 15, y1: 70, x2: 35, y2: 70 },
                { x1: 35, y1: 10, x2: 35, y2: 40 },
                { x1: 15, y1: 40, x2: 15, y2: 70 },
            ],

            '3': [
                { x1: 15, y1: 10, x2: 35, y2: 10 },
                { x1: 15, y1: 40, x2: 35, y2: 40 },
                { x1: 15, y1: 70, x2: 35, y2: 70 },
                { x1: 35, y1: 10, x2: 35, y2: 40 },
                { x1: 35, y1: 40, x2: 35, y2: 70 },
            ],

            '4': isHandwritten ?
                [
                    { x1: 15, y1: 40, x2: 25, y2: 20 },
                    { x1: 15, y1: 40, x2: 35, y2: 40 },
                    { x1: 25, y1: 20, x2: 25, y2: 60 },
                ] : [
                    { x1: 15, y1: 40, x2: 35, y2: 40 },
                    { x1: 15, y1: 10, x2: 15, y2: 40 },
                    { x1: 35, y1: 10, x2: 35, y2: 40 },
                    { x1: 35, y1: 40, x2: 35, y2: 70 },
                ],

            '5': [
                { x1: 15, y1: 10, x2: 35, y2: 10 },
                { x1: 15, y1: 40, x2: 35, y2: 40 },
                { x1: 15, y1: 70, x2: 35, y2: 70 },
                { x1: 15, y1: 10, x2: 15, y2: 40 },
                { x1: 35, y1: 40, x2: 35, y2: 70 },
            ],

            '6': isHandwritten ?
                [
                    { x1: 15, y1: 40, x2: 35, y2: 40 },
                    { x1: 15, y1: 70, x2: 35, y2: 70 },
                    { x1: 15, y1: 10, x2: 15, y2: 40 },
                    { x1: 15, y1: 40, x2: 15, y2: 70 },
                    { x1: 35, y1: 40, x2: 35, y2: 70 },
                ] : [
                    { x1: 15, y1: 10, x2: 35, y2: 10 },
                    { x1: 15, y1: 40, x2: 35, y2: 40 },
                    { x1: 15, y1: 70, x2: 35, y2: 70 },
                    { x1: 15, y1: 10, x2: 15, y2: 40 },
                    { x1: 15, y1: 40, x2: 15, y2: 70 },
                    { x1: 35, y1: 40, x2: 35, y2: 70 },
                ],

            '7': isHandwritten ?
                [
                    { x1: 15, y1: 20, x2: 35, y2: 20 },
                    { x1: 35, y1: 20, x2: 35, y2: 60 },
                ] : [
                    { x1: 15, y1: 10, x2: 35, y2: 10 },
                    { x1: 35, y1: 10, x2: 35, y2: 40 },
                    { x1: 35, y1: 40, x2: 35, y2: 70 },
                ],

            '8': [
                { x1: 15, y1: 10, x2: 35, y2: 10 },
                { x1: 15, y1: 40, x2: 35, y2: 40 },
                { x1: 15, y1: 70, x2: 35, y2: 70 },
                { x1: 15, y1: 10, x2: 15, y2: 40 },
                { x1: 15, y1: 40, x2: 15, y2: 70 },
                { x1: 35, y1: 10, x2: 35, y2: 40 },
                { x1: 35, y1: 40, x2: 35, y2: 70 },
            ],

            '9': isHandwritten ?
                [
                    { x1: 15, y1: 10, x2: 35, y2: 10 },
                    { x1: 15, y1: 40, x2: 35, y2: 40 },
                    { x1: 15, y1: 10, x2: 15, y2: 40 },
                    { x1: 35, y1: 10, x2: 35, y2: 40 },
                    { x1: 35, y1: 40, x2: 35, y2: 70 },
                ] : [
                    { x1: 15, y1: 10, x2: 35, y2: 10 },
                    { x1: 15, y1: 40, x2: 35, y2: 40 },
                    { x1: 15, y1: 70, x2: 35, y2: 70 },
                    { x1: 15, y1: 10, x2: 15, y2: 40 },
                    { x1: 35, y1: 10, x2: 35, y2: 40 },
                    { x1: 35, y1: 40, x2: 35, y2: 70 },
                ],

            '+': [
                { x1: 25, y1: 25, x2: 25, y2: 55 },
                { x1: 10, y1: 40, x2: 40, y2: 40 },
            ],

            '-': [
                { x1: 10, y1: 40, x2: 40, y2: 40 },
            ],

            '*': [
                { x1: 15, y1: 25, x2: 35, y2: 55 },
                { x1: 35, y1: 25, x2: 15, y2: 55 },
            ],

            'x': [
                { x1: 15, y1: 25, x2: 35, y2: 55 },
                { x1: 35, y1: 25, x2: 15, y2: 55 },
            ],

            '/': [
                { x1: 35, y1: 20, x2: 15, y2: 60 },
            ],

            '=': [
                { x1: 10, y1: 30, x2: 40, y2: 30 },
                { x1: 10, y1: 50, x2: 40, y2: 50 },
            ],

            ' ': [],
        };

        return segments[baseChar] || [];
    }

    /**
     * 创建完整等式的SVG显示
     * @param {string} equation - 等式字符串
     * @param {boolean} useHandwritten - 是否使用手写模式
     * @returns {HTMLElement}
     */
    createEquationDisplay(equation, useHandwritten = false) {
        const container = document.createElement('div');
        container.className = 'matchstick-equation';
        
        const tokens = this.parseEquation(equation);
        
        for (let token of tokens) {
            let displayToken = token.replace('*', 'x');
            
            if (displayToken !== ' ') {
                if (displayToken === '11' || displayToken.toUpperCase() === '(11)H') {
                    const isHandwritten = displayToken.toUpperCase() === '(11)H';
                    const digit1 = this.createDigitSVG(isHandwritten ? '(1)H' : '1', false);
                    const digit2 = this.createDigitSVG(isHandwritten ? '(1)H' : '1', false);
                    digit2.style.marginLeft = '-8px';
                    container.appendChild(digit1);
                    container.appendChild(digit2);
                } else {
                    const digitSVG = this.createDigitSVG(displayToken, false);
                    container.appendChild(digitSVG);
                }
            } else {
                const spacer = document.createElement('div');
                spacer.style.width = '4px';
                container.appendChild(spacer);
            }
        }

        return container;
    }

    /**
     * 解析等式为tokens
     * @param {string} equation - 等式字符串
     * @returns {Array<string>} tokens数组
     */
    parseEquation(equation) {
        return tokenizeEquation(equation);
    }

    /**
     * 设置火柴棒颜色
     * @param {string} color - 颜色值
     */
    setMatchColor(color) {
        this.matchColor = color;
    }
}
