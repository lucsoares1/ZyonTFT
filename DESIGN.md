---
name: Zyon TFT — Arena
description: Programa Arena petróleo/turquesa preservado; overlay próprio preto/grafite com azul elétrico, Inter e dados reais.
colors:
  arena-ground: "#0b1118"
  arena-panel: "#151d27"
  arena-raised: "#202b38"
  arena-line: "#3b4859"
  arena-ink: "#f1f4f8"
  arena-muted: "#b0becf"
  arena-accent: "#35d0d0"
  surface-edge: "#6e829b42"
  metric-average: "#91e5d3"
  action-border: "#74e4df"
  action-ink: "#07191d"
  action-hover: "#68e3dd"
  focus-ring: "#61e6db"
  popover-ground: "#182632"
  overlay-ground: "#080a0e"
  overlay-panel: "#11161f"
  overlay-accent: "#2497ff"
  overlay-line: "#242a34"
  overlay-muted: "#aab1bf"
  overlay-ink: "#edf0f5"
  overlay-focus: "#65b9ff"
typography:
  headline:
    fontFamily: "'Inter Variable', Arial, sans-serif"
    fontSize: "40px"
    fontWeight: 760
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  native-title:
    fontFamily: "'Inter Variable', Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 740
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Inter Variable', Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 720
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  metric:
    fontFamily: "'Inter Variable', Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 720
  body:
    fontFamily: "'Inter Variable', Arial, sans-serif"
    fontSize: "14px"
  label:
    fontFamily: "'Inter Variable', Arial, sans-serif"
    fontSize: "11px"
rounded:
  item: "3px"
  portrait: "6px"
  control: "8px"
  card: "12px"
  panel: "12px"
  priority: "9px"
  style-chip: "14px"
spacing:
  compact: "4px"
  control-gap: "6px"
  card-gap: "12px"
  group-gap: "14px"
  face-inline: "16px"
  column-gap: "24px"
  workspace-inline: "38px"
components:
  button-primary:
    backgroundColor: "{colors.arena-accent}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
    textColor: "{colors.action-ink}"
  button-detail-choice:
    textColor: "#c5e7e5"
    backgroundColor: "#35d0d00d"
    rounded: "7px"
    padding: "8px 10px"
  button-disclosure:
    backgroundColor: "transparent"
    rounded: "{rounded.control}"
    height: "38px"
    width: "34px"
    padding: "5px"
  composition-card:
    backgroundColor: "{colors.arena-panel}"
    textColor: "{colors.arena-ink}"
    rounded: "{rounded.card}"
    padding: "0"
  navigation-item:
    backgroundColor: "transparent"
    textColor: "#c4d0df"
    rounded: "{rounded.control}"
    height: "46px"
    padding: "12px 18px"
  plan-popover:
    backgroundColor: "{colors.popover-ground}"
    textColor: "#e8f1ff"
    rounded: "{rounded.panel}"
    width: "286px"
    padding: "15px"
  search-field:
    backgroundColor: "#27313e73"
    textColor: "{colors.arena-ink}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 14px"
  native-shell:
    backgroundColor: "#0b1118fa"
    textColor: "#edf4f8"
    rounded: "{rounded.panel}"
    padding: "0"
  native-nav-item:
    backgroundColor: "transparent"
    textColor: "#aabccd"
    rounded: "7px"
    height: "51px"
    padding: "5px 2px"
  style-chip:
    backgroundColor: "#2dd4bf12"
    textColor: "#6ee7df"
    rounded: "{rounded.style-chip}"
    padding: "3px 10px"
---

# Design System: Zyon TFT — Arena

## Overview

**Creative North Star: "Zyon Arena"**

