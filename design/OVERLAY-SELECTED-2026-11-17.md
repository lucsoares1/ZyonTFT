# Overlay aprovado como direção visual

Autoridade: as duas imagens enviadas por Lucas em 17/11/2026, `references/overlay-selected-library.png` e `references/overlay-selected-team.png`. Elas substituem as opções HTML, a paleta petróleo/turquesa e a pausa histórica para escolha de projeto. O pedido explícito é implementar, incluindo os dois modos encolhidos.

Modo Operate. Preto/grafite, azul elétrico #2497ff, Inter, geometria diagonal discreta, navegação lateral azul, identidade sem panorama, cards com arte lateral e quatro métricas em faixa inferior. Equipe com tabuleiro inteiro de 28 casas e características ao lado na janela ampla. Dados, elencos, equipamentos, estrelas, OCR e integração de dupla continuam reais; valores ilustrativos da referência não substituem os dados do catálogo.

Estados obrigatórios: aberto amplo, painel normal 840/640, compacto 160px e só loja 116×44. Ampliar/recolher e só loja são ações distintas; restaurar mantém plano e contexto. A consulta de níveis não altera o nível lido no jogo. A janela ampla pode cobrir mais do jogo por escolha explícita; o painel normal continua respeitando o espaço reservado à loja.

Verificação: build, testes de sessão e limites da janela, capturas nativas em perfil isolado e inspeção visual. Sem teste no PC do amigo, sem publicação e sem alegação de aprovação visual final do usuário.

Correção solicitada por Lucas: o modo compacto mostra todos os campeões da composição em fileira, com retratos e equipamentos, em vez de ocupar o espaço com a foto do carry. Mantém160px, nome, status OCR e restauração; não altera o modo só loja.

Legibilidade no compacto: retratos padrão ampliados de30 para44px e itens de8 para11px; identidade/fileira usam92px e a faixa inferior30px, preservando a janela de160px e o elenco inteiro. Elencos maiores ajustam a largura dos retratos ao espaço disponível.

Cabeçalho: alça, logo e nome compartilham centro vertical. Sem margem negativa na alça; os dois intervalos são12px na janela ampla e8px no painel/compacto. A logo usa bloco com object-fit contain e o nome tem line-height1. A verificação nativa mede igualdade dos gaps e centros verticais.
