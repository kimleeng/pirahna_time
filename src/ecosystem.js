export const WIDTH = 480;
export const HEIGHT = 270;
export const WATER = { left: 12, right: 468, top: 105, bottom: 232 };
export const GOAL = 5;
export const SPECIES = {
  minnow: { name: 'Minnow', size: 4, speed: 18, color: '#9cbab0', edible: false },
  tambaqui: { name: 'Tambaqui', size: 11, speed: 13, color: '#dbc17f', edible: true },
  tucunare: { name: 'Tucunaré', size: 13, speed: 17, color: '#9fb889', edible: true },
  pacu: { name: 'Pacu', size: 10, speed: 14, color: '#a1b4b9', edible: true },
  piranha: { name: 'Red-bellied piranha', size: 11, speed: 16, color: '#d58a6b', edible: false },
};

export function seededRandom(seed = 42) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class River {
  constructor({ random = Math.random, populate = true } = {}) {
    this.random = random;
    this.time = 0;
    this.nextId = 1;
    this.fish = [];
    this.ripples = [];
    this.events = [];
    this.bait = null;
    this.spawnTimer = 2.8;
    if (populate) this.populate();
  }

  populate() {
    for (let i = 0; i < 13; i++) this.addFish('minnow');
    for (let i = 0; i < 7; i++) this.addFish(['tambaqui', 'tucunare', 'pacu'][i % 3]);
    this.addFish('piranha', { x: 86, y: 154, hunger: 0.35 });
    this.addFish('piranha', { x: 377, y: 192, hunger: 0.58 });
    this.addFish('piranha', { x: 332, y: 124, hunger: 0.2 });
  }

  addFish(kind, overrides = {}) {
    const fish = {
      id: this.nextId++, kind,
      x: WATER.left + 25 + this.random() * (WATER.right - WATER.left - 50),
      y: WATER.top + 12 + this.random() * (WATER.bottom - WATER.top - 24),
      angle: this.random() * Math.PI * 2,
      wander: this.random() * Math.PI * 2,
      hunger: kind === 'piranha' ? 0.15 + this.random() * 0.5 : this.random() * 0.6,
      age: 0, lifetime: 50 + this.random() * 100,
      mealCooldown: 0,
      reaction: 0,
      state: 'cruising', alive: true,
      ...overrides,
    };
    this.fish.push(fish);
    return fish;
  }

  addRipple(x, y, color = '#b5ccb2', size = 1) {
    this.ripples.push({ x, y, age: 0, color, size });
  }

  feed(predator, prey) {
    if (!prey.alive || !predator.alive) return false;
    if (predator.kind === 'piranha' && (prey.kind === 'minnow' || prey.kind === 'piranha')) return false;
    if (predator.kind !== 'piranha' && prey.kind !== 'minnow') return false;
    prey.alive = false;
    predator.hunger = 0.04;
    predator.mealCooldown = predator.kind === 'piranha' ? 4 : 2.2;
    predator.state = 'fed';
    predator.reaction = 1.5;
    this.addRipple(prey.x, prey.y, predator.kind === 'piranha' ? '#d8a185' : '#b5ccb2', 0.6);
    this.events.push({ type: 'meal', predator: predator.kind, prey: prey.kind, x: prey.x, y: prey.y });
    return true;
  }

  setBait(x, y) {
    this.bait = { x: clamp(x, WATER.left + 10, WATER.right - 10), y: clamp(y, WATER.top + 4, WATER.bottom - 8), active: true };
    this.addRipple(this.bait.x, this.bait.y, '#e5d3a1', 1.3);
  }

  removeBait() { this.bait = null; }

  get frenzy() {
    const piranhas = this.fish.filter(f => f.alive && f.kind === 'piranha');
    if (!piranhas.length) return 0;
    return piranhas.reduce((total, f) => total + f.hunger, 0) / piranhas.length;
  }

  step(dt, { spawn = true } = {}) {
    this.time += dt;
    this.events = [];
    for (const ripple of this.ripples) ripple.age += dt;
    this.ripples = this.ripples.filter(r => r.age < 2);
    const living = this.fish.filter(f => f.alive);

    for (const f of living) {
      if (!f.alive) continue;
      f.age += dt;
      f.reaction = Math.max(0, f.reaction - dt);
      f.mealCooldown = Math.max(0, f.mealCooldown - dt);
      f.hunger = Math.min(1, f.hunger + dt * (f.kind === 'piranha' ? 0.023 : 0.033));
      if (f.state === 'hooked' || f.state === 'biting') continue;
      if (f.age > f.lifetime) f.state = 'leaving';
      let desired = f.angle;
      let speed = SPECIES[f.kind].speed;
      let target = null;
      let baitTarget = false;

      if (f.state === 'leaving') {
        desired = f.x < WIDTH / 2 ? Math.PI : 0;
        speed *= 1.2;
      } else {
        f.wander += dt * 0.7;
        desired = f.angle + Math.sin(f.wander + f.id) * dt * 0.8;
        f.state = f.mealCooldown > 0 ? 'fed' : 'cruising';
        if (f.kind === 'piranha') {
          speed = 10 + f.hunger * 31;
          if (f.mealCooldown > 0) speed *= 0.65;
          let closest = 45 + f.hunger * 190;
          if (f.mealCooldown <= 0 && f.hunger > 0.16) {
            for (const other of living) {
              if (!other.alive || !SPECIES[other.kind].edible || other.state === 'hooked' || other.state === 'biting') continue;
              const d = distance(f, other);
              if (d < closest) { closest = d; target = other; }
            }
            if (this.bait?.active) {
              // Minnow bait is unusually still and easy to investigate, even for a piranha.
              const d = distance(f, this.bait);
              if (d < closest * 1.25) { target = this.bait; baitTarget = true; }
            }
          }
        } else {
          // Minnows flee larger fish; catchable fish flee piranhas.
          let threat = null;
          let nearest = f.kind === 'minnow' ? 35 : 58;
          for (const other of living) {
            if (!other.alive || other.state === 'hooked') continue;
            const dangerous = f.kind === 'minnow' ? SPECIES[other.kind].edible : other.kind === 'piranha';
            const d = distance(f, other);
            if (dangerous && d < nearest) { nearest = d; threat = other; }
          }
          if (threat) {
            desired = Math.atan2(f.y - threat.y, f.x - threat.x);
            speed *= f.kind === 'minnow' ? 1.75 : 1.6;
            f.state = 'fleeing';
          } else if (SPECIES[f.kind].edible && f.mealCooldown <= 0) {
            let closest = 35 + f.hunger * 90;
            if (this.bait?.active && distance(f, this.bait) < 115) {
              target = this.bait;
              baitTarget = true;
              closest = distance(f, this.bait) * 0.6;
            }
            for (const other of living) {
              if (!other.alive || other.kind !== 'minnow') continue;
              const d = distance(f, other);
              if (d < closest) { closest = d; target = other; baitTarget = false; }
            }
          }
        }

        if (target) {
          f.state = 'hunting';
          desired = Math.atan2(target.y - f.y, target.x - f.x);
          const d = distance(f, target);
          if (d < (baitTarget ? 5 : SPECIES[f.kind].size * 0.5)) {
            if (baitTarget && this.bait?.active) {
              this.bait.active = false;
              f.state = 'biting';
              this.events.push({ type: 'bite', fish: f });
              this.addRipple(f.x, f.y, '#ecd09b', 1.5);
            } else if (!baitTarget) {
              this.feed(f, target);
            }
          }
        }
      }

      if (f.state === 'biting') continue;
      const turn = Math.atan2(Math.sin(desired - f.angle), Math.cos(desired - f.angle));
      f.angle += clamp(turn, -dt * 4.5, dt * 4.5);
      f.x += Math.cos(f.angle) * speed * dt;
      f.y += Math.sin(f.angle) * speed * dt;
      if (f.y < WATER.top + 5) { f.y = WATER.top + 5; f.angle = Math.abs(f.angle); }
      if (f.y > WATER.bottom - 4) { f.y = WATER.bottom - 4; f.angle = -Math.abs(f.angle); }
      if (f.state === 'leaving') {
        if (f.x < -20 || f.x > WIDTH + 20) {
          f.alive = false;
          this.events.push({ type: 'departure', kind: f.kind });
        }
      } else {
        if (f.x < WATER.left) { f.x = WATER.left; f.angle = 0; }
        if (f.x > WATER.right) { f.x = WATER.right; f.angle = Math.PI; }
      }
    }

    this.fish = this.fish.filter(f => f.alive);
    if (spawn) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.fish.length < 32) {
        this.spawnTimer = 2.4 + this.random() * 3.5;
        const r = this.random();
        const piranhas = this.fish.filter(f => f.kind === 'piranha').length;
        const kind = r < 0.44 ? 'minnow' : r < 0.88 || piranhas >= 4 ? ['tambaqui', 'pacu', 'tucunare'][Math.floor(this.random() * 3)] : 'piranha';
        const left = this.random() < 0.5;
        this.addFish(kind, { x: left ? WATER.left : WATER.right, angle: left ? 0 : Math.PI });
        this.events.push({ type: 'arrival', kind });
      }
    }
    return this.events;
  }
}

