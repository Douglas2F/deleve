# Relatório semanal

## Versão aprovada — marca e água — 27/08/2026

- Logo principal: folha acolhida por uma curva de abraço. Componente `DeleveSymbol` compartilhado pela marca e pelos destaques; substitui o antigo D com check e os brilhos. Pesquisa de exclusividade da marca ainda pendente.
- Água: controles +/− no topo, indicação discreta de 250 ml por toque e movimento de fundo com pausa e respeito à preferência de movimento reduzido.
- Ao cruzar a meta em um registro salvo: onda contínua sobe, gota se transforma na logo, partículas de água e “Meta atingida!”. Duração de 4,4 segundos, sem caixa escura; depois retornam os valores do cartão.
- A onda usa uma única forma preenchida com cobertura extra nas bordas para evitar emendas. As experiências de líquido 3D e de gota virando check foram descartadas.
- Não comemora ao carregar a página, mudar a meta ou adicionar copos acima dela. Com movimento pausado/reduzido, mostra logo e mensagem sem animação. Nenhum dado pessoal foi criado nos testes visuais.
- Atividades salvas: cartões com métricas separadas; editar/excluir aparecem por toque, foco de teclado ou passagem do mouse. Exclusão continua com confirmação.
- Validação: TypeScript, build e 18 testes de interface/lógica; testes visuais isolados em larguras de 320 e 390 pixels.

## Duração com segundos — implementado em 27/08/2026

- Horas / Minutos / Segundos em todas as modalidades; segundos opcionais iniciam em 00. Duração aceita de 1 segundo a 8 horas, com minutos/segundos de 0 a 59.
- Campo canônico de API e banco: durationSeconds / duration_seconds. Registros antigos sem a coluna preenchida usam os minutos originais × 60, sem regravar histórico.
- Compatibilidade: requisições antigas com durationMinutes inteiros continuam aceitas; se durationSeconds estiver presente, ele prevalece. O antigo campo físico duration_minutes mantém inteiro positivo arredondado para cima apenas para consumidores legados; os cálculos e a API usam os segundos exatos.
- Totais do dia, semana e modalidade somam inteiros em totalSeconds. durationMinutes/totalMinutes na API são equivalentes fracionários para compatibilidade, nunca usados para arredondar os cálculos.
- Ritmo e velocidade usam o tempo completo. Calorias automáticas recebem a duração fracionária em minutos; valores manuais/vazios e snapshots históricos continuam preservados.
- Painel, último registro, lista, calendário e relatório exibem segundos quando diferentes de zero. Sono não foi alterado.
- Testes: 139 no servidor e 13 na interface; exemplo 29min 49s / 3,28 km = 9:05 /km. Verificados limites, migração, edição, exclusão, totais e prévia.
- Backup local anterior à atualização; comparação confirmou preservação dos registros nas oito tabelas de saúde.

## Seletor adaptado por modalidade — 27/08/2026

- Musculação: Habitual / Intenso; futebol: Recreativo / Competitivo, com título “Como foi o jogo?”.
- Corrida: sem seletor. Dança: três níveis. Ciclismo: três níveis somente sem distância; com distância prevalece a velocidade.
- Nenhuma alteração nas fórmulas ou no banco. Registros antigos com esforço leve em musculação/futebol aparecem na opção equivalente sem regravar seu valor nem recalcular a estimativa histórica.
- Esforço anterior de corrida/ciclismo com distância continua preservado no registro, mas não há seletor que sugira alterar o cálculo por velocidade.
- Testes específicos de interface lógica: executar em frontend com Node 24: `node --test tests/exercise-effort.test.mjs`.

## Esforço opcional — teste implementado em 27/08/2026

- “Como foi o esforço?”: Leve, Moderado, Intenso; sem seleção inicial, toque novamente para limpar.
- Uma linha contextual orienta a escolha; esforço salvo por atividade e reaberto na edição, inclusive com calorias manuais ou vazias.
- Sem multiplicadores genéricos. Referências do Compêndio 2024, como aproximações por exemplos de atividade, não como conversão validada de esforço percebido.
- Musculação: leve/moderado 3,5 MET (02054), intenso 6 MET (02050). Futebol: leve/moderado 7 MET recreativo (15610), intenso 9,5 MET competitivo (15605). Níveis sem referência distinta não recebem números inventados.
- Dança: referências de salão lenta 3 MET (03040), aula de balé/moderna/jazz 5 MET (03010), apresentação vigorosa 6,8 MET (03012). A orientação mostra estes exemplos; não são valores universais para todo estilo de dança.
- Ciclismo sem distância: ritmos escolhidos pela pessoa, leve 4,3 MET (01015), moderado 7 MET (01016), vigoroso 9 MET (01017).
- Corrida e ciclismo com distância priorizam velocidade; esforço é registrado, mas não multiplica as calorias. Na corrida sem distância, esforço sozinho não define velocidade: mantém referência geral e orienta informar distância.
- “Outros” continua sem estimativa e sem seletor. Trocar modalidade limpa a escolha de esforço, sem apagar calorias manuais.
- Alterar esforço recalcula somente calorias automáticas. Registros antigos e estimativas históricas não são recalculados ao abrir ou alterar apenas observação.
- Validação: 110 testes, TypeScript e build. Backup local antes da migração e comparação das oito tabelas de saúde sem alterações nos registros existentes.

