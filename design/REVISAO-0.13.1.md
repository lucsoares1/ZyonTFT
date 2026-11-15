# Correção do overlay no TFT instalado

A instalação em execução tem `TFTClient.exe` como launcher sem janela e `TFTClient-Win64-Shipping.exe` como janela TFT. A versão 0.13.0 aceitava apenas o launcher e outros nomes conhecidos, então tanto o monitor de foco quanto o leitor de loja recusavam a janela real. O gate JS também recusava esse nome.

Os três consumidores agora leem a mesma lista exata de processos. O arquivo acompanha os scripts fora do asar. Continua necessário ter jogo em foco e ouro confirmado da mesma identidade; Alt+Tab oculta as duas janelas e preserva a sessão.

A captura 35 mostra o primeiro round no nível 1 com 3 de ouro. O fallback local leu `Nv. 1` e `3`. O parser antigo recusava Nv.1; a sessão e o plano agora aceitam esse início, limitando a equipe a uma unidade de custo 1 e orientando compras naturais.

Validação: 58 testes unitários, incluindo equipes válidas desde nível 1 em todos os planos e recusa de processos com nomes semelhantes. Teste Electron com perfil isolado, nome real do executável e OCR da captura 35: abertura automática, confirmação de nível/ouro, ocultação no Alt+Tab, retomada, ocultação manual e descarte de OCR de outra identidade. Transições de foco simuladas; não é validação visual de uma partida ao vivo.

O mesmo teste passou no executável empacotado (`opening/checks-packaged.json`). A captura anterior Nv.7/ouro18 também passou. Abertura extraída: 2,9s e instância duplicada restaurando a janela; launcher portátil real: 17,1s, pasta de extração exclusiva. O perfil real foi reaberto normalmente na 0.13.1, PID 85712, janela respondendo; os testes usaram perfis isolados. O monitor Win32 retornou fora de jogo durante esta verificação; não houve confirmação visual de foco no jogo ao vivo.
