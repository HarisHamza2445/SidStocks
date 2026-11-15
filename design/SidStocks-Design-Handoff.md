# SidStocks — Design Handoff for Implementation

This document turns the approved prototype into a build spec. Hand it to the coding agent together with `sidstocks-prototype.html`. The HTML is the visual and interaction reference: open it in a browser and click through it. This file holds the exact tokens, components, screens, motion and data contracts.

Everything in the prototype uses **sample data**. The production app must use live data from the backend and keep the same labels about delayed or unavailable data.

---

## 1. Target stack (from the project spec)

| Layer | Choice |
|---|---|
| Mobile | React Native + Expo (SDK latest), TypeScript, Expo Router |
| Styling | NativeWind, or a typed theme object with the tokens below |
| State / data | Zustand, TanStack Query (staleTime 300 s for prices and news) |
| Forms | React Hook Form + Zod |
| Icons | lucide-react-native |
| Backend | Node.js + Express + TypeScript, Prisma, PostgreSQL (SQLite for local dev), JWT auth, WebSocket for ticks |
| Quant engine | Python 3.10+ FastAPI with yfinance, pandas, numpy, ta, feedparser, vaderSentiment |

### Web prototype → React Native library mapping

| Prototype uses | Use in React Native |
|---|---|
| GSAP tweens, staggers, springs | `react-native-reanimated` v3 (`withTiming`, `withSpring`, `entering` layout animations such as `FadeInDown.delay(i*60)`) |
| Three.js light-streak shader on Welcome | `@shopify/react-native-skia` `RuntimeEffect` (port the GLSL in §7 to SkSL). Lighter than WebGL. Fallback: static gradient image |
| SVG area / candle charts with drag tooltip | `@shopify/react-native-skia` paths, or `victory-native` (Skia based). Drag via `react-native-gesture-handler` Pan gesture |
| Slide-to-confirm | Gesture Handler Pan + Reanimated shared value; haptic on success with `expo-haptics` |
| Bottom sheet | `@gorhom/bottom-sheet` |
| Number count-up | Reanimated derived value + `ReText`, or a small `useCountUp` hook |
| Typing effect (AI summary) | Interval-driven substring state; skip if Reduce Motion is on |

Respect the OS **Reduce Motion** setting (`AccessibilityInfo.isReduceMotionEnabled`): set durations to ~0 and disable shaders, loops and the typing effect.

---

## 2. Design tokens

### Theming: Light, Dark, System

