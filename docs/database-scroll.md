# Rolagem e padrão visual de Dados

A aba Dados ficava cortada porque `.workspace-content` ocultava o transbordamento, enquanto `.database-page` crescia com o catálogo inteiro. O contêiner da tabela não recebia uma altura limitada e, portanto, não criava sua própria área rolável.

`src/database-refinement.css` limita a página à altura disponível. Campeões, Características, Itens e Aprimoramentos têm uma única área de resultados com `flex: 1`, `min-height: 0` e `overflow: auto`. Contexto da comp, abas, filtros e fonte permanecem fora dessa área. Os contêineres são acessíveis pelo teclado. Cabeçalhos de tabela permanecem fixos; evitar aplicar sticky simultaneamente ao thead e aos seus th.

As quatro abas usam as superfícies, bordas, tipografia e espaçamentos da tabela de Campeões no padrão preto/grafite e azul atual. Aprimoramentos usa linhas abertas, com ícone, nome/fonte e tier editorial, sem caixas independentes por resultado. Nenhuma fonte, estatística ou comportamento de filtro foi substituído.

Validação: `node scripts/verify-database-scroll.mjs` cobre mouse, Ctrl+End, último resultado, cabeçalhos fixos e ausência de transbordamento horizontal nas quatro abas em 1920×1080, 1536×1000 e 1050×820. Capturas locais de topo/fim em `design/review/database-scroll-2026-11-18`. Perfil e conta de teste isolados; sem partida pessoal ou publicação automática.
