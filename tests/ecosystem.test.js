import test from 'node:test';
import assert from 'node:assert/strict';
import { River, FishingGame, GOAL, seededRandom } from '../src/ecosystem.js';

const emptyRiver = () => new River({ populate: false, random: seededRandom(12) });
const emptyGame = () => new FishingGame({ populate: false, random: seededRandom(12) });

function getBite(game, kind = 'tambaqui') {
  if (game.mode === 'ready') game.start();
  assert.equal(game.cast(190, 155), true);
  game.step(0.56);
  const fish = game.river.addFish(kind, { x: 190, y: 155, hunger: 0.8, mealCooldown: 0 });
  game.step(1 / 60);
  assert.equal(game.phase, 'bite');
  assert.equal(game.fish.id, fish.id);
  return fish;
}

function reelSafely(game) {
  assert.equal(game.hook(), true);
  let holding = true;
  for (let i = 0; i < 1200 && game.phase === 'reeling'; i++) {
    if (game.tension > 0.68) holding = false;
    else if (game.tension < 0.25) holding = true;
    game.reeling = holding;
    game.step(1 / 60);
  }
  assert.equal(game.phase, 'idle');
}

test('piranha hunger increases over time and hungry piranhas swim farther', () => {
  const calm = emptyRiver(), hungry = emptyRiver();
  const c = calm.addFish('piranha', { x: 100, y: 155, angle: 0, hunger: 0 });
  const h = hungry.addFish('piranha', { x: 100, y: 155, angle: 0, hunger: 0.85 });
  for (let i = 0; i < 120; i++) { calm.step(1 / 60, { spawn: false }); hungry.step(1 / 60, { spawn: false }); }
  assert.ok(c.hunger > 0);
  assert.ok(h.hunger > 0.85);
  assert.ok(Math.hypot(h.x - 100, h.y - 155) > Math.hypot(c.x - 100, c.y - 155) * 2);
});

test('a piranha eats larger fish, calms down, and ignores live minnows', () => {
  const river = emptyRiver();
  const piranha = river.addFish('piranha', { x: 180, y: 150, hunger: 0.95 });
  const minnow = river.addFish('minnow', { x: 181, y: 150 });
  assert.equal(river.feed(piranha, minnow), false);
  assert.equal(minnow.alive, true);
  const prey = river.addFish('pacu', { x: 182, y: 150 });
  river.step(1 / 60, { spawn: false });
  assert.equal(prey.alive, false);
  assert.ok(piranha.hunger < 0.1);
  assert.ok(piranha.mealCooldown > 0);
  assert.equal(piranha.state, 'fed');
  assert.ok(river.events.some(e => e.type === 'meal' && e.predator === 'piranha'));
});

test('river fish eat minnows', () => {
  const river = emptyRiver();
  const fish = river.addFish('tucunare', { x: 190, y: 150, hunger: 0.8 });
  const minnow = river.addFish('minnow', { x: 192, y: 150 });
  river.step(1 / 60, { spawn: false });
  assert.equal(minnow.alive, false);
  assert.ok(fish.hunger < 0.1);
  assert.equal(river.events.find(e => e.type === 'meal').prey, 'minnow');
});

test('river fish flee piranhas rather than pursuing nearby bait', () => {
  const river = emptyRiver();
  const fish = river.addFish('tambaqui', { x: 200, y: 155, angle: 0 });
  river.addFish('piranha', { x: 176, y: 155, hunger: 0, state: 'hooked' });
  // A resting predator still looks dangerous once it is free.
  river.fish[1].state = 'biting';
  river.setBait(181, 155);
  river.step(0.1, { spawn: false });
  assert.equal(fish.state, 'fleeing');
  assert.ok(fish.x > 200);
  assert.equal(river.bait.active, true);
});

