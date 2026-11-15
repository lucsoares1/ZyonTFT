# Zyon 0.15 — Da comp para a partida

Brief final: usar a PNG original zyontftlogo de Downloads, azul moderno e calmo como cor principal, fundo bem escuro, repensar todo o app e overlay, manter a comp como centro e substituir pin pela marca. A preferência azul substitui a verde inicial. Nenhuma mudança no motor OCR, confirmação de compras, fim de partida ou leitura de nível.

Direção: uma bancada de preparação de TFT com arte dos carries e a textura da marca. Azul é a ação e a identidade; raridades, estrelas e tiers conservam sua semântica. O fundo é carvão #070a10; superfícies #0d1420 e #151f30; ação azul #86aef2; texto #edf3fc; apoio #949fb2. Manrope para títulos e corpo, pesos e escala consistentes; nomes de comps ganham espaço real. A revisão escurece as grandes superfícies a pedido de Lucas: o azul vivo fica nas ações e seleções.

Fluxo: escolher comp → entender equipe/itens/aprimoramentos → usar no overlay. Biblioteca continua organizada por tiers. Uma vitrine da comp consultada permite abrir seu plano ou selecioná-la para o jogo. O painel lateral mostra sempre a comp que foi escolhida para a partida e permite consultar suas partes sem perder a seleção. Checklist de preparação é explicitamente separada das compras automáticas da partida.

Estrutura:

```
marca / navegação | título + fluxo de preparação
                 | comp consultada e carry     | plano levado ao jogo
                 | busca / tiers / comps       | equipe / itens / aprim.
                 | detalhes contextuais        | componentes / preparo
```

Revisão antes de implementar: evitar o padrão de dashboard com métricas decorativas e uma coleção de caixas iguais. Arte de campeão fica em uma grande superfície e nas linhas de comp, sem estatísticas inventadas. A textura vem da logo real, sem criar glows em toda a interface. Cantos, densidade e elevação variam entre navegação, arte e controles. Movimentos apenas em seleção, expansão, troca de painel e confirmação; respeitar prefers-reduced-motion e não animar a telemetria em loop.

Overlay: marca + comp + elenco sempre presentes; ação do momento ganha prioridade, abas com ícones e texto. Azul identifica seleção atual; ouro do jogo mantém ícone e número. Consulta de níveis em Equipe permanece independente do OCR. Medalha de loja usa a nova PNG num relevo azul e preserva limites já testados de nome/atributos/preço. Sem capturar cliques no jogo.

Verificação: screenshots e geometria em1536/1050, detalhes das5 abas, planejador, catálogo contextual, overlay aberto/recolhido e10 níveis. Testes com perfis isolados, validação do executável e launcher portátil, preservação de dados reais ao instalar.
