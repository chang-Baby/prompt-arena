/**
 * script.js - AI 格斗擂台 前端交互
 */

// ====== DOM 元素 ======
const sceneText = document.getElementById('sceneText');
const prompt1 = document.getElementById('prompt1');
const prompt2 = document.getElementById('prompt2');
const fightBtn = document.getElementById('fightBtn');
const loading = document.getElementById('loading');
const resultArea = document.getElementById('resultArea');
const charactersContainer = document.getElementById('charactersContainer');
const storyBox = document.getElementById('storyBox');
const winnerBox = document.getElementById('winnerBox');
const eloChange = document.getElementById('eloChange');
const randomSceneBtn = document.getElementById('randomSceneBtn');
const rematchBtn = document.getElementById('rematchBtn');
const historyList = document.getElementById('historyList');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const leaderboardModal = document.getElementById('leaderboardModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const leaderboardBody = document.getElementById('leaderboardBody');

// ====== 预置场景 ======
const scenes = [
    '地下黑市拳场，铁笼和呐喊的观众',
    '赛博朋克街头，霓虹灯下雨水飞溅',
    '古罗马角斗场，烈日下沙地灼热',
    '废弃工厂顶楼，月光照亮锈蚀的钢铁',
    '亚马逊雨林空地，原始部落战鼓轰鸣'
];

const ELO_DELTA = 10;

// ====== 角色 Emoji 匹配 ======
const EMOJI_RULES = [
    ['熊猫', '🐼'],
    ['熊', '🐻'],
    ['虎', '🐯'],
    ['龙', '🐉'],
    ['狮', '🦁'],
    ['狼', '🐺'],
    ['鹰', '🦅'],
    ['蛇', '🐍'],
    ['猴', '🐒'],
    ['武', '🥋'],
    ['拳', '🥊']
];

function getCharacterEmoji(name) {
    if (!name) return '⚔️';
    for (const [keyword, emoji] of EMOJI_RULES) {
        if (name.includes(keyword)) return emoji;
    }
    return '⚔️';
}

// ====== Web Audio 音效 ======
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playPunchSound() {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
}

function playHitSound() {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
}

function playSkillSound() {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
}

function playWinSound() {
    const ctx = getAudioContext();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        const start = ctx.currentTime + i * 0.15;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2);
        osc.start(start);
        osc.stop(start + 0.2);
    });
}

