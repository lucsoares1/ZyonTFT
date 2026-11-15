# Leitura local da loja

A versão 0.17.3 mantém o Windows.Media.Ocr já usado pelo app. Não adiciona Python, OpenCV, modelos neurais nem chamadas a serviços de reconhecimento. O Tesseract local continua apenas como fallback do nível e ouro.

## Caminho rápido

- O leitor observa os cinco slots com intervalo alvo de 60 ms; reconhecimento, captura e HUD podem alongar esse intervalo. Não é uma garantia de 60 ms em todo PC.
- Uma comparação visual da arte e dos nomes detecta mudanças. Ela serve apenas para invalidar um slot: nunca atribui a identidade de um campeão por semelhança ou hash.
- Ao mudar ou esvaziar uma carta, o leitor publica a remoção antes do OCR. Os nomes alterados são reunidos em uma imagem e reconhecidos numa única chamada; palavras voltam aos slots pelas coordenadas. Duplicatas permanecem separadas.
- Cartas inalteradas usam cache, revalidado em dois segundos. Nomes desconhecidos/fades têm tentativas rápidas e depois reduzem a frequência para evitar trabalho contínuo em ofertas especiais.
- O processo principal manda um evento pequeno diretamente à janela das medalhas. A loja não espera o fallback do HUD, uma atualização do React da janela principal, gravação das preferências ou a rede da dupla.
- Uma revisão crescente impede snapshots atrasados de restaurarem medalhas retiradas. O leitor é a fonte dos slots no modo normal; publicações da janela principal não sobrescrevem o resultado.
- Dados da loja sem heartbeat por 750 ms limpam as medalhas, sem ocultar o guia. Alt+Tab continua ocultando o overlay; pausas ao clicar no guia são preservadas.
- HUD é amostrado separadamente a cada 400 ms no mesmo leitor. A busca mais cara por texto de fim de partida é limitada a uma por segundo, só quando não há HUD válido. Dois scans reais continuam necessários; frames sem scan não confirmam resultados.

## Dupla

Os pedidos já recebidos ficam no cliente. O reconhecimento local classifica uma carta para comprar, enviar ou ambos sem consultar o servidor por slot. Adicionar/remover pedidos ainda exige a sincronização de rede, sujeita à conexão dos dois PCs. Desconexão, fim de partida ou plano antigo suspendem os avisos de envio.

## Medições e limites

O leitor anterior levou aproximadamente 1,25 s por ciclo numa captura de referência: cerca de 400 ms de trabalho e espera fixa de 850 ms. O fluxo rápido elimina essa espera fixa e as cinco chamadas sequenciais de OCR da loja.

`scripts/verify-shop-speed.mjs` usa OCR nativo de verdade sobre uma sequência de imagens derivadas da captura 17. Inclui o atraso de polling desde a troca programada, verifica slots duplicados/posicionais, carta vendida e rejeição da oferta especial. Nas execuções de desenvolvimento, as transições ficaram na ordem de dezenas a centenas de milissegundos. Resultados não constituem um benchmark de partida ao vivo nem promessa de latência para outro hardware.

`scripts/verify-overlay-continuity.mjs --shop` verifica também as medalhas no DOM do Electron, remoção e proteção contra publicação atrasada, além de Alt+Tab, perda de OCR, fim de partida e rodada nova. `scripts/verify-duo.mjs --live-shop --background --no-captures` valida pedidos reais entre clientes isolados e a medalha de envio com nomes reconhecidos pelo leitor, sem injetar os slots nesse modo.

Template matching pode ser útil em uma etapa futura, mas uma imagem de retrato oficial não é automaticamente um template da arte recortada da loja. Escala, recorte, animações e estados visuais exigem referências próprias e limiares de rejeição. Não há promessa de zero erros ou de 1–5 ms para o fluxo completo. Esta versão usa comparação visual para invalidar rapidamente e nomes exatos para confirmar a identidade.

## Estabilidade e posicionamento (0.17.5)

O comparador usa tolerâncias para brilho uniforme, pequenos reflexos e antialiasing. A região do selo e a moldura ficam fora das amostras visuais (inclusive da verificação de slot vazio), evitando que o próprio destaque seja confundido com outra carta. O overlay continua aparecendo normalmente em screenshots e gravações. Uma falha isolada na revalidação de uma carta estável tem tolerância de250ms; mudanças reais de imagem e cartas vazias continuam invalidando o aviso antes do OCR.

A janela de medalhas recebe a área lida (`shopRect`) e as bordas individuais detectadas (`shopCards`) junto dos slots e da revisão. Uma busca local por linhas retas da moldura original alinha o destaque, com cache até mudar a janela. O aro de cristal fica fora do card, sem efeitos sobre o retrato. Cartas de custo1 têm contorno fechado; outras preservam a joia original com transição gradual para o encaixe metálico, sem corte reto. Aviso acima da borda e medalha logo abaixo formam uma peça no mesmo eixo, no canto direito. “Comprar” indica prioridade atual; “Comp” indica outra unidade da composição fixada; “Guardar” indica transição. Compra/comp/transição usam azul; pedidos da dupla usam lilás. Não há animação de entrada que reinicie a cada leitura.

Na calibração padrão, o leitor obtém a área cliente física da janela do jogo e acompanha seu movimento/tamanho. A loja usa proporção de referência16:9 pela altura, centrada na janela, evitando esticamento em monitor ultrawide. Se a escala da interface do TFT estiver personalizada, a área manual em Preferências ajusta OCR e destaques juntos. Não há detecção visual universal da escala do HUD nesta versão.

Validação: `node scripts/verify-overlay-continuity.mjs --shop --medal` usa conta real em perfil isolado, OCR nativo, mudanças controladas de loja e capturas em resoluções diferentes. Depois, `node scripts/verify-shop-stability.mjs --rendered` confere que os próprios pixels renderizados do selo/moldura não invalidam cartas, além de brilho, revalidação periódica, reroll e venda. Testes de viewport/DPI são controlados, sem alegar validação no PC físico de outro usuário.
