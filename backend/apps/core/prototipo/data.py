"""Inventario de datos del prototipo (Portal + Campo). No inventar filas distintas."""

from datetime import date, datetime
from zoneinfo import ZoneInfo

BOGOTA = ZoneInfo("America/Bogota")
FROZEN_AT = datetime(2026, 10, 29, 11, 2, 0, tzinfo=BOGOTA)
DAY = 29
DAYS = 31

PROTO_ZONES = [
    {"id": "ori", "code": "ORIENTE", "name": "Oriente antioqueño", "tol": 1000, "leader": "Paula Zuluaga", "mun": 23, "deps": ["ANT"]},
    {"id": "eje", "code": "EJE", "name": "Eje Cafetero", "tol": 1000, "leader": "Paula Zuluaga", "mun": 31, "deps": ["CAL", "RIS", "QUI"]},
    {"id": "val", "code": "VALLE", "name": "Valle del Cauca", "tol": 1500, "leader": "Hernán Lozano", "mun": 18, "deps": ["VAL"]},
    {"id": "cun", "code": "CUNDINAMARCA", "name": "Cundinamarca y Boyacá", "tol": 1000, "leader": "Hernán Lozano", "mun": 27, "deps": ["CUN", "BOY"]},
    {"id": "san", "code": "SANTANDER", "name": "Santanderes", "tol": 2000, "leader": "Hernán Lozano", "mun": 22, "deps": ["SAN", "NSA"]},
    {"id": "tol", "code": "TOLIMA", "name": "Tolima y Huila", "tol": 2000, "leader": "Hernán Lozano", "mun": 19, "deps": ["TOL", "HUI"]},
]

