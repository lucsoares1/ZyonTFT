# 0.7 — guia durante a partida

O app serve para estudar e editar. O overlay serve para decidir durante o jogo,
começando no nível 2. A consulta de nível no app não altera a partida do overlay.

## Direção antes da implementação

Manrope existente, corpo 12–13 px e decisão 18 px; retratos de HUD, itens 28 px.
Base #101216, superfície #191d23, divisores #303640, texto #e8ebef,
secundário #a5afbd, ação #ebc577. Cores de raridade seguem as peças do TFT.
Painel lateral de 410 px, alinhado à esquerda, sem banner decorativo.

```
comp fixada                         recolher / lado
nível − 2 +                     ouro / vida manuais
Agora | Equipe | Itens | Partida
decisão do momento
campeões para comprar + registro de cópias
próxima transição
atalho / status de leitura
```

Revisão do plano: não transportar o painel extenso do app para cima do jogo.
Agora deve responder a uma decisão por vez; detalhes e ajustes têm abas próprias.
Equipe mostra o tabuleiro do nível e o final, com entradas/saídas. Itens mostra
portadores temporários, destinos e receitas. Partida permite informar ouro, vida,
força, cópias e disputa usando botões, sem exigir teclado ou Alt Tab.

Uma janela pequena recebe os cliques do guia sem tomar foco. A janela de badges
continua transparente e deixa todos os cliques passarem. Recolher reduz também o
retângulo nativo, não apenas o conteúdo. Altura limitada antes da área da loja.
Sessão é persistida no processo principal, com alterações atômicas; publicações
do app e OCR não podem sobrescrever os ajustes feitos no overlay.

Guia e transições são sugestões, não detecção do tabuleiro. Cópias informadas
não compram nem vendem no jogo. Ouro/vida/cópias permanecem manuais.

## Ajuste solicitado durante a implementação: nível por OCR

Lucas enviou a referência 16 e pediu leitura do `Nv.` acima do botão de XP.
Faixa independente da loja; coordenadas automáticas relativas à loja, com
calibração opcional. Duas leituras consecutivas, parser estrito e rejeição de
quedas de nível sem reiniciar a partida. Ajuste manual é respeitado até voltar
ao modo OCR. Após iniciar uma nova partida, limpar sessão e confirmação.

Windows reconheceu `Nv. 8` na referência 16 com recorte, margem e ampliação.
Na referência 17 ele omite `Nv. 7`; fallback Tesseract local reconhece o texto.
Preservar antialiasing: limiar binário prejudicou o reconhecimento e foi removido.
Modelo English LSTM de tessdata_fast incluso; não fazer download no uso normal.
Confiança mínima 70 para fallback, seguida do mesmo filtro de duas leituras.
O painel agora termina antes da faixa do nível, inclusive em telas menores.

Compras atuais incluem temporários. Reservas de transição só incluem unidades
cujo custo já tem nível de busca apropriado; nunca induzir reroll para lendário
com 1%. Badge distingue Comprar agora, Guardar p/ transição e Na sua comp.
