// Design tokens copied from design/sidstocks-prototype.html.
// Both themes have the same keys. Components read colours from the active
// theme (useTheme), never from a hard-coded hex.

export const light = {
  dark: false,
  bg: '#F5F6FB',
  card: '#FFFFFF',
  surf2: '#F6F7FB',
  track2: '#F1F2FA',
  hair: '#F0F1F6',
  bd: '#EAECF4',
  bd2: '#DFE2EE',
  tx: '#0F1123',
  tx2: '#2B2F45',
  mu: '#676C84',
  mu2: '#8F94AB',
  pr: '#5A5BEA',
  prDeep: '#3D3FA8',
  lav: '#ECEDFF',
  pink: '#FFE7EE',
  up: '#15924A',
  dn: '#D93A40',
  upC: '#22A45A', // chart green
  dnC: '#E0455C', // chart red
  upBg: '#E6F6EC',
  dnBg: '#FCEBEC',
  neutralBg: '#F0F1F6',
  selBd: '#C7C8FF',
  base: '#C9CCDA', // dashed baseline in charts
  track: '#EEF0F6',
  neuSeg: '#D5D8E4',
  tipTx: '#FFFFFF',
  cur: '#B5B9CB', // currency suffix
  warn: '#C27C0E',
  info: '#2F6BFF',
  note: '#9A6A08',
  // rotation map quadrants
  qL: '#E6F6EC',
  qI: '#E7EEFF',
  qG: '#FCEBEC',
  qW: '#FFF4DD',
  qOp: 0.6,
  toastBg: '#0F1123',
  toastTx: '#FFFFFF',
  shadow: '0 1px 2px rgba(16,24,40,0.03), 0 10px 30px rgba(90,91,234,0.06)',
  shadow2: '0 8px 20px rgba(15,17,35,0.06)',
};

export type Colors = typeof light;

export const dark: Colors = {
  dark: true,
  bg: '#0A0C16',
  card: '#141726',
  surf2: '#191C2E',
  track2: '#1A1D30',
  hair: '#21253A',
  bd: '#23273C',
  bd2: '#2D3250',
  tx: '#EEF0FA',
  tx2: '#C8CDE2',
  mu: '#A0A6BE',
  mu2: '#737A96',
  pr: '#7C7DFF',
  prDeep: '#B4B5FF',
  lav: '#262A52',
  pink: '#3A2340',
  up: '#3CCB7F',
  dn: '#FF6B72',
  upC: '#2FBF71',
  dnC: '#FF5A6E',
  upBg: 'rgba(60,203,127,0.14)',
  dnBg: 'rgba(255,107,114,0.14)',
  neutralBg: '#1F2338',
  selBd: '#5556C9',
  base: '#3A3F5C',
  track: '#23273C',
  neuSeg: '#2E334D',
  tipTx: '#0A0C16',
  cur: '#5C627D',
  warn: '#E3A33A',
  info: '#6E9BFF',
  note: '#E3A33A',
  qL: '#123425',
  qI: '#16224A',
  qG: '#3A1A22',
  qW: '#3A2E14',
  qOp: 0.75,
  toastBg: '#EEF0FA',
  toastTx: '#0A0C16',
  shadow: '0 12px 30px rgba(0,0,0,0.35)',
  shadow2: '0 8px 20px rgba(0,0,0,0.35)',
};

// Inter for body text, Inter Tight for headings and big numbers.
// With custom fonts the weight comes from the font name, not fontWeight.
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  headMedium: 'InterTight_500Medium',
  headSemi: 'InterTight_600SemiBold',
  headBold: 'InterTight_700Bold',
};
