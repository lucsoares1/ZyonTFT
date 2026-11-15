# Zyon 0.16.0 — contas, duplas e planejador do overlay

O executável portátil pode ser enviado para outro PC Windows x64. Ambos os jogadores usam a mesma versão e uma conta própria. Node, Python e chaves administrativas não são necessários. O OCR é local; contas, amizade e planos usam o projeto Supabase ZyonTFT. Internet é necessária para sincronizar; o planejamento solo permanece local.

## Fluxo

1. Abra Duplas Dinâmicas e crie sua conta com e-mail, nome, usuário e senha. A confirmação por e-mail foi desativada no projeto a pedido de Lucas. O cadastro direto foi verificado pela interface, sem envio de mensagem.
2. Copie seu código de amigo. O outro jogador adiciona o código; o destinatário aceita a amizade.
3. Convide o amigo e aceite o convite no outro app. A dupla permanece até encerrar; cada participante escolhe sua comp.
4. Durante o jogo, Planejar no overlay apresenta todos os campeões do set. Os escolhidos estão marcados; adicione, retire ou restaure a composição. A fonte original continua preservada. Pedidos podem ser desativados ou definidos para 1★/2★/3★.
5. O outro jogador recebe o plano por Realtime. A loja distingue compras próprias, envio à dupla e necessidade dos dois. Somente pedidos pendentes de uma partida ativa e com atualização recente geram avisos de envio.

O envio efetivo é feito pelo usuário através do Canhão de Cooperação do TFT. O Zyon não comanda o jogo. O OCR registra compras da loja; transferências pelo Canhão e vendas precisam de correção de cópias na aba Partida. Alterar essa contagem sincroniza os pedidos. Não alegar detecção de recebimentos, disponibilidade do Canhão ou leitura do tabuleiro.

O fim confirmado da partida limpa as compras e os pedidos ativos. Alt+Tab continua ocultando as janelas nativas sem apagar a sessão. Sem atualização do parceiro por 45 segundos, os avisos de envio ficam suspensos. Os inícios confirmados dos dois clientes devem ocorrer na mesma janela de 3 minutos; abrir um dos apps muito depois do início exige reiniciar o acompanhamento em ambos. Não há identificação de lobby Riot compartilhada nesta versão.

## Implementação e isolamento

- `electron/social-service.cjs`: SDK Supabase apenas no processo principal, sessão cifrada com Electron safeStorage/DPAPI, sem tokens/senhas no renderer. Se criptografia não estiver disponível, a sessão fica somente em memória.
- `electron/cloud-config.json`: URL e chave **publicável**, apropriadas ao cliente; nenhuma chave service-role é distribuída.
- `supabase/migrations/202611150001_duo.sql`: cinco tabelas com RLS e escrita por RPC autorizada. Pedidos e convites exigem aceite do destinatário. Planos só são lidos por participantes de uma dupla ativa; não existe diretório público de perfis/e-mails.
- `src/duo-plans.mjs`: edição reversível, normalização de payload, limites de elenco e metas, pedidos ligados às cópias da sessão. Campeões retirados não reaparecem na seleção adaptativa.
- O planejador só altera a comp; nunca altera nível, ouro, compras ou sessão OCR.
- A auditoria do Supabase sinaliza os oito RPCs SECURITY DEFINER acessíveis a authenticated. Isso é intencional: cada um valida auth.uid, participação/destinatário e mantém search_path vazio; escrita direta está revogada. O projeto também informa proteção de senhas vazadas desativada. Nenhuma política RLS ausente foi reportada.

## Validação

- 70 testes unitários aprovados.
- `verify-duo.mjs`: dois clientes Electron isolados conectados ao Supabase real, amizade/convite/aceite, edição e Realtime, medalha de envio, cancelamento/restauração de pedidos e encerramento de dupla. Executado na fonte e no pacote. Atualizações observadas em 832 ms e 691 ms; não é garantia de latência.
- Terceira conta não relacionada não consegue consultar planos alheios, aceitar convite de terceiros ou escrever diretamente.
- `verify-signup.mjs`: cadastro real pela UI do pacote com entrada imediata, criação de perfil, sessão cifrada restaurada após reiniciar e logout.
- `verify-team-levels.mjs`, `verify-match-end.mjs`, `verify-reimagined.mjs`: navegação por níveis, fim de partida no mesmo PID, temas e atalhos continuam funcionando em perfis isolados.
- Capturas em `design/review/0.16.0/duo`. As lojas e o HUD dos testes usam fixtures; não houve teste desta versão em dois computadores físicos nem envio real no TFT.
- Sessões de teste são encerradas ao fim. Quando a administração do Supabase não está disponível, os IDs das contas descartáveis ficam registrados localmente para limpeza posterior.

Sem certificado de assinatura de código configurado. A compilação funciona, mas o Windows pode pedir confirmação ao abrir um executável baixado.

## Notificações e controles do overlay (0.17.7)

Pedidos recebidos e convites aparecem em um aviso global mesmo fora de Duplas Dinâmicas, com ação para abrir a lista. O contador lateral permanece até aceitar ou recusar. Com o Zyon sem foco, uma notificação do Windows abre Duplas ao clicar; sua exibição depende das permissões de notificações do sistema. Reatualizações não repetem o aviso nativo.

O botão Só avisos da loja reduz o painel a um pequeno controle Painel; leitura, medalhas de compra/envio e sincronização continuam. Clique em Painel ou use Ctrl+Shift+G para voltar. Arraste o cabeçalho (ou a alça do controle pequeno) para posicionar. A posição é salva e limitada ao monitor escolhido, preservando o acesso quando a resolução muda.

A identificação do processo Windows usa AppUserModelID `local.zyon.tft`, igual ao instalador NSIS, antes de criar notificações. Referência: [Electron — notificações no Windows](https://www.electronjs.org/docs/latest/tutorial/notifications#windows). Falhas de exibição são registradas sem conteúdo de solicitações no startup.log.
