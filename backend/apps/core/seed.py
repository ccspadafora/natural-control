"""Siembra idempotente: roles, parámetros, zonas con su lista de precios y usuarios de desarrollo."""

from datetime import date

from django.contrib.auth import get_user_model

from apps.accounts.models import Permission, Role, Scope
from apps.catalog.models import PriceList
from apps.geo.models import Department, Municipality
from apps.org.models import Zone
from apps.parameters.models import SystemSetting, ValueType

DEV_PASSWORD = "Nc-Campo-2026-piloto"

PERMISSIONS = [
    ("clients.view", "clients", "Ver clientes"),
    ("clients.create", "clients", "Crear clientes"),
    ("clients.edit", "clients", "Editar clientes"),
    ("clients.reassign", "clients", "Reasignar cartera"),
    ("clients.import", "clients", "Importar clientes"),
    ("clients.export", "clients", "Exportar clientes"),
    ("locations.approve", "clients", "Aprobar cambios de ubicación"),
    ("visits.view", "visits", "Ver visitas"),
    ("visits.create", "visits", "Agendar visitas"),
    ("visits.execute", "visits", "Ejecutar visitas"),
    ("visits.assign", "visits", "Asignar visitas"),
    ("visits.edit", "visits", "Editar visitas fuera de la ventana"),
    ("visits.export", "visits", "Exportar visitas"),
    ("gps.review", "visits", "Revisar discrepancias"),
    ("weekly_plan.view", "visits", "Ver programación semanal"),
    ("weekly_plan.submit", "visits", "Enviar programación semanal"),
    ("weekly_plan.review", "visits", "Aprobar programación semanal"),
    ("weekly_plan.require", "visits", "Exigir programación semanal"),
    ("catalog.view", "catalog", "Ver catálogo y precios"),
    ("catalog.manage", "catalog", "Administrar catálogo y listas"),
    ("catalogs.manage", "catalog", "Administrar catálogos simples"),
    ("pipeline.view", "pipeline", "Ver embudo"),
    ("pipeline.edit", "pipeline", "Editar embudo"),
    ("pipeline.configure", "pipeline", "Configurar etapas"),
    ("tasks.view", "tasks", "Ver tareas"),
    ("tasks.edit", "tasks", "Editar tareas"),
    ("metrics.view", "metrics", "Ver estadísticas"),
    ("forecast.view", "forecast", "Ver forecast"),
    ("goals.view", "goals", "Ver metas"),
    ("goals.manage", "goals", "Administrar metas"),
    ("whatsapp.view", "whatsapp", "Ver conversaciones"),
    ("whatsapp.send", "whatsapp", "Enviar mensajes"),
    ("whatsapp.configure", "whatsapp", "Configurar WhatsApp"),
    ("automation.view", "automation", "Ver automatizaciones"),
    ("automation.configure", "automation", "Configurar automatizaciones"),
    ("ai_reports.view", "reports", "Ver informes"),
    ("ai_reports.generate", "reports", "Generar informes"),
    ("users.view", "accounts", "Ver usuarios"),
    ("users.manage", "accounts", "Administrar usuarios"),
    ("roles.manage", "accounts", "Administrar roles"),
    ("org.manage", "org", "Administrar zonas y equipos"),
    ("settings.view", "parameters", "Ver parámetros"),
    ("settings.edit", "parameters", "Editar parámetros"),
    ("audit.view", "audit", "Ver bitácora"),
    ("admin.supervise", "admin", "Supervisar el sistema"),
    ("erp.manage", "integrations", "Administrar la integración ERP"),
]

ROLE_SCOPE = {
    "RTC": (Scope.OWN, "Comercial de campo"),
    "LIDER_ZONA": (Scope.ZONE, "Líder de zona"),
    "GERENCIA": (Scope.ALL, "Gerencia"),
    "ADMIN": (Scope.ALL, "Administrador"),
    "ADMIN_PRODUCTO": (Scope.ALL, "Administración de producto"),
}

