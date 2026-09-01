# Relatório semanal

## Menu padrão para zerar a água — 01/09/2026

- O texto Zerar solto foi substituído por um botão discreto de três pontos ao lado de Já registrado.
- O menu compacto contém apenas Zerar consumo do dia; a confirmação informa o total e a data selecionada.
- Cores neutras no acesso e no menu; vermelho reservado somente ao botão final Zerar.
- Fluxo conferido em 390 px com banco fictício, incluindo abertura, confirmação e cancelamento sem excluir dados. Build aprovado e 18 testes de água aprovados.

## Água simplificada: Zerar — 31/08/2026

- Por preferência do usuário, lista de consumos retirada da interface. Apenas Zerar em texto cinza discreto abaixo da quantidade.
- Confirmação neutra, sem vermelho, indica a data selecionada. Zera somente aquele dia no perfil atual, preservando outros dias e metas.
- Total conferido antes da exclusão para bloquear confirmação desatualizada. Exclusão de hoje não celebra; resumos recalculados.
- 289 testes aprovados, 2 ignorados; TypeScript/build aprovados. Interface, cancelamento e confirmação testados com dados fictícios.

## Exclusão individual e calendário compacto — 31/08/2026

- Água: cada dia mostra todos os consumos separados, com lixeira e confirmação para excluir qualquer registro pelo ID, não apenas o último. Exclusão limitada ao perfil atual e recalcula o total e o relatório.
- Registro antigo não altera hoje; exclusão de hoje atualiza o cartão e consulta novamente o último registro sem disparar celebração.
- Calendário de água reduzido de 80 para 56 px de altura mínima, com seleção azul suave e borda fina, sem destaque preto.
- Sono e exercício já permitem exclusão no dia selecionado. Histórico de peso agora oferece Ver pesagens anteriores, removendo o limite que escondia registros além dos últimos 12. Peso inicial do perfil permanece como referência, não como pesagem excluível.
- Testes: 281 aprovados, 2 ignorados; TypeScript/build aprovados. No navegador, exclusão dos 900 ml intermediários manteve 250 ml e 750 ml; cancelamento e layout de 320 px conferidos em banco fictício.

## Água em datas anteriores — 31/08/2026

- Em Água → Ver semana, o campo Data do consumo permite escolher dias e semanas anteriores, com atalho Hoje. O + principal continua registrando somente hoje.
- Semana passada considera os sete dias na média; semana atual considera os dias decorridos. Registro antigo não modifica o total de hoje, a preferência do recipiente nem sua celebração.
- Confirmação com quantidade e data após salvar; campo de quantidade limpo para evitar repetição acidental. Bloqueio de gravação dupla e de troca de data durante o envio.
- Datas futuras bloqueadas; relatório recebe a água na semana correta. Números e unidade separados no calendário pequeno para evitar transbordamento.
- Validação: 270 testes backend aprovados, 2 ignorados; TypeScript/build aprovados. Teste isolado de 900 ml no sábado anterior manteve 2.000 ml em hoje; layout conferido em 320 e 390 px.

## Sono em datas anteriores — 31/08/2026

- Seletor Data em que acordou, inicialmente em hoje, com acesso a semanas anteriores e atalho Hoje.
- Horários existentes carregados ao escolher o dia; Salvar alterações identifica a edição de uma noite já registrada. Datas futuras bloqueadas.
- Sono antigo atualiza a semana correspondente sem substituir o cartão de hoje nem acionar sua celebração; exclusão preserva outras datas.
- Carregamentos protegidos contra respostas atrasadas e controles desabilitados durante gravação/exclusão. Horários nativos atualizam imediatamente a duração exibida.
- Validação: 260 testes backend aprovados, 2 ignorados; TypeScript e build aprovados. Noite fictícia de 9h salva e reaberta, mantendo 8h em hoje; layout conferido em 320 e 390 px.

## Exercícios em datas anteriores — 31/08/2026