# RAW RTC del Portal (líneas 1245-1256)
PROTO_RTCS = [
    {"id": "ep", "name": "Esteban Posada", "z": "ori", "sales": 36.9e6, "budget": 35e6, "visits": 66, "vt": 60, "erp": "V-0091", "email": "esteban.posada@naturalcontrol.test", "verif": 98, "disc": 0, "nuevos": 6, "pot": 47.5e6, "conc": 28.3e6, "cob": 93, "eff": 63, "stale": 3, "sync_min": 1, "a": [97, 90, 91, 92, 96, 84], "gen": 92, "form": "up", "chg": 0},
    {"id": "cr", "name": "Camilo Restrepo", "z": "ori", "sales": 31.2e6, "budget": 34e6, "visits": 61, "vt": 60, "erp": "V-0112", "email": "rtc@naturalcontrol.test", "verif": 97, "disc": 0, "nuevos": 5, "pot": 41.2e6, "conc": 24.1e6, "cob": 91, "eff": 58, "stale": 4, "sync_min": 2, "a": [90, 86, 88, 90, 95, 79], "gen": 88, "form": "up", "chg": 1},
    {"id": "jh", "name": "Julián Henao", "z": "ori", "sales": 28.8e6, "budget": 32e6, "visits": 59, "vt": 60, "erp": "V-0123", "email": "julian.henao@naturalcontrol.test", "verif": 93, "disc": 1, "nuevos": 3, "pot": 33.0e6, "conc": 18.2e6, "cob": 86, "eff": 51, "stale": 6, "sync_min": 6, "a": [86, 84, 86, 87, 90, 80], "gen": 85, "form": "up", "chg": 2},
    {"id": "vc", "name": "Valentina Cano", "z": "ori", "sales": 21.5e6, "budget": 30e6, "visits": 52, "vt": 60, "erp": "V-0127", "email": "valentina.cano@naturalcontrol.test", "verif": 89, "disc": 2, "nuevos": 2, "pot": 24.3e6, "conc": 12.0e6, "cob": 76, "eff": 42, "stale": 12, "sync_min": 20, "a": [74, 70, 80, 76, 84, 63], "gen": 74, "form": "flat", "chg": -1},
    {"id": "so", "name": "Santiago Mejía", "z": "ori", "sales": 18.4e6, "budget": 30e6, "visits": 38, "vt": 60, "erp": "V-0118", "email": "santiago.mejia@naturalcontrol.test", "verif": 81, "disc": 4, "nuevos": 1, "pot": 22.7e6, "conc": 9.6e6, "cob": 62, "eff": 34, "stale": 21, "sync_min": 60, "a": [66, 58, 64, 55, 61, 66], "gen": 63, "form": "down", "chg": -2},
    {"id": "no", "name": "Natalia Osorio", "z": "eje", "sales": 27.9e6, "budget": 30e6, "visits": 57, "vt": 60, "erp": "V-0104", "email": "natalia.osorio@naturalcontrol.test", "verif": 94, "disc": 1, "nuevos": 3, "pot": 36.4e6, "conc": 19.8e6, "cob": 87, "eff": 52, "stale": 6, "sync_min": 5, "a": [87, 82, 85, 86, 91, 70], "gen": 84, "form": "flat", "chg": 0},
    {"id": "dv", "name": "Daniela Vargas", "z": "eje", "sales": 22.6e6, "budget": 28e6, "visits": 49, "vt": 60, "erp": "V-0121", "email": "daniela.vargas@naturalcontrol.test", "verif": 90, "disc": 2, "nuevos": 2, "pot": 28.1e6, "conc": 13.2e6, "cob": 78, "eff": 45, "stale": 11, "sync_min": 12, "a": [78, 75, 74, 77, 86, 72], "gen": 76, "form": "up", "chg": 3},
    {"id": "ag", "name": "Andrés Gómez", "z": "val", "sales": 35.1e6, "budget": 36e6, "visits": 54, "vt": 60, "erp": "V-0097", "email": "andres.gomez@naturalcontrol.test", "verif": 92, "disc": 1, "nuevos": 4, "pot": 52.6e6, "conc": 30.4e6, "cob": 84, "eff": 61, "stale": 7, "sync_min": 8, "a": [95, 93, 82, 85, 89, 88], "gen": 90, "form": "up", "chg": 1},
    {"id": "jr", "name": "Juliana Ríos", "z": "cun", "sales": 20.3e6, "budget": 32e6, "visits": 44, "vt": 60, "erp": "V-0109", "email": "juliana.rios@naturalcontrol.test", "verif": 88, "disc": 3, "nuevos": 2, "pot": 25.9e6, "conc": 11.7e6, "cob": 69, "eff": 40, "stale": 17, "sync_min": 25, "a": [68, 64, 70, 62, 78, 71], "gen": 68, "form": "flat", "chg": -1},
    {"id": "fc", "name": "Felipe Cárdenas", "z": "san", "sales": 25.7e6, "budget": 30e6, "visits": 58, "vt": 60, "erp": "V-0115", "email": "felipe.cardenas@naturalcontrol.test", "verif": 95, "disc": 0, "nuevos": 3, "pot": 30.8e6, "conc": 15.9e6, "cob": 88, "eff": 47, "stale": 5, "sync_min": 4, "a": [83, 74, 87, 87, 93, 68], "gen": 80, "form": "down", "chg": -1},
    {"id": "ml", "name": "Mariana López", "z": "tol", "sales": 9.8e6, "budget": 26e6, "visits": 6, "vt": 60, "erp": "V-0130", "email": "mariana.lopez@naturalcontrol.test", "verif": 100, "disc": 0, "nuevos": 2, "pot": 14.2e6, "conc": 4.1e6, "cob": 31, "eff": 50, "stale": 28, "sync_min": 1080, "a": None, "gen": None, "form": "flat", "chg": 0},
]

# Insignias del mes del prototipo (código, título, id RTC, motivo).
PROTO_BADGES = [
    ("GOLEADOR", "Goleador", "ep", "Más ventas del mes"),
    ("MVP", "MVP", "ep", "Mayor GEN · 92"),
    ("MEJORA", "Mejora del mes", "dv", "Subió 6 puntos de GEN"),
    ("MURO", "Muro", "ml", "100 % de visitas verificadas"),
    ("RACHA", "Racha", "vc", "4 semanas con la programación a tiempo"),
]

