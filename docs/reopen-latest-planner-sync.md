# Reabertura, atualização direta e plano da dupla

## Guia

Abertura manual pelo botão ou atalho agora abre o guia imediatamente, inclusive com o programa em primeiro plano, sem depender de uma nova leitura OCR. Reabrir desfaz os modos recolhido/só loja, preservando a partida e as cópias. Essa prévia manual não libera marcações da loja fora do jogo: as medalhas continuam exigindo foco e confirmação reais. Depois de retomar uma partida confirmada, vale novamente a ocultação automática por Alt+Tab. Falha de registro de Ctrl+Shift+O tenta Ctrl+Shift+Y, registra o conflito no log e mostra o atalho disponível no rodapé.

## Atualizações

O serviço não fica mais preso a uma oferta intermediária em memória. Reconsulta o provider antes de baixar e antes de instalar; se o instalador já baixado ficou desatualizado, baixa a oferta mais recente antes de prosseguir. Falha nessa consulta impede instalar silenciosamente o pacote antigo. Permanecem SHA-512, bloqueio de downgrade, adiamento durante partida e consentimento explícito para instalar. Clientes antigos precisam receber esta correção para mudar esse comportamento.

## Planejador e Dupla

O planejador principal usa `plan:commit`, autenticado e exclusivo da janela principal, para gravar comp, elenco, itens, estrelas e comp ativa em uma operação. A comp editada passa a ser a usada pelo overlay e compartilhada. Pedidos explícitos e sinergias permanecem preservados; o elenco anterior deixa de fornecer compras implícitas. A revisão protege inclusive o catálogo salvo contra publicações atrasadas do renderer. A confirmação devolve a comp canônica inteira ao app, em vez de somente seu ID, evitando restaurar a pré-feita durante a confirmação.

## Evidências

- 158 testes unitários aprovados e build local aprovado.
- `verify-reopen-planner-duo.mjs`: dois clientes Electron e contas descartáveis, serviço remoto real, OCR Windows sobre fixture. Remover/adicionar campeão, renomear e definir 3 estrelas no planejador principal atualiza o outro cliente e suas medalhas nativas. Reabrir depois do X/botão funciona fora de foco, sem mostrar medalhas no desktop. Não é uma partida real nem execução em dois PCs.
- `verify-latest-update.mjs`: NsisUpdater real, HTTP e cache locais isolados, SHA-512 normal. Uma oferta 0.17.29 é substituída por 0.17.30 antes do primeiro download; uma oferta 0.17.31 substitui o instalador em cache antes da ação de instalar. Os arquivos são fixtures, e executar o instalador é um stub para não alterar a instalação pessoal.
- Os testes de janela foram repetidos no monitor secundário livre, com janelas transparentes click-through; não usar o monitor principal do Lucas.

Alterações locais, sem publicação automática.
