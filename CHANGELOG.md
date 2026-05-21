# API / Architecture Changelog

## Multi-tenancy
- Implemented row-level isolation via `tenantId` on all tenant-scoped models.
- `schemaName` on Tenant is reserved for future schema-per-tenant migration.

## Payments
- Mock provider `MOCK_CARD` / `MOCK_FAIL` with idempotency keys (Kaspi/Halyk integration simulated for defense).

## OpenAPI vs implementation
| OpenAPI path | Implementation |
|--------------|----------------|
| `/checkout` | `POST /orders` + `POST /payments/checkout` |
| `/inventory/adjust` | `POST /products/inventory/adjust` |
| `/subscriptions/*` | Not implemented (optional blueprint item) |
| `/themes/*` | Not implemented |

## Storefront API
- Public catalog: `GET /storefront/:subdomain/products`
- Token-based Storefront API keys: planned; not in final MVP.