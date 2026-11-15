import { Router } from 'express';
import { isMarket, isTicker, session } from '../auth.js';

const router = Router();

// GET /api/watchlist?market=IN -> ["RELIANCE", "TCS"]
router.get('/', async (req, res) => {
  const { db } = session(res);
  const market = req.query.market;
  if (!isMarket(market)) {
    res.status(400).json({ error: 'market must be IN or US.' });
    return;
  }

  const { data, error } = await db.from('watchlist').select('ticker').eq('market', market).order('created_at');
  if (error) throw error;
  res.json(data.map((row) => row.ticker));
});

// POST /api/watchlist { market, ticker }
router.post('/', async (req, res) => {
  const { db } = session(res);
  const { market, ticker } = req.body ?? {};
  if (!isMarket(market) || !isTicker(ticker)) {
    res.status(400).json({ error: 'Send market (IN or US) and ticker (capital letters).' });
    return;
  }

  // upsert: adding the same stock twice is not an error
  const { error } = await db.from('watchlist').upsert({ market, ticker });
  if (error) throw error;
  res.status(201).json({ market, ticker });
});

// DELETE /api/watchlist/IN/RELIANCE
router.delete('/:market/:ticker', async (req, res) => {
  const { db } = session(res);
  const { market, ticker } = req.params;
  if (!isMarket(market) || !isTicker(ticker)) {
    res.status(400).json({ error: 'Unknown market or ticker.' });
    return;
  }

  const { error } = await db.from('watchlist').delete().eq('market', market).eq('ticker', ticker);
  if (error) throw error;
  res.status(204).end();
});

export default router;
