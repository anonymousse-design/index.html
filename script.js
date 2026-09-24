const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const keys = {};
const FLOOR_Y = 440;
const GRAVITY = 0.8;
const WORLD_WIDTH = canvas.width;

const normalizeKey = (event) => {
  if (event.key === ' ') return 'space';
  if (event.key === 'ArrowLeft') return 'arrowleft';
  if (event.key === 'ArrowRight') return 'arrowright';
  if (event.key === 'ArrowUp') return 'arrowup';
  if (event.key === 'ArrowDown') return 'arrowdown';
  return event.key.toLowerCase();
};

window.addEventListener('keydown', (event) => {
  const key = normalizeKey(event);
  keys[key] = true;
  event.preventDefault();
});

window.addEventListener('keyup', (event) => {
  const key = normalizeKey(event);
  keys[key] = false;
});

function createFighter({ x, y, color, controls, name, isEnemy = false }) {
  return {
    name,
    x,
    y,
    width: 52,
    height: 88,
    color,
    controls,
    vx: 0,
    vy: 0,
    speed: 4.3,
    jumpPower: 15,
    facing: isEnemy ? -1 : 1,
    grounded: false,
    health: 100,
    attackCooldown: 0,
    attackTimer: 0,
    attackHit: false,
    attackRange: 75,
    attackDamage: 12,
    hitFlash: 0,
    isEnemy,
  };
}

const player = createFighter({
  x: 180,
  y: FLOOR_Y - 88,
  color: '#34d399',
  controls: { left: 'a', right: 'd', jump: 'w', attack: 'f' },
  name: 'Hero',
});

const enemy = createFighter({
  x: 720,
  y: FLOOR_Y - 88,
  color: '#f87171',
  controls: { left: 'arrowleft', right: 'arrowright', jump: 'arrowup', attack: '.' },
  name: 'Villain',
  isEnemy: true,
});

function resetRound() {
  player.x = 180;
  player.y = FLOOR_Y - player.height;
  player.vx = 0;
  player.vy = 0;
  player.health = 100;
  player.attackCooldown = 0;
  player.attackTimer = 0;
  player.attackHit = false;
  player.hitFlash = 0;

  enemy.x = 720;
  enemy.y = FLOOR_Y - enemy.height;
  enemy.vx = 0;
  enemy.vy = 0;
  enemy.health = 100;
  enemy.attackCooldown = 0;
  enemy.attackTimer = 0;
  enemy.attackHit = false;
  enemy.hitFlash = 0;
}

