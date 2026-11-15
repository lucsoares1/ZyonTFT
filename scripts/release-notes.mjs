import fs from 'node:fs/promises';
const {version}=JSON.parse(await fs.readFile('package.json','utf8')),text=await fs.readFile('CHANGELOG.md','utf8');
const entry=text.split(/^## /m).find(s=>s.startsWith(`${version}\n`));
if(!entry)throw new Error(`Faltam notas da versão ${version} em CHANGELOG.md`);
await fs.mkdir('.runtime',{recursive:true});await fs.writeFile('.runtime/release-notes.md',entry.slice(entry.indexOf('\n')+1).trim()+'\n');