- Campo Data da atividade abre em hoje e permite escolher dias anteriores, inclusive outras semanas; atalho Hoje retorna à semana atual.
- Calendário carrega a semana inteira selecionada, preservando todas as atividades de cada dia. Datas futuras permanecem bloqueadas.
- Adicionar, editar ou excluir uma atividade antiga atualiza o histórico e o relatório correspondente, sem substituir os exercícios de hoje nem disparar sua celebração.
- Precisão dos segundos e estimativa de calorias mantidas. O painel recebe sempre o resumo da semana atual, separado da semana consultada.
- Validação: 250 testes backend aprovados, 2 ignorados; 18 testes de duração/celebrações aprovados; TypeScript e build aprovados. Cadastro, edição e retorno para hoje conferidos em banco fictício, com layout de 320 e 390 px.

## Meu copo ou garrafa — 31/08/2026

- Ao tocar no total de água, a opção Meu copo ou garrafa permite salvar um tamanho entre 50 e 2.000 ml, incluindo 750 e 900 ml.
- Salvar tamanho não registra consumo nem altera a meta diária. O + passa a usar a preferência, inclusive depois de recarregar; a legenda mostra o tamanho escolhido.
- Registrar uma quantidade avulsa não muda a preferência. O − desfaz o último registro inteiro.
- Preferência armazenada no perfil, preservada na edição de metas e na limpeza dos registros; migração mantém 250 ml como padrão dos perfis existentes.
- Backup local do banco realizado antes da migração. Testes: 240 aprovados, 2 ignorados; compilação frontend aprovada e fluxo validado com banco fictício em tela de celular de 320 px.

## Quantidades rápidas de água — 31/08/2026

- Tocar no total do cartão Água abre um diálogo com atalhos 250, 500 e 750 ml e campo de quantidade personalizada (50–2.000 ml inteiros, limites já existentes no serviço).
- O + adiciona o tamanho salvo (250 ml por padrão). O − desfaz o último registro inteiro, inclusive garrafas e quantidades personalizadas.
- Selecionar uma opção não grava: há confirmação Adicionar, Cancelar e fechar. Janela mantém foco e evita fechar durante envio; trava de requisição impede envios concorrentes pelo cartão.
- Mesma rotina atualiza total, último registro, semana e celebração da meta. Não muda meta nem a quantidade padrão do +.
- Validação: 8 testes de quantidade/desfazer passaram, TypeScript/build. Prévia isolada em 390/320 px, cancelar, 750 ml, desfazer e 375 ml personalizado. Registros pessoais preservados.

## Gráfico de evolução do peso — 31/08/2026

- Seção Sua trajetória dentro de Peso, entre o resumo e o histórico recente; filtros 30 dias, 90 dias e Tudo.
- Endpoint próprio consulta somente pesagens reais do perfil ativo, em ordem cronológica, sem limite de 12 itens e sem pontos futuros ou peso inicial artificial.
- Escala horizontal respeita o intervalo entre datas. Linhas conectam pesagens reais, sem criar estimativas nos dias vazios; zero ou um registro têm estados próprios.
- Meta atual válida de perda/ganho aparece como linha tracejada neutra. Eixo vertical inclui meta e medições, com escala explicitada.
- Toque no gráfico escolhe ponto mais próximo; setas e controle deslizante permitem consultar todos os pontos com teclado ou toque. Data e valor aparecem acima do gráfico.
- Recarrega ao corrigir/excluir peso e ao trocar de período; requisições canceladas não substituem a seleção mais recente. Estados de erro e tentar novamente.
- Validação: 217 testes backend passaram (2 ignorados por condição de data), 45 frontend, TypeScript/build. Prévia fictícia verificada em 390/320 px, filtros e seleção por toque/setas. Nenhuma pesagem pessoal alterada.

## Registrar peso de outro dia — 31/08/2026

