import { WIDTH, HEIGHT, WATER, SPECIES, seededRandom, clamp } from './ecosystem.js';

const PALETTE = {
  ink: '#142f2c', dark: '#163e32', forest: '#255441', leaf: '#3c6a47', moss: '#698654',
  lime: '#a0a76b', bark: '#65704c', cream: '#e5d5a0', sun: '#ecdfa8',
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.backdrop = document.createElement('canvas');
    this.backdrop.width = WIDTH;
    this.backdrop.height = HEIGHT;
    this.random = seededRandom(816);
    this.specks = Array.from({ length: 40 }, () => ({ x: this.random() * WIDTH, y: 90 + this.random() * 175, offset: this.random() * 10 }));
    this.leaves = Array.from({ length: 11 }, () => ({ x: this.random() * WIDTH, y: WATER.top + this.random() * 120, offset: this.random() * 20 }));
    this.makeBackground();
  }

  rect(x, y, w, h, color, ctx = this.ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  poly(points, color, ctx = this.ctx) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y)));
    ctx.closePath();
    ctx.fill();
  }

  line(x1, y1, x2, y2, color, width = 1, ctx = this.ctx) {
    // Bresenham lines keep the rod, vines and float line on the pixel grid.
    x1 = Math.round(x1); y1 = Math.round(y1); x2 = Math.round(x2); y2 = Math.round(y2);
    const dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
    const dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
    let err = dx + dy;
    for (let i = 0; i < 1500; i++) {
      this.rect(x1, y1, width, width, color, ctx);
      if (x1 === x2 && y1 === y2) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x1 += sx; }
      if (e2 <= dx) { err += dx; y1 += sy; }
    }
  }

  foliage(x, y, size, color, ctx) {
    for (let row = 0; row < size; row += 3) {
      const spread = Math.sin((row / size) * Math.PI) * size * 0.6 + size * 0.2;
      const offset = (this.random() - 0.5) * 5;
      this.rect(x - spread + offset, y + row, spread * 2, 4, color, ctx);
      if (this.random() > 0.4) this.rect(x - spread + offset + 2, y + row, spread * 0.8, 2, PALETTE.moss, ctx);
    }
  }

  palm(x, y, size, flip, ctx) {
    const topX = x + flip * size * 0.18;
    const topY = y - size;
    this.line(x, y, topX, topY, PALETTE.dark, 4, ctx);
    this.line(x + 1, y, topX + 1, topY, '#7b8760', 2, ctx);
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI + i * Math.PI / 7;
      const length = size * (0.45 + this.random() * 0.27);
      const endX = topX + Math.cos(angle) * length;
      const endY = topY + Math.sin(angle) * length * 0.42 + 10;
      this.poly([[topX, topY], [topX + Math.cos(angle) * length * 0.55, topY + Math.sin(angle) * length * 0.58 - 5], [endX, endY], [topX + Math.cos(angle) * length * 0.65, topY + 2]], i % 2 ? '#345c3e' : '#53754a', ctx);
      this.line(topX, topY, endX, endY, '#78935b', 1, ctx);
      for (let j = 0.3; j < 1; j += 0.16) {
        const px = topX + (endX - topX) * j;
        const py = topY + (endY - topY) * j;
        this.line(px, py, px + (endX > topX ? -4 : 4), py + 7, PALETTE.dark, 1, ctx);
      }
    }
  }

  makeBackground() {
    const c = this.backdrop.getContext('2d');
    this.rect(0, 0, WIDTH, HEIGHT, '#e0d9b3', c);
    for (let y = 0; y < 82; y += 4) this.rect(0, y, WIDTH, 4, ['#e0d9b3', '#e3dcba', '#e8dfba', '#eee2b8'][Math.floor(y / 23)], c);
    this.rect(265, 22, 20, 3, '#efe6c7', c);
    this.rect(260, 25, 30, 13, '#efe6c7', c);
    this.rect(263, 38, 24, 3, '#efe6c7', c);
    // Humid, distant canopy and a narrow channel disappearing upriver.
    this.poly([[0, 57], [40, 43], [70, 48], [98, 36], [119, 50], [156, 44], [178, 58], [213, 53], [248, 63], [274, 51], [302, 44], [335, 54], [374, 38], [403, 49], [435, 37], [480, 52], [480, 94], [0, 94]], '#a2ac82', c);
    this.poly([[0, 63], [27, 52], [51, 59], [76, 48], [100, 62], [134, 57], [158, 69], [190, 61], [223, 76], [259, 70], [281, 59], [311, 65], [338, 51], [367, 62], [400, 50], [431, 55], [480, 45], [480, 102], [0, 102]], '#789575', c);
    for (let i = 0; i < 60; i++) {
      const x = i * 9 - 4;
      const h = 10 + this.random() * 20;
      this.foliage(x, 73 - h, h, '#5d805f', c);
    }
    // River colors become darker and clearer near the boat.
    for (let y = 78; y < HEIGHT; y += 3) {
      const t = (y - 78) / (HEIGHT - 78);
      const r = Math.round(110 - t * 65), g = Math.round(148 - t * 56), b = Math.round(132 - t * 42);
      this.rect(0, y, WIDTH, 3, `rgb(${r} ${g} ${b})`, c);
    }
    this.poly([[0, 48], [34, 57], [62, 65], [89, 72], [143, 77], [195, 81], [225, 85], [150, 90], [90, 100], [40, 120], [0, 139]], '#234e3f', c);
    this.poly([[480, 42], [447, 57], [420, 66], [388, 73], [324, 79], [277, 85], [320, 90], [397, 99], [444, 112], [480, 131]], '#285341', c);
    this.poly([[0, 104], [68, 90], [127, 85], [202, 83], [155, 89], [91, 98], [42, 114], [0, 127]], '#657a47', c);
    this.poly([[480, 105], [427, 91], [358, 85], [299, 84], [345, 90], [400, 101], [450, 118], [480, 123]], '#6d8150', c);

    for (let i = 0; i < 37; i++) {
      const left = i < 19;
      const x = left ? this.random() * 162 : 320 + this.random() * 160;
      const scale = left ? 1 - x / 240 : 1 - (480 - x) / 240;
      const h = (25 + this.random() * 39) * scale;
      const y = 74 + (left ? 160 - x : x - 320) * 0.16;
      this.rect(x, y - h + 12, 3, h, '#3d5940', c);
      this.foliage(x, y - h, h * 0.9, i % 3 ? '#2c583f' : '#456841', c);
    }
    this.palm(34, 108, 77, 1, c);
    this.palm(64, 94, 49, -1, c);
    this.palm(441, 111, 85, -1, c);
    this.palm(407, 92, 48, 1, c);
    // Dark foreground branches frame the first-person view.
    this.poly([[0, 0], [11, 0], [20, 31], [17, 68], [10, 121], [0, 140]], '#163f33', c);
    this.poly([[480, 0], [467, 0], [461, 27], [466, 76], [480, 142]], '#153d31', c);
    for (let i = 0; i < 16; i++) {
      const left = i < 8;
      const x = left ? this.random() * 42 : 438 + this.random() * 42;
      const y = this.random() * 37 - 20;
      this.foliage(x, y, 29 + this.random() * 15, '#173f31', c);
    }
    for (const [x, y, n] of [[14, 18, 46], [48, 4, 32], [456, 8, 64], [474, 42, 45]]) {
      for (let j = 0; j < n; j++) this.rect(x + Math.sin(j * 0.07) * 5, y + j, 1, 2, '#436649', c);
      for (let j = 7; j < n; j += 7) this.rect(x + Math.sin(j * 0.07) * 5 - 2, y + j, 4, 2, '#53794d', c);
    }
    // Sunlight is broken into small, horizontal reflections.
    for (let i = 0; i < 290; i++) {
      const y = 87 + this.random() * 174;
      const x = this.random() * WIDTH;
      const w = 2 + this.random() * (y - 70) * 0.13;
      this.rect(x, y, w, 1, i % 5 === 0 ? '#7e9d82' : i % 3 === 0 ? '#456f67' : '#557e70', c);
    }
    for (let i = 0; i < 37; i++) {
      const y = 85 + this.random() * 65;
      const spread = (y - 70) * 0.56;
      this.rect(270 - spread + this.random() * spread * 2, y, 4 + this.random() * 11, 1, '#9eac86', c);
    }
    // Lily pads hug the quieter river edges.
    for (let i = 0; i < 23; i++) {
      const left = i < 12;
      const x = left ? 5 + this.random() * 80 : 392 + this.random() * 84;
      const y = 127 + this.random() * 87;
      const size = 3 + this.random() * 4;
      this.rect(x - size, y - 1, size * 2, 3, '#1e4b3c', c);
      this.rect(x - size + 1, y - 2, size * 2 - 2, 3, '#638253', c);
      this.rect(x, y - 2, 1, 2, '#375f42', c);
      if (i % 6 === 0) { this.rect(x - 1, y - 4, 3, 2, '#d7bf8c', c); this.rect(x, y - 5, 1, 1, '#eee0bd', c); }
    }
    // Small rocks and roots are visible through the water.
    for (let i = 0; i < 27; i++) {
      const x = this.random() * WIDTH, y = 166 + this.random() * 104;
      this.rect(x, y, 5 + this.random() * 12, 2, '#3a6357', c);
    }
  }

  fish(fish, time, { large = false, x = fish.x, y = fish.y, opacity = 1 } = {}) {
    const c = this.ctx;
    const species = SPECIES[fish.kind];
    const direction = Math.cos(fish.angle) >= 0 ? 1 : -1;
    const size = large ? 2.5 : 1;
    const tail = Math.sin(time * (fish.state === 'fleeing' ? 16 : 8) + fish.id) > 0 ? 1 : 0;
    c.save();
    c.globalAlpha = opacity;
    c.translate(Math.round(x), Math.round(y));
    c.scale(direction * size, size);
    if (fish.kind === 'minnow') {
      this.rect(-3, 0, 6, 2, '#9cb8a9');
      this.rect(-5, -1 + tail, 2, 3, '#759888');
      this.rect(2, 0, 1, 1, '#335a50');
      this.rect(-1, -1, 3, 1, '#b3c4a9');
    } else {
      const length = species.size;
      // Offset shadow, squared tail, dorsal fin, then the lit body.
      if (!large) { this.rect(-length / 2, 4, length, 2, '#365f54'); this.rect(-length / 2 - 4, 3, 3, 2, '#365f54'); }
      this.poly([[-length / 2, 0], [-length / 2 - 5, -4 + tail], [-length / 2 - 5, 5 - tail], [-length / 2, 2]], fish.kind === 'piranha' ? '#b46d55' : '#63886b');
      this.rect(-length / 2, -3, length - 2, 7, species.color);
      this.rect(-length / 2 + 2, -4, length - 5, 1, species.color);
      this.rect(length / 2 - 2, -2, 3, 5, species.color);
      this.rect(-length / 2 + 1, -2, length - 4, 2, fish.kind === 'piranha' ? '#bdaba0' : fish.kind === 'tambaqui' ? '#eed6a0' : '#bdd0a5');
      this.rect(-2, -6, 4, 2, fish.kind === 'piranha' ? '#a07162' : '#708d63');
      this.rect(-length / 2 + 2, 3, length - 5, 2, fish.kind === 'piranha' ? '#bc6651' : '#779269');
      this.rect(length / 2 - 2, -1, 1, 1, '#172f2d');
      this.rect(length / 2 - 3, -2, 1, 1, '#efe3b5');
      this.rect(1, 0, 2, 3, fish.kind === 'piranha' ? '#d15d48' : '#8a9a69');
      if (fish.kind === 'tucunare') {
        this.rect(-4, -1, 1, 4, '#52745a'); this.rect(-1, -2, 1, 5, '#52745a');
      }
      if (fish.kind === 'piranha') {
        this.rect(length / 2 - 1, 2, 2, 1, '#eee3bb');
        if (fish.hunger > 0.7 && !large) {
          c.globalAlpha = opacity * 0.6;
          this.rect(-length / 2 - 8, -1, 2, 1, '#d29169');
          this.rect(-length / 2 - 11, 1, 2, 1, '#d29169');
        }
      }
    }
    c.restore();
    if (fish.reaction > 0 && fish.kind !== 'minnow' && !large) {
      c.save();
      c.globalAlpha = Math.min(1, fish.reaction);
      this.rect(x - 2, y - 11, 4, 1, '#bfd09a');
      this.rect(x - 3, y - 10, 1, 1, '#bfd09a');
      this.rect(x + 2, y - 10, 1, 1, '#bfd09a');
      c.restore();
    }
  }

  ripple(ripple) {
    const age = ripple.age, rx = (4 + age * 14) * ripple.size, ry = rx * 0.28;
    this.ctx.save();
    this.ctx.globalAlpha = clamp(1 - age / 2, 0, 1) * 0.65;
    for (let i = 0; i < 20; i++) {
      if (i % 6 === 0) continue;
      const a = i / 20 * Math.PI * 2;
      this.rect(ripple.x + Math.cos(a) * rx, ripple.y + Math.sin(a) * ry, 2, 1, ripple.color);
    }
    this.ctx.restore();
  }

  boat(time) {
    const bob = Math.round(Math.sin(time * 0.75));
    const c = this.ctx;
    c.save();
    c.translate(0, bob);
    // The pointed canoe bow leads the eye back into the river.
    this.poly([[239, 216], [244, 216], [303, 270], [172, 270]], '#283e32');
    this.poly([[241, 219], [248, 232], [292, 270], [185, 270]], '#8c754c');
    this.poly([[240, 225], [244, 237], [267, 270], [215, 270]], '#a48c5c');
    this.line(241, 221, 189, 270, '#c9ac72', 2);
    this.line(244, 221, 294, 270, '#b99560', 2);
    this.line(241, 224, 221, 270, '#6c5d40', 1);
    this.line(244, 231, 264, 270, '#7b6344', 1);
    this.line(219, 244, 264, 244, '#5d543d', 2);
    this.line(211, 252, 272, 252, '#b19665', 1);
    this.line(195, 265, 285, 265, '#5e5339', 3);
    this.rect(235, 235, 9, 2, '#d2b681');
    this.rect(236, 234, 7, 1, '#ead0a0');
    // Coiled rope and a woven catch basket at the fisherman's feet.
    this.rect(196, 260, 16, 10, '#635439');
    this.rect(198, 258, 12, 3, '#cfb880');
    this.rect(202, 260, 6, 2, '#867048');
    this.rect(259, 260, 18, 10, '#796443');
    for (let i = 0; i < 6; i++) this.rect(260 + i * 3, 260, 1, 10, '#b19762');
    this.rect(258, 259, 20, 2, '#d0b478');
    this.rect(258, 264, 20, 1, '#c1a472');
    c.restore();
  }

  rod(game, time) {
    const c = this.ctx;
    const bob = Math.sin(time * 0.9) * 1.2;
    const reeling = game.phase === 'reeling';
    const tug = reeling ? Math.sin(time * 9) * game.tension * 5 : 0;
    const tip = { x: 350 - tug, y: 44 + bob + (reeling ? game.tension * 17 : 0) };
    // A curved bamboo pole, ferrules and two hands seen from the angler's eyes.
    this.line(387, 249, 379, 197, '#25382b', 5);
    this.line(379, 197, 368, 119, '#273c2d', 4);
    this.line(368, 119, tip.x + 4, 70 + bob, '#273c2d', 3);
    this.line(tip.x + 4, 70 + bob, tip.x, tip.y, '#334e39', 2);
    this.line(388, 249, 380, 196, '#beaa71', 3);
    this.line(380, 196, 369, 119, '#c6b57e', 2);
    this.line(369, 119, tip.x + 5, 70 + bob, '#d3c794', 1);
    this.line(tip.x + 5, 70 + bob, tip.x + 1, tip.y, '#dbd3a7', 1);
    for (const [x, y] of [[384, 220], [380, 191], [375, 156], [369, 119], [362, 88], [354, 61]]) this.rect(x - 1, y, 4, 2, '#566348');

    let point = game.river.bait;
    if (game.phase === 'casting') {
      const t = 1 - game.timer / 0.55;
      point = { x: 241 + (game.aim.x - 241) * t, y: 222 + (game.aim.y - 222) * t - Math.sin(t * Math.PI) * 85 };
    }
    if (point) {
      const midX = (point.x + tip.x) / 2;
      const midY = (point.y + tip.y) / 2 + (reeling ? 2 : 19);
      let last = tip;
      for (let i = 1; i <= 30; i++) {
        const t = i / 30;
        const p = { x: (1 - t) ** 2 * tip.x + 2 * (1 - t) * t * midX + t * t * point.x, y: (1 - t) ** 2 * tip.y + 2 * (1 - t) * t * midY + t * t * point.y };
        this.line(last.x, last.y, p.x, p.y, game.tension > 0.75 && reeling ? '#dcab7e' : '#dbd8b4');
        last = p;
      }
      const y = point.y + (game.phase === 'bite' ? Math.sin(time * 28) * 2 : Math.sin(time * 3) * 0.7);
      this.rect(point.x - 1, y - 6, 2, 3, '#e8e1b2');
      this.rect(point.x - 2, y - 3, 4, 4, '#d3704d');
      this.rect(point.x - 1, y + 1, 2, 2, '#e8e1b2');
      if (game.phase === 'waiting') this.fish({ kind: 'minnow', angle: 0, id: 0, x: point.x, y: point.y + 6 }, time, { opacity: 0.9 });
    } else {
      this.line(tip.x, tip.y, tip.x - 10, tip.y + 28, '#c4cc9e');
      this.rect(tip.x - 12, tip.y + 26, 5, 2, '#d4cfa7');
      this.rect(tip.x - 13, tip.y + 25, 2, 4, '#719789');
    }

    this.rect(378, 235, 12, 17, '#4c5440');
    this.rect(375, 237, 13, 10, '#c1ae7b');
    this.rect(377, 239, 9, 6, '#465445');
    this.rect(370, 241 + (game.reeling ? Math.sin(time * 19) * 3 : 0), 8, 2, '#b3a277');
    // Right sleeve and hand holding the rod.
    this.poly([[419, 270], [404, 249], [397, 244], [379, 249], [385, 261], [392, 270]], '#bd865f');
    this.rect(383, 245, 12, 10, '#d1a178');
    this.rect(382, 245, 3, 8, '#e1b48b');
    this.rect(386, 248, 12, 2, '#a76d50');
    this.poly([[399, 270], [409, 254], [427, 263], [433, 270]], '#394d3d');
    this.line(408, 255, 425, 265, '#697557', 2);
    // Left hand works the little brass reel.
    const turn = game.reeling ? Math.round(Math.sin(time * 12) * 2) : 0;
    this.poly([[327, 270], [349, 251 + turn], [361, 247 + turn], [371, 249 + turn], [365, 260], [352, 270]], '#bf8b65');
    this.rect(360, 244 + turn, 10, 7, '#d4a780');
    this.rect(369, 246 + turn, 3, 5, '#deb38a');
    this.rect(359, 250 + turn, 9, 2, '#a77355');
    this.poly([[317, 270], [331, 257], [346, 265], [343, 270]], '#485b43');
    this.line(330, 258, 344, 266, '#7c8761', 2);
  }

  draw(game, hover = null) {
    const time = game.river.time;
    const c = this.ctx;
    c.drawImage(this.backdrop, 0, 0);
    // Drifting surface leaves and a few warm glints.
    for (const leaf of this.leaves) {
      const x = (leaf.x + time * 1.4) % WIDTH;
      this.rect(x, leaf.y + Math.sin(time * 0.7 + leaf.offset), 4, 1, '#aab285');
      this.rect(x + 1, leaf.y + 1, 2, 1, '#637f55');
    }
    for (const speck of this.specks) {
      const opacity = Math.max(0, Math.sin(time * 0.8 + speck.offset) - 0.6);
      c.globalAlpha = opacity;
      this.rect(speck.x + Math.sin(time + speck.offset) * 2, speck.y, 3, 1, '#eadfba');
    }
    c.globalAlpha = 1;
    // Distant birds make the forest feel occupied without distracting from the fish.
    for (let i = 0; i < 3; i++) {
      const x = (time * 3 + 190 + i * 16) % 500;
      const y = 31 + i * 3 + Math.sin(time * 1.4 + i) * 2;
      this.rect(x, y, 1, 1, '#798970');
      this.rect(x - 2, y - 1, 2, 1, '#798970');
      this.rect(x + 1, y - 1, 2, 1, '#798970');
    }
    const fish = [...game.river.fish].filter(f => f.alive).sort((a, b) => a.y - b.y);
    for (const f of fish) this.fish(f, time, { opacity: f.kind === 'minnow' ? 0.72 : 0.93 });
    for (const ripple of game.river.ripples) this.ripple(ripple);

    if (game.mode === 'playing' && game.phase === 'idle') {
      const aim = hover && hover.y > WATER.top && hover.y < WATER.bottom ? hover : game.aim;
      const x = Math.round(aim.x), y = Math.round(aim.y);
      const color = '#d0d3a2';
      c.globalAlpha = 0.72;
      this.line(x - 8, y - 3, x - 5, y - 3, color);
      this.line(x - 8, y - 3, x - 8, y, color);
      this.line(x + 5, y - 3, x + 8, y - 3, color);
      this.line(x + 8, y - 3, x + 8, y, color);
      this.line(x - 8, y + 3, x - 5, y + 3, color);
      this.line(x + 5, y + 3, x + 8, y + 3, color);
      c.globalAlpha = 1;
    }

    if (game.phase === 'bite' && game.river.bait) {
      const p = game.river.bait;
      c.save();
      c.fillStyle = '#eee1b5';
      c.font = 'bold 7px monospace';
      c.textAlign = 'center';
      c.fillText('BITE!', Math.round(p.x), Math.round(p.y - 14));
      c.restore();
    }
    this.boat(time);
    this.rod(game, time);
    // Tiny flecks of sunlight on the foreground water.
    this.rect(118 + Math.sin(time * 0.4) * 4, 249, 7, 1, '#8fa783');
    this.rect(132, 245, 3, 1, '#8fa783');
  }
}
