# Moldura sem detecção individual de bordas

## Causa

O renderer desenhava a badge com a geometria física de `shopRect` quando `shopCards[index]` era nulo, mas exigia esse retângulo individual para desenhar `ShopFrostFrame`. Uma falha do detector de pixels, que exige quatro bordas com contraste suficiente, portanto deixava somente a badge. Isso não era falha de reconhecimento do campeão nem uma diferença intencional para pedidos da dupla.

## Correção

`shopCardRect` prefere a borda detectada e validada. Sem ela, divide a região física da loja em cinco posições, com margens laterais e inferior para a moldura não invadir o slot vizinho ou sair da tela. Badge e moldura usam o mesmo retângulo. Não usar a antiga calibração de texto `state.rect` para estimar uma moldura quando a geometria física ainda não chegou. A seleção, confiança OCR, cores e passagem de cliques continuam iguais.

## Verificação

- Build e 159 testes unitários aprovados.
- `scripts/verify-shop-frame-fallback.mjs`: renderer Electron real, perfil isolado e monitor secundário; envia snapshots locais para verificar envio e pedido compartilhado sem bordas individuais, compra com borda detectada e ausência de moldura em slots vazios.
- Capturas e logs em `.runtime/shop-frame-fallback-*`. Não representa teste em partida real nem no computador do amigo.
- Correção local, sem nova publicação automática.
