# Guia compacto e interativo

Direção: manter a linguagem do TFT das referências, usar os retratos como informação principal e reduzir a área vazia. Paleta: fundo #11171c, superfície #242c35, texto #dce5ee, secundário #90a6bc e destaque #d8b76f. Manrope nos títulos, Segoe UI no conteúdo de jogo.

Recolhido: largura conforme a quantidade de peças, de 480 a 640px, altura 160; título e controles na primeira linha, equipe completa na segunda, decisão e recursos no rodapé. Aberto: 840px e duas colunas de conteúdo. Alinhamento à esquerda; retratos de 40px e itens legíveis. A revisão do plano descartou manter nome e equipe lado a lado, que criava o grande vazio horizontal e exigia uma largura desnecessária.

O guia agora recebe foco e eventos de mouse; a camada transparente dos destaques de loja continua sem foco e sem interceptar cliques. Apenas o HWND exato do guia mantém uma partida já confirmada anexada durante a interação. O app principal e outras janelas continuam ocultando o overlay. Enquanto o usuário consulta o guia, frames idle do leitor não apagam a última leitura de ouro nem a evidência de compras. Nenhum clique é enviado para o jogo.

Validação: 60 testes unitários; regressão específica de foco, HWND e PowerShell; layout nativo no executável empacotado para todas as seis abas e as cinco maiores equipes; 17 cenários de geometria de retratos/itens no app, planejador e overlay. O teste de visibilidade passou também no pacote, com foco nativo confirmado por `isFocused()`, cliques nas abas e ocultação ao focar o app principal. Abertura extraída em 1,9s com restauração de instância.

Instalação real reaberta na 0.13.3, PID 247248, app minimizado. Log confirmou ouro 0/nível 7 às 23:30:11 UTC. Win32 confirmou o guia visível 840×800 com o próprio PID Zyon em primeiro plano e hit test sobre o botão retornando o HWND do guia. O estilo não contém mais WS_EX_NOACTIVATE. Evidência `design/review/0.13.3/live-windows.json`. As capturas de layout usam perfil isolado; a consulta à instalação real foi somente de leitura, sem alterar ouro, nível ou compras para testes.
