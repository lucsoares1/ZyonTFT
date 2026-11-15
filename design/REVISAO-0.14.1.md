# 0.14.1 — Atualização do HUD

O print 40 mostra ouro 56 no jogo e 62 no guia. A imagem preparada antiga conservava uma grande margem vazia à esquerda; Tesseract retornava 26 com confiança 50, abaixo do limite 70. O histórico 62 continuava visível. PrepareGold agora ajusta os limites ao conjunto de dígitos retidos e usa uma margem simétrica de 12px. O mesmo recorte passa como 56, sem reduzir o limite de confiança.

O print 41 mostra Nv.9 no jogo e nível 8 no guia. A primeira passagem reconhece Nv.9 com confiança 50. Quando há rótulo estrito e confiança entre 40 e 60, uma segunda passagem restringe os caracteres aos do HUD; ela só pode substituir a primeira se reconhecer o mesmo nível com confiança >=60. Mantêm-se confirmação de dois frames, identidade da partida e rejeição de quedas após confirmação.

Ouro agora tem confirmedAt separado da hora do candidato. O guia só mostra valores confirmados e recentes (até 5s), diretamente do sensor. Falha, confirmação pendente, pausa ou expiração mostram — e indicam a última confirmação. Uma confirmação nova de nível e ouro é necessária para retomar recomendações de gasto. A seleção de unidades e transições continua disponível. Os valores históricos permanecem internamente para o estado da partida.

Validação: 64 testes unitários; scripts/verify-gold-current.mjs executa OCR real das screenshots (ouro 56/36/3/8/18, nível 9/8), incluindo avanço 8→9 em dois frames; scripts/verify-gold-live-ui.mjs verifica OCR real da screenshot17 na sessão e janela nativa, expiração sem novo frame e pausa. Todos usam perfis isolados. Não confundir fixtures com uma partida ao vivo. As referências 40 e 41 são recortes: as coordenadas locais de teste não devem alterar a calibração real.

Ouro usa segmentação de palavra (8), evitando 36→46 com confiança94 no modo de bloco. Se a palavra não atingir70, uma passagem em modo6 pode recuperar um dígito isolado, como8, com o mesmo limite70. Não foi reduzido o limite de confiança.
