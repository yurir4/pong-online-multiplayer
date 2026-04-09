const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');
const usernameInput = document.getElementById('username');
const colorInput = document.getElementById('paddleColor');
const menuContainer = document.getElementById('menu-container');
const mainMenu = document.getElementById('main-menu');
const rankingPanel = document.getElementById('ranking-panel');
const rankingList = document.getElementById('ranking-list');

// --- SISTEMA DE PONTUAÇÃO E RANKING ---
let userScorePoints = 0;
let mockRanking = [
    { name: "PRO_STRIKER", points: 15.5 },
    { name: "NEON_MASTER", points: 12.2 },
    { name: "BATTLE_KING", points: 10.8 }
];

// --- ESTADOS DO JOGO ---
let playerName = "";
let gameRunning = false;
let gameOver = false;
let winnerName = "";
let celebrationY = -150;
let flashFrames = 0;
let particles = [];
let screenShake = 0; 
let combo = 0;      
const WINNING_SCORE = 5;
const INITIAL_SPEED_X = 5;
const INITIAL_SPEED_Y = 4;
let balls = [];
let animationId; 

// --- MECÂNICA DOPAMINÉRGICA ANTERIOR ---
let impactStop = 0; 
let bgPulse = 0;    
let obstacle = { x: 400, y: 200, size: 40, angle: 0, active: false }; 
let goalText = "";
let goalTextTimer = 0;
let goalColor = "#FFCC00";
const goalMessages = ["BOOM!", "SMASH!", "EPIC!", "NICE!", "GODLIKE!", "CRAZY!", "PUNG!", "UNSTOPPABLE!"];

// --- NOVAS VARIÁVEIS DE AMBIENTAÇÃO DE CAMPO ---
let gridGlow = [];      // Grade Neon (Tron Effect)
let ambientDust = [];   // Partículas Ambientais (Starfield)
let borderPulseTop = 0; // Bordas Reativas (Energy Walls)
let borderPulseBot = 0;

const player = { x: 10, y: 150, w: 15, h: 80, color: "#007AFF", score: 0 };
const computer = { x: 775, y: 150, w: 15, h: 80, color: "#FF3B30", score: 0 };

// --- CONTROLES MOUSE ---
canvas.addEventListener('mousemove', (e) => {
    if (!gameRunning || gameOver || impactStop > 0) return;
    let rect = canvas.getBoundingClientRect();
    player.y = (e.clientY - rect.top) - player.h / 2;
});

// --- SISTEMA DE PARTÍCULAS (COLISÃO) ---
function createParticles(x, y, color) {
    for (let i = 0; i < 12; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1.0, color: color
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.life -= 0.03;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

// --- LÓGICA DE CAMPO INICIAL ---

// 1. Inicializa a Grade Neon (Tron Effect)
function initGrid() {
    gridGlow = [];
    // Linhas Verticais com Perspectiva sutil
    for (let x = 50; x < canvas.width; x += 100) {
        gridGlow.push({ x: x, y1: 0, y2: canvas.height, alpha: 0.1, type: 'v' });
    }
    // Linhas Horizontais
    for (let y = 50; y < canvas.height; y += 100) {
        gridGlow.push({ y: y, x1: 0, x2: canvas.width, alpha: 0.1, type: 'h' });
    }
}

// 2. Inicializa Partículas Ambientais (Starfield)
function initAmbientDust() {
    ambientDust = [];
    for (let i = 0; i < 50; i++) {
        ambientDust.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.5 + 0.1
        });
    }
}

// --- LÓGICA DA BOLA ---
function createBall() {
    balls.push({
        x: canvas.width / 2, y: canvas.height / 2, r: 8,
        speedX: INITIAL_SPEED_X * (Math.random() > 0.5 ? 1 : -1),
        speedY: INITIAL_SPEED_Y * (Math.random() > 0.5 ? 1 : -1),
        heat: 0, color: "rgb(255, 255, 0)"
    });
}

function updateBallColor(ball) {
    let greenValue = Math.max(0, 255 - (ball.heat * 2.55));
    ball.color = `rgb(255, ${greenValue}, 0)`;
}

// --- NAVEGAÇÃO E RANKING ---
function updateRankingUI() {
    rankingList.innerHTML = "";
    let currentRanking = [...mockRanking];
    currentRanking.push({ name: playerName || "VOCÊ", points: parseFloat(userScorePoints.toFixed(1)) });
    currentRanking.sort((a, b) => b.points - a.points);
    currentRanking.slice(0, 50).forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'ranking-item';
        div.innerHTML = `<span>${index + 1}. ${item.name}</span> <span>${item.points.toFixed(1)} pts</span>`;
        rankingList.appendChild(div);
    });
}

