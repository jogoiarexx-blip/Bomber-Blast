window.BB = window.BB || {};

BB.Render = {
  canvas: null,
  ctx: null,
  images: {},
  playerFrames: {
    walk: { down: [], up: [], left: [], right: [] },
    place: { down: [], up: [], left: [], right: [] },
    hurt: []
  },

  init() {
    this.canvas = document.querySelector('#board');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    [
      'player',
      'bug',
      'slime',
      'hunter',
      'tank',
      'ghost',
      'bomber',
      'boss1',
      'boss2',
      'boss3',
      'boss4',
      'bomb',
      'brick',
      'wall'
    ].forEach(name => {
      const img = new Image();
      img.src = `assets/sprites/${name}.png`;
      this.images[name] = img;
    });

    ['down', 'up', 'left', 'right'].forEach(dir => {
      this.playerFrames.walk[dir] = [];
      this.playerFrames.place[dir] = [];
      for (let i = 0; i < 4; i++) {
        const img = new Image();
        img.src = `assets/sprites/player/${dir}_${i}.png`;
        this.playerFrames.walk[dir].push(img);
      }
      for (let i = 0; i < 3; i++) {
        const img = new Image();
        img.src = `assets/sprites/player/place_${dir}_${i}.png`;
        this.playerFrames.place[dir].push(img);
      }
    });

    for (let i = 0; i < 5; i++) {
      const img = new Image();
      img.src = `assets/sprites/player/hurt_${i}.png`;
      this.playerFrames.hurt.push(img);
    }
  },

  rr(x, y, w, h, r) {
    const c = this.ctx;
    c.beginPath();
    c.roundRect(x, y, w, h, r);
  },

  floor(x, y, p) {
    const c = this.ctx;
    const px = x * BB.TILE;
    const py = y * BB.TILE;
    const g = c.createLinearGradient(px, py, px + 50, py + 50);
    g.addColorStop(0, p.floor[0]);
    g.addColorStop(1, p.floor[1]);
    c.fillStyle = g;
    c.fillRect(px, py, 50, 50);
    c.fillStyle = '#ffffff0b';
    c.fillRect(px + 7, py + 7, 2, 2);
    c.fillRect(px + 35, py + 30, 2, 2);
  },

  tileSprite(name, x, y, fallback) {
    const img = this.images[name];
    if (img?.complete && img.naturalWidth) this.ctx.drawImage(img, x * 50, y * 50, 50, 50);
    else fallback();
  },

  wall(x, y, p) {
    this.tileSprite('wall', x, y, () => {
      const c = this.ctx;
      c.fillStyle = p.wall[0];
      c.fillRect(x * 50 + 2, y * 50 + 2, 46, 46);
    });
  },

  brick(x, y, p) {
    this.tileSprite('brick', x, y, () => {
      const c = this.ctx;
      c.fillStyle = p.brick[0];
      c.fillRect(x * 50 + 2, y * 50 + 3, 46, 44);
    });
  },

  portal(e, p) {
    const c = this.ctx;
    const cx = e.x * 50 + 25;
    const cy = e.y * 50 + 25;
    c.save();
    c.translate(cx, cy);
    for (let i = 0; i < 4; i++) {
      c.rotate(e.phase * 0.03 + i * 1.57);
      c.strokeStyle = i % 2 ? p.glow : '#fff';
      c.globalAlpha = 0.45 + i * 0.1;
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(0, 0, 20 - i * 3, 13 + i * 2, 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
    c.fillStyle = p.glow;
    c.beginPath();
    c.arc(0, 0, 8, 0, Math.PI * 2);
    c.fill();
    c.restore();
  },

  power(p) {
    const c = this.ctx;
    const sym = {
      range: '🔥', bomb: '💣', speed: '⚡', life: '♥', kick: '👟', glove: '🧤',
      remote: 'R', pierce: '↠', fast: '»', giant: '●', shield: '◉', chrono: '⧖', nova: '✦', phase: '◇'
    }[p.kind] || '?';
    c.save();
    c.translate(p.x * 50 + 25, p.y * 50 + 25 + Math.sin(p.phase) * 3);
    c.fillStyle = '#091427';
    this.rr(-16, -16, 32, 32, 8);
    c.fill();
    c.strokeStyle = '#52f4c9';
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = '#fff';
    c.font = 'bold 15px monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(sym, 0, 1);
    c.restore();
  },

  bomb(b) {
    const c = this.ctx;
    const img = this.images.bomb;
    const cx = b.x * 50 + 25;
    const cy = b.y * 50 + 25;
    const s = 1 + Math.sin(b.pulse) * 0.05;
    c.save();
    c.translate(cx, cy);
    c.scale(s, s);
    if (img?.complete && img.naturalWidth) c.drawImage(img, -23, -23, 46, 46);
    else {
      c.fillStyle = '#02060c';
      c.beginPath();
      c.arc(0, 0, 18, 0, Math.PI * 2);
      c.fill();
    }
    if (b.remote) {
      c.fillStyle = '#52f4c9';
      c.font = 'bold 10px monospace';
      c.textAlign = 'center';
      c.fillText('R', 0, 4);
    }
    if (b.giant) {
      c.strokeStyle = '#ffcf61';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 0, 22, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
  },

  blast(b) {
    const c = this.ctx;
    const cx = b.x * 50 + 25;
    const cy = b.y * 50 + 25;
    const color = b.hostile ? '#9a35ff' : '#ff7b24';
    const pulse = 0.85 + Math.sin(b.ttl * 0.04) * 0.14;
    c.save();
    c.translate(cx, cy);
    c.globalAlpha = Math.min(1, b.ttl / b.max * 2.4);
    c.shadowBlur = BB.quality === 'high' ? 16 : 0;
    c.shadowColor = color;
    const g = c.createRadialGradient(0, 0, 2, 0, 0, 27 * pulse);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.25, b.hostile ? '#e9a1ff' : '#fff772');
    g.addColorStop(0.6, color);
    g.addColorStop(1, `${color}00`);
    c.fillStyle = g;
    if (b.core) {
      c.beginPath();
      c.arc(0, 0, 28 * pulse, 0, Math.PI * 2);
      c.fill();
    } else {
      c.rotate(b.dx ? 0 : Math.PI / 2);
      this.rr(-28, -15, 56, 30, 14);
      c.fill();
    }
    c.restore();
  },

  hazard(h) {
    const c = this.ctx;
    c.save();
    c.globalAlpha = 0.6 + 0.25 * Math.sin(h.ttl * 0.02);
    c.fillStyle = '#ff335f';
    c.strokeStyle = '#fff36b';
    c.lineWidth = 3;
    this.rr(h.x * 50 + 5, h.y * 50 + 5, 40, 40, 8);
    c.fill();
    c.stroke();
    c.restore();
  },

  spriteEntity(name, e, size = 46) {
    const c = this.ctx;
    const img = this.images[name];
    const cx = e.rx * 50 + 25;
    const cy = e.ry * 50 + 27;
    c.save();
    c.translate(cx, cy);
    if (e.hit > 0) c.globalAlpha = 0.5;
    if (img?.complete && img.naturalWidth) c.drawImage(img, -size / 2, -size / 2, size, size);
    else {
      c.fillStyle = '#ef3c68';
      c.beginPath();
      c.arc(0, 0, size / 3, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  },

  enemy(e) {
    this.spriteEntity(e.boss ? `boss${BB.worldIndex(BB.game.level) + 1}` : e.kind, e, e.boss ? 54 : 44);
  },

  getProgressIndex(timer, duration, count) {
    if (count <= 1) return 0;
    if (!duration) return 0;
    const progress = BB.clamp((duration - timer) / duration, 0, 0.9999);
    return Math.min(count - 1, Math.floor(progress * count));
  },

  getPlayerFrame(player) {
    const dir = ['down', 'up', 'left', 'right'].includes(player.facing) ? player.facing : 'down';

    if (player.action === 'place') {
      const frames = this.playerFrames.place[dir];
      const idx = this.getProgressIndex(player.actionTimer, player.actionDuration, frames.length);
      return frames[idx] || this.playerFrames.walk[dir][0] || null;
    }

    if (player.action === 'hurt' || player.action === 'dead') {
      const frames = this.playerFrames.hurt;
      const idx = this.getProgressIndex(player.actionTimer, player.actionDuration, frames.length);
      return frames[idx] || null;
    }

    const walking = Math.abs(player.rx - player.x) + Math.abs(player.ry - player.y) > 0.02;
    const frameIndex = walking ? Math.floor(player.frame * 0.55) % 4 : 0;
    return this.playerFrames.walk[dir]?.[frameIndex] || null;
  },

  player(p) {
    const c = this.ctx;
    const img = this.getPlayerFrame(p);
    const cx = p.rx * 50 + 25;
    const cy = p.ry * 50 + 27;

    c.save();
    if (BB.game.inv > 0 && Math.floor(BB.game.inv / 90) % 2 === 0 && p.action !== 'dead') c.globalAlpha = 0.3;

    if (img?.complete && img.naturalWidth) c.drawImage(img, cx - 25, cy - 27, 50, 50);
    else this.spriteEntity('player', p, 46);

    c.restore();

    if (BB.game.shield > 0 && p.action !== 'dead') {
      c.strokeStyle = '#62f5ff';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(p.rx * 50 + 25, p.ry * 50 + 25, 24, 0, Math.PI * 2);
      c.stroke();
    }
  },

  preview() {
    const g = BB.game;
    if (!g || g.bombs.some(b => BB.same(b, g.player)) || BB.isPlayerBusy()) return;
    const c = this.ctx;
    c.save();
    c.globalAlpha = 0.16;
    c.fillStyle = '#ffcf61';
    c.fillRect(g.player.x * 50 + 7, g.player.y * 50 + 7, 36, 36);
    for (const [dx, dy] of Object.values(BB.DIRS)) {
      for (let n = 1; n <= g.range; n++) {
        const x = g.player.x + dx * n;
        const y = g.player.y + dy * n;
        const cell = g.grid[y]?.[x];
        if (cell == null || cell === 1) break;
        c.fillRect(x * 50 + 18, y * 50 + 18, 14, 14);
        if (cell === 2) break;
      }
    }
    c.restore();
  },

  bossBar() {
    const g = BB.game;
    const b = g.enemies.find(e => e.boss);
    if (!b) return;
    const c = this.ctx;
    const w = 300;
    const x = (this.canvas.width - w) / 2;
    const y = 10;
    c.fillStyle = '#07101dcc';
    this.rr(x - 8, y - 7, w + 16, 31, 8);
    c.fill();
    c.fillStyle = '#3c1830';
    c.fillRect(x, y, w, 10);
    c.fillStyle = '#ffca4a';
    c.fillRect(x, y, w * (b.hp / b.maxHp), 10);
    c.fillStyle = '#fff';
    c.font = 'bold 10px monospace';
    c.textAlign = 'center';
    c.fillText(`${BB.BOSS_NAMES[BB.worldIndex(g.level)]} · FASE ${b.phase}`, this.canvas.width / 2, y + 23);
  },

  draw() {
    const g = BB.game;
    if (!g || document.querySelector('#game').hidden) return;
    const c = this.ctx;
    const p = BB.PALETTES[BB.worldIndex(g.level)];

    c.save();
    const sx = BB.shake ? (Math.random() - 0.5) * BB.shake : 0;
    const sy = BB.shake ? (Math.random() - 0.5) * BB.shake : 0;
    c.translate(sx, sy);
    c.clearRect(-20, -20, this.canvas.width + 40, this.canvas.height + 40);

    for (let y = 0; y < BB.ROWS; y++) {
      for (let x = 0; x < BB.COLS; x++) {
        const cell = g.grid[y][x];
        if (cell === 0) this.floor(x, y, p);
        else if (cell === 1) this.wall(x, y, p);
        else this.brick(x, y, p);
      }
    }

    this.preview();
    if (g.exit) this.portal(g.exit, p);
    g.powers.forEach(x => this.power(x));
    g.bombs.forEach(x => this.bomb(x));
    g.hazards.forEach(x => this.hazard(x));
    g.blasts.forEach(x => this.blast(x));
    g.enemies.forEach(x => this.enemy(x));
    this.player(g.player);

    BB.particles.forEach(q => {
      c.globalAlpha = BB.clamp(q.life / q.max, 0, 1);
      c.fillStyle = q.color;
      c.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    });

    c.globalAlpha = 1;
    BB.texts.forEach(t => {
      c.globalAlpha = BB.clamp(t.life / 300, 0, 1);
      c.font = 'bold 11px monospace';
      c.textAlign = 'center';
      c.strokeStyle = '#07101d';
      c.lineWidth = 4;
      c.strokeText(t.text, t.x, t.y);
      c.fillStyle = t.color;
      c.fillText(t.text, t.x, t.y);
    });

    c.globalAlpha = 1;
    this.bossBar();
    c.restore();

    if (BB.flash > 0) {
      c.fillStyle = `rgba(255,220,140,${Math.min(0.22, BB.flash / 500)})`;
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
};
