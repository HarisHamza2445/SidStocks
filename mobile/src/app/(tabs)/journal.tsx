import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CardTitle, Label, Mono, Note, Ring, Small, Tag, toneOf } from '../../components/Bits';
import Button, { CircleButton, PillButton } from '../../components/Button';
import Card from '../../components/Card';
import { AreaChart } from '../../components/Charts';
import { CloseIcon } from '../../components/Icons';
import Screen from '../../components/Screen';
import Seg from '../../components/Seg';
import { Colors, fonts } from '../../constants/theme';
import { fmt, pct, signed, useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { ThemePref, useStyles, useTheme } from '../../context/ThemeContext';
import { short } from '../../lib/api';

export default function JournalScreen() {
  const { c, pref, setPref } = useTheme();
  const s = useStyles(makeStyles);
  const { d, demo, trades, prices, closeTrade } = useApp();
  const { session, signOut } = useAuth();
  const [view, setView] = useState<'pos' | 'hist'>('pos');
  const [formOpen, setFormOpen] = useState(false);

  // open positions with unrealised profit at the latest price
  const open = trades
    .filter((t) => t.status === 'open')
    .map((t) => {
      const now = prices[t.symbol];
      const dir = t.side === 'Buy' ? 1 : -1;
      return { ...t, now, pnl: now ? (now - t.entry) * t.qty * dir : null, movePct: now ? (now / t.entry - 1) * 100 * dir : null };
    });
  const openPnl = open.reduce((sum, p) => sum + (p.pnl ?? 0), 0);

  // stats from closed trades
  const closed = trades.filter((t) => t.status === 'closed');
  const count = closed.length;
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
  const realised = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const grossWin = wins.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const grossLoss = -closed.filter((t) => (t.pnl ?? 0) <= 0).reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const winRate = count ? Math.round((wins.length / count) * 100) : 0;

  // equity curve: running total of profit, oldest trade first
  const equity = [0];
  [...closed].reverse().forEach((t) => equity.push(equity[equity.length - 1] + (t.pnl ?? 0)));

  async function logOut() {
    await signOut();
    router.replace('/');
  }

  const themeCaption =
    pref === 'system' ? `Following your phone setting · ${c.dark ? 'Dark' : 'Light'} now` : pref === 'dark' ? 'Always dark' : 'Always light';

  return (
    <Screen title="Journal" subtitle="Paper trading">
      <Card glow style={{ padding: 20 }}>
        <View style={s.row}>
          <Label>Total profit / loss</Label>
          {demo && <Tag label="Sample data" />}
        </View>
        <Text style={[s.balance, { color: realised >= 0 ? c.up : c.dn }]}>{signed(d, realised)}</Text>
        <Text style={[s.balanceLine, { color: openPnl >= 0 ? c.up : c.dn }]}>{signed(d, openPnl)} open (unrealised)</Text>
      </Card>

      <View style={s.statRow}>
        <Card style={s.ringCard}>
          <Ring value={wins.length} max={count || 1} color={c.upC} size={54} label={`${winRate}%`} />
          <View>
            <Label>Win rate</Label>
            <Small>{wins.length} of {count}</Small>
          </View>
        </Card>
        <Card style={s.numberCard}>
          <Label>Total trades</Label>
          <Text style={s.statNumber}>{count + open.length}</Text>
          <Small>{count} closed · {open.length} open</Small>
        </Card>
      </View>
      <View style={s.statRow}>
        <Card style={s.numberCard}>
          <Label>Avg P/L</Label>
          <Text style={[s.statNumber, { fontSize: 19, color: realised >= 0 ? c.up : c.dn }]} numberOfLines={1} adjustsFontSizeToFit>
            {signed(d, count ? realised / count : 0, 0)}
          </Text>
          <Small>per closed trade</Small>
        </Card>
        <Card style={s.numberCard}>
          <Label>Profit factor</Label>
          <Text style={s.statNumber}>{grossLoss ? (grossWin / grossLoss).toFixed(2) : count ? '∞' : '—'}</Text>
          <Small>gross win ÷ loss</Small>
        </Card>
      </View>

      {equity.length > 2 && (
        <Card pad style={{ paddingBottom: 10 }}>
          <CardTitle>Equity curve</CardTitle>
          <View style={{ marginTop: 6 }}>
            <AreaChart values={equity} width={320} height={150} base={0} tip={equity.length - 1} format={(v) => signed(d, v, 0)} />
          </View>
        </Card>
      )}

      <Button label="Add trade" onPress={() => setFormOpen(true)} />

      <Seg options={['pos', 'hist'] as const} labels={[`Open (${open.length})`, `History (${count})`]} value={view} onChange={setView} />

      <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
        {view === 'pos' && open.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No open positions</Text>
            <Label style={{ maxWidth: 240, lineHeight: 19, textAlign: 'center' }}>Open a stock and tap Buy or Sell to place a paper order.</Label>
            <PillButton onPress={() => router.navigate('/screener')} style={{ marginTop: 4 }}>
              <Text style={s.pillText}>Open Screener</Text>
            </PillButton>
          </View>
        )}
        {view === 'hist' && count === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No closed trades yet</Text>
            <Label>Close a position or add a finished trade.</Label>
          </View>
        )}

        {view === 'pos' &&
          open.map((p, i) => (
            <View key={p.id} style={[s.listRow, { alignItems: 'flex-start' }, i > 0 && s.listRowBorder]}>
              <Mono ticker={short(p.symbol)} />
              <View style={{ flex: 1, gap: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={s.rowTitle}>{short(p.symbol)}</Text>
                  <Tag small label={p.side.toUpperCase()} tone={toneOf(p.side)} />
                </View>
                <Small>
                  {fmt(d, p.qty, 0)} @ {d.cur + fmt(d, p.entry)} · now {p.now ? d.cur + fmt(d, p.now) : '…'}
                </Small>
                {p.stop ? <Small>Stop {d.cur + fmt(d, p.stop)}</Small> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: (p.pnl ?? 0) >= 0 ? c.up : c.dn, fontVariant: ['tabular-nums'] }}>
                  {p.pnl === null ? '—' : signed(d, p.pnl)}
                </Text>
                {p.movePct !== null && <Small>{pct(p.movePct)}</Small>}
                <Pressable onPress={() => closeTrade(p.id)} hitSlop={6} style={s.closeButton} accessibilityRole="button">
                  <Text style={{ fontSize: 12.5, fontFamily: fonts.semi, color: c.tx }}>Close</Text>
                </Pressable>
              </View>
            </View>
          ))}

        {view === 'hist' &&
          closed.map((t, i) => (
            <View key={t.id} style={[s.listRow, i > 0 && s.listRowBorder]}>
              <Mono ticker={short(t.symbol)} />
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={s.rowTitle}>
                  {short(t.symbol)} <Small>{t.side} · {/^\d{4}-/.test(t.date) ? new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : t.date}</Small>
                </Text>
                {t.exit !== null && t.entry > 0 && (
                  <Small>
                    {fmt(d, t.qty, 0)} @ {fmt(d, t.entry)} → {fmt(d, t.exit)}
                  </Small>
                )}
                {(t.notes || t.setup) && <Small>{t.notes || t.setup}</Small>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Tag label={signed(d, t.pnl ?? 0, 0)} tone={(t.pnl ?? 0) > 0 ? 'bull' : 'bear'} />
                {t.r !== null && <Small style={{ marginTop: 3 }}>{(t.r >= 0 ? '+' : '−') + Math.abs(t.r).toFixed(1)}R</Small>}
              </View>
            </View>
          ))}
      </Card>

      <Note style={{ textAlign: 'center' }}>Paper trades only. No real order is sent to any broker.</Note>

      <Card pad>
        <CardTitle>Appearance</CardTitle>
        <Small style={{ marginTop: 2 }}>{themeCaption}</Small>
        <Seg style={{ marginTop: 12 }} options={['system', 'light', 'dark'] as const} labels={['System', 'Light', 'Dark']} value={pref} onChange={(next: ThemePref) => setPref(next)} />
      </Card>

      <Card pad>
        <CardTitle>Account</CardTitle>
        <Small style={{ marginTop: 2 }}>{session ? session.user.email : 'Demo mode · trades are not saved'}</Small>
        <PillButton onPress={logOut} style={{ marginTop: 12, alignSelf: 'flex-start' }}>
          <Text style={s.pillText}>{session ? 'Log out' : 'Log in'}</Text>
        </PillButton>
      </Card>

      <AddTradeForm visible={formOpen} onClose={() => setFormOpen(false)} />
    </Screen>
  );
}

// Manual journal entry: stock, Buy/Sell, entry, exit, quantity, notes.
// Leave exit empty to keep it as an open position.
function AddTradeForm({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const { market, addTrade } = useApp();
  const empty = { stock: '', side: 'Buy' as 'Buy' | 'Sell', entry: '', exit: '', qty: '', notes: '' };
  const [f, setF] = useState(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    const entry = Number(f.entry);
    const exit = f.exit.trim() ? Number(f.exit) : undefined;
    const qty = Number(f.qty);
    const stock = f.stock.trim().toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9&.-]{1,15}$/.test(stock)) return setError('Enter the stock ticker, e.g. RELIANCE or AAPL.');
    if (!(entry > 0)) return setError('Entry price must be a number above 0.');
    if (exit !== undefined && !(exit > 0)) return setError('Exit price must be a number above 0, or leave it empty.');
    if (!(qty > 0) || !Number.isInteger(qty)) return setError('Quantity must be a whole number above 0.');
    setError('');
    setBusy(true);
    // Indian tickers are saved with the NSE suffix so prices can be looked up
    const symbol = market === 'IN' && !/\.(NS|BO)$/.test(stock) ? stock + '.NS' : stock;
    const ok = await addTrade({ symbol, side: f.side, qty, entry, exit, notes: f.notes.trim() || undefined, setup: 'Manual' });
    setBusy(false);
    if (ok) {
      setF(empty);
      onClose();
    }
  }

  const field = (label: string, key: 'stock' | 'entry' | 'exit' | 'qty' | 'notes', placeholder = '', numeric = false) => (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        value={f[key]}
        onChangeText={(v) => setF({ ...f, [key]: v })}
        placeholder={placeholder}
        placeholderTextColor={c.mu2}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        autoCapitalize={key === 'stock' ? 'characters' : 'sentences'}
        autoCorrect={false}
        multiline={key === 'notes'}
        style={[s.input, key === 'notes' && { height: 80, paddingTop: 12, textAlignVertical: 'top' }]}
        accessibilityLabel={label}
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,17,35,0.38)' }}>
        <View style={s.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
            <View style={s.row}>
              <Text style={s.sheetTitle}>Add paper trade · {market === 'IN' ? 'India' : 'US'}</Text>
              <CircleButton size={44} label="Close" onPress={onClose}>
                <CloseIcon size={18} color={c.tx} />
              </CircleButton>
            </View>
            {field('Stock', 'stock', market === 'IN' ? 'e.g. RELIANCE' : 'e.g. AAPL')}
            <Seg options={['Buy', 'Sell'] as const} value={f.side} onChange={(side) => setF({ ...f, side })} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {field('Entry', 'entry', '0.00', true)}
              {field('Exit', 'exit', 'optional', true)}
              {field('Qty', 'qty', '0', true)}
            </View>
            {field('Notes', 'notes', 'Why you took it, what you learned')}
            {error ? <Text style={{ color: c.dn, fontSize: 12.5, fontFamily: fonts.medium }}>{error}</Text> : null}
            <Button label={busy ? 'Saving…' : 'Save trade'} onPress={save} />
            <Note style={{ textAlign: 'center' }}>Paper trade only. Leave exit empty to keep the position open.</Note>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    balance: { fontFamily: fonts.headBold, fontSize: 34, letterSpacing: -0.68, marginTop: 4, marginBottom: 2, fontVariant: ['tabular-nums'] },
    balanceLine: { fontSize: 13.5, fontFamily: fonts.semi, fontVariant: ['tabular-nums'] },
    statRow: { flexDirection: 'row', gap: 12 },
    ringCard: { flex: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    numberCard: { flex: 1, padding: 14 },
    statNumber: { fontFamily: fonts.headBold, fontSize: 24, letterSpacing: -0.48, color: c.tx, fontVariant: ['tabular-nums'] },
    listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    listRowBorder: { borderTopWidth: 1, borderTopColor: c.hair },
    rowTitle: { fontSize: 14.5, fontFamily: fonts.semi, color: c.tx },
    closeButton: { height: 34, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.bd2, backgroundColor: c.card, justifyContent: 'center', marginTop: 6 },
    empty: { paddingVertical: 26, paddingHorizontal: 6, alignItems: 'center', gap: 10 },
    emptyTitle: { fontFamily: fonts.headSemi, fontSize: 17, color: c.tx },
    pillText: { fontSize: 13.5, fontFamily: fonts.semi, color: c.tx },
    sheet: { backgroundColor: c.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, paddingBottom: 36, maxHeight: '90%' },
    sheetTitle: { fontFamily: fonts.headSemi, fontSize: 19, color: c.tx },
    fieldLabel: { fontSize: 13, fontFamily: fonts.semi, color: c.tx2 },
    input: { height: 50, borderRadius: 16, borderWidth: 1, borderColor: c.bd2, backgroundColor: c.surf2, paddingHorizontal: 14, fontSize: 15, fontFamily: fonts.regular, color: c.tx },
  });
