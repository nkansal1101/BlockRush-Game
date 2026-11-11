import React from 'react';
import { Text, TextStyle, View } from 'react-native';

// Chunky outlined "bubble" lettering made by stacking offset copies of the text.
export function BubbleText({ children, size = 32, color = '#fff', edge = '#1a3c9c', style }: { children: React.ReactNode; size?: number; color?: string; edge?: string; style?: TextStyle }) {
  const o = Math.max(2, size * 0.07);
  const base: TextStyle = { fontSize: size, fontWeight: '900', letterSpacing: size * 0.02, ...style };
  const offs: [number, number][] = [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, o], [-o, o], [o, -o], [0, o * 2]];
  return (
    <View>
      {offs.map(([x, y], i) => (
        <Text key={i} style={[base, { position: 'absolute', color: edge, left: x, top: y }]}>{children}</Text>
      ))}
      <Text style={[base, { color }]}>{children}</Text>
    </View>
  );
}
