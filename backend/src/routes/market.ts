import { NextFunction, Request, Response, Router } from 'express';
import { overview, screener, search, sectors, stock } from '../market.js';
import { news } from '../news.js';

// Public market data (no login needed). Delayed data from Yahoo Finance.
const router = Router();

const marketParam = (req: Request) => (req.query.market === 'US' ? 'US' : 'IN');

// Yahoo down and nothing cached: tell the app the data is unavailable
const wrap = (fn: (req: Request) => Promise<unknown>) => async (req: Request, res: Response, _next: NextFunction) => {
  try {
    res.json(await fn(req));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    res.status(502).json({ error: 'Market data unavailable right now. Try again in a minute.' });
  }
};

router.get('/overview', wrap((req) => overview(marketParam(req))));
router.get('/sectors', wrap((req) => sectors(marketParam(req))));
router.get('/news', wrap((req) => news(marketParam(req))));
router.get('/screener', wrap((req) => screener(marketParam(req))));

router.get('/stock/:symbol', (req, res, next) => {
  if (!/^[A-Z0-9.&^-]{1,25}$/.test(req.params.symbol)) {
    res.status(400).json({ error: 'Unknown symbol.' });
    return;
  }
  return wrap(() => stock(req.params.symbol))(req, res, next);
});

router.get('/search', (req, res, next) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 2 || q.length > 40) {
    res.json([]);
    return;
  }
  return wrap(() => search(q))(req, res, next);
});

export default router;
