# Correção da lista de processos no Windows PowerShell 5

A versão 0.13.1 ainda recusava o jogo porque `@(Get-Content ... | ConvertFrom-Json)` cria um array aninhado no Windows PowerShell 5.1 usado pelos subprocessos. Diagnóstico real: Count=1, tipo da primeira entrada System.Object[], comparação com TFTClient-Win64-Shipping=false. Sem o envoltório, a mesma comparação retorna true e há cinco nomes.

Agora ambos os leitores carregam a função comum `Test-ZyonGameProcess` de `electron/game-process.ps1`. A lista JSON usa atribuição direta. O teste de regressão executa powershell.exe de verdade e confere todos os resultados relevantes, incluindo caixa diferente, navegador e sufixo inválido. A checagem estática anterior e o teste de foco simulado não cobriam a semântica do Windows PowerShell.

59 testes passaram. O diagnóstico nativo de foco durante a investigação retornou Brave; o jogo estava aberto em segundo plano. Ainda não atribuir a testes com screenshots uma validação visual sobre uma partida ao vivo. O gate continua exigindo foco no jogo e ouro confirmado, respeitando o Alt+Tab solicitado.

Validação posterior na instalação real: log `Game focus on: TFTClient-Win64-Shipping` às 23:12:33 UTC e `Auto overlay: gold 0, level 3` às 23:12:39 UTC. Consulta Win32 confirmou PID 237420 em foco e ambas as janelas nativas visíveis. Fora do jogo, as duas ficaram invisíveis. Evidências `live-windows.json`, `live-windows-followup.json`; Lucas confirmou que passou a aparecer, e pediu em seguida cliques e largura menor.
