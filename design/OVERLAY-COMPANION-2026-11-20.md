# Overlay — acompanhamento e consulta

Modo: Operate. Referência: quatro prints fornecidas por Lucas em 20/11, com resumo de Riftbeast Hunter Sivir e consulta ampla com tabuleiro.

## Problemas a resolver

- O launcher substituiu indevidamente o resumo: perderam-se elenco, itens e contato permanente com a comp.
- Sete destinos equivalentes confundem acompanhamento, consulta, planejamento e troca de composição.
- O guia antigo foi comprimido em painéis sem uma hierarquia própria.
- Consulta de itens e seleção de compras precisam ser independentes, sem cliques escondidos.

## Design principal

O acompanhamento é um resumo persistente abaixo das ferramentas: tier, nome, estilo, elenco completo em uma linha, itens proporcionais e nomes. Ver detalhes abre a consulta ampla; Ver comps abre a biblioteca completa. Recolher mantém as ferramentas e não altera OCR, cópias ou plano. Abrir Campeões ou Dupla não remove o resumo.

A consulta usa cabeçalho denso com elenco e métricas reais. Início organiza progressão à esquerda e posicionamento dominante à direita; Itens, Campeões, Transições e Roteiro aprofundam uma pergunta por vez. Planejar permanece explícito. Não reproduzir dados fictícios de early boards, médias ou XP das referências.

Campeões mantém marcação pessoal em um clique, informações individuais no hover/foco e seleção removível no rodapé. Dupla mantém o fluxo social completo do aplicativo, sem urgência e sem pedidos misturados à seleção pessoal.

## Sistema visual

Grafite neutro #171b22, fundo #0c1016, texto #edf1f8, secundário #b6beca, azul Zyon #2497ff apenas em seleção e ações. Inter local, sem escala tipográfica, contornos apenas para delimitar janelas e elementos interativos. Retratos e itens são o conteúdo visual; sem banners decorativos ou diagonais. Resumo568–740×234 conforme elenco; consulta960×740 quando a área segura permite. Dimensões reduzidas se reorganizam, nunca cobrem a loja.

## Contratos e validação

Resumo acompanha state.guideComp, incluindo edição do planejador. Um painel ativo e um fixado, sem colisão com resumo e área da loja. Testar elencos de8 a12, hover, teclado, ausência de comp, dados indisponíveis, busca, troca de comp e preservação de sessão. Verificação independente ao concluir; QA isolado apenas no secundário, sem convites reais, publicação ou alegação de teste em partida.

Em telas baixas com dois painéis, o resumo sobe temporariamente à margem segura, sem sobrescrever sua posição salva. O catálogo tem apresentação compacta própria: os nomes e a seleção removível continuam visíveis. Recolher o resumo libera espaço adicional sem perder a composição.

Hover dos retratos e do tabuleiro consulta conjuntos individuais com fonte/amostra, sem marcar compras. Hover de item na consulta mostra a descrição completa com posição limitada à janela. No resumo de234px, o tooltip é deliberadamente compacto (nome, receita e atributos), com indicação explícita de que a descrição completa está em Ver detalhes; não truncar silenciosamente a descrição.

## Revisão implementada

Estratégia, infraestrutura nativa, consulta, superfícies de tarefa e validação tiveram responsabilidades separadas entre subagents. Build passou e177 testes unitários passaram. Revisão independente verificou23 superfícies nativas, todas as abas,28 hexágonos, resumo de8–12 campeões, preservação de sessão/edições e marcações, dois painéis sem colisão, catálogo baixo300/310/320px e tooltips longos. Os achados de métricas coladas, rodapé cortado, botões aninhados e tooltip fora da janela foram corrigidos e revalidados.

Evidências locais: `.runtime/modular-overlay-qa/report.json` e `summary-report.json`, ambos `ok:true`. Capturas são da interface local com perfil de teste isolado no monitor secundário; não comprovam partida ao vivo, TeamSpeak, segundo PC ou dupla conectada real. Não foi publicada versão nem alterado o perfil pessoal.