ROLE_PERMISSIONS = {
    "RTC": [
        "clients.view", "clients.create", "clients.edit",
        "visits.view", "visits.create", "visits.execute",
        "weekly_plan.view", "weekly_plan.submit",
        "catalog.view", "pipeline.view", "pipeline.edit",
        "tasks.view", "tasks.edit", "metrics.view", "forecast.view", "goals.view",
        "whatsapp.view", "whatsapp.send",
    ],
    "LIDER_ZONA": [
        "clients.view", "clients.create", "clients.edit", "clients.reassign",
        "locations.approve", "visits.view", "visits.create", "visits.execute",
        "visits.assign", "visits.edit", "visits.export", "gps.review",
        "weekly_plan.view", "weekly_plan.review", "weekly_plan.require",
        "catalog.view", "pipeline.view", "pipeline.edit", "tasks.view", "tasks.edit",
        "metrics.view", "forecast.view", "goals.view", "whatsapp.view", "automation.view", "users.view",
    ],
    "GERENCIA": [
        "clients.view", "clients.create", "clients.edit", "clients.reassign", "clients.import", "clients.export",
        "locations.approve", "visits.view", "visits.assign", "visits.edit", "visits.export", "gps.review",
        "weekly_plan.view", "weekly_plan.review", "weekly_plan.require",
        "catalog.view", "catalogs.manage", "pipeline.view", "pipeline.configure",
        "tasks.view", "tasks.edit", "metrics.view", "forecast.view", "goals.view", "goals.manage",
        "whatsapp.view", "automation.view", "ai_reports.view", "users.view", "audit.view",
    ],
    "ADMIN_PRODUCTO": ["catalog.view", "catalog.manage"],
}

ZONES = [
    ("ORIENTE", "Oriente Antioqueño"),
    ("URABA", "Urabá"),
    ("CUNDINAMARCA", "Bogotá y Cundinamarca"),
    ("SANTANDER", "Bucaramanga y Santander"),
    ("NSANTANDER", "Pamplona y Norte de Santander"),
    ("TOLIMA", "Tolima"),
    ("VALLE", "Valle"),
]

SETTINGS = [
    ("auth.session_idle_days", 30, ValueType.INT, "auth", "Días de inactividad antes de cerrar la sesión"),
    ("auth.access_token_minutes", 15, ValueType.INT, "auth", "Minutos del access token"),
    ("auth.otp_login_enabled", True, ValueType.BOOL, "auth", "Permite entrar con código"),
    ("auth.local_lock_minutes", 0, ValueType.INT, "auth", "Bloqueo local por inactividad"),
    ("auth.mfa_required_roles", ["GERENCIA", "ADMIN"], ValueType.JSON, "auth", "Roles con doble factor cuando la función esté activa"),
    ("gps.tolerance_m", 1000, ValueType.INT, "gps", "Tolerancia de verificación"),
    ("gps.max_accuracy_m", 200, ValueType.INT, "gps", "Precisión máxima aceptada"),
    ("gps.target_accuracy_m", 50, ValueType.INT, "gps", "Precisión objetivo del muestreo"),
    ("gps.sample_timeout_s", 25, ValueType.INT, "gps", "Segundos de muestreo"),
    ("gps.max_device_clock_skew_min", 10, ValueType.INT, "gps", "Desfase máximo del reloj"),
    ("crm.portfolio_mode", "OPEN", ValueType.STRING, "crm", "OPEN o ASSIGNED"),
    ("crm.portfolio_visibility", "OWN", ValueType.STRING, "crm", "OWN o ZONE"),
    ("crm.dedupe_radius_m", 200, ValueType.INT, "crm", "Radio de duplicados"),
    ("visits.edit_window_hours", 24, ValueType.INT, "visits", "Horas para editar una visita"),
    ("visits.recurrence_horizon_days", 14, ValueType.INT, "visits", "Días de materialización de recurrencias"),
    ("visits.max_photos", 10, ValueType.INT, "visits", "Fotos por visita"),
    ("visits.signature_required_results", [], ValueType.JSON, "visits", "Resultados que exigen firma"),
    ("weekly_plan.deadline_weekday", 1, ValueType.INT, "visits", "Día límite de la programación"),
    ("weekly_plan.deadline_time", "12:00", ValueType.STRING, "visits", "Hora límite"),
    ("weekly_plan.target_week_offset", 1, ValueType.INT, "visits", "Semanas hacia adelante"),
    ("weekly_plan.auto_approve", True, ValueType.BOOL, "visits", "Aprueba al enviar"),
    ("weekly_plan.auto_require_rule", {"enabled": False, "below_pct": 70, "weeks": 2}, ValueType.JSON, "visits", "Regla automática"),
    ("goals.daily_basis", "CALENDAR", ValueType.STRING, "goals", "CALENDAR o BUSINESS"),
    ("goals.sales_source", "CONCRETADOS", ValueType.STRING, "goals", "Hasta que el ERP esté activo"),
    ("goals.traffic_light", {"green": 90, "yellow": 70}, ValueType.JSON, "goals", "Umbrales del semáforo"),
    ("forecast.default_probability", {"CORTO": 70, "MEDIANO": 40, "LARGO": 20}, ValueType.JSON, "forecast", "Probabilidad por horizonte"),
    ("forecast.horizon_max_days", {"CORTO": 7, "MEDIANO": 31, "LARGO": 90}, ValueType.JSON, "forecast", "Tope de días por horizonte"),
    ("forecast.grace_days", 15, ValueType.INT, "forecast", "Días de gracia"),
    ("forecast.allow_rtc_probability", False, ValueType.BOOL, "forecast", "El RTC ajusta la probabilidad"),
    ("pipeline.stalled_days", 21, ValueType.INT, "pipeline", "Días para marcar estancada"),
    ("alerts.inactive_rtc_days", 3, ValueType.INT, "alerts", "Días hábiles sin actividad"),
    ("erp.sync_cron.sales", "*/30 6-21 * * *", ValueType.STRING, "erp", "Cron de ventas"),
    ("erp.owned_fields", {"client": ["legal_name", "document_number"], "product": ["name", "erp_code"]}, ValueType.JSON, "erp", "Campos que manda el ERP"),
    ("ai.model", "", ValueType.STRING, "ai", "Sin uso en esta versión"),
    ("ai.weekly_cron", "0 6 * * 1", ValueType.STRING, "ai", "Sin uso en esta versión"),
    ("ai.monthly_budget_usd", 0, ValueType.DECIMAL, "ai", "Sin uso en esta versión"),
    ("privacy.consent_text", "", ValueType.STRING, "privacy", "Texto de autorización, lo entrega Natural Control"),
    ("privacy.consent_version", "0", ValueType.STRING, "privacy", "Versión del texto de autorización"),
    ("feature.erp", False, ValueType.BOOL, "feature", "Integración ERP"),
    ("feature.offline", True, ValueType.BOOL, "feature", "Modo sin conexión (Campo: outbox Dexie + POST /sync/mutations)"),
    ("feature.pipeline", False, ValueType.BOOL, "feature", "Embudo"),
    ("feature.whatsapp", False, ValueType.BOOL, "feature", "WhatsApp"),
    ("feature.automation", False, ValueType.BOOL, "feature", "Automatización posterior a la visita"),
    ("feature.ai_reports", False, ValueType.BOOL, "feature", "Informes con modelo, fase posterior"),
    ("feature.gamification", False, ValueType.BOOL, "feature", "Ranking y logros"),
    ("feature.mfa", False, ValueType.BOOL, "feature", "Doble factor"),
    ("feature.webauthn", False, ValueType.BOOL, "feature", "Biometría"),
    ("feature.catalog", True, ValueType.BOOL, "feature", "Consulta de productos y precios"),
]


