import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface Props {
  progress: number; // 0–1
  color?: string;
  height?: number;
}

export default function ProgressBar({ progress, color = colors.primary, height = 6 }: Props) {
  const clamped = Math.min(1, Math.max(0, progress));
  const barColor = clamped >= 1 ? colors.danger : color;

  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: barColor, height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: '#2a2a2a',
    borderRadius: 99,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: 99,
  },
});
