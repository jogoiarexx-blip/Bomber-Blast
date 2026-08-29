window.BB = window.BB || {};

Object.assign(BB, {
  serial: 1,
  game: null,
  difficulty: 'normal',
  particles: [],
  texts: [],
  shake: 0,
  flash: 0
});

BB.makePlayer = function () {
  return {
    x: 1,
    y: 1,
    rx: 1,
    ry: 1,
    facing: 'down',
    frame: 0,
    action: 'idle',
    actionTimer: 0,
    actionDuration: 0,
    actionFrame: 0
  };
};

BB.setPlayerAction = function (action, duration = 0) {
  const p = BB.game?.player;
  if (!p) return;
  p.action = action;
  p.actionTimer = duration;
  p.actionDuration = duration;
  p.actionFrame = 0;
};

BB.clearPlayerAction = function () {
  const p = BB.game?.player;
  if (!p) return;
  p.action = 'idle';
  p.actionTimer = 0;
  p.actionDuration = 0;
  p.actionFrame = 0;
};

BB.isPlayerBusy = function () {
  const g = BB.game;
  if (!g?.player) return false;
  return g.pendingRespawn > 0 || g.pendingGameOver > 0 || ['place', 'hurt', 'dead'].includes(g.player.action);
};

BB.resetPlayerToStart = function () {
  const g = BB.game;
  if (!g) return;
  g.player = BB.makePlayer();
};

BB.makeGame = function (level = 1, carry = {}) {
  const grid = BB.makeGrid(level);
  const cfg = BB.CONFIG[BB.difficulty];
  const base = {
    lives: carry.lives ?? cfg.lives,
    score: carry.score ?? 0,
    range: carry.range ?? Math.min(6, 2 + Math.floor((level - 1) / 4)),
    maxBombs: carry.maxBombs ?? Math.min(4, 1 + Math.floor((level - 1) / 6)),
    speedLevel: carry.speedLevel ?? Math.min(5, 1 + Math.floor((level - 1) / 5)),
    shield: carry.shield ?? 0,
    nova: carry.nova ?? 0,
    remote: carry.remote ?? false,
    pierce: carry.pierce ?? 0,
    fast: carry.fast ?? 0,
    giant: carry.giant ?? 0,
    kick: carry.kick ?? false,
    glove: carry.glove ?? false
  };

  return {
    grid,
    level,
    enemies: BB.spawnEnemies(grid, level, BB.difficulty),
    bombs: [],
    blasts: [],
    powers: [],
    hazards: [],
    exit: null,
    player: BB.makePlayer(),
    ...base,
    time: cfg.time * 1000,
    moveDelay: Math.max(72, 150 - (base.speedLevel - 1) * 12),
    moveTimer: 0,
    inv: 0,
    freeze: 0,
    phase: 0,
    status: 'playing',
    combo: 0,
    comboTimer: 0,
    lastReward: '',
    entry: { ...base },
    bossMax: 0,
    pendingRespawn: 0,
    pendingGameOver: 0
  };
};

BB.walkable = function (x, y, enemyKind = '') {
  const g = BB.game;
  if (!g) return false;
  const cell = g.grid[y]?.[x];
  if (cell == null || cell === 1) return false;
  if (cell === 2 && enemyKind !== 'ghost' && g.phase <= 0) return false;
  if (g.bombs.some(b => b.x === x && b.y === y)) return false;
  if (enemyKind && g.enemies.some(e => e.x === x && e.y === y)) return false;
  return true;
};

BB.addText = (x, y, text, color = '#fff') => BB.texts.push({ x: x * BB.TILE + 25, y: y * BB.TILE + 18, text, color, life: 900 });

BB.burst = function (x, y, color, count = 10, speed = 110) {
  const q = BB.quality === 'low' ? 0 : BB.quality === 'medium' ? 0.45 : 1;
  for (let i = 0; i < Math.round(count * q); i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (0.35 + Math.random() * 0.65) * speed;
    BB.particles.push({
      x: x * BB.TILE + 25,
      y: y * BB.TILE + 25,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 350 + Math.random() * 400,
      max: 750,
      size: 2 + Math.random() * 4,
      color,
      gravity: 15 + Math.random() * 50
    });
  }
};

