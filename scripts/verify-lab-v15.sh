#!/usr/bin/env bash
# LAB V1.5: read-only post-deploy verification. Never starts or stops containers.
set -euo pipefail
export LC_ALL=C
fail() { printf 'BLOQUEADO: %s\n' "$*" >&2; exit 1; }
pass() { printf 'OK: %s\n' "$*"; }

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../examples/homologation" && pwd)"
env_file="$dir/.env.lab"
[[ -f "$env_file" ]] || fail "Arquivo .env.lab ainda nao existe"
command -v docker >/dev/null || fail "Docker CLI nao encontrado"
docker info >/dev/null 2>&1 || fail "Sem acesso de leitura ao Docker"
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 indisponivel"
[[ "${COMPOSE_PROJECT_NAME:-automation-sandbox-lab}" == "automation-sandbox-lab" ]] || fail "COMPOSE_PROJECT_NAME inesperado"
compose=(docker compose --env-file "$env_file" -f "$dir/compose.lab.yml")
"${compose[@]}" config --quiet >/dev/null || fail "Compose invalido"
pass "Configuracao Compose valida"

n8n_id="$("${compose[@]}" ps -q lab-n8n)"
mock_id="$("${compose[@]}" ps -q lab-mock)"
[[ -n "$n8n_id" && -n "$mock_id" && "$n8n_id" != "$mock_id" ]] || fail "Containers do laboratorio ausentes"
for id in "$n8n_id" "$mock_id"; do
  [[ "$(docker inspect -f '{{.State.Running}}' "$id")" == true ]] || fail "Container parado"
  [[ "$(docker inspect -f '{{.HostConfig.Privileged}}' "$id")" == false ]] || fail "Container privilegiado"
  [[ "$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$id")" == no ]] || fail "Restart automatico nao permitido"
done
pass "Containers ativos sem privilegios elevados"

mapfile -t net1 < <(docker inspect -f '{{range $name,$v := .NetworkSettings.Networks}}{{println $name}}{{end}}' "$n8n_id")
mapfile -t net2 < <(docker inspect -f '{{range $name,$v := .NetworkSettings.Networks}}{{println $name}}{{end}}' "$mock_id")
[[ "${#net1[@]}" -eq 1 && "${#net2[@]}" -eq 1 ]] || fail "Quantidade de redes incorreta"
network="${net1[0]}"
[[ "$network" == "automation-sandbox-lab_lab-only" && "$network" == "${net2[0]}" ]] || fail "Rede nao exclusiva"
[[ "$(docker network inspect -f '{{.Internal}}' "$network")" == true ]] || fail "Rede permite saida externa"
[[ "$(docker network inspect -f '{{len .Containers}}' "$network")" == 2 ]] || fail "Outra aplicacao conectada a rede isolada"
pass "Rede Docker interna com apenas os dois containers de laboratorio"

[[ "$(docker port "$n8n_id" 5678/tcp)" == "127.0.0.1:5688" ]] || fail "Painel publicado em interface/porta insegura"
[[ -z "$(docker port "$mock_id" 8080/tcp 2>/dev/null || true)" ]] || fail "Mock publicado no host"
pass "Painel apenas em loopback, mock sem portas publicadas"

volume="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/home/node/.n8n"}}{{.Name}}{{end}}{{end}}' "$n8n_id")"
[[ "$volume" == "automation-sandbox-lab_lab-n8n-state" ]] || fail "Volume nao exclusivo"
for id in "$n8n_id" "$mock_id"; do
  mounts="$(docker inspect -f '{{range .Mounts}}{{println .Destination}}{{end}}' "$id")"
  if grep -Eq '(^|/)docker[.]sock$|^/etc$|^/var/run$' <<<"$mounts"; then fail "Mount sensivel detectado"; fi
done
pass "Volume exclusivo; sem mounts sensiveis conhecidos"

# All synthetic requests run INSIDE the lab-n8n container.
node_script='
const check=(x,m)=>{if(!x)throw Error(m)};
(async()=>{
  const t=()=>AbortSignal.timeout(3000);
  let response=await fetch("http://lab-mock:8080/health",{signal:t()});
  check(response.status===200&&(await response.json()).mock===true,"Mock health invalido");
  const request=async(fail)=>{
    const r=await fetch("http://lab-mock:8080/mock/notify",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({caseId:fail?"S02":"S01",message:"test-only",simulateFailure:fail}),
      signal:t()});
    const b=await r.json();
    check(r.status===(fail?503:200)&&b.mock===true&&b.delivered===false,
      "Mock 200/503 fora do contrato");
  };
  await request(false);await request(true);
  let reachable=false;
  try {await fetch("https://example.com",{signal:t()});reachable=true;}catch{}
  check(!reachable,"EGRESS EXTERNO POSSIVEL: homologacao bloqueada");
  console.log("OK: mock 200/503, nenhuma entrega real e egress bloqueado");
})().catch(e=>{console.error("BLOQUEADO:",e.message);process.exitCode=1});'
"${compose[@]}" exec -T lab-n8n node -e "$node_script" || fail "Smoke ou egress falhou"

printf '\nVERIFICACOES TECNICAS PASSARAM, MAS NAO AUTORIZAM WORKFLOWS REAIS.\n'
printf 'Revisao humana de firewall, rede do host, credenciais, logs e consumo ainda obrigatoria.\n'
