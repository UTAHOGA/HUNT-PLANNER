const fs = require('fs');

const huntPath = 'C:/DOWNLOADS/test website/HUNT-PLANNER/data/Utah_Hunt_Planner_Master_BuckDeer_Pages_43_53.json';
const boundaryPath = 'C:/DOWNLOADS/test website/HUNT-PLANNER/data/hunt_boundaries.geojson';
const forestPath = 'C:/DOWNLOADS/test website/HUNT-PLANNER/data/usfs-forest-boundaries.geojson';
const outJson = 'C:/DOWNLOADS/test website/HUNT-PLANNER/data/deer-unit-primary-usfs-derived.json';
const outCsv = 'C:/DOWNLOADS/test website/HUNT-PLANNER/data/deer-unit-primary-usfs-derived.csv';

const HUNT_BOUNDARY_NAME_OVERRIDES = {
  DB1503: ['Manti, San Rafael'], DB1533: ['Manti, San Rafael'], DB1504: ['Nebo'], DB1534: ['Nebo'],
  DB1510: ['Monroe'], DB1540: ['Monroe'], DB1506: ['Fillmore'], DB1536: ['Fillmore'],
  EA1220: ['Manti, North', 'Manti, South', 'Manti, West', 'Manti, Central', 'Manti, Mohrland-Stump Flat', 'Manti, Horn Mtn', 'Manti, Gordon Creek-Price Canyon', 'Manti, Ferron Canyon'],
  EA1221: ['Fishlake/Thousand Lakes', 'Fishlake/Thousand Lakes East', 'Fishlake/Thousand Lakes West'],
  EA1258: ['La Sal Mtns', 'Dolores Triangle', 'La Sal, La Sal Mtns-North']
};

function firstNonEmpty(...vals){ for(const v of vals){ if(v !== undefined && v !== null && String(v).trim()) return String(v).trim(); } return ''; }
function norm(v){ return firstNonEmpty(v).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim(); }
function geomRings(geom){
  if(!geom) return [];
  if(geom.type === 'Polygon') return [geom.coordinates];
  if(geom.type === 'MultiPolygon') return geom.coordinates;
  return [];
}
function bboxOfGeom(geom){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const poly of geomRings(geom)){
    for(const ring of poly){
      for(const pt of ring){
        const [x,y]=pt; if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y;
      }
    }
  }
  return [minX,minY,maxX,maxY];
}
function pointInRing(pt, ring){
  let inside=false; const x=pt[0], y=pt[1];
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const xi=ring[i][0], yi=ring[i][1], xj=ring[j][0], yj=ring[j][1];
    const intersect=((yi>y)!==(yj>y)) && (x < ((xj-xi)*(y-yi))/((yj-yi)||1e-12)+xi);
    if(intersect) inside=!inside;
  }
  return inside;
}
function pointInPolygon(pt, poly){
  if(!poly || !poly.length) return false;
  if(!pointInRing(pt, poly[0])) return false;
  for(let i=1;i<poly.length;i++) if(pointInRing(pt, poly[i])) return false;
  return true;
}
function pointInGeom(pt, geom){
  for(const poly of geomRings(geom)) if(pointInPolygon(pt, poly)) return true;
  return false;
}
function bboxIntersects(a,b){ return !(a[2]<b[0] || a[0]>b[2] || a[3]<b[1] || a[1]>b[3]); }
function forestId(name){
  const n = norm(name);
  if(n.includes('manti la sal')) return 'manti-la-sal';
  if(n.includes('fishlake')) return 'fishlake';
  if(n.includes('dixie')) return 'dixie';
  if(n.includes('ashley')) return 'ashley';
  if(n.includes('uinta wasatch cache')) return 'uwc';
  return n;
}

const deer = JSON.parse(fs.readFileSync(huntPath,'utf8')).records;
const boundaries = JSON.parse(fs.readFileSync(boundaryPath,'utf8')).features;
const forests = JSON.parse(fs.readFileSync(forestPath,'utf8')).features.map(f => ({
  name: f.properties.FORESTNAME,
  id: forestId(f.properties.FORESTNAME),
  geometry: f.geometry,
  bbox: bboxOfGeom(f.geometry)
}));
const boundaryByName = new Map();
for(const f of boundaries){
  const name = firstNonEmpty(f.properties.Boundary_Name, f.properties.BOUNDARY_NAME, f.properties.boundary_name);
  const key = norm(name);
  if(!boundaryByName.has(key)) boundaryByName.set(key, []);
  boundaryByName.get(key).push(f);
}
const grouped = new Map();
for(const h of deer){
  const unitName = firstNonEmpty(h.unitName, h.unit_name, h.UnitName);
  const unitCode = firstNonEmpty(h.unitCode, h.unit_code, h.UnitCode);
  const huntCode = firstNonEmpty(h.huntCode, h.HuntNumber, h.hunt_number);
  const species = firstNonEmpty(h.species, h.Species);
  const key = `${species}||${unitName}||${unitCode}`;
  if(!grouped.has(key)) grouped.set(key, { species, unitName, unitCode, huntCodes: [] });
  if(huntCode && !grouped.get(key).huntCodes.includes(huntCode)) grouped.get(key).huntCodes.push(huntCode);
}

