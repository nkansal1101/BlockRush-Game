import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from './theme';

export function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.bgBottom, overflow: 'hidden' }}>
      <LinearGradient colors={['#3a78ec', '#2a56c8', '#17307e', '#0c1850']} locations={[0, 0.35, 0.75, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      {/* soft light blooms */}
      <View style={{ position: 'absolute', top: '8%', left: '-30%', width: '160%', aspectRatio: 1, borderRadius: 999, backgroundColor: 'rgba(150,200,255,0.10)' }} />
      <View style={{ position: 'absolute', top: '22%', left: '-10%', width: '120%', aspectRatio: 1, borderRadius: 999, backgroundColor: 'rgba(120,180,255,0.10)' }} />
      <SafeAreaView style={{ flex: 1 }}>{children}</SafeAreaView>
    </View>
  );
}