- Campo Data da pesagem abre com Hoje e aceita dias anteriores; data local no navegador, validação ISO e bloqueio de futuro também no servidor.
- POST cria apenas uma pesagem por data/perfil. Conflitos retornam a pesagem existente sem sobrescrever e oferecem edição explícita por ID, inclusive para datas fora do histórico recente.
- Edição mantém data/horário original. Registros antigos atualizam histórico e relatório da semana correta sem disparar conquista de hoje ou substituir a categoria de último registro de hoje.
- Validado com 209 testes backend passando (2 ignorados por condição de data), TypeScript/build e prévia isolada: ontem no histórico, Hoje ao reabrir, aviso de duplicidade e layout 390/320 px.

## Editar e excluir pesagens — 31/08/2026

- Histórico recente permite tocar em cada pesagem real para revelar Editar/Excluir. Mostra os até 12 itens já retornados pelo resumo, antes limitados a cinco na interface.
- Correção mantém ID, data e horário original; exclusão exige confirmação e preserva outras pesagens, perfil e metas. Peso inicial do perfil é identificado e não tem ações destrutivas.
- APIs PUT/DELETE por ID são restritas ao perfil ativo, validam valores e não criam registros ausentes. Excluir exige confirmação também no servidor.
- Painel atualiza resumo e último registro após correções, sem disparar medalhas/troféus de progresso; relatório usa os valores corrigidos ao abrir.
- Validação: 191 testes backend passaram, 2 ignorados por condição de data; TypeScript/build e fluxo de editar, cancelar e confirmar exclusão em celular 390/320 px, sem transbordamento. Somente pesagens fictícias foram alteradas nos testes.

## Limpar registros e recomeçar — 31/08/2026

- Em Perfil e metas → Seus dados, a opção mostra as contagens de água, sono, exercícios, pesagens e desafios de todo o histórico do perfil ativo.
- Preserva integralmente perfil, metas e peso inicial do cadastro. Não apaga registros de outros perfis.
- Backup JSON opcional inclui registros completos, perfil, metas e versão do formato; não existe restauração automática nesta versão.
- Limpeza exige aviso marcado + texto APAGAR; servidor também exige confirmação, cabeçalho próprio e revisão dos dados. Mudanças depois da prévia impedem apagar até nova revisão.
- Exclusões são atômicas: qualquer falha desfaz a transação inteira. Não há exclusão ao abrir, baixar backup ou cancelar.
- Sucesso recarrega o painel ao voltar para evitar estatísticas antigas. Testado somente com bancos fictícios; os registros pessoais não foram apagados durante a implementação.
- Validação: 175 testes backend passaram, 2 ignorados por condição de data; TypeScript/build e fluxo móvel de cancelar, baixar backup e confirmar em 390/320 px.

## Relatório — comparação entre semanas — 31/08/2026

- Cada cartão mostra uma comparação discreta com a semana anterior, mantendo a cor da área e sem classificar menos registros como fracasso.
- Semana atual compara segunda até hoje com os mesmos dias da anterior; semanas encerradas comparam os sete dias completos. Período comparado aparece uma vez acima dos cartões.
- Água e sono comparam dias/noites com meta atingida; exercício compara dias ativos distintos, não número de atividades. As duas semanas usam as metas atuais do perfil.
- Peso compara a última pesagem real de cada período e mostra ambas as datas e a diferença; não usa o peso do perfil para preencher semanas vazias. Indica direção do objetivo apenas para perda/ganho explícito e não ambíguo.
- Sem registros em qualquer um dos períodos, ou sem meta configurada de água/sono, não inventa diferença: mostra “Ainda sem comparação”.
- Indicadores diários de exercício mostram check permanente quando há atividade, com detalhes preservados ao clicar.
- Validação: 161 testes backend passaram (2 ignorados por condição de data), 42 frontend, TypeScript e build. Conferência de interface em 390 e 320 px sem transbordamento.

## Relatório — destaque baseado em conquistas — 31/08/2026

