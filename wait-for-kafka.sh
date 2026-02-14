#!/bin/sh
set -e

host="$1"
port="$2"
shift 2  # removes host and port from the arguments list
echo "SCRIPT: Waiting for Kafka at $host:$port..."

# Wait for Kafka port to open
while ! nc -z "$host" "$port"; do
  echo "SCRIPT: Kafka not ready yet, sleeping 2s..."
  sleep 2
done
echo "SCRIPT: Kafka port open! Verifying connectivity..."
exec "$@"

## Simple TCP check loop (up to 10 tries)
#for i in $(seq 1 10); do
#  if (echo > /dev/tcp/"$host"/"$port") >/dev/null 2>&1; then
#    echo "SCRIPT: Kafka responded — starting service..."
#    exec "$@"   # Run the remaining command (e.g., node dist/main.js)
#    exit 0
#  fi
#  echo "SCRIPT: Kafka not responding yet (try $i/10)... sleeping 2s"
#  sleep 2
#done
#echo "SCRIPT: Kafka failed to respond after waiting — exiting"
#exit 1




