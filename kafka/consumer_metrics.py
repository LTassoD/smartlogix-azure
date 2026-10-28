#!/usr/bin/env python3
"""
Consumidor con metricas en tiempo real para la EP3 - SmartLogix.

Consume el topic de pedidos y calcula, sobre una ventana deslizante:

  - eventos totales y velocidad (eventos/s, ultimos 10 s)
  - pedidos por minuto (ventana configurable, por defecto 60 s)
  - ingreso acumulado y ticket promedio
  - top 5 productos por unidades e ingreso
  - distribucion por particion y lag del consumidor
  - ultimos eventos recibidos (la "cinta" del flujo continuo)

Uso:
    python kafka/consumer_metrics.py
    python kafka/consumer_metrics.py --window 30        # ventana de 30 s
    python kafka/consumer_metrics.py --plain            # sin redibujado (para logs/video)
    python kafka/consumer_metrics.py --group ep3-metrics-2
"""
from __future__ import annotations

import argparse
import json
import os
import signal
import sys
import time
from collections import Counter, deque
from datetime import datetime

from confluent_kafka import Consumer, KafkaError, TopicPartition

TOPIC = "smartlogix.orders.events"
ANCHO = 74


def habilitar_ansi() -> bool:
    """Activa secuencias ANSI en la consola de Windows (10+)."""
    if os.name != "nt":
        return True
    try:
        import ctypes

        kernel32 = ctypes.windll.kernel32
        handle = kernel32.GetStdHandle(-11)
        modo = ctypes.c_uint32()
        if not kernel32.GetConsoleMode(handle, ctypes.byref(modo)):
            return False
        # ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004
        return bool(kernel32.SetConsoleMode(handle, modo.value | 0x0004))
    except Exception:
        return False


def clp(valor: float) -> str:
    """Formato de moneda chilena: $1.284.500"""
    return "$" + f"{valor:,.0f}".replace(",", ".")


def num(valor: int) -> str:
    return f"{valor:,}".replace(",", ".")


def dec(valor: float) -> str:
    return f"{valor:.1f}".replace(".", ",")


class Metricas:
    def __init__(self, ventana_s: int) -> None:
        self.ventana_s = ventana_s
        self.total = 0
        self.ingreso = 0.0
        self.pedidos_ventana: deque[float] = deque()
        self.marcas_10s: deque[float] = deque()
        self.unidades: Counter[str] = Counter()
        self.ingreso_producto: Counter[str] = Counter()
        self.particiones: Counter[int] = Counter()
        self.ultimos: deque[tuple[float, str, int, float, int]] = deque(maxlen=5)
        self.ultimo_mensaje = 0.0

    def agregar(self, msg) -> None:
        ahora = time.time()
        try:
            datos = json.loads(msg.value().decode())
        except Exception:
            return

        monto = float(datos.get("totalAmount") or 0)
        items = datos.get("items") or []

        self.total += 1
        self.ingreso += monto
        self.pedidos_ventana.append(ahora)
        self.marcas_10s.append(ahora)
        self.particiones[msg.partition()] += 1
        self.ultimo_mensaje = ahora
        for item in items:
            nombre = item.get("productName") or item.get("sku") or "?"
            cantidad = int(item.get("quantity") or 0)
            self.unidades[nombre] += cantidad
            self.ingreso_producto[nombre] += cantidad * float(item.get("unitPrice") or 0)

        self.ultimos.append(
            (ahora, str(datos.get("orderNumber")), msg.partition(), monto, len(items))
        )

    def limpiar_ventanas(self) -> None:
        ahora = time.time()
        while self.pedidos_ventana and ahora - self.pedidos_ventana[0] > self.ventana_s:
            self.pedidos_ventana.popleft()
        while self.marcas_10s and ahora - self.marcas_10s[0] > 10:
            self.marcas_10s.popleft()

    def velocidad(self) -> float:
        return len(self.marcas_10s) / 10.0


def calcular_lag(consumidor: Consumer) -> int:
    """Suma de mensajes pendientes en las particiones asignadas.

    confluent-kafka 2.x: `position()` recibe y devuelve LISTAS; un offset
    negativo (INVALID) significa que el grupo aun no resolvio su posicion
    (tipico de los primeros segundos con auto.offset.reset=latest), en ese
    caso el lag es desconocido y se reporta como -1.
    """
    tps = [TopicPartition(tp.topic, tp.partition) for tp in consumidor.assignment()]
    if not tps:
        return -1
    try:
        posiciones = consumidor.position(tps)
        lag = 0
        for tp, pos in zip(tps, posiciones):
            if pos.offset is None or pos.offset < 0:
                return -1
            _, alto = consumidor.get_watermark_offsets(tp, timeout=1.0)
            if alto is None:
                return -1
            lag += max(alto - pos.offset, 0)
        return lag
    except Exception:
        return -1


