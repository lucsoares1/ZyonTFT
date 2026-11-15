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
- Planejador de 28 casas com clique e drag/drop, nome/carry editáveis, estrelas manuais, até três itens por unidade e cópia/importação JSON Zyon pela área de transferência. Posições iniciais são sugestões locais por alcance e podem ser alteradas; traits contam unidades sem bônus de itens ou mecânicas especiais. Equipamentos de guias são curados; estrelas e equipamentos manuais expressam o plano do usuário, sem alegar detecção de upgrades da partida.
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

O usuário forneceu referências de TFT/Blitz e rejeitou o acabamento da implementação 0.4. As capturas 12–13 registram os defeitos; a 14 define a expansão detalhada das comps. Corrigir retratos, geometria, itens e banners. Preservar a navegação esquerda e usar a lateral direita para uma lista de compras manual com progresso, custo das primeiras cópias faltantes e componentes do plano. Não apresentar o design como aprovado pelo usuário antes de receber aprovação.

A comp expandida oferece um guia adaptativo por nível com tabuleiro, campeões a procurar, transições e portadores de itens, além de abas de itens/receitas, unidades e progressão completa. Níveis e dados manuais mudam a recomendação. O roteiro local está identificado separadamente da fonte da composição. Sem winrates ou estatísticas inventadas. Interface grafite, Manrope e dourado restrito a seleção; retratos e itens do jogo têm prioridade.

## Open Decisions

Nome Zyon TFT é provisório, derivado da pasta do usuário. Resolução, escala e disposição da loja serão calibráveis porque não foram informadas.
