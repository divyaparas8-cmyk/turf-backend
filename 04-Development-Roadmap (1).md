# SportMatrix Development Roadmap

Phase-wise milestones to build the SportMatrix backend platform.

---

## Phase 1: Core Setup & Connection (CURRENT)
* **Goal**: Establish server framework, folder directories, config environment, and connect to MySQL database `truf_db` dynamically.
* **Tasks**:
  1. Initialize npm project.
  2. Install Express, CORS, Dotenv, and MySQL2 driver.
  3. Formulate server routing scaffolding (`server.js`, `app.js`).
  4. Write automatic database initializer script (`src/config/initDb.js`).

---

## Phase 2: User Access & Authentication
* **Goal**: Implement secure access control and profile storage.
* **Tasks**:
  1. Secure authentication logic (Register, Login, Refresh JWT, Logout).
  2. Implement RBAC middleware to authenticate roles (`SUPER_ADMIN`, `OWNER`, `STAFF`, `CUSTOMER`).

---

## Phase 3: Tenant Config (Branches & Sports)
* **Goal**: Enable owners to configure branches and active sports catalog.
* **Tasks**:
  1. Create multi-tenant Branch API (CRUD).
  2. Create Master Sports and Branch Sports configuration maps.

---

## Phase 4: Schedulers & Booking Engine
* **Goal**: Power the core slot timetable and handle reservation triggers.
* **Tasks**:
  1. Dynamic slots generator (creates court times based on active branch sports timing).
  2. Walk-in and online slot reservation endpoints.
  3. Holidays scheduling block checks.

---

## Phase 5: Billing, Wallets & Reports
* **Goal**: Handle financial logs, payment updates, and wallet top-ups.
* **Tasks**:
  1. Wallet balance changes and virtual payment updates.
  2. POS ledger logs.
  3. Exportable branch revenue reports.
