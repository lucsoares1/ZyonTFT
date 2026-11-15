# Leitura local da loja

A versão 0.17.3 mantém o Windows.Media.Ocr já usado pelo app. Não adiciona Python, OpenCV, modelos neurais nem chamadas a serviços de reconhecimento. O Tesseract local continua apenas como fallback do nível e ouro.

## Caminho rápido

- O leitor observa os cinco slots com intervalo alvo de 60 ms; reconhecimento, captura e HUD podem alongar esse intervalo. Não é uma garantia de 60 ms em todo PC.
- Uma comparação visual da arte e dos nomes detecta mudanças. Ela serve apenas para invalidar um slot: nunca atribui a identidade de um campeão por semelhança ou hash.
- Ao esvaziar uma carta ou reconhecer várias substituições simultâneas, o leitor publica a remoção antes do OCR. Uma alteração isolada é confirmada atomicamente pelo OCR, sem apagar e redesenhar o mesmo campeão. Os nomes alterados são reunidos em uma imagem e reconhecidos numa única chamada; palavras voltam aos slots pelas coordenadas. Duplicatas permanecem separadas.
- Cartas inalteradas usam cache, revalidado em dois segundos. Nomes desconhecidos/fades têm tentativas rápidas e depois reduzem a frequência para evitar trabalho contínuo em ofertas especiais.
- O processo principal manda um evento pequeno diretamente à janela das medalhas. A loja não espera o fallback do HUD, uma atualização do React da janela principal, gravação das preferências ou a rede da dupla.
- Uma revisão crescente impede snapshots atrasados de restaurarem medalhas retiradas. O leitor é a fonte dos slots no modo normal; publicações da janela principal não sobrescrevem o resultado.
- Dados da loja sem heartbeat por dois segundos limpam as medalhas, sem ocultar o guia. Alt+Tab continua ocultando o overlay; pausas ao clicar no guia são preservadas.
- HUD é amostrado separadamente a cada 400 ms no mesmo leitor. A busca mais cara por texto de fim de partida é limitada a uma por segundo, só quando não há HUD válido. Dois scans reais continuam necessários; frames sem scan não confirmam resultados.

## Dupla

Os pedidos já recebidos ficam no cliente. O reconhecimento local classifica uma carta para comprar, enviar ou ambos sem consultar o servidor por slot. Adicionar/remover pedidos ainda exige a sincronização de rede, sujeita à conexão dos dois PCs. Desconexão, fim de partida ou plano antigo suspendem os avisos de envio.

## Barra de rodada e continuidade (0.17.18)

O leitor reconhece a rodada no topo (1-1, 2-1, 3-3, 4-1 etc.) em um recorte pequeno relativo à área cliente do jogo, aproximadamente a cada 800 ms, após publicar as alterações da loja. Duas capturas reais confirmam a barra e ativam o overlay mesmo sem ouro ou nível legível. Usa o OCR nativo existente; não adiciona dependências nem fixa a detecção em um número específico. Um prefixo neutro “Round” ajuda o detector de linhas do Windows a ler a sequência numérica isolada; somente os dígitos realmente presentes no recorte são aceitos.

Perda temporária da barra, ouro ou nível não oculta o painel já confirmado. Alt+Tab, ocultação manual, fim afirmativo de partida e ausência de conta/comp continuam controlando a exibição. O app não deve aparecer sobre outros programas por ter visto a barra anteriormente.

O cliente TFT pode manter o mesmo processo por várias partidas. O retorno confirmado de uma rodada avançada a uma rodada inicial limpa compras/cópias da partida anterior, preservando comp, pedidos, dupla e posição do guia. Se a barra estiver indisponível, um nível inicial significativamente menor e ouro baixo precisam de quatro capturas e pelo menos 1,6 segundo para confirmar a nova partida. Uma leitura isolada, correção de um nível ou falha de OCR não apaga as cópias. A tela de resultados continua exigindo confirmação própria; seu mesmo número de rodada não reabre o overlay encerrado.

`node scripts/verify-round-overlay.mjs` verifica a barra sem HUD de ouro/nível, a captura 3-3 enviada pelo usuário, perda temporária, Alt+Tab e novo jogo no mesmo processo, com OCR Windows e perfil isolado. `verify-duo.mjs --background --requests --live-shop --persistent-rounds --no-captures` verifica duas contas reais com horários de abertura diferentes, pedido de Rubrivirim, meta acima das cópias atuais e marcação de envio reconhecida nativamente. São testes com capturas e foco simulado, sem alegar validação física no PC do parceiro.

## Medições e limites

O leitor anterior levou aproximadamente 1,25 s por ciclo numa captura de referência: cerca de 400 ms de trabalho e espera fixa de 850 ms. O fluxo rápido elimina essa espera fixa e as cinco chamadas sequenciais de OCR da loja.

