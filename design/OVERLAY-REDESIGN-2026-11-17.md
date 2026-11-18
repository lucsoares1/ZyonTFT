# Projeto do overlay — redesign completo

## Direção e objetivo

Operar durante a partida, não reduzir a janela do programa. O overlay herda o material da referência escolhida por Lucas: petróleo, turquesa, arte oficial, bordas metálicas discretas e hierarquia Inter. A estrutura anterior, com elenco permanente, telemetria extensa e nove abas horizontais empilhadas, deixa de ser a composição principal.

THESIS: devolver espaço ao tabuleiro e às decisões. Composição e leitura ficam no cabeçalho; navegação fica numa lateral; a tarefa atual ocupa um único painel de trabalho.

OWN-WORLD: fundo#0b1118, superfícies#151d27/#202b38, ação#35d0d0 com texto escuro, foco#61e6db. Panorama real do carry no cabeçalho, retrato próprio e marca Zyon. Sem molduras decorativas repetidas ou novos dados inventados.

STORY: identificar o plano escolhido, confirmar se o OCR está lendo e abrir a tarefa necessária sem procurar entre faixas horizontais. Consultar nível, trocar comp e editar o plano continuam ações diferentes de alterar a sessão real.

FIRST VIEWPORT: barra de janela38px; cabeçalho contextual de cerca de80px; telemetria compacta de cerca de60px; área de trabalho com lateral68px e conteúdo rolável; rodapé de leitura42px. Em840×800, aproximadamente580px verticais ficam disponíveis à tarefa. Em640×800, a estrutura permanece reconhecível; o conteúdo se adapta, não encolhe tipografia indiscriminadamente.

FORM: adaptação direta da imagem selecionada, com cabeçalho panorâmico e navegação lateral. Não há nova rodada de identidade: Lucas pediu o mesmo padrão e um novo projeto de superfície, antes da implementação.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Composição

```text
┌──────────────────────────────────────────────────────────┐
│ arrastar · Zyon TFT        OCR pausado       só loja · −  │
├──────────────────────────────────────────────────────────┤
│ retrato · Composição escolhida       panorama do carry   │
│           estilo / tier                  Ver equipe     │
├──────────────────────────────────────────────────────────┤
│ Nível —    Ouro —    Vida100     estado real da leitura   │
├────────┬─────────────────────────────────────────────────┤
│ Comps  │ Título da tarefa / ações locais                 │
│ Agora  │                                                 │
│ Equipe │ Conteúdo principal: tabuleiro, comps ou itens   │
│ Planej.│                                                 │
│ Roteiro│ Rolagem só aqui, sem mover a navegação          │
│ Itens  │                                                 │
│ Aprim. │                                                 │
│ Dupla* │                                                 │
│ Partida│                                                 │
├────────┴─────────────────────────────────────────────────┤
│ Iniciar/pausar OCR       estado e recuperação · atalho    │
└──────────────────────────────────────────────────────────┘
```

*Dupla aparece apenas com conexão real, como no comportamento existente.

## Hierarquia e componentes

- Barra superior: arraste nativo, marca, estado real de leitura e os controles existentes de recolher/só loja. Não imitar botões do sistema que não têm ação.
- Cabeçalho: nome da composição, tier, estilo publicado e troca de comp. O elenco completo fica num disclosure explícito “Ver equipe”; começa fechado para não duplicar o tabuleiro permanentemente.
- Telemetria: nível e ouro exclusivamente do OCR confirmado; vida mantém sua edição manual em Partida. Valor desconhecido continua “—”, nunca zero fictício.
- Navegação: oito/nove destinos em uma lateral estreita, com ícone Lucide, rótulo e estado turquesa; seleção e foco distintos. O conteúdo conserva seu nome e função.
- Biblioteca: fichas com arte contínua, identidade, elenco e decisão. Logo Zyon translúcida abre o detalhe; sem seta nem marcador de favorito. Em largura estreita, reorganização deliberada dentro da ficha, sem peças soltas sobre vazios.
- Detalhe: toolbar própria dentro do painel, com voltar e logo para fechar. A ação “Escolher comp” fica explícita; fechar a consulta não escolhe nem altera a composição.
- Equipe/Agora: manter os28hex, nomes, itens, estrelas, nível consultado versus nível real e restauração de guia. Fundo do tabuleiro e estrutura de leitura usam o novo material, sem alterar geometria do jogo.
- Planejar/Roteiro/Itens/Aprimoramentos/Partida/Dupla: manter todas as ações e dados; reaplicar cabeçalhos, listas, formulários, avisos, foco e estados no mesmo sistema. Nenhuma tela fica com o royal blue anterior.

## Estados e validação

- Sem composição: acesso direto à biblioteca e explicação de como escolher; não depender de um botão “Fixar comp” que não existe mais.
- OCR pausado, esperando, confirmando, erro e ativo: texto verdadeiro e estados semanticamente distintos. O desenho não representa uma leitura de fixture como partida real.
- Guia recolhido: cabeçalho compacto e decisão resumida; expandir preserva a aba. Só loja mantém o controle de retorno.
- Elenco aberto: altura natural; corpo continua com rolagem independente e todos os destinos acessíveis.
- Capturar840×800 e640×800 em todas as abas disponíveis; biblioteca, detalhe, itens, elenco aberto, recolhido e só loja. Validar foco, cliques, ausência de overflow e imagens, e comparação com o projeto e a referência.
- Perfil de testes isolado, OCR de fixture e conta descartável. Não alterar OCR, duplas, autenticação, persistência ou o perfil pessoal.
