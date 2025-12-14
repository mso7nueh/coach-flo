#!/bin/sh
# Ожидание готовности PostgreSQL

set -e

host="$1"
shift
cmd="$@"

until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$host" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q'; do
  >&2 echo "PostgreSQL недоступен - ожидание..."
  sleep 1
done

>&2 echo "PostgreSQL готов - выполнение команды"
exec $cmd