- “Seu destaque foi…” prioriza o plano semanal de exercício cumprido, usando os dias planejados e registrados. Se houver mais dias que o planejado, mostra ambos sem inventar uma nova meta.
- Sem plano semanal cumprido, destaca a área com mais dias de meta alcançada entre água e sono; empate menciona as duas. Considera apenas metas configuradas e diferencia dias registrados de dias com meta atingida.
- Sem essas conquistas, preserva o incentivo pela constância de registros, incluindo peso, sem julgar variações de peso ou cobrar resultados. Semanas vazias atuais e anteriores mantêm mensagens próprias.
- Mesma aparência e mesmos dados do relatório; sem alteração de registros ou fórmulas. TypeScript, build e 39 testes da interface passaram, incluindo prioridade, empates, singular/plural, metas ausentes e semanas anteriores.

## Relatório — exercícios por dia — 31/08/2026

- Cartão de Exercício mantém os totais semanais e por modalidade, com uma faixa de segunda a domingo. Cada dia mostra a quantidade de atividades; futuros ficam desabilitados e dias sem registros têm mensagem própria.
- Ao tocar, abre somente os registros do dia escolhido. Atividades da mesma modalidade permanecem separadas e ordenadas pelos registros; não inventa rótulos de ida/volta. Distância, ritmo, velocidade média, tempo com segundos e calorias aparecem somente quando aplicáveis a cada atividade, respeitando valores informados/estimados.
- Consulta apenas: sem novos controles de editar/excluir ou alterações nos dados. Tocar novamente no dia ou no botão de recolher fecha a lista; o foco retorna ao dia. Trocar de semana reinicia a seleção. Funciona para semanas anteriores e vazias.
- Validação: TypeScript e build passaram; 151 testes do servidor passaram e dois existentes foram ignorados por ser segunda-feira. Navegador em 390/320 pixels com três atividades no domingo, corrida no sábado (3,28 km, 29min 49s, 9:05 /km), dia vazio, recolhimento, foco e troca de semana. Sem rolagem lateral ou alteração de registros pessoais.

## Relatório — navegação semanal e cabeçalho compacto — 31/08/2026

- Setas para consultar semanas anteriores e avançar até a atual, com botão “Voltar à atual”. Período inclui o ano e lida com semanas entre meses/anos. Ao reabrir o relatório, retorna à semana atual. Dias selecionados são reiniciados ao trocar de período.
- Consulta somente leitura com `weekOffset`: semanas passadas incluem segunda a domingo; a atual considera apenas os dias decorridos. Não permite semanas futuras e valida entradas inválidas. Nenhuma alteração no histórico pessoal ou migração de banco.
- Semana antiga sem pesagem mostra “Sem registros”, sem apresentar o peso atual como dado histórico. Textos diferenciam semana encerrada, ausência de dados e semana em andamento. Metas históricas usam as configurações atuais do perfil, com aviso no relatório.
- Cabeçalho móvel mais compacto: título e círculo lado a lado, resumo abaixo e textos auxiliares mais legíveis. Mantidos cores, identidade, detalhes e estrutura de duas colunas no computador.
- Validação: TypeScript, build, 149 testes de servidor passaram; dois testes existentes são ignorados às segundas-feiras. Navegador com dados fictícios: consulta anterior, domingo, semana vazia, próxima semana, retorno à atual, reabertura, larguras 320/390 e layout desktop. Endpoint atualizado respondendo na página local.
- Comparação com a semana anterior implementada em 31/08/2026. Compartilhamento permanece adiado.

## Peso — medalha e troféu aprovados — 28/08/2026

