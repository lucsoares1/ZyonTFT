# 0.9.1 — Acompanhamento automático, sem formulário de compra

Lucas apontou que a 0.9 ainda parecia exigir preenchimento manual.
Skill: frontend-design da Anthropic. Preservar Segoe UI / Manrope e paleta
carvão #101318, ardósia #1b2028, texto #edf0f4, ouro #d9b56f e confirmação #8fcbbf.
Plano: ouro como leitura alinhada à esquerda, lista de compras com retrato e
contagem à direita; ajustes excepcionais recolhidos. Remover botões das
prioridades, reservas e oportunidades. Nenhum painel decorativo novo.

Revisão: esconder somente os campos não basta se o modo manual antigo ainda
impedir o OCR. Migrar sessões para ouro automático e rejeitar edição de ouro
via IPC. Iniciar OCR ao abrir overlay. Exibir — até uma leitura válida e indicar
quando se aguarda o jogo em primeiro plano (o cliente/lobby não contém o HUD).

Implementado: ouro automático, contagens somente leitura no fluxo normal,
correção de cópias sob “Corrigir uma contagem”, início automático do OCR.
O observador de compras da 0.9 permanece: clique + mudança visual + débito,
para não contar clique falho. Não há clique extra para confirmar no overlay.

Verificação: 41 testes de comportamento; OCR real 8/18; sequência de compra
simulada chegando ao overlay, ausência dos controles, correção opcional e
reset. Teste do guia cobre abas, geometria, persistência e badges. Sem teste
em partida ao vivo. Evidências em design/review/0.9.1.
