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
