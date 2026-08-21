const fs = require('fs');
const p = 'scripts/e2e-order-lifecycle.cjs';
let s = fs.readFileSync(p, 'utf8');

const from = `  const after = await tableCounts();
  const leaks = Object.keys(after).filter((t) => after[t] !== before[t]);
  step('all test data removed', leaks.length === 0,
    leaks.map((t) => \`\${t}: \${before[t]} -> \${after[t]}\`).join(', '));`;

const to = `  // Check for rows still referencing the test accounts, not raw table counts:
  // real users may be on the live site while this runs, and their activity
  // legitimately changes those counts.
  const stillThere = [];
  for (const [table, sql] of [
    ['users', 'SELECT count(*)::int n FROM users WHERE id = ANY($1)'],
    ['orders', 'SELECT count(*)::int n FROM orders WHERE customer_id = ANY($1) OR shopper_id = ANY($1)'],
    ['shopping_requests', 'SELECT count(*)::int n FROM shopping_requests WHERE customer_id = ANY($1)'],
    ['shopper_offers', 'SELECT count(*)::int n FROM shopper_offers WHERE shopper_id = ANY($1)'],
    ['notifications', 'SELECT count(*)::int n FROM notifications WHERE user_id = ANY($1)'],
    ['shopper_locations', 'SELECT count(*)::int n FROM shopper_locations WHERE shopper_id = ANY($1)'],
    ['ratings', 'SELECT count(*)::int n FROM ratings WHERE rated_by = ANY($1) OR rated_user = ANY($1)'],
    ['addresses', 'SELECT count(*)::int n FROM addresses WHERE user_id = ANY($1)'],
  ]) {
    const r = await pool.query(sql, [ids]);
    if (r.rows[0].n > 0) stillThere.push(\`\${table}: \${r.rows[0].n}\`);
  }
  step('all test data removed', stillThere.length === 0, stillThere.join(', '));
  void before;`;

if (!s.includes(from)) throw new Error('leak check not found');
s = s.replace(from, to);
fs.writeFileSync(p, s);
console.log('leak check now scoped to the test accounts');
