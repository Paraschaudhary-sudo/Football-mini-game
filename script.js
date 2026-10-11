
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const blueScoreEl = document.getElementById("blueScore");
const redScoreEl = document.getElementById("redScore");
const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("matchStatus");
const overlay = document.getElementById("startOverlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");

const W = canvas.width;
const H = canvas.height;
const MATCH_SECONDS = 120;

let blueScore = 0;
let redScore = 0;
let timeLeft = MATCH_SECONDS;
let running = false;
let started = false;
let lastTime = 0;
let animationId = null;
let goalPause = 0;

const keys = {};

const player = {
  x: 150, y: H / 2,
  r: 17, speed: 230,
  color: "#54a6ff",
  vx: 0, vy: 0
};

const opponent = {
  x: W - 150, y: H / 2,
  r: 17, speed: 145,
  color: "#ff647c",
  vx: 0, vy: 0
};

const ball = {
  x: W / 2, y: H / 2,
  r: 9, vx: 0, vy: 0
};

function resetPositions() {
  player.x = 150;
  player.y = H / 2;
  player.vx = 0;
  player.vy = 0;

  opponent.x = W - 150;
  opponent.y = H / 2;
  opponent.vx = 0;
  opponent.vy = 0;

  ball.x = W / 2;
  ball.y = H / 2;
  ball.vx = 0;
  ball.vy = 0;

  goalPause = 0;
}

function updateScore() {
  blueScoreEl.textContent = blueScore;
  redScoreEl.textContent = redScore;
}

