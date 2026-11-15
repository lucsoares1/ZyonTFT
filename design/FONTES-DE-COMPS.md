# Fontes de comps — pesquisa de 14/11/2026

## Integração atual: 0.11.0

A pedido de Lucas, o Zyon agora consome o catálogo estruturado publicado no HTML de [PivotTFT](https://www.pivottft.com/comps/). A decisão abaixo sobre a versão 0.10 é histórica e foi substituída. Não existe chave nem API oficial configurada: o adaptador extrai o script JSON, sem executar scripts remotos.

Snapshot inicial: **62 builds**, **146 itens nas tiers** e **252 aprimoramentos nas tiers**, edição Set 18/18.6 atualizada em 13/11/2026. A contagem do payload difere dos contadores do cabeçalho do site. Os 18 planos anteriores e as personalizações continuam disponíveis. A interface agrupa as variações por família; por isso o número de cartões é menor que o de builds.

Importamos unidades, itens, estrelas, casas do tabuleiro, etapas, trocas, alternativas, aberturas, ordem de montagem, IDs de aprimoramentos, tiers e sinais objetivos de economia. Os textos mostrados são sínteses operacionais do Zyon; os parágrafos editoriais, dicas completas e análises permanecem nos links individuais da fonte. Não foram importadas estatísticas de partidas. O nome `DA_HeartOfSteel` não tem correspondência no catálogo Riot local: aparece com nome da fonte, sem tradução ou ícone inventados.

O app consulta a fonte ao abrir se a última coleta tiver mais de seis horas. O botão de atualização força uma consulta, com intervalo mínimo de um minuto. O último snapshot válido fica no perfil em `pivot-catalog-v1.json` e há uma cópia incluída no programa para uso offline. Falha de conexão, desafio HTML, formato diferente, snapshot truncado, edição incompatível ou ID novo não substituem os dados bons. Mudanças de set/patch e novos assets exigem uma revisão de código/dados; o app apresenta o erro de atualização.

`npm run data:pivot` atualiza o snapshot distribuído e seus ícones. A ferramenta usa dados Riot/Data Dragon e CommunityDragon para nomes e imagens, e consulta a página pública do PivotTFT uma vez. A implementação de runtime não envia imagens do jogo, compras ou preferências para a fonte.

No app: variações da família, tabuleiro final e por nível, entradas/saídas, alternativas, aberturas, componentes, ordem de montagem e aprimoramentos. No overlay: Agora mantém a decisão imediata; Roteiro acompanha o nível OCR e permite consultar etapas; Itens e Aprim. oferecem os detalhes. Trocar a build pelo overlay conserva os dados da partida. As posições finais vêm da fonte; posições intermediárias e decisões de ouro/raridade são calculadas pelo Zyon e identificadas dessa forma.

Validação: `npm test`, `node scripts/verify-pivot.mjs`, o mesmo com `--packaged` e verificações de abertura extraída/portátil. Evidências: `design/review/0.11.0/`.

## Histórico 0.10.0

O Zyon 0.10.0 traz 18 comps do Set 18, patch 18.6. As 12 adições foram conferidas nos guias individuais da Mobalytics, não extraídas das imagens. Cada entrada em `src/generated/comps.json` contém o link específico e a data de conferência. Descrições em português e roteiros do Zyon são sínteses próprias. Não foram importadas estatísticas de partidas.

## Resultado da pesquisa

| Fonte | O que oferece | Atualização e integração |
| --- | --- | --- |
| [Mobalytics](https://mobalytics.gg/tft/guides/best-tft-comps) | Guias editoriais, itens, equipes iniciais e finais, estilos e tiers | Conferido patch 18.6. Guias acessíveis pela pesquisa web; download direto de `/tft/team-comps` recebeu desafio de acesso. API pública de redistribuição não confirmada. É a referência editorial desta versão. |
| [MetaTFT](https://www.metatft.com/comps) | Comps e estatísticas consultáveis no site | A página depende de JavaScript; não foi confirmada API pública documentada para integrar ao Zyon. Não confundir endpoints internos com um feed autorizado e estável. |
| [PivotTFT](https://www.pivottft.com/comps/) | 62 comps publicadas no patch 18.6; dados estruturados de unidades, itens, estrelas, posições e níveis no HTML | Acesso por código funcionou. Metadado da edição: 13/11/2026. Isso não significa licença aberta: os [termos](https://www.pivottft.com/terms/) pedem que guias/listas não sejam copiados integralmente e vedam scraping em escala. Catálogo completo não foi incorporado ao Zyon. |
| [Riot TFT API](https://developer.riotgames.com/docs/tft) | Histórico de partidas para montar uma base estatística própria | Exige chave; entrega dados de partidas, não guias prontos de progressão. Agregação, filtros de patch, amostragem e identificação das comps seriam responsabilidade do nosso serviço. |
| [Data Dragon](https://developer.riotgames.com/docs/tft#data-dragon) e [CommunityDragon](https://www.communitydragon.org/) | Identificadores, campeões, itens, características, imagens e regras do jogo | São a base técnica já usada pelo Zyon. Não fornecem uma tier list de comps pronta; atualização de assets não significa atualização do meta. |
| [TFT Lab](https://github.com/HugoLacaci/tft-lab) | Projeto público com comps e atualização de dados do set | A página informava comps curadas em 18.2b, com revisão pendente, embora os dados estáticos estivessem no patch 18.6. Não foi escolhido como fonte de meta atual. |

## Escolha para este app pessoal

Agora: catálogo local conferido, links por comp e importação validada. Não há consulta automática contínua nem credencial de provedor configurada. A data visível é de conferência local, não uma promessa de meta em tempo real.

Para manter comps atualizadas automaticamente: preferir um feed autorizado de um provedor ou um serviço próprio de agregação da Riot. A primeira opção preserva guias de progressão; a segunda exige criar essa camada editorial. Não foi encontrado nesta pesquisa um feed aberto, documentado, atualizado e com reutilização integral confirmada que resolva tudo pronto. Não foram enviados pedidos de parceria a terceiros.

## Atualização reproduzível

`npm run data:comps` valida o catálogo atual, incluindo fontes, patch, unidades, itens, etapas de reroll e arquivos de imagem.

`npm run data:comps -- --from caminho/comp-revisadas.json --check` verifica um novo snapshot sem aplicá-lo.

`npm run data:comps -- --from caminho/comp-revisadas.json` grava uma cópia de segurança em `.runtime/catalog-backups/` e substitui o JSON somente após a validação completa. Rejeita catálogo vazio, IDs desconhecidos/duplicados, incompatibilidade de set/patch, posições sobrepostas, alvos de custo incompatível com o nível e snapshots menores que o atual. Remoções ou mudança de patch precisam ser revisadas no código e nos dados antes da distribuição.

Depois: `npm run build`, `npm test`, `node scripts/verify-catalog.mjs` e empacotamento. A revisão calculada pelo conteúdo migra as instalações antigas ao abrir a nova versão, preservando as comps personalizadas, seleção e comp fixada.

Os comandos `data:sync`, `data:workspace`, `data:portraits` e `data:levels` atualizam outras partes da base; não devem ser apresentados como atualização automática das comps.
