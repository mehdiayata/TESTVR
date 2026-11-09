// Generate the original WAV sounds used by the VR court. Run with Node in Docker.
import { mkdirSync, writeFileSync } from 'node:fs';

const rate = 22050;
const output = new URL('../public/assets/audio/', import.meta.url);
mkdirSync(output, { recursive: true });

function save(name, samples) {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const data = Buffer.alloc(44 + samples.length * 2);
  data.write('RIFF', 0);
  data.writeUInt32LE(data.length - 8, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i += 1) {
    data.writeInt16LE(Math.round(samples[i] / (peak || 1) * 0.72 * 32767), 44 + i * 2);
  }
  writeFileSync(new URL(name, output), data);
}

let seed = 19;
function noise() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
}

const bounce = new Float32Array(Math.floor(rate * 0.34));
for (let i = 0; i < bounce.length; i += 1) {
  const t = i / rate;
  const hollow = Math.sin(2 * Math.PI * (137 * t - 100 * t * t)) * Math.exp(-18 * t);
  const low = Math.sin(2 * Math.PI * 74 * t) * Math.exp(-22 * t);
  const snap = noise() * Math.exp(-88 * t);
  bounce[i] = 0.72 * hollow + 0.24 * low + 0.16 * snap;
}
save('basketball-bounce.wav', bounce);

const buzzer = new Float32Array(Math.floor(rate * 1.15));
let buzzerSeed = 71;
function buzzerNoise() {
  buzzerSeed = (buzzerSeed * 1664525 + 1013904223) >>> 0;
  return buzzerSeed / 2147483648 - 1;
}
for (let i = 0; i < buzzer.length; i += 1) {
  const t = i / rate;
  const pulseTime = t < 0.38 ? t : t >= 0.48 && t < 0.98 ? t - 0.48 : -1;
  if (pulseTime < 0) continue;
  const duration = t < 0.38 ? 0.38 : 0.5;
  const envelope = Math.min(1, pulseTime / 0.012, (duration - pulseTime) / 0.075);
  const wobble = 187 * t + 2.5 * Math.sin(2 * Math.PI * 8 * t);
  buzzer[i] = envelope * (
    0.62 * Math.sin(2 * Math.PI * wobble)
    + 0.26 * Math.sin(4 * Math.PI * wobble)
    + 0.12 * Math.sin(6 * Math.PI * wobble)
    + 0.07 * buzzerNoise()
  );
}
save('basket-buzzer.wav', buzzer);

const beat = 0.625;
const music = new Float32Array(rate * 16 * beat);

function addTone(start, duration, frequency, volume, attack = 0.03, release = 0.15) {
  const first = Math.floor(start * rate);
  const count = Math.min(Math.floor(duration * rate), music.length - first);
  for (let i = 0; i < count; i += 1) {
    const t = i / rate;
    const envelope = Math.min(1, t / attack, (duration - t) / release);
    music[first + i] += volume * envelope * (
      Math.sin(2 * Math.PI * frequency * t) + 0.16 * Math.sin(4 * Math.PI * frequency * t)
    );
  }
}

const chords = [
  [[220, 261.63, 329.63, 392], 110],
  [[220, 293.66, 349.23, 440], 146.83],
  [[196, 246.94, 293.66, 392], 98],
  [[196, 261.63, 329.63, 392], 130.81],
];
for (let bar = 0; bar < chords.length; bar += 1) {
  const [notes, bass] = chords[bar];
  const start = bar * 4 * beat;
  for (const note of notes) addTone(start, 4 * beat, note, 0.018, 0.18, 0.22);
  for (let pulse = 0; pulse < 4; pulse += 1) {
    addTone(start + pulse * beat, 0.42, bass, 0.075, 0.03, 0.25);
  }
}

for (let pulse = 0; pulse < 16; pulse += 1) {
  const first = Math.floor(pulse * beat * rate);
  for (let i = 0; i < 0.18 * rate; i += 1) {
    const t = i / rate;
    music[first + i] += 0.18 * Math.sin(2 * Math.PI * (90 * t - 65 * t * t)) * Math.exp(-23 * t);
  }
  if (pulse % 2) {
    for (let i = 0; i < 0.15 * rate; i += 1) {
      const t = i / rate;
      music[first + i] += noise() * 0.055 * Math.exp(-30 * t);
    }
  }
}

for (let pulse = 0; pulse < 32; pulse += 1) {
  const first = Math.floor(pulse * beat * rate / 2);
  for (let i = 0; i < 0.055 * rate; i += 1) {
    const t = i / rate;
    music[first + i] += noise() * 0.018 * Math.exp(-58 * t);
  }
}
save('court-ambience.wav', music);
