# SportMatrix Database Design

This document details the relational schemas and table specifications in MySQL database `truf_db`.

---

## 1. Core Schemas

### `users` Table
Stores authentication profiles and access credentials.
```sql
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('SUPER_ADMIN', 'OWNER', 'STAFF', 'CUSTOMER') DEFAULT 'CUSTOMER',
    mobile VARCHAR(20),
    avatar VARCHAR(255),
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### `branches` Table
Manages the various business locations/outlets of owners.
```sql
CREATE TABLE IF NOT EXISTS branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_name VARCHAR(150) NOT NULL,
    branch_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    owner_id INT,
    subscription_plan_id VARCHAR(50) DEFAULT 'plan_starter',
    country VARCHAR(100) DEFAULT 'India',
    state VARCHAR(100),
    city VARCHAR(100),
    zip_code VARCHAR(20),
    full_address TEXT,
    email VARCHAR(100),
    mobile VARCHAR(20),
    alternate_mobile VARCHAR(20),
    gst_number VARCHAR(50),
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    currency VARCHAR(10) DEFAULT 'INR',
    logo VARCHAR(255),
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### `sports` Table
Master table containing all standard global sports offerings.
```sql
CREATE TABLE IF NOT EXISTS sports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    icon VARCHAR(10) DEFAULT '⚽',
    category VARCHAR(50) DEFAULT 'Team Sport',
    default_slot_duration INT DEFAULT 60
);
```

### `branch_sports` Table
Multi-tenant mapping of active sports to individual branches.
```sql
CREATE TABLE IF NOT EXISTS branch_sports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT,
    sport_id INT,
    regular_price INT DEFAULT 0,
    peak_price INT DEFAULT 0,
    total_courts INT DEFAULT 1,
    opening_time TIME DEFAULT '06:00',
    closing_time TIME DEFAULT '22:00',
    slot_duration INT DEFAULT 60,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE
);
```

### `slots` Table
Pre-configured scheduling slots where customers place bookings.
```sql
CREATE TABLE IF NOT EXISTS slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT,
    sport_id INT,
    court_name VARCHAR(100) NOT NULL,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INT NOT NULL,
    regular_price INT DEFAULT 0,
    peak_price INT DEFAULT 0,
    is_peak_hour BOOLEAN DEFAULT FALSE,
    status ENUM('AVAILABLE', 'BOOKED', 'BLOCKED', 'COMPLETED') DEFAULT 'AVAILABLE',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE
);
```

### `bookings` Table
Holds the reservation data for individual slots.
```sql
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slot_id INT,
    user_id INT,
    customer_name VARCHAR(100) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    amount INT NOT NULL,
    duration INT NOT NULL,
    notes TEXT,
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED') DEFAULT 'CONFIRMED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### `holidays` Table
Specifies dates when all operations at a branch are locked.
```sql
CREATE TABLE IF NOT EXISTS holidays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT,
    title VARCHAR(150),
    holiday_date DATE NOT NULL,
    reason VARCHAR(255),
    is_full_day BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);
```

### `wallets` Table
Maintains virtual currency credits of players/users.
```sql
CREATE TABLE IF NOT EXISTS wallets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    balance INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```
