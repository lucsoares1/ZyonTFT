# Banco de dados · 0.17.23

O catálogo mantém Inter, base #0b1018, cabeçalho #121c2a, divisórias #263346, texto #edf2fa, texto secundário #8e9fb8 e foco azul #347aff. O objetivo é consultar campeões, características e receitas com a mesma leitura de colunas em toda a lista.

Busca e contagem dividem a primeira linha; característica, custo e ordenação têm campos próprios com rótulos alinhados na segunda. A tabela usa colgroup e layout fixo, células centralizadas verticalmente e linhas de 84px. Características viram links compactos, sem os grandes botões que alteravam a altura das linhas.

Em até760px de conteúdo, a posição passa para baixo do nome do campeão, o índice some e as ações permanecem visíveis. Retratos e receitas têm dimensão fixa, não encolhem e quebram em novas linhas dentro da célula. A coluna lateral do plano permanece.

Validação: scripts/verify-database.mjs usa conta real descartável e perfil Electron isolado. Verifica as quatro abas em janelas reais1536x1000 e1050x820, limites de todas as imagens das tabelas, ausência de overflow horizontal, correspondência entre cabeçalhos/células, buscas, filtros, ordenação, atalhos de característica, vazio e acesso ao planejador. Evidências em design/review/0.17.23/database (ignoradas no Git). npm test:122 aprovados. npm run build aprovado.
