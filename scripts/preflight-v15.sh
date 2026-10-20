#!/usr/bin/env bash
# V1.5 - read-only Docker/host preflight. This script never deploys containers.
set -euo pipefail
export LC_ALL=C

say() { printf '%s\n' "$*"; }
warn() { say "ATENCAO: $*"; }
ok() { say "OK: $*"; }

say "=== LAB V1.5 - PRE-FLIGHT SOMENTE LEITURA ==="
say "Este diagnostico nao inicia, reinicia, interrompe nem altera containers."
say "Data UTC: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
say ""

if [[ ! -r /proc/meminfo ]]; then
  warn "Requer host Linux com /proc/meminfo acessivel"
  exit 2
fi

cores="$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 0)"
say "CPU logicas disponiveis: $cores"
if [[ "$cores" =~ ^[0-9]+$ ]] && (( cores < 4 )); then
  warn "CPU abaixo de 4; analisar concorrencia com workloads atuais"
fi

available_kib="$(awk '/^MemAvailable:/ {print $2; exit}' /proc/meminfo)"
total_kib="$(awk '/^MemTotal:/ {print $2; exit}' /proc/meminfo)"
if [[ "$available_kib" =~ ^[0-9]+$ ]] && [[ "$total_kib" =~ ^[0-9]+$ ]]; then
  available_mib="$(( available_kib / 1024 ))"
  say "Memoria total: $(( total_kib / 1024 )) MiB"
  say "MemAvailable (inclui cache reutilizavel): $available_mib MiB"
  if (( available_mib < 3072 )); then
    warn "Margem de memoria inferior a 3072 MiB; nao subir stack sem replanejar limites"
  else
    ok "MemAvailable >= 3072 MiB (nao e garantia de capacidade)"
  fi
else
  warn "Nao foi possivel ler memoria disponivel"
fi

if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    say "Docker Engine: $(docker version --format '{{.Server.Version}}' 2>/dev/null || echo indisponivel)"
    if docker compose version >/dev/null 2>&1; then
      say "Docker Compose: $(docker compose version --short 2>/dev/null)"
    else
      warn "Docker Compose v2 indisponivel"
    fi
    root="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || true)"
    if [[ -n "$root" ]] && [[ -e "$root" ]]; then
      say "Disco do Docker:"
      df -h "$root" | awk 'NR==1 || NR==2'
      free_kib="$(df -Pk "$root" | awk 'NR==2 {print $4}')"
      if [[ "$free_kib" =~ ^[0-9]+$ ]] && (( free_kib < 6*1024*1024 )); then
        warn "Menos de 6 GiB livres no filesystem do Docker"
      fi
    fi
    say "Containers em execucao: $(docker ps -q | wc -l | tr -d ' ')"
    say "Volumes cadastrados: $(docker volume ls -q | wc -l | tr -d ' ')"
    say "Uso atual (nomes locais, sem credenciais ou env):"
    docker stats --no-stream --format '{{.Name}}: CPU={{.CPUPerc}} RAM={{.MemUsage}}' 2>/dev/null || warn "docker stats nao disponivel"
  else
    warn "Docker sem permissao de leitura (ou daemon parado)"
  fi
else
  warn "docker nao encontrado"
fi

if command -v ss >/dev/null 2>&1; then
  if ss -H -ltn | awk '$4 ~ /:5688$/ {found=1} END {exit !found}'; then
    warn "Porta TCP 5688 ja esta ocupada"
  else
    ok "Nao foi encontrado listener local na porta TCP 5688"
  fi
else
  warn "ss nao instalado: validar porta 5688 manualmente"
fi

say ""
say "== FIM: DIAGNOSTICO INFORMATIVO =="
say "NENHUMA STACK FOI INSTALADA. Necessaria revisao humana do relatorio."
