# Planejador e distribuição 0.17.10

O overlay precisa funcionar durante uma partida: reconhecer o elenco, escolher uma peça e mudar sua meta sem disputar atenção com o jogo. O material atual deixa o TFT atravessar o texto e repete quatro controles minúsculos em cada carta. A revisão concentra a edição em uma peça por vez e amplia o catálogo.

Material: fundo carvão #0a101b, superfície #111c2c, divisórias #273b55, texto #eef4ff, secundário #9eb1cb e seleção azul #2563eb. Manrope continua a família única: títulos 20/700, nomes 13/700 e informações 11/500. Controles planos, sem relevo ou sombra; a cor de custo aparece em um detalhe junto ao retrato. O foco visual são os campeões reais e os ícones oficiais das sinergias.

```
Seu plano                         Restaurar
Comp escolhida             Dupla sincronizada
[retrato Nome / itens / cópias] [retrato ...]
[peça em foco]    Meta [–] [1] [2] [3]
Campeões | Sinergias            Busca / custo
[catálogo com retratos maiores e nomes legíveis]
```

Os cards do elenco escolhem qual peça editar; só ela mostra o controle de meta com uma legenda por extenso. Remoção continua explícita. O catálogo usa menos colunas, retratos maiores e nomes alinhados. Sinergias possuem ícone, nome, quantidade de campeões e seleção azul. Tudo marcado na loja deve ser compartilhado: equipe, transição e campeões de uma sinergia. Sinergias selecionadas não inserem todos os seus campeões no tabuleiro. O pedido por sinergia busca uma cópia; uma meta explícita de campeão tem prioridade, inclusive Não pedir. Remoções explícitas não são reintroduzidas.

A leitura associa as sinergias oficiais ao campeão efetivamente reconhecido pelo OCR. Não se cria uma segunda leitura de texto nem se aceita texto parcial de uma sinergia como prova de campeão: isso preserva velocidade, confiança, posições e limpeza das medalhas.

Animação somente na mudança de seleção e abertura do editor; respeitar reduced motion. Conferir 640/840px, nomes longos, elenco vazio, dupla conectada/solo, restauração, falha de IPC e atualização do OCR durante a edição.

A distribuição usa bootstrap sem dependências externas, marcador do instalador e verificação de integridade de todos os arquivos e dependências transitivas. O CI extrai o próprio Setup fora do checkout, testa abertura antecipada com Tesseract indisponível, erro recuperável e OCR offline real antes de publicar. Contas e preferências pessoais não são usadas nos testes.
