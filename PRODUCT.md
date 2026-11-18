# Zyon TFT

Direção de interface: anthropics/skills@frontend-design, conforme pedido de Lucas.

## Platform

web

Interface React em aplicativo desktop Electron para Windows.

## Stack

Delegada pelo usuário: Electron, React e TypeScript, com processamento local e sem dependência do acesso Overwolf nesta primeira versão.

## Users

Lucas, inicialmente para uso pessoal no Windows enquanto joga TFT.

## Product Purpose

Escolher e fixar uma comp, consultar seu posicionamento e identificar na loja os campeões dessa lista por badges sobre os slots.

## Operating Context

Companion desktop inspirado no escopo de MetaTFT, Mobalytics e TFTactics. Deve ser compacto durante partidas, com passagem de cliques e atalho de visibilidade. O usuário delegou escolhas de implementação e pediu imagem do resultado real.

## Capabilities and Constraints

- Plano por nível adaptativo para todas as comps, com odds verificadas, unidades temporárias, entradas/saídas, portadores de itens, custo de espaços e decisões entre economia, XP, estabilização e reroll. Situação informada manualmente e salva por comp; não lê nível, ouro, vida, banco ou estrelas do jogo. Regras explicáveis, sem alegar otimização por combate ou conhecimento da reserva do lobby.
- Persistir comps e preferências localmente.
- Loja simulada para validar badges, duplicatas, compras e rerolls.
- Janela de overlay real do Windows separada do editor.
- Detecção visual local experimental, sem leitura da memória do jogo ou automação de compras.
- Nenhuma aprovação Riot ou compatibilidade em partida deve ser inventada.
- Seis comps iniciais do set 18, patch 18.6, conferidas em 14/11/2026 no Mobalytics. Cada comp guarda fonte, URL, data, set e patch; curadoria e atualização manuais, sem estatísticas próprias.
- Banco de dados do set 18 com 74 campeões/variantes, 36 características e 65 itens/componentes/emblemas; busca, filtros e presença em guias curados, sem winrates inventadas. Riot Data Dragon fornece custos, artes panorâmicas e nomes/arte de itens; CommunityDragon fornece retratos de HUD, características, alcance e receitas/categorias. Proveniência em `public/assets/set18-provenance.json` e `public/assets/workspace-provenance.json`.
- Planejador de 28 casas com clique e drag/drop, nome/carry editáveis, estrelas manuais, até três itens por unidade e cópia/importação JSON Zyon pela área de transferência. Posições iniciais são sugestões locais por alcance e podem ser alteradas; traits usam a contagem canônica das contribuições inatas verificadas, sem inferir bônus de itens. Equipamentos de guias são curados; estrelas e equipamentos manuais expressam o plano do usuário, sem alegar detecção de upgrades da partida.
- Toda edição no planner personaliza a comp e remove a atribuição do guia. Posições, estrelas e itens persistem e propagam ao overlay; planos personalizados sobrevivem a mudanças de `dataRevision`.
- Loja simulada separada da curadoria de comps. A ampliação do catálogo não comprova reconhecimento OCR integral em partida.
- Migração substitui os exemplos antigos e preserva planos pessoais compatíveis com o catálogo e preferências locais.

## Evidence on Hand

A pesquisa ../.research/tft-candidates/AVALIACAO.md compara quatro candidatos. Sample Overwolf e tft-advisor têm MIT, mas acesso à plataforma depende de credenciais e aprovação. Nenhuma base inspecionada resolve a rota independente inteira.

## Product Principles

- O jogador escolhe; o overlay lembra.
- Mostrar a origem e a confiabilidade dos dados.
- Badge nunca deve bloquear um clique de compra.
- Falha de detecção limpa o destaque em vez de inventar certeza.

## Brand Commitments

Direção atual do overlay: as duas referências enviadas por Lucas em17/11/2026, `design/references/overlay-selected-library.png` e `design/references/overlay-selected-team.png`, são o alvo direto, com contrato em `design/OVERLAY-SELECTED-2026-11-17.md`. Preto/grafite, azul elétrico, Inter local, identidade sem panorama, biblioteca com métricas inferiores e tabuleiro amplo substituem o antigo overlay petróleo/turquesa e as opções HTML. O usuário determinou aplicar e incluiu explicitamente os dois modos reduzidos: compacto160px e só loja116×44. A pausa histórica para escolher projeto está superada; a direção aprovada não equivale a aprovação visual final do resultado.

O programa conserva a referência `design/references/selected-turquoise-interface.png` e o contrato `design/REFERENCE-MATCH-2026-11-17.md`: petróleo profundo, turquesa, arte oficial e fichas horizontais. Essa paleta não é compartilhada com a nova janela nativa. No programa e no overlay, a logo Zyon translúcida aciona os detalhes da ficha; escolher a comp é uma ação textual explícita nos detalhes. O catálogo nativo mostra todas as composições desde a abertura, com rolagem. Buscar e ordenar expande somente os controles; fechar a busca não reduz a lista. Equipe conserva28 casas, todos os níveis e Final; o modo final permite editar posições sem mudar o contexto de partida. Cabeçalho, telemetria, navegação, conteúdo rolável, equipe recolhida por padrão e todos os destinos existentes permanecem funcionais. Fechar oculta somente o overlay. Ampliar, compacto e só loja são ações distintas e preservam plano/contexto. As capturas da rodada atual usam perfil isolado e OCR de fixture; não comprovam partida real nem teste no PC do amigo.

