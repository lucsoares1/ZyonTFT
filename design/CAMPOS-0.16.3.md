# Campos e seleção — 0.16.3

O usuário rejeitou a cápsula com seleção em degradê e o aspecto dos inputs do login e do app. A mudança prioriza separar navegação, edição e ações, preservando a identidade azul escura do Zyon.

Paleta: fundo tinta#0c121c, face ardósia#142133, borda aço#354d6d, foco azul#88b4f5, texto#edf4ff e contexto#8ca3c5. Manrope continua como tipografia: rótulos10px, conteúdo13px, modos13px. As cores servem ao estado do controle; campos não recebem gradientes decorativos.

Entrar e Criar conta passam a ser abas abertas com ícones e linha de seleção deslizante. E-mail e senha têm rótulo integrado, valor/placeholder na linha seguinte e ícones próprios. Nome e usuário usam a mesma face em duas colunas. O foco clareia a face, a borda e um filete lateral; não depende de animação para ser reconhecido. Mostrar/ocultar senha, autocomplete, limites e nomes acessíveis permanecem.

No app, buscas ganham um nicho para o ícone, filtros usam seta própria, e campos do planejador e das configurações seguem o material. Library, banco de dados e pool usam abas abertas com linha de seleção, sem cápsulas encaixadas. Range, checkbox, radio e color não entram nas regras genéricas. A geometria de unidades, tabuleiro, medalhas e OCR não mudou.

Implementação visual em src/controls.css, após account.css. As exclusões de tipo usam :where para não superar indevidamente estilos dos wrappers de busca. Reduced motion elimina transições da seleção e foco.

Verificação: build TypeScript/Vite; fluxo existente de cadastro, senha incorreta, login, perfil, logout, bloqueio nativo e reinício de sessão pelo verify-account-gate. Capturas adicionais com --controls para library/planner/database. Janela1050×740 e1500×1020. Nenhuma conta ou preferência real foi usada nos testes.
