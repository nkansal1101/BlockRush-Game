import React from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { play, buzz } from '../game/sound';

const SHADES: Record<string, [string, string, string]> = {
  '#39c85a': ['#9bf27a', '#2fb84a', '#12591a'],
  '#3b8ae6': ['#8fe0ff', '#2f7fe0', '#0c3a82'],
  '#f59a2e': ['#ffdc8a', '#f08a1c', '#7d3c0a'],
  '#f0485a': ['#ffa8b2', '#e53b4e', '#701220'],
  '#a14de8': ['#e0b0ff', '#9a3fe0', '#40106a'],
};

export function Button({ label, onPress, color = '#3b8ae6', style, small, sub }: { label: string; onPress: () => void; color?: string; style?: ViewStyle; small?: boolean; sub?: string }) {
  const [light, mid, edge] = SHADES[color] ?? ['#ffffff', color, '#222a60'];
  const h = small ? 44 : sub ? 78 : 62;
  return (
    <Pressable onPress={() => { play('click'); buzz('light'); onPress(); }} style={style}>
      {({ pressed }) => (
        <View style={{ height: h + 8, justifyContent: 'flex-start', transform: [{ translateY: pressed ? 3 : 0 }] }}>
          {/* lip */}
          <View style={{ position: 'absolute', left: 0, right: 0, top: pressed ? 3 : 6, height: h, borderRadius: h * 0.38, backgroundColor: edge }} />
          <View style={{ height: h, borderRadius: h * 0.38, backgroundColor: edge, padding: 2.5 }}>
            <LinearGradient colors={[light, mid]} locations={[0, 0.85]} style={{ flex: 1, borderRadius: h * 0.32, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 }}>
              <View style={{ position: 'absolute', left: 8, right: 8, top: 3, height: '38%', borderRadius: h, backgroundColor: '#fff', opacity: 0.32 }} />
              {sub ? <Text style={{ color: '#ffffffcc', fontSize: 13, fontWeight: '800', marginTop: 28, position: 'absolute', textShadowColor: edge, textShadowRadius: 3 }}>{sub}</Text> : null}
              <Text style={{ color: '#fff', fontSize: small ? 16 : 24, marginBottom: sub ? 14 : 0, fontWeight: '900', letterSpacing: 1, textShadowColor: edge, textShadowRadius: 4, textShadowOffset: { width: 0, height: 3 } }}>{label}</Text>
            </LinearGradient>
          </View>
        </View>
      )}
    </Pressable>
  );
}