function validateUsername(name) {
    let cleanName = name.replace(/[^a-zA-Z0-9 ]/g, "");
    if (cleanName.trim() === "") return "PLAYER 1";
    return cleanName.trim().toUpperCase();
}

function startGame() {
    if (animationId) cancelAnimationFrame(animationId);
    playerName = validateUsername(usernameInput.value);
    player.color = colorInput.value;
    menuContainer.style.display = 'none';
    canvas.style.display = 'block';
    player.score = 0; computer.score = 0; combo = 0;
    gameOver = false; celebrationY = -150;
    impactStop = 0; bgPulse = 0; goalTextTimer = 0;
    obstacle.active = false;
    borderPulseTop = 0; borderPulseBot = 0;
    
    initGrid();
    initAmbientDust();
    balls = []; particles = [];
    createBall();
    gameRunning = true;
    animate();
}

function triggerGoalEffect(text, color = "#FFCC00") {
    goalText = text;
    goalTextTimer = 50;
    goalColor = color;
}

function update() {
    if (!gameRunning || gameOver) return;
    if (impactStop > 0) { impactStop--; return; }

    if (combo >= 5) {
        obstacle.active = true;
        obstacle.angle += 0.05;
        obstacle.y = 200 + Math.sin(Date.now() / 500) * 50;
    } else {
        obstacle.active = false;
    }

    balls.forEach((ball) => {
        ball.x += ball.speedX;
        ball.y += ball.speedY;

        // IA
        let computerCenter = computer.y + computer.h / 2;
        let targetBall = balls[0];
        balls.forEach(b => { if(b.x > targetBall.x) targetBall = b; });
        if (targetBall.x > canvas.width * 0.6) computer.y += (targetBall.y - computerCenter) * 0.07;

        // Teto/Chão (Ativa as Bordas Reativas)
        if (ball.y - ball.r < 0) {
            ball.speedY *= -1;
            screenShake = 2;
            createParticles(ball.x, ball.y, "#fff");
            borderPulseTop = 30; // Ativa "Vibração de Energia" no teto
        } else if (ball.y + ball.r > canvas.height) {
            ball.speedY *= -1;
            screenShake = 2;
            createParticles(ball.x, ball.y, "#fff");
            borderPulseBot = 30; // Ativa "Vibração de Energia" no chão
        }

        // Colisão Obstáculo Central
        if (obstacle.active) {
            let dx = ball.x - obstacle.x;
            let dy = ball.y - obstacle.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < ball.r + obstacle.size / 2) {
                ball.speedX *= -1;
                ball.speedY += (Math.random() - 0.5) * 5;
                createParticles(ball.x, ball.y, "#FF00FF");
                screenShake = 10;
            }
        }

        // Colisão Raquete
        let paddle = (ball.x < canvas.width/2) ? player : computer;
        if (checkCollision(ball, paddle)) {
            ball.speedX *= -1.05; 
            ball.heat = Math.min(100, ball.heat + 10);
            updateBallColor(ball);
            if (ball.heat > 50) impactStop = 4; 
            bgPulse = 20;
            screenShake = 8;
            createParticles(ball.x, ball.y, ball.color);
            if (paddle === player) {
                combo++;
                if (combo === 10 && balls.length < 2) createBall();
            }
            ball.x = (paddle === player) ? player.x + player.w + ball.r : computer.x - ball.r;
        }

        // GOL E VITÓRIA
        if (ball.x < 0 || ball.x > canvas.width) {
            if (ball.x > canvas.width) {
                player.score++;
                let pointsEarned = 0.1;
                let randomMsg = goalMessages[Math.floor(Math.random() * goalMessages.length)];
                let displayColor = "#FFCC00";

                if (Math.abs(ball.speedX) > 12) {
                    randomMsg = "SUPER SONIC!";
                    displayColor = "#00FFFF";
                    pointsEarned = 0.3;
                } else if (combo >= 15) {
                    randomMsg = "COMBO BREAKER!";
                    displayColor = "#FF00FF";
                    pointsEarned = 0.4;
                }

                triggerGoalEffect(randomMsg, displayColor);
                userScorePoints += pointsEarned;
                flashFrames = 35; screenShake = 30;
                
                if (player.score >= WINNING_SCORE) {
                    gameOver = true; winnerName = playerName; userScorePoints += 0.5;
                } else {
                    resetRound();
                }
            } else {
                computer.score++;
                if (computer.score >= WINNING_SCORE) {
                    gameOver = true; winnerName = "CPU MASTER";
                } else {
                    triggerGoalEffect("FAILED...", "#FF3B30");
                    resetRound();
                }
            }
        }
    });

    // 2. Atualiza Partículas Ambientais (Starfield/Dust)
    ambientDust.forEach(dust => {
        dust.x += dust.vx;
        dust.y += dust.vy;
        // Faz as partículas flutuarem sutilmente em direção à bola mais rápida
        if (balls.length > 0) {
            let targetBall = balls[0];
            balls.forEach(b => { if(Math.abs(b.speedX) > Math.abs(targetBall.speedX)) targetBall = b; });
            if (Math.abs(targetBall.speedX) > 10) {
                dust.x += (targetBall.x - dust.x) * 0.0001; // Puxão gravitacional sutil
                dust.y += (targetBall.y - dust.y) * 0.0001;
            }
        }
        // Reposiciona se sair da tela
        if (dust.x < 0) dust.x = canvas.width;
        if (dust.x > canvas.width) dust.x = 0;
        if (dust.y < 0) dust.y = canvas.height;
        if (dust.y > canvas.height) dust.y = 0;
    });

    updateParticles();
}

