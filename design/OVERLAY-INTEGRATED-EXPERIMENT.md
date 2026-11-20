# Experimento: conteúdo entre ferramentas e resumo

## Fluxo aprovado — 20/11/2026

Lucas decidiu manter o fluxo integrado. O botão de retorno ao modo antigo foi removido da interface e substituído por **Minimizar overlay**. Minimizar fecha a tarefa e recolhe o resumo, deixando somente a barra de ferramentas de244×42px. **Expandir overlay** restaura o resumo; clicar em qualquer ferramenta também expande e abre o conteúdo correspondente. A seleção, OCR e dupla não mudam. O snapshot de layout antigo permanece preservado internamente, sem botão de retorno na interface.

Pedido de Lucas: manter a equipe visível na mesma janela e deslocá-la para baixo ao abrir uma ferramenta, em vez de criar um painel separado. A alteração deve ser facilmente reversível.

## Contrato

- O modo padrão continua sendo o atual, com painéis separados. O experimento é uma preferência explícita `overlayLayout.presentation = integrated`.
- Ao ativar, guardar uma cópia normalizada do layout anterior: painel ativo, painel fixado, posições e recolhimento do resumo. Não alterar comp, itens, compras, OCR ou dupla.
- Uma única janela interativa contém ferramentas no topo, tarefa no meio e resumo completo na base. Abrir/fechar não move o topo nem muda a largura. O retângulo nativo para acima da loja.
- A janela só começa a redimensionar após o renderer confirmar o conteúdo montado. Altura nativa e layout avançam juntos em260ms, mantendo o resumo na base sem reservar uma área vazia. Ao fechar, o conteúdo permanece até chegar à altura compacta de196px; sem comp,42px. Repetição rápida retoma a partir da altura atual e cancela o redimensionamento anterior.
- `prefers-reduced-motion` remove o deslocamento espacial e mantém a mudança de estado.
- Não existe segundo painel fixado neste experimento. A opção retorna junto do layout anterior.
- O snapshot anterior e a ação interna de restauração permanecem disponíveis para manutenção, mas não há botão de retorno na interface aprovada.

## Segurança e retorno

A janela launcher recebe permissões de tarefa somente enquanto este modo está ativo e uma tarefa está aberta. Login, atualização e publicação continuam restritos ao aplicativo principal. Bandeirinhas da loja continuam em janela click-through própria: não são conteúdo interativo e não bloqueiam compras.

Foi preservada uma cópia dos sete arquivos de base, com manifestoSHA256, em `.runtime/overlay-integrated-baseline-20261120-155843`. A reversão cotidiana é pela preferência, não por copiar fontes antigas sobre trabalho novo.

## Verificação

Comparar retorno exato ao layout salvo, mesma comp/cópias/alvos, ausência de janelas de tarefa separadas visíveis, quatro destinos funcionais na janela única, resumo sempre visível, interrupção de animação, Esc, rolagem independente e movimento reduzido. QA isolado no monitor secundário; não publicar automaticamente.

Build e179 testes unitários passaram. QA nativo do experimento passou8 superfícies, incluindo janela baixa566px, troca rápida, fechamento interrompido, movimento reduzido, permissões do launcher e retorno exato ao layout anterior. Amostras dos eventos de resize confirmam conteúdo montado antes de crescer e nenhum espaço abaixo do resumo durante a transição. O catálogo expandido ganhou altura útil de384px no cenário de teste. Alterações intencionais na seleção de compras permanecem após retornar. O modo antigo também passou suas23 superfícies de regressão na verificação anterior. Relatórios locais em `.runtime/integrated-overlay-qa/report.json` e `.runtime/modular-overlay-qa/report.json`. Sem teste em partida real, TeamSpeak ou segundo PC.
