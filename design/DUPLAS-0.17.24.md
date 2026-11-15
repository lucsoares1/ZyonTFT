# Duplas · direção 0.17.24

Objetivo: reconhecer pessoas e convidar para jogar sem confundir amizade, convite e dupla aceita. Inter para todos os textos; título24/28px, nomes15px, corpo12px e ajuda11px. Base#0b1018, superfície#111b29, borda#29394e, texto#edf3fc, secundário#8fa3bf e ação#2563eb. Sem relevo ou imagens decorativas.

Fluxo: título e instrução curta; conta/código como ferramentas compactas; convites recebidos e solicitações em seções próprias; amigos em cartões de duas colunas, com avatar/nome/usuário, estado real do convite e ação textual. Adicionar amigo abre formulário junto ao cabeçalho da lista. Remover fica em menu explícito, afastado do convite.

[Você / código para copiar]
[Convites recebidos / solicitações, quando houver]
[Amigos · quantidade] [Adicionar amigo]
[Buscar amigo]
[Avatar Nome      ...] [Avatar Nome      ...]
[Convidar para dupla] [Aguardando resposta]

Revisão: cartões iguais são adequados aqui porque cada cartão representa uma pessoa e uma ação equivalente, em vez de dividir informações aleatórias. A revisão visual retirou a formação vazia com dois lugares: ela repetia a identidade e empurrava os convites para fora da primeira tela. A marca da tela é a pessoa reconhecível e a ação de convidar. Não inventar presença online individual: o snapshot não fornece esse dado. Preservar autenticação, compartilhamento, pedidos e encerramento de sessão.

Validação: verify-social-lobby.mjs usa dois clientes Electron e três contas reais descartáveis, com perfis isolados e clipboard substituído somente no teste. Cobre pedido/aceite de amizade, dois cartões em1536/1050 com botão visível na primeira tela, busca/vazio, copiar código, convite enviado bloqueado, convite recebido, aceite/sessão comum, fim da dupla, recusa e remoção pelo menu. Não mede presença online individual nem simula pessoas na conta do usuário.122 testes unitários aprovados.
