# Captura e retorno ao jogo

O guia e as marcações da loja são janelas separadas do TFT. Elas não usam mais `setContentProtection(true)`: essa proteção as excluía de capturas do Windows, incluindo compartilhamento de monitor. No compartilhamento, selecione a tela/monitor; capturar apenas a janela do jogo pode continuar omitindo janelas externas.

Ao retornar ao jogo confirmado, ambos os overlays recuperam a camada `screen-saver`, são restaurados quando minimizados e elevados sem chamar `focus`. Os sinais de presença também corrigem a ordem de janelas já consideradas visíveis pelo Windows. Alt+Tab para outro programa, ocultação manual, falta de autenticação e fim de partida continuam ocultando os overlays; a correção não libera o overlay fora do jogo nem reinicia cópias/contexto.

O observador Windows reavalia o processo em cada amostra. Antes, uma falha de consulta ficava armazenada até mudar o PID em primeiro plano, podendo impedir a volta do overlay. Se o observador encerrar ou deixar de responder, o processo principal o reinicia; mensagens de um observador substituído são ignoradas.

## Validação local

- `npm test`: 153 testes aprovados, incluindo recuperação após falha transitória com o mesmo PID e restauração das duas janelas.
- `node scripts/verify-overlay-regressions.mjs`: perfil e conta de teste isolados; nove ciclos de encolher/restaurar nos cantos, doze ciclos de foco com perda deliberada de topmost, captura Windows da janela superior e OCR Windows sobre imagem com quatro medalhas/molduras realmente renderizadas. Nomes, nível, ouro, detecção de substituição e slots vazios permanecem iguais ao quadro sem marcações.
- `node scripts/verify-presence-recovery.mjs`: observador Windows real em perfil isolado, sem conta ou partida pessoal; verifica heartbeat estável e reinício após encerramentos controlados.
- `npm run build`: aprovado. O aviso existente de tamanho de bundle não impede o build.

Não foi executado TeamSpeak 6 nem validada uma partida no PC do amigo. Tela cheia exclusiva pode não compor janelas externas; se o overlay continuar aparecendo só durante Alt+Tab, testar TFT em janela sem bordas e registrar o modo de exibição, monitor, escala do Windows e `startup.log` antes de atribuir o problema ao OCR. Não há injeção no jogo. As alterações são locais e não publicam um instalador automaticamente.
