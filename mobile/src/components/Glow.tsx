import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

// One soft radial glow: where its centre sits (0-1 of the box), its size and colour.
export type GlowSpot = {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rgb: string; // "122,124,255"
  alpha: number;
  fade: number; // where the glow reaches zero (0-1 of the radius)
};

// Glow presets from the prototype CSS.
export const cardGlow: GlowSpot[] = [
  { x: 0.88, y: -0.1, rx: 260, ry: 160, rgb: '122,124,255', alpha: 0.3, fade: 0.7 },
  { x: 0, y: 1.1, rx: 200, ry: 140, rgb: '255,170,190', alpha: 0.16, fade: 0.7 },
];
export const buttonGlow: GlowSpot[] = [{ x: 0.18, y: -0.1, rx: 140, ry: 60, rgb: '110,112,255', alpha: 0.38, fade: 0.75 }];
export const quickGlow: GlowSpot[] = [{ x: 0.2, y: -0.2, rx: 120, ry: 50, rgb: '110,112,255', alpha: 0.3, fade: 0.75 }];

// Fills its parent with soft glows. The parent needs overflow: 'hidden'.
export function Glow({ spots }: { spots: GlowSpot[] }) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {size.w > 0 && (
        <Svg width={size.w} height={size.h}>
          <Defs>
            {spots.map((spot) => {
              const id = glowId(spot);
              return (
                <RadialGradient key={id} id={id} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={`rgb(${spot.rgb})`} stopOpacity={spot.alpha} />
                  <Stop offset={spot.fade} stopColor={`rgb(${spot.rgb})`} stopOpacity={0} />
                </RadialGradient>
              );
            })}
          </Defs>
          {spots.map((spot) => (
            <Ellipse key={glowId(spot)} cx={size.w * spot.x} cy={size.h * spot.y} rx={spot.rx} ry={spot.ry} fill={`url(#${glowId(spot)})`} />
          ))}
        </Svg>
      )}
    </View>
  );
}

function glowId(spot: GlowSpot) {
  return `glow-${spot.rgb.replace(/,/g, '-')}-${spot.alpha * 100}`;
}

// Top-to-bottom gradient that fills its parent (primary button, slider knob).
export function VerticalGradient({ from, to }: { from: string; to: string }) {
  const id = `vg-${from.slice(1)}-${to.slice(1)}`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