const results = [];
for(const row of grouped.values()){
  const overrideNames = row.huntCodes.flatMap(code => HUNT_BOUNDARY_NAME_OVERRIDES[code] || []);
  const boundaryNames = [...new Set([row.unitName, ...overrideNames].filter(Boolean))];
  const matched = [];
  for(const n of boundaryNames){
    const arr = boundaryByName.get(norm(n));
    if(arr) matched.push(...arr);
  }
  const uniq = [...new Map(matched.map(f => [f.properties.BoundaryID || f.properties.Boundary_Name, f])).values()];
  if(!uniq.length){
    results.push({ ...row, boundaryNames: boundaryNames.join(' | '), matchedBoundaryCount: 0, primaryUsfsForestId:'', primaryUsfsForestName:'', secondaryUsfsForestIds:'', coverageBreakdown:'', notes:'No matching hunt boundary feature found' });
    continue;
  }
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const f of uniq){
    const b = bboxOfGeom(f.geometry);
    if(b[0]<minX)minX=b[0]; if(b[1]<minY)minY=b[1]; if(b[2]>maxX)maxX=b[2]; if(b[3]>maxY)maxY=b[3];
  }
  const candidateForests = forests.filter(fr => bboxIntersects([minX,minY,maxX,maxY], fr.bbox));
  const counts = new Map(candidateForests.map(fr => [fr.id, 0]));
  let insideCount = 0;
  const width = maxX-minX, height = maxY-minY;
  const steps = Math.max(18, Math.min(45, Math.ceil(Math.max(width, height) * 20)));
  for(let ix=0; ix<=steps; ix++){
    for(let iy=0; iy<=steps; iy++){
      const x = minX + (width * ix / steps);
      const y = minY + (height * iy / steps);
      const pt = [x,y];
      let inHunt = false;
      for(const f of uniq){ if(pointInGeom(pt, f.geometry)){ inHunt = true; break; } }
      if(!inHunt) continue;
      insideCount++;
      for(const fr of candidateForests){
        if(pointInGeom(pt, fr.geometry)){
          counts.set(fr.id, (counts.get(fr.id) || 0) + 1);
          break;
        }
      }
    }
  }
  const ranked = [...counts.entries()].filter(([,c]) => c > 0).sort((a,b) => b[1]-a[1]);
  const primary = ranked[0]?.[0] || '';
  const primaryName = forests.find(f => f.id === primary)?.name || '';
  const secondary = ranked.slice(1).filter(([,c]) => insideCount ? (c/insideCount) >= 0.1 : false).map(([id]) => id);
  const breakdown = ranked.map(([id,c]) => `${id}:${insideCount ? ((100*c/insideCount).toFixed(1)) : '0.0'}%`).join(' | ');
  results.push({
    ...row,
    huntCodes: row.huntCodes.join(' | '),
    boundaryNames: boundaryNames.join(' | '),
    matchedBoundaryCount: uniq.length,
    primaryUsfsForestId: primary,
    primaryUsfsForestName: primaryName,
    secondaryUsfsForestIds: secondary.join(' | '),
    coverageBreakdown: breakdown,
    notes: insideCount ? '' : 'No sampled interior points found'
  });
}
results.sort((a,b)=> a.unitName.localeCompare(b.unitName) || a.unitCode.localeCompare(b.unitCode));
fs.writeFileSync(outJson, JSON.stringify(results,null,2));
const headers = ['species','unitName','unitCode','huntCodes','boundaryNames','matchedBoundaryCount','primaryUsfsForestId','primaryUsfsForestName','secondaryUsfsForestIds','coverageBreakdown','notes'];
const esc = v => '"' + String(v ?? '').replace(/"/g,'""') + '"';
const csv = [headers.join(',')].concat(results.map(r => headers.map(h => esc(r[h])).join(','))).join('\n');
fs.writeFileSync(outCsv, csv);
console.log(`RESULTS=${results.length}`);
console.log(`OUT_JSON=${outJson}`);
console.log(`OUT_CSV=${outCsv}`);
console.log(csv.split('\n').slice(0,12).join('\n'));
