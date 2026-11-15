# Medalha da loja e telemetria automática

Direção visual: uma medalha forjada com a marca Zyon, aro facetado, metal claro no topo, cobre na espessura e esmalte escuro no centro. Paleta: #fff5c4, #e8b94f, #79501e, #121d28, #b4e4d2. Manrope na pequena legenda; a marca usa exatamente o desenho vetorial existente. A medalha é o único destaque ornamental: sem pulsação e sem outra animação de atenção.

Posição: canto superior direito da carta, com o centro da marca dentro da área de compra. Nome, preço e linhas de atributos permanecem livres. Uma legenda curta diferencia compra, transição e peça final. Revisão: descartada uma faixa grande na base da carta, que repetiria o problema de cobrir os atributos; o relevo é SVG/CSS, sem nova imagem ou dependência.

O nível do overlay passa a ser exclusivamente automático; a preferência antiga de modo manual é migrada para OCR. Leituras confirmadas são preservadas ao consultar o guia ou alternar janelas, mas a confirmação de candidatos é reiniciada. Uma partida nova limpa as leituras. Falha no fallback do nível não descarta ouro válido, e vice-versa. A primeira leitura autoritativa pode corrigir um nível manual antigo para baixo; depois da confirmação, continuam bloqueadas quedas espúrias na mesma sessão.

A captura38 foi lida como Nv.8/ouro3 pelo fallback local. A linha Nv.8 tinha confiança65 e era descartada pelo limiar70 anterior; o nível agora exige rótulo estrito e confiança>=60, além da confirmação em dois frames e restrição de queda. O ouro mantém70. A tentativa de binarizar os caracteres piorou a distinção entre8 e&, portanto foi descartada e a preparação original foi preservada.

Validação de desenvolvimento:62 testes unitários; teste do guia com8 fluxos e reinício completo; abertura automática com OCR de captura real, interação própria, Alt+Tab e rejeição de alteração manual pela IPC de produção. As5 medalhas foram medidas nos limites das cartas e acima do primeiro25% da arte, com a legenda à esquerda. Capturas visuais usam destaques simulados sobre screenshot local, em perfil isolado; não são evidência de reconhecimento daqueles campeões.
