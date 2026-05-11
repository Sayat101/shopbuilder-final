Shopify clone for Kazakhstan - multi-tenant e-commerce platform with Kaspi Pay integration.

## Quick Start
# Start everything (PostgreSQL + Redis + App)
docker compose up
```

The API will be available at `http://localhost:3000`  
Swagger docs at `http://localhost:3000/docs`

# Start dev server
npm run dev
```
## API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/register | Register new user | No |
| POST | /auth/login | Login, get tokens | No |
| POST | /auth/refresh | Refresh access token | No |
| POST | /auth/logout | Revoke refresh token | Yes |
| GET | /auth/me | Get current user | Yes |

### Tenants (SUPER_ADMIN only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /tenants | Create merchant store |
| GET | /tenants | List all stores |
| GET | /tenants/:id | Get store details |

### Products (MERCHANT+)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /products | Create product with variant matrix |
| GET | /products | List products (cursor paginated) |
| GET | /products/:id | Get product with variants |
| PATCH | /products/:id/status | Update product status |
| POST | /products/inventory/adjust | Adjust stock level |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /payments/checkout | Process mock payment |

## Architecture

- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache/Queue**: Redis 7 + BullMQ
- **Auth**: JWT (access 15min + refresh 7days in Redis)
- **Multi-tenancy**: Schema-per-tenant isolation
- **Payments**: Mock provider (MOCK_CARD / MOCK_FAIL)

## Key Features

### Multi-tenancy
Each merchant gets isolated data under their own `tenantId`.  
Max pool size: 10 connections per tenant (enforced via PgBouncer in production).

### Product Variant Matrix
```json
POST /products
{
  "title": "Sweater",
  "price": 15000,
  "options": {
    "colors": ["Red", "Blue"],
    "sizes": ["S", "M", "L"]
  }
}
```
Automatically generates 6 SKUs: SWEATER-RED-S, SWEATER-RED-M, SWEATER-RED-L, SWEATER-BLUE-S...  
Each variant has independent inventory tracking.

### Webhook Table
The `WebhookDelivery` table tracks event delivery with:
- `eventType` — order.created, inventory.updated, etc.
- `attemptCount` — retry counter
- `nextRetryAt` — exponential backoff timestamp
- `status` — PENDING | RETRYING | DELIVERED | FAILED