BB.putBomb = function (owner = 'player', x, y) {
  const g = BB.game;
  if (!g || g.status !== 'playing') return;

  if (owner === 'player') {
    x = g.player.x;
    y = g.player.y;
    const active = g.bombs.filter(b => b.owner === 'player').length;
    if (active >= g.maxBombs || g.bombs.some(b => b.x === x && b.y === y)) return;
  } else if (g.bombs.some(b => b.x === x && b.y === y)) {
    return;
  }

  const remote = owner === 'player' && g.remote;
  const fast = owner === 'player' && g.fast > 0;
  const giant = owner === 'player' && g.giant > 0;
  const pierce = owner === 'player' && g.pierce > 0;

  if (fast) g.fast--;
  if (giant) g.giant--;
  if (pierce) g.pierce--;

  g.bombs.push({
    x,
    y,
    id: BB.serial++,
    owner,
    timer: remote ? 999999 : (fast ? 1150 : 2100),
    range: (owner === 'enemy' ? 2 : g.range) + (giant ? 2 : 0),
    nova: owner === 'player' && g.nova > 0,
    pierce,
    giant,
    remote,
    pulse: 0
  });

  if (owner === 'player') {
    BB.setPlayerAction('place', 220);
  }
  if (owner === 'player' && g.nova > 0) g.nova--;
  BB.Audio.play('bomb_place');
};

BB.remoteDetonate = function () {
  const b = BB.game?.bombs.find(b => b.owner === 'player' && b.remote);
  if (b) {
    b.timer = 0;
    BB.addText(b.x, b.y, 'DETONE!', '#ffcf61');
  }
};

BB.throwBomb = function () {
  const g = BB.game;
  if (!g?.glove) return;
  const [dx, dy] = BB.DIRS[g.player.facing];
  const b = g.bombs.find(b => b.x === g.player.x + dx && b.y === g.player.y + dy);
  if (!b) return;
  let tx = b.x, ty = b.y;
  for (let i = 0; i < 3; i++) {
    const nx = tx + dx;
    const ny = ty + dy;
    if (!BB.walkable(nx, ny)) break;
    tx = nx;
    ty = ny;
  }
  b.x = tx;
  b.y = ty;
  BB.addText(tx, ty, 'ARREMESSO!', '#8cecff');
};

BB.tryKick = function (nx, ny, dx, dy) {
  const g = BB.game;
  const b = g.bombs.find(b => b.x === nx && b.y === ny);
  if (!b || !g.kick) return false;
  const bx = nx + dx;
  const by = ny + dy;
  if (!BB.walkable(bx, by)) return false;
  b.x = bx;
  b.y = by;
  return true;
};

BB.damagePlayer = function () {
  const g = BB.game;
  if (!g || g.inv > 0 || g.status !== 'playing' || g.pendingRespawn > 0 || g.pendingGameOver > 0) return;

  if (g.shield > 0) {
    g.shield--;
    g.inv = 1100;
    BB.addText(g.player.x, g.player.y, 'ESCUDO!', '#62f5ff');
    BB.Audio.play('powerup');
    return;
  }

  g.lives--;
  g.inv = 1800;
  g.combo = 0;
  BB.shake = 12;
  BB.flash = 150;
  BB.Audio.play('hurt');
  navigator.vibrate?.([70, 30, 70]);

  if (g.lives <= 0) {
    g.lives = 0;
    BB.setPlayerAction('dead', 900);
    g.pendingGameOver = 900;
    BB.addText(g.player.x, g.player.y, 'DERROTADO', '#ff5578');
    return;
  }

  BB.setPlayerAction('hurt', 700);
  g.pendingRespawn = 700;
  BB.addText(g.player.x, g.player.y, '-1 VIDA', '#ff5578');
};

BB.blastRay = function (b) {
  const g = BB.game;
  const out = [{ x: b.x, y: b.y, core: true, dx: 0, dy: 0 }];
  const dirs = Object.values(BB.DIRS).slice();
  if (b.nova) dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
  for (const [dx, dy] of dirs) {
    for (let n = 1; n <= b.range; n++) {
      const x = b.x + dx * n;
      const y = b.y + dy * n;
      const cell = g.grid[y]?.[x];
      if (cell == null || cell === 1) break;
      const brick = cell === 2;
      out.push({ x, y, core: false, dx, dy, brick, end: n === b.range || (brick && !b.pierce) });
      if (brick && !b.pierce) break;
    }
  }
  return out;
};

