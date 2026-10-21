"""Demo de DLQ de Azure Service Bus por VENCIMIENTO DE TTL (retencion con red de seguridad).

Flujo reproducible en vivo:
  1. Crea la suscripcion "demo-dlq-sub" (TTL 20 s, deadLetteringOnMessageExpiration=true)
     con una unica regla SqlFilter: eventType = 'order.created'. NO tiene consumidor.
  2. Publica un evento order.created valido en smartlogix.orders.topic.
  3. Espera a que venza el TTL: el broker lo mueve a la DLQ nativa de la suscripcion.
  4. Muestra el mensaje dead-lettereado (DeadLetterReason / DeadLetterErrorDescription / body).

Ventaja frente al mensaje "venenoso": la DLQ NO se drena (no hay DeadLetterConsumer sobre
esa suscripcion), asi que el mensaje queda VISIBLE en el Explorador del portal y en el
contador DeadletteredMessages, que es lo que dispara la alerta alert-sb-deadletter.

Uso:
  export SB_CONN="...smartlogix-admin..."
  python demo_dlq_ttl.py            # demo completa
  python demo_dlq_ttl.py --limpiar  # borra la suscripcion de demo
"""
import argparse
import json
import os
import time
from datetime import timedelta

from azure.servicebus import ServiceBusClient, ServiceBusMessage, ServiceBusSubQueue
from azure.servicebus.management import ServiceBusAdministrationClient

CONN = os.environ["SB_CONN"]
TOPIC = "smartlogix.orders.topic"
SUB = "demo-dlq-sub"
TTL_SEGUNDOS = 20
FILTRO = "eventType = 'order.created'"

EVENTO = {
    "orderId": 999,
    "orderNumber": "ORD-DEMO-DLQ",
    "customerId": 1,
    "totalAmount": 650000.0,
    "items": [{
        "productId": 1, "warehouseId": 1, "sku": "SKU-001",
        "productName": "Notebook Lenovo", "quantity": 1, "unitPrice": 650000.0,
    }],
    "createdAt": "2026-10-21T20:07:00Z",
}


def _crear_suscripcion(admin):
    # siempre desde cero: la DLQ debe mostrar SOLO el mensaje de esta demo
    try:
        admin.delete_subscription(topic_name=TOPIC, subscription_name=SUB)
        print(f"suscripcion {SUB} anterior eliminada (demo limpia)")
    except Exception as exc:  # noqa: BLE001
        print(f"(no habia suscripcion {SUB} previa)")
    admin.create_subscription(
        topic_name=TOPIC,
        subscription_name=SUB,
        default_message_time_to_live=timedelta(seconds=TTL_SEGUNDOS),
        dead_lettering_on_message_expiration=True,
        dead_lettering_on_filter_evaluation_exceptions=True,
        max_delivery_count=3,
    )
    print(f"suscripcion {SUB} creada (TTL {TTL_SEGUNDOS}s, dead-letter al expirar)")


def _crear_regla(admin):
    from azure.servicebus.management import SqlRuleFilter
    for regla in admin.list_rules(topic_name=TOPIC, subscription_name=SUB):
        if regla.name == "$Default":
            admin.delete_rule(topic_name=TOPIC, subscription_name=SUB, rule_name="$Default")
            print("regla $Default eliminada (para que solo matchee el filtro explicito)")
    try:
        admin.create_rule(topic_name=TOPIC, subscription_name=SUB, rule_name="f",
                          filter=SqlRuleFilter(sql_expression=FILTRO))
        print(f"regla 'f' creada: {FILTRO}")
    except Exception as exc:  # noqa: BLE001
        print(f"(regla 'f' ya existia: {str(exc)[:60]})")


def _limpiar(admin):
    try:
        admin.delete_subscription(topic_name=TOPIC, subscription_name=SUB)
        print(f"suscripcion {SUB} eliminada")
    except Exception as exc:  # noqa: BLE001
        print(f"no se pudo eliminar {SUB}: {str(exc)[:80]}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limpiar", action="store_true")
    args = parser.parse_args()

    admin = ServiceBusAdministrationClient.from_connection_string(CONN)
    if args.limpiar:
        _limpiar(admin)
        return

    _crear_suscripcion(admin)
    _crear_regla(admin)

    with ServiceBusClient.from_connection_string(CONN) as client:
        with client.get_topic_sender(topic_name=TOPIC) as sender:
            sender.send_messages(ServiceBusMessage(
                json.dumps(EVENTO),
                application_properties={"eventType": "order.created",
                                        "orderNumber": EVENTO["orderNumber"]}))
        print(f"evento order.created publicado en {TOPIC} (nadie consume {SUB})")

        print(f"esperando el vencimiento del TTL ({TTL_SEGUNDOS}s)...")
        for i in range(12):
            time.sleep(5)
            props = admin.get_subscription_runtime_properties(
                topic_name=TOPIC, subscription_name=SUB)
            print(f"  t+{(i + 1) * 5:3}s  activos={props.active_message_count}  "
                  f"dead-letter={props.dead_letter_message_count}")
            if props.dead_letter_message_count > 0:
                break

        print("\n== CONTENIDO DE LA DLQ (dead-letter) ==")
        with client.get_subscription_receiver(
                topic_name=TOPIC, subscription_name=SUB,
                sub_queue=ServiceBusSubQueue.DEAD_LETTER) as receptor:
            mensajes = receptor.peek_messages(max_message_count=5)
        for m in mensajes:
            body = m.body
            if not isinstance(body, (bytes, bytearray)):
                body = b"".join(body)
            print(f"  DeadLetterReason           : {m.dead_letter_reason}")
            print(f"  DeadLetterErrorDescription : {m.dead_letter_error_description}")
            print(f"  body                       : {body.decode('utf-8', 'replace')[:180]}")
        print("\n>> El mensaje sigue en la DLQ: se ve en el portal > Explorador > Dead letter")
        print(">> y el contador DeadletteredMessages = 1 dispara la alerta alert-sb-deadletter")


if __name__ == "__main__":
    main()
