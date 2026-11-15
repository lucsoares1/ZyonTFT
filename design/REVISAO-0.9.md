# 0.9 — Ouro e compras durante a partida

Pedido: ler o ouro acima da loja e registrar compras sem exigir cliques extras
no guia. Referência 18 preserva a imagem enviada pelo Lucas, com ouro 8.

## Direção de interface

Aplicação pontual de `anthropics/skills@frontend-design`, conservando a direção
0.8: carvão #101318, ardósia #1b2028, texto #edf0f4, ouro #d9b56f e confirmação
#8fcbbf; Segoe UI nos controles e Manrope nos títulos. Alinhamento à esquerda.
O cabeçalho já contém ouro e nível. Acrescentar somente a origem da leitura e
a última compra, com o retrato do campeão. Correções pertencem à aba Partida.

    comp / controles
    nível         ouro / vida
    leitura       última compra / cópias
    Agora | Equipe | Itens | Partida
    decisão / prioridades / transição

Revisão do plano: evitar um painel adicional de métricas ou histórico ocupando
a rodada. O registro é um detalhe de confirmação; a decisão continua principal.

## Implementação e limites

- Captura única da tela por ciclo mantém loja, nível e ouro no mesmo instante.
- OCR Windows e fallback Tesseract local. Ouro usa filtro de cor e componentes
  para eliminar brilho da moeda; somente 0–999, confiança do fallback >=70 e
  dois frames confirmados. Aumentos, gastos e zero são válidos.
- Observador passivo de clique do mouse, em thread com amostragem de 8ms.
  Só envia posição do slot e horário de cliques feitos no processo do jogo.
  Nenhuma leitura de memória, compra automática ou envio de input.
- Compra: loja estável antes do clique, nome reconhecido, card visualmente
  vazio e sem texto por dois frames, débito exato da soma dos custos e demais
  slots sem mudanças. Eventos repetidos no mesmo slot contam uma vez.
- Reroll, falha de OCR, clique sem efeito, pausa, perda de foco, atraso e reset
  descartam evidências pendentes. Compras muito rápidas seguidas de reroll,
  descontos, ganho simultâneo de ouro ou início do OCR no meio da partida
  podem precisar de correção. Preferimos deixar de contar a inventar posse.
- A identidade usa PID + início do processo do jogo. Nova identidade zera
  sessão; Alt+Tab preserva. Fechamento do processo observado também limpa.
  Reiniciar o jogo para reconectar cria nova identidade e limpa o registro.
  Se o cliente reutilizar o mesmo processo entre partidas, usar Nova partida.
- Contagem acompanha compras observadas; não lê banco/tabuleiro, vendas,
  recompensas ou duplicadores. Correções ficam visíveis em Partida.
- Correções manuais de ouro pausam só esse campo; Usar ouro automático retoma.
  Ajustes de cópias descartam evidências pendentes para evitar dupla contagem.

## Verificação

`tests/purchase-tracker.test.mjs`: valores de ouro, compras simples e múltiplas,
duplicatas por slot, falhas, reroll, validade temporal e isolamento de partidas.
`scripts/verify-economy.mjs`: OCR real da referência 18 = 8; referência 17 = ouro
18 e nível 7 pelo fluxo nativo até o overlay. Compras simuladas no limite do
sensor exercitam tracker real, main, persistência e interface, sem endpoint de
injeção em produção. Testa também correção de ouro e limpeza da sessão.
Evidências em `design/review/0.9`. Não houve validação em partida ao vivo.

### Restauração da janela

A verificação da 0.9 reproduziu uma corrida ao reabrir durante a animação de
minimizar do Windows. `showMainWindow` tenta novamente por até 1,5s somente se
a janela continuar oculta/minimizada. Três execuções consecutivas do teste
empacotado passaram após a correção (944, 797 e 767ms até a interface pronta).
