# Revisão visual 0.5

Direção pedida por Lucas: referências de TFT/Blitz, navegação lateral e plano fixado, com retratos legíveis, equipamento identificável e um tabuleiro geometricamente correto. Fluxo de design: `anthropics/skills@frontend-design`, substituindo o Impeccable neste projeto.

Paleta: fundo `#101216`, painel `#191d23`, superfície elevada `#242a32`, bordas `#333b45`, texto `#e8ebef`, seleção `#e5b85c`. Dourado reservado a seleção e ações de fixar. A cor de custo continua pertencendo às unidades.

Tipografia: Manrope, com nomes e controles legíveis em 11–14 px, títulos em 24 px. Cortar rótulos decorativos e excesso de caixa alta. A arte e as peças do jogo são o foco visual.

Layout: navegação fixa à esquerda, biblioteca/planejador ao centro e plano fixado à direita. Cards com nomes alinhados, retratos de rosto e uma faixa própria para itens; arte de fundo ancorada na borda direita com transição contínua. No tabuleiro, sete colunas e quatro fileiras de hexágonos regulares, alternando exatamente meio passo horizontal.

Revisão do plano: preservar o vocabulário visual do TFT solicitado, sem acrescentar novos painéis decorativos, números inventados ou animações. Substituir artes panorâmicas nos retratos pelos ícones oficiais de HUD. Corrigir as regras de geometria na origem, centralizando o tabuleiro em uma folha de estilos compartilhada pelo planejador e overlay.

Referências desta revisão: `references/12-board-problems.png` e `references/13-banner-problems.png` (capturas do usuário, sem alterações).

## Guia detalhado e nova lateral

O pedido adicional da captura 14 foi incorporado: visão geral em duas colunas com etapas/condições/componentes e tabuleiro/nível/portadores; abas de itens com receitas, unidades com custos/traits e progressão. A lateral passa a ser uma lista manual de primeiras cópias, salva por comp, com custo restante e total de componentes. O orçamento exclui XP e rerolls; o roteiro local não é atribuído à fonte dos guias.
