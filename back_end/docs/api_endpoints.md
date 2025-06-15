# Vehicle Maintenance Management System – API Endpoint List

_All endpoints are prefixed with **`/api/v1`** unless noted._

## 0. Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | User registration |
| POST | `/auth/login` | Login, returns JWT |
| POST | `/auth/refresh` | Refresh token |
| GET  | `/auth/profile` | Get current user info |

---

## 1. Customer Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | View my profile |
| PATCH | `/users/me` | Update profile |
| POST | `/vehicles` | Add a vehicle |
| GET | `/vehicles` | List my vehicles |
| GET | `/vehicles/{id}` | Vehicle detail |
| PATCH | `/vehicles/{id}` | Update vehicle |
| DELETE | `/vehicles/{id}` | Delete vehicle |
| POST | `/work-orders` | Create repair order |
| GET | `/work-orders` | List my orders |
| GET | `/work-orders/{id}` | Order detail |
| POST | `/work-orders/{id}/feedback` | Rate service |
| POST | `/work-orders/{id}/urge` | Urge order |

---

## 2. Mechanic Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/mechanics/me` | My profile |
| PATCH | `/mechanics/me` | Update profile |
| GET | `/mechanics/me/work-orders` | My orders |
| POST | `/work-orders/{id}/accept` | Accept order |
| POST | `/work-orders/{id}/refuse` | Refuse order |
| PATCH | `/work-orders/{id}/progress` | Update progress |
| POST | `/work-orders/{id}/materials` | Record materials |
| PATCH | `/work-orders/{id}/complete` | Complete order |
| GET | `/mechanics/me/income` | Monthly income |

---

## 3. Admin Endpoints

### 3.1 User & Mechanic Management
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | List users |
| GET | `/admin/users/{id}` | User detail |
| PATCH | `/admin/users/{id}` | Update user |
| GET | `/admin/mechanics` | List mechanics |
| GET | `/admin/mechanics/{id}` | Mechanic detail |
| POST | `/admin/mechanics` | Create mechanic |
| PATCH | `/admin/mechanics/{id}` | Update mechanic |
| DELETE | `/admin/mechanics/{id}` | Delete mechanic |

### 3.2 Vehicles & Work Orders
| Method | Path |
|--------|------|
| GET | `/admin/vehicles` |
| GET | `/admin/work-orders` |
| PATCH | `/admin/work-orders/{id}` |
| DELETE | `/admin/work-orders/{id}` |

### 3.3 Inventory
| Method | Path |
|--------|------|
| GET | `/admin/parts` |
| GET | `/admin/parts/{id}` |
| POST | `/admin/parts` |
| PATCH | `/admin/parts/{id}` |
| DELETE | `/admin/parts/{id}` |
| POST | `/admin/inventory/in` |
| POST | `/admin/inventory/out` |
| GET | `/admin/inventory/txns` |

### 3.4 Finance
| Method | Path |
|--------|------|
| GET | `/admin/payments` |
| GET | `/admin/payroll` |

### 3.5 Reports
| Method | Path |
|--------|------|
| GET | `/admin/stats/vehicle-repair` |
| GET | `/admin/stats/cost-structure` |
| GET | `/admin/stats/negative-feedback` |
| GET | `/admin/stats/unfinished-orders` |
| GET | `/admin/stats/trade-workload` |

---

## 4. System & Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | Health check |
| GET | `/openapi.json` | OpenAPI spec |
| GET | `/docs` | Swagger UI |
| GET | `/static/**` | Static file serving |

---

### Role Access Matrix

| Path Prefix | customer | mechanic | admin |
|-------------|----------|----------|-------|
| `/auth/**` | ✅ | ✅ | ✅ |
| `/users/**`, `/vehicles/**` | ✅ | 🔒 | ✅ |
| `/mechanics/me/**` | 🔒 | ✅ | ✅ |
| `/work-orders/**` | 自己 | 指派/自己 | ✅ |
| `/admin/**` | 🔒 | 🔒 | ✅ |