O programa conserva a referência petróleo/turquesa de `design/references/selected-turquoise-interface.png`. O overlay tem autoridade própria mais recente: `design/references/overlay-selected-library.png` e `design/references/overlay-selected-team.png`, enviadas por Lucas para aplicação direta. O contrato é `design/OVERLAY-SELECTED-2026-11-17.md`. As duas imagens substituem a antiga apresentação nativa, as opções HTML e a pausa para escolher projeto; não alteram os tokens do programa.

No overlay, preto/grafite, azul elétrico, Inter local e retratos oficiais sustentam uma mesa tática ampla. A identidade da comp não tem panorama; diagonais tonais discretas ficam no cabeçalho e a assinatura azul destacada ocupa somente o canto da biblioteca, nunca o tabuleiro. A janela aberta, o painel normal e os dois modos reduzidos pertencem ao mesmo mundo.

**Key Characteristics:**

- Programa: petróleo/turquesa, cabeçalho panorâmico e fichas horizontais verificadas.
- Overlay: preto/grafite, azul elétrico e navegação lateral rotulada.
- Biblioteca nativa com arte lateral e métricas em faixa inferior.
- Equipe com 28 casas, características e equipamentos reais.
- Dados com origem explícita; modos reduzidos preservam plano e contexto.

Implementação local, sem publicação nem aprovação visual final do usuário. A rodada atual registra build e 149 testes unitários; a verificação nativa usa perfil isolado e OCR de fixture. SHIP somente das seis correções pontuadas: todas resolvidas, sem regressões introduzidas. Não é aprovação da superfície inteira nem aprovação visual final do usuário. A aceitação anterior da geometria principal106/128px é somente do programa; capturas e rejeições do antigo overlay são histórico, não autoridade desta rodada.

## Colors

O programa usa os tokens Arena de src/zyon-prism.css. O overlay usa os tokens overlay do frontmatter, extraídos de src/overlay-reference.css, importada por último e escopada à janela nativa. Não propagar turquesa do programa aos componentes internos do overlay. Gradientes e máscaras ficam no sidecar.

### Primary

- **Turquesa Zyon**: seleção, identidade, foco e ações operacionais; corresponde a arena-accent.
- **Tinta de ação**: texto escuro sobre a ação turquesa; corresponde a action-ink.
- **Turquesa claro**: hover e borda das ações; corresponde a action-hover e action-border.

### Secondary

- **Verde-água estatístico**: destaque discreto da média; corresponde a metric-average.

### Neutral

- **Fundo Arena**: base petróleo do programa.
- **Fundo / painel do overlay**: preto/grafite tonal; overlay-ground e overlay-panel.
- **Texto / linha do overlay**: overlay-ink, overlay-muted e overlay-line; limites discretos sem transformar cada seção em uma caixa.
- **Painel Arena / painel elevado**: bases tonais de composições, controles e regiões internas.
- **Linha Arena / linha suave de superfície**: limites e divisórias metálicos, sem brilho contínuo.
- **Tinta / texto secundário**: conteúdo principal e metadados.
- **Fundo do popover**: categorias do plano ancoradas ao acionador.
- **Campos de entrada**: superfície escura translúcida com borda visível e foco turquesa.

**The Game Semantics Rule.** Turquesa identifica as ações do programa; azul elétrico identifica as ações do overlay. Cores de custo e tier continuam pertencendo aos dados do TFT; não usar dourado como seleção global nem confundir o azul elétrico aprovado para o overlay com o refinamento histórico rejeitado.

## Typography

Inter Variable é servida localmente por @fontsource-variable/inter e usada no programa, campos, diálogos e overlay. Arial e sans-serif são alternativas. Não introduzir uma família decorativa.

### Hierarchy

