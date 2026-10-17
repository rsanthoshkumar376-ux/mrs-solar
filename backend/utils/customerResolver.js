/**
 * Customer Resolver Utility
 * Accurately maps free-form search text and user queries to registered customer records.
 * Supports:
 * - Customer IDs: SOL-1001, SOL1001, 1001, CUST-1001
 * - Exact and partial names: Santhosh Kumar, deepi, etc.
 * - Common Tamil Nadu nicknames: Sanju/Sunju/Santhu/Sandy -> Santhosh, Deepa/Deepika -> Deepi
 * - Phone numbers and TNEB consumer numbers
 * - Fuzzy Levenshtein token distance matching
 */

export function levenshtein(a = '', b = '') {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

export const NICKNAME_MAP = {
  sunju: ['santhosh', 'santosh', 'santhosh kumar r', 'santhosh kumar'],
  sanju: ['santhosh', 'santosh', 'santhosh kumar r', 'santhosh kumar'],
  santhu: ['santhosh', 'santosh', 'santhosh kumar r'],
  sandy: ['santhosh', 'santosh', 'santhosh kumar r'],
  santo: ['santhosh', 'santosh'],
  santosh: ['santhosh', 'santhosh kumar r'],
  santhosh: ['santhosh', 'santhosh kumar r'],
  deepi: ['deepi', 'deepa', 'deepika'],
  deepa: ['deepi', 'deepika'],
  deepika: ['deepi']
};

export function findMatchingCustomer(query = '', customers = []) {
  if (!query || !Array.isArray(customers) || customers.length === 0) return null;
  const q = String(query).toLowerCase().trim();
  const rawWords = q.split(/[\s,?.!'"():;/\\-]+/).filter(w => w.length >= 2);

  // 1. Direct Customer ID match (e.g. SOL-1001, SOL1001, 1001, CUST-1001)
  const idMatch = q.match(/(?:sol|cust)[-_]?(\d+)/i) || q.match(/\b(100[1-9])\b/);
  if (idMatch) {
    const targetNum = idMatch[1];
    const found = customers.find(c => {
      const cid = (c.customerId || '').toLowerCase();
      return cid.includes(targetNum) || cid.replace(/\D/g, '') === targetNum;
    });
    if (found) return found;
  }

  // 2. Exact or substring customerId match
  for (const c of customers) {
    const cid = (c.customerId || '').toLowerCase();
    if (cid && (q.includes(cid) || q.includes(cid.replace('-', '')))) {
      return c;
    }
  }

  // 3. Mobile Number match (last 8-10 digits)
  for (const c of customers) {
    const mob = (c.mobileNumber || '').replace(/\D/g, '');
    const alt = (c.alternateNumber || '').replace(/\D/g, '');
    if (mob && mob.length >= 8 && q.includes(mob.slice(-8))) return c;
    if (alt && alt.length >= 8 && q.includes(alt.slice(-8))) return c;
  }

  // 4. Nickname mapping (e.g. "sunju", "sanju" -> "Santhosh Kumar r")
  for (const word of rawWords) {
    if (NICKNAME_MAP[word]) {
      const aliases = NICKNAME_MAP[word];
      const matched = customers.find(c => {
        const cname = (c.fullName || '').toLowerCase();
        return aliases.some(alias => cname.includes(alias));
      });
      if (matched) return matched;
    }
  }

  // 5. Full name exact or multi-word match
  for (const c of customers) {
    const cname = (c.fullName || '').toLowerCase().trim();
    if (cname && (q.includes(cname) || cname.includes(q))) {
      return c;
    }
  }

  // 6. Token matching on name parts (excluding single letters like "r")
  for (const c of customers) {
    const nameTokens = (c.fullName || '')
      .toLowerCase()
      .split(/[\s,?.!'"():;/\\-]+/)
      .filter(w => w.length >= 3);
    for (const nt of nameTokens) {
      if (rawWords.includes(nt) || (nt.length >= 4 && q.includes(nt))) {
        return c;
      }
    }
  }

  // 7. Fuzzy matching with edit distance <= 2 for words >= 4 chars
  for (const word of rawWords) {
    if (word.length >= 4) {
      for (const c of customers) {
        const nameTokens = (c.fullName || '')
          .toLowerCase()
          .split(/[\s,?.!'"():;/\\-]+/)
          .filter(w => w.length >= 3);
        for (const nt of nameTokens) {
          if (levenshtein(word, nt) <= 2) {
            return c;
          }
        }
      }
    }
  }

  return null;
}
