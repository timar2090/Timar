document.addEventListener('DOMContentLoaded', function() {
    const gameBoard = document.getElementById('gameBoard');
    const timeLeft = document.getElementById('timeLeft');
    const bestScore = document.getElementById('bestScore');
    const newGameBtn = document.getElementById('newGameBtn');
    const hintBtn = document.getElementById('hintBtn');

    let tiles = [];
    let selectedTile = null;
    let timer = null;
    let timeRemaining = 300;
    let matchedPairs = 0;
    const BOARD_SIZE = 8;
    const TOTAL_PAIRS = (BOARD_SIZE * BOARD_SIZE) / 2;

    // 表情符号数组
    const emojis = [
        '😀', '😎', '🤔', '😍', '🤣', '😴', '🤩', '😊',
        '🎮', '🎲', '🎯', '🎨', '🎭', '🎪', '🎫', '🎰',
        '🌈', '🌞', '⭐', '🌙', '⚡', '🔥', '❄️', '🌸',
        '🐶', '🐱', '🐼', '🐨', '🦁', '🐯', '🦊', '🦖'
    ];

    // 初始化游戏
    function initGame() {
        clearInterval(timer);
        timeRemaining = 300;
        matchedPairs = 0;
        selectedTile = null;
        tiles = [];
        gameBoard.innerHTML = '';
        updateTimeDisplay();
        startTimer();
        createBoard();
    }

    // 创建游戏板
    function createBoard() {
        const shuffledEmojis = getShuffledEmojis();
        for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.index = i;
            tile.textContent = shuffledEmojis[i];
            tile.addEventListener('click', handleTileClick);
            gameBoard.appendChild(tile);
            tiles.push(tile);
        }
    }

    // 获取打乱的表情符号数组
    function getShuffledEmojis() {
        const gameEmojis = emojis.slice(0, TOTAL_PAIRS);
        const pairedEmojis = [...gameEmojis, ...gameEmojis];
        return shuffleArray(pairedEmojis);
    }

    // 打乱数组
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // 处理方块点击
    function handleTileClick(event) {
        const tile = event.target;
        if (tile.classList.contains('matched') || tile === selectedTile) {
            return;
        }

        tile.classList.add('selected');

        if (!selectedTile) {
            selectedTile = tile;
        } else {
            checkMatch(selectedTile, tile);
        }
    }

    // 检查匹配
    function checkMatch(tile1, tile2) {
        const isMatch = tile1.textContent === tile2.textContent;
        
        if (isMatch) {
            tile1.classList.add('matching');
            tile2.classList.add('matching');
            
            setTimeout(() => {
                tile1.classList.remove('matching');
                tile2.classList.remove('matching');
                tile1.classList.add('matched');
                tile2.classList.add('matched');
                matchedPairs++;
                checkWin();
            }, 300);
        } else {
            setTimeout(() => {
                tile1.classList.remove('selected');
                tile2.classList.remove('selected');
            }, 500);
        }

        selectedTile = null;
    }

    // 检查胜利
    function checkWin() {
        if (matchedPairs === TOTAL_PAIRS) {
            clearInterval(timer);
            const score = timeRemaining;
            const currentBest = parseInt(bestScore.textContent) || 0;
            if (score > currentBest) {
                bestScore.textContent = score;
                localStorage.setItem('bestScore', score);
            }
            alert(`恭喜你赢了！剩余时间：${timeRemaining}秒`);
        }
    }

    // 开始计时器
    function startTimer() {
        timer = setInterval(() => {
            timeRemaining--;
            updateTimeDisplay();
            if (timeRemaining <= 0) {
                clearInterval(timer);
                alert('时间到！游戏结束');
                initGame();
            }
        }, 1000);
    }

    // 更新时间显示
    function updateTimeDisplay() {
        timeLeft.textContent = timeRemaining;
    }

    // 提示功能
    function showHint() {
        const unmatched = tiles.filter(tile => !tile.classList.contains('matched'));
        if (unmatched.length === 0) return;

        const pairs = new Map();
        unmatched.forEach(tile => {
            const emoji = tile.textContent;
            if (!pairs.has(emoji)) {
                pairs.set(emoji, []);
            }
            pairs.get(emoji).push(tile);
        });

        for (const [_, pair] of pairs) {
            if (pair.length === 2) {
                pair.forEach(tile => {
                    tile.classList.add('hint');
                    setTimeout(() => {
                        tile.classList.remove('hint');
                    }, 1000);
                });
                break;
            }
        }
    }

    // 事件监听器
    newGameBtn.addEventListener('click', initGame);
    hintBtn.addEventListener('click', showHint);

    // 加载最佳分数
    bestScore.textContent = localStorage.getItem('bestScore') || '0';

    // 开始游戏
    initGame();
}); 