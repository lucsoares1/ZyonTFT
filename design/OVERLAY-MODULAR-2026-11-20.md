# Overlay modular

Modo: Operate. Pedido autorizado por Lucas em 20/11/2026: continuar planejamento e implementação. Substitui o fluxo monolítico; não modifica a gestão de conta, atualização ou calibração do programa principal.

## Fluxo

- Quatro botões nativos em janela limitada à sua área real: Comp, Campeões, Dupla, Leitura/partida. Cabeçalho arrastável, posições em DIP relativas ao monitor.
- Um hospedeiro para tarefa ativa e outro para tarefa fixada. Fixar transfere a tarefa para o segundo hospedeiro. Nunca mais de dois painéis; clicar no destino aberto fecha esse destino. Fechar não desliga leitura.
- Comp conserva Equipe com28 casas, Agora, catálogo completo, Planejar, Roteiro, Itens e Aprimoramentos. A troca de comp é explícita e não reinicia cópias.
- Campeões: um clique no retrato marca/desmarca compras pessoais. O plano já entra marcado junto das escolhas avulsas. Exclusões explícitas podem remover inclusive os herdados sem retirar ninguém do tabuleiro. Consulta de itens fica em ação separada; sem meta total, prioridade ou pedido à dupla nesta aba.
- Dupla reutiliza o fluxo social completo do aplicativo. Sem dupla: amigos, copiar código, solicitação de amizade, convite e aceite. Com dupla: comp do parceiro, pedidos de campeões e encerrar conexão. Sem níveis de urgência. Avisos de envio dependem de partida e payload fresco.
- Leitura expõe estado OCR e correções excepcionais existentes. Ouro/nível desconhecidos continuam travessão; sem dados inventados.

## Material

Preto/grafite opaco, tipografia Inter local, azul elétrico em seleção/ação; roxo reservado ao parceiro. Cabeçalho44px, controles de30–40px, respiro12–16px, rolagem interna. Sem herói, sidebar ou banner decorativo dentro do jogo.

Após rejeição da seleção: retratos em quatro colunas no host460, nomes13px com peso500, sem legenda Comp/Avulso e sem botão Itens repetido sob cada nome. Consulta via ícone no canto superior direito da arte, sempre acessível por teclado; marcar/desmarcar continua no retrato. Fonte local validada no renderer; hosts são opacos para não compor texto em superfícies transparentes. A única janela transparente continua sendo a de marcações da loja.

Revisão posterior de itens: remove o ícone de consulta acima. Hover ou foco abre popover sem reflow, fechado com Esc/saída. Mesmo comportamento nos retratos da seleção inferior. Usa conjuntos estatísticos completos por ID do campeão, não um kit de tank/caster. Mostra amostra, média, patch e data; guias do campeão servem como alternativa explicitada e ausência é declarada sem inventar uma build. O motor compartilhado aplica a mesma regra ao planejador. O pipeline de catálogo publica championStatistics aos hosts e preserva cache individual validado em falhas parciais, sem reaproveitar outra edição.

Loja: bandeirinha curta opaca inspirada no emblema verde nativo. Logo Zyon branca sem texto. Azul próprio, roxo parceiro, divisão plana ambos. Laterais e fundo delimitados, topo sem borda para integrar à carta. Pedido posterior de Lucas: relevo por aro escuro, luz interna nas laterais e sombra curta deslocada, sem voltar ao degradê preto ou ao escudo pontudo. Nenhuma moldura adicional. Marcação click-through com geometria física/fallback existente e espaço reservado ao emblema nativo.

## Autoridade e migração

Processo principal permanece único dono de sessão, alvos, plano, OCR e social. Preferências overlayLayout e shopTargets protegidas contra publicações antigas do renderer. Toggle é atômico no main e usa a demanda herdada real; exclusões não alteram a comp. Pedidos explícitos continuam independentes na terceira aba. Hosts de conteúdo têm permissões explícitas; launcher não recebe poderes de conta/edição. Gate aceita somente HWNDs registrados, nunca qualquer janela do programa. Alt+Tab não limpa cópias ou alvos; nova partida limpa alvos da sessão.

## Validação

Testes de domínio, layout/DIP, IPC e foco; build TypeScript/Vite; QA Electron integrado com perfil descartável no monitor secundário dinâmico. Não equivale a teste de partida real, TeamSpeak ou segundo PC. Não publicar sem solicitação.