PROTO_STAFF = [
    {"email": "lider@naturalcontrol.test", "role": "LIDER_ZONA", "name": "Paula Zuluaga", "zones": ["ori", "eje"]},
    {"email": "lider.valle@naturalcontrol.test", "role": "LIDER_ZONA", "name": "Hernán Lozano", "zones": ["val", "cun", "san", "tol"]},
    {"email": "gerencia@naturalcontrol.test", "role": "GERENCIA", "name": "Laura Gaviria", "zones": []},
    {"email": "admin@naturalcontrol.test", "role": "ADMIN", "name": "Jorge Arango", "zones": []},
]

# CLIENTS Portal (c1-c12) + extras Campo (c6-c8 Campo = viveros etc.)
PROTO_CLIENTS = [
    {"id": "c1", "name": "Finca La Esperanza", "owner": "Juan Carlos Henao", "doc": ("CC", "70123456"), "tipo": "Productor", "seg": "A", "estado": "ACTIVO", "mun": "Rionegro", "rtc": "cr", "ha": 18, "phone": "3104822110", "crops": [("Aguacate Hass", 12), ("Fresa", 6)], "bio": [("Trichobiol WP", True), ("Bacillus subtilis genérico", False)]},
    {"id": "c2", "name": "Agrícola San José SAS", "owner": "Luz Marina Giraldo", "doc": ("NIT", "900412338"), "tipo": "Productor", "seg": "A", "estado": "ACTIVO", "mun": "Marinilla", "rtc": "cr", "ha": 64, "phone": "3104822111", "crops": [("Tomate de invernadero", 22), ("Pimentón", 14), ("Uchuva", 28)], "bio": [("Beauvebiol", True), ("Trichobiol WP", True)]},
    {"id": "c3", "name": "Hortalizas El Retiro", "owner": "Gustavo Ochoa", "doc": ("CC", "15441902"), "tipo": "Productor", "seg": "B", "estado": "ACTIVO", "mun": "El Retiro", "rtc": "cr", "ha": 9.5, "phone": "3104822113", "crops": [("Lechuga", 5), ("Cilantro", 4.5)], "bio": [("Extracto de neem", False)]},
    {"id": "c4", "name": "Almacén Agropecuario El Campesino", "owner": "Rubén Darío Arias", "doc": ("NIT", "811023775"), "tipo": "Distribuidor", "seg": "A", "estado": "ACTIVO", "mun": "Rionegro", "rtc": "cr", "ha": 0, "phone": "3104822114", "crops": [], "bio": [("Trichobiol WP", True), ("Metabiol", True)]},
    {"id": "c5", "name": "Flores del Oriente SAS", "owner": "Catalina Murillo", "doc": ("NIT", "901556210"), "tipo": "Productor", "seg": "A", "estado": "PROSPECTO", "mun": "El Carmen de Viboral", "rtc": "cr", "ha": 32, "phone": "3104822115", "crops": [("Crisantemo", 20), ("Hortensia", 12)], "bio": [("Beauveria genérica", False)], "nuevo": True},
    {"id": "c6", "name": "Hacienda El Roble", "owner": "Álvaro Zapata", "doc": ("CC", "8302114"), "tipo": "Productor", "seg": "B", "estado": "ACTIVO", "mun": "La Ceja", "rtc": "so", "ha": 26, "phone": "3104822116", "crops": [("Aguacate Hass", 26)], "bio": []},
    {"id": "c7", "name": "Aguacates Tierra Fría SAS", "owner": "Mónica Duque", "doc": ("NIT", "900884031"), "tipo": "Productor", "seg": "A", "estado": "ACTIVO", "mun": "Sonsón", "rtc": "so", "ha": 48, "phone": "3104822117", "crops": [("Aguacate Hass", 48)], "bio": [("Trichobiol WP", True)]},
    {"id": "c8", "name": "Cafetal Los Alpes", "owner": "Hernando Cardona", "doc": ("CC", "10234771"), "tipo": "Productor", "seg": "B", "estado": "ACTIVO", "mun": "Chinchiná", "rtc": "no", "ha": 15, "phone": "3104822118", "crops": [("Café", 15)], "bio": [("Beauveria genérica", False)]},
    {"id": "c9", "name": "Plátanos del Quindío SAS", "owner": "Sandra Patiño", "doc": ("NIT", "900317640"), "tipo": "Productor", "seg": "B", "estado": "ACTIVO", "mun": "Montenegro", "rtc": "dv", "ha": 40, "phone": "3104822119", "crops": [("Plátano", 40)], "bio": []},
    {"id": "c10", "name": "Ingenio La Cabaña SAS", "owner": "Jaime Escobar", "doc": ("NIT", "890301722"), "tipo": "Agroindustria", "seg": "A", "estado": "ACTIVO", "mun": "Candelaria", "rtc": "ag", "ha": 1250, "phone": "3104822120", "crops": [("Caña de azúcar", 1250)], "bio": [("Metabiol", True), ("Trichobiol WP", True)]},
    {"id": "c11", "name": "Flores de la Sabana SAS", "owner": "Ana María Rojas", "doc": ("NIT", "830114902"), "tipo": "Productor", "seg": "A", "estado": "ACTIVO", "mun": "Facatativá", "rtc": "jr", "ha": 22, "phone": "3104822121", "crops": [("Rosa", 22)], "bio": [("Bacillus subtilis genérico", False)]},
    {"id": "c12", "name": "Cacaotera El Playón", "owner": "Edgar Pinzón", "doc": ("CC", "91520338"), "tipo": "Productor", "seg": "C", "estado": "INACTIVO", "mun": "San Vicente de Chucurí", "rtc": "fc", "ha": 11, "phone": "3104822122", "crops": [("Cacao", 11)], "bio": []},
    # Extras solo Campo (cartera RTC cr)
    {"id": "c13", "name": "Viveros San Antonio", "owner": "Marta Lucía Ríos", "doc": ("NIT", "900771204"), "tipo": "Productor", "seg": "B", "estado": "ACTIVO", "mun": "Rionegro", "rtc": "cr", "ha": 2, "phone": "3104822123", "crops": [("Plántulas de hortalizas", 2)], "bio": []},
    {"id": "c14", "name": "Finca Las Palmas", "owner": "Óscar Villegas", "doc": ("CC", "71880312"), "tipo": "Productor", "seg": "B", "estado": "ACTIVO", "mun": "Guarne", "rtc": "cr", "ha": 4, "phone": "3104822124", "crops": [("Fresa", 4)], "bio": [("Trichobiol WP", True)]},
    {"id": "c15", "name": "Cultivos El Tablazo", "owner": "Diana Cárdenas", "doc": ("CC", "43902551"), "tipo": "Productor", "seg": "C", "estado": "PROSPECTO", "mun": "Rionegro", "rtc": "cr", "ha": 7, "phone": "3104822125", "crops": [("Aguacate Hass", 7)], "bio": []},
    {"id": "c16", "name": "Lácteos y Pastos El Peñol", "owner": "Contacto Peñol", "doc": ("NIT", "900555001"), "tipo": "Productor", "seg": "B", "estado": "ACTIVO", "mun": "El Peñol", "rtc": "vc", "ha": 20, "phone": "3104822126", "crops": [("Pastos", 20)], "bio": []},
    {"id": "c17", "name": "Finca La Divisa", "owner": "Contacto Divisa", "doc": ("CC", "43902599"), "tipo": "Productor", "seg": "B", "estado": "ACTIVO", "mun": "Calarcá", "rtc": "dv", "ha": 12, "phone": "3104822127", "crops": [("Café", 12)], "bio": []},
    {"id": "c18", "name": "Finca Buenavista", "owner": "Contacto Buenavista", "doc": ("CC", "43902600"), "tipo": "Productor", "seg": "B", "estado": "ACTIVO", "mun": "Santa Rosa de Cabal", "rtc": "no", "ha": 10, "phone": "3104822128", "crops": [("Café", 10)], "bio": []},
]

