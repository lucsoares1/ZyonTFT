import fs from 'node:fs';import {spawnSync} from 'node:child_process';import path from 'node:path';
const [version,...notes]=process.argv.slice(2);
const run=(cmd,args,capture=false)=>{const result=spawnSync(cmd,args,{encoding:'utf8',stdio:capture?'pipe':'inherit',windowsHide:true});if(result.status!==0)throw new Error(capture?result.stderr:`Falhou: ${cmd} ${args[0]}`);return result.stdout?.trim();};
try{
 if(!/^\d+\.\d+\.\d+$/.test(version||''))throw new Error('Use: npm run release -- 0.17.1 "O que mudou nesta versão"');
 const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),parts=v=>v.split('.').map(Number),old=parts(pkg.version),next=parts(version);let greater=false;for(let i=0;i<3;i++){if(next[i]!==old[i]){greater=next[i]>old[i];break;}}if(!greater)throw new Error('A versão deve ser maior que a atual.');
 if(run('git',['status','--porcelain'],true))throw new Error('Salve as alterações em um commit antes de lançar.');
 const branch=run('git',['branch','--show-current'],true);if(!branch)throw new Error('Abra uma branch antes de lançar.');
 const remote=run('git',['remote','get-url','origin'],true);if(!/github\.com[/:]lucsoares1\/ZyonTFT(?:\.git)?$/.test(remote))throw new Error('O origin precisa apontar para lucsoares1/ZyonTFT.');
 if(run('git',['tag','--list',`v${version}`],true))throw new Error('Essa tag já existe.');
 run('git',['fetch','origin',branch]);
 const upstream=run('git',['rev-parse',`origin/${branch}`],true);if(run('git',['rev-parse','HEAD'],true)!==upstream)throw new Error('Sincronize a branch com o GitHub antes de lançar.');
 const npmCli=process.env.npm_execpath;if(!npmCli||!path.isAbsolute(npmCli))throw new Error('Execute pelo comando npm run release.');
 run(process.execPath,[npmCli,'version',version,'--no-git-tag-version']);
 const log=fs.readFileSync('CHANGELOG.md','utf8'),entry=`## ${version}\n\n${notes.join(' ').trim()||'Melhorias e correções no Zyon TFT.'}\n\n`;fs.writeFileSync('CHANGELOG.md',log.replace(/^# Zyon TFT\s*\n/,'# Zyon TFT\n\n'+entry));
 run('git',['add','package.json','package-lock.json','CHANGELOG.md']);run('git',['commit','-m',`Release ${version}`]);run('git',['tag',`v${version}`]);
 run('git',['push','--atomic','origin',`HEAD:refs/heads/${branch}`,`refs/tags/v${version}`]);
 console.log(`A versão ${version} está sendo preparada no GitHub Actions. Ela só aparece no app depois que o build e a publicação terminarem: https://github.com/lucsoares1/ZyonTFT/actions`);
}catch(error){console.error(error.message);process.exitCode=1;}
