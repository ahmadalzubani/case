import { Howl } from 'howler';
import { useEffect, useState } from 'react';

/**
 * Tactical Skeuomorphic Audio Engine for "CASE — الغرفة 407"
 * 
 * Clean Generative Ambient Soundscape (Web Audio API):
 * - Gentle Night Wind / Room Tone: Lowpass filtered noise with organic breathing LFO.
 * - Antique Clock Ticking: Precision mechanical escapement pulses (Tick / Tock) every second.
 * - 100% Free of any external musical melodies or background instruments (No bgm.mp3).
 * - Full preservation of tactile interaction SFX (click, paper, pindrop, typewriter blips, rubber stamps).
 */

let clickHowl: Howl | null = null;
let paperHowl: Howl | null = null;
let pindropHowl: Howl | null = null;

let isMutedState = false;
let isPlayingState = false;
let hasUserInteracted = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // Ignore listener errors
    }
  });
}

function getAudioBase(): string {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) {
      return import.meta.env.BASE_URL.replace(/\/$/, '');
    }
  } catch {
    // fallback for SSR / test runners
  }
  return '';
}

let sharedAudioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      sharedAudioCtx = new AudioCtxClass();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Generative Clean Ambient Soundscape Manager
 * Synthesizes atmospheric room tone (wind & room resonance) and antique clock ticking
 * without any external musical recordings or instruments.
 */
class AmbientSoundscapeManager {
  private isRunning = false;
  private noiseNode: AudioBufferSourceNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private ambientGain: GainNode | null = null;
  private clockInterval: ReturnType<typeof setInterval> | null = null;
  private tickToggle = false;