function keyPressed(controlKey) {
  return !!keys[controlKey];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function handleMovement(fighter) {
  const left = keyPressed(fighter.controls.left);
  const right = keyPressed(fighter.controls.right);
  const jump = keyPressed(fighter.controls.jump);
  const attack = keyPressed(fighter.controls.attack);

  if (left && !right) {
    fighter.vx = -fighter.speed;
    fighter.facing = -1;
  } else if (right && !left) {
    fighter.vx = fighter.speed;
    fighter.facing = 1;
  } else {
    fighter.vx *= 0.72;
    if (Math.abs(fighter.vx) < 0.05) fighter.vx = 0;
  }

  if (jump && fighter.grounded) {
    fighter.vy = -fighter.jumpPower;
    fighter.grounded = false;
  }

  if (attack && fighter.attackCooldown <= 0) {
    fighter.attackTimer = 10;
    fighter.attackCooldown = 30;
    fighter.attackHit = false;
  }

  fighter.attackCooldown = Math.max(0, fighter.attackCooldown - 1);
  if (fighter.attackTimer > 0) {
    fighter.attackTimer -= 1;
  }
}

function resolveAttack(attacker, defender) {
  if (attacker.attackTimer <= 0 || attacker.attackHit) return;

  const dx = defender.x - attacker.x;
  const distance = Math.abs(dx);
  const reach = attacker.attackRange + defender.width * 0.45;

  if (distance < reach && Math.abs(attacker.y - defender.y) < 90) {
    const hitDirection = attacker.x < defender.x ? 1 : -1;
    defender.health = clamp(defender.health - attacker.attackDamage, 0, 100);
    defender.vx += hitDirection * 8;
    defender.vy = -6;
    defender.hitFlash = 8;
    attacker.attackHit = true;
  }
}

let winnerText = '';

function update() {
  handleMovement(player);
  handleMovement(enemy);

  const fighters = [player, enemy];

  for (const fighter of fighters) {
    fighter.vy += GRAVITY;
    fighter.x += fighter.vx;
    fighter.y += fighter.vy;

    if (fighter.y + fighter.height >= FLOOR_Y) {
      fighter.y = FLOOR_Y - fighter.height;
      fighter.vy = 0;
      fighter.grounded = true;
    } else {
      fighter.grounded = false;
    }

    fighter.x = clamp(fighter.x, 0, WORLD_WIDTH - fighter.width);
    fighter.hitFlash = Math.max(0, fighter.hitFlash - 1);
  }

  resolveAttack(player, enemy);
  resolveAttack(enemy, player);

  if (player.health <= 0 || enemy.health <= 0) {
    winnerText = player.health > enemy.health ? 'Hero wins!' : 'Villain wins!';
    if (keyPressed('r')) {
      resetRound();
      winnerText = '';
    }
  } else {
    winnerText = '';
  }

  draw();
  requestAnimationFrame(update);
}

function drawHealthBar(fighter, x, y, width, color) {
  ctx.fillStyle = 'rgba(15,23,42,0.7)';
  ctx.fillRect(x, y, width, 16);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * (fighter.health / 100), 16);
  ctx.strokeStyle = '#f8fafc';
  ctx.strokeRect(x, y, width, 16);
}

function drawFighter(fighter) {
  const x = fighter.x;
  const y = fighter.y;

  ctx.save();
  ctx.translate(x + fighter.width / 2, y + fighter.height / 2);

  if (fighter.hitFlash > 0) {
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 18;
  }

  ctx.fillStyle = fighter.color;
  ctx.fillRect(-fighter.width / 2, -fighter.height / 2, fighter.width, fighter.height);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-18, -28, 36, 12);

  const eyeOffset = fighter.facing === 1 ? 8 : -8;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(eyeOffset - 6, -22, 5, 5);
  ctx.fillRect(eyeOffset + 5, -22, 5, 5);

  if (fighter.attackTimer > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    const attackX = fighter.facing === 1 ? 30 : -30;
    const attackWidth = 28;
    ctx.fillRect(
      fighter.facing === 1 ? 22 : -22 - attackWidth,
      -18,
      attackWidth,
      28
    );
  }

  ctx.restore();
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#9bd4ff';
  ctx.fillRect(0, 0, canvas.width, 260);

  ctx.fillStyle = '#7fc26c';
  ctx.fillRect(0, 260, canvas.width, 280);

  ctx.fillStyle = '#5d8b3f';
  ctx.fillRect(0, FLOOR_Y, canvas.width, canvas.height - FLOOR_Y);

  ctx.fillStyle = '#d97706';
  ctx.fillRect(120, FLOOR_Y - 100, 180, 14);
  ctx.fillRect(650, FLOOR_Y - 100, 180, 14);
}

function draw() {
  drawBackground();

  drawHealthBar(player, 80, 26, 260, '#34d399');
  drawHealthBar(enemy, 620, 26, 260, '#f87171');

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('Hero', 80, 22);
  ctx.fillText('Villain', 620, 22);

  drawFighter(player);
  drawFighter(enemy);

  if (winnerText) {
    ctx.fillStyle = 'rgba(15,23,42,0.75)';
    ctx.fillRect(280, 200, 400, 120);
    ctx.strokeStyle = '#f8fafc';
    ctx.strokeRect(280, 200, 400, 120);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(winnerText, canvas.width / 2, 270);

    ctx.font = '20px Arial';
    ctx.fillText('Press R to restart', canvas.width / 2, 300);
    ctx.textAlign = 'left';
  }
}

resetRound();
requestAnimationFrame(update);
