#!/bin/sh
# ============================================================
# Expande las variables de entorno dentro de la config de nginx.
# El Dockerfile copia nginx.conf a una plantilla (.template) para que
# este script sustituya ${SMARTLOGIX_GATEWAY_URL} en tiempo de arranque.
# ============================================================
set -e

: "${SMARTLOGIX_GATEWAY_URL:=http://localhost:8080}"
export SMARTLOGIX_GATEWAY_URL

echo "[start-nginx] SMARTLOGIX_GATEWAY_URL=${SMARTLOGIX_GATEWAY_URL}"

envsubst '${SMARTLOGIX_GATEWAY_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "[start-nginx] config nginx generada en /etc/nginx/conf.d/default.conf"

# nginx corre como usuario no root: pid a /tmp (writable) en lugar de /run.
sed -i 's#/run/nginx.pid#/tmp/nginx.pid#' /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
