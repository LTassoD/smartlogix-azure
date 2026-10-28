#!/usr/bin/env python3
"""
Crea (idempotente) el topic de eventos de pedidos de la EP3.

Uso:
    python kafka/crear_topic.py                 # localhost:9092
    python kafka/crear_topic.py --bootstrap kafka:29092   # dentro de la red Docker

Topic: smartlogix.orders.events
   - 3 particiones  -> permite escalar consumidores en paralelo
   - key = orderNumber -> todas las versiones de un pedido caen en la misma partición
   - retención 7 días
"""
import argparse
import sys

from confluent_kafka.admin import AdminClient, NewTopic

TOPIC = "smartlogix.orders.events"
PARTICIONES = 3
REPLICAS = 1
RETENCION_MS = 7 * 24 * 60 * 60 * 1000  # 7 días


def main() -> int:
    parser = argparse.ArgumentParser(description="Crea el topic de pedidos en Kafka")
    parser.add_argument("--bootstrap", default="localhost:9092")
    args = parser.parse_args()

    admin = AdminClient({"bootstrap.servers": args.bootstrap})

    existentes = admin.list_topics(timeout=15).topics
    if TOPIC in existentes:
        print(f"  [=] El topic '{TOPIC}' ya existe ({existentes[TOPIC].partitions.__len__()} particiones). Nada que hacer.")
        return 0

    nuevo = NewTopic(
        TOPIC,
        num_partitions=PARTICIONES,
        replication_factor=REPLICAS,
        config={"retention.ms": str(RETENCION_MS)},
    )

    futuros = admin.create_topics([nuevo])
    for nombre, futuro in futuros.items():
        try:
            futuro.result(timeout=30)
            print(f"  [+] Topic '{nombre}' creado: {PARTICIONES} particiones, retencion 7 dias.")
        except Exception as exc:  # TopicAlreadyExistsError incluido
            print(f"  [!] No se pudo crear '{nombre}': {exc}")
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
