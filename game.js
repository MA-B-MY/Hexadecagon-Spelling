// --- UI SCREEN MANAGEMENT ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function updateMenuScore() {
    const best = localStorage.getItem('spellRunnerBestScore') || 0;
    document.getElementById('bestScoreDisplay').textContent = `Highest Record: ${best}`;
}
updateMenuScore();

// --- PLAYER COLOR STATE (Native Picker) ---
let playerColor = localStorage.getItem('spellRunnerPlayerColor') || '#2196F3'; 
const colorPicker = document.getElementById('playerColorPicker');
if (colorPicker) {
    colorPicker.value = playerColor;
    colorPicker.addEventListener('input', (e) => {
        playerColor = e.target.value;
        localStorage.setItem('spellRunnerPlayerColor', playerColor);
    });
}

// --- HTML MENU BUTTON LISTENERS ---
document.getElementById('startHtmlBtn').addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    showScreen('how-to-play-screen');
});

document.getElementById('how-to-play-screen').addEventListener('click', () => {
    showScreen('game-screen');
    resetGame();
    gameState = STATE_PLAYING;
});

document.getElementById('viewDictHtmlBtn').addEventListener('click', () => {
    showScreen('dictionary-screen');
});

// --- AUDIO SYNTHESIZER SETUP ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let isMuted = false;

function playSound(type) {
    if (isMuted) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'jump') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'collect') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'land') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
    } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === 'music-bass') {
        osc.type = 'triangle';
        const freq = (frameCount % 60 === 0) ? 65.41 : 73.42; 
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    }
}

// --- DICTIONARY & TRIE SETUP ---
class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }
    insert(word) {
        let node = this.root;
        for (let char of word) {
            if (!node.children[char]) node.children[char] = new TrieNode();
            node = node.children[char];
        }
        node.isEndOfWord = true;
    }
    isValidPrefix(word) {
        if (word === "") return true;
        let node = this.root;
        for (let char of word) {
            if (!node.children[char]) return false;
            node = node.children[char];
        }
        return true;
    }
    isValidWord(word) {
        if (word.length < 2) return false; 
        
        let node = this.root;
        for (let char of word) {
            if (!node.children[char]) return false;
            node = node.children[char];
        }
        return node.isEndOfWord;
    }
}

const gameDictionary = new Trie();

// --- GAME STATE MANAGEMENT ---
const STATE_PLAYING = 'PLAYING';
const STATE_PAUSED = 'PAUSED';
const STATE_EXPLODING = 'EXPLODING'; // NEW STATE
const STATE_GAMEOVER = 'GAMEOVER';

let gameState = null; 

let currentWord = "";
let score = 0;
let bestScore = localStorage.getItem('spellRunnerBestScore') || 0;
let isNewRecord = false;
let startTime = 0;
let pauseStartTime = 0;
let timePlayed = 0;

let groundOffset = 0;
let cloudOffset = 0;

let baseSpeed = 1; 
let globalSpeed = 1;
const maxGlobalSpeed = 12; 
let distanceTraveled = 0;
let nextLetterDistance = 300;
let nextObstacleDistance = 600;

// --- DYNAMIC CRISP CANVAS SETUP ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = GAME_WIDTH + 'px';
    canvas.style.height = GAME_HEIGHT + 'px';
    canvas.width = GAME_WIDTH * dpr;
    canvas.height = GAME_HEIGHT * dpr;
    ctx.scale(dpr, dpr);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const keys = { left: false, right: false, jump: false };