- **Headline**: título de página; 40px na referência de1672px, 34px até1600px e30px até1250px de viewport.
- **Title**: nome da composição; reduz para17px quando o contêiner tem até1350px.
- **Metric**: valores estatísticos com numerais tabulares; usa16px até1600px no programa. Nas fichas nativas os valores usam20px amplos,18px no painel e17px até680px; rótulos12px amplos/10px no painel. A identidade da comp usa26px ampla,19px no painel,16px até680px e17px no compacto.
- **Body**: descrições, abas e ações de leitura do cabeçalho e feed; consultas densas preservam os tamanhos locais existentes.
- **Label**: metadados e rótulos Núcleo/Flex. Nomes das unidades continuam acessíveis nos retratos; as fichas de referência ocultam o nome visual abaixo de cada peça para conservar a linha compacta.

**The Readable Team Rule.** Preserve o espaço de retratos, estrelas e itens antes de comprimir texto. Rótulos e nomes completos permanecem disponíveis nos controles e títulos contextuais.

## Layout

O programa usa lateral expandida de192px, marca e nome acima da navegação rotulada e destinos de46px. A lateral e seu rodapé se estendem na largura disponível, preservando rótulos e perfil em1050px. Meu plano abre um popover nativo ancorado ao acionador. A barra superior tem50px. O cabeçalho usa a largura útil, altura mínima116px e arte panorâmica real do carry ativo atrás do conteúdo. A biblioteca tem uma coluna de composições, intervalo12px e nenhuma largura máxima de1200px; cabeçalho, abas, busca e filtros acompanham o feed. O conteúdo começa a38px da lateral e reserva10px à direita, mais o gutter da rolagem. Até1250px usa24px à esquerda e12px à direita. O feed conserva sua rolagem interna.

As faixas de tier têm altura mínima42px, emblema destacado, título e descrição existente. A ficha CompFace usa splash real do carry recortado à esquerda, identidade com estilo/nível final/aprimoramentos e traits, Núcleo/Flex e região de decisão com quatro métricas e a logo Zyon translúcida. A amostra permanece no texto acessível e no tooltip; a página mantém a fonte do catálogo. O título é texto não interativo. A logo à direita é o único acionador de expansão/recolhimento com aria-expanded e nome acessível; não há marcador ou seta separada. Escolher para o overlay e Remover do overlay ficam como ação textual explícita dentro dos detalhes.

Na largura da referência, a ficha principal usa colunas132px /300px /elenco flexível /354px e mínimo106px. As três primeiras fichas S têm106px uniformes em1672/1536 e128px em1050, com arte alinhada à altura completa. Até1600px usa110px /244px /elenco flexível /300px; até1120px mantém a linha em80px /204px /elenco flexível /206px, mínimo128px, retratos30px e itens10px, com métricas2×2. A altura164px observada na revisão anterior foi rejeitada e não é regra atual. A etiqueta apresenta Slow roll 5 de forma compacta e conserva o estilo original integral no title.

O overlay segue `design/OVERLAY-SELECTED-2026-11-17.md`. Barra de janela66px, identidade120px, telemetria64px e lateral110px na janela ampla; entre961–1250px, identidade176px e telemetria106px. Até960px, barra40px, identidade84px e lateral68px; até680px a lateral usa60px. A lateral começa abaixo da barra da janela e acompanha identidade, telemetria e conteúdo; somente o conteúdo e a própria navegação rolam. Ver equipe começa fechado e troca de comp fecha novamente.

A biblioteca nativa mostra o catálogo completo desde a abertura, com rolagem. Buscar e ordenar expande somente os controles; Todas/S e A/Minhas comps filtram dados reais. A grade usa duas colunas a partir de961px e uma no painel840/640. Cada ficha reúne splash lateral, nome, estilo, traits, retratos e quatro métricas em faixa inferior. A logo translúcida é o acionador do detalhe; escolher a comp permanece uma ação textual explícita.

Equipe oferece Agora, nível final publicado e Final, com seletor para todos os níveis1–10. O tabuleiro mantém as28 casas e usa características com contagem/limiar real ao lado quando há espaço. A equipe final permite editar posições com a API existente; prévias de nível são consulta e não alteram nível, ouro ou cópias da partida. Elenco, transições e controles reais continuam abaixo, sem impor limite artificial de540px ao tabuleiro amplo.