BB.damageEnemy = function (enemy, amount, sourceId) {
  enemy.hitSources = enemy.hitSources || {};
  if (enemy.hitSources[sourceId]) return false;
  enemy.hitSources[sourceId] = 1;
  enemy.hp -= amount;
  enemy.hit = 550;
  BB.Audio.play(enemy.boss ? 'boss_hit' : 'explosion', enemy.boss ? 0.5 : 0.32);
  BB.addText(enemy.x, enemy.y, enemy.hp > 0 ? '-1' : 'KO!', enemy.boss ? '#ffe267' : '#ff8aa0');
  if (enemy.boss) {
    const ratio = enemy.hp / enemy.maxHp;
    enemy.phase = ratio <= 0.34 ? 3 : ratio <= 0.67 ? 2 : 1;
  }
  return enemy.hp <= 0;
};

BB.explodeDue = function () {
  const g = BB.game;
  const queue = g.bombs.filter(b => b.timer <= 0).map(b => b.id);
  if (!queue.length) return;

  const exploded = new Set();
  const all = [];
  const destroyed = new Set();

  while (queue.length) {
    const id = queue.shift();
    if (exploded.has(id)) continue;
    const b = g.bombs.find(x => x.id === id);
    if (!b) continue;
    exploded.add(id);
    const tiles = BB.blastRay(b);
    all.push({ id, b, tiles });
    for (const t of tiles) {
      for (const other of g.bombs) {
        if (!exploded.has(other.id) && BB.same(t, other)) queue.push(other.id);
      }
    }
  }

  g.bombs = g.bombs.filter(b => !exploded.has(b.id));

  let kills = 0;
  for (const pack of all) {
    const hostile = pack.b.owner === 'enemy';
    const fire = new Set(pack.tiles.map(BB.key));

    for (const t of pack.tiles) {
      if (t.brick && !destroyed.has(BB.key(t))) {
        destroyed.add(BB.key(t));
        g.grid[t.y][t.x] = 0;
        g.score += 10;
        BB.dropPower(t.x, t.y);
      }
    }

    if (!hostile) {
      g.enemies = g.enemies.filter(e => {
        if (!fire.has(BB.key(e))) return true;
        const dead = BB.damageEnemy(e, 1, pack.id);
        if (dead) {
          kills++;
          BB.burst(e.x, e.y, e.boss ? '#ffc849' : '#ff5277', e.boss ? 22 : 12, 150);
        }
        return !dead;
      });
    }

    if (fire.has(BB.key(g.player))) BB.damagePlayer();

    g.blasts.push(...pack.tiles.map(t => ({ ...t, ttl: 650, max: 650, hostile, sourceId: pack.id })));
  }

  if (kills) {
    g.combo++;
    g.comboTimer = 1800;
    g.score += kills * 150 * g.combo;
    BB.addText(g.player.x, g.player.y, g.combo > 1 ? `COMBO x${g.combo}` : `+${kills * 150}`, '#fff06a');
  }

  BB.shake = Math.min(18, BB.shake + exploded.size * 4);
  BB.flash = 80;
  BB.Audio.play('explosion');
  navigator.vibrate?.(45);
};

BB.POWER_KINDS = ['range', 'bomb', 'speed', 'life', 'kick', 'glove', 'remote', 'pierce', 'fast', 'giant', 'shield', 'chrono', 'nova', 'phase'];

BB.dropPower = function (x, y) {
  if (Math.random() > 0.34) return;
  const g = BB.game;
  let pool = ['range', 'bomb', 'speed', 'shield', 'chrono', 'nova'];
  if (g.level >= 3) pool.push('kick', 'fast');
  if (g.level >= 6) pool.push('glove', 'pierce');
  if (g.level >= 10) pool.push('remote', 'giant');
  if (g.level >= 14) pool.push('phase', 'life');
  const kind = pool[Math.floor(Math.random() * pool.length)];
  g.powers.push({ x, y, id: BB.serial++, kind, phase: Math.random() * 6 });
};

