# Guía de Ejecución — Sesión de Prácticas

## 0. Pre-requisitos (verificar antes de empezar)

| # | Ítem | Comando/Acción | Responsable | ✅/🔴 |
|---|------|----------------|-------------|-------|
| 0.1 | Entorno dev levantado | `pnpm dev` + `pnpm db:up` | Admin | |
| 0.2 | Migraciones al día | `pnpm db:migrate` | Admin | |
| 0.3 | Seeds base cargados | `pnpm db:seed` | Admin | |
| 0.4 | Escáner secretos limpio | `pnpm secrets:scan` | Admin | |
| 0.5 | Tests verdes (73/73 o 72/73 doc) | `pnpm test` | Admin | |
| 0.6 | Intake verificado | `pnpm import:autodetect --dry` | Admin | |
| 0.7 | Usuarios creados (4 roles) | UI Admin | Admin | |
| 0.8 | Empresa práctica creada + RIF dual | UI | Admin | |
| 0.9 | Período 2026-10 abierto | UI Períodos | Contador | |
| 0.10 | Backup pre-sesión | `pg_dump` | Admin | |

## 1. Bloque A — Preparación (30 min)

1. Admin crea empresa "Distribuidora Los Andes, C.A." con RIF J-30123456-7.
2. Admin crea 4 usuarios: `admin@demo`, `adminis@demo`, `contador@demo`, `auditor@demo`.
3. Admin asigna roles por empresa (RBAC): solo `contador` emite/reglas/cierre.
4. Contador abre período 2026-10 con checklist de apertura.
5. Auditor verifica log de auditoría de los pasos 1–4 (append-only, sin huecos).

## 2. Bloque B — Ciclo operativo (2–3 h)

| Orden | CU | Descripción | Rol ejecutor | Duración |
|-------|-----|-------------|--------------|----------|
| 1 | CU-01 | Registrar 3 compras manualmente | Administrativo | 20 min |
| 2 | CU-02 | Registrar 3 ventas manualmente | Administrativo | 20 min |
| 3 | CU-03 | Importar CSV de compras (staging + autodetect) | Administrativo | 30 min |
| 4 | CU-04 | Registrar retenciones IVA/ISLR + emitir comprobantes | Contador | 40 min |
| 5 | CU-05 | Registrar eventos liquidación (pago + abono a cuenta) | Administrativo | 30 min |
| 6 | CU-06 | Generar Libro de Compras y Libro de Ventas | Contador | 20 min |
| 7 | CU-07 | Cerrar período 2026-10 con `closure_hash` | Contador | 30 min |
| 8 | CU-08 | Emitir PDF/Excel de comprobantes y libros | Contador | 30 min |

## 3. Bloque C — Verificación (1–1.5 h)

- Auditor ejecuta checklist de validación (§04).
- Contador compara resultados contra §05 (cálculos esperados).
- Se registran desviaciones en §04/registro-sesion.md.
- Se firma acta de práctica (§04/acta-practica.md) — **no vinculante**, solo evidencia.

## 4. Reglas de la sesión

- **No se corrigen datos en caliente**: si algo falla, se documenta y se decide si reiniciar CU.
- **Todo cálculo se verifica a mano** (calculadora + §05) antes de firmar.
- **Toda acción queda en audit log**: el auditor muestrea ≥3 acciones por CU.
- **Prohibido usar datos reales de clientes**: solo datos sintéticos de este paquete.
- **Al cierre**: `pg_dump` post-sesión + comparar hashes de libros.

## 5. Criterios de aborto

- Falla el aislamiento multiempresa (fuga de datos entre empresas).
- Un comprobante emitido no es reproducible (`sha256` distinto en 2 corridas).
- El cierre produce `closure_hash` distinto con mismos insumos.
- Cualquier 🔴 en CU-04 (retenciones) o CU-07 (cierre).