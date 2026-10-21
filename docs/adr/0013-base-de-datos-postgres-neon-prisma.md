# ADR-0013: Base de datos PostgreSQL (Neon) con Prisma

- **Estado:** Aceptado
- **Fecha:** 2026-10-21

## Contexto

En el plan gratuito de Render el disco es efímero: una base SQLite se perdería en cada despliegue.

## Opciones consideradas

1. SQLite que se vuelve a sembrar en cada arranque: simple, pero los datos se reinician.
2. **PostgreSQL gratuito en Neon:** los datos persisten.

## Decisión

**Neon (PostgreSQL)** en producción, con **Prisma** como ORM (esquema tipado, migraciones y seed).

### Entorno local

Prisma no permite cambiar de proveedor (SQLite ↔ PostgreSQL) con el mismo esquema, así que este ADR reemplaza la decisión previa de "SQLite en local".

En local se usa **PostgreSQL en Docker** (`docker compose`), con la misma versión mayor que Neon:

- funciona sin conexión a internet;
- no consume la cuota gratuita de Neon;
- el entorno de desarrollo es igual al de producción.

Se descartó una rama de desarrollo en Neon porque depende de la red y comparte cuota.
