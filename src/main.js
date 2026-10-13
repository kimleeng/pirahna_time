import './style.css';
import { FishingGame, GOAL, WIDTH, HEIGHT, WATER, SPECIES, clamp, distance } from './ecosystem.js';
import { Renderer } from './renderer.js';
import { RiverAudio } from './audio.js';

const fishIcon = (kind = 'tambaqui', className = '') => `<svg class="pixel-fish ${className}" viewBox="0 0 32 20" aria-hidden="true" shape-rendering="crispEdges"><path d="M2 6h3v2h4v-3h14v2h4v2h3v5h-3v2h-4v2H9v-3H5v2H2V6z" fill="${SPECIES[kind].color}"/><path d="M11 2h7v3h-7zM12 18h7v2h-7z" fill="${kind === 'piranha' ? '#b96a50' : '#728f62'}"/><path d="M11 6h11v2H11z" fill="#e3d9ac"/><path d="M25 9h2v2h-2z" fill="#244439"/>${kind === 'piranha' ? '<path d="M25 14h4v2h-4z" fill="#f5e8bd"/>' : ''}</svg>`;
const icon = (name) => ({
  sound: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  restart: '<path d="M3 10a9 9 0 1 1 2 9M3 4v6h6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
}[name]);
const svgIcon = (name) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon(name)}</svg>`;

document.querySelector('#app').innerHTML = `
  <header class="site-header">
    <a class="brand" href="#" aria-label="Piranha Time home">${fishIcon('piranha')}<span>piranha<span class="brand-time">time</span><span class="brand-dot">.</span></span></a>
    <span class="header-note">A LITTLE AMAZON ADVENTURE</span>
    <nav aria-label="Game tools"><button id="guide-button" class="text-button">Field guide <span class="guide-arrow">${svgIcon('arrow')}</span></button><span class="nav-divider"></span><button id="sound-button" class="sound-button" aria-pressed="false" aria-label="Turn sound on">${svgIcon('mute')}<span>Sound off</span></button></nav>
  </header>

  <main>
    <section class="heading" aria-labelledby="title">
      <div><p class="eyebrow"><span class="tiny-sun" aria-hidden="true">✳</span> RIO NEGRO, BRAZIL <span class="eyebrow-separator">/</span> THE SLOW BEND</p><h1 id="title">A quiet river. <em>A hungry world.</em></h1></div>
      <p class="intro-copy">A minnow on your line. A whole world below.<br>Catch five fish. Keep an eye on the teeth.</p>
    </section>

    <section class="game-shell" aria-label="Fishing game">
      <div class="river-frame" id="river-frame">
        <canvas id="river" width="480" height="270" tabindex="0" aria-label="First-person view of the Amazon river. Click the water to cast your bait. Use arrow keys to aim and Space to cast, hook, or hold to reel."></canvas>
        <div class="pixel-texture" aria-hidden="true"></div>
        <div class="game-hud">
          <div class="location"><span class="live-dot"></span><span>06:12 <span class="location-am">AM</span><span class="location-divider">·</span>26°C</span></div>
          <div class="hud-counters"><div class="basket-count">${fishIcon('tambaqui')}<span id="catch-count">0 / 5</span><span class="hud-label">BASKET</span></div><span class="hud-divider"></span><div class="hook-count"><svg width="16" height="20" viewBox="0 0 16 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M10 2v11a4 4 0 0 1-8 0v-3l3 2M8 2h4"/></svg><span id="hook-count">3</span><span class="hud-label">HOOKS</span></div></div>
        </div>
        <div class="river-label" aria-hidden="true"><span>THE AMAZON BASIN</span><span>03°08′S &nbsp; 60°01′W</span></div>
        <div id="fish-label" class="fish-label" hidden></div>
        <div id="overlay" class="overlay"></div>
        <div id="catch-toast" class="catch-toast" hidden></div>
      </div>

      <div class="console">
        <div class="line-status"><span id="phase-label" class="phase-label">YOUR MORNING STARTS HERE</span><p id="status" aria-live="polite">The river is alive. Take your time.</p><div id="reel-meters" class="reel-meters" hidden><div class="meter-block"><span>TO THE BOAT <b id="progress-text">0%</b></span><div class="meter"><i id="progress-meter"></i></div></div><div class="meter-block"><span>LINE TENSION <b id="tension-text">EASY</b></span><div class="meter tension-meter"><i id="tension-meter"></i><span class="danger-zone"></span></div></div></div></div>
        <div class="console-actions"><button id="cut-button" class="cut-button" hidden>Cut line</button><button id="action-button" class="action-button" disabled>Cast your line ${svgIcon('arrow')}</button><button id="pause-button" class="icon-button" aria-label="Pause game" disabled>${svgIcon('pause')}</button><button id="restart-button" class="icon-button" aria-label="Start a new fishing trip">${svgIcon('restart')}</button></div>
      </div>
      <div class="game-underbar"><p><kbd>CLICK</kbd> cast <span>·</span> <kbd>SPACE</kbd> hook & hold to reel <span>·</span> <kbd>ESC</kbd> pause</p><div class="frenzy"><span class="frenzy-dot"></span><span>PIRANHA FRENZY</span><div class="frenzy-track"><i id="frenzy-meter"></i></div><b id="frenzy-label">CALM</b></div></div>
    </section>

    <section class="river-notes" aria-label="How the river works">
      <div class="notes-heading"><span class="eyebrow">A RIVER WITH A LIFE OF ITS OWN</span><span class="notes-number">FIELD NOTES — 001</span></div>
      <div class="notes-grid">
        <article><span class="note-icon minnows">${fishIcon('minnow')}${fishIcon('minnow')}</span><div><h2>Little fish, big appetites.</h2><p>River fish chase minnows. Your bait looks just like one. Find a calm patch and let curiosity do its thing.</p></div></article>
        <article><span class="note-icon">${fishIcon('piranha')}</span><div><h2>Hunger has a rhythm.</h2><p>A hungry piranha hunts faster. After a meal, it slows down. Watch the red bellies before you cast.</p></div></article>
        <article><span class="note-icon rod-icon" aria-hidden="true">↝</span><div><h2>A little give. A little take.</h2><p>Hold to bring your catch closer. Release to ease the line. Too much tension, and your hook is history.</p></div></article>
      </div>
    </section>
  </main>
  <footer><span>MADE FOR SLOW MORNINGS & QUICK REFLEXES</span><span>NO TWO CASTS ARE THE SAME <span aria-hidden="true">✳</span></span></footer>

  <dialog id="field-guide" aria-labelledby="guide-title"><div class="guide-top"><span class="eyebrow">NOTES FROM THE RIVERBANK</span><button id="close-guide" class="icon-button" aria-label="Close field guide">${svgIcon('close')}</button></div><h2 id="guide-title">Know your neighbors.</h2><p class="guide-intro">Five fish in the basket. Three hooks to spare.<br>The trick is learning when the river is on your side.</p><div class="guide-species"><div>${fishIcon('minnow')}<section><h3>Minnows <span>THE LITTLE ONES</span></h3><p>Fast, tiny, and always on the move. Larger river fish eat them; piranhas ignore them. You can't catch these.</p></section></div><div>${fishIcon('tambaqui')}<section><h3>River fish <span>YOUR CATCH</span></h3><p>Tambaqui, pacu, and tucunaré hunt minnows and flee piranhas. Your minnow-shaped bait tempts them when the coast is clear.</p></section></div><div>${fishIcon('piranha')}<section><h3>Piranhas <span>MIND THE TEETH</span></h3><p>Red bellies give them away. Hunger makes them faster and more aggressive; a meal calms them. They ignore live minnows but investigate your easy, motionless bait. Landing one costs a hook.</p></section></div></div><div class="guide-controls"><h3>The art of the catch</h3><ol><li><b>Cast.</b> Click the water, or aim with arrow keys and press Space.</li><li><b>Hook.</b> When the float dips, press Space or the REEL button before the bite passes.</li><li><b>Reel.</b> Hold Space or hold the REEL button. Release whenever tension climbs into the red.</li><li><b>Read.</b> If you've hooked a red belly, cut the line to let it go. Either way, you lose a hook.</li></ol><p><kbd>ESC</kbd> pause &nbsp; <kbd>R</kbd> new trip &nbsp; · &nbsp; Fish keep arriving and leaving. Be patient.</p></div><button id="guide-done" class="primary-button">Back to the river ${svgIcon('arrow')}</button></dialog>