function updateTimer() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = Math.floor(timeLeft % 60);
  timerEl.textContent =
    `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function showOverlay(title, message, buttonText) {
  overlayTitle.textContent = title;
  overlayText.textContent = message;
  startBtn.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function startGame() {
  if (timeLeft <= 0) {
    restartGame();
    return;
  }

  running = true;
  started = true;
  lastTime = performance.now();

  overlay.classList.add("hidden");
  pauseBtn.disabled = false;
  pauseBtn.textContent = "Pause";
  statusEl.textContent = "MATCH IN PROGRESS";

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }

  animationId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
  if (!started || timeLeft <= 0) return;

  running = !running;

  if (running) {
    lastTime = performance.now();
    pauseBtn.textContent = "Pause";
    statusEl.textContent = "MATCH IN PROGRESS";
    animationId = requestAnimationFrame(gameLoop);
  } else {
    pauseBtn.textContent = "Resume";
    statusEl.textContent = "MATCH PAUSED";
    showOverlay("Match paused", "Take a breath, then get back in the game.", "Resume");
  }
}

function restartGame() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }

  blueScore = 0;
  redScore = 0;
  timeLeft = MATCH_SECONDS;
  running = false;
  started = false;

  resetPositions();
  updateScore();
  updateTimer();

  pauseBtn.disabled = true;
  pauseBtn.textContent = "Pause";
  statusEl.textContent = "READY TO PLAY";

  showOverlay(
    "Ready for kickoff?",
    "Score more goals before the final whistle!",
    "Kick Off"
  );

  draw();
}

function finishGame() {
  running = false;
  started = false;
  timeLeft = 0;
  updateTimer();

  pauseBtn.disabled = true;
  statusEl.textContent = "FULL TIME";

  let result = "It's a draw!";
  if (blueScore > redScore) result = "Blue FC wins!";
  if (redScore > blueScore) result = "Red United wins!";

  showOverlay(
    result,
    `Final score: Blue FC ${blueScore} - ${redScore} Red United`,
    "Play Again"
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function movePlayer(dt) {
  let dx = 0;
  let dy = 0;

  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) dx--;
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) dx++;
  if (keys["ArrowUp"] || keys["w"] || keys["W"]) dy--;
  if (keys["ArrowDown"] || keys["s"] || keys["S"]) dy++;

  const length = Math.hypot(dx, dy) || 1;
  const sprint = keys["Shift"] ? 1.45 : 1;
  const speed = player.speed * sprint;

  player.vx = (dx / length) * speed;
  player.vy = (dy / length) * speed;

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.x = clamp(player.x, 25, W - 25);
  player.y = clamp(player.y, 25, H - 25);
}

function moveOpponent(dt) {
  const dx = ball.x - opponent.x;
  const dy = ball.y - opponent.y;
  const distance = Math.hypot(dx, dy) || 1;

  opponent.vx = (dx / distance) * opponent.speed;
  opponent.vy = (dy / distance) * opponent.speed;

  opponent.x += opponent.vx * dt;
  opponent.y += opponent.vy * dt;

  opponent.x = clamp(opponent.x, 25, W - 25);
  opponent.y = clamp(opponent.y, 25, H - 25);
}

function collidePlayerWithBall(person, isPlayer) {
  const dx = ball.x - person.x;
  const dy = ball.y - person.y;
  const distance = Math.hypot(dx, dy) || 1;
  const minDistance = person.r + ball.r;

  if (distance < minDistance) {
    const nx = dx / distance;
    const ny = dy / distance;
    const overlap = minDistance - distance;

    ball.x += nx * overlap;
    ball.y += ny * overlap;

    const push = isPlayer ? 100 : 80;
    ball.vx += nx * push;
    ball.vy += ny * push;
  }
}

function shootBall() {
  if (!running) return;

  const dx = ball.x - player.x;
  const dy = ball.y - player.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 65) {
    let aimX = 1;
    let aimY = 0;

    if (keys["ArrowUp"] || keys["w"] || keys["W"]) aimY = -0.65;
    if (keys["ArrowDown"] || keys["s"] || keys["S"]) aimY = 0.65;

    const length = Math.hypot(aimX, aimY);
    ball.vx = (aimX / length) * 470;
    ball.vy = (aimY / length) * 470;
  }
}

function updateBall(dt) {
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  const friction = Math.pow(0.985, dt * 60);
  ball.vx *= friction;
  ball.vy *= friction;

  if (ball.y - ball.r < 12) {
    ball.y = 12 + ball.r;
    ball.vy = Math.abs(ball.vy) * 0.8;
  }

  if (ball.y + ball.r > H - 12) {
    ball.y = H - 12 - ball.r;
    ball.vy = -Math.abs(ball.vy) * 0.8;
  }

  const goalTop = H / 2 - 75;
  const goalBottom = H / 2 + 75;

  if (ball.x < 12 && (ball.y < goalTop || ball.y > goalBottom)) {
    ball.x = 12 + ball.r;
    ball.vx = Math.abs(ball.vx) * 0.8;
  }

  if (ball.x > W - 12 && (ball.y < goalTop || ball.y > goalBottom)) {
    ball.x = W - 12 - ball.r;
    ball.vx = -Math.abs(ball.vx) * 0.8;
  }

  if (ball.x < 0 && ball.y > goalTop && ball.y < goalBottom) {
    redScore++;
    updateScore();
    resetPositions();
    goalPause = 0.8;
  } else if (ball.x > W && ball.y > goalTop && ball.y < goalBottom) {
    blueScore++;
    updateScore();
    resetPositions();
    goalPause = 0.8;
  }
}

function drawPitch() {
  ctx.fillStyle = "#208b50";
  ctx.fillRect(0, 0, W, H);

  const stripeWidth = W / 10;
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = "#269657";
      ctx.fillRect(i * stripeWidth, 0, stripeWidth, H);
    }
  }

  ctx.strokeStyle = "#ffffffaa";
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, W - 24, H - 24);

  ctx.beginPath();
  ctx.moveTo(W / 2, 12);
  ctx.lineTo(W / 2, H - 12);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 65, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  const goalTop = H / 2 - 75;
  const goalHeight = 150;

  ctx.fillStyle = "#ffffff30";
  ctx.fillRect(0, goalTop, 25, goalHeight);
  ctx.fillRect(W - 25, goalTop, 25, goalHeight);

  ctx.strokeRect(12, goalTop, 55, goalHeight);
  ctx.strokeRect(W - 67, goalTop, 55, goalHeight);
}

function drawPerson(person, label) {
  ctx.beginPath();
  ctx.ellipse(person.x, person.y + 13, person.r, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#00000035";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(person.x, person.y, person.r, 0, Math.PI * 2);
  ctx.fillStyle = person.color;
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, person.x, person.y + 4);
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  ctx.strokeStyle = "#202733";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#202733";
  ctx.fill();
}

function draw() {
  drawPitch();
  drawPerson(player, "YOU");
  drawPerson(opponent, "CPU");
  drawBall();
}

function gameLoop(now) {
  if (!running) return;

  const dt = Math.min((now - lastTime) / 1000, 0.04);
  lastTime = now;

  timeLeft -= dt;

  if (timeLeft <= 0) {
    finishGame();
    draw();
    return;
  }

  if (goalPause > 0) {
    goalPause -= dt;
  } else {
    movePlayer(dt);
    moveOpponent(dt);

    collidePlayerWithBall(player, true);
    collidePlayerWithBall(opponent, false);

    updateBall(dt);
  }

  updateTimer();
  draw();

  animationId = requestAnimationFrame(gameLoop);
}

startBtn.addEventListener("click", () => {
  if (!started && timeLeft <= 0) {
    restartGame();
    startGame();
  } else {
    startGame();
  }
});

pauseBtn.addEventListener("click", pauseGame);
restartBtn.addEventListener("click", restartGame);

document.addEventListener("keydown", (event) => {
  keys[event.key] = true;

  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "]
      .includes(event.key)
  ) {
    event.preventDefault();
  }

  if (event.code === "Space") {
    shootBall();
  }
});

document.addEventListener("keyup", (event) => {
  keys[event.key] = false;
});

window.addEventListener("blur", () => {
  for (const key in keys) {
    keys[key] = false;
  }
});

updateScore();
updateTimer();
draw();