PROTO_PRODUCTS = [
    {"sku": "TRI-WP", "name": "Trichobiol WP", "cat": "Fungicida biológico", "ai": "Trichoderma harzianum", "unit": "KG", "price": 198000},
    {"sku": "BEA-WP", "name": "Beauvebiol", "cat": "Insecticida biológico", "ai": "Beauveria bassiana", "unit": "KG", "price": 185000},
    {"sku": "BAC-S", "name": "Bacillus Bio-S", "cat": "Fungicida biológico", "ai": "Bacillus subtilis", "unit": "L", "price": 92000},
    {"sku": "MET-WP", "name": "Metabiol", "cat": "Insecticida biológico", "ai": "Metarhizium anisopliae", "unit": "KG", "price": 176000},
    {"sku": "MIC-P", "name": "Micorriza Plus", "cat": "Bioestimulante", "ai": "Glomus spp.", "unit": "KG", "price": 64000},
    {"sku": "PAE-WP", "name": "Paecilobiol", "cat": "Nematicida biológico", "ai": "Paecilomyces lilacinus", "unit": "KG", "price": 210000},
]

# Visitas del día congelado (Portal VISITS). client_id mapea a PROTO_CLIENTS.
PROTO_VISITS = [
    {"id": "v0", "t": "10:52", "rtc": "cr", "client": "c2", "site": "Sede principal", "reason": "Seguimiento", "st": "REALIZADA", "res": "PEDIDO_CONFIRMADO", "gps": "VERIFICADA", "dist": 40, "pot": 3.1e6, "conc": 3.7e6, "photos": 3},
    {"id": "v1", "t": "10:31", "rtc": "ep", "client": "c5", "site": "Bloque 4", "reason": "Prueba en campo", "st": "REALIZADA", "res": "COTIZACION_SOLICITADA", "gps": "VERIFICADA", "dist": 110, "pot": 8.4e6, "conc": 0, "photos": 4},
    {"id": "v2", "t": "10:20", "rtc": "jr", "client": "c11", "site": "Invernadero 3", "reason": "Seguimiento", "st": "NO_REALIZADA", "res": None, "gps": "SIN_UBICACION", "dist": None, "not_done": "Cliente ausente", "pot": 0, "conc": 0, "photos": 0},
    {"id": "v3", "t": "10:05", "rtc": "dv", "client": "c9", "site": "La Ondina", "reason": "Presentación de producto", "st": "REALIZADA", "res": "COTIZACION_SOLICITADA", "gps": "VERIFICADA", "dist": 60, "pot": 5.3e6, "conc": 0, "photos": 2},
    {"id": "v4", "t": "09:48", "rtc": "jh", "client": "c3", "site": "Lote El Alto", "reason": "Seguimiento", "st": "REALIZADA", "res": "SEGUIMIENTO_PROGRAMADO", "gps": "VERIFICADA", "dist": 210, "pot": 2.6e6, "conc": 0, "photos": 1},
    {"id": "v5", "t": "09:30", "rtc": "fc", "client": "c12", "site": "Finca El Guamo", "reason": "Seguimiento", "st": "REALIZADA", "res": "SIN_INTERES", "gps": "PRECISION_BAJA", "dist": None, "just": "", "acc": 320, "pot": 0, "conc": 0, "photos": 1},
    {"id": "v6", "t": "09:10", "rtc": "ag", "client": "c10", "site": "Hacienda Potrerito", "reason": "Prueba en campo", "st": "REALIZADA", "res": "PEDIDO_CONFIRMADO", "gps": "VERIFICADA", "dist": 120, "pot": 12.4e6, "conc": 9.8e6, "photos": 4},
    {"id": "v7", "t": "09:02", "rtc": "vc", "client": "c16", "site": "Sede principal", "reason": "Visita de cobro", "st": "REALIZADA", "res": "SEGUIMIENTO_PROGRAMADO", "gps": "VERIFICADA", "dist": 330, "pot": 1.8e6, "conc": 0, "photos": 0},
    {"id": "v8", "t": "08:50", "rtc": "so", "client": "c7", "site": "Sede principal", "reason": "Seguimiento", "st": "REALIZADA", "res": "SEGUIMIENTO_PROGRAMADO", "gps": "FUERA_DE_RANGO", "dist": 2300, "just": "El cliente me recibió en la bodega del pueblo porque la vía a la finca estaba cerrada.", "acc": 18, "pot": 2.1e6, "conc": 0, "photos": 0},
    {"id": "v9", "t": "08:15", "rtc": "no", "client": "c8", "site": "Lote 2", "reason": "Presentación de producto", "st": "REALIZADA", "res": "COTIZACION_SOLICITADA", "gps": "VERIFICADA", "dist": 240, "pot": 6.8e6, "conc": 0, "photos": 2},
    {"id": "v10", "t": "07:40", "rtc": "cr", "client": "c1", "site": "Sede principal", "reason": "Seguimiento", "st": "REALIZADA", "res": "PEDIDO_CONFIRMADO", "gps": "VERIFICADA", "dist": 85, "pot": 4.2e6, "conc": 3.7e6, "photos": 3},
    {"id": "v11", "t": "11:00", "rtc": "cr", "client": "c3", "site": "Sede principal", "reason": "Seguimiento", "st": "PROGRAMADA", "res": None, "gps": None, "dist": None, "pot": 0, "conc": 0, "photos": 0},
    {"id": "v12", "t": "14:00", "rtc": "so", "client": "c6", "site": "Sede principal", "reason": "Seguimiento", "st": "PROGRAMADA", "res": None, "gps": None, "dist": None, "pot": 0, "conc": 0, "photos": 0},
    {"id": "v13", "t": "15:30", "rtc": "no", "client": "c18", "site": "Sede principal", "reason": "Presentación de producto", "st": "PROGRAMADA", "res": None, "gps": None, "dist": None, "pot": 0, "conc": 0, "photos": 0},
    # Agenda Campo pendiente tarde
    {"id": "v14", "t": "14:30", "rtc": "cr", "client": "c4", "site": "Bodega", "reason": "Presentación de producto", "st": "PROGRAMADA", "res": None, "gps": None, "dist": None, "pot": 0, "conc": 0, "photos": 0},
    {"id": "v15", "t": "16:00", "rtc": "cr", "client": "c5", "site": "Bloque 4", "reason": "Asignada por tu líder", "st": "PROGRAMADA", "res": None, "gps": None, "dist": None, "origin": "LIDER", "pot": 0, "conc": 0, "photos": 0},
]