const startBtn = { x: GAME_WIDTH / 2 - 100, y: GAME_HEIGHT / 2 + 30, width: 200, height: 60 };
const pauseBtn = { x: GAME_WIDTH - 60, y: 10, width: 50, height: 50 }; 
const pauseMenuResumeBtn  = { x: GAME_WIDTH / 2 - 100, y: GAME_HEIGHT / 2 - 40, width: 200, height: 40 };
const pauseMenuRestartBtn = { x: GAME_WIDTH / 2 - 100, y: GAME_HEIGHT / 2 + 10, width: 200, height: 40 };
const pauseMenuMuteBtn    = { x: GAME_WIDTH / 2 - 100, y: GAME_HEIGHT / 2 + 60, width: 200, height: 40 };
const pauseMenuHomeBtn    = { x: GAME_WIDTH / 2 - 100, y: GAME_HEIGHT / 2 + 110, width: 200, height: 40 };

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (gameState === STATE_PLAYING || gameState === STATE_PAUSED) {
        if (mouseX >= pauseBtn.x && mouseX <= pauseBtn.x + pauseBtn.width &&
            mouseY >= pauseBtn.y && mouseY <= pauseBtn.y + pauseBtn.height) {
            if (gameState === STATE_PLAYING) {
                gameState = STATE_PAUSED;
                pauseStartTime = Date.now();
            } else if (gameState === STATE_PAUSED) {
                gameState = STATE_PLAYING;
                startTime += (Date.now() - pauseStartTime);
            }
            return;
        }
    }

    if (gameState === STATE_PAUSED) {
        if (mouseX >= pauseMenuResumeBtn.x && mouseX <= pauseMenuResumeBtn.x + pauseMenuResumeBtn.width &&
            mouseY >= pauseMenuResumeBtn.y && mouseY <= pauseMenuResumeBtn.y + pauseMenuResumeBtn.height) {
            gameState = STATE_PLAYING;
            startTime += (Date.now() - pauseStartTime);
            return;
        }
        if (mouseX >= pauseMenuRestartBtn.x && mouseX <= pauseMenuRestartBtn.x + pauseMenuRestartBtn.width &&
            mouseY >= pauseMenuRestartBtn.y && mouseY <= pauseMenuRestartBtn.y + pauseMenuRestartBtn.height) {
            resetGame();
            gameState = STATE_PLAYING;
            return;
        }
        if (mouseX >= pauseMenuMuteBtn.x && mouseX <= pauseMenuMuteBtn.x + pauseMenuMuteBtn.width &&
            mouseY >= pauseMenuMuteBtn.y && mouseY <= pauseMenuMuteBtn.y + pauseMenuMuteBtn.height) {
            isMuted = !isMuted;
            return;
        }
        if (mouseX >= pauseMenuHomeBtn.x && mouseX <= pauseMenuHomeBtn.x + pauseMenuHomeBtn.width &&
            mouseY >= pauseMenuHomeBtn.y && mouseY <= pauseMenuHomeBtn.y + pauseMenuHomeBtn.height) {
            gameState = null;
            updateMenuScore();
            showScreen('menu-screen'); 
            return;
        }
    }

    if (gameState === STATE_GAMEOVER) {
        if (mouseX >= startBtn.x && mouseX <= startBtn.x + startBtn.width &&
            mouseY >= startBtn.y + 40 && mouseY <= startBtn.y + 40 + startBtn.height) {
            resetGame();
            gameState = STATE_PLAYING;
        }
    }
});

window.addEventListener('keydown', (e) => {
    if (!gameState) return; 
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();

    if (e.key.toLowerCase() === 'm') {
        isMuted = !isMuted;
        return;
    }

    if (gameState === STATE_GAMEOVER && e.key === 'Enter') {
        resetGame();
        gameState = STATE_PLAYING;
        return;
    }

    if (e.key.toLowerCase() === 'p' || e.key === 'Escape') {
        if (gameState === STATE_PLAYING) {
            gameState = STATE_PAUSED;
            pauseStartTime = Date.now(); 
        } else if (gameState === STATE_PAUSED) {
            gameState = STATE_PLAYING;
            startTime += (Date.now() - pauseStartTime); 
        }
        return;
    }
    
    if (gameState === STATE_PLAYING) {
        if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = true;
        if (e.key === 'd' || e.key === 'ArrowRight') keys.right = true;
        
        if (e.key === 'w' || e.key === 'ArrowUp') {
            if (!keys.jump) { 
                keys.jump = true;
                if (player.jumps < player.maxJumps) {
                    player.velocityY = -10;
                    player.jumps++;
                    player.isGrounded = false;
                    playSound('jump'); 
                }
            }
        }

        if (e.key === ' ') {
            if (gameDictionary.isValidWord(currentWord)) {
                score += (currentWord.length * 2);
                currentWord = ""; 
                playSound('collect'); 
            }
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'a' || e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'd' || e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'w' || e.key === 'ArrowUp') keys.jump = false;
});

// --- PLAYER & SPAWNER SETUP ---
const player = {
    x: 50, y: 300, width: 40, height: 40,
    speed: 5, velocityY: 0, gravity: 0.5,
    isGrounded: false, wasGroundedLastFrame: false,
    jumps: 0, maxJumps: 2
};

const activeLetters = [];
const activeObstacles = [];
let particles = []; // Stores explosion data
let explosionTimer = 0;
let frameCount = 0;

function spawnLetter() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomChar = chars[Math.floor(Math.random() * chars.length)];
    const isTop = Math.random() > 0.5;
    activeLetters.push({ char: randomChar, x: GAME_WIDTH, y: isTop ? 150 : 300, width: 40, height: 40 });
}