// ====== 工具函数 ======
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(dateStr) {
    const d = new Date(dateStr);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function winnerLabel(winner) {
    if (winner === 'player1') return '玩家1 胜';
    if (winner === 'player2') return '玩家2 胜';
    return '平局';
}

// ====== 打字机效果 ======
let typewriterTimer = null;

function typewriterEffect(element, text, charDelay) {
    return new Promise(resolve => {
        if (typewriterTimer) clearInterval(typewriterTimer);
        element.textContent = '';
        const cursor = document.createElement('span');
        cursor.className = 'cursor';
        element.appendChild(cursor);

        let index = 0;
        const delay = charDelay || (30 + Math.floor(Math.random() * 21));

        typewriterTimer = setInterval(() => {
            if (index < text.length) {
                element.insertBefore(document.createTextNode(text[index]), cursor);
                index++;
                element.scrollTop = element.scrollHeight;
            } else {
                clearInterval(typewriterTimer);
                typewriterTimer = null;
                cursor.remove();
                resolve();
            }
        }, delay);
    });
}

// ====== 更新卡片血条 ======
function updateCardHp(cardIndex, hp, maxHp, damage) {
    const cards = charactersContainer.querySelectorAll('.char-card');
    const card = cards[cardIndex];
    if (!card) return;

    const ratio = Math.max(0, (hp / maxHp) * 100);
    const fill = card.querySelector('.hp-bar-fill');
    const hpText = card.querySelector('.hp-text');
    if (fill) {
        fill.style.width = ratio + '%';
        fill.classList.toggle('low', ratio < 30);
    }
    if (hpText) {
        hpText.innerHTML = `HP <span class="hp-num">${hp}</span>/${maxHp}` +
            (damage ? ` <span class="dmg-flash">-${damage}</span>` : '');
    }
}

// ====== Canvas + 卡片联动战斗动画 ======
async function playBattleAnimation(winner, char1, char2) {
    const canvas = document.getElementById('battleCanvas');
    const actionText = document.getElementById('battleActionText');
    const cards = charactersContainer.querySelectorAll('.char-card');

    if (!canvas || !BattleCanvas) {
        return legacyCardAnimation(winner, cards);
    }

    const arena = new BattleCanvas.BattleArena(
        canvas,
        actionText,
        char1,
        char2,
        getCharacterEmoji(char1.name),
        getCharacterEmoji(char2.name),
        winner
    );

    await arena.play(function(hp1, hp2, damage, defIdx) {
        updateCardHp(0, hp1, char1.hp || 100, defIdx === 0 ? damage : 0);
        updateCardHp(1, hp2, char2.hp || 100, defIdx === 1 ? damage : 0);

        if (defIdx === 0 && cards[0]) {
            cards[0].classList.add('hit');
            setTimeout(() => cards[0].classList.remove('hit'), 350);
        } else if (defIdx === 1 && cards[1]) {
            cards[1].classList.add('hit');
            setTimeout(() => cards[1].classList.remove('hit'), 350);
        }

        const atkIdx = 1 - defIdx;
        if (cards[atkIdx]) {
            cards[atkIdx].classList.add('attacking');
            setTimeout(() => cards[atkIdx].classList.remove('attacking'), 350);
        }
    });

    if (winner === 'player1' || winner === 'player2') {
        const winnerIdx = winner === 'player1' ? 0 : 1;
        if (cards[winnerIdx]) cards[winnerIdx].classList.add('winner');
    }
}

async function legacyCardAnimation(winner, cards) {
    if (cards.length < 2) return;
    const rounds = 5;
    for (let i = 0; i < rounds; i++) {
        const attacker = i % 2;
        const defender = 1 - attacker;
        cards[attacker].classList.add('attacking');
        playPunchSound();
        await sleep(280);
        cards[attacker].classList.remove('attacking');
        cards[defender].classList.add('hit');
        playHitSound();
        await sleep(320);
        cards[defender].classList.remove('hit');
        await sleep(80);
    }
    if (winner === 'player1' || winner === 'player2') {
        cards[winner === 'player1' ? 0 : 1].classList.add('winner');
        playWinSound();
    }
}

// ====== 随机场景 ======
function randomScene() {
    const idx = Math.floor(Math.random() * scenes.length);
    sceneText.textContent = scenes[idx];
}

randomSceneBtn.addEventListener('click', randomScene);

// ====== 检查输入是否完整 ======
function checkInputs() {
    const p1 = prompt1.value.trim();
    const p2 = prompt2.value.trim();
    const hasScene = sceneText.textContent !== '点击右侧随机生成';
    fightBtn.disabled = !(hasScene && p1 && p2);
}

prompt1.addEventListener('input', checkInputs);
prompt2.addEventListener('input', checkInputs);
checkInputs();

// ====== 发起战斗 ======
fightBtn.addEventListener('click', async function() {
    const scene = sceneText.textContent;
    const p1 = prompt1.value.trim();
    const p2 = prompt2.value.trim();

    if (!scene || !p1 || !p2) {
        alert('请填写完整信息！');
        return;
    }

    loading.classList.add('show');
    resultArea.classList.remove('show');
    fightBtn.disabled = true;

    try {
        const response = await fetch('/api/battles/fight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                scene: scene,
                player1_prompt: p1,
                player2_prompt: p2
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || '战斗失败');
        }

        await displayResult(data);
        loadBattleHistory();

    } catch (error) {
        alert('错误: ' + error.message);
    } finally {
        loading.classList.remove('show');
        fightBtn.disabled = false;
        checkInputs();
    }
});

// ====== 构建角色卡片 HTML ======
function buildCharacterCard(char, playerLabel, isWinner) {
    const emoji = getCharacterEmoji(char.name);
    const maxHp = char.hp || 100;
    return `
        <div class="char-card${isWinner ? ' winner' : ''}">
            <span class="emoji">${emoji}</span>
            <div class="name">${playerLabel}: ${char.name || '无名战士'}</div>
            <div class="hp-bar-wrap">
                <div class="hp-bar-bg">
                    <div class="hp-bar-fill" style="width:100%"></div>
                </div>
                <div class="hp-text">HP <span class="hp-num">${maxHp}</span>/${maxHp}</div>
            </div>
            <div class="desc">${char.description || ''}</div>
            <div class="stats">
                <span>攻击 ${char.attack || 10}</span>
                <span>防御 ${char.defense || 5}</span>
            </div>
            <div class="skill">必杀技: ${char.skill || '无'}</div>
            ${isWinner ? '<div class="winner-label">胜利者！</div>' : ''}
        </div>
    `;
}

