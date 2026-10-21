"""
DEMO EP2 - Mensaje huerfano: el filtrado del topic en accion.

Publica en smartlogix.orders.topic dos mensajes que NO matchean ninguna regla:
  1) uno con eventType="order.inventado"  (property con valor desconocido)
  2) uno SIN property eventType            (property ausente)

Las 3 subscriptions del topic tienen una unica regla SqlFilter explicita
(order.created / order.cancelled) y NO tienen regla $Default, por lo que
ningun mensaje huerfano es entregado a ninguna subscription.

Punto pedagogico (trampa tipica de examen):
  - El mensaje NO va a la DLQ. Se DESCARTA en el topic (no hay a quien entregarlo).
  - deadLetteringOnFilterEvaluationExceptions=True NO significa "lo que no matchea
    va a DLQ": esa opcion solo aplica cuando la EXPRESION de filtrolanza excepcion
    (p.ej. filtro mal formado), no cuando simplemente no coincide.
  - El publisher NO recibe error: el fallo es silencioso -> perdida de mensajes.

Uso:
  export SB_CONN="Endpoint=sb://...;SharedAccessKeyName=smartlogix-admin;SharedAccessKey=..."
  python demo_evento_huerfano.py
"""

import json
import os
import time

from azure.servicebus import ServiceBusClient, ServiceBusMessage
from azure.servicebus.management import ServiceBusAdministrationClient

CONN = os.environ["SB_CONN"]
TOPIC = "smartlogix.orders.topic"
SUBS = ("inventory-sub", "shipping-created-sub", "shipping-cancelled-sub")


def estado(admin, titulo):
    print(f"\n{titulo}")
    for sub in SUBS:
        p = admin.get_subscription_runtime_properties(topic_name=TOPIC, subscription_name=sub)
        print(
            f"  {sub:22} activos={p.active_message_count:>3}"
            f"  dead-letter={p.dead_letter_message_count:>3}"
            f"  entregadas={p.total_message_count:>3}"
        )


def main():
    admin = ServiceBusAdministrationClient.from_connection_string(CONN)
    estado(admin, "== ANTES ==")

    with ServiceBusClient.from_connection_string(CONN) as client:
        with client.get_topic_sender(topic_name=TOPIC) as sender:
            sender.send_messages(
                ServiceBusMessage(
                    json.dumps({"orderId": 1, "orderNumber": "Huerfano-1"}),
                    application_properties={"eventType": "order.inventado"},
                )
            )
            print("enviado mensaje con eventType='order.inventado' (no matchea ninguna regla)")

            sender.send_messages(
                ServiceBusMessage(json.dumps({"orderId": 2, "orderNumber": "Huerfano-2"}))
            )
            print("enviado mensaje SIN property eventType (no matchea ninguna regla)")

    print("\nesperando 15 s a que el broker evalue las reglas...")
    time.sleep(15)

    estado(admin, "== DESPUES ==")
    print(
        "\nCONCLUSION: las 3 subscriptions siguen en 0 activos y 0 en dead-letter.\n"
        "El mensaje huerfano no se entrego (no matchea ninguna regla) y NO esta en la DLQ:\n"
        "se descarto en el topic. El publisher no recibe ningun error -> perdida silenciosa."
    )


if __name__ == "__main__":
    main()
