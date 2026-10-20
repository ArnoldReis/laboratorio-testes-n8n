# Laboratório de testes automatizados — MVP

> **Exemplo independente com dados fictícios.** Não contém exportações de workflows do n8n, credenciais, IDs de projeto, domínio, pessoas, tickets reais ou métricas corporativas.

## Problema

Automações que executam sem erro técnico ainda podem produzir **resultados incorretos**. É necessário comparar explicitamente o obtido com um contrato esperado, diferenciar erro esperado de defeito e guardar evidências reproduzíveis.

## Arquitetura do MVP

```mermaid
flowchart LR
  A[Disparo manual] --> B[Fixtures sintéticas]
  B --> C[Executar transformação isolada]
  C --> D[Assert por contrato]
  D --> E[Auto-teste do comparador]
  E --> F[Resumo da suite]
  F --> G[(Histórico dedicado)]
  G --> H[Resultado de aprovação]
```

- Execução manual, sem agendamento, webhook público ou acesso a workflow-alvo.
- **8 cenários sintéticos** para ID, prioridade, tempo e status, incluindo recusas esperadas.
- Comparador determinístico e independente da ordem das propriedades.
- Autoteste para detectar um mecanismo de comparação defeituoso.
- Histórico append-only por chave única da execução; uma segunda execução gera novo registro.
- `duration_ms = null` enquanto não existir medida confiável. Nunca registrar zero inventado.
- **O resultado APROVADO indica apenas que os testes desta suite passaram**; não comprova homologação do workflow de produção.

## Plano técnico de evolução

1. **MVP:** fixtures em memória, transformação fictícia, assertions, relatório e Data Table.
2. **V1.1:** parametrizar suites pelo contrato e validar limite de casos, tamanho e segurança dos dados de entrada.
3. **V1.2:** executar alvo explicitamente permitido em um ambiente separado, sem permissões de produção.
4. **V1.3:** métricas de regressão e falhas recorrentes, sem somar execuções diferentes do mesmo cenário como defeitos distintos.
5. **V2:** apresentar resultados agregados no Copiloto TI, em uma seção de Qualidade e Testes, sem expor informações operacionais enquanto a leitura não for autenticada.

**Regra de segurança:** testes de integração precisam de allowlist, mocks e bloqueios para saída de mensagens, bancos de produção, operações mutáveis e APIs externas. Este exemplo não executa n8n nem se conecta à infraestrutura.

## Como testar

```bash
node --test examples/automation-test-lab/*.test.mjs
```

Os exemplos devem permanecer reusáveis sem serviços externos ou segredos.
