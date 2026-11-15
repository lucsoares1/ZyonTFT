import {useState} from 'react';
import {UserPlus,Send,X,ArrowRight} from 'lucide-react';
export function SocialNotifications({social,onOpen}:{social:any;onOpen:()=>void}) {
  const [dismissed,setDismissed]=useState<Record<string,boolean>>({});
  const notice=social?.notices?.find((n:any)=>!dismissed[`${social.user?.id}:${n.key}`]);
  if(!notice)return null;
  const Icon=notice.kind==='friend'?UserPlus:Send;
  return <aside className="social-notification" role="status" aria-label="Nova notificação social">
    <span className="social-notification-icon"><Icon size={20}/></span>
    <div><strong>{notice.kind==='friend'?'Novo pedido de amizade':'Convite para jogar'}</strong>
    <p>{notice.name}{notice.kind==='friend'?' quer adicionar você.':' quer jogar em dupla com você.'}</p>
    <button onClick={onOpen}>Ver {notice.kind==='friend'?'pedido':'convite'}<ArrowRight size={14}/></button></div>
    <button className="social-notification-dismiss" aria-label="Dispensar notificação" onClick={()=>setDismissed(prev=>({...prev,[`${social.user?.id}:${notice.key}`]:true}))}><X size={15}/></button>
  </aside>;
}
