# Referência visual escolhida por Lucas

A segunda imagem anexada em17/11/2026 é o alvo de reprodução, não um moodboard. Lucas rejeitou explicitamente o refinamento plano anterior e seu azul. Esta escolha substitui a direção de superfícies sólidas e dock compacto registrada anteriormente.

Referência: `design/references/selected-turquoise-interface.png`,1672×941px. Reutilizar as imagens oficiais já presentes em `public/assets/champions` e `public/assets/portraits`; manter Zyon TFT como identidade real e todos os dados/controles funcionais existentes.

## Contrato de composição

- Lateral expandida de192px, logo e nome no topo, navegação com rótulos e estado turquesa translúcido.
- Barra superior50px; cabeçalho amplo com título40px, arte real da Ahri em panorama e ação turquesa.
- Campo de busca, filtros e abas ocupam a largura útil. Remover o limite anterior1200px.
- Faixas de tier42px com emblema destacado, título e descrição existente.
- Fichas horizontais próximas de108px na resolução da referência: arte à esquerda, identidade e tags, elenco, métricas e logo translúcida. Em janelas menores o conteúdo se reorganiza sem reduzir a legibilidade ou cortar controles.
- Fundo azul petróleo profundo, arte real e máscaras graduais. Turquesa#35d0d0 nos controles, estados e seleção; não usar o royal blue rejeitado.
- Prioridade de itens com sequência numerada, equipamentos e nomes; não espaçar ícones isolados pela largura disponível.
- Aplicar o mesmo material ao planejador, banco de dados, dupla, preferências e overlay nativo.

## Limites de conteúdo

Não criar estatísticas, classificações de dano ou conselhos inexistentes para preencher os chips do mockup. Tags de nível usam o nível final publicado; aprimoramentos continuam abrindo sua consulta. A última orientação de Lucas substitui o marcador da imagem por uma logo Zyon translúcida: somente essa logo abre e fecha os detalhes, sem seta separada e sem tornar o título um segundo controle. A ação de escolher/remover do overlay fica explícita nos detalhes. A atribuição estatística continua no texto acessível e no tooltip; a página mantém a fonte do catálogo.

Geometria de28hex, motores OCR/dupla, autenticação, persistência e sessão da partida permanecem funcionais. Testes usam perfil isolado e conta descartável; não publicar nem interferir na partida pessoal.
