class LianLianKan {
    constructor() {
        this.gameBoard = document.getElementById('gameBoard');
        this.timeLeftDisplay = document.getElementById('timeLeft');
        this.bestScoreDisplay = document.getElementById('bestScore');
        this.newGameBtn = document.getElementById('newGameBtn');
        this.hintBtn = document.getElementById('hintBtn');
        
        this.size = { rows: 8, cols: 8 };
        this.tiles = [];
        this.selectedTile = null;
        this.timeLeft = 300;
        this.timer = null;
        this.bestScore = parseInt(localStorage.getItem('llk-bestScore')) || 0;
        this.icons = [
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
            '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔'
        ];
        
        this.init();
        this.setupEventListeners();
    }

    init() {
        this.gameBoard.innerHTML = '';
        this.tiles = [];
        this.selectedTile = null;
        this.timeLeft = 300;
        this.bestScoreDisplay.textContent = this.bestScore;
        
        // 创建配对的图标数组
        let icons = [];
        for (let i = 0; i < (this.size.rows * this.size.cols) / 2; i++) {
            const icon = this.icons[i % this.icons.length];
            icons.push(icon, icon);
        }
        
        // 随机打乱图标
        icons = this.shuffle(icons);
        
        // 创建游戏板
        for (let i = 0; i < this.size.rows; i++) {
            this.tiles[i] = [];
            for (let j = 0; j < this.size.cols; j++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.dataset.row = i;
                tile.dataset.col = j;
                
                const iconSpan = document.createElement('span');
                iconSpan.textContent = icons[i * this.size.cols + j];
                tile.appendChild(iconSpan);
                
                this.gameBoard.appendChild(tile);
                this.tiles[i][j] = {
                    element: tile,
                    icon: icons[i * this.size.cols + j],
                    matched: false
                };
            }
        }
        
        this.startTimer();
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    startTimer() {
        if (this.timer) clearInterval(this.timer);
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.timeLeftDisplay.textContent = this.timeLeft;
            
            if (this.timeLeft <= 0) {
                this.gameOver();
            }
        }, 1000);
    }

    selectTile(tile) {
        if (tile.matched) return;
        
        if (!this.selectedTile) {
            // 第一次选择
            this.selectedTile = tile;
            tile.element.classList.add('selected');
        } else if (this.selectedTile === tile) {
            // 取消选择
            this.selectedTile.element.classList.remove('selected');
            this.selectedTile = null;
        } else {
            // 第二次选择
            if (this.selectedTile.icon === tile.icon) {
                this.match(this.selectedTile, tile);
                this.checkWin();
            }
            
            // 清除选择状态
            this.selectedTile.element.classList.remove('selected');
            this.selectedTile = null;
        }
    }

    match(tile1, tile2) {
        // 标记为已匹配
        tile1.matched = true;
        tile2.matched = true;
        tile1.element.classList.add('matched');
        tile2.element.classList.add('matched');
        
        // 添加消除动画
        setTimeout(() => {
            tile1.element.style.visibility = 'hidden';
            tile2.element.style.visibility = 'hidden';
        }, 300);
    }

    checkWin() {
        const allMatched = this.tiles.every(row => 
            row.every(tile => tile.matched)
        );
        
        if (allMatched) {
            clearInterval(this.timer);
            const score = this.timeLeft;
            if (score > this.bestScore) {
                this.bestScore = score;
                localStorage.setItem('llk-bestScore', this.bestScore);
                this.bestScoreDisplay.textContent = this.bestScore;
            }
            setTimeout(() => {
                alert(`恭喜你赢了！剩余时间：${this.timeLeft}秒`);
            }, 300);
        }
    }

    gameOver() {
        clearInterval(this.timer);
        alert('游戏结束！时间用完了');
    }

    hint() {
        // 查找可以连接的一对图标
        for (let i = 0; i < this.size.rows; i++) {
            for (let j = 0; j < this.size.cols; j++) {
                if (this.tiles[i][j].matched) continue;
                
                for (let x = i; x < this.size.rows; x++) {
                    const startCol = x === i ? j + 1 : 0;
                    for (let y = startCol; y < this.size.cols; y++) {
                        if (this.tiles[x][y].matched) continue;
                        
                        if (this.tiles[i][j].icon === this.tiles[x][y].icon) {
                            // 显示提示
                            this.tiles[i][j].element.classList.add('hint');
                            this.tiles[x][y].element.classList.add('hint');
                            
                            setTimeout(() => {
                                this.tiles[i][j].element.classList.remove('hint');
                                this.tiles[x][y].element.classList.remove('hint');
                            }, 1000);
                            
                            return;
                        }
                    }
                }
            }
        }
    }

    setupEventListeners() {
        this.gameBoard.addEventListener('click', (e) => {
            const tile = e.target.closest('.tile');
            if (tile) {
                const row = parseInt(tile.dataset.row);
                const col = parseInt(tile.dataset.col);
                this.selectTile(this.tiles[row][col]);
            }
        });

        this.newGameBtn.addEventListener('click', () => {
            this.init();
        });

        this.hintBtn.addEventListener('click', () => {
            this.hint();
        });
    }
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    new LianLianKan();
}); 