def dibujar(m: Metricas, consumidor: Consumer, topic: str, grupo: str, lag: int, inicio: float) -> str:
    m.limpiar_ventanas()
    ahora = time.time()
    lineas: list[str] = []
    sep = "+" + "-" * ANCHO + "+"

    def fila(texto: str = "") -> str:
        return "| " + texto.ljust(ANCHO - 1) + "|"

    lineas.append(sep)
    lineas.append(fila(f"SmartLogix - Kafka en tiempo real   [{topic}]"))
    lineas.append(sep)

    ticket = (m.ingreso / m.total) if m.total else 0.0
    lineas.append(fila(f"Eventos        {num(m.total):>10}    Velocidad   {dec(m.velocidad()):>7} /s"))
    lineas.append(
        fila(
            f"Pedidos/{m.ventana_s:<3}s   {num(len(m.pedidos_ventana)):>10}    Lag         "
            f"{(num(lag) if lag >= 0 else '?'):>7}"
        )
    )
    lineas.append(fila(f"Ingreso   {clp(m.ingreso):>14}    Ticket prom {clp(ticket):>12}"))
    lineas.append(fila(f"Grupo: {grupo}    Activo hace {int(ahora - inicio)} s"))
    lineas.append(sep)
    lineas.append(fila("TOP 5 PRODUCTOS (unidades)"))
    if m.unidades:
        for i, (nombre, unidades) in enumerate(m.unidades.most_common(5), 1):
            dinero = clp(m.ingreso_producto[nombre])
            lineas.append(fila(f" {i}. {nombre[:32]:<32} {num(unidades):>5} u  {dinero:>13}"))
    else:
        lineas.append(fila("  (esperando eventos...)"))
    lineas.append(sep)
    lineas.append(fila("ULTIMOS EVENTOS"))
    if m.ultimos:
        for ts, pedido, particion, monto, items in list(m.ultimos)[::-1]:
            hora = datetime.fromtimestamp(ts).strftime("%H:%M:%S")
            lineas.append(fila(f" {hora}  {pedido:<22} p{particion}  {clp(monto):>12}  {items} item(s)"))
    else:
        lineas.append(fila("  (sin eventos todavia)"))
    lineas.append(sep)
    return "\n".join(lineas)


def main() -> int:
    parser = argparse.ArgumentParser(description="Consumidor con metricas en tiempo real")
    parser.add_argument("--bootstrap", default="localhost:9092")
    parser.add_argument("--topic", default=TOPIC)
    parser.add_argument("--group", default="ep3-metrics")
    parser.add_argument("--window", type=int, default=60, help="ventana en segundos")
    parser.add_argument("--plain", action="store_true", help="sin redibujado ANSI")
    parser.add_argument(
        "--solo-nuevos",
        action="store_true",
        help="ignorar el historico del topic (auto.offset.reset=latest)",
    )
    args = parser.parse_args()

    ansi_ok = habilitar_ansi() and not args.plain
    consumidor = Consumer(
        {
            "bootstrap.servers": args.bootstrap,
            "group.id": args.group,
            # earliest: en un grupo nuevo consume todo el historico del topic
            # (bueno para la demo); si el grupo ya tiene offsets, reanuda desde ahi.
            "auto.offset.reset": "latest" if args.solo_nuevos else "earliest",
            "enable.auto.commit": True,
            "client.id": "smartlogix-analytics",
        }
    )

    detener = False

    def _parar(*_):
        nonlocal detener
        detener = True

    signal.signal(signal.SIGINT, _parar)

    consumidor.subscribe([args.topic], on_assign=lambda c, ps: print(f"  asignado: {[p.partition for p in ps]}", flush=True))
    metricas = Metricas(args.window)
    inicio = time.time()
    ultimo_dibujo = 0.0
    lag = -1

    if not ansi_ok:
        print(f"Consumidor -> {args.bootstrap} / {args.topic} (grupo {args.group})")
        print("Modo texto: una linea por segundo. Ctrl+C para detener.\n", flush=True)

    while not detener:
        msg = consumidor.poll(0.2)
        if msg is not None:
            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    print(f"  [!] {msg.error()}", flush=True)
                continue
            metricas.agregar(msg)

        ahora = time.time()
        if ahora - ultimo_dibujo >= 1.0:
            ultimo_dibujo = ahora
            lag = calcular_lag(consumidor) if metricas.total else -1
            if ansi_ok:
                frame = dibujar(metricas, consumidor, args.topic, args.group, lag, inicio)
                sys.stdout.write("\x1b[2J\x1b[H" + frame + "\n")
                sys.stdout.flush()
            else:
                metricas.limpiar_ventanas()
                print(
                    f"[{datetime.now():%H:%M:%S}] eventos={metricas.total} "
                    f"vel={dec(metricas.velocidad())}/s "
                    f"pedidos/{args.window}s={len(metricas.pedidos_ventana)} "
                    f"ingreso={clp(metricas.ingreso)} lag={lag if lag >= 0 else '?'}",
                    flush=True,
                )

    consumidor.close()
    print(
        f"\nCierre: {metricas.total} eventos, ingreso {clp(metricas.ingreso)}, "
        f"ticket promedio {clp(metricas.ingreso / metricas.total if metricas.total else 0)}."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