# Proporciones del prototipo: mes × (corto, mediano, largo) sobre el potencial total.
FORECAST_MONTH_SHARES = [
    (date(2026, 11, 30), 0.42, 0.30, 0.10),
    (date(2026, 12, 31), 0.00, 0.34, 0.16),
    (date(2027, 1, 31), 0.00, 0.00, 0.30),
    (date(2027, 2, 28), 0.00, 0.00, 0.18),
]

# Discrepancias pendientes adicionales (d2-d5) ligadas a visitas
PROTO_DISC_EXTRA = [
    {"visit": "v2", "just": "El celular no tenía activo el permiso de ubicación.", "gps": "SIN_UBICACION"},
    {"visit": "v5", "just": "", "gps": "PRECISION_BAJA"},
    {"visit": "v8", "just": "El cliente me recibió en la bodega del pueblo porque la vía a la finca estaba cerrada.", "gps": "FUERA_DE_RANGO"},
]

MUNICIPALITIES = [
    ("05376", "La Ceja", "05", "Antioquia"),
    ("05615", "Rionegro", "05", "Antioquia"),
    ("05440", "Marinilla", "05", "Antioquia"),
    ("05607", "El Retiro", "05", "Antioquia"),
    ("05148", "El Carmen de Viboral", "05", "Antioquia"),
    ("05690", "Sonsón", "05", "Antioquia"),
    ("05266", "Guarne", "05", "Antioquia"),
    ("05591", "El Peñol", "05", "Antioquia"),
    ("17174", "Chinchiná", "17", "Caldas"),
    ("63470", "Montenegro", "63", "Quindío"),
    ("76130", "Candelaria", "76", "Valle del Cauca"),
    ("25269", "Facatativá", "25", "Cundinamarca"),
    ("68689", "San Vicente de Chucurí", "68", "Santander"),
    ("63130", "Calarcá", "63", "Quindío"),
    ("66682", "Santa Rosa de Cabal", "66", "Risaralda"),
]
