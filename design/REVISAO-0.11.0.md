# 0.11.0 — Roteiros PivotTFT

Referências de Lucas: `references/23-pivot-elder-dragon.png`, `24-pivot-build-variants.png`, `25-pivot-level-swaps.png`. Preservar o aside do plano fixado e o menu lateral. Aplicada a skill Anthropic frontend-design; nenhuma rotina Impeccable.

Direção: bloco expandido como caderno de partida. Tabuleiro e sequência de níveis à esquerda, preparação e componentes à direita. Variações da família ficam acima do guia. Sem estatísticas inventadas, sem métricas decorativas. Arte dos campeões e bordas por custo mantêm o vocabulário do jogo.

Tokens: base `#171c22`, trilho `#11171d`, divisória `#303943`, texto `#e7edf3`, apoio `#9ba8b8`, ouro `#d3b46e`. Segoe UI, títulos de 14–16px e instruções 12px. A geometria de hexágonos continua em tft-visuals.css. O novo pivot-guide.css só organiza o conteúdo do guia; não substitui a geometria compartilhada.

Fluxo de jogo: Agora → Equipe → Roteiro → Itens → Aprim. → Partida. Roteiro abre na etapa do nível atual; uma nova leitura de nível volta a acompanhar o jogo. Nível 2 apresenta a abertura do 3 com instrução para usar duas peças. Equipe adaptativa respeita espaços e odds; peças raras da referência têm aviso, e upgrades concluídos não somem da equipe. Alternativas com cópias já adquiridas podem entrar no plano adaptativo. O roteiro é referência, não reconhecimento do tabuleiro.

Dados: 62 builds Pivot + 18 anteriores; nomes/ícones de itens e aprimoramentos Riot. Famílias são agrupadas para evitar 62 cartões repetitivos. As trocas por nível são explícitas; o jogador compra o substituto antes de vender o portador. Construções que exigem capacidade extra permanecem identificadas.

Fallback: dados incorporados e cache validado. Sem HTML executado ou chamadas da fonte no renderer. IPC limita consultas ao app principal e mudança de build à família fixada no guia. Atualização não altera ouro, nível ou cópias. Vendas/recompensas continuam exigindo correção excepcional; a integração não passou por uma partida ao vivo.

Evidências e resultados de teste ficam em `review/0.11.0/` e `review/startup/`. A documentação não deve alegar teste ao vivo.

## Entrega verificada em 14/11/2026

- Build TypeScript/Vite e portátil 0.11.0 concluídos.
- 51 testes unitários passaram; relatório JUnit em `review/0.11.0/unit-checks.xml`.
- Electron extraído: fonte real consultada, migração de perfil, 59 cartões/80 builds, níveis, trocas, mudança de build no overlay preservando sessão e cópias, 146 tiers de itens, 252 aprimoramentos e imagens sem erro.
- OCR nas referências: ouro 8 e 18, nível 7. Compra confirmada por sequência simulada, cópia propagada ao overlay e reset limpo. Não é teste em partida ao vivo.
- Instância única restaurada; interface extraída pronta em 2.437ms durante a verificação concorrente com compactação. Portátil real abriu em 18.792ms, em pasta temporária exclusiva.
- App real reaberto e responsivo. O próprio aplicativo migrou o perfil real para 80 builds, 62 PivotTFT; testes não alteraram esse perfil.
- Executável: `release/Zyon-TFT-0.11.0.exe`. Atalho `Abrir Zyon.lnk` continua apontando para `release/win-unpacked/Zyon TFT.exe`. Relatório consolidado e hash: `review/0.11.0/release-checks.json`.