function draw() {
    if (!gameRunning) return;
    ctx.save();
    
    // Screen Shake
    if (screenShake > 0 && impactStop === 0) {
        ctx.translate((Math.random()-0.5)*screenShake, (Math.random()-0.5)*screenShake);
        screenShake *= 0.9;
    }

    // Fundo Motion Blur
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- DESENHO DE CAMPO PREMIUM ---

    // 1. Linhas de Grade Neon (Tron Effect)
    ctx.strokeStyle = "rgba(0, 122, 255, 0.1)"; // Azul Neon Sutil
    ctx.lineWidth = 1;
    ctx.save();
    gridGlow.forEach(line => {
        // As linhas acendem levemente quando a bola passa por cima
        if (balls.length > 0) {
            balls.forEach(ball => {
                if (line.type === 'v' && Math.abs(ball.x - line.x) < 50) line.alpha = 0.5;
                if (line.type === 'h' && Math.abs(ball.y - line.y) < 50) line.alpha = 0.5;
            });
        }
        ctx.globalAlpha = line.alpha;
        if (line.alpha > 0.1) line.alpha *= 0.95; // Diminui o brilho sutilmente

        ctx.beginPath();
        if (line.type === 'v') {
            // Efeito de Perspectiva 3D Sutil (ponto de fuga central)
            let perspectiveX1 = line.x + (line.x - canvas.width / 2) * 0.1;
            let perspectiveX2 = line.x - (line.x - canvas.width / 2) * 0.1;
            ctx.moveTo(perspectiveX1, line.y1);
            ctx.lineTo(perspectiveX2, line.y2);
        } else {
            ctx.moveTo(line.x1, line.y);
            ctx.lineTo(line.x2, line.y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    });
    ctx.restore();

    // 2. Partículas Ambientais (Starfield)
    ctx.fillStyle = "#FFFFFF";
    ambientDust.forEach(dust => {
        ctx.globalAlpha = dust.alpha;
        ctx.fillRect(dust.x, dust.y, dust.size, dust.size);
        ctx.globalAlpha = 1.0;
    });

    // Obstáculo Central
    if (obstacle.active) {
        ctx.save();
        ctx.translate(obstacle.x, obstacle.y);
        ctx.rotate(obstacle.angle);
        ctx.strokeStyle = "#FF00FF";
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15; ctx.shadowColor = "#FF00FF";
        ctx.strokeRect(-obstacle.size/2, -obstacle.size/2, obstacle.size, obstacle.size);
        ctx.restore();
    }

    // Partículas de Impacto
    particles.forEach(p => {
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
    });
    ctx.globalAlpha = 1.0;

    // --- DESENHO DE ELEMENTOS REATIVOS ---

    // 3. Sombras Projetadas Neon
    if (balls.length > 0) {
        ctx.save();
        balls.forEach(ball => {
            // "Sombra" neon projetada no fundo. Ela se desloca baseada na altura (Y)
            let shadowOffsetX = 0;
            let shadowOffsetY = (ball.y - canvas.height / 2) * 0.05; // Baseado na altura
            let shadowRadius = ball.r + (ball.heat / 20); // Aumenta com o heat

            ctx.fillStyle = ball.color;
            ctx.globalAlpha = 0.03; // Sutil
            ctx.shadowBlur = shadowRadius; ctx.shadowColor = ball.color;
            
            ctx.beginPath();
            ctx.arc(ball.x + shadowOffsetX, ball.y + shadowOffsetY, shadowRadius, 0, Math.PI*2); 
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
        });
        ctx.restore();
    }

    // Raquetes e Bolas
    drawRect(player.x, player.y, player.w, player.h, player.color);
    drawRect(computer.x, computer.y, computer.w, computer.h, computer.color);
    balls.forEach(ball => {
        ctx.shadowBlur = 10 + (ball.heat / 2); ctx.shadowColor = ball.color;
        ctx.fillStyle = ball.color; ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r + (ball.heat/15), 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    });

    // 4. Bordas Reativas (Energy Walls)
    ctx.save();
    // Teto
    let alphaTop = borderPulseTop > 0 ? borderPulseTop / 30 : 0.1;
    ctx.strokeStyle = `rgba(255, 255, 255, ${alphaTop})`;
    ctx.lineWidth = 2 + alphaTop * 3; // Fica mais espessa na vibração
    ctx.shadowBlur = borderPulseTop > 0 ? 15 : 0; ctx.shadowColor = "#FFFFFF";
    ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(canvas.width, 1); ctx.stroke();
    if (borderPulseTop > 0) borderPulseTop *= 0.92;

    // Chão
    let alphaBot = borderPulseBot > 0 ? borderPulseBot / 30 : 0.1;
    ctx.strokeStyle = `rgba(255, 255, 255, ${alphaBot})`;
    ctx.lineWidth = 2 + alphaBot * 3;
    ctx.shadowBlur = borderPulseBot > 0 ? 15 : 0; ctx.shadowColor = "#FFFFFF";
    ctx.beginPath(); ctx.moveTo(0, canvas.height-1); ctx.lineTo(canvas.width, canvas.height-1); ctx.stroke();
    if (borderPulseBot > 0) borderPulseBot *= 0.92;
    ctx.restore();

    // UI (Centralizada)
    ctx.fillStyle = "white"; ctx.textAlign = "center";
    ctx.font = "bold 16px Arial"; ctx.fillText(playerName, 200, 30);
    ctx.fillText("CPU MASTER", 600, 30);
    ctx.font = "bold 50px Arial"; ctx.fillText(player.score, 200, 80);
    ctx.fillText(computer.score, 600, 80);
    if(combo > 1 && !gameOver) { 
        ctx.textAlign="left"; ctx.fillStyle = "#FFFFFF";
        ctx.fillText("COMBO X"+combo, 20, 380); 
    }

    // Goal Pop-up
    if (goalTextTimer > 0) {
        ctx.save();
        ctx.textAlign = "center";
        let scale = 1 + (goalTextTimer / 30);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scale, scale);
        ctx.font = "italic bold 45px Arial";
        ctx.fillStyle = goalColor;
        ctx.shadowBlur = 20; ctx.shadowColor = goalColor;
        ctx.fillText(goalText, 0, 0);
        ctx.restore();
        goalTextTimer--;
    }

    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(0,0,canvas.width,canvas.height);
        if (celebrationY < 150) celebrationY += 5;
        const win = winnerName === playerName;
        ctx.fillStyle = win ? "#FFCC00" : "#FF3B30"; ctx.font = "bold 60px Arial";
        ctx.textAlign = "center";
        ctx.fillText(win ? "VITÓRIA!" : "DERROTA", 400, celebrationY);
        if(win) { ctx.font = "80px Arial"; ctx.fillText("🏆", 400, celebrationY + 100); }
        ctx.fillStyle = "white"; ctx.font = "bold 20px Arial";
        ctx.fillText("CLIQUE PARA VOLTAR AO MENU", 400, 350);
    }
    ctx.restore();
}

function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color; ctx.shadowBlur = 15; ctx.shadowColor = color;
    ctx.fillRect(x, y, w, h); ctx.shadowBlur = 0;
}

function checkCollision(b, p) { 
    return b.x - b.r < p.x + p.w && b.x + b.r > p.x && b.y < p.y + p.h && b.y > p.y; 
}

function resetRound() { balls = []; combo = 0; createBall(); }

function animate() { 
    update(); draw(); 
    if (gameRunning) animationId = requestAnimationFrame(animate); 
}

canvas.addEventListener('click', () => { if(gameOver) { canvas.style.display='none'; menuContainer.style.display='block'; updateRankingUI(); } });
document.getElementById('btn-solo').onclick = startGame;
document.getElementById('btn-ranking').onclick = () => { mainMenu.style.display='none'; rankingPanel.style.display='block'; updateRankingUI(); };
document.getElementById('btn-back-menu').onclick = () => { rankingPanel.style.display='none'; mainMenu.style.display='block'; };