function spawnObstacle() {
    const isPipe = Math.random() > 0.5;

    if (isPipe) {
        const isTall = Math.random() > 0.7;
        const pipeWidth = isTall ? 70 : 50;
        const pipeHeight = isTall ? 100 : 50;
        
        activeObstacles.push({
            x: GAME_WIDTH, 
            y: GAME_HEIGHT - 20 - pipeHeight,
            width: pipeWidth, 
            height: pipeHeight, 
            color: '#4CAF50'
        });
    } else {
        const platformY = Math.floor(Math.random() * 120) + 160; 
        if (platformY < 220) {
            activeObstacles.push({
                x: GAME_WIDTH, y: platformY + 90, width: 70, height: 20, color: '#8B4513'
            });
            activeObstacles.push({
                x: GAME_WIDTH + 150, y: platformY, width: 100, height: 20, color: '#8B4513'
            });
        } else {
            activeObstacles.push({
                x: GAME_WIDTH, y: platformY, width: 100, height: 20, color: '#8B4513'
            });
        }
    }
}

function handleCollision(box) {
    if (player.x < box.x + box.width && player.x + player.width > box.x &&
        player.y < box.y + box.height && player.y + player.height > box.y) {
        
        let wasAbove = (player.y + player.height - player.velocityY) <= box.y + 0.1;

        if (player.velocityY > 0 && wasAbove) {
            if (!player.wasGroundedLastFrame) playSound('land'); 
            player.y = box.y - player.height;
            player.velocityY = 0;
            player.isGrounded = true;
            player.jumps = 0; 
        } else {
            let playerCenter = player.x + (player.width / 2);
            let boxCenter = box.x + (box.width / 2);
            
            if (playerCenter < boxCenter) {
                // Obstacle pushes player to the left
                player.x = box.x - player.width; 
                
                // NEW: Squish mechanic check. If pushed to x=0 or less, EXPLODE.
                if (player.x <= 0) {
                    player.x = 0; // Lock character to the edge visually
                    triggerExplosion();
                }
            } else {
                player.x = box.x + box.width;    
            }
        }
    }
}

// NEW: EXPLOSION ANIMATION LOGIC
function triggerExplosion() {
    if (gameState === STATE_EXPLODING || gameState === STATE_GAMEOVER) return;
    gameState = STATE_EXPLODING;
    playSound('gameover'); 
    
    // Lock in the time played so it stops ticking during the animation
    timePlayed = Math.floor((Date.now() - startTime) / 1000);
    
    // Spawn shatter particles
    particles = [];
    for (let i = 0; i < 30; i++) {
        particles.push({
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            size: Math.random() * 8 + 4,
            life: 1.0,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.5
        });
    }
    explosionTimer = 60; // Wait 60 frames (1 second) before showing Game Over menu
}

function triggerGameOver() {
    gameState = STATE_GAMEOVER;
    // Time and sound already triggered inside triggerExplosion()
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('spellRunnerBestScore', bestScore);
        isNewRecord = true;
    } else {
        isNewRecord = false;
    }
}

function resetGame() {
    isNewRecord = false;
    currentWord = "";
    score = 0;
    activeLetters.length = 0;
    activeObstacles.length = 0;
    particles = []; // Clear old explosions
    frameCount = 0;
    groundOffset = 0;
    cloudOffset = 0;
    startTime = Date.now();
    
    globalSpeed = 1; 
    distanceTraveled = 0;
    nextLetterDistance = 300;
    nextObstacleDistance = 600;
    
    player.x = 50;
    player.y = 300;
    player.velocityY = 0;
}

function isSpawnAreaClear() {
    for (let obs of activeObstacles) {
        if (obs.x < GAME_WIDTH + 80 && obs.x + obs.width > GAME_WIDTH - 20) return false;
    }
    for (let letter of activeLetters) {
        if (letter.x < GAME_WIDTH + 80 && letter.x + letter.width > GAME_WIDTH - 20) return false;
    }
    return true;
}

