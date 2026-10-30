from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.password_validation import validate_password
from django.db import models

from apps.core.models import BaseModel


class Scope(models.TextChoices):
    OWN = "OWN", "Propio"
    TEAM = "TEAM", "Equipo"
    ZONE = "ZONE", "Zona"
    ALL = "ALL", "Todo"


class Role(BaseModel):
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=80)
    data_scope = models.CharField(max_length=10, choices=Scope.choices, default=Scope.OWN)
    is_system = models.BooleanField(default=False)
    permissions = models.ManyToManyField("accounts.Permission", blank=True, related_name="roles")

    def __str__(self) -> str:
        return self.code


class Permission(BaseModel):
    code = models.CharField(max_length=80, unique=True)
    module = models.CharField(max_length=40)
    description = models.CharField(max_length=200)

    def __str__(self) -> str:
        return self.code


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email: str, password: str | None = None, **extra):
        if not email:
            raise ValueError("El correo es obligatorio")
        email = email.strip().lower()
        user = self.model(email=email, **extra)
        if password:
            validate_password(password, user)
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user


class User(AbstractBaseUser, BaseModel):
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=40, unique=True, null=True, blank=True)
    first_name = models.CharField(max_length=80, blank=True)
    last_name = models.CharField(max_length=80, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    document_id = models.CharField(max_length=20, blank=True)
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="users")
    zone = models.ForeignKey("org.Zone", null=True, blank=True, on_delete=models.PROTECT, related_name="members")
    team = models.ForeignKey("org.Team", null=True, blank=True, on_delete=models.PROTECT, related_name="members")
    erp_seller_code = models.CharField(max_length=40, null=True, blank=True, unique=True)
    requires_weekly_plan = models.BooleanField(default=False)
    requires_weekly_plan_reason = models.CharField(max_length=200, blank=True)
    requires_weekly_plan_since = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    mfa_required = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []
    objects = UserManager()

    class Meta:
        indexes = [
            models.Index(fields=["role", "is_active"]),
            models.Index(fields=["zone", "is_active"]),
            models.Index(fields=["last_seen_at"]),
        ]

    def __str__(self) -> str:
        return self.email

    @property
    def effective_scope(self) -> str:
        return self.role.data_scope

    def permission_codes(self) -> list[str]:
        return list(self.role.permissions.values_list("code", flat=True))

    def has_perm_code(self, code: str) -> bool:
        return self.role.permissions.filter(code=code).exists()


class Platform(models.TextChoices):
    ANDROID = "ANDROID", "Android"
    IOS = "IOS", "iOS"
    DESKTOP = "DESKTOP", "Escritorio"
    OTHER = "OTHER", "Otro"


class Device(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="devices")
    label = models.CharField(max_length=120, blank=True)
    platform = models.CharField(max_length=16, choices=Platform.choices, default=Platform.OTHER)
    is_standalone = models.BooleanField(default=False)
    refresh_jti = models.CharField(max_length=64, blank=True, db_index=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.PROTECT, related_name="revoked_devices")
    pending_mutations = models.PositiveIntegerField(default=0)


class OtpPurpose(models.TextChoices):
    LOGIN = "LOGIN", "Ingreso"
    PASSWORD_RESET = "PASSWORD_RESET", "Recuperar contraseña"
    MFA = "MFA", "Doble factor"


class OtpChannel(models.TextChoices):
    EMAIL = "EMAIL", "Correo"
    WHATSAPP = "WHATSAPP", "WhatsApp"


class OtpChallenge(BaseModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="otp_challenges")
    channel = models.CharField(max_length=16, choices=OtpChannel.choices, default=OtpChannel.EMAIL)
    purpose = models.CharField(max_length=20, choices=OtpPurpose.choices)
    code_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    consumed_at = models.DateTimeField(null=True, blank=True)


class WebAuthnCredential(BaseModel):
    """Tabla lista para el desbloqueo biométrico. Esa función no entra en esta versión."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="webauthn_credentials")
    device = models.ForeignKey(Device, null=True, blank=True, on_delete=models.SET_NULL, related_name="webauthn_credentials")
    credential_id = models.BinaryField(unique=True)
    public_key = models.BinaryField()
    sign_count = models.BigIntegerField(default=0)
    transports = models.JSONField(default=list, blank=True)
    label = models.CharField(max_length=80, blank=True)