BB.collectPower = function () {
  const g = BB.game;
  const p = g.powers.find(p => BB.same(p, g.player));
  if (!p) return;
  g.powers = g.powers.filter(x => x.id !== p.id);
  g.score += 100;
  const labels = {
    range: 'ALCANCE +1',
    bomb: 'BOMBA +1',
    speed: 'VELOCIDADE +1',
    life: 'VIDA +1',
    kick: 'CHUTE',
    glove: 'ARREMESSO',
    remote: 'CONTROLE REMOTO',
    pierce: 'PERFURANTE x3',
    fast: 'BOMBA RÁPIDA x3',
    giant: 'BOMBA GIGANTE x2',
    shield: 'ESCUDO',
    chrono: 'TEMPO +20s',
    nova: 'NOVA x2',
    phase: 'FANTASMA 10s'
  };

  if (p.kind === 'range') g.range = BB.clamp(g.range + 1, 2, 9);
  if (p.kind === 'bomb') g.maxBombs = BB.clamp(g.maxBombs + 1, 1, 7);
  if (p.kind === 'speed') {
    g.speedLevel = BB.clamp(g.speedLevel + 1, 1, 7);
    g.moveDelay = Math.max(72, 150 - (g.speedLevel - 1) * 12);
  }
  if (p.kind === 'life') g.lives = BB.clamp(g.lives + 1, 1, 7);
  if (p.kind === 'kick') g.kick = true;
  if (p.kind === 'glove') g.glove = true;
  if (p.kind === 'remote') g.remote = true;
  if (p.kind === 'pierce') g.pierce += 3;
  if (p.kind === 'fast') g.fast += 3;
  if (p.kind === 'giant') g.giant += 2;
  if (p.kind === 'shield') g.shield = BB.clamp(g.shield + 1, 0, 3);
  if (p.kind === 'chrono') {
    g.time += 20000;
    g.freeze = Math.max(g.freeze, 4000);
  }
  if (p.kind === 'nova') g.nova += 2;
  if (p.kind === 'phase') g.phase = Math.max(g.phase, 10000);

  BB.addText(p.x, p.y, labels[p.kind] || p.kind, '#52f4c9');
  BB.Audio.play('powerup');
};

BB.spawnExit = function () {
  const g = BB.game;
  if (g.exit || g.enemies.length) return;
  const spots = [];
  for (let y = 1; y < BB.ROWS - 1; y++) {
    for (let x = 1; x < BB.COLS - 1; x++) {
      if (g.grid[y][x] === 0 && !g.bombs.some(b => b.x === x && b.y === y)) spots.push({ x, y });
    }
  }
  spots.sort((a, b) => b.x + b.y - a.x - a.y);
  g.exit = { ...(spots[0] || { x: BB.COLS - 2, y: BB.ROWS - 2 }), phase: 0 };
  BB.Audio.play('portal');
};

BB.enemyMove = function (e) {
  const g = BB.game;
  const opts = Object.entries(BB.DIRS)
    .map(([name, [dx, dy]]) => ({ name, x: e.x + dx, y: e.y + dy, dx, dy }))
    .filter(p => BB.walkable(p.x, p.y, e.kind));

  if (!opts.length) return;

  if (e.kind === 'slime' && Math.random() < 0.35) {
    const p = opts[Math.floor(Math.random() * opts.length)];
    const jx = e.x + p.dx * 2;
    const jy = e.y + p.dy * 2;
    if (BB.walkable(jx, jy, e.kind)) {
      e.x = jx;
      e.y = jy;
      return;
    }
  }

  if (['hunter', 'boss', 'bomber'].includes(e.kind)) {
    opts.sort((a, b) => (Math.abs(a.x - g.player.x) + Math.abs(a.y - g.player.y)) - (Math.abs(b.x - g.player.x) + Math.abs(b.y - g.player.y)));
  }

  const p = ['hunter', 'boss', 'bomber'].includes(e.kind) ? opts[0] : opts[Math.floor(Math.random() * opts.length)];
  e.x = p.x;
  e.y = p.y;
  e.facing = p.name;
};

BB.rayAttack = function (e, dx, dy, len, tiles) {
  for (let n = 1; n <= len; n++) {
    const x = e.x + dx * n;
    const y = e.y + dy * n;
    const cell = BB.game.grid[y]?.[x];
    if (cell == null || cell === 1 || cell === 2) break;
    if (!tiles.some(t => t.x === x && t.y === y)) tiles.push({ x, y });
  }
};