`;

const $ = (selector) => document.querySelector(selector);
const canvas = $('#river');
const renderer = new Renderer(canvas);
const audio = new RiverAudio();
const game = new FishingGame();
const guide = $('#field-guide');
let hover = null;
let overlayKey = '';
let statusKey = '';
let phaseKey = '';
let noticeTimer = 0;
let wasPlayingBeforeGuide = false;
let pointerReeling = false;
let keyboardReeling = false;
let lastFrame = performance.now();
let previousUI = 0;

// Expose read-only snapshots in development for useful playtest diagnostics.
if (import.meta.env.DEV) {
  window.__river = {
    snapshot: () => ({ mode: game.mode, phase: game.phase, hooks: game.hooks, catches: game.catches.length, elapsed: game.elapsed, tension: game.tension, progress: game.progress, aim: { ...game.aim }, fish: game.river.fish.map(f => ({ id: f.id, kind: f.kind, x: f.x, y: f.y, hunger: f.hunger, state: f.state })), bait: game.river.bait ? { ...game.river.bait } : null }),
  };
}

function start() {
  game.start();
  syncUI(true);
  canvas.focus({ preventScroll: true });
}

function restart() {
  pointerReeling = keyboardReeling = false;
  game.reset();
  hover = null;
  $('#catch-toast').hidden = true;
  syncUI(true);
}

function doAction(hold = false) {
  if (game.mode !== 'playing') return;
  if (game.phase === 'idle') { if (game.cast()) audio.sound('cast'); }
  else if (game.phase === 'bite') { game.hook(); if (hold) game.reeling = true; }
  else if (game.phase === 'reeling') { if (hold) game.reeling = true; }
  else if (game.phase === 'waiting') game.retrieve();
  syncUI(true);
}

function coords(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / rect.width * WIDTH, y: (event.clientY - rect.top) / rect.height * HEIGHT };
}

canvas.addEventListener('pointermove', event => {
  hover = coords(event);
  if (game.phase === 'idle' && hover.y >= WATER.top && hover.y <= WATER.bottom) game.aim = { x: clamp(hover.x, WATER.left + 10, WATER.right - 10), y: clamp(hover.y, WATER.top + 5, WATER.bottom - 8) };
  updateFishLabel();
});
canvas.addEventListener('pointerleave', () => { hover = null; $('#fish-label').hidden = true; });
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  event.preventDefault();
  canvas.focus({ preventScroll: true });
  if (game.mode !== 'playing') return;
  const point = coords(event);
  if (game.phase === 'idle') {
    if (point.y < WATER.top || point.y > WATER.bottom || point.x < WATER.left || point.x > WATER.right) {
      game.say('Aim for the open water, just beyond the canoe.');
    } else if (game.cast(point.x, point.y)) audio.sound('cast');
  } else if (game.phase === 'bite' || game.phase === 'reeling') {
    pointerReeling = true;
    doAction(true);
  }
  syncUI(true);
});

$('#action-button').addEventListener('pointerdown', event => {
  if (event.button !== 0 || game.mode !== 'playing') return;
  if (game.phase === 'bite' || game.phase === 'reeling') {
    event.preventDefault();
    pointerReeling = true;
    doAction(true);
  }
});
$('#action-button').addEventListener('click', () => {
  // Pointerdown handles hooking/holding. Click is also the accessible keyboard action.
  if (game.phase !== 'reeling') doAction(false);
});
window.addEventListener('pointerup', () => { pointerReeling = false; game.reeling = keyboardReeling; });
window.addEventListener('pointercancel', () => { pointerReeling = false; game.reeling = keyboardReeling; });

window.addEventListener('keydown', event => {
  if (guide.open || event.target.closest('input, textarea, select')) return;
  if (event.code === 'Space') {
    // Let focused utility buttons keep their native keyboard behavior.
    if (event.target.closest('button') && event.target !== $('#action-button')) return;
    event.preventDefault();
    if (event.repeat) return;
    if (game.mode === 'ready') start();
    else if (game.mode === 'playing') { keyboardReeling = true; doAction(true); }
  } else if (event.code === 'Escape') {
    game.pause(); pointerReeling = keyboardReeling = false; syncUI(true);
  } else if (event.code === 'KeyR') restart();
  else if (event.code.startsWith('Arrow') && game.mode === 'playing' && game.phase === 'idle') {
    event.preventDefault();
    hover = null;
    const shift = event.shiftKey ? 20 : 6;
    game.aim.x = clamp(game.aim.x + (event.code === 'ArrowLeft' ? -shift : event.code === 'ArrowRight' ? shift : 0), WATER.left + 10, WATER.right - 10);
    game.aim.y = clamp(game.aim.y + (event.code === 'ArrowUp' ? -shift : event.code === 'ArrowDown' ? shift : 0), WATER.top + 5, WATER.bottom - 8);
  }
});
window.addEventListener('keyup', event => {
  if (event.code === 'Space') { keyboardReeling = false; game.reeling = pointerReeling; }
});
window.addEventListener('blur', () => {
  pointerReeling = keyboardReeling = false;
  if (game.mode === 'playing') game.pause();
  syncUI(true);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.mode === 'playing') { game.pause(); pointerReeling = keyboardReeling = false; syncUI(true); }
});

$('#pause-button').addEventListener('click', () => { game.pause(); pointerReeling = keyboardReeling = false; syncUI(true); });
$('#restart-button').addEventListener('click', restart);
$('#cut-button').addEventListener('click', () => { game.cutLine(); pointerReeling = keyboardReeling = false; syncUI(true); });
$('#sound-button').addEventListener('click', async () => {
  try {
    const enabled = await audio.toggle();
    $('#sound-button').innerHTML = `${svgIcon(enabled ? 'sound' : 'mute')}<span>Sound ${enabled ? 'on' : 'off'}</span>`;
    $('#sound-button').setAttribute('aria-pressed', String(enabled));
    $('#sound-button').setAttribute('aria-label', `Turn sound ${enabled ? 'off' : 'on'}`);
  } catch {
    audio.enabled = false;
    game.say('Audio is unavailable in this browser. The river is still yours.');
    syncUI(true);
  }
});
$('#guide-button').addEventListener('click', () => {
  wasPlayingBeforeGuide = game.mode === 'playing';
  if (wasPlayingBeforeGuide) game.pause();
  pointerReeling = keyboardReeling = false;
  guide.showModal(); syncUI(true);
});
function finishGuideClose() {
  if (wasPlayingBeforeGuide && game.mode === 'paused') game.pause();
  wasPlayingBeforeGuide = false;
  syncUI(true);
  if (game.mode === 'playing') canvas.focus({ preventScroll: true });
}
function closeGuide() { guide.close(); finishGuideClose(); }
$('#close-guide').addEventListener('click', closeGuide);
$('#guide-done').addEventListener('click', closeGuide);
guide.addEventListener('cancel', event => { event.preventDefault(); closeGuide(); });
guide.addEventListener('click', event => { if (event.target === guide) { const r = guide.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeGuide(); } });
guide.addEventListener('close', finishGuideClose);

function updateFishLabel() {
  const label = $('#fish-label');
  if (!hover || game.mode !== 'playing' || game.phase === 'reeling') { label.hidden = true; return; }
  const fish = game.river.fish.filter(f => f.alive).find(f => distance(f, hover) < (f.kind === 'minnow' ? 5 : 11));
  if (!fish) { label.hidden = true; return; }
  label.hidden = false;
  label.textContent = fish.kind === 'piranha' ? `Piranha · ${fish.hunger > 0.65 ? 'hungry' : fish.hunger < 0.25 ? 'just fed' : 'watchful'}` : SPECIES[fish.kind].name;
  label.style.left = `${clamp(fish.x / WIDTH * 100, 12, 85)}%`;
  label.style.top = `${(fish.y - 15) / HEIGHT * 100}%`;
}

function renderOverlay() {
  const key = game.mode;
  if (overlayKey === key) return;
  overlayKey = key;
  const overlay = $('#overlay');
  overlay.dataset.mode = key;
  overlay.hidden = key === 'playing';
  if (key === 'ready') {
    overlay.innerHTML = `<div class="intro-card"><span class="card-eyebrow"><span class="live-dot"></span> ONE BOAT. ONE VERY ALIVE RIVER.</span><h2>Find your <br>quiet moment.</h2><p>Bring home <b>five river fish</b>.<br>Keep the piranhas off your line.<br>You have three hooks. Make them count.</p><button id="start-button" class="primary-button">Let’s go fishing ${svgIcon('arrow')}</button><span class="card-footnote">NO RUSH. JUST YOU AND THE RIVER.</span></div>`;
    $('#start-button').addEventListener('click', start);
  } else if (key === 'paused') {
    overlay.innerHTML = `<div class="pause-card"><span class="eyebrow">TAKE A BREATHER</span><h2>The river can wait.</h2><p>Your line and the whole ecosystem are paused.</p><button id="resume-button" class="primary-button">Back to fishing ${svgIcon('arrow')}</button></div>`;
    $('#resume-button').addEventListener('click', () => { game.pause(); syncUI(true); canvas.focus({ preventScroll: true }); });
  } else if (key === 'won' || key === 'lost') {
    const won = key === 'won';
    const minutes = Math.floor(game.elapsed / 60), seconds = Math.floor(game.elapsed % 60).toString().padStart(2, '0');
    overlay.innerHTML = `<div class="end-card"><div class="end-fish">${fishIcon(won ? 'tambaqui' : 'piranha')}</div><span class="eyebrow">${won ? 'A MORNING WELL SPENT' : 'THE RIVER HAS OTHER PLANS'}</span><h2>${won ? 'A basket full of stories.' : 'All out of hooks.'}</h2><p>${won ? 'Five fish, a little patience, and a very good day on the Amazon.' : 'The teeth got the better of you. There’s always another quiet patch of water.'}</p><div class="end-stats"><div><b>${game.catches.length}</b><span>FISH LANDED</span></div><div><b>${minutes}:${seconds}</b><span>ON THE RIVER</span></div><div><b>${game.piranhas}</b><span>PIRANHAS</span></div></div><button id="again-button" class="primary-button">One more morning ${svgIcon('arrow')}</button></div>`;
    $('#again-button').addEventListener('click', () => { restart(); start(); });
  }
}

function syncUI(force = false) {
  renderOverlay();
  $('#catch-count').textContent = `${game.catches.length} / ${GOAL}`;
  $('#hook-count').textContent = game.hooks;
  $('#reel-meters').hidden = game.phase !== 'reeling';
  $('#cut-button').hidden = game.phase !== 'reeling' || game.mode !== 'playing';
  $('#pause-button').disabled = !['playing', 'paused'].includes(game.mode);
  $('#pause-button').setAttribute('aria-label', game.mode === 'paused' ? 'Resume game' : 'Pause game');
  const button = $('#action-button');
  const phase = game.phase;
  button.disabled = game.mode !== 'playing' || phase === 'casting';
  if (force || phaseKey !== phase) {
    phaseKey = phase;
    button.innerHTML = `${{ idle: 'Cast your line', casting: 'Casting…', waiting: 'Retrieve bait', bite: 'Bite! Set the hook', reeling: 'Hold to reel' }[phase]} ${svgIcon('arrow')}`;
  }
  button.dataset.phase = phase;
  $('#phase-label').textContent = game.mode === 'ready' ? 'YOUR MORNING STARTS HERE' : game.mode === 'paused' ? 'PAUSED · BREATHE A LITTLE' : { idle: 'FIND YOUR NEXT CAST', casting: 'BAIT IN FLIGHT', waiting: 'LINE OUT · WATCH THE FLOAT', bite: 'BITE! · NOW’S YOUR CHANCE', reeling: game.reeling ? 'REELING · EASY DOES IT' : 'LINE OUT · HOLD TO REEL' }[phase];
  if (statusKey !== game.notice) { statusKey = game.notice; $('#status').textContent = game.notice; }
  const tension = game.tension;
  $('#progress-meter').style.width = `${game.progress * 100}%`;
  $('#progress-text').textContent = `${Math.round(game.progress * 100)}%`;
  $('#tension-meter').style.width = `${tension * 100}%`;
  $('#tension-meter').style.background = tension > 0.72 ? '#c56947' : tension > 0.45 ? '#b09352' : '#668969';
  $('#tension-text').textContent = tension > 0.72 ? 'LET GO!' : tension > 0.45 ? 'TIGHTENING' : 'EASY';
  $('#tension-text').dataset.danger = String(tension > 0.72);
  const frenzy = game.river.frenzy;
  $('#frenzy-meter').style.width = `${frenzy * 100}%`;
  $('#frenzy-meter').style.background = frenzy > 0.68 ? '#c47852' : '#8f9a66';
  $('#frenzy-label').textContent = frenzy > 0.68 ? 'HUNGRY' : frenzy > 0.35 ? 'STIRRING' : 'CALM';
  $('#river-frame').dataset.phase = phase;
  updateFishLabel();
}

function frame(now) {
  // Fixed simulation steps avoid frame-rate-dependent hunting and overshooting.
  let remaining = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;
  while (remaining > 0) { const dt = Math.min(remaining, 1 / 60); game.step(dt); remaining -= dt; }
  for (const message of game.messages.splice(0)) {
    audio.sound(message.type);
    if (message.type === 'catch' || message.type === 'piranha') {
      const toast = $('#catch-toast');
      toast.innerHTML = `${fishIcon(message.type === 'piranha' ? 'piranha' : game.catches.at(-1)?.kind)}<span>${message.type === 'piranha' ? 'A little too toothy. −1 hook' : `${game.catches.at(-1)?.name} in the basket!`}</span>`;
      toast.dataset.type = message.type;
      toast.hidden = false;
      noticeTimer = now + 3200;
    }
  }
  if (now > noticeTimer) $('#catch-toast').hidden = true;
  renderer.draw(game, hover);
  if (now - previousUI > 80) { syncUI(); previousUI = now; }
  requestAnimationFrame(frame);
}

syncUI(true);
requestAnimationFrame(frame);
