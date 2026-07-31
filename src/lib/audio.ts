// Tiny synthesized SFX + ambient music via Web Audio API — no external files.
let ctx: AudioContext | null = null;
let sfxEnabled = true;
let musicEnabled = false;
let musicTimer: number | null = null;

const SFX_KEY = 'bb_sfx';
const MUSIC_KEY = 'bb_music';

// Legacy compat: the old global mute toggle. Kept so any older caller keeps
// working; the granular SFX flag below is the source of truth now.
export function setMuted(m: boolean) { sfxEnabled = !m; }
export function isMuted(): boolean { return !sfxEnabled; }

export function setSfxEnabled(v: boolean) {
  sfxEnabled = v;
  try { localStorage.setItem(SFX_KEY, v ? '1' : '0'); } catch { /* ignore */ }
}
export function getSfxEnabled(): boolean { return sfxEnabled; }

export function setMusicEnabled(v: boolean) {
  musicEnabled = v;
  try { localStorage.setItem(MUSIC_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  if (v) startMusic(); else stopMusic();
}
export function getMusicEnabled(): boolean { return musicEnabled; }

/** Read persisted prefs once on app load. Defaults: SFX on, Music off. */
export function initSoundPrefs() {
  try {
    const s = localStorage.getItem(SFX_KEY);
    const m = localStorage.getItem(MUSIC_KEY);
    if (s !== null) sfxEnabled = s === '1';
    if (m !== null) musicEnabled = m === '1';
  } catch { /* ignore */ }
}

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function play(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.12, freqEnd?: number) {
  if (!sfxEnabled) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + dur);
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + dur);
  } catch { /* silent fallback */ }
}

/** Short click when placing a block */
export function sfxPlace() { play(600, 0.08, 'square', 0.1, 300); }

/** Rising sparkle when a line clears. Pitch rises with combo (Area 1.6). */
export function sfxClear(combo = 0) {
  const f = 1 + Math.min(combo, 5) * 0.08;
  play(400 * f, 0.15, 'sine', 0.15, 800 * f);
  setTimeout(() => play(600 * f, 0.15, 'sine', 0.12, 1200 * f), 80);
}

/** Ascending combo chime */
export function sfxCombo(level: number) {
  const base = 500 + level * 100;
  play(base, 0.2, 'triangle', 0.15, base * 1.5);
  setTimeout(() => play(base * 1.25, 0.15, 'triangle', 0.1, base * 1.8), 100);
}

/** Descending tone for game over */
export function sfxGameOver() {
  play(400, 0.3, 'sawtooth', 0.1, 100);
  setTimeout(() => play(250, 0.4, 'sawtooth', 0.08, 80), 200);
}

/** Bright rising arpeggio for level up */
export function sfxLevelUp() {
  play(523.25, 0.18, 'sine', 0.12, 1046.5);
  setTimeout(() => play(784, 0.22, 'sine', 0.1, 1568), 120);
}

/** Short select click */
export function sfxSelect() { play(800, 0.04, 'square', 0.06, 600); }

/** Low denied buzz for an invalid drop (Area 4.3) */
export function sfxDenied() { play(170, 0.18, 'sawtooth', 0.12, 90); }

/** Descending blip when a clear streak breaks (Area 2 item 4) */
export function sfxStreakLost() { play(300, 0.18, 'sawtooth', 0.1, 130); }

// ── Ambient music: a slow, quiet triangle pad loop. No asset needed. ──
function startMusic() {
  if (!musicEnabled) return;
  const c = getCtx();
  const notes = [220, 277.18, 329.63, 261.63];
  let i = 0;
  stopMusic();
  musicTimer = window.setInterval(() => {
    if (!musicEnabled) { stopMusic(); return; }
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = notes[i % notes.length];
      gain.gain.setValueAtTime(0.035, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.9);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 1.9);
    } catch { /* ignore */ }
    i++;
  }, 2000);
}

function stopMusic() {
  if (musicTimer !== null) { window.clearInterval(musicTimer); musicTimer = null; }
}
