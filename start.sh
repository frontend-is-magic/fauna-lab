#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}"
FRONTEND_DIR="${REPO_ROOT}/frontend"
BACKEND_DIR="${REPO_ROOT}/backend"
BACKEND_ENV_DIR="${REPO_ROOT}/.conda/fauna-lab"
BACKEND_URL="http://localhost:8000/health"
FRONTEND_URL="http://localhost:5173"
BACKEND_PID=""

require_command() {
  local command_name="$1"
  local message="$2"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Error: %s\n' "$message" >&2
    exit 1
  fi
}

cleanup() {
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
    printf '\nStopping backend (pid=%s)...\n' "${BACKEND_PID}"
    kill "${BACKEND_PID}" >/dev/null 2>&1 || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
}

wait_for_backend() {
  local attempt
  for attempt in $(seq 1 30); do
    if curl -fsS "${BACKEND_URL}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  printf 'Error: backend did not become ready at %s within 30 seconds.\n' "${BACKEND_URL}" >&2
  return 1
}

start_backend() {
  printf 'Starting backend from %s\n' "${BACKEND_DIR}"

  if command -v conda >/dev/null 2>&1 && [[ -d "${BACKEND_ENV_DIR}" ]]; then
    printf 'Using repo-local conda environment: %s\n' "${BACKEND_ENV_DIR}"
    conda run --no-capture-output -p "${BACKEND_ENV_DIR}" python -m uvicorn app.main:app --reload --app-dir "${BACKEND_DIR}" &
  elif command -v conda >/dev/null 2>&1 && conda env list | grep -E '(^|[[:space:]])fauna-lab([[:space:]]|$)' >/dev/null 2>&1; then
    printf 'Using conda environment: fauna-lab\n'
    conda run --no-capture-output -n fauna-lab python -m uvicorn app.main:app --reload --app-dir "${BACKEND_DIR}" &
  else
    printf 'No usable conda env found; using the active Python environment.\n'
    (
      cd "${BACKEND_DIR}"
      python -m uvicorn app.main:app --reload
    ) &
  fi

  BACKEND_PID="$!"
}

main() {
  if [[ ! -d "${FRONTEND_DIR}" ]]; then
    printf 'Error: frontend directory not found: %s\n' "${FRONTEND_DIR}" >&2
    exit 1
  fi

  if [[ ! -d "${BACKEND_DIR}" ]]; then
    printf 'Error: backend directory not found: %s\n' "${BACKEND_DIR}" >&2
    exit 1
  fi

  require_command pnpm 'pnpm is required to start the frontend.'
  require_command curl 'curl is required for the backend health check.'

  if ! command -v conda >/dev/null 2>&1; then
    require_command python 'python is required to start the backend when conda is unavailable.'
  fi

  trap cleanup EXIT INT TERM

  start_backend
  wait_for_backend

  printf 'Backend ready: %s\n' "${BACKEND_URL}"
  printf 'Starting frontend from %s\n' "${FRONTEND_DIR}"
  printf 'Frontend URL: %s\n' "${FRONTEND_URL}"

  cd "${FRONTEND_DIR}"
  pnpm dev
}

main "$@"
