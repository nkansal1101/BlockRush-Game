import './global.css';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PortalHost } from '@rn-primitives/portal';
import { DEFAULT_SAVE, Save, loadSave, persist } from './src/game/storage';
import { LEVELS, LEVEL_COUNT } from './src/game/levels';
import { initSound, settings } from './src/game/sound';
import { GameScreen, Mode, Result } from './src/screens/GameScreen';
import { HomeScreen } from './src/screens/HomeScreen';

type Screen = { name: 'home' } | { name: 'game'; mode: Mode; key: number };

export default function App() {
  const [save, setSave] = useState<Save>(DEFAULT_SAVE);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initSound();
    loadSave().then((s) => {
      settings.sound = s.sound; settings.haptics = s.haptics;
      if (!s.launched) {
        // very first launch: no menu, straight into Classic with the tutorial
        const ns = { ...s, launched: true };
        persist(ns);
        setSave(ns);
        setScreen({ name: 'game', mode: { kind: 'classic', tutorial: !s.classicGuideDone }, key: Date.now() });
      } else {
        setSave(s);
      }
      setReady(true);
    });
  }, []);

  const update = (patch: Partial<Save>) => {
    setSave((prev) => {
      const next = { ...prev, ...patch };
      settings.sound = next.sound; settings.haptics = next.haptics;
      persist(next);
      return next;
    });
  };

  const startLevel = (id: number) => setScreen({ name: 'game', mode: { kind: 'level', level: LEVELS[id - 1] }, key: Date.now() });

  const onFinish = (mode: Mode, r: Result) => {
    setSave((prev) => {
      const next = { ...prev };
      if (mode.kind === 'classic') next.best = Math.max(prev.best, r.score);
      else if (r.won) {
        const id = mode.level.id;
        next.stars = { ...prev.stars, [id]: Math.max(prev.stars[id] ?? 0, r.stars) };
        next.unlocked = Math.max(prev.unlocked, Math.min(LEVEL_COUNT, id + 1));
        next.best = Math.max(prev.best, r.score);
      }
      persist(next);
      return next;
    });
  };

  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {screen.name === 'home' && (
        <HomeScreen save={save} onSettings={update} onPlayJourney={() => startLevel(Math.min(save.unlocked, LEVEL_COUNT))} onPlayClassic={() => setScreen({ name: 'game', mode: { kind: 'classic', tutorial: !save.classicGuideDone }, key: Date.now() })} />
      )}
      {screen.name === 'game' && (
        <GameScreen
          key={screen.key}
          mode={screen.mode}
          best={save.best}
          onExit={() => setScreen({ name: 'home' })}
          onFinish={(r) => onFinish(screen.mode, r)}
          onGuideDone={() => { if (screen.mode.kind === 'classic') update({ classicGuideDone: true }); }}
          onNext={screen.mode.kind === 'level' && screen.mode.level.id < LEVEL_COUNT ? () => startLevel((screen.mode as { level: { id: number } }).level.id + 1) : undefined}
        />
      )}
      <PortalHost />
    </SafeAreaProvider>
  );
}
