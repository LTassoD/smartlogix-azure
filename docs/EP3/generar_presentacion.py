#!/usr/bin/env python3
"""
Genera la presentacion de la EP3 (maximo 15 diapositivas, fondo blanco, logo DUOC-UC).

Uso (desde la raiz del repositorio):
    python docs/EP3/generar_presentacion.py

Requiere: python-pptx  (pip install python-pptx)
Salida:   docs/EP3/Presentacion_EP3_SmartLogix.pptx
"""
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt
from lxml import etree

AQUI = Path(__file__).resolve().parent
LOGO = AQUI / "img" / "logo-duoc.jpg"
CAPTURA = AQUI / "img" / "analitica-en-vivo.jpg"
SALIDA = AQUI / "Presentacion_EP3_SmartLogix.pptx"

AZUL = RGBColor(0x0B, 0x25, 0x45)      # azul marino del logo
AMARILLO = RGBColor(0xF5, 0xB8, 0x2E)  # amarillo del logo
GRIS = RGBColor(0x4A, 0x55, 0x68)
GRIS_CLARO = RGBColor(0xF1, 0xF5, 0xF9)
BLANCO = RGBColor(0xFF, 0xFF, 0xFF)
VERDE = RGBColor(0x0F, 0x76, 0x6E)

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
EN_BLANCO = prs.slide_layouts[6]
TOTAL = 15


def nueva_diapositiva(numero, titulo=None):
    slide = prs.slides.add_slide(EN_BLANCO)
    fondo = slide.background.fill
    fondo.solid()
    fondo.fore_color.rgb = BLANCO
    if titulo:
        texto(slide, titulo, 0.6, 0.45, 10.5, 0.9, 30, AZUL, negrita=True)
        barra(slide, 0.6, 1.3, 1.6, 0.07, AMARILLO)
    slide.shapes.add_picture(str(LOGO), Inches(11.2), Inches(0.35), height=Inches(0.7))
    texto(slide, f"SmartLogix · EP3 · {numero}/{TOTAL}", 0.6, 7.0, 6, 0.3, 10, GRIS)
    return slide


def texto(slide, contenido, x, y, w, h, tam=18, color=GRIS, negrita=False,
          alineacion=PP_ALIGN.LEFT, ancho_linea=None):
    caja = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    marco = caja.text_frame
    marco.word_wrap = True
    marco.vertical_anchor = MSO_ANCHOR.TOP
    lineas = contenido if isinstance(contenido, list) else [contenido]
    for i, linea in enumerate(lineas):
        parrafo = marco.paragraphs[0] if i == 0 else marco.add_paragraph()
        parrafo.alignment = alineacion
        parrafo.space_after = Pt(6)
        ejecucion = parrafo.add_run()
        ejecucion.text = linea
        ejecucion.font.size = Pt(tam)
        ejecucion.font.bold = negrita
        ejecucion.font.color.rgb = color
    return caja


def vinetas(slide, items, x, y, w, h, tam=18):
    caja = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    marco = caja.text_frame
    marco.word_wrap = True
    for i, item in enumerate(items):
        parrafo = marco.paragraphs[0] if i == 0 else marco.add_paragraph()
        parrafo.space_after = Pt(10)
        marca = parrafo.add_run()
        marca.text = "▪  "
        marca.font.color.rgb = AMARILLO
        marca.font.size = Pt(tam)
        cuerpo = parrafo.add_run()
        cuerpo.text = item
        cuerpo.font.size = Pt(tam)
        cuerpo.font.color.rgb = GRIS
    return caja


def barra(slide, x, y, w, h, color):
    forma = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    forma.fill.solid()
    forma.fill.fore_color.rgb = color
    forma.line.fill.background()
    return forma


def caja(slide, x, y, w, h, titulo, detalle="", relleno=GRIS_CLARO, borde=AZUL):
    forma = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    forma.fill.solid()
    forma.fill.fore_color.rgb = relleno
    forma.line.color.rgb = borde
    forma.line.width = Pt(1.25)
    marco = forma.text_frame
    marco.word_wrap = True
    marco.vertical_anchor = MSO_ANCHOR.MIDDLE
    p1 = marco.paragraphs[0]
    p1.alignment = PP_ALIGN.CENTER
    r1 = p1.add_run()
    r1.text = titulo
    r1.font.size = Pt(14)
    r1.font.bold = True
    r1.font.color.rgb = AZUL
    if detalle:
        p2 = marco.add_paragraph()
        p2.alignment = PP_ALIGN.CENTER
        r2 = p2.add_run()
        r2.text = detalle
        r2.font.size = Pt(11)
        r2.font.color.rgb = GRIS
    return forma


