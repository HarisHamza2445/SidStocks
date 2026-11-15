import { Router } from 'express';
import { isMarket, isPositive, isTicker, session } from '../auth.js';

// Paper trades only. Nothing here talks to a broker.
const router = Router();

// GET /api/trades?market=IN -> open and closed paper trades, newest first
router.get('/', async (req, res) => {
  const { db } = session(res);
  const market = req.query.market;
  if (!isMarket(market)) {
    res.status(400).json({ error: 'market must be IN or US.' });
    return;
  }

  const { data, error } = await db.from('trades').select('*').eq('market', market).order('opened_at', { ascending: false });
  if (error) throw error;
  res.json(data);
});

// POST /api/trades { market, ticker, side, qty, entry, stop?, setup?, notes?, exit? }
// Without exit: opens a paper position. With exit: saves a finished trade (manual journal entry).
router.post('/', async (req, res) => {
  const { db } = session(res);
  const { market, ticker, side, qty, entry, stop, setup, notes, exit } = req.body ?? {};

  const sideOk = side === 'Buy' || side === 'Sell';
  const stopOk = stop === undefined || stop === null || isPositive(stop);
  const exitOk = exit === undefined || exit === null || isPositive(exit);
  if (!isMarket(market) || !isTicker(ticker) || !sideOk || !isPositive(qty) || !Number.isInteger(qty) || !isPositive(entry) || !stopOk || !exitOk) {
    res.status(400).json({ error: 'Send market, ticker, side (Buy or Sell), qty (whole number) and entry. stop and exit must be above 0 if sent.' });
    return;
  }

  const row: Record<string, unknown> = {
    market, ticker, side, qty, entry,
    stop: stop ?? null,
    setup: typeof setup === 'string' ? setup.slice(0, 60) : null,
    notes: typeof notes === 'string' ? notes.slice(0, 500) : null,
  };
  if (isPositive(exit)) {
    const direction = side === 'Buy' ? 1 : -1;
    Object.assign(row, {
      status: 'closed',
      exit,
      pnl: (exit - entry) * qty * direction,
      r_multiple: isPositive(stop) ? Number((((exit - entry) * direction) / (Math.abs(entry - stop) || 1)).toFixed(2)) : null,
      closed_at: new Date().toISOString(),
    });
  }

  const { data, error } = await db.from('trades').insert(row).select().single();
  if (error) throw error;
  res.status(201).json(data);
});

// POST /api/trades/:id/close { exit } -> closes the position at the exit price
router.post('/:id/close', async (req, res) => {
  const { db } = session(res);
  const exit = req.body?.exit;
  if (!isPositive(exit)) {
    res.status(400).json({ error: 'Send exit (price above 0).' });
    return;
  }

  const { data: trade, error: findError } = await db.from('trades').select('*').eq('id', req.params.id).maybeSingle();
  if (findError) throw findError;
  if (!trade) {
    res.status(404).json({ error: 'Trade not found.' });
    return;
  }
  if (trade.status === 'closed') {
    res.status(409).json({ error: 'Trade is already closed.' });
    return;
  }

  // Buy profits when the price rises, Sell when it falls.
  // R multiple = profit per share / risk per share (entry to stop).
  const direction = trade.side === 'Buy' ? 1 : -1;
  const pnl = (exit - trade.entry) * trade.qty * direction;
  const rMultiple = trade.stop ? ((exit - trade.entry) * direction) / (Math.abs(trade.entry - trade.stop) || 1) : null;

  const { data, error } = await db
    .from('trades')
    .update({ status: 'closed', exit, pnl, r_multiple: rMultiple === null ? null : Number(rMultiple.toFixed(2)), closed_at: new Date().toISOString() })
    .eq('id', trade.id)
    .select()
    .single();
  if (error) throw error;
  res.json(data);
});

export default router;
