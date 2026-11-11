import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TILES } from './theme';

// Beveled gradient tile: dark outline, lit top-left edge, soft gloss, darker underside.
function BlockImpl({ size, color, gem = false, opacity = 1 }: { size: number; color: number; gem?: boolean; opacity?: number }) {
  const [light, base, dark, edge] = TILES[(color - 1) % TILES.length];
  const pad = size * 0.025;
  const out = Math.max(1.5, size * 0.05);
  const r = size * 0.24;
  return (
    <View style={{ width: size, height: size, padding: pad, opacity }}>
      {/* underside shadow */}
      <View style={{ position: 'absolute', left: pad + 1, right: pad + 1, bottom: pad - size * 0.04, height: size * 0.5, borderRadius: r, backgroundColor: 'rgba(0,0,0,0.35)' }} />
      <View style={{ flex: 1, borderRadius: r, backgroundColor: edge, padding: out }}>
        <LinearGradient colors={[light, base, dark]} locations={[0, 0.5, 1]} style={{ flex: 1, borderRadius: r * 0.78, overflow: 'hidden' }}>
          {/* bevel: lit top/left, shaded bottom/right */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: r * 0.78, borderWidth: size * 0.05, borderTopColor: 'rgba(255,255,255,0.55)', borderLeftColor: 'rgba(255,255,255,0.3)', borderRightColor: 'rgba(0,0,0,0.18)', borderBottomColor: 'rgba(0,0,0,0.3)' }} />
          {/* gloss */}
          <View style={{ position: 'absolute', left: '12%', top: '9%', width: '56%', height: '24%', borderRadius: size, backgroundColor: '#fff', opacity: 0.45 }} />
          <View style={{ position: 'absolute', left: '14%', top: '14%', width: '14%', height: '14%', borderRadius: size, backgroundColor: '#fff', opacity: 0.85 }} />
          {gem && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: size * 0.42, height: size * 0.42, backgroundColor: '#eaffff', transform: [{ rotate: '45deg' }], borderRadius: size * 0.07, borderWidth: size * 0.06, borderColor: '#3dc3ff' }} />
              <View style={{ position: 'absolute', width: size * 0.12, height: size * 0.12, borderRadius: size, backgroundColor: '#fff', top: '30%', left: '36%' }} />
            </View>
          )}
        </LinearGradient>
      </View>
    </View>
  );
}
export const Block = React.memo(BlockImpl);
