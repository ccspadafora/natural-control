# CRM de campo — Natural Control

Tres superficies (`/campo`, `/portal`, `/consola`) sobre un backend. Estado de historias: [docs/estado-historias.md](docs/estado-historias.md).

## Arranque

```bash
cp .env.example .env
make up
```

Abre http://localhost:8080. El correo de desarrollo se ve en http://localhost:8025.

### Seeds

| Comando | Uso |
|---|---|
| `make seed` | Roles, parámetros, usuarios mínimos |
| `make seed-prototipo` | Datos exactos de los prototipos; fecha congelada 2026-10-29 11:02 America/Bogota |
| `make seed-volume` | Volumen sintético para rendimiento |

### Usuarios del seed prototipo (clave `Nc-Campo-2026-piloto`)

| Correo | Rol |
|---|---|
| rtc@naturalcontrol.test | RTC (Camilo Restrepo · Oriente) |
| lider@naturalcontrol.test | Líder (Paula Zuluaga) |
| gerencia@naturalcontrol.test | Gerencia (Laura Gaviria) |
| admin@naturalcontrol.test | Admin (Jorge Arango) |

### Make

`make test` · `make test-fe` · `make e2e` · `make parity` · `make lint` · `make schema-check`