- Aplicados os dois símbolos da prévia: medalha dourada com fita verde e folha em relevo para o progresso; troféu com a folha como escultura dourada sobre base verde para a meta. Componente vetorial compartilhado, com identificadores de degradê únicos por instância.
- Ajuste de cor aprovado: a fita da medalha mantém o degradê esmeralda → teal → ciano da marca. Após testar esse degradê no troféu, sua base voltou ao verde escuro original por preferência do usuário. Dourado, formas e animações preservados.
- Medalha: mudança de pelo menos 1 kg desde o último registro, na direção do objetivo. Mostra a diferença real e “Um passo importante.” Sem somar pequenas mudanças nem usar o acumulado inicial.
- Troféu: ao salvar um peso que alcança/cruza a meta pela primeira vez desde o registro anterior, tem prioridade sobre a medalha, inclusive se o último passo for menor que 1 kg. Mostra “Você chegou lá!” e a diferença desse registro. Não repete enquanto a meta já estiver alcançada, nem ao recarregar ou editar apenas a meta.
- Entrada suave com pequena rotação, aro desenhado e reflexo curto. Duração de 4 segundos, espera o formulário fechar e o cartão ficar visível. Mantém as métricas montadas e respeita movimento reduzido. Depois, o troféu fica estático no cartão dourado com “Meta alcançada”, enquanto o peso atual cumprir a meta.
- Água, sono, exercício e histórico pessoal preservados. Validação: TypeScript, build, 32 testes, medalha de −2 kg e troféu no último −0,5 kg com dados fictícios; conferência em 390/320 pixels e persistência ao reabrir.

## Peso — medalhão de conquista e diferença entre registros — 28/08/2026

- Regra aprovada: só celebra uma mudança de pelo menos 1 kg na direção do objetivo, comparando o novo peso com o último valor registrado. Não usa o peso inicial nem soma pequenas mudanças. De 78 para 76 mostra “−2 kg”; depois, de 76 para 75, mostra “−1 kg”. Para ganho, mantém o sinal positivo e o mesmo critério.
- Mensagem exibe a diferença real, inclusive decimal, sem limitar a 1 kg. Pesos são comparados em décimos inteiros para não errar no limite exato de 1 kg por arredondamento binário.
- Dentro do cartão: folha Deleve em medalhão dourado, contorno desenhado, reflexo curto e brilho suave, com “Na direção do seu objetivo”. Duração de 4 segundos e retorno suave às métricas, sem alterar a altura do cartão. Substitui o aviso flutuante de peso.
- Aguarda o fechamento do formulário e o cartão visível; não dispara ao recarregar, salvar o mesmo peso ou mudar na direção oposta. Mudança de objetivo ou novo registro sem conquista cancela a animação pendente. Movimento reduzido mantém o selo estático.
- Incentivo e prêmio são independentes: a meta numérica não bloqueia mais a animação de pelo menos 1 kg. Ao alcançar ou cruzar o peso desejado na direção escolhida, o cartão ganha degradê dourado, folha Deleve e selo “Meta alcançada”. Esse visual continua após a animação e ao reabrir a página, sem repetir a celebração. É recalculado se o peso ou a meta mudar; não é um troféu histórico. Substitui a restrição anterior de não celebrar além do peso desejado.
- Água, exercício, sono e o acumulado já mostrado no cartão de peso foram preservados. Validação: TypeScript, build, 30 testes e navegador com registros fictícios para “−2 kg”, depois “−1 kg”, ausência em −0,5 kg, e “+3 kg” em objetivo de ganho. Prêmio dourado conferido depois da animação e ao recarregar. Conferência em 390 e 320 pixels, sem alterar histórico pessoal.

## Sono — conquista dentro do cartão — 28/08/2026

- Refinamento aprovado apenas para sono: lua suave, pequenas estrelas e brilho lilás dentro do cartão, substituindo seu aviso flutuante. Mostra a duração real seguida de “de descanso” e “Meta de sono atingida”.
- Ativação somente ao atingir a meta configurada em um registro salvo de hoje, considerando o valor anterior do mesmo dia. Salvar um sono que já atingia a meta ou carregar a página não repete a celebração.
- Aguarda o fechamento das janelas e a área central do cartão ficar visível. Dura 4 segundos, mantém a altura do cartão e devolve as métricas suavemente. Movimento reduzido mantém lua, estrelas e mensagem estáticos.
- Correção abaixo da meta, remoção do registro e alteração da meta cancelam a conquista pendente. Exercício, peso e água preservados.
- Validação: TypeScript, build, 27 testes e conferência no navegador com registros fictícios, duração real, ausência de aviso flutuante e ausência de repetição ao recarregar.

