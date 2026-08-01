#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET="${ROOT_DIR}/mihomo/config.yaml"
TMP="${TARGET}.download"
BACKUP="${TARGET}.bak"
GEOSITE="${ROOT_DIR}/mihomo/GeoSite.dat"
GEOSITE_URL="${MIHOMO_GEOSITE_URL:-https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat}"
GEOSITE_MAX_AGE_DAYS="${MIHOMO_GEOSITE_MAX_AGE_DAYS:-7}"
ENV_FILE="${MIHOMO_UPDATE_ENV:-/home/pi/.config/secrets/mihomo-update.env}"
LEGACY_ENV_FILE="${ROOT_DIR}/maintenance/mihomo/mihomo-update.env"
STATE_DIR="${ROOT_DIR}/maintenance/state/mihomo-config-update"
ETAG_FILE="${STATE_DIR}/config.etag"
HEADERS="${STATE_DIR}/headers"
LOCK_DIR="${STATE_DIR}/lock"
CHECK_ONLY=0
FORCE_RELOAD=0

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
elif [[ -f "${LEGACY_ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${LEGACY_ENV_FILE}"
fi

CONFIG_URL="${MIHOMO_CONFIG_URL:?set MIHOMO_CONFIG_URL}"
SECRET="${MIHOMO_SECRET:?set MIHOMO_SECRET}"

case "${1:-}" in
  --check)
    CHECK_ONLY=1
    ;;
  --force)
    FORCE_RELOAD=1
    ;;
esac

mkdir -p "${STATE_DIR}"

if ! mkdir "${LOCK_DIR}" 2>/dev/null; then
  echo "mihomo config update already running"
  exit 0
fi

cleanup() {
  rm -rf "${LOCK_DIR}"
}
trap cleanup EXIT

reload_mihomo() {
  curl -fsS -X PUT "http://127.0.0.1:9090/configs" \
    -H "Authorization: Bearer ${SECRET}" \
    -H "Content-Type: application/json" \
    -d '{"path":"/root/.config/mihomo/config.yaml"}' >/dev/null

  curl -fsS -X POST "http://127.0.0.1:9090/cache/fakeip/flush" \
    -H "Authorization: Bearer ${SECRET}" >/dev/null || true

  curl -fsS -X POST "http://127.0.0.1:9090/cache/dns/flush" \
    -H "Authorization: Bearer ${SECRET}" >/dev/null || true
}

ensure_geosite() {
  if [[ -s "${GEOSITE}" ]] && find "${GEOSITE}" -mtime -"${GEOSITE_MAX_AGE_DAYS}" -print -quit | grep -q .; then
    return
  fi

  if ! curl -fsSL --connect-timeout 20 --retry 3 -o "${GEOSITE}.download" "${GEOSITE_URL}"; then
    rm -f "${GEOSITE}.download"
    if [[ -s "${GEOSITE}" ]]; then
      echo "geosite update failed, keeping existing GeoSite.dat" >&2
      return
    fi
    return 1
  fi

  mv "${GEOSITE}.download" "${GEOSITE}"
}

if [[ "${FORCE_RELOAD}" == "1" ]]; then
  python3 "${ROOT_DIR}/maintenance/mihomo/apply-ops-routing-overlay.py" "${TARGET}"
  ensure_geosite
  reload_mihomo
  echo "mihomo config reloaded"
  exit 0
fi

curl_args=(-fsSL -D "${HEADERS}" -o "${TMP}")

if [[ "${CHECK_ONLY}" == "1" && -s "${ETAG_FILE}" ]]; then
  curl_args+=(-H "If-None-Match: $(cat "${ETAG_FILE}")")
fi

status="$(curl -w '%{http_code}' "${curl_args[@]}" "${CONFIG_URL}")"

if [[ "${status}" == "304" ]]; then
  rm -f "${TMP}"
  echo "mihomo config unchanged"
  exit 0
fi

if [[ "${status}" != "200" ]]; then
  rm -f "${TMP}"
  echo "mihomo config download failed: HTTP ${status}" >&2
  exit 1
fi

etag="$(awk 'BEGIN{IGNORECASE=1} /^etag:/ {sub(/\r$/, "", $2); print $2; exit}' "${HEADERS}")"

python3 "${ROOT_DIR}/maintenance/mihomo/apply-ops-routing-overlay.py" "${TMP}"

if [[ "${CHECK_ONLY}" == "1" && -n "${etag}" && -s "${ETAG_FILE}" ]] && [[ "${etag}" == "$(cat "${ETAG_FILE}")" ]]; then
  rm -f "${TMP}"
  echo "mihomo config unchanged"
  exit 0
fi

if [[ -f "${TARGET}" ]] && cmp -s "${TMP}" "${TARGET}"; then
  if [[ -n "${etag}" ]]; then
    printf '%s\n' "${etag}" > "${ETAG_FILE}"
  fi

  rm -f "${TMP}"
  echo "mihomo config unchanged"
  exit 0
fi

cp "${TARGET}" "${BACKUP}"
mv "${TMP}" "${TARGET}"

python3 "${ROOT_DIR}/maintenance/mihomo/apply-ops-routing-overlay.py" "${TARGET}"

ensure_geosite

if ! docker-compose -f "${ROOT_DIR}/docker-compose.yml" exec -T mihomo /mihomo -t -f /root/.config/mihomo/config.yaml; then
  mv "${BACKUP}" "${TARGET}"
  exit 1
fi

reload_mihomo

if [[ -n "${etag}" ]]; then
  printf '%s\n' "${etag}" > "${ETAG_FILE}"
fi

echo "mihomo config updated"
