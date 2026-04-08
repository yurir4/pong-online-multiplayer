const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');
const usernameInput = document.getElementById('username');
const colorInput = document.getElementById('paddleColor');
const menuContainer = document.getElementById('menu-container');

// --- ESTADOS E CONFIGURAÇÕES ---
let playerName = "";
let gameRunning = false;
let flashFrames = 0;
let particles = [];

const player = { x: 10, y: 150, w: 15, h: 80, color: "#007AFF", score: 0 };
const computer = { x: 775, y: 150, w: 15, h: 80, color: "#FF3B30", score: 0 };
const ball = { 
    x: 400, y: 200, r: 8, 
    speedX: 5, speedY: 5, 
    heat: 0, // 0 a 100%
    color: "rgb(255, 255, 0)" 
};

// --- SISTEMA DE PARTÍCULAS (FAÍSCAS) ---
function createParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1.0, // Vida de 1.0 a 0.0
            color: color
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

// --- LÓGICA TÉRMICA DA BOLA ---
function updateBallColor() {
    // Começa em Amarelo (255, 255, 0) e vai para Vermelho (255, 0, 0)
    let greenValue = Math.max(0, 255 - (ball.heat * 2.55));
    ball.color = `rgb(255, ${greenValue}, 0)`;
}

// --- CONTROLES ---
canvas.addEventListener('mousemove', (e) => {
    if (!gameRunning) return;
    let rect = canvas.getBoundingClientRect();
    player.y = e.clientY - rect.top - player.h / 2;
});

function startGame(mode) {
    playerName = usernameInput.value.trim() || "Player";
    player.color = colorInput.value;
    menuContainer.style.display = 'none';
    canvas.style.display = 'block';
    gameRunning = true;
    animate();
}

function update() {
    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // IA do Computador
    let computerCenter = computer.y + computer.h / 2;
    computer.y += (ball.y - computerCenter) * 0.12;

    // Colisão Teto/Chão
    if (ball.y + ball.r > canvas.height || ball.y - ball.r < 0) {
        ball.speedY *= -1;
        createParticles(ball.x, ball.y, "#fff");
    }

    // Colisão Raquetes
    let paddle = (ball.x < canvas.width/2) ? player : computer;
    if (checkCollision(ball, paddle)) {
        ball.speedX *= -1.1; 
        ball.heat = Math.min(100, ball.heat + 10);
        updateBallColor();
        createParticles(ball.x, ball.y, ball.color);
        ball.x = (paddle === player) ? player.x + player.w + ball.r : computer.x - ball.r;
    }

    // --- CORREÇÃO DO GOL AQUI ---
    if (ball.x < 0) {
        computer.score++;
        flashFrames = 30; // FAZ PISCAR QUANDO O PC FAZ GOL TAMBÉM (Dopamina de alerta)
        resetBall();
    } else if (ball.x > canvas.width) {
        player.score++;
        flashFrames = 35; // CELEBRAÇÃO DO SEU GOL
        resetBall();
    }
    
    updateParticles();
}
function draw() {
    // 1. Fundo Preto com rastro
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Desenha Elementos do Jogo
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
    });
    ctx.globalAlpha = 1.0;

    drawRect(player.x, player.y, player.w, player.h, player.color);
    drawRect(computer.x, computer.y, computer.w, computer.h, computer.color);

    // Bola incandescente
    ctx.shadowBlur = 10 + (ball.heat / 2);
    ctx.shadowColor = ball.color;
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r + (ball.heat/20), 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Placar
    ctx.fillStyle = "white";
    ctx.font = "bold 40px Segoe UI";
    ctx.fillText(player.score, canvas.width/4, 60);
    ctx.fillText(computer.score, 3*canvas.width/4, 60);

    // --- EFEITO DE FLASH (DESENHADO POR ÚLTIMO PARA COBRIR TUDO) ---
    if (flashFrames > 0) {
        const colors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#00FFFF", "#FF00FF"];
        // Escolhe uma cor aleatória da lista a cada frame
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.globalAlpha = 0.6; // Aumentamos a opacidade para ser mais visível
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
        flashFrames--;
    }
}

function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;
}

function checkCollision(b, p) {
    return b.x - b.r < p.x + p.w && b.x + b.r > p.x && b.y < p.y + p.h && b.y > p.y;
}

function resetBall() {
    ball.x = canvas.width/2;
    ball.y = canvas.height/2;
    ball.heat = 0;
    ball.speedX = 5 * (Math.random() > 0.5 ? 1 : -1);
    ball.speedY = 5 * (Math.random() > 0.5 ? 1 : -1);
    updateBallColor();
    particles = [];
}

function animate() {
    if (!gameRunning) return;
    update();
    draw();
    requestAnimationFrame(animate);
}

document.getElementById('btn-solo').onclick = () => startGame('solo');
document.getElementById('btn-online').onclick = () => startGame('online');