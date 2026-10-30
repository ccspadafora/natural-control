from django.contrib.auth.password_validation import CommonPasswordValidator
from django.core.exceptions import ValidationError
from zxcvbn import zxcvbn


class ZxcvbnValidator:
    def validate(self, password, user=None):
        user_inputs = []
        if user is not None:
            user_inputs = [user.email or "", user.first_name or "", user.last_name or ""]
        score = zxcvbn(password, user_inputs=user_inputs)["score"]
        if score < 3:
            raise ValidationError("Elige una contraseña más difícil de adivinar.", code="password_too_weak")
        CommonPasswordValidator().validate(password)

    def get_help_text(self):
        return "Usa una frase larga que no sea fácil de adivinar."
