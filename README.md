# Zyon TFT

Companion para TFT no Windows: biblioteca de comps, equipes por nível, itens, aprimoramentos, planejador e overlay com leitura local da loja. Contas, amigos e Duplas Dinâmicas sincronizam os planos pelo Supabase.

## Overlay em desenvolvimento

O botão **Testar painel integrado** permite ativar ferramentas, conteúdo e resumo na mesma janela. Ao abrir uma aba, o resumo desliza para a base; fechar traz o resumo de volta. **Minimizar overlay** recolhe o conteúdo e o resumo, mantendo apenas a barra compacta. **Expandir overlay** restaura o resumo; clicar em uma ferramenta também expande diretamente para essa aba. Compras, plano e OCR permanecem intactos, com suporte à preferência de movimento reduzido.

O resumo persistente mantém a equipe completa e seus itens ao abrir Campeões, Dupla ou Leitura. **Ver detalhes** abre a consulta de posicionamento e progressão; **Ver comps** abre a biblioteca. Recolher o resumo ou fechar um painel não desliga o OCR nem limpa as compras. Um painel pode ser fixado ao lado do ativo, com posições limitadas à área acima da loja.

Campeões marca compras pessoais em um clique e permite remover alvos herdados da comp na seleção inferior. Passe o mouse ou use o foco para consultar conjuntos individuais de itens, identificados por fonte, patch e amostra; não há kits genéricos por classe. Pedidos ao parceiro ficam exclusivamente em Dupla, junto de amigos, código e convites. O projeto desta revisão está em `design/OVERLAY-COMPANION-2026-11-20.md`; a implementação local não implica publicação.

## Baixar e instalar

