#!/usr/bin/env bash
set -Eeuo pipefail

fail() {
    printf 'ERROR: %s\n' "$*" >&2
    exit 1
}

trap 'printf "ERROR: fallo en la línea %s.\n" "$LINENO" >&2' ERR

[[ $EUID == 0 && $# -le 1 ]] || fail 'Uso: sudo bash deploy-ui-dev.sh [RUTA_AL_BUILD]'
script_dir=$(dirname -- "$(realpath -- "${BASH_SOURCE[0]}")")
source_dir=$(realpath -e -- "${1:-$script_dir/pre-candidaturas-ui}") ||
    fail "No existe la carpeta de carga: ${1:-$script_dir/pre-candidaturas-ui}"
web_root=/var/www/precandidaturas-dev
host=pre-registros.prdags.com

[[ ! $source_dir -ef $web_root ]] || fail 'Usa la carpeta de carga como origen.'
[[ -s "$source_dir/index.html" && -d "$source_dir/assets" ]] ||
    fail "Faltan index.html o assets/ en $source_dir."
[[ -n $(find "$source_dir/assets" -type f -print -quit) ]] || fail 'assets/ está vacío.'
[[ -d $web_root ]] || fail "No existe $web_root."
systemctl is-active --quiet caddy || fail 'Caddy no está activo.'

exec 9>/run/lock/precandidaturas-ui-dev.lock
flock -n 9 || fail 'Ya hay un despliegue de UI en curso.'

backup=$(mktemp -d "/var/www/precandidaturas-dev-backup-$(TZ=America/Mexico_City date +%Y-%m-%d).XXXXXX")
cp -a -- "$web_root/." "$backup/"
printf 'Respaldo: %s\n' "$backup"

staged_index=$(mktemp -- "$web_root/.index.XXXXXX")
response=$(mktemp)
trap 'rm -f -- "$staged_index" "$response"' EXIT

shopt -s nullglob
for entry in "$source_dir"/*; do
    name=$(basename -- "$entry")
    case "$name" in
        index.html|*.sh|demo-files|demo_files) continue ;;
    esac
    [[ -z $(find "$entry" ! -type f ! -type d -print -quit) ]] ||
        fail "Tipo de archivo incompatible: $entry"
    cp -R --no-preserve=mode,ownership -- "$entry" "$web_root/"
done

install -m 0644 -- "$source_dir/index.html" "$staged_index"
mv -T -- "$staged_index" "$web_root/index.html"

code=$(curl --max-time 10 -sS --resolve "$host:443:127.0.0.1" \
    -o "$response" -w '%{http_code}' "https://$host/" ) ||
    fail "Caddy no respondió por HTTPS. Respaldo: $backup"
[[ $code == 200 ]] && cmp -s -- "$response" "$web_root/index.html" ||
    fail "La respuesta HTTPS no coincide con el index.html publicado (HTTP $code). Respaldo: $backup"

printf 'OK: https://%s/ devolvió HTTP 200 con el index.html publicado.\n' "$host"
