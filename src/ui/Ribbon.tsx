import React from 'react';
import { Text, View } from 'react-native';

export function Ribbon({ text, width }: { text: string; width: number }) {
  return (
    <View style={{ width, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: 2, top: 10, width: 36, height: 36, backgroundColor: '#5a1db0', transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', right: 2, top: 10, width: 36, height: 36, backgroundColor: '#5a1db0', transform: [{ rotate: '45deg' }] }} />
      <View style={{ width: width - 36, minHeight: 50, borderRadius: 8, backgroundColor: '#9b3dfc', borderBottomWidth: 5, borderBottomColor: '#6b21bd', paddingHorizontal: 18, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: '#c585ff', opacity: 0.4, borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16, textAlign: 'center', textShadowColor: '#4a1590', textShadowRadius: 3, textShadowOffset: { width: 0, height: 2 } }}>{text}</Text>
      </View>
    </View>
  );
}