export class FishingGame {
  constructor(options = {}) {
    this.options = options;
    this.reset();
  }

  reset() {
    this.river = new River(this.options);
    this.mode = 'ready';
    this.phase = 'idle';
    this.catches = [];
    this.hooks = 3;
    this.piranhas = 0;
    this.elapsed = 0;
    this.aim = { x: 212, y: 159 };
    this.castOrigin = null;
    this.timer = 0;
    this.fish = null;
    this.progress = 0;
    this.tension = 0;
    this.reeling = false;
    this.messages = [];
    this.notice = 'The river is alive. Take your time.';
  }

  say(text, type = 'info') {
    this.notice = text;
    this.messages.push({ text, type });
  }

  start() {
    if (this.mode === 'ready') {
      this.mode = 'playing';
      this.say('Find open water, then cast your minnow bait.');
    }
  }

  pause() {
    if (this.mode === 'playing') { this.mode = 'paused'; this.reeling = false; }
    else if (this.mode === 'paused') this.mode = 'playing';
  }

  cast(x = this.aim.x, y = this.aim.y) {
    if (this.mode !== 'playing' || this.phase !== 'idle') return false;
    this.aim = { x: clamp(x, WATER.left + 10, WATER.right - 10), y: clamp(y, WATER.top + 5, WATER.bottom - 8) };
    this.castOrigin = { ...this.aim };
    this.phase = 'casting';
    this.timer = 0.55;
    this.say('A little splash. Now watch the float.');
    return true;
  }

