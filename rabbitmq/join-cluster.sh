#!/bin/sh
set -e

echo "[rabbitmq2] starting local RabbitMQ node..."
rabbitmq-server &
RABBITMQ_SERVER_PID=$!

echo "[rabbitmq2] waiting for local node to boot..."
until rabbitmq-diagnostics -q ping >/dev/null 2>&1; do
  sleep 2
done

echo "[rabbitmq2] joining cluster rabbit@rabbitmq1..."
rabbitmqctl stop_app
rabbitmqctl reset
rabbitmqctl join_cluster rabbit@rabbitmq1
rabbitmqctl start_app

echo "[rabbitmq2] joined the cluster. Container stays up."
wait $RABBITMQ_SERVER_PID