## Exercício — conquista dentro do cartão — 28/08/2026

- Refinamento aprovado apenas para exercício: o aviso flutuante é substituído por uma animação no próprio cartão, com traço de movimento desenhado, brilho rosa suave e o tempo real somado no dia seguido de “por você” (ex.: “1h 30min por você”). Os 30 minutos são apenas o gatilho, não um valor fixo na mensagem. Sem confetes ou mudança permanente no layout.
- Dura 3,8 segundos; as métricas permanecem montadas para preservar a altura do cartão e retornam com transição suave. Preferência por movimento reduzido mostra a conquista estática.
- Mantido o marco de 30 minutos somados no dia. Aguarda o fechamento do formulário e a área central do cartão ficar visível antes de começar. Uma correção abaixo de 30 minutos ou uma exclusão cancela a celebração pendente. Não dispara ao carregar.
- Sono, peso e água não foram redesenhados nesta etapa. Validação: TypeScript, build, 26 testes e conferência com atividades fictícias no navegador.

## Incentivos de exercício, sono e peso — 28/08/2026

- Selo flutuante de 4,4 segundos, com círculo que se completa, ícone e pequenas partículas. Rosa para exercício, lilás para sono e dourado com a folha Deleve para peso. Pode ser fechado e não bloqueia os registros.
- Exercício: comemora ao cruzar 30 minutos no total do dia, somando modalidades e respeitando os segundos. Só é acionado por salvamento de hoje; carregar, excluir ou registrar mais tempo após o marco não dispara novamente.
- Sono: comemora ao alcançar a meta configurada em um registro salvo de hoje, sem repetir ao salvar um sono que já atingia a meta. Não inventa meta quando ela não foi configurada.
- Peso: compara o novo valor com o último conhecido e segue explicitamente “Perder peso” ou “Ganhar peso”. Não celebra valor repetido, direção oposta, manutenção ou avanço além do peso desejado. A mensagem valoriza o progresso, sem afirmar perda de gordura ou ganho muscular.
- Não há animação no carregamento ou na edição do perfil. Preferência por movimento reduzido mantém apenas ícone e mensagem estáticos. Celebração de água preservada.
- Validação: TypeScript, build e 26 testes; navegador com dados fictícios para soma de atividades, sono, perda/ganho de peso, fechamento e ausência de repetição ao reabrir. Selo conferido em larguras de 320 e 390 pixels, sem alterar registros pessoais.

## Meu desafio de hoje — teste de linguagem — 28/08/2026

- “Foco do dia” passa a se chamar “Meu desafio de hoje”, com apenas o convite “Escolha um pequeno passo.” abaixo do título e a ação “Concluir desafio”. Removida a terceira frase redundante.
- Ao concluir: “Desafio concluído” e “Você conseguiu. Um passo de cada vez.”. Edição, remoção com confirmação e retorno a pendente continuam disponíveis, sem penalidades.
- Mantidos visual, API e tabela existentes; não há migração nem alteração dos desafios já registrados. Pequenos ajustes de quebra de linha acomodam os novos textos no celular.

## Água — destaque persistente da meta — 28/08/2026

- Último registro de água: removido “Hidratação atualizada”; mantidos título, horário, quantidade e métricas.

- Quando o total diário alcança a meta exata, o cartão mantém um degradê azul profundo e o selo “Meta atingida” após a comemoração.
- Estado derivado do total e da meta: permanece ao reabrir, não repete a animação no carregamento e é removido se o total ficar abaixo da meta. Não depende do percentual arredondado.
- Comemoração aprovada, controles e registros preservados. Validação: TypeScript, build, 20 testes de interface/lógica e conferência em 320/390 pixels com dados fictícios.

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
