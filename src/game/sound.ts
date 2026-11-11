import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const files = {
  pick: require('../../assets/sounds/pick.wav'),
  place: require('../../assets/sounds/place.wav'),
  click: require('../../assets/sounds/click.wav'),
  clear: require('../../assets/sounds/clear.wav'),
  combo: require('../../assets/sounds/combo.wav'),
  win: require('../../assets/sounds/win.wav'),
  lose: require('../../assets/sounds/lose.wav'),
  invalid: require('../../assets/sounds/invalid.wav'),
  drop: require('../../assets/sounds/drop.wav'),
};
export type Sfx = keyof typeof files;

const players: Partial<Record<Sfx, AudioPlayer>> = {};
export const settings = { sound: true, haptics: true };

// Create every player up front so the first play isn't lost while the file loads.
export async function initSound() {
  try { await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }); } catch (e) { console.warn('audio mode', e); }
  (Object.keys(files) as Sfx[]).forEach((k) => {
    try { const p = createAudioPlayer(files[k]); p.volume = 1; players[k] = p; } catch (e) { console.warn('audio load', k, e); }
  });
}

export function play(name: Sfx) {
  if (!settings.sound) return;
  const p = players[name];
  if (!p) return;
  try { p.seekTo(0); p.play(); } catch (e) { console.warn('audio play', name, e); }
}

export function buzz(kind: 'light' | 'medium' | 'success' = 'light') {
  if (!settings.haptics) return;
  try {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(kind === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
}