def flecha(slide, x1, y1, x2, y2, etiqueta=""):
    conector = slide.shapes.add_connector(1, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    conector.line.color.rgb = AZUL
    conector.line.width = Pt(1.75)
    linea = conector.line._get_or_add_ln()
    fin = etree.SubElement(linea, qn("a:tailEnd"))
    fin.set("type", "triangle")
    if etiqueta:
        texto(slide, etiqueta, min(x1, x2) + 0.05, min(y1, y2) - 0.36, 2.6, 0.3, 10, VERDE, negrita=True)


def tabla(slide, filas, x, y, anchos, tam=13, alto_fila=0.45):
    forma = slide.shapes.add_table(len(filas), len(filas[0]), Inches(x), Inches(y),
                                   Inches(sum(anchos)), Inches(alto_fila * len(filas)))
    t = forma.table
    for j, ancho in enumerate(anchos):
        t.columns[j].width = Inches(ancho)
    for i, fila in enumerate(filas):
        for j, valor in enumerate(fila):
            celda = t.cell(i, j)
            celda.text = valor
            parrafo = celda.text_frame.paragraphs[0]
            parrafo.font.size = Pt(tam)
            parrafo.font.bold = i == 0
            parrafo.font.color.rgb = BLANCO if i == 0 else GRIS
            celda.fill.solid()
            celda.fill.fore_color.rgb = AZUL if i == 0 else (GRIS_CLARO if i % 2 == 0 else BLANCO)
    return forma


# 1. Portada ---------------------------------------------------------------
s = prs.slides.add_slide(EN_BLANCO)
s.background.fill.solid()
s.background.fill.fore_color.rgb = BLANCO
s.shapes.add_picture(str(LOGO), Inches(0.6), Inches(0.5), height=Inches(1.1))
barra(s, 0.6, 2.55, 2.2, 0.1, AMARILLO)
texto(s, "SmartLogix", 0.6, 2.8, 12, 1.0, 54, AZUL, negrita=True)
texto(s, "Streaming de datos con Apache Kafka: eventos de pedidos y métricas en tiempo real",
      0.6, 3.85, 11.5, 1.0, 24, GRIS)
texto(s, ["Evaluación de Portafolio 3 (EP3) · Desarrollo Cloud Native I",
          "Sección 003V · Entrega: miércoles 18 de noviembre de 2026"],
      0.6, 5.3, 11.5, 1.0, 16, GRIS)
texto(s, f"SmartLogix · EP3 · 1/{TOTAL}", 0.6, 7.0, 6, 0.3, 10, GRIS)

# 2. Integrantes -----------------------------------------------------------
s = nueva_diapositiva(2, "Integrantes del equipo")
tabla(s, [
    ["Nombre", "RUT"],
    ["Luis Tasso", "Por completar"],
    ["Mario Grateron", "Por completar"],
    ["Jonathan Ferrer", "Por completar"],
    ["Felipe Flores", "Por completar"],
], 0.6, 1.8, [5.5, 4.0], tam=18, alto_fila=0.6)
texto(s, "Cada integrante tiene tareas asignadas en el plan EP3 del repositorio (sección 7).",
      0.6, 5.2, 11.5, 0.5, 14, GRIS)

# 3. Descripcion y objetivos ----------------------------------------------
s = nueva_diapositiva(3, "Descripción del proyecto y objetivos")
texto(s, "SmartLogix es un sistema de gestión logística: inventario, pedidos, envíos, "
         "transportistas, bodegas y reportes, con autenticación JWT y 2FA.",
      0.6, 1.6, 11.8, 0.9, 18, GRIS)
texto(s, "Objetivos de la EP3", 0.6, 2.7, 6, 0.5, 18, AZUL, negrita=True)
vinetas(s, [
    "Incorporar streaming de datos con Apache Kafka en Docker (KRaft, un contenedor).",
    "Crear un topic asociado al caso: smartlogix.orders.events, con los pedidos confirmados.",
    "Desarrollar un productor y un consumidor que muestren el flujo continuo de eventos.",
    "Generar métricas en tiempo real: pedidos por minuto, ingreso, ticket promedio y top de productos.",
    "Integrar Kafka al sistema existente sin romper la mensajería de la EP2 (Azure Service Bus).",
], 0.6, 3.2, 12, 3.5, tam=17)

# 4. Sistema y modulos -----------------------------------------------------
s = nueva_diapositiva(4, "Sistema y módulos")
modulos = [
    ("Frontend React", "Interfaz web, nginx como proxy"),
    ("API Gateway", "Entrada única, JWT en /api/**"),
    ("identity-service", "Login, roles, 2FA TOTP"),
    ("inventory-service", "Productos, stock y bodegas"),
    ("order-service", "Pedidos y clientes (publica eventos)"),
    ("shipping-service", "Envíos y transportistas"),
    ("sb-admin-service", "Administración de Service Bus"),
    ("analytics-service", "Métricas en vivo desde Kafka (EP3)"),
]
for i, (nombre, desc) in enumerate(modulos):
    col, fila = i % 4, i // 4
    relleno = AMARILLO if nombre.startswith("analytics") else GRIS_CLARO
    caja(s, 0.6 + col * 3.1, 1.9 + fila * 2.4, 2.8, 1.9, nombre, desc, relleno=relleno)
texto(s, "Los servicios con datos tienen su propia base PostgreSQL. analytics-service no usa base de datos.",
      0.6, 6.8, 12, 0.3, 11, GRIS)

# 5. Arquitectura cloud propuesta -----------------------------------------
s = nueva_diapositiva(5, "Arquitectura cloud propuesta")
caja(s, 0.6, 2.4, 2.2, 1.2, "Usuario", "navegador", relleno=GRIS_CLARO)
caja(s, 3.4, 2.4, 2.4, 1.2, "Frontend + Gateway", "VM Azure · Docker Compose")
caja(s, 6.4, 1.7, 2.6, 1.2, "Microservicios", "identity · inventory · order · shipping")
caja(s, 6.4, 3.5, 2.6, 1.2, "analytics-service", "consumer group + SSE", relleno=AMARILLO)
caja(s, 9.8, 1.7, 2.9, 1.2, "Azure Service Bus", "topic + subscriptions (EP2)")
caja(s, 9.8, 3.5, 2.9, 1.2, "Kafka (Docker)", "smartlogix.orders.events")
caja(s, 3.4, 5.2, 2.4, 1.0, "Azure Container Registry", "imágenes :azure", relleno=GRIS_CLARO)
caja(s, 6.4, 5.2, 2.6, 1.0, "Log Analytics", "logs y alertas", relleno=GRIS_CLARO)
flecha(s, 2.8, 3.0, 3.4, 3.0)
flecha(s, 5.8, 2.8, 6.4, 2.5)
flecha(s, 9.0, 2.3, 9.8, 2.3, "pedido")
flecha(s, 9.0, 4.1, 9.8, 4.1, "order.created")
flecha(s, 6.4, 4.1, 5.8, 3.4)
texto(s, "Recursos: VM Standard D2s v4 (2 vCPU, 8 GB) · Azure Service Bus · ACR Basic · Log Analytics",
      0.6, 6.5, 12, 0.4, 12, GRIS)

# 6. Justificacion ----------------------------------------------------------
s = nueva_diapositiva(6, "Justificación de la arquitectura")
tabla(s, [
    ["Decisión", "Motivo"],
    ["Kafka en KRaft (sin Zookeeper)", "Un solo contenedor, ~1 GB de RAM; cabe en la VM de 8 GB"],
    ["Dual publish: Service Bus + Kafka", "La coreografía de la EP2 se mantiene; Kafka solo agrega analítica"],
    ["Key = orderNumber, 3 particiones", "Orden garantizado por pedido y escalado a 3 consumidores"],
    ["Consumer group propio", "analytics no interfiere con otros consumidores del topic"],
    ["Gateway con JWT en /api/**", "Una sola puerta de entrada y seguridad uniforme"],
    ["Imágenes en ACR, despliegue en VM", "Despliegue reproducible con Docker Compose"],
], 0.6, 1.8, [4.6, 7.4], tam=14, alto_fila=0.62)

# 7. APIs -------------------------------------------------------------------
s = nueva_diapositiva(7, "APIs: gateway y rutas")
tabla(s, [
    ["Ruta en el gateway", "Servicio", "Acceso"],
    ["/api/auth/**", "identity-service", "Login público; resto con JWT"],
    ["/api/users/**", "identity-service", "Solo ADMIN"],
    ["/api/inventory/**", "inventory-service", "GET con JWT; escritura por rol"],
    ["/api/orders/**", "order-service", "GET con JWT; creación por rol"],
    ["/api/shipping/**", "shipping-service", "GET con JWT; actualización por rol"],
    ["/api/analytics/**", "analytics-service (EP3)", "JWT (metrics y stream SSE)"],
], 0.6, 1.8, [4.0, 4.0, 4.0], tam=14, alto_fila=0.6)
texto(s, "Todas las rutas pasan por el gateway (puerto 8090 en desarrollo). Las respuestas siguen "
         "el formato { success, message, data }.",
      0.6, 6.2, 12, 0.6, 14, GRIS)

# 8. Flujo de APIs ----------------------------------------------------------
s = nueva_diapositiva(8, "Flujo de una API: crear pedido")
pasos = [
    ("1. Login", "POST /api/auth/login\nJWT firmado por identity"),
    ("2. Gateway", "Valida el JWT\nreenvía a order-service"),
    ("3. order-service", "Verifica stock por cola\nstock-check (request/reply)"),
    ("4. Confirmación", "Guarda el pedido en\nPostgreSQL (transacción)"),
    ("5. Eventos", "Publica order.created en\nService Bus y en Kafka"),
]
for i, (titulo, detalle) in enumerate(pasos):
    x = 0.6 + i * 2.5
    caja(s, x, 2.4, 2.1, 1.9, titulo, detalle)
    if i < len(pasos) - 1:
        flecha(s, x + 2.1, 3.35, x + 2.5, 3.35)
texto(s, "Si Service Bus o Kafka fallan, el pedido se confirma igual: el fallo solo se registra "
         "como advertencia.", 0.6, 4.9, 12, 0.5, 16, AZUL)
texto(s, "Ejemplo real: el frontend de pedidos y el de analítica usan el mismo gateway y el mismo token.",
      0.6, 5.5, 12, 0.5, 14, GRIS)

# 9. Mensajeria MQ ----------------------------------------------------------
s = nueva_diapositiva(9, "Flujos de mensajería (EP2): Azure Service Bus")
caja(s, 0.6, 2.4, 2.4, 1.3, "order-service", "publica eventos")
caja(s, 4.0, 2.4, 3.2, 1.3, "Topic", "smartlogix.orders.topic", relleno=AMARILLO)
caja(s, 8.2, 1.7, 4.4, 1.1, "inventory-sub", "filtro eventType = order.created")
caja(s, 8.2, 3.3, 4.4, 1.1, "shipping-created-sub", "crea el envío")
caja(s, 8.2, 4.9, 4.4, 1.1, "shipping-cancelled-sub", "filtro order.cancelled")
flecha(s, 3.0, 3.05, 4.0, 3.05)
flecha(s, 7.2, 2.6, 8.2, 2.3)
flecha(s, 7.2, 3.05, 8.2, 3.85)
flecha(s, 7.2, 3.5, 8.2, 5.45)
texto(s, "Request/reply de stock: order-service envía a la cola smartlogix.stock-check.req y "
         "recibe la respuesta en smartlogix.stock-check.reply (correlación por stockCheckId).",
      0.6, 5.8, 7.2, 0.9, 13, GRIS)
texto(s, "Cada suscripción tiene su DLQ nativa y reintentos con backoff.",
      0.6, 6.6, 7.2, 0.4, 13, GRIS)

# 10. Kafka -----------------------------------------------------------------
s = nueva_diapositiva(10, "Apache Kafka: tecnología y diseño del topic")
vinetas(s, [
    "Apache Kafka 3.9 en modo KRaft: un solo contenedor Docker, sin Zookeeper.",
    "Doble listener: localhost:9092 para scripts del host, kafka:29092 para los contenedores.",
    "Topic smartlogix.orders.events: 3 particiones, retención de 7 días, auto-creación desactivada.",
    "Key = orderNumber: todos los eventos de un pedido caen en la misma partición.",
    "Payload idéntico al DTO OrderCreatedEvent de order-service.",
], 0.6, 1.8, 6.4, 4.8, tam=16)
caja(s, 7.6, 2.0, 5.0, 1.2, "Productor", "producer_orders.py o order-service")
caja(s, 7.6, 3.6, 5.0, 1.2, "Topic (3 particiones)", "p0 · p1 · p2", relleno=AMARILLO)
caja(s, 7.6, 5.2, 5.0, 1.2, "Consumidores", "consumer_metrics.py · analytics-service")
flecha(s, 10.1, 3.2, 10.1, 3.6)
flecha(s, 10.1, 4.8, 10.1, 5.2)

# 11. Flujo Kafka + Docker -------------------------------------------------
s = nueva_diapositiva(11, "Flujo de Kafka integrado al sistema (Docker)")
caja(s, 0.6, 2.5, 2.3, 1.2, "order-service", "dual publish")
caja(s, 3.7, 2.5, 2.4, 1.2, "Kafka (Docker)", "smartlogix.orders.events", relleno=AMARILLO)
caja(s, 6.9, 2.5, 2.6, 1.2, "analytics-service", "grupo smartlogix-analytics")
caja(s, 10.3, 2.5, 2.4, 1.2, "Gateway", "/api/analytics/**")
caja(s, 10.3, 4.6, 2.4, 1.2, "Frontend", "página Analítica")
caja(s, 6.9, 4.6, 2.6, 1.2, "Métricas en vivo", "SSE cada 1 s")
flecha(s, 2.9, 3.1, 3.7, 3.1, "pedido")
flecha(s, 6.1, 3.1, 6.9, 3.1, "consume")
flecha(s, 9.5, 3.1, 10.3, 3.1)
flecha(s, 11.5, 3.7, 11.5, 4.6, "SSE + JWT")
flecha(s, 9.5, 5.2, 10.3, 5.2)
texto(s, "Métricas por ventana de 60 s: pedidos, ingreso, ticket promedio, top 5 productos, "
         "velocidad y distribución por partición.", 0.6, 6.2, 12, 0.5, 14, GRIS)

# 12. Metricas en tiempo real ----------------------------------------------
s = nueva_diapositiva(12, "Métricas en tiempo real")
vinetas(s, [
    "Pedidos en la ventana y velocidad (eventos por segundo).",
    "Ingreso y ticket promedio en CLP.",
    "Top 5 productos por unidades e ingreso.",
    "Eventos por partición de Kafka.",
    "Estado de conexión: en vivo, reconectando o conectando.",
], 0.6, 1.8, 4.6, 4.8, tam=16)
s.shapes.add_picture(str(CAPTURA), Inches(5.4), Inches(1.8), width=Inches(7.3))
texto(s, "Captura de la página Analítica con datos en vivo (desarrollo local).", 5.4, 6.25, 7.3, 0.4, 11, GRIS)

# 13. Verificacion ----------------------------------------------------------
s = nueva_diapositiva(13, "Verificación de la solución")
tabla(s, [
    ["Prueba", "Resultado"],
    ["Pruebas de analytics-service (agregador, parser)", "9 de 9 en verde"],
    ["Pruebas de order-service (incluye Kafka real)", "8 de 8 en verde"],
    ["Pruebas del frontend (incluye stream SSE y página)", "36 de 36 en verde"],
    ["Flujo Kafka: 30 pedidos → métricas por el gateway", "Pedidos, ingreso y ticket correctos"],
    ["SSE a través de nginx con JWT", "Eventos sin buffer; 401 sin token"],
    ["Stack en Docker (7 servicios + Kafka)", "Login OK; analítica en vivo"],
], 0.6, 1.8, [7.2, 4.8], tam=14, alto_fila=0.6)
texto(s, "Pendiente: despliegue de la misma solución en la VM de Azure (Fase 3).",
      0.6, 6.2, 12, 0.5, 14, AZUL)

# 14. Trabajo en equipo y repositorio --------------------------------------
s = nueva_diapositiva(14, "Trabajo en equipo y código fuente")
vinetas(s, [
    "Plan EP3 por fases con IDs de tarea (T0.x a T3.x) y responsables por tarea.",
    "Convención de commits: tipo(alcance): T<fase>.<n> descripción.",
    "Cada tarea se integra con Pull Request revisado por otro integrante (sin squash).",
    "Repositorio: https://github.com/LTassoD/smartlogix-azure/tree/azure-servicebus",
], 0.6, 1.8, 12, 3.0, tam=17)
texto(s, "Guía de contribución: CONTRIBUTING.md · Plan: docs/EP3_PLAN_FASES.md",
      0.6, 5.2, 12, 0.5, 14, GRIS)

# 15. Conclusiones y video --------------------------------------------------
s = nueva_diapositiva(15, "Conclusiones y video de evidencia")
vinetas(s, [
    "Kafka se integra al sistema existente sin reemplazar la mensajería de la EP2.",
    "El flujo de pedidos llega a métricas en vivo en el dashboard, en segundos.",
    "Docker permite levantar la solución completa (y Kafka) con un solo comando.",
    "Próximo paso: desplegar en la VM de Azure y grabar el video de evidencia (≤ 5 min).",
], 0.6, 1.8, 12, 3.0, tam=17)
texto(s, "Video de evidencia (front y back, MVP): [enlace por completar]", 0.6, 5.2, 12, 0.5, 16, AZUL, negrita=True)
texto(s, "Gracias", 0.6, 6.2, 12, 0.6, 22, AZUL, negrita=True)

assert len(prs.slides) == TOTAL, f"Se esperaban {TOTAL} diapositivas y hay {len(prs.slides)}"
prs.save(SALIDA)
print(f"Presentacion generada: {SALIDA} ({len(prs.slides)} diapositivas)")
