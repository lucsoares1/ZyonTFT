# Escolha de composição no overlay

## Fluxo

Lucas rejeitou a necessidade de encontrar a logo pequena à direita, abrir os detalhes e só então escolher a comp. A biblioteca agora oferece duas ações textuais independentes em cada card:

- **Usar comp**: uma chamada ao IPC existente `guide:comp`, que ativa a composição e abre Agora. Não precisa consultar detalhes e não limpa cópias/contexto da partida.
- **Ver detalhes**: abre a consulta sem mudar a composição ativa. Voltar retorna o foco ao mesmo botão. A barra fixa da consulta também oferece Usar comp.

A comp ativa recebe borda e botão **Em uso** desabilitado, não um indicador inventado antes da confirmação. Aplicando bloqueia novas escolhas; falha mantém o plano anterior e permite tentar novamente. Busca e ordenação ficam sempre visíveis; filtros e todo o catálogo continuam disponíveis.

## Layout

Preto/grafite, azul elétrico e Inter locais preservados. Nome e estilo acima das características, retrato compacto, elenco inteiro em uma faixa com largura do card, métricas e rodapé de ações. Sem logo escondida como única entrada de detalhes. Uma coluna até 960px, duas acima disso. Escopo limitado à biblioteca/consulta de comps do overlay; o programa principal e os modos recolhidos não mudam.

Pedido posterior: retratos do elenco passam de até 34px para até 42px, itens de 9px para até 12px e estrelas descem 3px. O tamanho se ajusta à quantidade real e à largura disponível, mantendo `nowrap`; os itens acompanham a escala para não invadir o campeão seguinte. Há espaço inferior reservado para os equipamentos. A verificação nativa cobre também alinhamento em uma linha, estrelas, tamanho e ausência de recorte dos itens.

## Verificação

- Build e 159 testes unitários aprovados.
- `scripts/verify-overlay-comp-choice.mjs`: Electron real em perfil isolado no monitor secundário. Seleção direta e por teclado, consulta independente, estado ativo, busca vazia, catálogo completo e contexto/cópias preservados. Capturas em 640×800, 840×980 e 1120×950, sem transbordo horizontal ou sobreposição entre título e características.
- `scripts/verify-overlay-comp-choice-states.mjs`: componente isolado em navegador headless, incluindo espera, retorno falso, exceção, nova tentativa e restauração do foco.
- Evidências em `.runtime/overlay-comp-choice-*`. Não representa uma partida real nem validação no PC do amigo. Sem publicação automática.
