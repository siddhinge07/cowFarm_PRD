# 🐄 AgroHerd --- Cow Farm Management System

### Product Requirements Document (PRD) · Version 2.0

> **Classification:** Internal Engineering Document\
> **Status:** Ready for Development\
> **Target:** Production-Grade Full-Stack Application

------------------------------------------------------------------------

## Table of Contents

1.  [Project Overview](#1-project-overview)
2.  [Goals & Success Metrics](#2-goals--success-metrics)
3.  [Tech Stack & Architecture](#3-tech-stack--architecture)
4.  [Database Schema](#4-database-schema)
5.  [Backend API Specification](#5-backend-api-specification)
6.  [Module 1 --- Cow Management](#6-module-1--cow-management)
7.  [Module 2 --- Expense Management](#7-module-2--expense-management)
8.  [Module 3 --- Milk Production &
    Income](#8-module-3--milk-production--income)
9.  [Module 4 --- Dashboard &
    Analytics](#9-module-4--dashboard--analytics)
10. [Module 5 --- Notifications
    System](#10-module-5--notifications-system)
11. [Module 6 --- Authentication &
    Roles](#11-module-6--authentication--roles)
12. [Frontend Component
    Architecture](#12-frontend-component-architecture)
13. [UI/UX Design System](#13-uiux-design-system)
14. [Non-Functional Requirements](#14-non-functional-requirements)
15. [Deployment Guide](#15-deployment-guide)
16. [Project File Structure](#16-project-file-structure)

------------------------------------------------------------------------

## 1. Project Overview

**AgroHerd** is a production-grade farm management web application built
for dairy farm owners and managers. It enables real-time tracking of
livestock, milk production, expenses, income, and health --- all in one
unified platform accessible from desktop and mobile devices.

### Problem Statement

Small and medium dairy farms currently rely on paper registers,
spreadsheets, or basic note apps to track their operations. This leads
to: - Lost data and errors in expense/income tracking - Missed
reproductive cycle alerts - No visibility into profitability or per-cow
performance - No centralized health record per animal

### Solution

A modern, intuitive web application with role-based access that replaces
manual processes with automated tracking, smart alerts, and business
intelligence dashboards.

------------------------------------------------------------------------

## 2. Goals & Success Metrics

  Goal                         KPI                      Target
  ---------------------------- ------------------------ ------------------------
  Reduce manual data entry     Time per entry           \< 30 seconds
  Catch missed estrus cycles   Alert accuracy           100% auto-alert
  Track profitability          Profit/loss visibility   Real-time dashboard
  Mobile usability             Mobile session ratio     \> 60% mobile-friendly
  System uptime                Availability             99.5% uptime

------------------------------------------------------------------------

## 3. Tech Stack & Architecture

### Frontend

  Layer              Technology
  ------------------ -------------------------------------
  Framework          React.js 18+ (with Hooks)
  State Management   Redux Toolkit + React Query
  Routing            React Router v6
  Charts             Recharts
  Form Handling      React Hook Form + Yup validation
  HTTP Client        Axios with interceptors
  UI Components      Custom Design System (Tailwind CSS)
  Notifications      React Toastify
  Date Handling      date-fns
  PWA Support        Workbox (offline support)

### Backend

  Layer          Technology
  -------------- --------------------------------
  Runtime        Node.js 20 LTS
  Framework      Express.js 4.x
  ORM            Sequelize v6
  Auth           JWT (access + refresh tokens)
  Scheduling     node-cron
  Validation     Joi
  Logging        Winston + Morgan
  File Uploads   Multer + Cloudinary
  Email/SMS      Nodemailer / Twilio (optional)
  API Docs       Swagger / OpenAPI 3.0

### Database

  Layer        Technology
  ------------ --------------------------------------
  Primary DB   Supabase (PostgreSQL)
  Caching      Redis (session + notification cache)
  Migrations   Sequelize CLI
  Backups      Automated daily dumps via cron

### Infrastructure

  Layer              Technology
  ------------------ ----------------------------------
  Containerization   Docker + Docker Compose
  Reverse Proxy      Nginx
  Process Manager    PM2
  CI/CD              GitHub Actions
  Hosting            AWS EC2 / DigitalOcean / Railway
  SSL                Let's Encrypt (Certbot)

### Architecture Pattern

    Client (React SPA)
          │
          ▼
      Nginx (reverse proxy, SSL termination)
          │
          ▼
    Express.js API Server (REST)
          │
          ├── Supabase (PostgreSQL)
          └── Redis (cache / sessions)

------------------------------------------------------------------------

## 4. Database Schema

``` sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 4.1 `users` table

``` sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin', 'manager', 'worker') DEFAULT 'worker',
  phone         VARCHAR(20),
  profile_pic   VARCHAR(500),
  is_active     BOOLEAN DEFAULT TRUE,
  last_login    DATETIME,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 4.2 `cows` table

``` sql
CREATE TABLE cows (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag_number        VARCHAR(50) UNIQUE NOT NULL,
  name              VARCHAR(100),
  breed             VARCHAR(100) NOT NULL,
  date_of_birth     DATE,
  age_years         INT GENERATED ALWAYS AS (TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE())) STORED,
  weight_kg         DECIMAL(6,2),
  color             VARCHAR(50),
  health_status     ENUM('healthy', 'sick', 'pregnant', 'dry', 'sold', 'deceased') DEFAULT 'healthy',
  is_milking        BOOLEAN DEFAULT TRUE,
  purchase_date     DATE,
  purchase_price    DECIMAL(10,2),
  notes             TEXT,
  photo_url         VARCHAR(500),
  added_by          INT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tag (tag_number),
  INDEX idx_health (health_status)
);
```

### 4.3 `estrus_cycles` table (Reproductive/Period Tracking)

``` sql
CREATE TABLE estrus_cycles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cow_id              UUID NOT NULL,
  last_cycle_date     DATE NOT NULL,
  next_cycle_date     DATE GENERATED ALWAYS AS (DATE_ADD(last_cycle_date, INTERVAL 21 DAY)) STORED,
  cycle_status        ENUM('pending', 'observed', 'missed', 'confirmed_pregnancy') DEFAULT 'pending',
  notes               TEXT,
  recorded_by         INT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_cow_cycle (cow_id),
  INDEX idx_next_cycle (next_cycle_date)
);
```

### 4.4 `expenses` table

``` sql
CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cow_id          UUID,  -- NULL = farm-wide expense
  category        ENUM('food', 'medical', 'maintenance', 'labor', 'equipment', 'utilities', 'other') NOT NULL,
  sub_category    VARCHAR(100),       -- e.g., 'vaccines', 'hay', 'deworming'
  amount          DECIMAL(10,2) NOT NULL,
  expense_date    DATE NOT NULL,
  vendor          VARCHAR(150),
  receipt_url     VARCHAR(500),
  notes           TEXT,
  added_by        INT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE SET NULL,
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_date (expense_date),
  INDEX idx_category (category),
  INDEX idx_cow (cow_id)
);
```

### 4.5 `milk_records` table

``` sql
CREATE TABLE milk_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cow_id          UUID NOT NULL,
  record_date     DATE NOT NULL,
  session         ENUM('morning', 'evening', 'full_day') DEFAULT 'full_day',
  quantity_liters DECIMAL(6,2) NOT NULL,
  price_per_liter DECIMAL(6,2) NOT NULL,
  income          DECIMAL(10,2) GENERATED ALWAYS AS (quantity_liters * price_per_liter) STORED,
  quality_grade   ENUM('A', 'B', 'C') DEFAULT 'A',
  fat_percentage  DECIMAL(4,2),
  notes           TEXT,
  recorded_by     INT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_cow_date_session (cow_id, record_date, session),
  INDEX idx_date (record_date),
  INDEX idx_cow (cow_id)
);
```

### 4.6 `health_records` table

``` sql
CREATE TABLE health_records (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cow_id            UUID NOT NULL,
  record_date       DATE NOT NULL,
  record_type       ENUM('vaccination', 'treatment', 'checkup', 'deworming', 'surgery', 'other') NOT NULL,
  diagnosis         VARCHAR(255),
  treatment         TEXT,
  medication        VARCHAR(255),
  dosage            VARCHAR(100),
  vet_name          VARCHAR(150),
  vet_contact       VARCHAR(50),
  follow_up_date    DATE,
  cost              DECIMAL(10,2),
  notes             TEXT,
  recorded_by       INT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_cow (cow_id),
  INDEX idx_date (record_date)
);
```

### 4.7 `notifications` table

``` sql
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID,   -- NULL = broadcast to all
  cow_id        UUID,
  type          ENUM('estrus_alert', 'health_alert', 'expense_alert', 'low_milk', 'system') NOT NULL,
  title         VARCHAR(200) NOT NULL,
  message       TEXT NOT NULL,
  priority      ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  is_read       BOOLEAN DEFAULT FALSE,
  scheduled_for DATETIME,
  sent_at       DATETIME,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE SET NULL,
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_scheduled (scheduled_for)
);
```

### 4.8 `refresh_tokens` table

``` sql
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL,
  token       VARCHAR(500) NOT NULL,
  expires_at  DATETIME NOT NULL,
  is_revoked  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token(100))
);
```

------------------------------------------------------------------------

## 5. Backend API Specification

### Base URL

    /api/v1

### Authentication Headers

    Authorization: Bearer <access_token>

------------------------------------------------------------------------

### 5.1 Auth Endpoints

  -------------------------------------------------------------------------------
  Method         Endpoint                  Description             Access
  -------------- ------------------------- ----------------------- --------------
  POST           `/auth/register`          Register new user       Public

  POST           `/auth/login`             Login, returns JWT      Public

  POST           `/auth/refresh`           Refresh access token    Public
                                                                   (requires
                                                                   refresh token)

  POST           `/auth/logout`            Revoke refresh token    Auth

  GET            `/auth/me`                Get current user        Auth
                                           profile                 

  PUT            `/auth/me`                Update profile          Auth

  POST           `/auth/change-password`   Change password         Auth
  -------------------------------------------------------------------------------

**POST /auth/login --- Response:**

``` json
{
  "success": true,
  "data": {
    "user": { "id": 1, "name": "Rajan", "email": "rajan@farm.com", "role": "admin" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 3600
  }
}
```

------------------------------------------------------------------------

### 5.2 Cow Endpoints

  ----------------------------------------------------------------------------
  Method         Endpoint              Description             Access
  -------------- --------------------- ----------------------- ---------------
  GET            `/cows`               List all cows           Auth
                                       (paginated +            
                                       filterable)             

  POST           `/cows`               Add new cow             Admin/Manager

  GET            `/cows/:id`           Get cow details         Auth

  PUT            `/cows/:id`           Update cow              Admin/Manager

  DELETE         `/cows/:id`           Soft delete cow         Admin

  GET            `/cows/:id/history`   Full cow history        Auth
                                       (health, milk,          
                                       expenses)               

  GET            `/cows/search?q=`     Search by tag or name   Auth

  POST           `/cows/:id/photo`     Upload cow photo        Admin/Manager
  ----------------------------------------------------------------------------

**Query Params for GET /cows:**

    ?page=1&limit=20&status=healthy&breed=Holstein&sort=name&order=asc&search=T001

------------------------------------------------------------------------

### 5.3 Estrus / Cycle Endpoints

  Method   Endpoint               Description                      Access
  -------- ---------------------- -------------------------------- ---------------
  GET      `/cycles`              List all cycle records           Auth
  POST     `/cycles`              Record new cycle for a cow       Admin/Manager
  PUT      `/cycles/:id`          Update cycle record              Admin/Manager
  DELETE   `/cycles/:id`          Delete cycle record              Admin
  GET      `/cycles/upcoming`     Cows with cycle in next 5 days   Auth
  GET      `/cycles/today`        Cows with cycle due today        Auth
  GET      `/cycles/cow/:cowId`   All cycle records for a cow      Auth

------------------------------------------------------------------------

### 5.4 Expense Endpoints

  --------------------------------------------------------------------------------
  Method         Endpoint                  Description             Access
  -------------- ------------------------- ----------------------- ---------------
  GET            `/expenses`               List expenses           Auth
                                           (paginated +            
                                           filterable)             

  POST           `/expenses`               Add expense             Admin/Manager

  GET            `/expenses/:id`           Get expense detail      Auth

  PUT            `/expenses/:id`           Update expense          Admin/Manager

  DELETE         `/expenses/:id`           Delete expense          Admin

  GET            `/expenses/summary`       Summary by              Auth
                                           category/date           

  POST           `/expenses/:id/receipt`   Upload receipt image    Admin/Manager
  --------------------------------------------------------------------------------

**Query Params for GET /expenses:**

    ?page=1&limit=20&category=medical&cowId=5&from=2024-01-01&to=2024-12-31

------------------------------------------------------------------------

### 5.5 Milk Record Endpoints

  ---------------------------------------------------------------------------------------------
  Method         Endpoint                Description                            Access
  -------------- ----------------------- -------------------------------------- ---------------
  GET            `/milk`                 List milk records                      Auth

  POST           `/milk`                 Add milk record                        Auth (all)

  GET            `/milk/:id`             Get record                             Auth

  PUT            `/milk/:id`             Update record                          Admin/Manager

  DELETE         `/milk/:id`             Delete record                          Admin

  GET            `/milk/daily-summary`   Daily total per cow                    Auth

  GET            `/milk/income`          Income breakdown                       Auth
                                         (daily/15d/monthly/quarterly/yearly)   
  ---------------------------------------------------------------------------------------------

**GET /milk/income --- Response:**

``` json
{
  "success": true,
  "data": {
    "daily": 2400.00,
    "fifteenDay": 34200.00,
    "monthly": 68400.00,
    "quarterly": 205200.00,
    "yearly": 820800.00,
    "totalLiters": {
      "daily": 120,
      "monthly": 3420
    }
  }
}
```

------------------------------------------------------------------------

### 5.6 Dashboard Endpoints

  ------------------------------------------------------------------------------------------
  Method         Endpoint                             Description             Access
  -------------- ------------------------------------ ----------------------- --------------
  GET            `/dashboard/summary`                 All KPI cards in one    Auth
                                                      call                    

  GET            `/dashboard/charts/milk`             Milk production chart   Auth
                                                      data                    

  GET            `/dashboard/charts/income-expense`   Income vs Expense chart Auth
                                                      data                    

  GET            `/dashboard/alerts`                  Active alerts summary   Auth
  ------------------------------------------------------------------------------------------

------------------------------------------------------------------------

### 5.7 Notification Endpoints

  Method   Endpoint                        Description                Access
  -------- ------------------------------- -------------------------- --------
  GET      `/notifications`                Get user's notifications   Auth
  PUT      `/notifications/:id/read`       Mark as read               Auth
  PUT      `/notifications/read-all`       Mark all read              Auth
  DELETE   `/notifications/:id`            Delete notification        Auth
  GET      `/notifications/unread-count`   Badge count                Auth

------------------------------------------------------------------------

### 5.8 Health Record Endpoints

  Method   Endpoint               Description             Access
  -------- ---------------------- ----------------------- ---------------
  GET      `/health`              List health records     Auth
  POST     `/health`              Add health record       Admin/Manager
  GET      `/health/:id`          Get health record       Auth
  PUT      `/health/:id`          Update                  Admin/Manager
  DELETE   `/health/:id`          Delete                  Admin
  GET      `/health/cow/:cowId`   All records for a cow   Auth

------------------------------------------------------------------------

### Standard API Response Format

**Success:**

``` json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Error:**

``` json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Milk quantity must be a positive number",
    "details": [ { "field": "quantity_liters", "issue": "Must be > 0" } ]
  }
}
```

------------------------------------------------------------------------

## 6. Module 1 --- Cow Management

### 6.1 Features

-   Add, edit, soft-delete cows with full audit trail
-   Upload and display cow photo
-   View complete cow profile: health history, milk records, expenses,
    cycle history
-   Search by tag number or name (real-time)
-   Filter by breed, health status, milking status
-   Export cow list to CSV

### 6.2 Cow Form Fields

  Field            Type       Required   Validation
  ---------------- ---------- ---------- ----------------------
  Tag Number       Text       Yes        Unique, alphanumeric
  Name             Text       No         Max 100 chars
  Breed            Select     Yes        Predefined list
  Date of Birth    Date       Yes        Cannot be future
  Weight (kg)      Number     No         0--2000
  Color            Text       No         Max 50 chars
  Health Status    Select     Yes        From enum
  Is Milking       Toggle     Yes        Boolean
  Purchase Date    Date       No         Valid date
  Purchase Price   Number     No         Positive
  Notes            Textarea   No         Max 1000 chars
  Photo            File       No         JPEG/PNG, max 5MB

### 6.3 Cycle/Period Tracking Logic

    Estrus (Heat) Cycle:
    - Average bovine cycle: 21 days (range: 18–24 days)
    - Alert window: 3 days before + day of

    Alert Tiers:
      🔴 CRITICAL  → Cycle due today
      🟠 HIGH      → Cycle due in 1–2 days
      🟡 MEDIUM    → Cycle due in 3–5 days
      🟢 INFO      → Cycle recorded / confirmed pregnant

**Auto-Calculation Cron Job (runs daily at 6:00 AM):** 1. Query all
active cows with `estrus_cycles` records 2. For each: check if
`next_cycle_date` falls within 5 days 3. Generate notification if not
already sent today 4. Update cycle status if overdue and not observed

------------------------------------------------------------------------

## 7. Module 2 --- Expense Management

### 7.1 Features

-   Add, edit, delete expenses
-   Attach receipt image
-   Assign to individual cow OR entire farm
-   Filter by date range, category, cow
-   Monthly/yearly expense summary by category
-   Export to CSV/PDF

### 7.2 Expense Categories & Sub-categories

  Category      Sub-categories
  ------------- -------------------------------------------------------
  Food          Hay, Silage, Concentrate, Minerals, Water
  Medical       Vaccination, Deworming, Treatment, Surgery, Lab Tests
  Maintenance   Equipment Repair, Shed Repair, Cleaning Supplies
  Labor         Milker Salary, Vet Visit Fee, Casual Labor
  Equipment     New Purchase, Accessories
  Utilities     Electricity, Water Bill, Fuel
  Other         Transport, Insurance, Miscellaneous

### 7.3 High Expense Alert Logic

-   Configurable threshold per category (admin sets in settings)
-   Alert fires when a single expense OR monthly total exceeds threshold
-   Default threshold: ₹10,000/month for Medical, ₹5,000/month for Other

------------------------------------------------------------------------

## 8. Module 3 --- Milk Production & Income

### 8.1 Features

-   Record milk per cow per session (morning/evening/full_day)
-   Prevent duplicate entries (cow + date + session = unique)
-   View daily farm total and per-cow breakdown
-   Set/update price per liter (can vary by date)
-   Income calculations across all time windows
-   Quality grade tracking (A/B/C) and fat %
-   Daily milk entry shortcut: bulk entry for all active cows at once

### 8.2 Income Calculation Logic

    Daily Income     = SUM(quantity × price) for today
    15-Day Income    = SUM(income) for last 15 days
    Monthly Income   = SUM(income) for current calendar month
    Quarterly Income = SUM(income) for current quarter (Q1/Q2/Q3/Q4)
    Yearly Income    = SUM(income) for current calendar year

    Profit = Total Income − Total Expenses (same period)
    Profit Margin % = (Profit / Income) × 100

### 8.3 Reports Available

-   Per-cow milk performance (liters/day average)
-   Top producing cow leaderboard
-   Monthly income trend (bar chart)
-   Income vs Expense comparison (line chart)
-   Profit/Loss heatmap by month
-   Exportable as PDF or CSV

------------------------------------------------------------------------

## 9. Module 4 --- Dashboard & Analytics

### 9.1 KPI Cards (Top Row)

  Card               Metric              Color Indicator
  ------------------ ------------------- ---------------------
  Total Cows         Count by status     Green/Red by health
  Today's Milk       Liters today        vs. yesterday
  Monthly Income     ₹ amount            vs. last month
  Monthly Expenses   ₹ amount            Red if over budget
  Net Profit         Income − Expenses   Green/Red
  Active Alerts      Count               Red badge

### 9.2 Charts

**Chart 1: Milk Production Trend** - Type: Area chart - X-axis: Last 30
days - Y-axis: Total liters - Breakdown: Per cow (toggle)

**Chart 2: Income vs Expenses** - Type: Grouped bar chart - X-axis: Last
6 months - Y-axis: Amount (₹) - Two bars: Income (green) and Expenses
(red)

**Chart 3: Expense Breakdown** - Type: Donut / Pie chart - Segments: Per
category - Current month view

**Chart 4: Cow Health Status** - Type: Horizontal bar or pie - Shows:
healthy, sick, pregnant, dry counts

### 9.3 Alert Panel

**Estrus Alerts:** List of cows with upcoming/due cycles **Health
Alerts:** Cows marked sick or with follow-up due **Low Milk Alert:**
Cows producing below their 7-day average

------------------------------------------------------------------------

## 10. Module 5 --- Notifications System

### 10.1 Notification Types

  Type                   Trigger                          Priority
  ---------------------- -------------------------------- ----------
  Estrus Due Today       Cron: daily 6AM                  Critical
  Estrus Due Soon        Cron: daily 6AM, 3-day window    High
  Health Follow-up Due   Cron: daily 7AM                  High
  Sick Cow Alert         On status change to "sick"       High
  High Expense Alert     On expense save                  Medium
  Low Milk Alert         Cron: daily after milking hour   Medium
  System                 Manual / admin                   Low

### 10.2 Notification Delivery

-   **In-App:** Bell icon with unread badge (WebSocket or polling every
    60s)
-   **Email:** Via Nodemailer (configurable by user in settings)
-   **SMS:** Via Twilio (optional, admin setting)
-   **Push:** PWA push notifications via Service Worker (optional phase
    2)

### 10.3 Cron Job Schedule

    # Estrus alerts — daily at 6:00 AM
    0 6 * * * → checkEstrusCycles()

    # Health follow-up alerts — daily at 7:00 AM
    0 7 * * * → checkHealthFollowUps()

    # Milk production drop alerts — daily at 2:00 PM
    0 14 * * * → checkMilkDropAlerts()

    # Database backup — daily at midnight
    0 0 * * * → backupDatabase()

    # Clean old read notifications — weekly Sunday
    0 0 * * 0 → purgeOldNotifications()

------------------------------------------------------------------------

## 11. Module 6 --- Authentication & Roles

### 11.1 Role Matrix

  Feature                Admin   Manager   Worker
  ---------------------- ------- --------- --------
  View Dashboard         ✅      ✅        ✅
  View Cows              ✅      ✅        ✅
  Add / Edit Cows        ✅      ✅        ❌
  Delete Cows            ✅      ❌        ❌
  Add Milk Records       ✅      ✅        ✅
  Edit/Delete Milk       ✅      ✅        ❌
  Add Expenses           ✅      ✅        ❌
  Edit/Delete Expenses   ✅      ✅        ❌
  View Reports           ✅      ✅        ✅
  Export Data            ✅      ✅        ❌
  Manage Users           ✅      ❌        ❌
  System Settings        ✅      ❌        ❌

### 11.2 JWT Token Strategy

-   **Access Token:** 1-hour expiry, stored in memory (not localStorage)
-   **Refresh Token:** 7-day expiry, stored in HttpOnly cookie
-   **Token Rotation:** New refresh token issued on each use
-   **Revocation:** Refresh token stored in DB, can be invalidated on
    logout or suspicious activity

### 11.3 Security Measures

-   Passwords: bcrypt with salt rounds = 12
-   Rate Limiting: 10 requests/minute on `/auth` routes
-   CORS: Whitelist frontend origin only
-   Helmet.js: Security headers
-   Input Sanitization: All inputs validated via Joi before DB touch
-   SQL Injection Protection: Sequelize parameterized queries only
-   XSS Protection: DOMPurify on frontend for any rendered user content

------------------------------------------------------------------------

## 12. Frontend Component Architecture

    src/
    ├── assets/                    # Images, icons, fonts
    ├── components/
    │   ├── common/
    │   │   ├── Button.jsx
    │   │   ├── Input.jsx
    │   │   ├── Modal.jsx
    │   │   ├── Table.jsx
    │   │   ├── Badge.jsx
    │   │   ├── Card.jsx
    │   │   ├── Spinner.jsx
    │   │   ├── Alert.jsx
    │   │   ├── EmptyState.jsx
    │   │   └── Pagination.jsx
    │   ├── layout/
    │   │   ├── Sidebar.jsx
    │   │   ├── Header.jsx
    │   │   ├── Layout.jsx
    │   │   └── MobileNav.jsx
    │   ├── charts/
    │   │   ├── MilkTrendChart.jsx
    │   │   ├── IncomeExpenseChart.jsx
    │   │   ├── ExpenseDonut.jsx
    │   │   └── CowHealthChart.jsx
    │   └── notifications/
    │       ├── NotificationBell.jsx
    │       └── NotificationPanel.jsx
    ├── pages/
    │   ├── auth/
    │   │   ├── Login.jsx
    │   │   └── ForgotPassword.jsx
    │   ├── dashboard/
    │   │   └── Dashboard.jsx
    │   ├── cows/
    │   │   ├── CowList.jsx
    │   │   ├── CowDetail.jsx
    │   │   └── CowForm.jsx
    │   ├── cycles/
    │   │   └── CycleTracker.jsx
    │   ├── expenses/
    │   │   ├── ExpenseList.jsx
    │   │   └── ExpenseForm.jsx
    │   ├── milk/
    │   │   ├── MilkEntry.jsx
    │   │   ├── MilkList.jsx
    │   │   └── BulkMilkEntry.jsx
    │   ├── reports/
    │   │   └── Reports.jsx
    │   ├── health/
    │   │   ├── HealthList.jsx
    │   │   └── HealthForm.jsx
    │   └── settings/
    │       └── Settings.jsx
    ├── hooks/
    │   ├── useAuth.js
    │   ├── useCows.js
    │   ├── useMilk.js
    │   ├── useNotifications.js
    │   └── useDebounce.js
    ├── store/
    │   ├── store.js
    │   ├── authSlice.js
    │   ├── notificationSlice.js
    │   └── uiSlice.js
    ├── services/
    │   ├── api.js               # Axios instance + interceptors
    │   ├── authService.js
    │   ├── cowService.js
    │   ├── milkService.js
    │   └── expenseService.js
    ├── utils/
    │   ├── formatCurrency.js
    │   ├── formatDate.js
    │   ├── calculateProfit.js
    │   └── validators.js
    ├── constants/
    │   ├── breeds.js
    │   ├── categories.js
    │   └── routes.js
    ├── App.jsx
    └── main.jsx

------------------------------------------------------------------------

## 13. UI/UX Design System

### 13.1 Color Palette

``` css
:root {
  /* Primary */
  --color-brand-primary:    #2E7D32;   /* Deep farm green */
  --color-brand-secondary:  #1565C0;   /* Trust blue */
  --color-brand-accent:     #F9A825;   /* Warm amber/gold */

  /* Status */
  --color-success:          #43A047;
  --color-warning:          #FB8C00;
  --color-danger:           #E53935;
  --color-info:             #039BE5;

  /* Neutrals */
  --color-bg-primary:       #F8FAF8;
  --color-bg-card:          #FFFFFF;
  --color-bg-sidebar:       #1B3A2D;   /* Dark forest green */
  --color-text-primary:     #1C2321;
  --color-text-secondary:   #5A6A5F;
  --color-border:           #E0E8E2;
}
```

### 13.2 Typography

``` css
/* Headings: Sora (modern, clean, distinctive) */
/* Body: Plus Jakarta Sans (highly readable) */
/* Monospace / Numbers: JetBrains Mono */

--font-heading:  'Sora', sans-serif;
--font-body:     'Plus Jakarta Sans', sans-serif;
--font-mono:     'JetBrains Mono', monospace;
```

### 13.3 Layout Specs

-   **Sidebar width:** 260px (desktop), collapsible to 72px, hidden on
    mobile
-   **Content max-width:** 1400px centered
-   **Card border-radius:** 12px
-   **Spacing scale:** 4px base, multiples: 4/8/12/16/24/32/48/64px
-   **Shadow:** Soft, low elevation (no harsh drop shadows)

### 13.4 Screen Breakpoints

    Mobile:  < 768px    → Single column, bottom tab nav
    Tablet:  768–1024px → Sidebar hidden, hamburger menu
    Desktop: > 1024px   → Full sidebar visible

### 13.5 Key UI Pages

**Login Page:**\
Split screen --- left: brand illustration/photo of farm, right: login
form. Logo top-left. Clean and professional.

**Dashboard:**\
- Top row: 5 KPI cards in grid - Middle: Milk trend (large area chart) +
Alerts panel (sidebar) - Bottom: Income/Expense bar chart + Expense
donut chart

**Cow List:**\
- Table view (default) / Card view toggle - Search bar + filter
dropdowns inline - Each row: tag, name, breed, health badge, milk today,
last cycle - Row click → slide-over panel with quick details

**Cow Detail Page:**\
- Header: photo, name, tag, status badge - Tabs: Overview \| Milk
History \| Health Records \| Expenses \| Cycle History - Each tab:
table + add button

**Milk Entry:**\
- Date picker (defaults to today) - Cow selector (searchable dropdown) -
Quantity + price fields - Bulk Entry mode: one row per active milking
cow

**Reports Page:**\
- Date range picker at top - 4 export-ready sections: Income Report,
Expense Report, Milk Report, Profit Summary - Download as PDF / CSV
buttons

### 13.6 Accessibility Requirements

-   WCAG 2.1 AA compliance
-   Keyboard navigable (tab order logical)
-   ARIA labels on all interactive elements
-   Minimum contrast ratio 4.5:1
-   Focus rings visible

------------------------------------------------------------------------

## 14. Non-Functional Requirements

### Performance

-   API response time: \< 300ms for all list endpoints (with pagination)
-   Dashboard load: \< 2 seconds on 3G mobile
-   Frontend bundle: \< 500KB gzipped (code splitting by route)
-   Images: Served via CDN (Cloudinary), WebP format

### Scalability

-   Backend stateless; horizontally scalable
-   Redis caching on dashboard summary (5-minute TTL)
-   DB connection pooling: min 5, max 20 connections

### Security

-   All endpoints protected (except `/auth/login`, `/auth/register`)
-   HTTPS enforced (redirect HTTP → HTTPS)
-   Input sanitized server-side on every endpoint
-   Sensitive fields (password_hash, tokens) never returned in responses

### Reliability

-   Daily DB backup with 30-day retention
-   PM2 auto-restart on crash
-   Error logging via Winston → log files + optional Sentry integration

### Code Quality

-   ESLint + Prettier enforced
-   Minimum 70% test coverage (Jest + Supertest for API)
-   Git commit convention: Conventional Commits
-   Code review required before merge to main

------------------------------------------------------------------------

## 15. Deployment Guide

### Docker Compose (Development)

``` yaml
version: '3.8'
services:
  db:
    image: supabase/postgres
    environment:
      POSTGRES_PASSWORD: rootpass
      POSTGRES_DB: agro_herd
    ports: ["3306:3306"]
    volumes: [db_data:/var/lib/mysql]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  backend:
    build: ./backend
    ports: ["5000:5000"]
    depends_on: [db, redis]
    environment:
      DB_HOST: db
      REDIS_HOST: redis
      JWT_SECRET: your_secret_here

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [backend]

volumes:
  db_data:
```

### Environment Variables (Backend)

``` env
PORT=5000
NODE_ENV=production

DB_HOST=localhost
DB_PORT=3306
DB_NAME=agro_herd
DB_USER=farm_user
DB_PASS=secure_password

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_ACCESS_SECRET=your_64char_secret_here
JWT_REFRESH_SECRET=your_other_64char_secret_here
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=app_password

TWILIO_SID=           # optional
TWILIO_TOKEN=         # optional
TWILIO_FROM=          # optional

FRONTEND_URL=https://yourdomain.com
```

------------------------------------------------------------------------

## 16. Project File Structure

    agro-herd/
    ├── backend/
    │   ├── src/
    │   │   ├── config/
    │   │   │   ├── database.js
    │   │   │   ├── redis.js
    │   │   │   └── cloudinary.js
    │   │   ├── models/
    │   │   │   ├── User.js
    │   │   │   ├── Cow.js
    │   │   │   ├── EstrusCycle.js
    │   │   │   ├── Expense.js
    │   │   │   ├── MilkRecord.js
    │   │   │   ├── HealthRecord.js
    │   │   │   ├── Notification.js
    │   │   │   └── index.js
    │   │   ├── controllers/
    │   │   │   ├── authController.js
    │   │   │   ├── cowController.js
    │   │   │   ├── cycleController.js
    │   │   │   ├── expenseController.js
    │   │   │   ├── milkController.js
    │   │   │   ├── healthController.js
    │   │   │   ├── dashboardController.js
    │   │   │   └── notificationController.js
    │   │   ├── routes/
    │   │   │   ├── auth.routes.js
    │   │   │   ├── cow.routes.js
    │   │   │   ├── cycle.routes.js
    │   │   │   ├── expense.routes.js
    │   │   │   ├── milk.routes.js
    │   │   │   ├── health.routes.js
    │   │   │   ├── dashboard.routes.js
    │   │   │   └── notification.routes.js
    │   │   ├── middleware/
    │   │   │   ├── auth.middleware.js
    │   │   │   ├── role.middleware.js
    │   │   │   ├── validate.middleware.js
    │   │   │   ├── upload.middleware.js
    │   │   │   └── rateLimiter.middleware.js
    │   │   ├── validators/
    │   │   │   ├── cow.validator.js
    │   │   │   ├── expense.validator.js
    │   │   │   └── milk.validator.js
    │   │   ├── services/
    │   │   │   ├── notificationService.js
    │   │   │   ├── emailService.js
    │   │   │   └── reportService.js
    │   │   ├── jobs/
    │   │   │   ├── estrusAlertJob.js
    │   │   │   ├── healthFollowUpJob.js
    │   │   │   └── milkDropAlertJob.js
    │   │   ├── utils/
    │   │   │   ├── logger.js
    │   │   │   ├── response.js
    │   │   │   └── dateHelpers.js
    │   │   └── app.js
    │   ├── migrations/
    │   ├── seeders/
    │   ├── tests/
    │   │   ├── auth.test.js
    │   │   ├── cows.test.js
    │   │   └── milk.test.js
    │   ├── .env.example
    │   ├── Dockerfile
    │   └── package.json
    ├── frontend/
    │   ├── src/              ← (see Section 12)
    │   ├── public/
    │   ├── .env.example
    │   ├── Dockerfile
    │   ├── tailwind.config.js
    │   └── package.json
    ├── docker-compose.yml
    ├── docker-compose.prod.yml
    ├── nginx.conf
    ├── .github/
    │   └── workflows/
    │       └── ci.yml
    └── README.md

------------------------------------------------------------------------

## Appendix A --- Breed Reference List

Holstein-Friesian, Jersey, Brown Swiss, Ayrshire, Guernsey, Sahiwal,
Gir, Tharparkar, Murrah (Buffalo), Surti (Buffalo), HF Cross, Jersey
Cross, Other

## Appendix B --- Milestones

  Phase     Scope                              Duration
  --------- ---------------------------------- -----------
  Phase 1   DB schema + Auth + Cow CRUD        1 week
  Phase 2   Milk Records + Expense Module      1 week
  Phase 3   Dashboard + Charts + Reports       1 week
  Phase 4   Notifications + Cron Jobs          3--4 days
  Phase 5   Health Records + Role Management   3--4 days
  Phase 6   Testing + Security Hardening       3--4 days
  Phase 7   Deployment + CI/CD                 2--3 days

**Total estimated:** \~6 weeks for a 2-developer team

------------------------------------------------------------------------

*Document maintained by: AgroHerd Engineering Team*\
*Last updated: 2026*\
*Version: 2.0.0*
