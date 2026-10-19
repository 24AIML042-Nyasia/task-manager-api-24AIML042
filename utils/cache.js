const NodeCache = require('node-cache');

// stdTTL: 60 seconds before cached data expires automatically
// checkperiod: how often (seconds) the cache checks for expired keys
const cache = new NodeCache({ stdTTL: 60, checkperiod: 10 });

// ── cache key constants ───────────────────────────────────────────────────────
const KEYS = {
  ALL_TASKS: 'all_tasks',
  TASK: (id) => `task_${id}`,
};

// ── hit/miss counters for the debug endpoint ──────────────────────────────────
let hits = 0;
let misses = 0;

function recordHit()  { hits++;   }
function recordMiss() { misses++; }
function getStats()   { return { hits, misses, keys: cache.keys(), keyCount: cache.keys().length }; }

module.exports = { cache, KEYS, recordHit, recordMiss, getStats };
