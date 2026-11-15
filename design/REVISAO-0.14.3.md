# 0.14.3 — Consulta da equipe por nível no overlay

A aba Equipe agora permite consultar o plano dos níveis1–10. “Agora” acompanha o nível OCR da partida; selecionar um número mantém a consulta nesse nível mesmo que o OCR avance. “Equipe final” continua sendo uma referência separada. A aba Agora e todas as recomendações de compra continuam usando a sessão real. Nenhuma consulta dispara gameAction de nível nem altera ouro/cópias/compras.

Tabuleiro, equipamentos dos portadores temporários, unidades, transição de entrada/saída e odds da seção “Espere para procurar” acompanham o nível consultado. A visão final não mostra uma transição referente a um nível diferente. Uma troca de comp volta a acompanhar o jogo. Sair e voltar à aba preserva a consulta.

Visual: preservar Manrope, fundos #11171c/#151b22, divisórias #303943, seleção ouro #d8b76f e leitura atual em verde #66c3ad. A faixa de dez botões usa o espaço do tabuleiro, sem abrir janelas ou ocupar o HUD. Texto distingue equipe sugerida e consulta do plano de uma leitura real do tabuleiro. Referência44 é o pedido de Lucas. Evidências em design/review/0.14.3/team-levels.

scripts/verify-team-levels.mjs verifica todos os dez níveis, campeões, itens e transições, sessão inalterada, avanço OCR7→9 durante consulta8, retorno por Agora, visão final, independência da aba Agora, erros de renderer e limites em840/640px. Perfil isolado; utiliza screenshot17 e uma composição explícita de17/41 para a atualização9. Não é teste de uma partida ao vivo.
