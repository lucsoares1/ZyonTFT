# 0.14.2 — Fim de partida sem fechar o processo

O TFT mantém o mesmo executável aberto na tela de resultados. O PID sozinho não identifica o encerramento. A referência43 mostra “VOCÊ TERMINOU EM”, “2º LUGAR” e “SAIR AGORA”; Windows OCR reconheceu “VOCÊ TERMINOU EM 20 LUGAR SAIR AGORA”.

Quando o HUD não fornece nível/ouro nativos, o leitor procura os resultados na tela. O backend só aceita fim com duas capturas distintas, texto afirmativo de resultados e ausência de nível/ouro após o fallback. Apenas desaparecer o HUD não encerra: carrossel, aprimoramentos, Alt+Tab, pausa e falhas não zeram compras. Se ambos os campos do HUD somem por 5s, o overlay se oculta temporariamente, permitindo que o OCR veja uma eventual janela de resultados que estivesse por baixo dele.

O encerramento limpa contexto, compras, candidatos de OCR e badges; oculta guia e badges; persiste ended no estado da sessão. Os heartbeats do mesmo executável e frames atrasados de nível alto não podem reabrir o jogo terminado. Um começo confirmado em nível1–3 com ouro confirmado libera uma nova sessão no mesmo processo. Uma nova identidade de processo continua criando sessão limpa. O app informa que está aguardando a próxima partida. O leitor permanece em espera para detectar seu começo, sem publicar os valores antigos.

66 testes unitários. verify-match-end.mjs executa Windows OCR real da referência43 e o ciclo Electron com uma composição explícita das screenshots42/43: partida ativa, compra registrada, resultados, limpeza persistida, frames antigos, nova partida no mesmo processo. Foco/PID são simulados em perfil isolado; isso não é validação de uma partida ao vivo. A versão também inclui o recorte de ouro, segunda passagem de nível9 e validade de leituras da 0.14.1.
