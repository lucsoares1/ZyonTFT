# Refinamento da interface — 17/11/2026

Lucas pediu uma interface profissional para o programa e o overlay, com a mesma prioridade, usando Blitz TFT e TFTAcademy como referências. Rejeitou o fundo com aparência de geração automática, os espaços arbitrários dos cards e o excesso de contornos. Aplicação da skill Impeccable em modo Operate: distill e revisão anti AI slop.

## Referências inspecionadas

- https://blitz.gg/tft/comps — lista atual observada no navegador: fichas horizontais, hierarquia entre título, traits, elenco, métricas e ações; imagens dos campeões discretas; controles de filtros reunidos.
- https://tftacademy.com/tierlist/comps — catálogo e seleção de composição observados no navegador.
- https://tftacademy.com/tierlist/comps/set-18-tempo-riftbeast — guia aberto, com elenco, itens, primeiras unidades, prioridade e tabuleiro como informação principal.

As referências orientam a apresentação; os dados continuam pertencendo ao catálogo e aos planos existentes do Zyon. Não importar estatísticas, textos editoriais ou identidade das marcas.

## Direção

Fundo azul-noite sólido, contraste por superfícies e tipografia, azul reservado a ações e seleção. Arte real dos campeões permanece secundária aos retratos e equipamentos. Remover gradientes de material, reflexos violeta, halos estatísticos e molduras internas redundantes. Abas abertas com sublinhado ativo substituem cápsulas dentro de cápsulas. Cards normais se distinguem pelo fundo; o contorno serve a hover, seleção ou foco. Custos, tiers, estrelas e itens conservam sua semântica do TFT.

Biblioteca em uma coluna, com ritmo vertical compacto. Elenco, métricas e ações continuam na mesma linha onde houver espaço; cards estreitos preservam a quebra existente. A visão de consulta fica aberta em duas colunas, com separação por espaço, e empilha em640px. Sem altura fixa para esconder conteúdo.

## Mapa do projeto

- `src/main.tsx`: ordem das folhas de estilo e fonte Inter local.
- `src/App.tsx`: biblioteca, navegação, estado e integração do programa.
- `src/ZyonPieces.tsx`: cabeçalho CompFace e elenco CompactRoster compartilhados.
- `src/TacticalOverview.tsx`: Resumo/Níveis/Flex, equipamentos e tabuleiro de consulta.
- `src/CompGuide.tsx`: detalhe da composição no programa.
- `src/GameGuide.tsx`, `src/OverlayRoster.tsx`, `src/OverlayComps.tsx`: janela nativa, equipe fixada e consulta da biblioteca.
- `src/tft-visuals.css`: autoridade da geometria do tabuleiro e apresentação de itens/unidades.
- `src/zyon-arena.css`: estrutura e pontos de quebra compartilhados.
- `src/zyon-prism.css`: acabamento final compartilhado, alvo desta revisão.
- `src/SocialPanel.tsx`, `src/OverlayPlanner.tsx`, `electron/social-service.cjs`: amigos, dupla e pedidos.
- `electron/shop-reader.ps1`, `electron/game-session.cjs`: leitura local e sessão da partida.

## Limites e verificação

Alteração visual; preservar autenticação, sessão, OCR, compras/cópias, dupla, regras adaptativas, conteúdo publicado, equipamentos e28 casas. Não publicar nem alterar o perfil pessoal. Verificar o programa em1536/1050px e o overlay nativo em840/640px, em perfil isolado e com fixture OCR identificada. A validação local não é teste em partida real ou no computador do amigo.

Script de inspeção: `scripts/verify-interface-design.mjs`, executado com sucesso. `design/review/interface-2026-11-17/checks.json` registra ok:true e18 capturas nas larguras previstas, sem erros de console, imagens quebradas ou overflow horizontal; controles compactos cabem,28 casas são preservadas e a consulta de nível não altera a sessão. Programa medido com cards de162px em1536 e155px em1050, sem altura fixa. Conta de teste descartável, perfil isolado e fixture OCR17; o perfil real não foi usado. Build e148 testes existentes aprovados. O detector mecânico rodou uma vez com exit0 e saída truncada, com avisos visíveis de documentação sobre o DESIGN anterior; não foi repetido nem declarado limpo. Evidências locais ignoradas pelo Git em `design/review/interface-2026-11-17/`. Revisão final da persistência documental pendente; sem aprovação do usuário, publicação, partida real ou teste no segundo PC. Package permanece0.17.27.