O usuário forneceu referências de TFT/Blitz e rejeitou o acabamento da implementação 0.4. As capturas 12–13 registram os defeitos; a 14 define a expansão detalhada das comps. Corrigir retratos, geometria, itens e banners. Preservar a navegação esquerda e usar a lateral direita para uma lista de compras manual com progresso, custo das primeiras cópias faltantes e componentes do plano. Não apresentar o design como aprovado pelo usuário antes de receber aprovação.

A comp expandida oferece um guia adaptativo por nível com tabuleiro, campeões a procurar, transições e portadores de itens, além de abas de itens/receitas, unidades e progressão completa. Níveis e dados manuais mudam a recomendação. O roteiro local está identificado separadamente da fonte da composição. Sem winrates ou estatísticas inventadas. O programa usa petróleo/turquesa e o overlay usa preto/grafite/azul elétrico. Ambos preservam Inter local e a semântica do TFT. Dourado pertence à semântica do TFT, como tiers, custos e estrelas; retratos e itens do jogo têm prioridade.

O primeiro contato com a comp é a aba Resumo, acompanhada do tabuleiro final. Ela apresenta somente campos existentes no plano: estilo real do guia (omitindo Personalizada), carry principal pertencente ao elenco, metas finais de três estrelas e primeiras peças publicadas. Metas ausentes não geram blocos; quando não há primeiras peças publicadas ou o plano está ajustado, Equipe do plano mostra o elenco completo real. O estilo publicado e as metas finais são identificados como referências do guia, sem substituir a decisão adaptativa da partida.

Itens do plano inclui os equipamentos exatos de todos os portadores, agrupados em Carries (principal e carries publicados presentes no elenco), Linha de frente (demais unidades equipadas dessa função) e Outras unidades (demais portadores equipados). Um carry de frente permanece em Carries. Carries explícitos sem itens recebem uma indicação quando existem equipamentos no plano; se nenhum equipamento foi definido, uma única mensagem orienta adicioná-los no planejador. O componente mostra os equipamentos do plano atual uma vez à esquerda no Resumo e é reutilizado abaixo do tabuleiro nos outros modos com o título Itens da equipe final, usando os itens do guia consultado quando ele é uma referência separada; a prioridade de itens permanece abaixo do tabuleiro, em painel delimitado com sequência numerada, ícones e nomes visíveis. Não fabricar loadouts, funções, conselhos ou estatísticas. A inspeção no overlay usa o mesmo plano de trabalho efetivo do programa.

Ajustar o elenco não apaga o roteiro publicado da comp de origem. A apresentação mantém o plano efetivo separado de sua referência: Resumo mostra equipe, metas e itens atuais; estilo, primeiras peças e carries publicados ainda podem orientar a consulta, com indicação de guia original. Níveis/Flex, Final e o roteiro completo consultam a referência publicada e avisam que o plano ajustado pode ter outras peças. O rodapé conserva a fonte original. No overlay, Roteiro mantém essa consulta, enquanto Agora/Equipe continuam seguindo a partida e o plano adaptativo. Preservar a referência para leitura não restaura o roteiro publicado no motor do plano personalizado.

Níveis, Progressão, roteiro e overlay compartilham a montagem do tabuleiro: preservam casas salvas e ajustes manuais válidos e completam somente as posições ausentes de forma determinística, com a mesma classificação de linha de frente. Para equipes e contextos equivalentes, posições, itens e estrelas devem coincidir. O roteiro mantém os campeões publicados; o plano adaptativo pode mudar a equipe por cópias, capacidade e situação real. As estrelas de uma prévia por nível refletem cópias informadas, enquanto o tabuleiro final conserva as metas do plano ou do guia explicitamente consultado.

O planejador considera capacidade inata comprovada pelas características: Elder Dragon ocupa dois espaços e conta duas contribuições Fera do Rift; dez contribuições liberam dois espaços extras. O núcleo precisa caber no limite anterior antes de ativar o bônus. No nível10, a comp Riftbeast10 original mantém os11 campeões publicados em12 espaços, incluindo Taric/Gnar; nível9 ou uma contribuição faltante não recebem o bônus. Contagem e capacidade são compartilhadas pelo planejador e pelas superfícies, com indicação do bônus quando ativo. A regra vem dos fatos estruturados CommunityDragon e não supõe bônus ausentes.

O plano pessoal permanece salvo até uma ação explícita. Restaurar plano do guia está disponível nos avisos contextuais do programa e em Agora/Equipe do overlay, usando a restauração existente; a restauração explícita conserva partida, contexto, compras e cópias. Consultar o roteiro de referência não troca automaticamente a equipe nem abre uma confirmação adicional.

## Open Decisions

Nome Zyon TFT é provisório, derivado da pasta do usuário. Resolução, escala e disposição da loja serão calibráveis porque não foram informadas.
