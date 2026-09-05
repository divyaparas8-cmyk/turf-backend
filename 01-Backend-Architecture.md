# SportMatrix Backend Architecture

This document outlines the architectural patterns and folder layout of the SportMatrix backend.

## Tech Stack
* **Runtime**: Node.js
* **Framework**: Express.js
* **Database**: MySQL (hosted locally, managed via phpMyAdmin `turf_db`)
* **ORM / Query Driver**: Direct MySQL connection pool using `mysql2/promise` (raw query driver for ultimate performance)
* **Auth**: JSON Web Tokens (JWT) + bcryptjs password hashing
* **File Upload**: Multer

---

## Folder Structure
```text
turf Backend/
├── src/
│   ├── config/             # Database connection, database initialization
│   ├── middleware/         # Auth verification, error handler, validator
│   ├── modules/            # Business modules (vertical slices)
│   │   ├── auth/           # Login, registration, token refreshes
│   │   ├── branches/       # Multi-tenant branch details
│   │   ├── sports/         # Sports configuration
│   │   ├── slots/          # Booking slots controller
│   │   └── bookings/       # Customer reservations and billing
│   ├── app.js              # Express app setup (cors, json middleware)
│   └── server.js           # Server startup and db initialization
├── .env                    # Environment variables (port, db creds)
├── package.json            # Node.js dependencies
└── history.md              # Project change memory/log
```

---

## Architectural Layers
For clean separation of concerns, the backend operates on a 3-tier layering model:

1. **Routes Layer**:
   * Intercepts HTTP requests.
   * Runs middleware (authentication, inputs validation).
   * Forwards inputs to controllers.
2. **Controllers Layer**:
   * Handles HTTP request details (params, query, body).
   * Interacts with business logic (services).
   * Returns appropriate HTTP statuses and response JSON.
3. **Services Layer (Business Logic)**:
   * Handles core algorithms, calculations, checks, database queries.
   * Performs database CRUD operations using safe MySQL prepared statements.

---

## User Roles (RBAC)
Role-Based Access Control regulates access to routes:
* **SUPER_ADMIN**: Manages SaaS configurations, owners, branch listings, global revenue logs.
* **OWNER**: Manages active branch, branch sports, slots, bookings, POS invoice logs, staff accounts.
* **STAFF**: Creates walk-in bookings, marks slots as completed/blocked.
* **CUSTOMER**: Views public turfs, books slots, registers teams, views wallet logs.