  start() {
    if (typeof window === 'undefined') return;
    if (this.isRunning) {
      if (isMutedState) {
        this.setMuted(false);
      }
      return;
    }

    const ctx = getAudioCtx();
    if (!ctx) return;

    try {
      // Master ambient gain node
      this.ambientGain = ctx.createGain();
      this.ambientGain.gain.setValueAtTime(isMutedState ? 0 : 0.08, ctx.currentTime);
      this.ambientGain.connect(ctx.destination);

      // 1. Gentle Night Wind & Room Tone (Filtered White Noise Loop)
      const sampleRate = ctx.sampleRate;
      const bufferDuration = 5; // 5 seconds seamless looped atmosphere
      const bufferSize = sampleRate * bufferDuration;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.7;
      }

      this.noiseNode = ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      // Lowpass filter for deep muffled room tone
      this.filterNode = ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(180, ctx.currentTime);
      this.filterNode.Q.setValueAtTime(0.85, ctx.currentTime);

      // Slow organic LFO modulating air flow subtly
      this.lfoOsc = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      this.lfoOsc.type = 'sine';
      this.lfoOsc.frequency.setValueAtTime(0.09, ctx.currentTime); // ~11 second breath cycle
      lfoGain.gain.setValueAtTime(45, ctx.currentTime); // 135Hz to 225Hz gentle sway
      this.lfoOsc.connect(lfoGain);
      lfoGain.connect(this.filterNode.frequency);

      this.noiseNode.connect(this.filterNode);
      this.filterNode.connect(this.ambientGain);

      this.lfoOsc.start();
      this.noiseNode.start();

      // 2. Antique Clock Escapement Ticking (1 tick every second)
      this.startClock(ctx, this.ambientGain);

      this.isRunning = true;
      isPlayingState = true;
      notify();
    } catch (e) {
      console.warn('Ambient soundscape start error:', e);
    }
  }

  private startClock(ctx: AudioContext, destination: AudioNode) {
    this.stopClock();
    // Immediate first tick
    this.triggerTick(ctx, destination);
    this.clockInterval = setInterval(() => {
      this.triggerTick(ctx, destination);
    }, 1000);
  }

  private stopClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  private triggerTick(ctx: AudioContext, destination: AudioNode) {
    if (isMutedState || !this.isRunning) return;
    try {
      const now = ctx.currentTime;
      this.tickToggle = !this.tickToggle;
      const baseFreq = this.tickToggle ? 1850 : 1550;

      // High escapement mechanical tick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, now + 0.015);
      gain.gain.setValueAtTime(0.038, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.02);

      // Low wooden clock cabinet resonance
      const bodyOsc = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      bodyOsc.type = 'sine';
      bodyOsc.frequency.setValueAtTime(this.tickToggle ? 260 : 220, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(70, now + 0.035);
      bodyGain.gain.setValueAtTime(0.018, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(destination);
      bodyOsc.start(now);
      bodyOsc.stop(now + 0.04);
    } catch {
      // AudioContext safeguard
    }
  }

  stop() {
    if (!this.isRunning) return;
    const ctx = getAudioCtx();
    if (ctx && this.ambientGain) {
      try {
        this.ambientGain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      } catch {}
    }
    setTimeout(() => {
      try {
        this.noiseNode?.stop();
        this.noiseNode?.disconnect();
        this.lfoOsc?.stop();
        this.lfoOsc?.disconnect();
        this.filterNode?.disconnect();
        this.ambientGain?.disconnect();
      } catch {}
      this.noiseNode = null;
      this.lfoOsc = null;
      this.filterNode = null;
      this.ambientGain = null;
    }, 200);

    this.stopClock();
    this.isRunning = false;
    isPlayingState = false;
    notify();
  }

  setMuted(muted: boolean) {
    const ctx = getAudioCtx();
    if (ctx && this.ambientGain) {
      try {
        this.ambientGain.gain.setTargetAtTime(muted ? 0 : 0.08, ctx.currentTime, 0.05);
      } catch {}
    }
  }

  playing(): boolean {
    return this.isRunning && !isMutedState;
  }
}

const ambientManager = new AmbientSoundscapeManager();

/**
 * Howl-compatible proxy for legacy callers that expects getBgm().
 * Completely eliminates bgm.mp3 while preserving compatibility.
 */
export function getBgm(): Howl {
  const fakeHowl = {
    playing: () => ambientManager.playing(),
    play: () => {
      ambientManager.start();
      return 1 as unknown as number;
    },
    pause: () => {
      ambientManager.stop();
      return fakeHowl as unknown as Howl;
    },
    stop: () => {
      ambientManager.stop();
      return fakeHowl as unknown as Howl;
    },
    mute: (m: boolean) => {
      isMutedState = m;
      ambientManager.setMuted(m);
      notify();
      return fakeHowl as unknown as Howl;
    },
    volume: (_v?: number) => 0.25,
    on: () => fakeHowl as unknown as Howl,
    once: () => fakeHowl as unknown as Howl,
    off: () => fakeHowl as unknown as Howl,
    unload: () => {},
  };
  return fakeHowl as unknown as Howl;
}

export function playBgm() {
  if (isMutedState) return;
  ambientManager.start();
}

export function pauseBgm() {
  ambientManager.stop();
}

export function stopBgm() {
  ambientManager.stop();
}

export function toggleAudio() {
  if (isMutedState || !ambientManager.playing()) {
    isMutedState = false;
    ambientManager.setMuted(false);
    ambientManager.start();
  } else {
    isMutedState = true;
    ambientManager.setMuted(true);
    ambientManager.stop();
  }
  notify();
}

export function isAudioMuted(): boolean {
  return isMutedState;
}

/**
 * Play sound effect: click.mp3
 * Used for main navigation buttons and actions.
 */
export function playClickSound() {
  if (isMutedState) return;
  if (!clickHowl) {
    clickHowl = new Howl({
      src: [`${getAudioBase()}/sounds/click.mp3`],
      volume: 0.45,
    });
  }
  clickHowl.play();
}

/**
 * Play sound effect: paper.mp3
 * Used when opening the DetailDrawer for evidence, suspects, and case files.
 */
export function playPaperSound() {
  if (isMutedState) return;
  if (!paperHowl) {
    paperHowl = new Howl({
      src: [`${getAudioBase()}/sounds/paper.mp3`],
      volume: 0.5,
    });
  }
  paperHowl.play();
}

/**
 * Play sound effect: pindrop.mp3
 * Used when adding a new link/connection in the connections board.
 */
export function playPindropSound() {
  if (isMutedState) return;
  if (!pindropHowl) {
    pindropHowl = new Howl({
      src: [`${getAudioBase()}/sounds/pindrop.mp3`],
      volume: 0.55,
    });
  }
  pindropHowl.play();
}

const lastSoundTimestamps: Record<string, number> = {};

/**
 * Cooldown throttle to prevent speaker clipping and distortion from rapid clicks / triggers
 */
export function throttleSound(key: string, cooldownMs: number): boolean {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const last = lastSoundTimestamps[key] || 0;
  if (now - last < cooldownMs) {
    return false;
  }
  lastSoundTimestamps[key] = now;
  return true;
}

/**
 * Play synthesized noir heartbeat thump (used when credibility is lost or high tension)
 */
export function playHeartbeatSound() {
  if (isMutedState) return;
  if (!throttleSound('heartbeat', 240)) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(65, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.65, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  } catch {
    // AudioContext safeguard
  }
}

/**
 * Play dramatic confrontation sting / glass break tone (used when suspect breaks)
 */
export function playDramaticSting() {
  if (isMutedState) return;
  if (!throttleSound('dramatic_sting', 600)) return;
  playPindropSound();
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(120, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.7);
    osc2.frequency.setValueAtTime(660, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.85);
    osc2.stop(ctx.currentTime + 0.85);
  } catch {
    // Graceful fallback to pindrop sound
  }
}

/**
 * Play warning buzzer (insufficient optical resolution or invalid operation)
 */
export function playWarningBuzzer() {
  if (isMutedState) return;
  if (!throttleSound('warning_buzzer', 180)) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {
    playClickSound();
  }
}

