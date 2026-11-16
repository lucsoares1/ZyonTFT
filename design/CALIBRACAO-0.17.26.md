# Calibração visual e rolagem · 0.17.26

Inter, base#0c1624, superfície#111f32, borda#2c4260, azul#347aff e nível#b6a0e7. Preferências mostra uma ação principal Capturar e ajustar, estado automático/manual e explicação curta. O editor modal usa captura local do monitor selecionado, área de cinco cartas arrastável, quatro alças, desenho de nova área, setas com passo1/5/10px e controles de largura/altura. Nível tem modo separado e pode voltar a acompanhar a loja. Valores em% ficam como alternativa avançada.

[Captura do monitor + retângulo de5cartas] [Mover / redimensionar]
[Loja completa | Nível] [Nova área]      [passo + setas + tamanho]
[Restaurar automático]                  [Cancelar] [Salvar ajuste]

A captura só ocorre por ação explícita e fica na memória local. O editor guarda rascunho: arrastar não reinicia OCR, Cancelar não salva e Salvar publica uma única configuração. Há um cardRect físico novo, independente de rect de leitura legado; o editor visual atualiza ambos. Campos avançados antigos alteram apenas leitura, preservando a proteção da0.17.20. A moldura nativa deve usar cardRect quando explícito e FitShopRect no automático. O resto do jogo/OCR/dupla permanece.

Revisão: capturar o monitor com a janela principal temporariamente oculta permite ajustar sobre a imagem real sem manter um overlay de calibração bloqueando o jogo. Sem captura válida, mostrar estado de erro e permitir tentar de novo; não apresentar um desenho como se fosse o jogo real. Barras de rolagem finas em azul discreto, trilho transparente, cantos arredondados e foco/hover mais claros; preservar a rolagem normal e alto contraste do sistema.

Validação:131 testes unitários; captura de monitor testada com fontes simuladas para não capturar a tela pessoal, seleção por display_id e restauração mesmo após falha. verify-shop-frame.ps1 mantém16bordas em720/1080/1440/ultrawide e ignora recorte OCR legado. verify-calibration-native.ps1 desloca uma fixture53px para cima: OCR Windows lê Vi/MasterYi/Alistar/Rubrivirim e encontra4bordas, com cardRect aplicado e retângulo inválido rejeitado. verify-calibration.mjs usa conta real/perfil isolado e essa fixture: arraste/alças/teclado/passos, Cancelar, desenho, nível separado, publicação única, reader nativo, reinício do processo com sessão cifrada, restauração e modal1536/1050 sem overflow. Barras confirmadas pelos estilos dos pseudo-elementos, sem botões nativos. Não alegar validação em partida ao vivo ou no PC do amigo.
