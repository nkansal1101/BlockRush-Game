import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Backdrop } from '../ui/Backdrop';
import { Block } from '../ui/Block';
import { BubbleText } from '../ui/Bubble';
import { Button as GameButton } from '../ui/Button';
import { Button } from '../components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Switch } from '../components/ui/switch';
import { Text as UIText } from '../components/ui/text';
import { Icon } from '../ui/Icon';
import { theme } from '../ui/theme';
import { Save } from '../game/storage';
import { play } from '../game/sound';

function Floating({ color, size, left, top, delay, rot }: { color: number; size: number; left: string; top: string; delay: number; rot: string }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 2600 + delay, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: 2600 + delay, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={{ position: 'absolute', left: left as any, top: top as any, opacity: 0.5, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) }, { rotate: rot }] }}>
      <Block size={size} color={color} />
    </Animated.View>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <View style={{ width: 70, height: 38, borderRadius: 19, backgroundColor: on ? '#0f6a22' : '#2b2f3c', padding: 3 }}>
      <LinearGradient colors={on ? ['#5df06a', '#25c12f'] : ['#6b7080', '#4a4f5e']} style={{ flex: 1, borderRadius: 16, justifyContent: 'center', alignItems: on ? 'flex-end' : 'flex-start', paddingHorizontal: 3 }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', borderWidth: 2, borderColor: on ? '#a8ffb0' : '#c9ccd6' }} />
      </LinearGradient>
    </View>
  );
}

function SettingsDialog({ save, onSettings, open, onOpenChange }: { save: Save; onSettings: (p: Partial<Save>) => void; open: boolean; onOpenChange: (o: boolean) => void }) {
  const Row = ({ icon, label, on, onChange }: { icon: 'volumeOn' | 'volumeOff' | 'vibrate'; label: string; on: boolean; onChange: (v: boolean) => void }) => (
    <View className="mb-3 flex-row items-center rounded-md bg-muted px-4 py-3">
      <View className="w-11"><Icon name={icon} size={28} color="#d6e4ff" shade="#10236e" /></View>
      <UIText className="flex-1 text-xl font-extrabold">{label}</UIText>
      <Switch checked={on} onCheckedChange={(v) => { play('click'); onChange(v); }} />
    </View>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Sound and vibration</DialogDescription>
        </DialogHeader>
        <Row icon={save.sound ? 'volumeOn' : 'volumeOff'} label="Sound" on={save.sound} onChange={(v) => onSettings({ sound: v })} />
        <Row icon="vibrate" label="Vibration" on={save.haptics} onChange={(v) => onSettings({ haptics: v })} />
        <DialogClose asChild>
          <Button label="Close" variant="secondary" className="mt-1" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export function HomeScreen({ save, onPlayJourney, onPlayClassic, onSettings }: {
  save: Save; onPlayJourney: () => void; onPlayClassic: () => void; onSettings: (patch: Partial<Save>) => void;
}) {
  const { width } = useWindowDimensions();
  const t = Math.min(52, width / 7.5);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <Backdrop>
      <View style={{ flex: 1 }}>
        {/* top bar: settings gear, top-right */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 14, paddingTop: 6, zIndex: 5 }}>
          <Pressable onPress={() => { play('click'); setSettingsOpen(true); }} style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: theme.panelEdge, borderBottomWidth: 4, borderBottomColor: '#0a1647', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="gear" size={30} color="#e6efff" shade="#0a1647" />
          </Pressable>
        </View>

        <Floating color={1} size={44} left="6%" top="8%" delay={0} rot="-12deg" />
        <Floating color={5} size={34} left="78%" top="18%" delay={300} rot="14deg" />
        <Floating color={4} size={30} left="12%" top="66%" delay={600} rot="10deg" />
        <Floating color={7} size={46} left="76%" top="62%" delay={200} rot="-10deg" />

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={require('../../assets/android-icon-foreground.png')} resizeMode="contain" style={{ width: 290, height: 290, marginTop: -40, marginBottom: -34 }} />
          <BubbleText size={t * 1.25} edge="#12296e">BLOCK</BubbleText>
          <View style={{ height: 6 }} />
          <BubbleText size={t * 1.25} color={theme.gold} edge="#a05a08">RUSH</BubbleText>
          <View style={{ height: 40 }} />
          <GameButton label="JOURNEY" sub={`Level ${Math.min(save.unlocked, 50)}`} onPress={onPlayJourney} color={theme.good} style={{ width: 280 }} />
          <View style={{ height: 18 }} />
          <GameButton label="CLASSIC" sub={`Best ${save.best}`} onPress={onPlayClassic} color={theme.blue} style={{ width: 280 }} />
        </View>

        <SettingsDialog save={save} onSettings={onSettings} open={settingsOpen} onOpenChange={setSettingsOpen} />
      </View>
    </Backdrop>
  );
}
