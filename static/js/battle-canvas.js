/**
 * battle-canvas.js - Canvas 简易格斗动画
 * 血条、掉血、出拳、技能特效
 */

const BattleCanvas = (function() {
    const COLORS = {
        p1: '#ff6b35',
        p2: '#4fc3f7',
        floor: '#1a1210',
        grid: '#2a221f'
    };

    function rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function getSkillEffectType(skillName) {
        const s = skillName || '';
        if (/火|焰|烈|爆|燃/.test(s)) return 'fire';
        if (/雷|电|闪|霹/.test(s)) return 'lightning';
        if (/冰|冻|寒|霜/.test(s)) return 'ice';
        if (/龙|波|气|掌|斩|击|拳|踢|杀|灭/.test(s)) return 'slash';
        return 'energy';
    }

    function buildTurns(char1, char2, winner) {
        let hp1 = char1.hp || 100;
        let hp2 = char2.hp || 100;
        const maxHp1 = hp1;
        const maxHp2 = hp2;
        const turns = [];
        let attacker = Math.random() > 0.5 ? 0 : 1;
        let turnCount = 0;

        while (hp1 > 0 && hp2 > 0 && turnCount < 14) {
            const isSkill = turnCount > 0 && turnCount % 3 === 2;
            const atk = attacker === 0 ? char1 : char2;
            const def = attacker === 0 ? char2 : char1;
            let dmg = Math.max(1, (atk.attack || 10) - (def.defense || 5) + rand(-1, 5));
            if (isSkill) dmg = Math.floor(dmg * 1.8);

            if (attacker === 0) {
                hp2 = Math.max(0, hp2 - dmg);
            } else {
                hp1 = Math.max(0, hp1 - dmg);
            }

            turns.push({
                attacker,
                damage: dmg,
                isSkill,
                skillName: atk.skill || '全力一击',
                hp1: Math.max(0, hp1),
                hp2: Math.max(0, hp2),
                maxHp1,
                maxHp2
            });

            if (hp1 <= 0 || hp2 <= 0) break;
            attacker = 1 - attacker;
            turnCount++;
        }

        const lastHp1 = turns.length ? turns[turns.length - 1].hp1 : hp1;
        const lastHp2 = turns.length ? turns[turns.length - 1].hp2 : hp2;

        if (winner === 'player1' && lastHp2 > 0) {
            const last = turns[turns.length - 1];
            if (last) {
                last.damage += lastHp2;
                last.hp2 = 0;
                last.attacker = 0;
            }
        } else if (winner === 'player2' && lastHp1 > 0) {
            const last = turns[turns.length - 1];
            if (last) {
                last.damage += lastHp1;
                last.hp1 = 0;
                last.attacker = 1;
            }
        } else if (winner === 'draw' && turns.length > 0) {
            const last = turns[turns.length - 1];
            last.hp1 = Math.max(5, Math.floor(last.hp1 * 0.3));
            last.hp2 = Math.max(5, Math.floor(last.hp2 * 0.3));
        }

        return turns;
    }

    class Particle {
        constructor(x, y, vx, vy, color, life, size) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.color = color;
            this.life = life;
            this.maxLife = life;
            this.size = size || 4;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.15;
            this.life--;
        }

        draw(ctx) {
            ctx.globalAlpha = this.life / this.maxLife;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * (this.life / this.maxLife), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    class FloatingText {
        constructor(x, y, text, color, size) {
            this.x = x;
            this.y = y;
            this.text = text;
            this.color = color;
            this.life = 50;
            this.size = size || 22;
        }

        update() {
            this.y -= 1.2;
            this.life--;
        }

        draw(ctx) {
            ctx.globalAlpha = Math.min(1, this.life / 20);
            ctx.fillStyle = this.color;
            ctx.font = `bold ${this.size}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(this.text, this.x, this.y);
            ctx.globalAlpha = 1;
        }
    }

    class BattleArena {
        constructor(canvas, actionTextEl, char1, char2, emoji1, emoji2, winner) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.actionTextEl = actionTextEl;
            this.char1 = char1;
            this.char2 = char2;
            this.emoji1 = emoji1;
            this.emoji2 = emoji2;
            this.winner = winner;
            this.turns = buildTurns(char1, char2, winner);

            this.W = 800;
            this.H = 320;
            canvas.width = this.W;
            canvas.height = this.H;

            this.fighters = [
                {
                    x: 180, baseX: 180, y: 200,
                    emoji: emoji1, color: COLORS.p1,
                    state: 'idle', stateTimer: 0,
                    hp: char1.hp || 100, maxHp: char1.hp || 100,
                    name: char1.name || '玩家1',
                    facing: 1
                },
                {
                    x: 620, baseX: 620, y: 200,
                    emoji: emoji2, color: COLORS.p2,
                    state: 'idle', stateTimer: 0,
                    hp: char2.hp || 100, maxHp: char2.hp || 100,
                    name: char2.name || '玩家2',
                    facing: -1
                }
            ];

            this.particles = [];
            this.floatTexts = [];
            this.skillEffect = null;
            this.skillEffectTimer = 0;
            this.running = false;
            this.onHpUpdate = null;
            this.onTurnComplete = null;
        }

        showAction(text, isSkill) {
            if (!this.actionTextEl) return;
            this.actionTextEl.textContent = text;
            this.actionTextEl.className = 'battle-action-text show' + (isSkill ? ' skill' : '');
        }

        hideAction() {
            if (!this.actionTextEl) return;
            this.actionTextEl.className = 'battle-action-text';
        }

        spawnDamageText(x, y, damage, isSkill) {
            this.floatTexts.push(new FloatingText(
                x, y - 30,
                '-' + damage,
                isSkill ? '#ffd700' : '#ff4444',
                isSkill ? 28 : 22
            ));
        }

        spawnHitParticles(x, y, color, count) {
            for (let i = 0; i < count; i++) {
                this.particles.push(new Particle(
                    x, y,
                    (Math.random() - 0.5) * 6,
                    -Math.random() * 5 - 1,
                    color,
                    rand(20, 40),
                    rand(3, 6)
                ));
            }
        }

        spawnSkillEffect(type, fromIdx, toIdx) {
            const from = this.fighters[fromIdx];
            const to = this.fighters[toIdx];
            this.skillEffect = { type, fromX: from.x, fromY: from.y - 40, toX: to.x, toY: to.y - 40, progress: 0 };
            this.skillEffectTimer = 30;

            const colors = {
                fire: ['#ff6b35', '#ffd700', '#ff0000'],
                lightning: ['#4fc3f7', '#ffffff', '#0288d1'],
                ice: ['#81d4fa', '#e1f5fe', '#0288d1'],
                slash: ['#ffd700', '#ff6b35', '#ffffff'],
                energy: ['#ffd700', '#ff6b35', '#4fc3f7']
            };
            const palette = colors[type] || colors.energy;
            for (let i = 0; i < 25; i++) {
                this.particles.push(new Particle(
                    from.x + (to.x - from.x) * Math.random(),
                    from.y - 40 + (Math.random() - 0.5) * 30,
                    (Math.random() - 0.5) * 8,
                    (Math.random() - 0.5) * 8,
                    palette[i % palette.length],
                    rand(30, 60),
                    rand(4, 8)
                ));
            }
        }

        drawBackground() {
            const ctx = this.ctx;
            const grd = ctx.createLinearGradient(0, 0, 0, this.H);
            grd.addColorStop(0, '#0d0b0a');
            grd.addColorStop(0.6, '#1a1210');
            grd.addColorStop(1, '#0a0806');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, this.W, this.H);

            ctx.strokeStyle = COLORS.grid;
            ctx.lineWidth = 1;
            for (let x = 0; x < this.W; x += 40) {
                ctx.beginPath();
                ctx.moveTo(x, 220);
                ctx.lineTo(x - 80, this.H);
                ctx.stroke();
            }

            ctx.fillStyle = COLORS.floor;
            ctx.fillRect(0, 240, this.W, this.H - 240);
            ctx.strokeStyle = '#ff6b35';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 240);
            ctx.lineTo(this.W, 240);
            ctx.stroke();
        }

        drawHpBar(x, y, w, hp, maxHp, color, name, align) {
            const ctx = this.ctx;
            const ratio = Math.max(0, hp / maxHp);
            const barH = 14;

            ctx.fillStyle = '#1a1614';
            ctx.fillRect(x, y, w, barH);
            ctx.strokeStyle = '#333';
            ctx.strokeRect(x, y, w, barH);

            const fillGrd = ctx.createLinearGradient(x, y, x + w, y);
            if (ratio < 0.3) {
                fillGrd.addColorStop(0, '#ef5350');
                fillGrd.addColorStop(1, '#ff7043');
            } else {
                fillGrd.addColorStop(0, color);
                fillGrd.addColorStop(1, '#66bb6a');
            }
            ctx.fillStyle = fillGrd;
            ctx.fillRect(x, y, w * ratio, barH);

            ctx.fillStyle = '#e0d5c0';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = align;
            ctx.fillText(name, align === 'left' ? x : x + w, y - 4);
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#aaa';
            ctx.fillText(`${hp}/${maxHp}`, align === 'left' ? x + w : x, y - 4);
        }

        drawFighter(f, idx) {
            const ctx = this.ctx;
            const { x, y, emoji, color, state, facing } = f;
            let offsetX = 0;
            let offsetY = 0;
            let armAngle = 0;

            if (state === 'attacking') {
                offsetX = facing * 35;
                armAngle = facing * -0.8;
            } else if (state === 'hit') {
                offsetX = -facing * 15;
                offsetY = 5;
            } else if (state === 'skill') {
                offsetX = facing * 20;
                armAngle = facing * -1.2;
            } else if (state === 'ko') {
                offsetY = 30;
            } else if (state === 'victory') {
                offsetY = Math.sin(Date.now() / 200) * 4;
            }

            const px = x + offsetX;
            const py = y + offsetY;
            ctx.save();
            ctx.translate(px, py);
            if (state === 'ko') ctx.rotate(-facing * 1.2);

            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(0, -50);
            ctx.lineTo(0, -10);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, -35);
            ctx.lineTo(facing * 25 + armAngle * 20, -25);
            ctx.moveTo(0, -35);
            ctx.lineTo(-facing * 15, -20);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(-facing * 12, 20);
            ctx.moveTo(0, -10);
            ctx.lineTo(facing * 12, 20);
            ctx.stroke();

            ctx.font = '32px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, 0, -62);

            if (state === 'attacking' || state === 'skill') {
                ctx.strokeStyle = state === 'skill' ? '#ffd700' : color;
                ctx.lineWidth = state === 'skill' ? 5 : 3;
                ctx.beginPath();
                ctx.arc(facing * 30, -30, 15, 0, Math.PI * 2);
                ctx.stroke();
            }

            if (state === 'hit') {
                ctx.strokeStyle = '#ff3333';
                ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    const a = (Date.now() / 50 + i * 2) % 6;
                    ctx.beginPath();
                    ctx.moveTo(-10 + a * 5, -70);
                    ctx.lineTo(-5 + a * 5, -55);
                    ctx.stroke();
                }
            }

            ctx.restore();
        }

        drawSkillEffect() {
            if (!this.skillEffect || this.skillEffectTimer <= 0) return;
            const ctx = this.ctx;
            const se = this.skillEffect;
            se.progress = 1 - this.skillEffectTimer / 30;
            const { type, fromX, fromY, toX, toY, progress } = se;

            ctx.save();
            ctx.globalAlpha = 1 - progress * 0.5;

            if (type === 'fire') {
                const cx = fromX + (toX - fromX) * progress;
                const cy = fromY + (toY - fromY) * progress;
                const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
                grd.addColorStop(0, '#ffd700');
                grd.addColorStop(0.5, '#ff6b35');
                grd.addColorStop(1, 'transparent');
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.arc(cx, cy, 40, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'lightning') {
                ctx.strokeStyle = '#4fc3f7';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(fromX, fromY);
                const midX = (fromX + toX) / 2 + rand(-20, 20);
                const midY = (fromY + toY) / 2;
                ctx.lineTo(midX, midY);
                ctx.lineTo(toX, toY);
                ctx.stroke();
                ctx.shadowBlur = 0;
            } else if (type === 'ice') {
                for (let i = 0; i < 5; i++) {
                    const t = progress + i * 0.1;
                    const cx = fromX + (toX - fromX) * Math.min(1, t);
                    const cy = fromY + (toY - fromY) * Math.min(1, t);
                    ctx.strokeStyle = '#81d4fa';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    for (let j = 0; j < 6; j++) {
                        const a = (j / 6) * Math.PI * 2;
                        const r = 12 - j;
                        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                    }
                    ctx.closePath();
                    ctx.stroke();
                }
            } else {
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(fromX, fromY);
                ctx.quadraticCurveTo(
                    (fromX + toX) / 2, fromY - 60,
                    fromX + (toX - fromX) * progress, fromY + (toY - fromY) * progress
                );
                ctx.stroke();
            }

            ctx.restore();
            this.skillEffectTimer--;
        }

        drawFrame() {
            this.drawBackground();

            this.drawHpBar(20, 16, 340, this.fighters[0].hp, this.fighters[0].maxHp, COLORS.p1, this.fighters[0].name, 'left');
            this.drawHpBar(this.W - 360, 16, 340, this.fighters[1].hp, this.fighters[1].maxHp, COLORS.p2, this.fighters[1].name, 'right');

            this.drawSkillEffect();
            this.drawFighter(this.fighters[0], 0);
            this.drawFighter(this.fighters[1], 1);

            this.particles = this.particles.filter(p => p.life > 0);
            this.particles.forEach(p => { p.update(); p.draw(this.ctx); });

            this.floatTexts = this.floatTexts.filter(t => t.life > 0);
            this.floatTexts.forEach(t => { t.update(); t.draw(this.ctx); });
        }

        setFighterState(idx, state) {
            this.fighters[idx].state = state;
            this.fighters[idx].stateTimer = 0;
        }

        resetFighterPositions() {
            this.fighters[0].x = this.fighters[0].baseX;
            this.fighters[1].x = this.fighters[1].baseX;
        }

        async animateFrame(duration) {
            const start = Date.now();
            return new Promise(resolve => {
                const loop = () => {
                    this.drawFrame();
                    if (Date.now() - start < duration) {
                        requestAnimationFrame(loop);
                    } else {
                        resolve();
                    }
                };
                requestAnimationFrame(loop);
            });
        }

        async playTurn(turn, turnIdx) {
            const atkIdx = turn.attacker;
            const defIdx = 1 - atkIdx;
            const atk = this.fighters[atkIdx];
            const def = this.fighters[defIdx];
            const isSkill = turn.isSkill;

            this.resetFighterPositions();
            this.setFighterState(atkIdx, isSkill ? 'skill' : 'attacking');
            this.setFighterState(defIdx, 'idle');

            const actionLabel = isSkill
                ? `${atk.name} 发动「${turn.skillName}」！`
                : `${atk.name} 出拳攻击！`;
            this.showAction(actionLabel, isSkill);

            if (typeof playPunchSound === 'function') playPunchSound();

            if (isSkill) {
                const effectType = getSkillEffectType(turn.skillName);
                this.spawnSkillEffect(effectType, atkIdx, defIdx);
                if (typeof playSkillSound === 'function') playSkillSound();
            }

            await this.animateFrame(isSkill ? 500 : 350);

            this.setFighterState(atkIdx, 'idle');
            this.setFighterState(defIdx, 'hit');

            this.fighters[0].hp = turn.hp1;
            this.fighters[1].hp = turn.hp2;

            if (typeof playHitSound === 'function') playHitSound();
            this.spawnDamageText(def.x, def.y - 60, turn.damage, isSkill);
            this.spawnHitParticles(def.x, def.y - 40, isSkill ? '#ffd700' : '#ff4444', isSkill ? 18 : 10);

            if (this.onHpUpdate) {
                this.onHpUpdate(turn.hp1, turn.hp2, turn.damage, defIdx);
            }

            await this.animateFrame(400);

            this.setFighterState(defIdx, 'idle');
            this.hideAction();
        }

        async play(onHpUpdate) {
            this.onHpUpdate = onHpUpdate;
            this.running = true;

            for (let i = 0; i < this.turns.length; i++) {
                await this.playTurn(this.turns[i], i);
                await new Promise(r => setTimeout(r, 120));
            }

            const winIdx = this.winner === 'player1' ? 0 : this.winner === 'player2' ? 1 : -1;
            if (winIdx >= 0) {
                this.setFighterState(winIdx, 'victory');
                this.setFighterState(1 - winIdx, 'ko');
                this.showAction(`${this.fighters[winIdx].name} 获胜！`, false);
                if (typeof playWinSound === 'function') playWinSound();

                for (let i = 0; i < 60; i++) {
                    this.drawFrame();
                    await new Promise(r => requestAnimationFrame(r));
                }
            } else {
                this.showAction('平局！', false);
                for (let i = 0; i < 40; i++) {
                    this.drawFrame();
                    await new Promise(r => requestAnimationFrame(r));
                }
            }

            this.hideAction();
            this.running = false;
        }
    }

    return { BattleArena, buildTurns };
})();