function buildVsHtml() {
    const sparks = Array.from({ length: 5 }, (_, i) =>
        `<span class="spark" style="--angle:${i * 72}deg"></span>`
    ).join('');
    return `
        <div class="vs-container">
            <div class="vs-sparks">${sparks}</div>
            <span class="vs-text">VS</span>
        </div>
    `;
}

// ====== 显示结果 ======
async function displayResult(data) {
    const log = data.battle_log;
    const winner = log.winner || data.winner;

    const chars = [log.player1_char, log.player2_char];
    let html = buildCharacterCard(chars[0], '玩家1', false);
    html += buildVsHtml();
    html += buildCharacterCard(chars[1], '玩家2', false);

    charactersContainer.innerHTML = html;

    storyBox.textContent = '';
    winnerBox.textContent = '';
    winnerBox.className = 'winner-box';
    eloChange.innerHTML = '';

    resultArea.classList.add('show');
    resultArea.scrollIntoView({ behavior: 'smooth' });

    const storyText = log.story || '战斗激烈...';
    const animationPromise = playBattleAnimation(winner, chars[0], chars[1]);
    const typewriterPromise = typewriterEffect(storyBox, storyText);

    await Promise.all([animationPromise, typewriterPromise]);

    let winnerText = '';
    let winnerClass = '';
    if (winner === 'player1') {
        winnerText = '玩家1 获胜！';
        winnerClass = 'p1';
    } else if (winner === 'player2') {
        winnerText = '玩家2 获胜！';
        winnerClass = 'p2';
    } else {
        winnerText = '平局！';
        winnerClass = 'draw';
    }
    winnerBox.textContent = winnerText;
    winnerBox.className = 'winner-box ' + winnerClass;

    if (winner === 'player1' || winner === 'player2') {
        const winnerName = winner === 'player1' ? '玩家1' : '玩家2';
        const loserName = winner === 'player1' ? '玩家2' : '玩家1';
        eloChange.innerHTML =
            `<span class="elo-up">${winnerName} +${ELO_DELTA} 分</span>，` +
            `<span class="elo-down">${loserName} -${ELO_DELTA} 分</span>`;
    } else {
        eloChange.textContent = '平局，ELO 不变';
    }
}

// ====== 再来一局 ======
rematchBtn.addEventListener('click', function() {
    resultArea.classList.remove('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ====== 战斗历史 ======
async function loadBattleHistory() {
    try {
        const response = await fetch('/api/battles/history?limit=5');
        const battles = await response.json();

        if (!battles.length) {
            historyList.innerHTML = '<li class="history-empty">暂无战斗记录</li>';
            return;
        }

        historyList.innerHTML = battles.map(b => `
            <li>
                <span class="history-scene">${b.scene}</span>
                <span class="history-winner">${winnerLabel(b.winner)}</span>
                <span class="history-time">${formatTime(b.created_at)}</span>
            </li>
        `).join('');
    } catch (e) {
        historyList.innerHTML = '<li class="history-empty">加载失败</li>';
    }
}

// ====== 排行榜弹窗 ======
async function openLeaderboard() {
    leaderboardModal.classList.add('show');
    leaderboardBody.innerHTML = '<p class="loading-text">加载中...</p>';

    try {
        const response = await fetch('/api/players/');
        const players = await response.json();

        if (!players.length) {
            leaderboardBody.innerHTML = '<p class="loading-text">暂无玩家数据</p>';
            return;
        }

        leaderboardBody.innerHTML = players.map((p, i) => `
            <div class="leaderboard-row">
                <span class="rank">${i + 1}</span>
                <span class="name">${p.username}</span>
                <span class="record">${p.wins}胜 ${p.losses}负</span>
                <span class="elo">${p.elo_score}</span>
            </div>
        `).join('');
    } catch (e) {
        leaderboardBody.innerHTML = '<p class="loading-text">加载失败</p>';
    }
}

function closeLeaderboard() {
    leaderboardModal.classList.remove('show');
}

leaderboardBtn.addEventListener('click', openLeaderboard);
modalCloseBtn.addEventListener('click', closeLeaderboard);
leaderboardModal.addEventListener('click', function(e) {
    if (e.target === leaderboardModal) closeLeaderboard();
});

// ====== 初始化 ======
randomScene();
checkInputs();
loadBattleHistory();
