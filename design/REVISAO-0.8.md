# Revisão 0.8 — preparar no app, decidir no jogo

Skill: `anthropics/skills@frontend-design`. Referências do Lucas: 06 (biblioteca), 14 (guia expandido), 01 (tabuleiro) e 02 (economia).

## Direção antes de construir

Uma bancada de TFT: retratos, itens e posições carregam a identidade. A biblioteca permite comparar seis planos; o guia da partida apresenta uma decisão, três compras prioritárias e a próxima mudança. Nada de estatísticas inventadas ou uma coleção de cartões decorativos.

Paleta: fundo carvão `#101318`, superfície ardósia `#1b2028`, divisão `#333b46`, texto marfim `#edf0f4`, ouro fosco `#d9b56f`, confirmação água `#8fcbbf`. Cores de raridade ficam restritas às peças do jogo. Dourado identifica seleção e ações, não todos os títulos.

Tipografia: Segoe UI para leitura compacta de desktop e Manrope para títulos de comps. Escala 11 / 12 / 14 / 17 / 26. Números tabulares para custos, cópias e níveis. Alinhamento à esquerda; centralização apenas em peças e níveis.

```
App
| navegação | Composições                         | Seu plano       |
|           | busca / estilo / coleção            | arte + carry    |
|           | nome, características, estilo       | Ativar overlay  |
|           | retratos + itens       arte do carry | checklist       |
|           | [guia: níveis / equipe / transições]| componentes     |

Overlay
| retrato / comp                       controles |
| nível / ouro / vida / origem da leitura         |
| Agora         Equipe       Itens       Partida  |
| ação principal + orçamento / explicação aberta  |
| 3 compras prioritárias, motivo e registro       |
| demais oportunidades (expansível)               |
| próxima transição com retratos                 |
| leitura da partida / atalho                     |
```

## Crítica do plano

Uma tela escura com cards e acentos dourados, sozinha, repetiria o problema. A mudança estrutural será diminuir a altura do chrome, incluir identidade visual do carry no aside, colocar a ação do overlay antes da checklist e trocar a grade longa de compras no jogo por uma fila curta e explicada. As abas mantêm o tabuleiro e as receitas legíveis sem competir com a rodada. O plano expandido permanece detalhado como a referência 14.

Estratégia: conservar um portador temporário melhorado enquanto o substituto não está pronto; priorizar upgrades próximos, carry e frente; reservar ouro para compras antes de calcular rolagens; separar recomendações de fatos observados. OCR lê apenas nível/loja; cópias, vida e ouro continuam informados pelo jogador. Orçamento de rolagem é limite conservador, nunca promessa de encontrar campeão.

## Verificação

Capturas reais do Electron, testes de capacidade, raridade, prioridades, retenção e orçamento. Validar overlay pequeno, lista/expansão, tabuleiro, itens, controles e OCR com screenshots existentes. Não chamar isso de teste em partida ao vivo.

## Revisão depois de renderizar

A primeira captura ainda empurrava o tabuleiro para baixo com uma faixa de decisão ocupando toda a largura. A versão final move decisão, motivos e prioridades para a coluna esquerda; o tabuleiro fica à direita, como a referência 14. O cabeçalho da comp expandida encolhe para reunir título e retratos na mesma faixa. A biblioteca mantém arte até a borda, e o aside usa a arte do carry para identificar qual plano será levado ao jogo.

No overlay, o início cabe com duas compras e a próxima transição. No nível 7, três prioridades ficam visíveis; as outras quatro são expansíveis. Equipe e receitas mantêm abas próprias. A variante recolhida, troca de lado, limite antes da loja e passagem de cliques dos badges foram preservados. A janela de 340 × 420 continua com abas acessíveis e conteúdo rolável.

Validação: 35 testes unitários, 17 fluxos do workspace e 8 fluxos do guia, estes repetidos no aplicativo empacotado. Smoke test da versão 0.8.0 com reinício e persistência aprovado. OCR confirmou Nv. 8 na faixa fornecida e Nv. 7 pelo fluxo completo com a captura de jogo. Não houve validação em partida ao vivo.

Capturas de entrega: `review/0.8/desktop.png`, `workspace-expanded.png`, `planner.png`, `overlay-focus.png`, `overlay-inicio.png`, `overlay-equipe.png` e `overlay-itens.png`. A captura `overlay-focus.png` usa nível/ouro manuais numa sessão de demonstração isolada; `overlay-nivel-7-ocr.png` documenta a detecção real sobre a fixture.