test('both river fish and hungry piranhas investigate minnow-shaped bait', () => {
  for (const kind of ['tambaqui', 'pacu', 'tucunare', 'piranha']) {
    const river = emptyRiver();
    const fish = river.addFish(kind, { x: 190, y: 155, hunger: 0.8 });
    river.setBait(192, 155);
    river.step(1 / 60, { spawn: false });
    assert.equal(river.events.find(e => e.type === 'bite')?.fish.id, fish.id, kind);
    assert.equal(river.bait.active, false);
    river.step(1 / 60, { spawn: false });
    assert.equal(fish.state, 'biting');
  }
});

test('new fish enter the river and old fish swim out', () => {
  const river = emptyRiver();
  const fish = river.addFish('minnow', { x: 467, y: 150, angle: 0, lifetime: 0 });
  for (let i = 0; i < 240; i++) river.step(1 / 60);
  assert.equal(fish.alive, false);
  assert.ok(river.fish.length > 0);
  assert.ok(river.fish.every(f => f.id !== fish.id));
});

test('casting is timed and a second cast cannot replace an active line', () => {
  const game = emptyGame();
  assert.equal(game.cast(), false);
  game.start();
  assert.equal(game.cast(160, 165), true);
  assert.equal(game.phase, 'casting');
  assert.equal(game.cast(330, 210), false);
  game.step(0.3);
  assert.equal(game.river.bait, null);
  game.step(0.3);
  assert.equal(game.phase, 'waiting');
  assert.equal(game.river.bait.x, 160);
});

test('missing a bite releases the fish without spending a hook', () => {
  const game = emptyGame();
  const fish = getBite(game);
  game.step(1.9);
  assert.equal(game.phase, 'idle');
  assert.equal(game.river.bait, null);
  assert.equal(game.hooks, 3);
  assert.equal(fish.alive, true);
  assert.equal(fish.state, 'cruising');
});

test('alternating reeling and easing lands a fish with the hook intact', () => {
  const game = emptyGame();
  getBite(game, 'tucunare');
  reelSafely(game);
  assert.equal(game.catches.length, 1);
  assert.equal(game.catches[0].kind, 'tucunare');
  assert.equal(game.hooks, 3);
  assert.equal(game.mode, 'playing');
});

test('holding continuously snaps the line and loses a hook', () => {
  const game = emptyGame();
  const fish = getBite(game);
  game.hook();
  game.reeling = true;
  for (let i = 0; i < 600 && game.phase === 'reeling'; i++) game.step(1 / 60);
  assert.equal(game.phase, 'idle');
  assert.equal(game.hooks, 2);
  assert.equal(game.catches.length, 0);
  assert.equal(fish.alive, true);
  assert.match(game.notice, /Snap/);
});

test('landing a piranha costs a hook and never adds a good catch', () => {
  const game = emptyGame();
  getBite(game, 'piranha');
  reelSafely(game);
  assert.equal(game.hooks, 2);
  assert.equal(game.piranhas, 1);
  assert.equal(game.catches.length, 0);
});

test('pausing freezes both the ecosystem and the bite deadline', () => {
  const game = emptyGame();
  getBite(game);
  game.pause();
  const before = { time: game.river.time, timer: game.timer, elapsed: game.elapsed };
  game.step(10);
  assert.deepEqual({ time: game.river.time, timer: game.timer, elapsed: game.elapsed }, before);
  game.pause();
  assert.equal(game.hook(), true);
});

test('three cut lines end the trip and restarting resets the whole game', () => {
  const game = emptyGame();
  for (let i = 0; i < 3; i++) { getBite(game, 'piranha'); game.hook(); game.cutLine(); }
  assert.equal(game.mode, 'lost');
  assert.equal(game.hooks, 0);
  assert.equal(game.piranhas, 0);
  game.reset();
  assert.equal(game.mode, 'ready');
  assert.equal(game.hooks, 3);
  assert.equal(game.elapsed, 0);
});

test('five good catches fill the basket and end the trip', () => {
  const game = emptyGame();
  for (let i = 0; i < GOAL; i++) { getBite(game); reelSafely(game); }
  assert.equal(game.mode, 'won');
  assert.equal(game.catches.length, GOAL);
  const time = game.river.time;
  game.step(5);
  assert.equal(game.river.time, time);
});
