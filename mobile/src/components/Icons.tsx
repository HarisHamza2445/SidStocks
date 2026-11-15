import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

// Icons drawn with the same SVG paths as the prototype.

type IconProps = { size?: number; color: string };

// simple outline icon made of one or more paths
function Line({ d, size = 20, color, width = 2 }: IconProps & { d: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export const BackIcon = (p: IconProps) => <Line d="M15 18l-6-6 6-6" {...p} />;
export const CloseIcon = (p: IconProps) => <Line d="M6 6l12 12M18 6L6 18" width={2.2} {...p} />;
export const ArrowRightIcon = (p: IconProps & { width?: number }) => <Line d="M5 12h14M13 6l6 6-6 6" width={2.6} {...p} />;
export const SparkleIcon = (p: IconProps) => <Line d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" {...p} />;
export const PieIcon = (p: IconProps) => <Line d="M12 3a9 9 0 1 0 9 9h-9z" width={1.8} {...p} />;
export const TrendIcon = (p: IconProps & { width?: number }) => <Line d="M4 16.5l5-5.5 3.6 3.2L20 7M15 7h5v5" width={2.4} {...p} />;

export function SearchIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Circle cx={11} cy={11} r={6.5} />
      <Path d="M16 16l4.5 4.5" strokeLinecap="round" />
    </Svg>
  );
}

export function TradeIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Rect x={4} y={5} width={16} height={6} rx={2} />
      <Rect x={4} y={13} width={16} height={6} rx={2} />
    </Svg>
  );
}

export function StarIcon({ size = 20, color, filled }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function UserIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9}>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6" strokeLinecap="round" />
    </Svg>
  );
}

// small diagonal arrow inside the change badge circle
export function DiagonalArrow({ up }: { up: boolean }) {
  return (
    <Svg width={9} height={9} viewBox="0 0 10 10">
      <Path d={up ? 'M3 7l4-4M4 3h3v3' : 'M3 3l4 4M4 7h3V4'} fill="none" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Tab bar icons: outline when inactive, filled when active.
export type TabName = 'home' | 'sectors' | 'screener' | 'news' | 'journal';

export function TabIcon({ name, active, color }: { name: TabName; active: boolean; color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {name === 'home' && (
        <Path
          d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"
          fill={active ? color : 'none'}
          stroke={active ? 'none' : color}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      )}
      {name === 'sectors' &&
        (active ? (
          <G>
            <Rect x={3} y={3} width={18} height={18} rx={4} fill={color} />
            <Path d="M8 16v-4M12 16V8M16 16v-6" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
          </G>
        ) : (
          <G fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round">
            <Rect x={3.5} y={3.5} width={17} height={17} rx={3} />
            <Path d="M8 16v-4M12 16V8M16 16v-6" />
          </G>
        ))}
      {name === 'screener' &&
        (active ? (
          <G fill={color}>
            <Path d="M11 3.1A9 9 0 1 0 20.9 13H11z" />
            <Path d="M13.5 2.6a9.2 9.2 0 0 1 7.9 7.9h-7.9z" />
          </G>
        ) : (
          <G fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round">
            <Path d="M12 3a9 9 0 1 0 9 9h-9z" />
            <Path d="M15 3.5a9 9 0 0 1 5.5 5.5H15z" />
          </G>
        ))}
      {name === 'news' &&
        (active ? (
          <G>
            <Rect x={3} y={4} width={18} height={16} rx={4} fill={color} />
            <Path d="M7.5 9h9M7.5 12.5h9M7.5 16h5" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
          </G>
        ) : (
          <G fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
            <Rect x={3.5} y={4.5} width={17} height={15} rx={3} />
            <Path d="M7.5 9h9M7.5 12.5h9M7.5 16h5" />
          </G>
        ))}
      {name === 'journal' &&
        (active ? (
          <G fill={color}>
            <Circle cx={12} cy={8} r={4.5} />
            <Path d="M3.6 21.5C4.8 17 8 14.5 12 14.5s7.2 2.5 8.4 7z" />
          </G>
        ) : (
          <G fill="none" stroke={color} strokeWidth={1.8}>
            <Circle cx={12} cy={8} r={4} />
            <Path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6" strokeLinecap="round" />
          </G>
        ))}
    </Svg>
  );
}
