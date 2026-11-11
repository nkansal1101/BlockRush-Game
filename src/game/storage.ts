import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Save {
  unlocked: number;
  stars: Record<number, number>;
  best: number;
  sound: boolean;
  haptics: boolean;
  guideDone: boolean;
  launched: boolean; // app has been opened before (first launch goes straight to Classic)
  classicGuideDone: boolean; // Classic tutorial completed once
}
export const DEFAULT_SAVE: Save = { unlocked: 1, stars: {}, best: 0, sound: true, haptics: true, guideDone: false, launched: false, classicGuideDone: false };
const KEY = 'blockrush.save.v1';

export async function loadSave(): Promise<Save> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SAVE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SAVE;
}
export async function persist(s: Save) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}
