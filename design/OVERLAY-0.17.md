# Planejador e itens no overlay

O planejador troca os cards altos e estreitos por unidades em formato horizontal, com retrato, nome, itens ou características reais. Três colunas na largura840 e duas na640 deixam nomes e controles legíveis. O fundo é escuro e os controles são planos, em azul royal.

O pedido à dupla tem quatro opções visíveis: não pedir, uma estrela/uma cópia, duas estrelas/três cópias e três estrelas/nove cópias. As estrelas são ícones SVG, com fonte Manrope consistente; o usuário não precisa abrir um dropdown. Os radios nativos mantêm navegação por teclado, foco e rótulos completos. O clique muda a seleção imediatamente, envia a meta pelo IPC existente e desfaz o feedback se houver erro. Nenhuma alteração no cálculo dos pedidos ou nas compras OCR.

A aba Itens não reserva mais260px para a ordem de montagem ausente. Quando a fonte fornece uma ordem, ela aparece acima; portadores, transferências e receitas usam a largura disponível em todas as comps. A geometria do tabuleiro e o nível ao vivo são preservados.

Verificação: TypeScript/Vite e o fluxo de dupla com Supabase real passaram em perfis isolados, incluindo pedidos por radios, remoção/restauração e medalha de envio. Os pedidos chegaram ao parceiro em825ms observados. As rotas de itens foram medidas sem overflow e começando junto à margem de conteúdo nas larguras840/640. Capturas locais em design/review/0.17.0/duo. O HUD e a loja dos testes são fixtures; não são duas partidas reais.
