#!/usr/bin/env bash
# Ejecuta la suite completa de tests unitarios (Vitest) de pre-candidaturas-ui.
# USO EXCLUSIVO DEL USUARIO: los agentes solo ejecutan los tests que ellos crean (regla G7).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo "=============================================="
echo " Tests unitarios — pre-candidaturas-ui"
echo " Directorio: $SCRIPT_DIR"
echo "=============================================="

# Runner en cascada: 1) binario local de vitest (cero dependencia de pnpm)
#                     2) pnpm con PATH ampliado (%APPDATA%\npm)
#                     3) sin vía → aviso por stderr y exit 127
STATUS=0
LOCAL_VITEST="$SCRIPT_DIR/node_modules/.bin/vitest"

if [ -x "$LOCAL_VITEST" ]; then
  "$LOCAL_VITEST" run
  STATUS=$?
else
  export PATH="$HOME/AppData/Roaming/npm:$PATH"
  if command -v pnpm >/dev/null 2>&1; then
    pnpm exec vitest run
    STATUS=$?
  else
    echo "ERROR: no se encontró ninguna vía para lanzar vitest." >&2
    echo "  - '$LOCAL_VITEST' no existe: ejecuta 'pnpm install'." >&2
    echo "  - y/o 'pnpm' no está en el PATH — añade %APPDATA%\npm" >&2
    echo "    (normalmente C:\\Users\\<usuario>\\AppData\\Roaming\\npm)." >&2
    STATUS=127
  fi
fi

echo "=============================================="
if [ "$STATUS" -eq 0 ]; then
  echo " RESULTADO: OK (exit 0) — todos los tests pasaron."
else
  echo " RESULTADO: FALLO (exit $STATUS) — revisa la salida anterior."
  echo " Avisa al agente dueño de pre-candidaturas-ui (handoff/delegación)."
fi
echo "=============================================="

exit "$STATUS"
