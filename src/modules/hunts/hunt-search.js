import { getHuntCode, getHuntTitle, getUnitName, safe } from '../hunts/hunt-data.js';

export function searchHunts(query, hunts) {
  const q = safe(query).trim().toLowerCase();
  if (!q) return hunts;
  return hunts.filter(h =>
    getHuntCode(h).toLowerCase().includes(q) ||
    getHuntTitle(h).toLowerCase().includes(q) ||
    getUnitName(h).toLowerCase().includes(q)
  );
}