Há três tamanhos de trabalho e dois modos encolhidos distintos: amplo redimensionável com padrão1672×941 limitado à tela; painel normal840×800 limitado ao espaço seguro; responsividade640; compacto de160px de altura com nome, fileira de todos os campeões e decisão, substituindo o retrato isolado do carry; só loja116×44 com controle de restauração. Restaurar mantém plano/contexto e o tamanho amplo salvo. Fechar oculta o overlay, não encerra o programa.

A visão geral é um espaço de consulta aberto, com duas colunas proporcionais de 1:1,2 e intervalo de 24px, sem fundo, borda, cantos ou preenchimento próprios. Suas seções internas também ficam abertas; a hierarquia vem de títulos, espaços e divisórias locais. Resumo/Níveis/Flex ficam à esquerda em abas abertas com sublinhado ativo; Resumo é o primeiro contato e mantém a equipe final no tabuleiro à direita. Níveis e Flex conservam a consulta completa às etapas e alternativas publicadas. No Resumo, Itens do plano fica à esquerda, agrupado por Carries, Linha de frente e Outras unidades conforme os portadores reais. Nas outras consultas o mesmo componente fica abaixo do tabuleiro. A prioridade de itens permanece abaixo do tabuleiro. As linhas de portadores usam uma grade responsiva com base de190px, retrato de34px e itens de23px; a grade acompanha a largura disponível. A altura acompanha o conteúdo, sem mínimo artificial para os antigos cards de apoio.

Todos os níveis publicados e Final ficam acessíveis em controles locais, com o estágio real quando disponível. O elenco principal acomoda até nove unidades em uma linha; dez unidades usam duas linhas equilibradas de cinco. Outras etapas aparecem em linhas compactas: as próximas duas ao consultar um nível, ou as últimas duas na equipe final, quando não há alternativas para a etapa. A troca da prévia não muda nível, ouro, compras ou cópias da sessão. Até 760px de viewport, inclusive no overlay nativo de 640px, a consulta vem acima do tabuleiro; a segunda região recebe divisória superior e 16px de preenchimento superior. A prioridade continua abaixo do tabuleiro e os equipamentos acompanham sua região do modo atual, com rolagem interna existente. Planos sem roteiro também abrem no Resumo. Sem primeiras peças publicadas ou quando o plano está ajustado, Equipe do plano mostra o elenco completo real. O estilo Personalizada redundante fica oculto; metas ausentes não geram blocos e controles de etapas aparecem quando há roteiro no plano ou na referência publicada.

O BoardPanel mantém 28 casas, quatro fileiras de sete. A geometria compartilhada usa largura/altura de 0,8660254, fileiras alternadas deslocadas por metade de largura mais intervalo, e avanço vertical de 75% da altura mais intervalo. Não desenhar um tabuleiro substituto para fins visuais. A visão geral limita seu painel a 570px; o planejador conserva sua própria área maior.

## Elevation & Depth