`scripts/verify-shop-speed.mjs` usa OCR nativo de verdade sobre uma sequência de imagens derivadas da captura 17. Inclui o atraso de polling desde a troca programada, verifica slots duplicados/posicionais, carta vendida e rejeição da oferta especial. Nas execuções de desenvolvimento, as transições ficaram na ordem de dezenas a centenas de milissegundos. Resultados não constituem um benchmark de partida ao vivo nem promessa de latência para outro hardware.

`scripts/verify-overlay-continuity.mjs --shop` verifica também as medalhas no DOM do Electron, remoção e proteção contra publicação atrasada, além de Alt+Tab, perda de OCR, fim de partida e rodada nova. `scripts/verify-duo.mjs --live-shop --background --no-captures` valida pedidos reais entre clientes isolados e a medalha de envio com nomes reconhecidos pelo leitor, sem injetar os slots nesse modo.

Template matching pode ser útil em uma etapa futura, mas uma imagem de retrato oficial não é automaticamente um template da arte recortada da loja. Escala, recorte, animações e estados visuais exigem referências próprias e limiares de rejeição. Não há promessa de zero erros ou de 1–5 ms para o fluxo completo. Esta versão usa comparação visual para invalidar rapidamente e nomes exatos para confirmar a identidade.

## Estabilidade e posicionamento (0.17.5)

O comparador usa tolerâncias para brilho uniforme, pequenos reflexos e antialiasing. A região do selo e a moldura ficam fora das amostras visuais (inclusive da verificação de slot vazio), evitando que o próprio destaque seja confundido com outra carta. Até a0.17.18, o overlay aparecia em capturas de tela. A0.17.19 usa proteção de captura nas janelas nativas: Windows CopyFromScreen lê o jogo por baixo, sem capturar molduras ou medalhas do próprio Zyon. Isso também pode ocultar o overlay em screenshots/gravações de tela. Na0.17.6, falhas de OCR em uma carta visualmente estável preservam a identidade confirmada. Arte animada ou variações isoladas do nome pedem revalidação sem limpar o selo. Uma mudança simultânea de nome e arte em vários slots identifica a troca da loja; slots vazios limpam imediatamente. Janelas já visíveis não recebem showInactive repetido a cada heartbeat; bounds iguais também não são reaplicados. Um diagnóstico real da0.17.5 registrou ciclos do mesmo campeão com apagamento seguido de reconhecimento8–23ms depois; o teste controlado agora inclui arte alterada e deslocamento1px do nome.

A janela de medalhas recebe a área lida (`shopRect`) e as bordas individuais detectadas (`shopCards`) junto dos slots e da revisão. Uma busca local por linhas retas da moldura original alinha o destaque, com cache até mudar a janela. O aro de cristal fica fora do card, sem efeitos sobre o retrato. Cartas de custo1 têm contorno fechado; outras preservam a joia original com transição gradual para o encaixe metálico, sem corte reto. Aviso acima da borda e medalha logo abaixo formam uma peça no mesmo eixo, no canto direito. “Comprar” indica prioridade atual; “Comp” indica outra unidade da composição fixada; “Guardar” indica transição. Compra/comp/transição usam azul; pedidos da dupla usam lilás. Não há animação de entrada que reinicie a cada leitura.

Na calibração padrão, o leitor obtém a área cliente física da janela do jogo e acompanha seu movimento/tamanho. A loja usa proporção de referência16:9 pela altura, centrada na janela, evitando esticamento em monitor ultrawide. A0.17.19 separa a área manual de texto da geometria dos cards: uma calibração OCR antiga não desloca o aro. A moldura usa a área cliente atual e só aparece quando as bordas originais são confirmadas. Não há detecção visual universal da escala do HUD nesta versão.

Validação: `node scripts/verify-overlay-continuity.mjs --shop --medal` usa conta real em perfil isolado, OCR nativo, mudanças controladas de loja e capturas em resoluções diferentes. Depois, `node scripts/verify-shop-stability.mjs --rendered` confere que os próprios pixels renderizados do selo/moldura não invalidam cartas, além de brilho, revalidação periódica, reroll e venda. Testes de viewport/DPI são controlados, sem alegar validação no PC físico de outro usuário.


Na0.17.19, comp Personalizada não transforma os preenchimentos sugeridos pelo planejador adaptativo em compras implícitas. Os destaques próprios e o payload da dupla usam apenas elenco/metas, sinergias marcadas e pedidos explícitos. Rotas publicadas continuam compartilhando suas transições. `verify-overlay-regressions.mjs` testa uma comp pessoal salva, conta real, OCR nativo, pedido avulso e captura real que enxerga o fundo por baixo do overlay protegido. `verify-shop-frame.ps1` confere a geometria em720p/1080p/1440p/ultrawide derivados da captura17.
