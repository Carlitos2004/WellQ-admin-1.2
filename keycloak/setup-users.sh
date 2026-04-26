#!/bin/sh
# Establece la contraseña del usuario de prueba via Admin REST API.
# Reintenta la conexión hasta que Keycloak esté listo.

set -e

MAX_RETRIES=24
INTERVAL=10
KC=http://keycloak:8080

echo "[setup] Esperando a que Keycloak esté listo..."

for i in $(seq 1 $MAX_RETRIES); do
  TOKEN=$(curl -sf -X POST "$KC/realms/master/protocol/openid-connect/token" \
    -d "client_id=admin-cli&username=admin&password=admin&grant_type=password" \
    | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

  if [ -n "$TOKEN" ]; then
    echo "[setup] Keycloak listo."
    break
  fi

  echo "[setup] Intento $i/$MAX_RETRIES — reintentando en ${INTERVAL}s..."
  sleep $INTERVAL

  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "[setup] Error: Keycloak no respondió tras $MAX_RETRIES intentos."
    exit 1
  fi
done

echo "[setup] Obteniendo ID del usuario admin@wellq.com..."
USER_ID=$(curl -sf \
  -H "Authorization: Bearer $TOKEN" \
  "$KC/admin/realms/wellq/users?username=admin%40wellq.com" \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "[setup] Error: usuario admin@wellq.com no encontrado en el realm wellq."
  exit 1
fi

echo "[setup] Estableciendo contraseña..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"password","value":"WellQ@2024","temporary":false}' \
  "$KC/admin/realms/wellq/users/$USER_ID/reset-password")

if [ "$STATUS" != "204" ]; then
  echo "[setup] Error: no se pudo establecer la contraseña (HTTP $STATUS)."
  exit 1
fi

echo "[setup] Listo. Usuario de prueba configurado correctamente."
