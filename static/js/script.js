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
const randomSceneBtn = document.getElementById('randomSceneBtn');
const rematchBtn = document.getElementById('rematchBtn');

// ====== 预置场景 ======
const scenes = [
    '地下黑市拳场，铁笼和呐喊的观众',
    '赛博朋克街头，霓虹灯下雨水飞溅',
    '古罗马角斗场，烈日下沙地灼热',
    '废弃工厂顶楼，月光照亮锈蚀的钢铁',
    '亚马逊雨林空地，原始部落战鼓轰鸣'
];

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

    // 显示加载
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

        displayResult(data);

    } catch (error) {
        alert('错误: ' + error.message);
    } finally {
        loading.classList.remove('show');
        fightBtn.disabled = false;
    }
});

// ====== 显示结果 ======
function displayResult(data) {
    const log = data.battle_log;

    // 1. 角色卡片
    let html = '';
    const chars = [log.player1_char, log.player2_char];
    const winner = log.winner;

    chars.forEach((char, i) => {
        const isWinner = (winner === 'player1' && i === 0) || (winner === 'player2' && i === 1);
        const playerLabel = i === 0 ? '玩家1' : '玩家2';
        html += `
            <div class="char-card ${isWinner ? 'winner' : ''}">
                <div class="name">${playerLabel}: ${char.name || '无名战士'}</div>
                <div class="desc">${char.description || ''}</div>
                <div class="stats">
                    <span>HP ${char.hp || 100}</span>
                    <span>攻击 ${char.attack || 10}</span>
                    <span>防御 ${char.defense || 5}</span>
                </div>
                <div class="skill">必杀技: ${char.skill || '无'}</div>
                ${isWinner ? '<div style="color:#ffd700;font-weight:bold;margin-top:6px;">胜利者！</div>' : ''}
            </div>
        `;
    });

    charactersContainer.innerHTML = html;

    // 2. 战斗故事
    storyBox.textContent = log.story || '战斗激烈...';

    // 3. 胜者
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

    // 显示结果区
    resultArea.classList.add('show');
    resultArea.scrollIntoView({ behavior: 'smooth' });
}

// ====== 再来一局 ======
rematchBtn.addEventListener('click', function() {
    resultArea.classList.remove('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ====== 初始化 ======
randomScene();
checkInputs();