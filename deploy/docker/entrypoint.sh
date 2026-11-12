#!/bin/sh
# Yedek açıksa: veritabanı yoksa geri yükle, sonra uygulamayı Litestream gözetiminde başlat.
# Uygulama çökerse yedekleme de durur; sessiz yedeksiz çalışma olmaz.
set -eu
if [ "${OPENMERS_BACKUP:-on}" = "off" ]; then
  exec node dist/server.js
fi
if [ -z "${LITESTREAM_REPLICA_URL:-}" ]; then
  echo "UYARI: LITESTREAM_REPLICA_URL tanımlı değil; yedekleme yapılandırılmadı (kapatmak için OPENMERS_BACKUP=off)" >&2
  exec node dist/server.js
fi
if [ ! -f "$OPENMERS_DB" ]; then
  litestream restore -if-replica-exists -config /etc/litestream.yml "$OPENMERS_DB"
fi
exec litestream replicate -config /etc/litestream.yml -exec "node dist/server.js"
