# 0.12.1 — Alinhamento dos cards

Referências 29–32 de Lucas: selo/título, Núcleo/Flex, estrelas e botão de expansão.

Plano: preservar cores, fontes e identidade da 0.12. Substituir deslocamentos absolutos por três grades: cabeçalho (selo / nome e características / estilo), corpo (Núcleo e Flex / dados), controles (fixar / expandir). Núcleo e Flex terão rótulos no fluxo normal e compartilharão a faixa de estrelas da composição. Unidades terão linhas explícitas para retrato, itens e nome. Três itens devem caber dentro da largura do retrato.

Tokens preservados: fundo #101318, painel #15191f, linha #2b333d, ouro #f3bc48, texto #e5e8ed, apoio #9ca8b8. Segoe UI, título 15px. A correção não muda a classificação por tiers nem o planejamento.

Critério de revisão: alinhamento medido no Electron, não apenas inspeção da captura. Conferir topo dos retratos e nomes entre Núcleo/Flex, centragem das estrelas, limites dos itens e centragem dos ícones dos botões. Capturar cartões compactos e abertos, com e sem 3★, nas larguras de desktop 1536 e 1050px.


Implementado: cabeçalho alinhado por grade, com selo centralizado junto do bloco de título/características; corpo e botões no fluxo da página. Faixa de estrelas compartilhada entre Núcleo e Flex. Retratos 48px, itens 14px, nomes com a mesma linha de base. Expandir preserva a largura e o alinhamento do cabeçalho, substituindo uma regra antiga que centralizava o conteúdo.

Validação de desenvolvimento: build concluída, 54 testes passaram, integração Pivot passou (migração, roteiro, abas nativas, troca de variante e consulta real). Medições dos 74 cards em 1536/1050px, com estados recolhido, aberto e reroll aberto: nenhum desalinhamento detectado para cabeçalho, estrelas, itens, nomes, Núcleo/Flex e ícones dos botões. Capturas e relatório em `design/review/0.12.1/`. Todos os testes de interface usam perfis isolados.

Executável extraído: testes de alinhamento e integração Pivot aprovados; abertura em 4498ms, segunda execução restaurou a janela existente. Aplicativo de Lucas reaberto normalmente no perfil original, sem usar esse perfil nos testes.

Portátil real 0.12.1 validado: abertura em 16078ms, extração em diretório exclusivo por execução, renderer carregado. Arquivo final release/Zyon-TFT-0.12.1.exe (161023984 bytes).