/**
 * Play low-volume dialogue teletype / typewriter blip sound
 * Used during character-by-character dialogue reveals.
 */
export function playDialogueBlipSound() {
  if (isMutedState) return;
  if (!throttleSound('dialogue_blip', 45)) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Subtle pitch variation for organic detective typewriter feel
    const randomFreq = 540 + (Math.random() * 80 - 40);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(randomFreq, now);
    osc.frequency.exponentialRampToValueAtTime(randomFreq * 0.7, now + 0.02);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  } catch {
    // Graceful silent fallback
  }
}

/**
 * Play tactile paper rustle / slide sound (used when picking up / starting card drag)
 */
export function playCardPickupSound() {
  if (isMutedState) return;
  if (!throttleSound('card_pickup', 80)) return;
  playPaperSound();
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.045);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3200;
    filter.Q.value = 1.4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  } catch {
    // Non-blocking
  }
}

/**
 * Play satisfying tactile cork stab / thud sound (used when pin spring-settles on drag release)
 */
export function playCorkThudSound() {
  if (isMutedState) return;
  if (!throttleSound('cork_thud', 80)) return;
  playPindropSound();
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.075);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  } catch {
    // Non-blocking
  }
}

/**
 * Play heavy Eureka rubber stamp slam mixed with low cinematic bass thud
 * Triggered on verified contradiction breakthrough
 */
export function playEurekaSound() {
  if (isMutedState) return;
  if (!throttleSound('eureka_stamp', 400)) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) {
      playDramaticSting();
      return;
    }
    const now = ctx.currentTime;

    // 1. Cinematic Sub Bass Boom (75Hz -> 26Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(80, now);
    subOsc.frequency.exponentialRampToValueAtTime(26, now + 0.55);
    subGain.gain.setValueAtTime(0.85, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.7);

    // 2. Heavy Physical Rubber Stamp Slam Transient
    const slapOsc = ctx.createOscillator();
    const slapGain = ctx.createGain();
    slapOsc.type = 'triangle';
    slapOsc.frequency.setValueAtTime(240, now);
    slapOsc.frequency.exponentialRampToValueAtTime(50, now + 0.11);
    slapGain.gain.setValueAtTime(0.75, now);
    slapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    slapOsc.connect(slapGain);
    slapGain.connect(ctx.destination);
    slapOsc.start(now);
    slapOsc.stop(now + 0.15);

    // 3. Crisp Wood/Cork Paper Thwack (Bandpass noise slap)
    const bufSize = Math.floor(ctx.sampleRate * 0.08);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.22));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1900;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
  } catch {
    playDramaticSting();
  }
}

/**
 * Play subtle pencil scratch or dull hollow thud (used when hypothesis testing is rejected)
 */
export function playTentativeRejectSound() {
  if (isMutedState) return;
  if (!throttleSound('tentative_reject', 220)) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) {
      playWarningBuzzer();
      return;
    }
    const now = ctx.currentTime;
    // Dull hollow wood thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.13);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);

    // Subtle pencil friction scratch
    const bufSize = Math.floor(ctx.sampleRate * 0.08);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2500;
    filter.Q.value = 2.8;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
  } catch {
    playWarningBuzzer();
  }
}

/**
 * Play heavy authoritarian courtroom gavel hit / false accusation strike
 */
export function playErrorSound() {
  if (isMutedState) return;
  if (!throttleSound('error_gavel', 300)) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) {
      playDramaticSting();
      return;
    }
    const now = ctx.currentTime;
    // Deep heavy wooden gavel block resonance
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.38);
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);

    // Hard mallet strike snap
    const bufSize = Math.floor(ctx.sampleRate * 0.06);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.22));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.55, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
  } catch {
    playDramaticSting();
  }
}

export const playGavelSound = playErrorSound;

export function setupAutoPlayOnInteraction() {
  if (typeof window === 'undefined') return;

  const handleFirstInteraction = () => {
    if (hasUserInteracted) return;
    hasUserInteracted = true;

    // Remove listener after first interaction
    window.removeEventListener('click', handleFirstInteraction);
    window.removeEventListener('keydown', handleFirstInteraction);
    window.removeEventListener('touchstart', handleFirstInteraction);

    if (!isMutedState) {
      ambientManager.start();
    }
  };

  window.addEventListener('click', handleFirstInteraction, { passive: true });
  window.addEventListener('keydown', handleFirstInteraction, { passive: true });
  window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
}

export function useAudio() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const isPlaying = ambientManager.playing();

  return {
    isPlaying,
    isMuted: isMutedState || !isPlaying,
    toggle: toggleAudio,
    play: playBgm,
    pause: pauseBgm,
    playClick: playClickSound,
    playPaper: playPaperSound,
    playPindrop: playPindropSound,
    playCardPickup: playCardPickupSound,
    playCorkThud: playCorkThudSound,
    playEurekaSound: playEurekaSound,
    playTentativeReject: playTentativeRejectSound,
    playDialogueBlip: playDialogueBlipSound,
  };
}
