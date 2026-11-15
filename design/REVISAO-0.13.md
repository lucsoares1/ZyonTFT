# 0.13 — Comp completa recolhida, guia amplo aberto

Referência 34 de Lucas. O overlay recolhido deve ser uma faixa de comp: arte e nome à esquerda, equipe inteira no centro (retratos por raridade, metas 3★, itens e nomes), controles à direita. Aberto mantém essa faixa e acrescenta leitura da partida, abas e conteúdo em duas colunas. Agora começa pela decisão e compras acessíveis; tabuleiro e próxima transição ao lado. Equipe e Roteiro usam tabuleiro com instruções adjacentes. Sem estatísticas inventadas.

Paleta preservada: fundo #11171c / painel #191f26 / divisórias #303943 / texto #edf1f5 / apoio #a5b0bf / ouro #d8b76f. Segoe UI para leitura e Manrope para o nome da composição. Retratos e itens trazem cor; evitar brilhos decorativos. Rótulos de fase guiam começo → transição → núcleo. Faixa da comp preserva a identidade mesmo recolhida.

Janela até 1040px, limitada ao monitor escolhido; altura aberta respeita a faixa de OCR/loja. Recolhida 160px. Atalhos, lado, leitura automática, sessão e cópias preservados. Testes com perfis isolados. Corrigir a ponta do hexágono da 0.12.3 permanece parte desta entrega.


## Visibilidade automática solicitada durante a implementação

Somente sobre o processo de jogo em primeiro plano; cliente, navegador, desktop e app não qualificam. `electron/game-presence.ps1` observa janela/PID a cada 100ms sem capturar fora do jogo, com heartbeat. Ouro confirmado em duas leituras marca o começo da partida e abre as duas janelas automaticamente. Ouro zero é válido. Alt+Tab oculta guia e badges, mantém a sessão; retorno retoma. Encerramento e PID/início novos limpam cópias. Ocultar manualmente é respeitado na mesma partida. Perda do monitor de foco oculta as janelas.

Controle em `electron/overlay-visibility.cjs`; integração no processo principal rejeita frames anteriores à troca de foco e de outra partida. O leitor inicia automaticamente ao detectar jogo em primeiro plano e uma comp fixada. Pausa manual do leitor é respeitada. Sem injeção ou leitura da memória do jogo.

Prévias de UI exigem `ZYON_USER_DATA` isolado + `ZYON_OVERLAY_PREVIEW=1` e exibem identificação de prévia. O fluxo normal não usa essa exceção. `verify-overlay-visibility.mjs` combina OCR real da screenshot com foco simulado por transporte isolado; não é teste em partida ao vivo.


## Validação antes do pacote

Build aprovada e 57 testes passaram. Layout: todas as peças visíveis na faixa recolhida, sem estouro de itens; seis abas e troca de lado preservam a sessão. 17 cenários de detalhes/abas/tabuleiro aprovados. Leitura real da screenshot: Nv.7 e ouro18; override de nível, reset, cópias, reload e reinício completo preservados. Integração Pivot aprovada.

Visibilidade em perfil isolado sem modo de prévia: entrada automática após ouro confirmado; Alt+Tab simulado ocultou ambas as janelas em 652ms sob teste; frames atrasados não reabriram; retorno preservou cópias; ocultação manual respeitada; fim limpou cópias e outra identidade rejeitou OCR antigo. O helper Win32 também foi executado no desktop e reportou ausência de jogo em foco. Não houve teste em partida ao vivo.

Executável extraído aprovado: faixa recolhida e seis abas, alinhamento dos 74 cards e política de visibilidade. OCR real da screenshot confirmou 7/18; foco simulado ocultou em 771ms durante testes paralelos. Abertura em 5124ms, segunda instância restaurou a janela. Helper game-presence.ps1 conferido em asar.unpacked. App reaberto no perfil original; perfil real não foi usado para testes.

Portátil real 0.13.0 aprovado: abertura em 18309ms, diretório exclusivo por execução, renderer carregado. A entrega inclui a correção da ponta dos hexágonos da 0.12.3.
