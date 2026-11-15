# 0.12.2 — Acabamento do tabuleiro e guias

Continuação das correções de alinhamento de Lucas. Preservar a direção visual da 0.12.1: grafite #15191f, linhas #2b333d, ouro #f3bc48 e Segoe UI; mesmas navegações e aside. O tabuleiro precisa manter cada unidade e seus itens dentro da célula. Nome acima da faixa de itens, com reticências para nomes longos e nome completo no tooltip existente. Itens proporcionais à largura do hexágono, com teto de 24px. Aplicação compartilhada no app e overlay via tft-visuals.css.

A auditoria anterior em 1536px encontrou 4 racks com 52px em células de 50.56px. Os nomes também invadiam a faixa de itens. Restringir os tamanhos dos cards recolhidos ao resumo do card, para não alterar unidades dentro das abas expandidas.

Conferir: todos os campeões equipados dentro das células; nomes acima dos itens; centros alinhados; sem transbordo horizontal das abas. Usar perfis isolados e testar a interface real.

Validação de desenvolvimento: cinco abas do app em 1536/1050px, planejador e seis abas nativas em 440px passaram sem transbordos ou sobreposições medidas. Itens dentro dos hexágonos equipados e nomes acima da faixa. Os 74 cards mantêm os alinhamentos da 0.12.1. Capturas reais em design/review/0.12.2/.

Executável extraído: 17 cenários de abas/tabuleiros e seis cenários de biblioteca aprovados. Abertura em 2835ms e restauração de instância única aprovadas. Os 54 testes unitários passaram. Perfil real reaberto; não foi usado pelos testes.

Portátil real validado: abertura em 18314ms, extração exclusiva por lançamento e renderer carregado. Arquivo final release/Zyon-TFT-0.12.2.exe (161052243 bytes). Captura do tabuleiro nativo: details/overlay-board-packaged.png.