- Three appearance options: **System** (the default; follows the phone's light/dark setting live via `useColorScheme()` / `Appearance.addChangeListener`), **Light** and **Dark**.
- Store the choice in AsyncStorage (`sidstocks-theme`). The setting lives in Journal › Appearance (move it to a Profile/Settings screen if you add one).
- Build one typed `theme` object per mode with identical keys. Every component reads colours from the active theme; nothing hard-codes a hex.
- Switching cross-fades colours over about 0.45 s.
- The Welcome screen always uses its own dark artwork, whatever the theme.
- Brand gradients (primary button, logo pill, slider knob) and ticker avatar colours are the same in both modes.

### Colours (Light)

| Token | Hex | Use |
|---|---|---|
| `bg` | `#F5F6FB` | App background |
| `card` | `#FFFFFF` | Cards, sheets, tab bar |
| `border` | `#EAECF4` | Card borders |
| `border2` | `#DFE2EE` | Inputs, outline buttons, circle buttons |
| `text` | `#0F1123` | Primary text |
| `text2` | `#2B2F45` | Body text in cards |
| `muted` | `#676C84` | Labels |
| `muted2` | `#8F94AB` | Captions, axis labels, inactive tabs |
| `primary` | `#5A5BEA` | Accent, active states, chart line |
| `primaryLight` | `#7374F4` | Gradient top |
| `lavender` | `#ECEDFF` | Icon tiles |
| `up` | `#15924A` (text) / `#22A45A` (chart) | Gains |
| `upBg` | `#E6F6EC` | Bullish chip background |
| `down` | `#D93A40` (text) / `#E0455C` (chart) | Losses |
| `downBg` | `#FCEBEC` | Bearish chip background |
| `neutralBg` | `#F0F1F6` | Neutral chip background |
| `warn` | `#C27C0E` | Weakening quadrant, "market closed" dot |
| `info` | `#2F6BFF` | Improving quadrant |
| `tooltip` | `#0F1123` | Chart tooltip pill (white text) |

### Colours (Dark)

| Token | Hex | Notes |
|---|---|---|
| `bg` | `#0A0C16` | App background |
| `card` | `#141726` | Cards, sheet, tab bar |
| `surface2` | `#191C2E` | Order summary box |
| `track` | `#23273C` | Ring tracks, bar tracks, grid lines |
| `hairline` | `#21253A` | List dividers |
| `border` / `border2` | `#23273C` / `#2D3250` | |
| `text` / `text2` | `#EEF0FA` / `#C8CDE2` | |
| `muted` / `muted2` | `#A0A6BE` / `#737A96` | |
| `primary` | `#7C7DFF` | Brighter than light mode, for contrast on dark |
| `primaryDeep` | `#B4B5FF` | Quick-action labels, slider text |
| `lavender` | `#262A52` | Icon tiles |
| `up` / `upChart` / `upBg` | `#3CCB7F` / `#2FBF71` / `rgba(60,203,127,.14)` | |
| `down` / `downChart` / `downBg` | `#FF6B72` / `#FF5A6E` / `rgba(255,107,114,.14)` | |
| `neutralBg` | `#1F2338` | |
| `selectedBorder` | `#5556C9` | Selected index chip |
| `warn` / `info` | `#E3A33A` / `#6E9BFF` | Quadrant colours |
| Rotation map quadrant fills | Leading `#123425`, Improving `#16224A`, Lagging `#3A1A22`, Weakening `#3A2E14` (75% opacity) | Light mode: `#E6F6EC`, `#E7EEFF`, `#FCEBEC`, `#FFF4DD` (60% opacity) |
| Tooltip pill / toast | `#EEF0FA` background, `#0A0C16` text | Inverted from light mode |
| Skeleton | `#1A1D2E ↔ #232740` | |
| Card shadow | `inset 0 1 0 rgba(255,255,255,.03)` plus `0 12 30 rgba(0,0,0,.35)` | Light uses the lavender shadow |

The glow layers on glow cards and white glow buttons stay the same alpha in dark mode, drawn over `card` instead of white.

Gains and losses must never rely on colour alone. Always show a sign (`+` / `−`) and the arrow badge.

### Gradients and glows

- **Primary button:** vertical gradient `#6D6EF6 → #5051E4`, shadow `0 12 26 rgba(90,91,234,.35)`, inner top highlight `rgba(255,255,255,.25)`.
- **White glow button** (Log in, Register, Sell, quick actions): white fill plus a radial lavender glow, `rgba(110,112,255,.35)`, in the top-left corner (ellipse 140×60, centred at 18% / −10%).
- **Glow card** (hero, setup, rotation map, journal balance): white plus a radial `rgba(122,124,255,.30)` in the top-right (260×160 at 88% / −10%) and a faint pink `rgba(255,170,190,.16)` in the bottom-left.
- **Logo pill:** radial `#9C9DFF → #5A5BEA`, 58×42, fully rounded, white trend-arrow glyph.

### Typography

- Headings and display: **Inter Tight** 600–700, letter-spacing −0.02em (welcome headline −0.04em).
- Body and UI: **Inter** 400–600. Every number uses `fontVariant: ['tabular-nums']`.

| Style | Size / line height | Weight |
|---|---|---|
| Welcome H1 | 46 / 1.02 | 700 |
| Welcome H2 | 30 | 500 |
| Hero H1 ("Markets are Up Today") | 38 / 1.04 | 700 |
| Screen title (Sectors, Screener…) | 28 / 1.1 | 700 |
| Section title (Watchlist) | 20 | 600 |
| Big number (index price, balance) | 28–34 | 700 |
| Card title | 15 | 600–700 |
| Body | 14–15 | 400–500 |
| Label | 12.5 | 500 |
| Caption | 11.5 | 400–500 |

### Shape and spacing

- Radii: cards 24, sheets 32 (top only), buttons 18, segmented track 18 / pill 13, inputs 16, chips 999, ticker avatars circular.
- Screen horizontal padding 18. Vertical gap between cards 16. Card padding 18.
- Card shadow: `0 1 2 rgba(16,24,40,.03)` plus `0 10 30 rgba(90,91,234,.06)`.
- Minimum touch target 44×44.

---

## 3. Components

| Component | Spec |
|---|---|
| **Card / GlowCard** | Tokens above. GlowCard adds the glow layers. |
| **Button** | Variants `primary`, `white` (glow). Height 56, radius 18, label 16/600. Press: scale to 0.97, spring back. |
| **PillButton** | Height 36–40, outline `border2`. "See all" has a 22 px primary circle with a white arrow. |
| **CircleButton** | 44–48 px, outline `border2`, white. Back, watchlist star, close. |
| **QuickAction** | Flex 1, height 52, radius 16, white glow, label in `#3D3FA8` plus an icon on the right. |
| **SegmentedControl** | White track with a border and 5 px padding. A sliding white pill (shadow `0 2 10 rgba(30,32,90,.10)` plus a faint lavender glow) moves under the active item with a 0.5 s ease-out. Active label is primary 700. Small variant: 32 px items. |
| **Chip** | Height 26, radius 999, 12/600. Variants bull, bear, neutral. |
| **ChangeBadge** | `+0.64%` plus a 15 px filled circle (up/down colour) holding a white diagonal arrow. |
| **TickerAvatar** | Circle, colour picked by hashing the ticker into a 10-colour palette. White 1–3 letter label. **Never use real company logos** unless properly licensed. |
| **IndexChip** | White card with a border and shadow: avatar, name and ChangeBadge. Selected state: `#C7C8FF` border plus a 3 px `rgba(90,91,234,.12)` ring. |
| **WatchCard** | 176 wide. Avatar, name, ticker; sparkline (144×72) with a black tooltip pill at the period high; price 24/700; ChangeBadge. |
| **AreaChart** | Line 2 px primary (or up/down), area gradient at 22% → 0, optional y-axis (4 nice ticks, 11.5 px `muted2`), dashed baseline for the previous close. **Tooltip:** a dashed vertical line, a 5.5 px dot with a white ring, and a black pill above showing the value. Drag to move it. While dragging, the header price shows the scrubbed value; on release it returns to the live value. |
| **CandleChart** | Up `#22A45A`, down `#E0455C`, 1 px wicks, body width 60% of spacing, 20 EMA overlay in primary. Light horizontal gridlines. |
| **Ring** | Progress circle, 5 px stroke, `#EEF0F6` track, centred label. RSI ring colour: > 70 down, < 30 up, otherwise primary. |
| **SetupLadder** | Vertical price ladder: Target 2, Target 1, Entry, Stop (reversed for shorts). Rows sit at positions proportional to price, with a minimum 32 px gap. Dashed connector in the row colour; price in `text`; note (3R, 1.5R, mid of zone, 1.5× ATR) on the right. The entry zone shows below. |
| **BottomSheet (Paper order)** | Handle, avatar, ticker and price, close button; Buy/Sell segmented control; quantity stepper (step 1, or 10 when qty ≥ 100); summary (order value, stop-loss, risk if stopped, % of paper balance); **slide-to-confirm** (64 px track, 56 px primary knob; release past 85% to confirm, otherwise spring back; tapping the knob also confirms, for accessibility); disclaimer. On confirm, show the success state: green ring and tick draw, a particle burst, "Order filled". Close after 1.5 s and show a Toast. |
| **Toast** | Dark `#0F1123` pill, 18 radius, white text, white "View" button. Spring in from below; auto-hide after 4 s. |
| **Skeleton** | Shimmer blocks `#ECEEF5 ↔ #F7F8FC`, 1.2 s loop. Shown while the first Home load is in flight. |
| **Appearance control** | SegmentedControl System / Light / Dark with a caption: "Following your phone setting · Dark now", "Always light" or "Always dark". |
| **TabBar** | White, top border, 5 tabs: Home, Sectors, Screener, News, Journal. Inactive: outline icon, `muted2` label. Active: **filled** primary icon, `text` label 600, small spring on the icon. Hidden on Stock Detail and Auth. |
| **Market switch** | Small segmented control IN / US in the header. Switching cross-fades the current screen with the other market's data. |

---

## 4. Screens

### 4.1 Welcome
- Full-bleed animated background: near-black at the top fading to indigo `#6566EE` at the bottom, with soft vertical light streaks that pulse slowly (shader in §7). The streaks shift slightly with touch or pointer.
- Small logo and "SidStocks" at the top centre.
- Bottom block, centred: **"Read the Market"** (H1, white with a subtle white→lavender text gradient), **"Trade with a plan"** (H2), a one-line description, then two white glow buttons **Log in** and **Register**.
- Intro motion: background fades in (2.2 s), logo drops in, headline words un-blur upward with a 0.12 s stagger, then the subline, description and buttons rise.
- Leaving: the welcome layer slides up (0.9 s expo in-out) to reveal Auth.

### 4.2 Auth (Log in / Register)
- Circle back button returns to Welcome.
- Title "Welcome back" or "Create your account", plus a one-line subtitle.
- Fields: (Name, register only), Email, Password. Zod rules: name ≥ 2 chars; valid email; password ≥ 8 chars. Show errors under each field in `down` 12.5 px, red border plus ring, and a small shake.
- Primary submit, then the white button "Continue with demo data", then a link to switch mode. Footer disclaimer.
- On success → Home, with the skeleton until the first data load finishes.

### 4.3 Home
1. Header: logo pill and "SidStocks"; IN/US switch; avatar circle (opens Journal / profile).
2. **Hero GlowCard:** sentiment chip (`Bullish · +37/100`) and a "Sample data" tag (in production: "Live" or "Delayed 15 min"); H1 **"Markets are Up / Down / Mixed Today"** from the sentiment label; market status line (`NSE · Open` or `Closed · as of 15:30 IST`, with a coloured dot); a horizontal row of IndexChips (NIFTY 50 / SENSEX / BANK NIFTY, or S&P 500 / NASDAQ / DOW JONES). Tapping a chip selects that index for the chart below.
3. Quick actions: **Screener**, **Sectors**, **Trade** (opens the top setup's stock).
4. Intraday card: index name, live price (count-up), ChangeBadge, "Delayed 15 min" chip, AreaChart with a y-axis and dashed previous-close line, session time labels.
5. **Watchlist** title with "See all" → Screener; horizontal WatchCards → Stock Detail.
6. **AI market summary** card: sparkle tile, text typed in, footnote stating the data source and delay. In production this text is generated from fetched data only, and must say when data is unavailable.
7. **Market breadth:** 3-segment bar (advancing / unchanged / declining) plus advancing, declining, % above 20-DMA.
8. **Top movers:** Gainers / Losers segmented control and a list (avatar, name, ticker, price, ChangeBadge).

### 4.4 Sectors
- Header title "Sectors", subtitle "Rotation & strength · India|US".
- Segmented control 1D / 5D / 1M sets the ranking horizon.
- **Rotation map** (GlowCard): a 4-quadrant chart (Improving top-left, Leading top-right, Lagging bottom-left, Weakening bottom-right). X axis = 1-month return − benchmark; Y axis = 5-day return − benchmark. Each sector is a coloured dot with a label.
- Strongest / Weakest mini cards (top 2 and bottom 2 for the horizon).
- Ranked list: rank, sector name, quadrant label in the quadrant colour, a centred diverging bar, % return.
- Sectors. India: NIFTY IT, BANK, AUTO, PHARMA, FMCG, METAL, ENERGY, REALTY. US: XLK, XLF, XLV, XLE, XLY, XLI, XLP, XLU (add XLB, XLRE, XLC if wanted).

### 4.5 Screener
- Segmented control All / Bullish / Bearish / Neutral; count line.
- Stock cards: avatar, name, ticker, price, ChangeBadge; chips for bias, pattern and setup ("Long setup" / "Short setup" / "Watch only"); RSI ring. Tap → Stock Detail.

### 4.6 Stock Detail
- Header: back (returns to the screen it came from), title "Stock Detail", watchlist star (filled primary when saved; shows a toast).
- Price card: avatar, name, ticker and exchange; price with a currency suffix in `#B5B9CB` (INR / USD); absolute and % change.
- Controls: timeframe 1M / 3M / 6M (22 / 60 / 100 daily bars) and a small Line / Candle toggle.
- Chart: AreaChart with a y-axis (tooltip starts at the period high, drag to scrub) or CandleChart with the 20 EMA.
- Stats grid (3 columns): Open, High, Low, RSI (14), ATR (14), Volume (× 20-day average), 20 EMA, MACD state, Pattern.
- **Signals detected:** list of plain-language signal sentences, plus a bias chip.
- **Educational setup** GlowCard: direction and pattern, reward : risk `1 : 1.5 / 3.0`, SetupLadder, entry zone, risk per share and suggested size at 1% of the paper balance. If there is no setup: "No actionable setup · watch only" and why.
- Disclaimer line.
- Fixed bottom bar: **Buy** (primary) and **Sell** (white glow). Each opens the order sheet with that side pre-selected.

### 4.7 News
- Segmented control All / Bullish / Bearish / Watchlist.
- Tone card: ring with the % bullish, average VADER score, 3-segment bar, counts.
- Article cards: sentiment chip, score, ticker or sector chip, headline (15.5/600), source and time ago. Production: tap opens the article URL in an in-app browser (`expo-web-browser`).

### 4.8 Journal (paper trading)
- Balance GlowCard: paper balance (count-up), open P&L and realised P&L.
- 2×2 stats: win-rate ring, plan-followed ring, expectancy (average R), profit factor.
- Equity curve: AreaChart of cumulative R with a 0 baseline.
- Segmented control Open (n) / History (n).
- **Appearance** card at the bottom (see Theming).
  - Open rows: avatar, ticker, side chip, qty @ entry, current price, stop, unrealised P&L and %, **Close** button. Close at the current price moves the row to History and recomputes the stats.
  - History rows: ticker, side, date, setup, plan followed or broke plan, R chip, P&L.
  - Empty state: "No open positions" with an "Open Screener" button.
- Production additions: post-trade notes, lesson, emotion and discipline score on close (the fields exist in the original SQLite journal schema).

---

## 5. Motion spec

| Moment | Animation |
|---|---|
| Screen change | Old screen: x −40·dir, fade, 0.35 s ease-in. New screen: x +50·dir → 0, fade in, 0.55 s ease-out, 0.08 s delay. dir = tab order direction; Stock Detail always enters from the right and leaves to the right. |
| Card entrance | translateY 28 → 0 and fade, 0.7 s ease-out, 60 ms stagger. After a filter change: 10 px, 0.35 s, 30 ms stagger. |
| List rows | translateX 18 → 0 and fade, 45 ms stagger. |
| Hero headline | Each line slides up from 100% with a 0.1 s stagger, 0.9 s expo-out. |
| Index / watch chips | Slide in from the right, 70 ms stagger. |
| Numbers | Count from 90% of the target to the value, 1.2 s ease-out. |
| Lines | Stroke draws on, 1.4 s ease-in-out; area fades in after 0.6 s; tooltip pops in after 1.2 s. |
| Bars / rings | Grow from 0, 1.0–1.3 s ease-out. |
| Candles | Scale Y from the bottom, total stagger 0.7 s. |
| Rotation dots | Scale from 0 with a slight overshoot, 50 ms stagger. |
| Segmented pill | Slides to the active item, 0.5 s ease-out; content re-renders after 180 ms. |
| Buttons | Press → scale 0.97 in 0.1 s; release → spring back. |
| Tab icon | On activation: scale 0.7 → 1 with a spring overshoot. |
| Sheet | Slide up 0.65 s expo-out with a backdrop fade; contents stagger in 40 ms. |
| Order success | Ring draws in 0.55 s, then the tick; text rises; about 30 particles burst outward over 1–1.5 s; haptic success. |
| Toast | Spring up from 30 px, auto-hide after 4 s. |

---

## 6. Data contracts (backend → app)

The Node backend calls the Python engine and caches responses for about 300 s. Suggested JSON shapes:

```ts
type Market = 'IN' | 'US';

interface IndexQuote { symbol: string; name: string; price: number; prevClose: number; changePct: number; intraday: { t: string; p: number }[]; delayedMinutes: number; asOf: string; }

interface Overview {
  market: Market; status: 'open' | 'closed' | 'pre' | 'post'; asOf: string;
  indices: IndexQuote[];
  sentiment: { score: number; label: 'Bullish' | 'Bearish' | 'Neutral'; trend: number; breadth: number; news: number };
  breadth: { advancers: number; decliners: number; unchanged: number; pctAbove20dma: number; universeSize: number };
  movers: { gainers: Mover[]; losers: Mover[] };
  summary: { text: string; generatedAt: string; sources: string[]; missing: string[] };
}
interface Mover { ticker: string; name: string; price: number; changePct: number }

interface SectorRow { name: string; symbol: string; r1d: number; r5d: number; r1m: number; r3m: number; rs5d: number; rs1m: number; quadrant: 'Leading' | 'Improving' | 'Weakening' | 'Lagging'; momentumScore: number }

interface StockAnalysis {
  ticker: string; name: string; exchange: string; currency: 'INR' | 'USD';
  price: number; change: number; changePct: number;
  bars: { t: string; o: number; h: number; l: number; c: number; v: number }[];
  ema20: number[]; rsi14: number; atr14: number; volRatio: number;
  macd: { line: number; signal: number; hist: number; state: string };
  patterns: string[]; signals: { text: string; direction: 'bullish' | 'bearish' | 'neutral'; weight: number }[];
  bias: 'Bullish' | 'Bearish' | 'Neutral'; netScore: number;
  setup: null | { direction: 'Long' | 'Short'; type: string; entryLow: number; entryHigh: number; entry: number; stop: number; target1: number; target2: number; riskPerShare: number; rr1: number; rr2: number; confidence: 'Low' | 'Medium' | 'High'; reasoning: string[]; warnings: string[] };
}

interface NewsItem { id: string; title: string; url: string; source: string; publishedAt: string; scope: 'Market' | 'Watchlist'; ticker?: string; compound: number; sentiment: 'Bullish' | 'Bearish' | 'Neutral' }

interface PaperTrade { id: string; ticker: string; market: Market; side: 'Buy' | 'Sell'; qty: number; entry: number; stop: number; target1?: number; target2?: number; setupType?: string; status: 'Open' | 'Closed'; openedAt: string; closedAt?: string; exit?: number; pnl?: number; rMultiple?: number; followedPlan?: boolean; discipline?: number; emotion?: string; notes?: string; lesson?: string }
```

### Calculation rules (match the prototype)

- **Sentiment** = 0.5 × index trend + 0.25 × breadth + 0.25 × news. Label: ≥ 0.20 Bullish, ≤ −0.20 Bearish, otherwise Neutral. Show it as an integer out of 100.
  - Index trend per index: average of ±1 across four checks (price > 20 EMA, price > 50 SMA, 20 EMA > 50 SMA, 5-day return > 0). Subtract 0.15 if the VIX / India VIX rose more than 10% in 5 days.
  - Breadth = (advancers − decliners) / (advancers + decliners).
  - News = average VADER compound ÷ 0.3, clipped to ±1.
- **Sector quadrant:** rs1m = r1m − benchmark r1m; rs5d = r5d − benchmark r5d. Leading if both ≥ 0, Improving if rs1m < 0 and rs5d ≥ 0, Weakening if rs1m ≥ 0 and rs5d < 0, otherwise Lagging. Benchmarks: NIFTY 50 (IN), SPY (US).
- **Indicators:** RSI 14 (Wilder), MACD 12/26/9, EMA 20/50, ATR 14 (Wilder), volume spike when volume ≥ 1.5× the previous 20-day average.
- **Candlestick patterns:** Bullish/Bearish Engulfing, Hammer, Shooting Star, Doji, Morning/Evening Star.
- **Signal weights:** golden/death cross 2, engulfing or star 2, hammer or shooting star 1.5, RSI extreme 1.5, MACD cross 1–1.5, trend structure 1, volume spike 1. Patterns on the previous bar count half. A setup appears when |net| ≥ 2.
- **Setup:**
  - Entry zone: close − 0.3 ATR to close (long); close to close + 0.3 ATR (short). Entry = mid of zone.
  - Stop = entry ∓ 1.5 ATR.
  - Target 1 = the 20-day high (long) or low (short) if it lies between 1R and 3R, otherwise entry ± 1.5R.
  - Target 2 = max(entry ± 3R, T1 ± 1R).
  - Size = floor(balance × 1% ÷ risk per share).
- **R multiple** = (exit − entry) × direction ÷ |entry − stop|.

---

## 7. Welcome shader (GLSL source, port to SkSL)

```glsl
uniform float uT;   // seconds
uniform float uIn;  // 0→1 intro fade
uniform float uMx;  // pointer x, −1..1
varying vec2 vUv;   // 0..1, y=0 at bottom
float band(float x,float c,float w){return smoothstep(w,0.,abs(x-c));}
float h1(float n){return fract(sin(n*91.345)*47453.5453);}
void main(){
  vec2 uv=vUv; float x=uv.x+uMx*.03;
  float g=pow(smoothstep(.95,.05,uv.y),1.15);
  vec3 top=vec3(.035,.035,.05), mid=vec3(.13,.13,.36), bot=vec3(.40,.40,.95);
  vec3 base=mix(top,mid,smoothstep(.0,.55,g)); base=mix(base,bot,smoothstep(.45,1.,g));
  float s=0.;
  for(int i=0;i<9;i++){float fi=float(i);float c=fract(.07+fi*.113+.012*sin(uT*.35+fi*1.7));
    float w=.025+.05*h1(fi);float k=.55+.45*sin(uT*.7+fi*2.3);
    float reach=.35+.45*h1(fi+3.1)+.08*sin(uT*.5+fi);
    s+=band(x,c,w)*k*smoothstep(reach,reach-.35,uv.y);}
  float d=0.; for(int j=0;j<6;j++){float fj=float(j);float c=fract(.15+fj*.17+.01*sin(uT*.3+fj*2.));d+=band(x,c,.02+.02*h1(fj+9.));}
  vec3 col=base+vec3(.62,.63,1.)*s*.42*uIn;
  col*=1.-d*.32*smoothstep(.0,.7,g)*uIn;
  col=mix(col,vec3(.47,.47,.98),smoothstep(.3,.0,uv.y)*.55);
  col*=mix(.0,1.,uIn*.9+.1);
  gl_FragColor=vec4(col,1.);
}
```

---

## 8. Content and compliance rules

- Every trade setup carries the disclaimer: *"Algorithmic setup for educational analysis only. Not financial advice or a recommendation to buy or sell."*
- The paper order sheet states: *"Simulated fill at the last price. No real order is sent to any broker."*
- Always show data freshness: "Delayed 15 min", "as of HH:MM", or "Data unavailable" when a source fails. Never show stale data as live.
- The AI summary is built only from fetched numbers and headlines, and lists anything missing.
- No real company logos without a licence; use TickerAvatar.
- Accessibility: 44 px targets, 4.5:1 text contrast, `accessibilityLabel` on icon-only buttons, an accessible confirm on the slider (button press), Reduce Motion respected, sign plus arrow on every change value.

---

## 9. Suggested build order

1. Light and dark theme objects, the System/Light/Dark preference hook, and primitive components (Card, Button, SegmentedControl, Chip, ChangeBadge, TickerAvatar, Ring, Toast, Skeleton).
2. Charts (AreaChart with tooltip, Sparkline, CandleChart) on mock JSON matching §6.
3. Screens in this order: Home → Stock Detail and Order sheet → Screener → Sectors → News → Journal → Welcome and Auth.
4. Wire to the Node API (TanStack Query, 300 s cache, WebSocket ticks for index prices on Home).
5. Motion pass (§5) and the Welcome shader.
6. Accessibility, Reduce Motion and dark-mode contrast pass (check every screen in both themes).
