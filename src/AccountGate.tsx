import {useState,useEffect,type ReactNode,type FormEvent,type CSSProperties} from 'react';
import {ArrowRight,Check,Eye,EyeOff,Layers3,LoaderCircle,LogIn,LogOut,Mail,Minus,RefreshCw,ShieldCheck,UserRoundPlus,Users,X} from 'lucide-react';
import {BrandMark} from './Brand';
import {byId,initialComps,portrait,splash} from './data';
import {useSocial} from './SocialPanel';
import {version} from '../package.json';

const showcase=initialComps.find(c=>c.name==='AP Exodia')||initialComps[0];
function WindowControls(){return <div className="entry-window-controls"><span>Zyon {version}</span><button aria-label="Minimizar" onClick={()=>window.zyon?.minimize()}><Minus size={17}/></button><button aria-label="Fechar" onClick={()=>window.zyon?.close()}><X size={17}/></button></div>;}
export function AccountGate({children}:{children:ReactNode}){
 const social=useSocial();
 const [mode,setMode]=useState<'login'|'signup'>('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[handle,setHandle]=useState('');
 const [visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const ready=Boolean(social?.user&&social?.profile);
 useEffect(()=>{if(ready){setPassword('');setEmail('');setName('');setHandle('');setError('');setNotice('');setMode('login');}},[ready]);
 const restoring=social?.status==='connecting'||Boolean(social?.user&&!social?.profile);
 function changeMode(value:'login'|'signup'){setMode(value);setError('');setNotice('');setPassword('');setVisible(false);}
 async function submit(e:FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');try{
  if(!window.zyon)throw new Error('Abra o aplicativo Zyon para entrar na sua conta.');
  const result=await window.zyon.socialAction({type:mode,email,password,handle,displayName:name});
  setPassword('');if(result?.error)setError(result.error);else if(result?.message)setNotice(result.message);
 }catch(e){setError(e instanceof Error?e.message:'Não foi possível conectar. Tente novamente.');}finally{setBusy(false);}}
 if(ready)return children;
 return <main className={`entry-screen entry-${mode}`}>
  <header className="entry-topbar"><div className="entry-brand"><BrandMark/><span>zyon<small>Seu próximo tabuleiro.</small></span></div><WindowControls/></header>
  <div className="entry-layout">
   <section className="entry-world" aria-label="Seu plano no Zyon">
    <div className="entry-art" aria-hidden="true"><img src={splash(showcase.carry)} alt=""/></div>
    <div className="entry-world-copy"><span className="entry-world-label"><span/>Teamfight Tactics, com um plano.</span><h1>Seu próximo<br/><em>tabuleiro.</em></h1><p>Encontre sua comp. Prepare cada nível.<br/>Leve o plano para dentro do jogo.</p></div>
    <div className="entry-board" aria-hidden="true"><div className="entry-board-grid">{Array.from({length:15},(_,i)=><i key={i}/>)}</div><div className="entry-pieces">{showcase.champions.slice(0,7).map((id,i)=><span key={id} className={`entry-piece entry-piece-${i}`} style={{'--piece-index':i} as CSSProperties}><span><img src={portrait(id)} alt=""/></span></span>)}</div><div className="entry-board-caption"><BrandMark/><span><strong>{showcase.name}</strong><small>Um plano. Todas as suas peças.</small></span><Check size={15}/></div></div>
    <div className="entry-features"><span><Layers3 size={17}/>Sua comp, do início ao fim</span><span><Users size={17}/>Jogue e planeje em dupla</span></div>
   </section>
   <section className="entry-access" aria-label="Acesso à conta Zyon">
    <div className="entry-access-heading"><span className="entry-account-mark"><BrandMark/></span><h2>{restoring?'Preparando seu Zyon…':mode==='login'?'Bom ter você por aqui.':'Monte seu próximo capítulo.'}</h2><p>{restoring?'Conectando sua conta com segurança.':mode==='login'?'Entre para continuar com suas comps.':'Crie sua conta e comece a planejar.'}</p></div>
    {restoring ? <div className="entry-restoring" role="status"><LoaderCircle className="entry-spinner" size={27}/><strong>Verificando sua sessão</strong>{social.error&&<><p role="alert">{social.error}</p><button onClick={()=>window.zyon?.socialAction({type:'refresh'})}><RefreshCw size={15}/>Tentar novamente</button><button onClick={()=>window.zyon?.socialAction({type:'logout'})}>Usar outra conta</button></>}</div> : <form className="entry-form" onSubmit={submit}>
     <div className="entry-mode" data-mode={mode}><span aria-hidden="true"/><button type="button" aria-pressed={mode==='login'} disabled={busy} onClick={()=>changeMode('login')}><LogIn size={18}/>Entrar</button><button type="button" aria-pressed={mode==='signup'} disabled={busy} onClick={()=>changeMode('signup')}><UserRoundPlus size={18}/>Criar conta</button></div>
     <div className="entry-fields" key={mode}>
      {mode==='signup'&&<div className="entry-name-fields"><label className="entry-name-field"><span>Seu nome</span><input aria-label="Seu nome no Zyon" autoComplete="nickname" placeholder="Como quer aparecer" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={32} required disabled={busy}/></label><label className="entry-name-field"><span>Nome de usuário</span><input aria-label="Nome de usuário Zyon" autoComplete="username" placeholder="seu_usuario" value={handle} onChange={e=>setHandle(e.target.value.toLowerCase())} pattern="[a-z0-9_]{3,20}" minLength={3} maxLength={20} title="De 3 a 20 letras minúsculas, números ou _" required disabled={busy}/></label></div>}
      <label className="entry-input"><Mail size={19}/><span className="entry-field-body"><span>E-mail</span><input aria-label="E-mail da conta Zyon" autoComplete="email" type="email" placeholder="voce@email.com" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254} required disabled={busy}/></span></label>
      <label className="entry-input"><ShieldCheck size={19}/><span className="entry-field-body"><span>Senha</span><input aria-label="Senha da conta Zyon" autoComplete={mode==='signup'?'new-password':'current-password'} type={visible?'text':'password'} placeholder="Pelo menos 8 caracteres" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={128} required disabled={busy}/></span><button type="button" aria-label={visible?'Ocultar senha':'Mostrar senha'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></label>
     </div>
     {error&&<p role="alert" className="entry-error">{error}</p>}{notice&&<p role="status" className="entry-notice">{notice}</p>}
     <button className="entry-submit" disabled={busy||social?.status==='unconfigured'}>{busy?<><LoaderCircle size={18} className="entry-spinner"/>Conectando…</>:<>{mode==='login'?'Entrar no Zyon':'Criar minha conta'}<ArrowRight size={18}/></>}</button>
     <p className="entry-signup-note">{mode==='signup'?'Cadastro direto. Sem confirmação por e-mail.':'Sua conta acompanha você neste computador.'}</p>
     <p className="entry-switch">{mode==='login'?'Ainda não tem uma conta?':'Já tem uma conta?'} <button type="button" disabled={busy} onClick={()=>changeMode(mode==='login'?'signup':'login')}>{mode==='login'?'Cadastre-se':'Entre aqui'}</button></p>
    </form>}
    <footer className="entry-access-footer"><ShieldCheck size={13}/><span>Sua sessão fica protegida neste dispositivo.</span></footer>
   </section>
  </div>
  <footer className="entry-footer"><span>Feito para acompanhar sua próxima decisão.</span><span>Zyon não é afiliado à Riot Games.</span></footer>
 </main>;
}

export function AccountProfile({onDuo}:{onDuo:()=>void}){
 const s=useSocial(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false);
 async function logout(){setBusy(true);setError('');try{const r=await window.zyon?.socialAction({type:'logout'});if(r?.error)setError(r.error);}catch{setError('Não foi possível sair. Tente novamente.');}finally{setBusy(false);}}
 return <main className="account-profile-page"><div className="account-profile-card"><div className="account-profile-identity"><span>{s.profile?.display_name?.slice(0,1).toUpperCase()}</span><div><h2>{s.profile?.display_name}</h2><p>@{s.profile?.handle}</p></div><span className="account-profile-state">{s.status==='online'?'Conectado':'Reconectando'}</span></div><dl><div><dt>E-mail</dt><dd>{s.user?.email}</dd></div><div><dt>Código de amigo</dt><dd>{s.profile?.friend_code}<button onClick={()=>navigator.clipboard.writeText(s.profile.friend_code).then(()=>setCopied(true)).catch(()=>setError('Não foi possível copiar o código.'))}>{copied?'Copiado':'Copiar'}</button></dd></div></dl><p>Compartilhe seu código para adicionar amigos e sincronizar seus planos em Duplas Dinâmicas.</p><button className="account-duo-action" onClick={onDuo}><Users size={17}/>Abrir amigos e duplas<ArrowRight size={16}/></button><div className="account-signout"><span>Ao sair, o app e o overlay serão bloqueados até o próximo login.</span><button onClick={logout} disabled={busy}><LogOut size={15}/>{busy?'Saindo…':'Sair da conta'}</button></div>{error&&<p role="alert" className="entry-error">{error}</p>}</div></main>;
}