  hook() {
    if (this.mode !== 'playing' || this.phase !== 'bite' || !this.fish?.alive) return false;
    this.phase = 'reeling';
    this.fish.state = 'hooked';
    this.progress = 0;
    this.tension = 0.18;
    this.timer = 0;
    this.say('Fish on! Hold to reel. Let go when the line gets tight.', 'hook');
    return true;
  }

  retrieve() {
    if (this.mode !== 'playing' || !['waiting', 'casting', 'bite'].includes(this.phase)) return;
    if (this.fish?.alive) { this.fish.state = 'cruising'; this.fish.mealCooldown = 1.5; }
    this.fish = null;
    this.river.removeBait();
    this.phase = 'idle';
    this.reeling = false;
    this.say('Bait retrieved. Try a quieter patch of water.');
  }

  cutLine() {
    if (this.mode !== 'playing' || this.phase !== 'reeling') return;
    if (this.fish?.alive) { this.fish.state = 'cruising'; this.fish.mealCooldown = 1; }
    this.fish = null;
    this.hooks--;
    this.phase = 'idle';
    this.reeling = false;
    this.river.removeBait();
    this.say('Line cut. One hook lost, fingers intact.', 'escape');
    this.checkEnd();
  }

  land() {
    if (!this.fish) return;
    const fish = this.fish;
    fish.alive = false;
    this.river.addRipple(fish.x, fish.y, '#e8d4a4', 1.8);
    if (fish.kind === 'piranha') {
      this.piranhas++;
      this.hooks--;
      this.say('Piranha! It took your hook. Choose your next cast carefully.', 'piranha');
    } else {
      this.catches.push({ kind: fish.kind, name: SPECIES[fish.kind].name, time: this.elapsed });
      this.say(`${SPECIES[fish.kind].name} landed! ${this.catches.length} of ${GOAL} in the basket.`, 'catch');
    }
    this.fish = null;
    this.river.removeBait();
    this.phase = 'idle';
    this.reeling = false;
    this.checkEnd();
  }

  checkEnd() {
    if (this.hooks <= 0) { this.mode = 'lost'; this.say('Out of hooks. The river wins this round.', 'end'); }
    else if (this.catches.length >= GOAL) { this.mode = 'won'; this.say('A full basket. A good morning on the Amazon.', 'end'); }
  }

  step(dt) {
    if (this.mode === 'paused' || this.mode === 'won' || this.mode === 'lost') return;
    const events = this.river.step(dt);
    if (this.mode !== 'playing') return;
    this.elapsed += dt;
    if (this.phase === 'casting') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.river.setBait(this.aim.x, this.aim.y);
        this.phase = 'waiting';
      }
    } else if (this.phase === 'waiting') {
      const bite = events.find(e => e.type === 'bite');
      if (bite) {
        this.phase = 'bite';
        this.fish = bite.fish;
        this.timer = 1.8;
        this.say('Bite! Set the hook — press Space or tap REEL.', 'bite');
      }
    } else if (this.phase === 'bite') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.fish.state = 'cruising';
        this.fish.mealCooldown = 2;
        this.fish = null;
        this.river.removeBait();
        this.phase = 'idle';
        this.say('A nibble and a missed chance. Cast again.', 'escape');
      }
    } else if (this.phase === 'reeling') {
      this.timer += dt;
      const resistance = this.fish.kind === 'piranha' ? 1.18 : 1;
      const surge = Math.sin(this.timer * 2.2 + this.fish.id) > 0.6 ? 1.45 : 1;
      this.tension = clamp(this.tension + dt * (this.reeling ? 0.32 * resistance * surge : -0.55), 0.04, 1.05);
      this.progress = clamp(this.progress + dt * (this.reeling ? 0.23 : -0.025), 0, 1);
      this.fish.x = this.castOrigin.x + (243 - this.castOrigin.x) * this.progress;
      this.fish.y = this.castOrigin.y + (225 - this.castOrigin.y) * this.progress;
      if (this.river.bait) { this.river.bait.x = this.fish.x; this.river.bait.y = this.fish.y; }
      if (this.tension >= 1) {
        this.fish.state = 'cruising';
        this.fish.mealCooldown = 2;
        this.fish = null;
        this.river.removeBait();
        this.hooks--;
        this.phase = 'idle';
        this.reeling = false;
        this.say('Snap! Ease off before the tension reaches the red.', 'snap');
        this.checkEnd();
      } else if (this.progress >= 1) this.land();
    }
  }
}
