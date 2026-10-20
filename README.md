# Laboratório de Testes Automatizados

Este repositório documenta um laboratório de testes para automações com **casos sintéticos**, comparação entre resultados esperados e obtidos e relatório de validação.

- Projeto independente do Copiloto TI e do Quality Gate.
- Sem dados reais, credenciais, workflow exportado ou conexões com serviços internos.
- A implementação de referência será revisada em uma branch antes do merge.

**Status:** V1.1 sintética validada no n8n com seleção de suites, comparação de contratos e histórico. Execução de workflows reais ainda não habilitada.

## Segurança

Os exemplos são públicos e deliberadamente **fictícios**. Não adicionar exportações brutas de n8n, segredos, credenciais, IDs internos, dados empresariais, logs ou URLs internas.

## Código de referência

- [Arquitetura e roadmap](docs/automated-test-laboratory.md)
- [Executor sintético](examples/automation-test-lab/runner.mjs)
- [Testes](examples/automation-test-lab/runner.test.mjs)

```bash
node --test examples/automation-test-lab/*.test.mjs
```

**Importante:** esta implementação demonstra o mecanismo em dados sintéticos; não executa outros workflows e não dispõe de permissões para ações em produção.

## V1.1 — Suites configuráveis

A V1.1 permite escolher suites por JSON, testar dois adaptadores sintéticos e registrar os resultados separados por suite, preservando o relatório agregado. [Veja a configuração de exemplo e o guia da V1.1](docs/v1.1-configurable-suites.md).

O runner e a configuração são **referências educacionais sem execução de automações reais**. Os testes incluem resultados positivos, rejeições esperadas e uma falha intencional para provar que o comparador não aprova contratos divergentes.

## V1.2 — Subworkflow sintético

A V1.2 possui um executor manual que chama **somente um subworkflow fictício fixo**, compara todas as respostas e grava relatório na Data Table. Não permite passar um ID de workflow por input nem usar credenciais.

- [Arquitetura, limite de isolamento e resultados V1.2](docs/v1.2-controlled-subworkflow.md)
- [Executor simulado independente](examples/automation-test-lab/sandbox-v12.mjs)
- [Testes de segurança e detecção de divergência](examples/automation-test-lab/sandbox-v12.test.mjs)

O código é educacional. O alvo de testes na instância n8n **não é um container/ambiente separado**; execução de automações de produção continua fora de escopo.

## V1.3 — Radar de regressões

O laboratório agora permite comparar **baselines sintéticas** de uma mesma suite/versão/contrato, diferenciando testes negativos propositais e histórico legado. Um workflow manual lê a amostra do histórico, registra um resumo auditável e não envia alertas nem expõe detalhes a visitantes.

- [Documentação V1.3 e critérios de comparação](docs/v1.3-regression-radar.md)
- [Algoritmo de referência (somente memória)](examples/automation-test-lab/regression-v13.mjs)
- [Testes de regressão, recuperação e histórico incompleto](examples/automation-test-lab/regression-v13.test.mjs)

O radar não avalia workflows de produção, e relatórios de teste não representam incidentes operacionais.

## V1.4 — Pré-homologação e isolamento de testes

O laboratório tem um gate **manual e consultivo**, que considera bloqueada a execução de workflows reais até verificar instância, rede, armazenamento, credenciais e mocks dedicados. Um [modelo de Docker Compose isolado](examples/homologation/compose.lab.yml) e um [servidor de respostas falsas](examples/homologation/mock/server.py) permitem preparar o ambiente separadamente, sem alterar a stack de produção.

- [Runbook de V1.4, limites e checklist de segurança](docs/v1.4-isolated-homologation.md)
- [Política fail-closed reproduzível](examples/automation-test-lab/gate-v14.mjs)
- [Testes de políticas](examples/automation-test-lab/gate-v14.test.mjs)
- [Testes do mock local](tests/test_homologation_mock.py)

**Estado:** política testada com status BLOQUEADO, conforme esperado. O laboratório Docker é apenas um template; não foi implantado automaticamente no host da empresa.

## V1.5 — Diagnóstico de capacidade

Antes de instalar os containers de homologação no servidor, execute o [script de diagnóstico somente leitura](scripts/preflight-v15.sh). Após uma implantação autorizada, use o [verificador de isolamento e mocks](scripts/verify-lab-v15.sh) para validar o ambiente sem alterar os serviços. O [runbook da V1.5](docs/v1.5-host-preflight.md) descreve CPU, memória, Docker, porta e requisitos mínimos de isolamento. **Sem implantação automática:** o ambiente de laboratório ainda depende da avaliação real do host.

## V1.5 — Console interno no n8n

Além da preparação do Docker, existe agora um **console manual** criado na instância n8n atual que consolida **somente evidências sintéticas** do histórico, radar e gate de segurança. Ele salva um snapshot em tabela dedicada e devolve uma **prévia HTML privada** no resultado, sem webhook ou exposição pública.

- [Arquitetura e testes reais da V1.5](docs/v1.5-manual-console.md)
- [Lógica pública de agregação e preview](examples/automation-test-lab/console-v15.mjs)
- [Testes de comandos bloqueados, integridade e HTML](examples/automation-test-lab/console-v15.test.mjs)

Nenhum container foi criado nem serviço de produção alterado. O Docker segregado depende do diagnóstico do host.
