import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

// Friendly yellow cube mascot, drawn from Views.
export function Mascot({ size = 120, cheer = false }: { size?: number; cheer?: boolean }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: cheer ? 380 : 900, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: cheer ? 380 : 900, useNativeDriver: true }),
    ])).start();
  }, [cheer]);
  const s = size, arm = s * 0.2;
  const eye = (left: boolean) => (
    <View style={{ position: 'absolute', top: s * 0.28, [left ? 'left' : 'right']: s * 0.2, width: s * 0.22, height: s * 0.26, borderRadius: s, backgroundColor: '#fff', borderWidth: 2, borderColor: '#8a5a08', alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{ width: s * 0.11, height: s * 0.14, borderRadius: s, backgroundColor: '#3b2208', marginBottom: s * 0.03 }} />
    </View>
  );
  const hand = (left: boolean) => (
    <Animated.View style={{ position: 'absolute', top: s * 0.12, [left ? 'left' : 'right']: -arm * 0.6, width: arm, height: arm * 1.5, borderRadius: arm, backgroundColor: '#ffd23f', borderWidth: 2, borderColor: '#b8820a', transform: [{ rotate: a.interpolate({ inputRange: [0, 1], outputRange: left ? ['-25deg', '5deg'] : ['25deg', '-5deg'] }) }] }} />
  );
  return (
    <Animated.View style={{ width: s * 1.1, height: s * 1.1, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, cheer ? -10 : -4] }) }, { rotate: '-4deg' }] }}>
      <View style={{ width: s, height: s }}>
        {hand(true)}{hand(false)}
        <View style={{ flex: 1, borderRadius: s * 0.24, backgroundColor: '#b8820a', padding: 3 }}>
          <View style={{ flex: 1, borderRadius: s * 0.2, backgroundColor: '#ffd23f', overflow: 'hidden' }}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '45%', backgroundColor: '#fff3a0', opacity: 0.6 }} />
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '26%', backgroundColor: '#e9a812', opacity: 0.8 }} />
            {eye(true)}{eye(false)}
            <View style={{ position: 'absolute', left: s * 0.3, right: s * 0.3, top: s * 0.56, height: s * 0.2, borderBottomLeftRadius: s, borderBottomRightRadius: s, backgroundColor: '#7a2410', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
              <View style={{ width: '60%', height: '45%', backgroundColor: '#ff7a5a', borderTopLeftRadius: s, borderTopRightRadius: s }} />
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
