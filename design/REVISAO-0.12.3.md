# 0.12.3 — Ponta inferior dos hexágonos

Referência 33: Lucas apontou uma luz verde solta na aresta inferior. A sombra de `.hex-portrait::after` tinha recuo de 2px nas laterais e no fundo: escurecia as diagonais e deixava o fundo de raridade exposto na ponta. Isso produzia uma faixa clara isolada.

Correção pontual: prolongar a camada de sombra até as arestas laterais e inferior do recorte. Preservar retratos, cores, tamanho, borda, itens, nomes e geometria. Mesma regra no app, planejador e overlay. Não adicionar brilho nem alterar assets.

Comparação ampliada da mesma unidade em `design/review/0.12.3/tip-before.png` e `tip-after.png`. Capturas pelo Electron, perfil isolado. A ponta deve seguir o tom escuro contínuo das arestas, sem a faixa clara.

Build concluída; 17 cenários de detalhes/abas/tabuleiros passaram em desenvolvimento e no executável extraído. Abertura em 2253ms; segunda execução restaurou a janela existente. Comparação visual ampliada confirma remoção do ponto exposto: pixel de controle passou de RGB(92,170,140) a RGB(31,56,55), consistente com a sombra das arestas. Testes com perfis isolados; app reaberto no perfil original.