// --- MAIN GAME LOOP ---
function gameLoop() {
    // 1. PLAYING LOGIC
    if (gameState === STATE_PLAYING) {
        const secondsPlayed = Math.floor((Date.now() - startTime) / 1000);
        const speedLevel = Math.floor(secondsPlayed / 30); 
        globalSpeed = Math.min(baseSpeed + (speedLevel * 0.5), maxGlobalSpeed);
        
        distanceTraveled += globalSpeed;
        player.wasGroundedLastFrame = player.isGrounded;
        
        if (keys.left) player.x -= player.speed;
        if (keys.right) player.x += player.speed;
        
        player.velocityY += player.gravity;
        player.y += player.velocityY;
        player.isGrounded = false;
        
        if (player.y + player.height >= GAME_HEIGHT - 20) {
            if (!player.wasGroundedLastFrame) playSound('land'); 
            player.y = GAME_HEIGHT - player.height - 20;
            player.velocityY = 0;
            player.isGrounded = true;
            player.jumps = 0;
        }

        if (player.x < 0) player.x = 0;
        if (player.x + player.width > GAME_WIDTH) player.x = GAME_WIDTH - player.width;

        groundOffset -= globalSpeed; 
        cloudOffset -= (globalSpeed * 0.2); 
        
        if (groundOffset <= -40) groundOffset = 0;
        if (cloudOffset <= -GAME_WIDTH) cloudOffset = 0;

        frameCount++;
        if (frameCount % 30 === 0) playSound('music-bass');

        if (distanceTraveled >= nextLetterDistance) {
            if (isSpawnAreaClear()) {
                spawnLetter();
                nextLetterDistance = distanceTraveled + (Math.random() * 300 + 200); 
            } else {
                nextLetterDistance += 20; 
            }
        }

        if (distanceTraveled >= nextObstacleDistance) {
            if (isSpawnAreaClear()) {
                spawnObstacle();
                nextObstacleDistance = distanceTraveled + (Math.random() * 400 + 400); 
            } else {
                nextObstacleDistance += 20; 
            }
        }

        for (let i = activeObstacles.length - 1; i >= 0; i--) {
            let obs = activeObstacles[i];
            obs.x -= globalSpeed; 
            handleCollision(obs);
            if (obs.x + obs.width < 0) activeObstacles.splice(i, 1);
        }

        for (let i = activeLetters.length - 1; i >= 0; i--) {
            let letter = activeLetters[i];
            letter.x -= globalSpeed; 
            
            if (player.x < letter.x + letter.width && player.x + player.width > letter.x &&
                player.y < letter.y + letter.height && player.y + player.height > letter.y) {
                
                playSound('collect'); 
                currentWord += letter.char;
                score += 1; 
                activeLetters.splice(i, 1);
                
                // Explode if invalid word is built!
                if (!gameDictionary.isValidPrefix(currentWord)) {
                    triggerExplosion();
                }
                continue; 
            }
            if (letter.x + letter.width < 0) activeLetters.splice(i, 1);
        }
    } 
    // 2. EXPLODING ANIMATION LOOP
    else if (gameState === STATE_EXPLODING) {
        explosionTimer--;
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.015; // Fade out slowly
            p.rotation += p.rotSpeed; // Spin the shattered pieces
        });
        if (explosionTimer <= 0) {
            triggerGameOver();
        }
    }

    if (gameState) {
        drawGameScene(); 
    }

    requestAnimationFrame(gameLoop);
}

// --- INITIALIZATION & CACHING ---
async function initGame() {
    const htmlStartBtn = document.getElementById('startHtmlBtn');
    htmlStartBtn.textContent = "LOADING DICTIONARY...";
    htmlStartBtn.style.opacity = "0.5";
    htmlStartBtn.style.pointerEvents = "none";

    try {
        let words = null;
        try {
            const cached = localStorage.getItem('spellRunnerDictionary');
            if (cached) words = JSON.parse(cached);
        } catch (e) {
            console.warn("No valid cache found.");
        }

        if (!words || words.length === 0) {
            console.log("Downloading new dictionary...");
            const response = await fetch('https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt');
            const text = await response.text();
            words = text.split('\n').filter(w => w.trim().length > 0);
            
            try {
                localStorage.setItem('spellRunnerDictionary', JSON.stringify(words));
            } catch (e) {
                console.warn("Chrome Extension Storage Quota Exceeded! Running from RAM instead.");
            }
        }
        words.forEach(word => gameDictionary.insert(word.trim().toUpperCase()));
        
    } catch (error) {
        console.error("Failed to load dictionary.", error);
    } finally {
        htmlStartBtn.textContent = "START GAME";
        htmlStartBtn.style.opacity = "1";
        htmlStartBtn.style.pointerEvents = "auto";
        gameLoop(); 
    }
}

initGame();