def seed() -> None:
    permissions = {}
    for code, module, description in PERMISSIONS:
        permission, _ = Permission.objects.get_or_create(
            code=code, defaults={"module": module, "description": description}
        )
        permissions[code] = permission

    roles = {}
    for code, (scope, name) in ROLE_SCOPE.items():
        role, _ = Role.objects.get_or_create(
            code=code, defaults={"name": name, "data_scope": scope, "is_system": True}
        )
        roles[code] = role

    admin_codes = list(permissions)
    assignment = {**ROLE_PERMISSIONS, "ADMIN": admin_codes}
    for code, role in roles.items():
        role.permissions.set([permissions[item] for item in assignment[code]])

    for key, value, value_type, module, description in SETTINGS:
        SystemSetting.objects.update_or_create(
            key=key,
            defaults={
                "value": value,
                "value_type": value_type,
                "module": module,
                "description": description,
                "editable_by_role": ["ADMIN"],
            },
        )

    antioquia, _ = Department.objects.get_or_create(code="05", defaults={"name": "Antioquia"})
    Municipality.objects.get_or_create(code="05376", defaults={"name": "La Ceja", "department": antioquia})
    Municipality.objects.get_or_create(code="05615", defaults={"name": "Rionegro", "department": antioquia})

    for code, name in ZONES:
        zone, _ = Zone.objects.get_or_create(code=code, defaults={"name": name})
        PriceList.objects.get_or_create(
            zone=zone,
            is_default=True,
            defaults={"name": f"Público {name} 2025", "valid_from": date(2025, 1, 1)},
        )

    User = get_user_model()
    oriente = Zone.objects.get(code="ORIENTE")
    users = [
        ("rtc@naturalcontrol.test", "RTC", "Ana", "Comercial", oriente),
        ("gerencia@naturalcontrol.test", "GERENCIA", "Emilio", "Gerencia", None),
        ("admin@naturalcontrol.test", "ADMIN", "Admin", "Sistema", None),
    ]
    for email, role_code, first_name, last_name, zone in users:
        if User.objects.filter(email=email).exists():
            continue
        User.objects.create_user(
            email=email,
            password=DEV_PASSWORD,
            role=roles[role_code],
            first_name=first_name,
            last_name=last_name,
            zone=zone,
        )
    from apps.core.demo import seed_portfolio

    seed_portfolio()