A profundidade combina arte real mascarada, gradientes tonais translúcidos e bordas metálicas discretas. O painel compartilhado usa linear-gradient(125deg, #1e2835e6, #101820ed); fichas usam linear-gradient(115deg, #202a36e0, #111820ed). Fichas e seleção continuam sem box-shadow; o material vem do fundo e da borda, não de halos estatísticos. A média fica sem text-shadow. Estrelas e itens preservam sombras locais de legibilidade sobre a arte.

O panorama do workspace é uma imagem real, com largura1100px limitada a88%, altura320px, opacidade0,46 e máscaras horizontal/vertical. Até1250px desloca-se para right:-120px e usa opacidade0,34. Esse panorama pertence somente ao programa. O cabeçalho nativo usa diagonais tonais, sem splash panorâmico. A inspeção nativa usa toolbar sticky própria em fundo petróleo opaco; seu cabeçalho de identidade é estático. Não herdar a antiga solução de logo flutuante nem o blur desse cabeçalho superado.

O foco no programa usa contorno turquesa de2px e deslocamento3px. No overlay novo, botões usam deslocamento-2px e campos usam2px, mantendo foco legível dentro das regiões roláveis. As transições locais existentes preservam feedback de estado; a logo de expansão muda opacidade em120ms ease-out e reduced motion continua respeitado.

**The Tonal Material Rule.** Repetir petróleo/turquesa no programa e preto/grafite/azul no overlay, com bordas sóbrias e arte real nas superfícies funcionais. Não generalizar a antiga proibição de gradientes: ela pertence ao refinamento plano rejeitado.

## Shapes

Fichas usam cantos de12px e borda metálica fina em repouso; hover clareia a borda e seleção muda seu tom e fundo. Navegação, campos e ações usam8px; retratos da equipe usam6px, preservando bordas de custo e equipamentos proporcionais. Chips de estilo usam14px; nível final usa12px. Abas do catálogo e modos da consulta mantêm sublinhado; detalhes nativos usam abas abertas com sublinhado azul; subabas locais conservam agrupamentos tonais com cantos próprios.

A consulta tática em duas colunas continua aberta. Sua prioridade de itens é um painel delimitado com cantos9px, borda e gradiente tonal, sequência numerada e nomes visíveis. Hexágonos continuam no tabuleiro e peças contextuais; sua geometria de jogo não é substituída pela silhueta da ficha.

## Components

### Buttons

No programa, ações principais usam turquesa preenchido com texto escuro, borda clara, cantos8px e altura mínima44px no cabeçalho. Hover clareia o turquesa. A logo Zyon de25px fica em botão34×38px, com cantos8px, fundo e borda transparentes em repouso. Sua opacidade0,42 sobe para0,95 no hover, foco ou expansão; hover/aberto acrescentam fundo/borda turquesa discretos. Esse é o único acionador do card para expandir/recolher; o título é texto e não há marcador ou seta separada. A escolha do overlay usa botão textual explícito nos detalhes. No catálogo nativo preto/azul, a mesma logo abre a inspeção e a logo no cabeçalho do detalhe fecha; Escolher comp continua disponível. Foco permanece visível e callbacks existentes continuam funcionais.

### Chips

Estilo publicado usa etiqueta turquesa no programa e azul no overlay com borda, preenchimento translúcido e cantos arredondados. Slow roll · nível 5 aparece como Slow roll 5, mantendo o valor original integral no title. Nível usa somente finalLevel publicado; aprimoramentos usam seus ícones reais e continuam abrindo a consulta. Não reproduzir chips AP, escalonamento ou conselhos inexistentes apenas porque aparecem no mockup. Traits mostram ícone e contagem compartilhada com o planejador, incluindo contribuições inatas verificadas, como duas de Elder Dragon para Fera do Rift. Tiers e bordas de custo conservam sua semântica do TFT.

### Cards / Containers

CompFace une splash recortado, identidade, CompactRoster e região de decisão na mesma ficha horizontal. O programa usa esse componente; a biblioteca do overlay usa OverlayCompCard com sua própria composição e faixa inferior de métricas. No programa, a arte decorativa do carry usa splash(comp.carry), de assets/champions, com altura230px, largura automática, min-width/min-height100% e ponto de ancoragem left/top50%. O recorte usa translate(-55%,-30%); Elder Dragon usa translate(-75%,-45%) e Alune translate(-76%,-28%). Essa arte não é retrato de HUD. Retratos das unidades continuam vindo de assets/portraits. A logo vem do asset original assets/brand/zyontftlogo.png via BrandMark. O material e as bordas do programa se estendem a planejador, dados, dupla e preferências; a janela do overlay usa seu próprio material preto/azul.

### Inputs / Fields

Busca, filtros e campos manuais usam superfícies escuras translúcidas com borda metálica fina, texto claro e foco turquesa no programa ou azul no overlay. Busca e filtros do feed têm44px e cantos8px. A busca preserva o ícone, o nome acessível e a região digitável. src/zyon-prism.css é importada após src/zyon-arena.css; src/overlay-reference.css vem por último e rege a estrutura nativa. Mantenha a ordem para preservar material, arte, reflow e abas. Não adicionar controles visuais que deixem de chamar os callbacks existentes.

### Navigation

Lateral expandida de192px com rótulos de14px, ícones21px e estado ativo turquesa translúcido. Meu plano mantém popover nativo de abertura automática, posição calculada a partir do acionador e altura limitada pela janela. Categorias continuam acionando o plano escolhido. Abas do catálogo, Resumo/Níveis/Flex usam sublinhado turquesa no programa; detalhes nativos usam sublinhado azul; subabas locais conservam grupos tonais compactos. O navegador de níveis conserva painel delimitado, trilho escuro e cursor turquesa com texto escuro.

A navegação nativa é vertical e preserva Comps, Agora, Equipe, Planejar, Roteiro, Itens, Aprim., Partida e Dupla quando há conexão real. Usa role=tablist, aria-orientation=vertical, aria-controls/labelledby e roving tabIndex; ArrowUp/ArrowDown/Home/End mudam seleção e foco. Destinos amplos usam94px e rótulo15px; entre961–1250px usam104px, e no painel56px/rótulo9px. Seleção azul e contorno de foco são distintos.

### Equipe e visão tática

CompactRoster reutiliza UnitStrip, estrelas e equipamentos reais e separa Núcleo/Flex. No overlay selecionado, a identidade usa retrato oficial sem panorama; o elenco completo só aparece ao abrir Ver equipe. Equipe usa abas e seletor de níveis, tabuleiro amplo de28 casas e características reais ao lado quando há espaço. Elenco e transições permanecem abaixo, sem limite540px do overlay histórico. Planejador e controles internos nativos usam azul elétrico. A assinatura curta de canto é exclusiva da biblioteca ampla e desaparece até960px, no tabuleiro e nos dois modos reduzidos.

TacticalOverview abre no Resumo em todas as superfícies, inclusive na visão geral do plano pessoal. Plano de jogo mostra o estilo real (Estilo do guia quando publicado, ocultando Personalizada), o carry atual pertencente ao elenco, metas finais de três estrelas extraídas de comp.stars e primeiras peças publicadas do guia. Metas ausentes ficam ocultas; sem primeiras peças publicadas ou quando ajustado, Equipe do plano mostra o elenco completo real. Esses fatos não geram conselhos, estatísticas ou condições de vitória; as metas finais não são cópias detectadas. O tabuleiro do Resumo é a equipe final do plano. Ver equipe por nível abre a primeira etapa realmente publicada, quando existe. O bloco do Resumo usa os mesmos textos claros, divisórias discretas e respiros do sistema vigente, sem nova paleta.

Itens do plano usa PlanEquipment e equipmentGroups de src/plan-summary.mjs: Carries reúne o carry principal e carries explicitamente publicados que pertencem ao elenco; Linha de frente reúne as demais unidades equipadas com essa função canônica; Outras unidades reúne os demais portadores equipados. Um carry de frente continua em Carries. Cada linha mostra retrato, nome e itens exatos do plano, sem sugerir equipamentos ausentes. Quando existe algum equipamento no plano, carries explícitos sem itens mostram Sem itens definidos; um plano inteiramente sem equipamentos recebe uma única mensagem para adicioná-los no planejador. O Resumo mostra esse componente uma vez à esquerda; Níveis/Flex reutilizam o mesmo componente abaixo do tabuleiro, com o título Itens da equipe final para distinguir esses equipamentos do tabuleiro de uma etapa intermediária. A prioridade publicada permanece abaixo do tabuleiro.

Níveis e Flex conservam todos os níveis, Final, alternativas publicadas, prioridades e carries do plano atual. Botões com aria-pressed selecionam etapa ou alternativa em estado local. A alternativa em prévia usa o mesmo elenco na lista, no tabuleiro e no cálculo de entradas/saídas; o botão indica Em prévia, o título informa o número da opção e um status acessível anuncia a consulta. Flex orienta escolher um nível quando há somente substituições por etapa e informa quando o nível não tem substituições publicadas. Seleções que deixam de existir após atualizar o catálogo retornam a uma consulta válida. A consulta mostra o elenco publicado, entradas/saídas em relação à etapa anterior e reserva ou limite de ouro quando presentes no guia.

O BoardPanel acompanha a seleção em modo de leitura. plannedBoard e publishedBoard de src/board-preview.mjs são compartilhados por TacticalOverview, LevelGuide, GameGuide e PivotGuide. Preservam casas válidas e únicas salvas ou manuais; boardPositions completa as ausentes por IDs ordenados e pela classificação canônica championRole, também usada nos rótulos de data.ts. Nas etapas, equipamentos vêm do mesmo plano/contexto e estrelas das cópias reais. Resumo mantém posições, metas de estrelas e itens do plano efetivo; Final em Níveis/Flex mantém os dados do guia consultado, quando há referência publicada separada. O roteiro publicado e a progressão adaptativa podem escolher equipes diferentes por cópias e capacidade; para o mesmo elenco e contexto, casas, itens e estrelas coincidem. A consulta preserva plano e sessão. Prioridade usa um painel tonal delimitado, números sequenciais, ícones reais de38px e nomes visíveis. As entradas têm68px com intervalo14px e quebram em linhas; não distribuir ícones soltos pela largura. OverlayComps usa effectiveComp para consultar o plano de trabalho da comp inspecionada, mantendo elenco e Resumo coerentes com o programa. Roteiro completo, transições, portadores e estatísticas de itens continuam acessíveis nas respectivas categorias e abas.

O plano de trabalho e o guia publicado são entradas separadas de apresentação. effectiveComp continua removendo pivot ao ajustar o elenco, preservando a lógica adaptativa; isso não significa que a comp de origem perdeu progressão. App fornece activeBase como referenceComp a CompGuide; TacticalOverview usa o guia do próprio plano ou a referência publicada disponível. Resumo conserva elenco, carry, metas e equipamentos do plano efetivo, mostra o elenco completo também quando ajustado e pode exibir estilo/primeiras peças do guia como referência. A classificação de carries reutiliza somente IDs explícitos do guia que continuam no elenco. A nota “Plano ajustado. O roteiro original continua disponível em Níveis.” identifica essa situação. Níveis/Flex, incluindo Final, consultam o guia original e exibem a nota “Roteiro do guia PivotTFT. Seu plano ajustado pode ter outras peças.” Equipamentos nesses modos pertencem ao guia consultado; no Resumo pertencem ao plano atual. Prioridade de itens do guia é rotulada quando o plano está ajustado. CompGuide conserva o roteiro completo e o link da fonte original; no overlay, Roteiro usa comp.pivot ou baseGuideComp.pivot e identifica o guia original. Agora/Equipe continuam adaptativos. A referência publicada não é reintroduzida no plano nem fornecida ao motor de jogo.

Capacidade de equipe usa os fatos estruturados do jogo: Elder Dragon ocupa dois espaços e contribui duas vezes para Fera do Rift; atingir dez contribuições concede dois espaços adicionais. traitCounts e teamCapacity em level-planner.mjs são compartilhados pela seleção adaptativa e pela apresentação. O núcleo que ativa o bônus precisa caber na capacidade anterior; os espaços extras não justificam colocar a própria última peça necessária acima do limite. No Riftbeast10 original, nível10 comporta os11 campeões publicados, incluindo Taric/Gnar, em12 espaços com12 de capacidade, preservando posições e itens da fonte. Nível9 ou a ausência de uma contribuição necessária não recebem o bônus. TraitRail, TraitStrip e BoardPanel usam a mesma contagem; LevelGuide e a equipe nativa mostram o denominador real e +2 da característica quando ativo. Isso corrige uma regra do planejador; não concede capacidade extra a toda equipe nem altera os demais mecanismos de jogo.

Quando o plano tem ajustes e existe guia original, Restaurar plano do guia fica disponível no aviso do Resumo, nas outras abas de CompGuide e em Agora/Equipe nativos; o detalhe do overlay oferece a ação ao plano fixado. No programa o botão tem borda/foco turquesa; no overlay usa azul. Conserva fundo translúcido, cantos5px e altura mínima30px. O estilo é escopado ao programa e ao guia para prevalecer sobre o reset global existente. A ação explícita reutiliza a API restore existente para retornar ao plano da fonte. Consultar a referência não restaura nada automaticamente, não apaga o elenco pessoal nem acrescenta um fluxo de confirmação. Um elenco de trabalho maior continua representando os ajustes salvos até a escolha explícita de restaurar.

### Estatísticas e inspeção no overlay

CompPerformance mostra média, escolha quando disponível, primeiro lugar, Top 4 e amostra do PivotTFT. Os números vêm dos dados da composição. Personalizadas mostram Plano personalizado; ausência publicada mostra Sem amostra publicada. Itens dos carries usa conjuntos reais, média, Top 4 e partidas; o catálogo de campeões conserva sua consulta de itens no escopo de todas as composições.

O detalhe da comp escolhida mantém Plano escolhido e origem compacta. A inspeção de outra comp conserva identidade, seleção e estatísticas próprias. Uma toolbar sticky de50px no painel agrupa Todas as comps e a logo de fechar, com alinhamento no fluxo, sem float; o cabeçalho Consultando fica estático abaixo. A toolbar acompanha padding16px do painel,14px até740px. A rolagem usa scroll-padding-top12px. Inspecionar itens ou aprimoramentos não escolhe a comp automaticamente.

## Do's and Don'ts

### Do:

- **Do** reutilizar CompFace, CompactRoster, UnitStrip e BoardPanel nas superfícies correspondentes.
- **Do** manter petróleo/turquesa no programa e preto/grafite/azul elétrico no overlay, preservando arte real, Inter local e navegação rotulada.
- **Do** apresentar os dados reais do PivotTFT e rotular ausência de amostra.
- **Do** preservar roteiro por nível, transições, OCR, dupla, planejador, cópias e controles da janela.
- **Do** permitir consultar todos os níveis publicados e Final, sincronizando o tabuleiro de leitura sem alterar a sessão.
- **Do** revisar capturas reais com perfil isolado nas larguras desktop e overlay estabelecidas.

### Don't:

- **Don't** restaurar ouro como seleção global, Manrope ou as fichas altas rejeitadas.
- **Don't** adicionar marcador, seta ou título interativo ao card; a logo Zyon é o acionador único de expansão e a escolha do overlay permanece textual nos detalhes.
- **Don't** restaurar o refinamento histórico plano/azul do programa, dock86px ou feed limitado a1200px; o azul elétrico das novas referências pertence ao overlay.
- **Don't** duplicar identidade e métricas no detalhe da comp já fixada no overlay.
- **Don't** fabricar estatísticas, níveis do plano ou estado detectado da partida.
- **Don't** alterar a geometria de 28 casas para acomodar a apresentação.
- **Don't** impor alturas artificiais ao espaço de consulta nem inventar estatísticas de tabuleiros ou condições de vitória.
- **Don't** declarar aprovação do usuário, publicação ou teste físico em dois computadores sem evidência.
