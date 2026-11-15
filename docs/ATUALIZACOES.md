# Atualizações do Zyon TFT

O canal estável usa o repositório público https://github.com/lucsoares1/ZyonTFT e GitHub Releases. O cliente não leva tokens do GitHub. As credenciais de publicação existem apenas no GitHub Actions.

## Primeira instalação

Distribua o instalador `Zyon-TFT-Setup-<versão>.exe` do release mais recente. Cada pessoa instala uma vez. A edição portátil anterior não contém atualizador: ela precisa dessa primeira instalação manual. O instalador é por usuário, mantém `%APPDATA%/zyon-tft`, cria um atalho e abre o app. Comps, configurações e sessão são preservadas. A desinstalação também preserva esses dados.

O app consulta versões ao abrir (após 8 segundos), a cada 4 horas enquanto está aberto e pelo botão em Preferências. Uma versão nova mostra aviso, botão de download e progresso; após baixar, o usuário escolhe Reiniciar e atualizar. O download é validado pelo SHA-512 do feed. Fechar o app normalmente não instala uma versão pendente. Durante uma partida, reiniciar exige confirmação adicional. Nenhum update força a interrupção do jogo.

## Lançar uma versão

1. Termine e teste as alterações e envie os commits para a branch principal.
2. Na pasta do projeto, execute `npm run release -- 0.17.2 "Descrição das melhorias"`, sempre com uma versão maior.
3. Acompanhe https://github.com/lucsoares1/ZyonTFT/actions. O workflow testa, compila no Windows, cria um rascunho, envia instalador/blockmap/latest.yml, confere os hashes e somente então publica o release.
4. Depois da publicação, os apps encontram a versão nova na próxima busca. Não basta enviar código para a branch; a tag de versão ou a execução manual do workflow é que inicia uma publicação.

O comando exige branch limpa e sincronizada. Ele altera package.json, lockfile e CHANGELOG.md, cria um commit/tag e envia ambos de forma atômica. Se o push falhar, corrija o acesso e envie o commit e a tag já criados; não tente criar novamente a mesma versão. Releases publicados nunca devem ter seus arquivos substituídos: publique uma versão maior para corrigir.

Para publicar a versão atual sem criar outro número, use Actions → Publicar atualização do Zyon → Run workflow. O package.json e a tag precisam concordar. Uma publicação pronta não é sobrescrita. Um build que falha permanece rascunho e não vira update nos clientes.

## Empacotar localmente

`npm ci` e `npm run package` geram o instalador em release/, sem publicar. `npm run release:verify` confere versão, SHA-512, blockmap e configuração do repositório. `npm run package:portable` é apenas uma alternativa de execução sem instalação; ela informa que updates requerem a edição instalada.

Ainda não existe certificado de assinatura Windows configurado. O Windows pode mostrar editor desconhecido na primeira instalação. A validação de download protege contra arquivo incompleto/corrompido; não equivale a um certificado de identidade do editor. Proteja a conta GitHub e as permissões de publicação do repositório.

## Verificação

Os testes de UpdateService cobrem concorrência, instalação somente após download, falha de integridade, nova tentativa, adiamento durante a partida, edição portátil/desenvolvimento e fechamento. A integração real de instalador/download/reinício deve ser conferida em perfil isolado, sem usar as preferências pessoais para testes. As verificações locais não substituem instalar em outro PC.

Na validação da primeira versão, `verify-updates.mjs` instalou a base 0.16.99, rejeitou um instalador com byte corrompido, baixou novamente, instalou a 0.17.0 e confirmou o reinício automático, a mesma conta autenticada, 80 comps e opacidade preservadas. O feed desse teste era um servidor HTTP local, e o download/instalador eram reais. Evidências locais em design/review/0.17.0/updates. A publicação pública no GitHub é conferida separadamente.

A versão pública v0.17.1 foi publicada pelo workflow com sucesso. Um cliente empacotado 0.17.0, em perfil e cache isolados, encontrou a atualização pelo provider GitHub original e baixou os 185.419.526 bytes do instalador; o SHA-512 coincidiu com o latest.yml público. Esse teste não executou a instalação nem alterou o perfil pessoal. Evidência local em design/review/0.17.1/github-update.json.
