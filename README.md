# Block Rush (React Native, no game engine)

Single-player block puzzle for Android. Pure React Native views, PanResponder drag-and-drop, Animated effects.

- `src/game/engine.ts`  board, shapes, placing, line clears, scoring
- `src/game/levels.ts`  50 deterministic levels (score / lines / gems goals); raise `LEVEL_COUNT` to add more
- `src/screens/`        Home, LevelSelect, GameScreen
- `assets/sounds/`      original synthesized sound effects

Run on a phone: `npx expo start` and scan the QR with Expo Go.
Build an APK: `npx expo prebuild --platform android && cd android && ./gradlew assembleRelease` (needs JDK 17 + Android SDK),
or `npx eas build -p android --profile preview`.
