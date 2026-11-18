import {Children,useState,type ReactNode} from 'react';
import {ScanLine,Monitor,Download} from 'lucide-react';
export function SettingsLayout({children}:{children:ReactNode}){
 const [page,setPage]=useState(2),panels=Children.toArray(children);
 return <main className="settings-panel settings-layout"><nav aria-label="Categorias de preferências">{([[2,'Leitura da loja',ScanLine],[1,'Overlay e monitor',Monitor],[0,'Atualizações',Download]] as const).map(([id,label,Icon])=><button key={id} aria-pressed={page===id} onClick={()=>setPage(id)}><Icon size={16}/>{label}</button>)}</nav>{panels.map((panel,i)=><div hidden={page!==i} key={i} className="settings-category">{panel}</div>)}</main>;
}