BB.bossAttack = function (e) {
  const w = BB.worldIndex(BB.game.level);
  const tiles = [];
  if (w === 0) Object.values(BB.DIRS).forEach(([dx, dy]) => BB.rayAttack(e, dx, dy, 1 + e.phase, tiles));
  if (w === 1) [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dx, dy]) => BB.rayAttack(e, dx, dy, 1 + e.phase, tiles));
  if (w === 2) {
    const dx = Math.sign(BB.game.player.x - e.x) || 1;
    const dy = Math.sign(BB.game.player.y - e.y) || 1;
    BB.rayAttack(e, dx, 0, 3 + e.phase, tiles);
    BB.rayAttack(e, 0, dy, 3 + e.phase, tiles);
  }
  if (w === 3) [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dx, dy]) => BB.rayAttack(e, dx, dy, 1 + e.phase, tiles));
  BB.game.hazards.push(...tiles.map(t => ({ ...t, ttl: 760, max: 760 })));
  BB.addText(e.x, e.y, `CHEFE FASE ${e.phase}!`, '#ff5dd7');
};

BB.updateEffects = function (dt) {
  BB.shake = Math.max(0, BB.shake - dt * 0.045);
  BB.flash = Math.max(0, BB.flash - dt);
  BB.particles.forEach(p => {
    p.life -= dt;
    p.x += p.vx * dt / 1000;
    p.y += p.vy * dt / 1000;
    p.vy += p.gravity * dt / 1000;
  });
  BB.particles = BB.particles.filter(p => p.life > 0);
  BB.texts.forEach(t => {
    t.life -= dt;
    t.y -= dt * 0.025;
  });
  BB.texts = BB.texts.filter(t => t.life > 0);
};