Use o instalador **Zyon-TFT-Setup** da versão mais recente em [Releases](https://github.com/lucsoares1/ZyonTFT/releases/latest). A partir da versão 0.17.0, o app avisa sobre versões novas e permite baixar e reiniciar para atualizar. Os portáteis antigos precisam dessa primeira instalação manual. Windows 64 bits e conexão à internet são necessários para contas e sincronização.

Cada jogador cria sua conta, adiciona o amigo pelo código e aceita o convite no Zyon. A fila de Duplas Dinâmicas e o envio por Canhão de Cooperação continuam no próprio TFT. As compras observadas pelo OCR podem precisar de correção; o app não lê a posse completa do tabuleiro nem transfere campeões automaticamente.

O Setup inclui o runtime do aplicativo, dependências e modelo local de OCR. Quem instala não precisa de Node, Python ou pacotes adicionais. Desde a 0.17.10, o CI abre o app extraído do próprio instalador e testa OCR offline antes de publicar; a abertura durante a troca dos arquivos também é protegida.

No Planejar do overlay, selecione campeões ou marque sinergias para destacar as peças correspondentes na loja. A dupla recebe os mesmos pedidos, incluindo transições e sinergias. As metas individuais e remoções têm prioridade; o compartilhamento requer os dois apps atualizados.

## Desenvolver

```sh
npm ci
npm run dev
```

`npm test` executa a suíte; `npm run build` confere TypeScript e compila a interface. `npm run package` gera o instalador local sem publicar.

## Publicar atualizações

Depois de testar, salvar e enviar os commits:

```sh
npm run release -- 0.17.1 "Descrição das melhorias"
```

O GitHub Actions gera e verifica os arquivos em um rascunho antes de publicar. Não é necessário colocar token do GitHub no aplicativo. Consulte [o fluxo completo de atualização](docs/ATUALIZACOES.md), incluindo instalação inicial, publicação e limites dos testes.

O Zyon não é afiliado à Riot Games. As imagens e nomes do jogo pertencem aos seus respectivos titulares.

## Histórico técnico anterior à versão 0.17

Overlay com comp completa na faixa recolhida e painel amplo com abas e duas colunas quando aberto. Com o app aberto e uma comp fixada, a confirmação de ouro no jogo inicia o overlay automaticamente. Só aparece com o processo do jogo em primeiro plano; Alt+Tab oculta guia e badges, voltar retoma a mesma sessão. Ouro zero confirmado também é válido. Ocultar manualmente é respeitado na partida atual. Nova identidade de processo limpa o registro.

`electron/game-presence.ps1` observa a janela; `overlay-visibility.cjs` controla a exibição. `verify-overlay-visibility.mjs` testa foco simulado em transporte isolado e OCR real da screenshot. Prévias de layout exigem perfil isolado e `ZYON_OVERLAY_PREVIEW=1`. Sem teste em partida ao vivo. Detalhes e imagens em `design/REVISAO-0.13.md` e `design/review/0.13.0/`.

Biblioteca por tiers do PivotTFT, com 62 builds importadas e 18 planos anteriores preservados. O catálogo inclui variantes, equipes por nível, trocas, itens, componentes e aprimoramentos; os guias estão disponíveis no app e no overlay. A classificação é editorial, atribuída à fonte, sem estatísticas inventadas. O cache consulta o JSON público da página após 6 horas ao abrir; há atualização manual e fallback para o último snapshot válido. Mudanças de set/patch exigem revisão dos dados e assets.

A versão 0.12.3 elimina a faixa clara solta na ponta dos hexágonos. A versão 0.12.2 também adapta itens ao tamanho dos hexágonos e separa os nomes da faixa de equipamentos no app e overlay. `node scripts/verify-details.mjs --packaged` verifica abas e tabuleiros. A versão 0.12.1 corrige alinhamento do selo/título, Núcleo/Flex, estrelas, itens, nomes e botões. Cards abertos mantêm a estrutura do cabeçalho. Referências em `design/references/29–32`, revisão em `design/REVISAO-0.12.1.md`. `node scripts/verify-alignment.mjs --packaged` mede o layout real em 1536 e 1050px com perfil isolado; `node scripts/verify-pivot.mjs --packaged` verifica catálogo e guia nativo.

`npm run data:pivot` atualiza o snapshot validado. O importador da base anterior continua disponível em `npm run data:comps`; suas fontes e limites estão em `design/FONTES-DE-COMPS.md`. Os perfis existentes preservam comps personalizadas e o plano fixado.

Companion pessoal para Windows com editor de composições, guia clicável durante a partida e badges transparentes sobre a loja.

## Ouro e compras automáticos (0.9)

O OCR inicia automaticamente ao abrir o overlay. O ouro acima da loja passa por duas
leituras válidas e alimenta as decisões de economia, nível e rolagem. Compras
confirmadas por clique, slot vazio e débito correspondente somam cópias e
atualizam as prioridades. O registro é separado por processo da partida;
Alt+Tab preserva e uma nova sessão de jogo limpa os dados. **Partida → Nova
partida** permite limpar manualmente quando necessário.

As cópias são compras observadas, não leitura do tabuleiro. Vendas, recompensas
e compras não detectadas podem ser corrigidas em **Partida**. Vida continua
manual. Ouro é exclusivamente automático; correções de cópias ficam recolhidas
em **Corrigir uma contagem**. OCR pausado ou jogo fora de foco não observa novas compras.

Validação: OCR real das imagens do usuário (ouro 8, ouro 18 e nível 7); sequências
simuladas para compras e reset; integração com o overlay. Sem teste em partida
ao vivo. Detalhes e limites em `design/REVISAO-0.9.md`.

Correção de abertura 0.8.1: dependências já compiladas da interface saíram do pacote de execução; extração portátil usa pasta exclusiva por abertura; uma segunda execução restaura a janela existente. `Abrir Zyon.lnk` abre diretamente o app já extraído, sem o atraso de extração do portátil. Detalhes e testes em `design/review/startup/`.

## Revisão 0.8

Biblioteca com características nomeadas, retratos e itens em destaque; aside com identidade do carry e ação de abrir o overlay antes da checklist. O guia expandido coloca prioridades e decisão ao lado do tabuleiro, com motivos e oportunidades secundárias expansíveis. Tipografia de desktop mais compacta, arte panorâmica e seleção em ouro fosco seguem as referências do Lucas. Plano de design: `design/REVISAO-0.8.md`.

No jogo, a aba Agora mostra até três prioridades com motivo, custo e registro de cópia. Pares próximos de upgrade vêm antes de peças ainda não encontradas. Um portador temporário 2★ mantém os itens até o substituto ter cópias registradas suficientes: 2★ para custos 1–4, uma cópia para custo 5. É uma regra conservadora por cópias, não comparação de força em combate. Com disputa informada, o reroll deixa de pedir cópias extras dos alvos já 2★.

O orçamento de rolagens separa o custo de uma cópia de cada uma das três prioridades. Slow roll preserva 50 de ouro; rolagens regulares preservam 20; estabilização urgente limita a três rolagens por avaliação. Se não houver margem para comprar e rolar, o guia indica a loja natural. Na 0.9, o ouro acompanha o OCR; itens equipados, vida e tabuleiro não são lidos.

Capturas da interface real e relatórios: `design/review/0.8/`. A nova camada de apresentação do workspace fica em `src/workspace-refresh.css`; a geometria continua centralizada em `src/tft-visuals.css`.

## Guia durante o jogo

Fixe uma comp e deixe o app aberto. Ao entrar no processo do jogo em primeiro
plano, o OCR inicia; duas leituras válidas de ouro abrem o overlay automaticamente.
Alt+Tab oculta o guia e os badges sem apagar a sessão. O botão **Ler loja, nível e
ouro** permite retomar uma leitura pausada. O guia começa no
nível 2 e acompanha o texto `Nv.` acima de Comprar EXP pelo OCR. São necessárias
duas leituras consecutivas válidas; texto vazio, frações de XP e leituras abaixo
do nível atual não alteram o plano. Nova sessão do jogo limpa o registro; se
necessário, use **Partida → Nova partida**. Os botões +/− do nível ativam a correção manual; **Nível OCR** retoma a
leitura automática. A faixa do nível acompanha a calibração da loja e também
pode ser ajustada em Meu overlay.

- **Agora:** decisão do momento, compras acessíveis, peças para reservar e próxima transição.
- **Equipe:** tabuleiro sugerido do nível, equipe final, entradas/saídas e unidades para depois.
- **Itens:** quem equipa agora, quem recebe depois e receitas com componentes.
- **Partida:** modo de leitura do ouro, vida, força, disputa e correções de cópias.

A consulta de nível no app não muda o nível da partida. Sessão, cópias e aba do
overlay sobrevivem ao reinício do app durante a mesma sessão de jogo. O painel recebe cliques e não força foco ao aparecer; a janela
dos badges deixa os cliques passarem. O guia fica acima da faixa de OCR do nível,
pode ser movido pelo cabeçalho. O launcher reúne Comp, Campeões, Dupla e Leitura/partida; um painel abre por vez, com opção de fixar um segundo. **Ctrl+Shift+G** oculta/restaura os painéis; **Ctrl+Shift+O**
oculta/mostra; **Ctrl+Shift+Q** encerra.

Na loja, uma bandeirinha com a logo marca interesse próprio (azul), da dupla (roxo) ou de ambos (dividida), sem texto ou moldura. Na segunda aba, **Campeões**, um clique marca ou desmarca compras pessoais; a comp já aparece marcada e também pode ser ajustada sem mudar o elenco. A consulta de itens é separada. Amigos, códigos, convites, conexão e pedidos de campeões ficam exclusivamente na terceira aba, **Dupla**, sem níveis de urgência. Marcar um alvo não altera cópias possuídas nem compra nada no jogo.

Windows.Media.Ocr lê os cinco nomes e o nível. Quando falha no texto curto do
nível, Tesseract.js usa um modelo local incluído no pacote, com confiança mínima
70. O parser exige `Nv./Lvl/Level/Nível` e um nível de 2 a 10. Sem downloads em
tempo de execução e sem enviar imagens. Captura 16: `Nv. 8` reconhecido pelo
Windows; captura 17: `Nv. 7` reconhecido pelo fallback e aplicado no overlay pelo
fluxo completo. Testes com screenshots não substituem uma validação em partida.

Evidências: `design/review/0.8/`, incluindo início, OCR, equipe, itens e transição.

## Revisão visual

A versão 0.5 corrige os problemas indicados por Lucas nas capturas 12–13: recorte inadequado das unidades, deslocamento das fileiras, itens pequenos e corte abrupto dos banners. Usa 74 retratos de rosto do HUD, hexágonos regulares com deslocamento de meio passo, equipamentos em faixa própria e banners ancorados na borda direita. Navegação e aside do plano fixado foram mantidos. O fluxo de design deste projeto passou para `anthropics/skills@frontend-design`, conforme pedido do usuário. Detalhes em `design/REVISAO-0.5.md`.

A expansão das comps tem abas de visão geral, itens, unidades e progressão. Na 0.6, o plano de nível é interativo: níveis 2–10 recalculam equipe, entradas/saídas, alvos acessíveis e portadores temporários. Ouro, vida, força do tabuleiro, cópias e disputa são entradas manuais, salvas por comp. O motor orienta economia, XP, estabilização ou reroll conforme essas entradas. A lateral continua uma lista independente de primeiras cópias; seu orçamento não inclui XP ou rerolls.

As chances são extraídas da referência `TFTSet18.DropRateTables.Shop` no mapa CommunityDragon 16.22, tabela `{1ee21754}`; fonte, hash e valores em `src/generated/level-rules.json`. Nível 7 usa 19/30/40/10/1, nível 8 usa 15/20/32/30/3 e nível 9 usa 10/17/25/33/15. São chances por faixa de custo e espaço, não de um campeão específico. Sem modificadores de aprimoramentos/Wisps. O motor não simula combate nem conhece a reserva dos adversários; os roteiros por papel/sinergia são sugestões Zyon.

As seis comps têm portadores temporários definidos; personalizadas usam o catálogo e as características do núcleo. Peças de custo 4/5 só entram como busca principal nos níveis 8/9, salvo posse antecipada informada (que não autoriza perseguir cópias raras). Reroll de custos 1/2/3 usa níveis 5/6/7. Adapt or Die busca Master Yi, Vi e Rengar 3★, sem confundir a Nidalee custo 4 com um alvo de reroll de custo 3. Dragão Ancião consome dois espaços. Veja `design/REVISAO-0.6.md`.

O planejador usa 28 casas, clique e drag/drop, posições persistidas, estrelas manuais, até três itens por unidade, nome do plano e carry editáveis. Copiar/importar usa JSON do formato Zyon pela área de transferência. A edição transforma um guia em plano `Personalizada`, remove sua atribuição editorial e preserva o plano em revisões futuras dos dados. O tabuleiro do overlay usa o mesmo plano salvo.

Capturas históricas da revisão 0.6 em `design/review/0.6/`: `level-7.png`, `level-8-transition.png`, `level-9.png`, `reroll-level-7.png`, `level-desktop.png`, planner, tabelas e estados em 390px. O acabamento da 0.5 continua documentado em `design/review/0.5/`; `.impeccable/` guarda evidências históricas.

## Dados

São seis comps do set 18, patch 18.6, com guias públicos do Mobalytics conferidos em 14/11/2026: AP Exodia, Wrath of the Woods, AD Exodia, B4L Power, Adapt or Die e Riftbeast Ascension. Cada registro em `src/generated/comps.json` guarda fonte, URL, data, set e patch; o detalhe da comp exibe o link de atribuição. A curadoria é manual e não inclui estatísticas próprias ou atualização automática do meta.

O banco de dados contém 74 campeões/variantes, 36 características e 65 itens/componentes/emblemas do set 18. Oferece busca, filtros e tabelas; “Nos guias” conta presenças nas seis comps curadas, sem representar taxa de vitória. Custos e artes panorâmicas vêm do Riot Data Dragon; os retratos de rosto, características e alcance vêm do CommunityDragon. O catálogo de itens usa receitas/categorias do CommunityDragon e nomes/arte do Data Dragon. A versão dos assets Data Dragon (16.22.1) é distinta do patch TFT (18.6).

As origens dos assets estão em `public/assets/set18-provenance.json`, `public/assets/workspace-provenance.json` e `public/assets/portraits-provenance.json`. O último registra a URL individual dos 74 retratos oficiais de HUD da Riot distribuídos pelo CommunityDragon.

As posições iniciais são sugestões locais por alcance, sem importar posicionamento dos guias. Ao mover unidades, o plano passa a usar posições manuais. Traits contam unidades e destacam o primeiro limiar do catálogo, sem bônus de itens ou mecânicas especiais. Equipamentos dos guias são curados por unidade; itens e estrelas adicionados no planejador são escolhas manuais do usuário e não leitura do estado da partida. A loja simulada continua um laboratório separado desses guias.

## Abrir

Neste computador, prefira `Abrir Zyon.lnk` ou `release/win-unpacked/Zyon TFT.exe`; mantenha a pasta `win-unpacked` inteira. Para transportar o app, use `release/Zyon-TFT-0.10.0.exe`. No checkout com dependências instaladas, execute `Abrir Zyon.ps1` ou `npm start` após `npm run build`.

```powershell
npm install
npm run build
npm start
```

Desenvolvimento: `npm run dev`. Somente interface no navegador: `npm run dev:web`. O overlay do Windows e o OCR requerem o aplicativo Electron.

## Funciona nesta versão

- Seis comps de guias atuais datados, criação/edição/exclusão de planos pessoais e persistência local.
- Planejador de 28 casas com clique, drag/drop, posições, estrelas manuais, até três itens por unidade, edição de nome/carry e cópia/importação JSON Zyon.
- Banco de dados com 74 campeões/variantes, 36 características e 65 itens, busca, filtros e assets locais com proveniência.
- Layout responsivo com navegação preservada, aside contextual e ação de criar comp acessível no mobile.
- Fixar/desafixar uma lista de campeões para os badges; plano adaptativo separado para orientar decisões com entradas manuais.
- Loja simulada com reroll, duplicatas, compra e ocultação.
- Launcher e até dois painéis nativos, com bandeirinhas transparentes aos cliques; posições relativas ao monitor e sessão preservada entre tarefas.
- `Ctrl+Shift+O`: mostrar/esconder overlay. `Ctrl+Shift+Q`: encerrar aplicativo.
- OCR local experimental para nomes e nível, com recortes posicionais e correspondência exata com o catálogo. Nenhum servidor recebe imagens.

## Resultado real na captura do usuário

O arquivo de teste foi processado pelo OCR do Windows, não transcrito para alimentar os badges. Resultado bruto, por slot:

| Slot | OCR bruto | Classificação | Badge na comp de teste |
| --- | --- | --- | --- |
| 1 | Vi | Campeão | Sim |
| 2 | Master Yi | Campeão | Não |
| 3 | Alistar | Campeão | Sim |
| 4 | Rubrivirim | Campeão | Sim |
| 5 | Camelô | Oferta especial | Não |

Comp usada: Vi, Alistar e Rubrivirim. Evidência em `.impeccable/review/ocr-result.json` e `.impeccable/review/sua-captura-com-badges.png`.

Para reproduzir esse teste de regressão específico, mantenha `npm run dev:web` em execução e rode:

```powershell
node scripts/test-screenshot.mjs "C:\caminho\captura.png"
```

O teste contém as expectativas dessa captura; não é um classificador genérico de qualquer imagem. O modo `-ShopFixture` do leitor também aceita `-ConfigPath` com outra geometria para novos experimentos.

## OCR em partida

Em **Meu overlay**, escolha o monitor e ajuste a região dos cinco cards. As coordenadas iniciais foram calibradas na captura 1913×1070 enviada, com a faixa de nomes junto à borda inferior. O jogo deve estar em modo sem bordas e em primeiro plano. A leitura pausa e limpa dados quando outra janela fica em foco.

Os quatro nomes da captura passaram no reconhecimento e Camelô ficou sem badge. Isso não valida animações, outras resoluções, escalas de interface, múltiplos monitores com DPI diferente ou o cliente em partida. O leitor só mapeia nomes presentes no catálogo fornecido: o catálogo agora inclui as 74 unidades/variantes do set 18.

A leitura continua experimental mesmo com o catálogo ampliado. A validação dessa captura é uma regressão específica; não comprova reconhecimento integral das 74 unidades durante uma partida.

## Verificação

```powershell
npm test
npm run build
# Após o build, sem precisar iniciar o Vite:
npm run test:ui
node scripts/verify-game-guide.mjs
npm run package
node scripts/verify-game-guide.mjs --packaged
node scripts/smoke-packaged.mjs
```

A 0.8 passou em 35 testes unitários, 17 fluxos de UI do workspace e 8 fluxos do guia/OCR, estes também no pacote. `npm run test:ui` usa `scripts/verify-workspace.mjs`, abre a build de produção no Electron com dados separados e verifica migração, ambos os asides, planner, tabelas/filtros, reflow em 390px/1440px, cópia/importação, persistência, badges, loja, overlay transparente e inicialização do OCR. Também verifica a proporção dos hexágonos, o deslocamento de meio passo, as 28 casas dentro dos limites, retratos quadrados e o banner chegando à borda. A suíte preserva a área de transferência do sistema. Resultados e capturas atuais ficam em `design/review/0.8/`. A regressão OCR da captura fornecida continua no comando separado descrito acima.

O smoke test do pacote verifica versão de produção, assets, overlay, processo OCR e persistência após reiniciar. A revisão visual usa capturas reais do Electron e não amplia a validação do OCR para uma partida completa.

## Arquitetura

- `src/data.ts` e `src/generated/`: catálogo, seis guias e revisão dos dados.
- `src/Workspace.tsx` e `src/workspace.css`: aside contextual, planejador e banco de dados responsivos.
- `src/TftPanels.tsx` e `src/tft-visuals.css`: retratos, equipamentos/estrelas salvos e uma única geometria de tabuleiro compartilhada com o overlay.
- `src/CompGuide.tsx` e `src/comp-guide.css`: guia expandido e lista de compras; `src/plan-summary.mjs` calcula custos e ingredientes.
- `src/planning.mjs`: posições iniciais, movimento e conversão central de edições em planos pessoais.
- `src/preferences.mjs`: migração do catálogo e dos planos persistidos.
- `src/shop.mjs`: identificação exata de nomes e seleção de cinco slots, mantendo duplicatas.
- `src/App.tsx`: composição do workspace, persistência das edições do planner e loja de laboratório; rota `view=overlay` renderiza o plano e os marcadores.
- `src/ScreenshotProof.tsx`: prova visual construída em HTML sobre a captura original, com posições calculadas a partir do resultado OCR.
- `electron/main.cjs`: janelas, atalhos, IPC e persistência.
- `electron/shop-reader.ps1`: captura posicional e OCR local do Windows; não lê memória de processos.
- `scripts/test-screenshot.mjs`: regressão da captura fornecida pelo usuário.

Esta base foi escrita do zero. A pesquisa de repositórios está em `../.research/tft-candidates/AVALIACAO.md`; o acesso Overwolf não foi adotado como dependência do protótipo pessoal.

## Créditos

Projeto pessoal independente, sem afiliação ou aprovação da Riot Games. Imagens de campeões: Riot Games, distribuídas pelo Riot Data Dragon e CommunityDragon; fontes atuais em `public/assets/set18-provenance.json` e `public/assets/workspace-provenance.json`. Composições: Mobalytics, com URL e data em cada registro de `src/generated/comps.json`. Manrope: SIL Open Font License. Lucide: ISC. Electron, React e ferramentas mantêm suas respectivas licenças. A captura de teste foi fornecida pelo usuário e não integra os assets do pacote portátil.

## Atualizar o catálogo

`npm run data:sync` renova o catálogo-base e artes panorâmicas/itens dos guias do set 18, validando as unidades referenciadas nas comps. `npm run data:workspace` gera o catálogo de itens e características. `npm run data:portraits` baixa os 74 retratos de HUD para `assets/portraits`, sem substituir os banners. Os dois últimos scripts aproveitam `.research/cdragon.json` quando disponível; remova esse cache ao desejar buscar uma revisão nova. Para renovar todos os assets, execute os três comandos.

Esses comandos **não** atualizam os guias nem o patch da curadoria: revise `src/generated/comps.json` e a revisão em `src/data.ts` ao conferir um novo patch. A versão de assets Data Dragon (16.22.1) não é o patch TFT (18.6).

Preferências antigas passam pela migração em `src/preferences.mjs`. Ao mudar `dataRevision`, exemplos originais são substituídos pelos guias atuais, enquanto planos `comp-*`, demonstrações antigas modificadas e planos marcados como `Personalizada` são preservados. Todas as edições no planejador passam por `personalizePlan`, inclusive nome, carry, estrelas, equipamentos e movimento; assim, uma comp curada modificada sobrevive à próxima revisão e deixa de se apresentar como guia editorial. IDs de unidades são normalizados e entradas fora do catálogo atual são removidas. Preferências são mantidas; seleções inválidas passam para uma comp válida e o estado explicitamente desafixado é respeitado.

O comando `npm run data:levels` extrai odds com a referência exata do set no mapa de jogo versionado e gera metadados para o plano dinâmico. Usa o catálogo e o cache CommunityDragon existente. Ele não atualiza o patch automaticamente: confira o novo mapa, as notas Riot e os testes antes de mudar a versão. A seleção de times e decisões fica em `src/level-planner.mjs`; o painel e seus estilos ficam em `src/LevelGuide.tsx` e `src/level-guide.css`.

