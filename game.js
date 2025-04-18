const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 400;
canvas.height = 600;

let bird = { x: 50, y: 150, width: 20, height: 20, gravity: 1.5, lift: -45, velocity: 0 }; // Reduced lift for smoother jumps
let pipes = [];
let frame = 0;
let score = 0;

function drawBird() {
    ctx.fillStyle = "yellow";
    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
}

function drawPipes() {
    ctx.fillStyle = "green";
    pipes.forEach(pipe => {
        ctx.fillRect(pipe.x, 0, pipe.width, pipe.top);
        ctx.fillRect(pipe.x, canvas.height - pipe.bottom, pipe.width, pipe.bottom);
    });
}

function updatePipes() {
    if (frame % 100 === 0) {
        let gap = 120;
        let top = Math.random() * (canvas.height / 2);
        pipes.push({ x: canvas.width, width: 40, top: top, bottom: canvas.height - top - gap });
    }
    pipes.forEach(pipe => {
        pipe.x -= 2;
    });
    pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);
}

function checkCollision() {
    if (bird.y + bird.height >= canvas.height || bird.y <= 0) return true;
    for (let pipe of pipes) {
        if (
            bird.x < pipe.x + pipe.width &&
            bird.x + bird.width > pipe.x &&
            (bird.y < pipe.top || bird.y + bird.height > canvas.height - pipe.bottom)
        ) {
            return true;
        }
    }
    return false;
}

function updateBird() {
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;
}

function drawScore() {
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText(`Score: ${score}`, 10, 20);
}

function resetGame() {
    bird.y = 150; // Reset bird's position
    bird.velocity = 0; // Reset bird's velocity
    pipes = []; // Clear all pipes
    frame = 0; // Reset frame counter
    score = 0; // Reset score
    bird.x = 50; // Ensure bird's horizontal position is also reset
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBird();
    drawPipes();
    drawScore();

    updateBird();
    updatePipes();

    if (checkCollision()) {
        alert("Game Over! Your score: " + score);
        resetGame(); // Reset the game instead of reloading the page
    }

    frame++;
    if (frame % 100 === 0) score++;

    requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", (event) => {
    if (event.key === " ") { // Jump only on spacebar
        bird.velocity = bird.lift;
    }
});

gameLoop();
