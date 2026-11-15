# 0.12 — Comps por força no patch

Referências 26–28 de Lucas: classificação por tiers do PivotTFT, com a aparência dos cards da terceira captura. Skill: Anthropic frontend-design.

Plano visual: manter sidebar e aside. Cada tier abre uma seção compacta, seguida por cards com selo em escudo, nome dourado, características, núcleo de unidades/itens e arte panorâmica à direita. A região que na referência mostra estatísticas exibirá nível alvo, carry e número de variações, porque não temos estatísticas de partidas dessa fonte no catálogo.

Tokens: painel `#15191f`, fundo `#101318`, linha `#2b333d`, texto `#e5e8ed`, apoio `#9ca8b8`, título/ouro `#f3bc48`. Segoe UI; título dos cards 15px/600, detalhes 11–12px. Arte e itens têm prioridade visual; selo em escudo identifica o tier sem depender da cor.

```
Tier S   Mais fortes neste patch                  3 comps
  [S] Nome da comp                   Estilo / arte
      características
      Núcleo [unidades + itens]     nível | carry | builds
Tier A ...
Base anterior / Meus planos ...
```

Revisão do plano: usar grade de dados úteis em vez de reproduzir números de vitória inexistentes. Agrupar famílias dentro de cada tier; uma variação B não pode ocultar uma S da mesma família. Escolher outra variação move a seleção ao tier real daquela build. Mostrar o tier em cada botão de variação. Base Mobalytics anterior fica separada da classificação editorial PivotTFT; planos pessoais não recebem força inventada.

Geometria e unidades continuam em tft-visuals.css. Os novos seletores de biblioteca vivem em comp-tiers.css, carregado após workspace-refresh.css, sem alterar o tabuleiro do guia.

## Resultado

- Classificação vem de `comp.tier`, fonte PivotTFT e patch compatível, sem alterar dados para imitar a captura. Seções na ordem S/A/B/C/X; classificações desconhecidas têm grupo próprio. Filtro por tier combinado com busca e estilo.
- Famílias são agrupadas dentro de cada tier. São 56 cartões Pivot para 62 builds no snapshot atual, além dos 18 planos anteriores. As três builds S ficam visíveis mesmo quando outra variação da família está selecionada.
- Selos em escudo nos cards e nas variações do app/overlay. O tier de uma variação não é confundido com seu índice A/B/C. Selecionar outra build limpa filtros incompatíveis e leva a rolagem até a seleção.
- Cards com nomes dourados, características compactas, estrelas 3★, unidades e itens, Flex quando a fonte indica expansões e arte à direita com transparência reduzida. A área direita mostra nível final, carry e variações; não foram inventadas estatísticas.
- 54 testes unitários passaram (`review/0.12.0/unit-checks.xml`). Electron empacotado validou ordem, três S, filtro B, navegação entre tiers, guia, pin, sessão preservada e assets sem erro. Evidências em `review/0.12.0/`.
- Aplicativo real 0.12.0 reaberto. Os testes continuam usando perfis isolados; as preferências reais foram preservadas.
