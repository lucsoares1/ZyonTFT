# Planejador — direção visual 0.17.22

O tabuleiro é a superfície principal de edição. O catálogo fixo e o inspetor foram substituídos por escolhas no contexto da casa/campeão. A coluna direita lista a equipe e serve como atalho de equipamentos.

Paleta: fundo #080d17, superfície #101a2b, superfície ativa #18263b, divisória #26354c, texto #eef4ff, ação #347aff. Inter Variable em toda a interface; título do plano24px, títulos18px, texto13px, apoio12px. Cores de custo restritas ao retrato, azul para foco/seleção. Sem relevo.

Tabuleiro + equipe → casa vazia → modal com estrelas, busca, custo e campeões → seleção coloca e fecha. Campeão colocado → modal de itens com3slots, busca/categoria e adição imediata → Concluir. Trocar campeão, carry, mover por clique e remover são ações secundárias explícitas. Arraste usa ponteiro capturado, origem discreta e prévia encaixada no hexágono; nunca uma imagem livre seguindo o mouse.

A composição e suas peças, nomes e equipamentos reais conduzem a hierarquia. O desenho evita uma grade de painéis genéricos: uma superfície ampla do tabuleiro e dois modais focados. Responsivo: equipe abaixo em janelas menores, catálogo com rolagem interna e cabeçalho/rodapé acessíveis. Diálogo nativo com foco contido, Escape, restauração de foco e labels. Animação curta apenas ao abrir e nas respostas à ação; respeitar movimento reduzido.
