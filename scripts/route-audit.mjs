import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function findRoutes(dir) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) results.push(...findRoutes(full));
      else if (e.name === 'route.ts') results.push(full);
    }
  } catch {}
  return results;
}

const routes = findRoutes('app/api');
let total = 0, auth = 0, zod = 0, rate = 0;
const noAuth = [], publicOk = [], needsZod = [], needsRate = [];
const PUBLIC = /health|webhook|contact|callback|[/]auth[/]|status|metrics/i;

for (const f of routes) {
  const content = readFileSync(f, 'utf8');
  const rel = f.replace(/\\/g, '/').replace('app/api/', '');
  const hasAuth = /withRouteProtection|getCurrentUser|requireAuth|auth\(\)|supabase\.auth|requireRole|requireAuthV2/.test(content);
  const hasZod  = /z\.(object|string|number|enum|array)|\.parse\(|\.safeParse\(/.test(content);
  const hasRate = /rateLimit|rate-limit|rateLimiter|upstash/.test(content);
  total++;
  if (hasAuth) auth++;
  if (hasZod)  zod++;
  if (hasRate) rate++;
  if (!hasAuth) {
    if (PUBLIC.test(rel)) publicOk.push(rel);
    else noAuth.push(rel);
  }
  if (!hasZod)  needsZod.push(rel);
  if (!hasRate) needsRate.push(rel);
}

const pct = (n) => `${n} (${(n/total*100).toFixed(0)}%)`;
console.log(`Total: ${total} | Auth: ${pct(auth)} | Zod: ${pct(zod)} | Rate: ${pct(rate)}`);
console.log(`\nP0 - Needs auth (${noAuth.length} routes):`);
noAuth.sort().forEach(p => console.log('  ' + p));
console.log(`\nPublic OK (no auth needed) (${publicOk.length}):`);
publicOk.sort().forEach(p => console.log('  ' + p));

const summary = {
  totals: { total, auth, zod, rate },
  noAuth: noAuth.sort(),
  publicOk: publicOk.sort(),
  needsZod: needsZod.sort(),
  needsRate: needsRate.sort(),
};
writeFileSync('route-audit-summary.json', JSON.stringify(summary, null, 2));
console.log('\nFull summary -> route-audit-summary.json');
