# Zyon TFT · design 0.6

Direção atual: referências TFT/Blitz fornecidas por Lucas, corrigidas a partir das críticas nas capturas 12–13 e ampliadas com o guia da captura 14. A implementação anterior não foi aprovada. O fluxo usado agora é anthropics/skills@frontend-design, por pedido explícito do usuário; não usar o Impeccable neste projeto.

## Estrutura

Navegação lateral fixa, biblioteca/planejador central e lista de compras à direita. A lateral acompanha a comp fixada, enquanto a biblioteca pode mostrar outra composição. A lista é manual, registra a primeira cópia de cada campeão e calcula o custo das cópias ainda não marcadas. Não infere posse pelo OCR e não desliga badges de upgrades.

Uma composição expandida usa cabeçalho compacto com elenco, abas Visão geral/Itens/Unidades/Progressão e edição. Na 0.6, uma sequência de níveis selecionáveis comanda o guia: contexto manual, decisão explicada, chances por custo, equipe e tabuleiro à esquerda, busca e transições à direita. Abaixo ficam portadores de itens e o formulário recolhido de cópias/disputa. Progressão acrescenta a sequência inteira de equipes. Receitas, contagem de componentes e custos derivam do catálogo local. O roteiro é orientação Zyon, não estatística nem conteúdo atribuído ao guia original.

## Paleta

| Papel | Cor |
| --- | --- |
| Fundo | #101216 |
| Painel de comp | #191d23 |
| Comp selecionada | #1c2027 |
| Borda | #303640 |
| Texto | #e8ebef |
| Texto secundário | #a7b2c2 |
| Seleção | #ebc577 |
| Botão principal | #dcb361 |
| Tabuleiro | #191f25 |
| Casa vazia | #1c242b |

Custos mantêm as cores de TFT: cinza, verde, azul, roxo e dourado. O ouro de seleção não substitui a cor de custo de uma unidade.

## Tipografia e escala

Manrope local. Título de tela 24px/700; comp 16px/700; títulos internos 12–14px; conteúdo e ações 11–12px; metadados 9–10px. Sem grandes slogans ou rótulos decorativos adicionais. Nas pequenas peças do tabuleiro, nomes têm escala limitada pela largura real.

## Retratos, itens e arte

- portrait() usa assets/portraits: os 74 ícones de HUD do set 18. São imagens quadradas compostas para rostos.
- splash() usa assets/champions: arte panorâmica preservada para banners e loja simulada.
- Retratos de elenco: 52px no desktop padrão, 46px em telas menores e 58px em telas largas. Itens ficam numa faixa própria abaixo, com borda e espaço entre ícones.
- Itens grandes de receita: 28–33px; ícones no elenco: 14–18px; no tabuleiro: 16–24px conforme a largura.
- Banner ancorado na borda direita, largura de 58%, máscara horizontal contínua. Nunca combinar left fixo com largura e right que produzam sobredefinição.

## Geometria do tabuleiro

Uma implementação em src/tft-visuals.css atende planner, preview do guia e overlay nativo. Hexágonos regulares com largura/altura = sqrt(3)/2; sete células por fileira; quatro fileiras. Fileiras ímpares deslocam exatamente metade da soma largura + espaçamento. O avanço vertical é 75% da altura mais o espaçamento. Largura máxima de 780px preserva uma escala utilizável em monitores grandes.

No mobile, o tabuleiro mantém largura legível com rolagem própria. Não reduzir nomes a 6px para forçar as 28 casas na largura do telefone. Movimento, seleção, estrelas e itens usam a mesma célula de posição em todas as vistas.

## Comportamento

- Cabeçalho compacto da comp expandida em larguras maiores que 1100px.
- Detalhes em duas colunas no desktop; uma coluna abaixo desse limite.
- Aside vai após o conteúdo abaixo de 850px.
- A lista de compras persiste por comp em checklists; Reiniciar limpa só a lista daquela comp.
- Custo da lista inclui uma cópia de cada unidade faltante; exclui experiência e rerolls, explicitado na tela.
- Itens contam ingredientes repetidos, inclusive duas unidades do mesmo componente na receita.
- Plano personalizado não recebe uma meta de nível inventada.
- Estados de foco, contraste, movimento reduzido e criação de comp no mobile permanecem disponíveis.

## Evidência

Capturas atuais em design/review/0.6: level-7.png, level-8-transition.png, level-9.png, reroll-level-7.png e level-desktop.png, além dos fluxos anteriores. Os testes de UI medem geometria do tabuleiro, alterações de campeões/odds por nível, decisões com vida/ouro, cópias antecipadas, conclusão de 3★, persistência por comp e navegação em 390px. Evidências históricas do acabamento permanecem em design/review/0.5.

Histórico do documento anterior em design/history/DESIGN-0.4.md. Os arquivos .impeccable são históricos e não definem o fluxo atual.
