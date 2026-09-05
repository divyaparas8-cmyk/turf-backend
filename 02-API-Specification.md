# SportMatrix API Specification

Detailed HTTP Endpoint definitions for SportMatrix. All responses return standard JSON format.

---

## 1. Authentication (`/api/v1/auth`)

### Register User
* **URL**: `POST /api/v1/auth/register`
* **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "strongpassword",
    "phone": "+91 99999 88888"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": { "userId": 123 }
  }
  ```

### Login User
* **URL**: `POST /api/v1/auth/login`
* **Request Body**:
  ```json
  {
    "email": "owner@gmail.com",
    "password": "123"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "jwt-token-string",
    "user": {
      "id": 1,
      "name": "Rajesh Sharma",
      "email": "owner@gmail.com",
      "role": "OWNER"
    }
  }
  ```

---

## 2. Slots & Booking Configuration (`/api/v1/slots`)

### Fetch Slots by Branch and Date
* **URL**: `GET /api/v1/slots`
* **Query Params**:
  * `branchId` (required)
  * `date` (format: YYYY-MM-DD, required)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 5,
        "startTime": "18:00",
        "endTime": "19:00",
        "courtName": "Football - Court 1",
        "regularPrice": 800,
        "peakPrice": 1200,
        "isPeakHour": false,
        "status": "AVAILABLE"
      }
    ]
  }
  ```

### Create Custom Slot Configuration (Owner only)
* **URL**: `POST /api/v1/slots`
* **Request Body**:
  ```json
  {
    "branchId": "br_001",
    "sportId": "sp_master_01",
    "courtName": "Football - Court 1",
    "slotDate": "2026-08-01",
    "startTime": "18:00",
    "endTime": "19:00",
    "duration": 60,
    "regularPrice": 800,
    "peakPrice": 1200,
    "isPeakHour": false
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Time slot successfully registered"
  }
  ```

---

## 3. Booking Management (`/api/v1/bookings`)

### Create Walk-in / POS Booking (Owner / Staff)
* **URL**: `POST /api/v1/bookings`
* **Request Body**:
  ```json
  {
    "slotId": 5,
    "customerName": "Rohan Patel",
    "mobileNumber": "9876543210",
    "notes": "Prefers soccer balls"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Booking successfully registered",
    "data": { "bookingId": 44 }
  }
  ```
