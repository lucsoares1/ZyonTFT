// HUD portraits are composed for small faces; splash art is kept for banners.
import fs from 'node:fs/promises';
const cache = '.research/cdragon.json';
const source = 'https://raw.communitydragon.org/latest/cdragon/tft/pt_br.json';
const data = JSON.parse(await fs.readFile(cache, 'utf8').catch(async () => {
  const response = await fetch(source);
  if (!response.ok) throw Error(`Catalog: ${response.status}`);
  return response.text();
}));
const set = data.setData.find(s => s.number === 18 && s.mutator === 'TFTSet18');
const catalog = JSON.parse(await fs.readFile('src/generated/catalog.json', 'utf8'));
await fs.mkdir('public/assets/portraits', { recursive: true });
const assets = [];
for (let start = 0; start < catalog.champions.length; start += 8) {
  await Promise.all(catalog.champions.slice(start, start + 8).map(async champion => {
    const entry = set.champions.find(c => c.apiName === champion.id);
    if (!entry?.tileIcon?.startsWith('assets/')) throw Error(`Missing portrait: ${champion.id}`);
    const url = `https://raw.communitydragon.org/latest/game/${entry.tileIcon.toLowerCase().replace(/\.tex$/, '.png')}`;
    const response = await fetch(url);
    if (!response.ok) throw Error(`${response.status}: ${url}`);
    const file = `public/assets/portraits/${champion.id}.png`;
    await fs.writeFile(file, Buffer.from(await response.arrayBuffer()));
    assets.push({ id: champion.id, file, source: url, owner: 'Riot Games', purpose: 'HUD portrait' });
  }));
}
await fs.writeFile('public/assets/portraits-provenance.json', JSON.stringify({
  retrieved: new Date().toISOString(), catalogSource: source,
  assets: assets.sort((a, b) => a.id.localeCompare(b.id)),
}, null, 2));
console.log(`${assets.length} face portraits downloaded; splash artwork preserved.`);
