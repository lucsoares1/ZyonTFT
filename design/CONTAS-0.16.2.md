# Entrada e perfil — 0.16.2

Lucas pediu login obrigatório, registro visível e perfil real no rodapé lateral. Essa versão substitui a regra anterior de uso solo sem autenticação.

O app abre em uma tela própria de acesso, antes de montar o Workbench. Entrar e Criar conta estão disponíveis na primeira tela. Cadastro direto com nome, usuário, e-mail e senha; a confirmação de e-mail continua desativada no Supabase, conforme solicitado. Uma sessão já salva é restaurada e validada pelo snapshot autenticado antes de liberar a interface.

O perfil no rodapé lateral é clicável e apresenta nome e usuário reais. Minha conta mostra e-mail, código de amigo, ação para amigos/duplas e saída. Em1050px o dock exibe avatar e tooltip, sem cortar o nome nem provocar rolagem horizontal.

AccountGate.tsx e account.css usam carvão#070a10, azul#86aef2/#a8c8f7, Manrope e a logo original. A arte e os sete retratos são assets reais do AP Exodia. A entrada tem uma sequência finita de peças encaixando, chegada da marca e da composição, cursor deslizante entre login/cadastro e confirmação visual dos campos. Não há animação contínua decorativa. Reduced motion desativa animações e transições; somente o indicador de espera existe durante uma operação.

O processo principal também exige user+profile para ativar overlay, OCR, alterar planos, publicar estado, escolher variante e atualizar sessão de jogo. Logout interrompe OCR e esconde as duas janelas nativas. Não foi acrescentado bypass de autenticação para testes.

`verify-account-gate.mjs` executa cadastro, login incorreto/correto, perfil, ativação autenticada do leitor/overlay, logout com bloqueio, restauração da sessão cifrada após reinício e reduced motion. Perfis Electron e contas Supabase são descartáveis e isolados. Capturas em design/review/0.16.2/account. Os70 testes unitários passaram, e o teste de abertura considera a tela de login um resultado correto.

Os planos locais existentes são preservados. Sem internet no primeiro login ou na validação inicial de uma sessão, o app continua bloqueado e oferece nova tentativa. Uma conexão interrompida depois de entrar não fecha a interface; a sincronização indica reconexão.