BB.update = function (dt) {
  BB.updateEffects(dt);
  const g = BB.game;
  if (!g || g.status !== 'playing') return;

  g.time = Math.max(0, g.time - dt);
  g.moveTimer = Math.max(0, g.moveTimer - dt);
  g.inv = Math.max(0, g.inv - dt);
  g.freeze = Math.max(0, g.freeze - dt);
  g.phase = Math.max(0, g.phase - dt);
  g.comboTimer = Math.max(0, g.comboTimer - dt);
  if (!g.comboTimer) g.combo = 0;

  if (g.pendingRespawn > 0) {
    g.pendingRespawn = Math.max(0, g.pendingRespawn - dt);
    if (g.pendingRespawn <= 0) {
      BB.resetPlayerToStart();
    }
  }

  if (g.pendingGameOver > 0) {
    g.pendingGameOver = Math.max(0, g.pendingGameOver - dt);
    if (g.pendingGameOver <= 0) {
      BB.finish('gameover');
      return;
    }
  }

  g.player.rx = BB.lerp(g.player.rx, g.player.x, Math.min(1, dt * 0.018));
  g.player.ry = BB.lerp(g.player.ry, g.player.y, Math.min(1, dt * 0.018));
  g.player.frame += dt * 0.014;

  if (g.player.actionTimer > 0) {
    g.player.actionTimer = Math.max(0, g.player.actionTimer - dt);
    if (g.player.actionDuration > 0) {
      const elapsed = g.player.actionDuration - g.player.actionTimer;
      g.player.actionFrame = elapsed;
    }
    if (g.player.actionTimer <= 0 && ['place', 'hurt'].includes(g.player.action) && g.pendingRespawn <= 0) {
      BB.clearPlayerAction();
    }
  }

  g.bombs.forEach(b => {
    b.timer -= dt;
    b.pulse += dt * 0.014;
  });

  g.blasts.forEach(b => b.ttl -= dt);
  g.blasts = g.blasts.filter(b => b.ttl > 0);

  const trig = g.hazards.filter(h => {
    h.ttl -= dt;
    return h.ttl <= 0;
  });
  g.hazards = g.hazards.filter(h => h.ttl > 0);
  for (const h of trig) {
    g.blasts.push({ ...h, ttl: 520, max: 520, hostile: true, core: true });
    if (BB.same(h, g.player)) BB.damagePlayer();
  }

  g.powers.forEach(p => p.phase += dt * 0.005);
  if (g.exit) g.exit.phase += dt * 0.006;

  g.enemies.forEach(e => {
    e.rx = BB.lerp(e.rx, e.x, Math.min(1, dt * 0.014));
    e.ry = BB.lerp(e.ry, e.y, Math.min(1, dt * 0.014));
    e.frame += dt * 0.01;
    e.hit = Math.max(0, e.hit - dt);
  });

  if (g.time <= 0 && g.pendingGameOver <= 0) {
    g.time = 0;
    g.lives = 0;
    BB.setPlayerAction('dead', 900);
    g.pendingGameOver = 900;
    BB.addText(g.player.x, g.player.y, 'TEMPO ESGOTADO', '#ffcf61');
  }

  BB.explodeDue();

  const direction = BB.Input.dir();
  if (direction && g.moveTimer <= 0 && !BB.isPlayerBusy()) {
    const [dx, dy] = BB.DIRS[direction];
    const nx = g.player.x + dx;
    const ny = g.player.y + dy;
    g.player.facing = direction;
    if (!BB.walkable(nx, ny) && BB.tryKick(nx, ny, dx, dy)) {
      // kick handled
    }
    if (BB.walkable(nx, ny)) {
      g.player.x = nx;
      g.player.y = ny;
      g.moveTimer = g.moveDelay;
      BB.collectPower();
      if (g.exit && BB.same(g.player, g.exit)) {
        g.score += Math.ceil(g.time / 1000) * 5;
        BB.grantReward();
        BB.finish(g.level >= BB.MAX_LEVEL ? 'completed' : 'won');
        return;
      }
    }
  }

  if (g.freeze <= 0) {
    for (const e of g.enemies) {
      e.timer -= dt;
      e.special -= dt;
      if (e.boss && e.special <= 0) {
        BB.bossAttack(e);
        e.special = Math.max(900, 2600 - e.phase * 350 - BB.worldIndex(g.level) * 180);
      }
      if (e.kind === 'bomber' && e.special <= 0) {
        BB.putBomb('enemy', e.x, e.y);
        e.special = 2600;
      }
      if (e.timer <= 0) {
        BB.enemyMove(e);
        const mult = e.kind === 'tank' ? 1.3 : e.kind === 'hunter' ? 0.8 : e.kind === 'ghost' ? 0.9 : e.boss ? 0.72 : 1;
        e.timer = Math.max(150, (BB.CONFIG[BB.difficulty].delay - g.level * 8) * mult * 1.15);
      }
    }
  }

  for (const e of [...g.enemies]) {
    for (const b of g.blasts) {
      if (!b.hostile && BB.same(e, b)) {
        const dead = BB.damageEnemy(e, 1, b.sourceId || ('blast-' + b.x + '-' + b.y));
        if (dead) {
          g.enemies = g.enemies.filter(x => x !== e);
          g.score += 150;
          break;
        }
      }
    }
  }

  if (g.blasts.some(b => BB.same(b, g.player)) || g.enemies.some(e => BB.same(e, g.player))) {
    BB.damagePlayer();
  }

  BB.spawnExit();
  BB.UI.sync();
};

BB.grantReward = function () {
  const g = BB.game;
  g.time += 5000;
  let reward = '+5 SEGUNDOS';
  if (g.level % 5 === 0) {
    g.lives = BB.clamp(g.lives + 1, 1, 7);
    g.speedLevel = BB.clamp(g.speedLevel + 1, 1, 7);
    g.moveDelay = Math.max(72, 150 - (g.speedLevel - 1) * 12);
    reward = 'CHEFE: +1 VIDA E VELOCIDADE';
  } else if (g.level % 4 === 0) {
    g.maxBombs = BB.clamp(g.maxBombs + 1, 1, 7);
    reward = 'NÚCLEO: +1 BOMBA';
  } else if (g.level % 3 === 0) {
    g.range = BB.clamp(g.range + 1, 2, 9);
    reward = 'NÚCLEO: +1 ALCANCE';
  }
  g.lastReward = reward;
};

BB.restartLevel = function () {
  const g = BB.game;
  if (!g || g.status !== 'playing') return;
  if (g.lives <= 1) {
    BB.finish('gameover');
    return;
  }
  const carry = { ...g.entry, lives: g.lives - 1, score: g.entry.score };
  BB.beginLevel(BB.makeGame(g.level, carry));
  BB.addText(1, 1, 'REINÍCIO: -1 VIDA', '#ffcf61');
};