## Calorias estimadas no mesmo campo — implementado em 27/08/2026

- Um único campo recebe a sugestão automaticamente; a pessoa pode substituir pelas calorias ativas do relógio/app ou apagar e deixar vazio.
- Formulário enxuto: rótulo “Calorias estimadas” e uma frase sobre usar o relógio/app; explicação técnica removida da tela, mas mantida nesta documentação e no cálculo.
- Alterar tipo, distância ou duração não sobrescreve valores manuais nem campos apagados; “Usar estimativa” reativa o preenchimento automático.
- Estimativa aproximada para adultos com peso, duração e referência da atividade no Compêndio 2024; corrida/ciclismo usam a velocidade média quando disponível.
- Fórmula de gasto acima do repouso: (MET − 1) × peso em kg × horas. Sem sensores, intensidade real ou calibração individual; não equivale a uma medição do relógio.
- “Outros” e dados fora das referências não recebem estimativas; calorias continuam opcionais.
- Origem e referência do cálculo são salvas. Painel, último registro e relatório distinguem valores estimados/informados e totais mistos.
- Registros anteriores não são recalculados. Editar somente a observação preserva o peso e a estimativa usados originalmente.
- Validação: 85 testes automatizados, incluindo prévia, salvamento, edição e calorias manuais/vazias em cada uma das cinco modalidades; TypeScript e build verificados.
- Musculação, dança e futebol usam referências próprias de esforço; corrida e ciclismo também ajustam a referência pela velocidade quando há distância. “Outros” permanece sem estimativa até haver uma modalidade reconhecida.

## Várias atividades no mesmo dia — implementado em 27/08/2026

- Nova atividade adiciona um registro independente; edição e exclusão usam o ID da atividade.
- Exemplo suportado: ciclismo de ida + musculação + ciclismo de volta.
- Painel soma as atividades do dia por modalidade; último registro mostra a atividade alterada mais recentemente.
- Relatório soma tempos, distâncias por modalidade e calorias informadas; meta semanal conta dias distintos, não quantidade de atividades.
- Migração automática mantém IDs e registros existentes, com backup local anterior à alteração.
- Registros que já foram substituídos na versão antiga não são recuperados por essa migração.
- Testes de interface usam banco fictício separado, sem inserir atividades no banco pessoal.

Redesenho implementado localmente em 27/08/2026. Próxima etapa: revisar o resultado com o usuário e, futuramente, adicionar compartilhamento.

## Proposta aprovada

- Cabeçalho mais marcante, com o período e um círculo mostrando `4 de 4 áreas`.
- Uma mensagem curta de destaque da semana.
- Água com barra de progresso e indicação dos dias em que a meta foi alcançada.
- Sono com a média e sete indicadores, um para cada dia.
- Exercício com duração, calorias, distância e pace em etiquetas separadas.
- Peso com seta de evolução e diferença em relação ao início da semana.
- Cores suaves próprias para cada área.
- Resumo final com a frase `Seu destaque foi...`.
- Futuramente, botão `Compartilhar minha semana`, gerando uma imagem bonita.

## Direção visual

O relatório deve ser bonito, interativo, fácil de entender no celular e ter aparência compartilhável, mantendo a identidade visual atual da Deleve.

## Decisões da implementação

- Identidade da marca: reutilizar o componente `Brand` (folha com abraço + Deleve, com cor em "leve") em vez de criar versões como "deleve.". Slogan: "Sua rotina, do seu jeito.".

- Skill frontend-design fornecida pelo usuário: planejar antes de construir, concentrar a assinatura no círculo de quatro áreas e preservar o restante do painel.
- Paleta: fundo #F6F8F6, texto #153D35, água #087FA5, sono #6656A6, exercício #BA4A65 e peso #9A702B; fundos suaves derivados dessas cores.
- Tipografia: Segoe UI/system-ui nos títulos, Inter/system-ui no corpo e números tabulares nas métricas, sem novas fontes externas.
- Cabeçalho com período, mensagem e círculo; duas colunas de cartões no desktop e uma no celular; resumo no rodapé.
- Dias de água e sono consultáveis por toque ou teclado. Dias futuros desabilitados, ausência de registro distinta de zero.
- O círculo conta áreas com registros, não metas concluídas. A média de água considera dias decorridos; a média de sono considera noites registradas.
- Peso compara a primeira e a última pesagem real da semana, somente com duas ou mais pesagens. Variações não são classificadas como boas ou ruins.
- Calorias opcionais identificadas como informadas; distância e desempenho separados por modalidade.
- Compartilhar imagem ainda não foi implementado.
- Ciclismo: distância em km, velocidade média em km/h e tempo informado, com calorias opcionais. Não usar ritmo em /km nem chamar o tempo de "tempo em movimento", pois o aplicativo não detecta pausas.
- Exercício: usar "Ritmo" com formato `9:05 /km`, separado de distância e tempo. O calendário exibe métricas somente do dia selecionado; totais por modalidade ficam no relatório semanal. A duração continua com a precisão registrada (horas/minutos).
