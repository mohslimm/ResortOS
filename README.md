# ResortOS — Enterprise SaaS ERP for Luxury Resorts

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7%2B-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-red.svg)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.3-38bdf8.svg)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.8-2d3748.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Proprietary-gold.svg)]()

> **ResortOS** is a production-grade, multi-tenant Enterprise Resource Planning (ERP) SaaS platform tailored for luxury hotels and resort complexes (e.g., Club des Pins, Sheraton). Built with a **NestJS** backend micro-architecture, **Prisma ORM**, and a **React 19 / Vite** administrative dashboard following the **"Quiet Luxury"** design philosophy, ResortOS powers real-time property management, housekeeping operations, HR attendance tracking, parking logistics, and tenant analytics.

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & System Design](#2-architecture--system-design)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Installation & Setup](#5-installation--setup)
6. [Usage & Operational Workflows](#6-usage--operational-workflows)
7. [Detailed Features & Modules](#7-detailed-features--modules)
8. [API Documentation](#8-api-documentation)
9. [Database Schema & Models](#9-database-schema--models)
10. [Authentication & Security](#10-authentication--security)
11. [Configuration & Environment Variables](#11-configuration--environment-variables)
12. [Development Guide](#12-development-guide)
13. [Deployment](#13-deployment)
14. [Troubleshooting](#14-troubleshooting)
15. [Dependencies & Integrations](#15-dependencies--integrations)
16. [Future Improvements & Technical Debt](#16-future-improvements--technical-debt)
17. [Complete Project Flow](#17-complete-project-flow)
18. [Quick Start](#18-quick-start)

---

## 1. Project Overview

### Purpose & Vision
Luxury resort complexes face unique operational challenges: managing hundreds of high-value suites, synchronizing housekeeping staff in real time, handling multi-vehicle guest parking, maintaining precise HR attendance records, and guaranteeing complete data isolation across multiple properties operated by the same parent organization.

**ResortOS** addresses these complexities with an all-in-one SaaS ERP solution. It provides:
- **Multi-Tenant SaaS Architecture:** Complete logical isolation per resort property with subscription management (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`).
- **Property Management System (PMS):** Suite management, guest profiling, booking lifecycles, real-time check-in/check-out.
- **Housekeeping Logistics:** Automated task generation on guest check-out, real-time task status updates (`PENDING` → `IN_PROGRESS` → `DONE`), priority dispatching, and room availability releases.
- **HR & Attendance Tracking:** Employee directory, shift tracking, and check-in/check-out attendance logging.
- **Vehicle Parking & Access Control:** Zone slot management (VIP/GUEST), entry logging, duration calculation, and automated billing (10 MAD/hour).
- **Executive Analytics & Audit Trail:** Real-time occupancy metrics, workload tracking, and automated audit logging of all system mutations for compliance.

---

## 2. Architecture & System Design

ResortOS is organized as an **npm workspaces monorepo** comprising a backend micro-service framework, a frontend administrative app, and shared TypeScript type packages.

### High-Level Architecture Diagram

```
                                ┌──────────────────────────────────────────┐
                                │        React 19 / Vite Admin UI          │
                                │    (Zustand Stores, Framer Motion)       │
                                └────────────────────┬─────────────────────┘
                                                     │
                                         REST API /  │  WebSocket
                                      Bearer Token   │  Connection
                                                     ▼
                                ┌──────────────────────────────────────────┐
                                │          NestJS API Gateway              │
                                │   (Global Throttler & Audit Interceptor) │
                                └─────────┬──────────────────────┬─────────┘
                                          │                      │
                   ┌──────────────────────┴──────┐        ┌──────┴──────────────────────┐
                   │   TenantMiddleware          │        │    RealtimeGateway          │
                   │   (AsyncLocalStorage Context)│        │    (Socket.io Rooms)        │
                   └──────────────┬──────────────┘        └──────────────┬──────────────┘
                                  │                                      │
                   ┌──────────────▼──────────────┐                       │
                   │   Feature Controllers       │                       │
                   │   (PMS, HR, Parking, etc.)   │                       │
                   └──────────────┬──────────────┘                       │
                                  │                                      │
                                  ▼                                      │
                       ┌─────────────────────┐                           │
                       │ EventProducerService│──(Internal EventEmitter)──┘
                       └──────────┬──────────┘
                                  │
                                  ▼
                       ┌─────────────────────┐
                       │     Prisma ORM      │
                       └──────────┬──────────┘
                                  │
                   ┌──────────────┴──────────────┐
                   ▼                             ▼
       ┌───────────────────────┐     ┌───────────────────────┐
       │ PostgreSQL 15 Database│     │  Redis Cache & Queue  │
       └───────────────────────┘     └───────────────────────┘
```

### Communication & Data Flow

1. **HTTP Client Requests:** The frontend client sends REST requests with standard JSON payloads. Requests carry an `Authorization: Bearer <access_token>` header and an `x-tenant-id: <uuid>` header.
2. **Tenant Context Resolution:** The `TenantMiddleware` extracts the tenant ID from the HTTP header or verified JWT payload and injects it into Node's `AsyncLocalStorage` (`TenantContext`). Every downstream Prisma query accesses `TenantContext.getStore()?.tenantId` to enforce isolation transparently without manual parameter passing.
3. **Role-Based Access Control (RBAC):** NestJS `RolesGuard` evaluates `@Roles(...)` decorators against `req.user.role`. `SUPER_ADMIN` accounts bypass tenant limits, enabling multi-property management.
4. **Event-Driven Subsystem:** Business operations (e.g., booking creation, room status change, parking entry) call `EventProducerService.emit()`. Events are processed internally via `EventEmitter2` and broadcasted to connected clients via `RealtimeGateway` (Socket.IO rooms isolated by tenant: `tenant_{tenantId}`).
5. **Audit Interceptor:** Every mutating HTTP call (`POST`, `PATCH`, `DELETE`) is captured by the global `AuditInterceptor`, which records the actor, IP address, target module, and sanitized body into the `audit_logs` table.

---

## 3. Technology Stack

### Monorepo & Build System
- **Workspace Manager:** `npm workspaces`
- **Language:** TypeScript 5.7+ (Strict Mode)

### Backend (`apps/backend`)
- **Framework:** NestJS 11.0
- **Runtime:** Node.js 24.x / Express 11.0
- **Database & ORM:** PostgreSQL 15, Prisma ORM 7.8 (`@prisma/client`, `@prisma/adapter-pg`)
- **Caching & Real-Time:** Redis 7 (`ioredis` 5.10), Socket.IO 4.8 (`@nestjs/platform-socket.io`)
- **Security:** Passport JWT (`@nestjs/passport`), Bcrypt 6.0 (12 salt rounds), Helmet 8.1, Cookie Parser 1.4, Rate-limiting (`@nestjs/throttler` 6.5)
- **Validation:** `class-validator` 0.15, `class-transformer` 0.5
- **Documentation:** Swagger 11.4 (`@nestjs/swagger`)

### Frontend UI (`apps/admin-ui`)
- **Framework:** React 19.2 + Vite 8.0
- **Routing:** React Router DOM 7.15
- **State Management:** Zustand 5.0
- **Styling:** Tailwind CSS v4.3 (`@tailwindcss/vite`), CSS Custom Properties (Quiet Luxury Palette)
- **Animations:** Framer Motion 12.38, Lenis Smooth Scroll 1.3
- **Iconography & Utilities:** Lucide React 1.14, Date-fns 4.1, Clsx, Tailwind Merge

### Infrastructure
- **Containers:** Docker & Docker Compose (`postgres:15-alpine`, `redis:7-alpine`)

---

## 4. Project Structure

```
ResortOS/
├── apps/
│   ├── admin-ui/                      # React 19 + Vite Administrative Dashboard
│   │   ├── public/                    # Static brand assets
│   │   ├── src/
│   │   │   ├── app/                   # Page view components
│   │   │   │   ├── dashboard/page.tsx # Executive overview & real-time metrics
│   │   │   │   ├── housekeeping/     # Cleaning task management UI
│   │   │   │   ├── hr/                # Staff directory & attendance UI
│   │   │   │   ├── parking/           # Vehicle slot & session management UI
│   │   │   │   └── pms/               # Property Management (Rooms & Bookings) UI
│   │   │   ├── components/            # UI Atoms and Layout wrappers
│   │   │   │   ├── layout/            # AdminLayout sidebar & header
│   │   │   │   ├── modules/pms/       # Modals (BookingModal, etc.)
│   │   │   │   └── ui/                # Buttons, Cards, Inputs, Badges
│   │   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── lib/                   # API fetch helper (`apiFetch`), utils
│   │   │   ├── stores/                # Zustand stores (useAuthStore, usePmsStore, etc.)
│   │   │   ├── types/                 # Frontend type definitions
│   │   │   ├── App.tsx                # Main router & auto-auth boot
│   │   │   ├── index.css              # Quiet luxury design system tokens & Tailwind v4
│   │   │   └── main.tsx               # React entry point
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── backend/                       # NestJS 11 REST & WebSocket API Server
│       ├── prisma/
│       │   ├── migrations/            # Database schema migration history
│       │   ├── schema.prisma          # Multi-tenant Prisma data model
│       │   └── seed.ts                # Dev database seed script
│       ├── src/
│       │   ├── analytics/             # Executive analytics service & controller
│       │   ├── auth/                  # JWT auth controller, service, guards & strategies
│       │   ├── common/                # AuditInterceptor, RolesGuard, @Roles decorator
│       │   ├── events/                # Internal event producer & event registry
│       │   ├── housekeeping/          # Housekeeping tasks service, controller & DTOs
│       │   ├── hr/                    # Employee & attendance management module
│       │   ├── parking/               # Parking slots & duration billing module
│       │   ├── pms/                   # PMS Rooms & Bookings controllers & services
│       │   ├── realtime/              # Socket.IO RealtimeGateway with tenant rooms
│       │   ├── tenant/                # Multi-tenant middleware & AsyncLocalStorage context
│       │   ├── users/                 # User CRUD service & controller
│       │   ├── app.module.ts          # Core NestJS application module
│       │   ├── health.controller.ts   # System health-check endpoint
│       │   ├── main.ts                # Application bootstrap, Swagger & Helmet setup
│       │   └── prisma.service.ts      # Prisma client provider instance
│       ├── .env                       # Backend environment configuration
│       ├── nest-cli.json
│       └── package.json
│
├── packages/
│   └── shared-types/                  # Shared domain types across frontend and backend
│       ├── src/index.ts               # Core Enums, JwtUser, ApiResponse, PaginatedResponse
│       └── package.json
│
├── docker-compose.yml                 # Local PostgreSQL 15 & Redis 7 services
├── package.json                       # Root workspace scripts & dev dependencies
├── Presentation.txt                   # Executive project presentation summary
└── tsconfig.base.json                 # Shared TypeScript configuration
```

---

## 5. Installation & Setup

### Prerequisites
- **Node.js:** `v20.x` or `v24.x`
- **npm:** `v10.x` or higher
- **Docker & Docker Compose:** Required to run PostgreSQL and Redis containers locally.

### Step 1: Clone & Install Dependencies
Clone the repository and install root workspace dependencies:
```bash
git clone https://github.com/stepping-stones-agency/ResortOS.git
cd ResortOS
npm install
```

### Step 2: Configure Environment Variables
Copy or verify the `.env` file in `apps/backend/.env`:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://admin:resort_password_2024@localhost:5433/resort_erp?schema=public"
JWT_SECRET="super-secret-jwt-key-change-in-production-2024"
JWT_REFRESH_SECRET="super-secret-jwt-refresh-key-change-in-production-2024"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
REDIS_HOST="localhost"
REDIS_PORT=6379
```

### Step 3: Launch PostgreSQL & Redis Containers
Start the infrastructure containers defined in `docker-compose.yml`:
```bash
npm run db:up
```
*This starts Postgres on port `5433` and Redis on port `6379`.*

### Step 4: Run Database Migrations & Seed Initial Data
Execute Prisma migrations and seed the dev environment:
```bash
npm run db:migrate
```
*Seeded Accounts:*
- Admin Account: `admin@club.com` / Password: `admin123` (Tenant: **Club Des Pins**)
- Staff Account: `staff@club.com` / Password: `admin123` (Tenant: **Club Des Pins**)
- Admin Account B: `admin@sheraton.com` / Password: `admin123` (Tenant: **Sheraton**)

### Step 5: Start Development Servers
Run the backend and admin frontend concurrently:

In Terminal 1 (Backend API):
```bash
npm run start:backend
```
*Backend runs at `http://localhost:3001/api/v1` and Swagger documentation at `http://localhost:3001/api/v1/docs`.*

In Terminal 2 (Admin UI):
```bash
npm run start:admin
```
*Admin Dashboard runs at `http://localhost:5173`.*

---

## 6. Usage & Operational Workflows

### 1. Developer Auto-Login & Tenant Context
When opening `http://localhost:5173`, `App.tsx` automatically authenticates using the seeded developer account (`admin@club.com`). The JWT token and active `tenantId` are saved in the Zustand `useAuthStore` and attached automatically to every outgoing HTTP request header via `apiFetch`.

### 2. Property Management System (PMS) Workflow
1. Navigate to **PMS Management** (`/pms`).
2. Click **Nouvelle Réservation** to open `BookingModal.tsx`.
3. Select a guest or enter new guest details, assign an available room (`Suite Royale 101` or `Double Vue Mer 102`), select dates, and confirm.
4. When the guest arrives, click **Check-in**. The room status shifts to `OCCUPIED` in real time.
5. Upon guest departure, click **Check-out**. The room status automatically shifts to `CLEANING`, and a new housekeeping task is generated.

### 3. Housekeeping Operations Workflow
1. Navigate to **Housekeeping** (`/housekeeping`).
2. Cleaning staff view pending tasks ordered by priority (`CRITICAL`, `URGENT`, `NORMAL`).
3. Updating a task status to `IN_PROGRESS` assigns the task to the current employee.
4. Marking a task as `DONE` automatically resets the corresponding room status to `AVAILABLE` in the PMS module and broadcasts a WebSocket notification to reception.

### 4. Vehicle Parking & Logistics Workflow
1. Navigate to **Parking** (`/parking`).
2. On vehicle arrival at the main gate, security clicks **Entrée Véhicule**, selects an open slot (e.g., `A-01 VIP`), and inputs the license plate number. The slot updates to `OCCUPIED`.
3. On vehicle exit, security enters the license plate number under **Sortie Véhicule**. The system calculates total hours parked, applies the billing rate (10 MAD/hr), frees the slot (`FREE`), and displays the total fee.

### 5. HR Attendance Tracking Workflow
1. Navigate to **HR Management** (`/hr`).
2. View the active employee directory across departments (Housekeeping, Reception, Security, Maintenance).
3. Record daily clock-ins (**Pointer Entrée**) and clock-outs (**Pointer Sortie**) with exact timestamps.

---

## 7. Detailed Features & Modules

| Module | Features & Internal Behavior |
| :--- | :--- |
| **Multi-Tenancy** | Automatic database query isolation via `TenantMiddleware` and `AsyncLocalStorage` (`TenantContext`). Prevents cross-property data leaks. |
| **Auth & Security** | Dual-token authentication (short-lived JWT access token in headers, HTTP-only refresh token cookie). Bcrypt hashing, Helmet protection, and rate-limiting. |
| **Property Management (PMS)** | Suite & room management, guest registry with ID card indexing, check-in / check-out lifecycle state machine. |
| **Housekeeping** | Dynamic task creation, priority dispatching, automatic room status reset (`CLEANING` → `AVAILABLE` on completion). |
| **HR & Attendance** | Department employee directory, active attendance logging, duration calculation, and daily check-in logs. |
| **Parking Logistics** | Slot management by zone (VIP, GUEST), parking entry/exit state handling, and duration-based fee calculation. |
| **Analytics Dashboard** | Live dashboard showing real-time occupancy rates, active guests, pending housekeeping workload, and vehicle parking occupancy. |
| **Audit Log System** | `AuditInterceptor` captures all `POST`, `PATCH`, and `DELETE` operations, recording actor IDs, module names, event types, and sanitized request bodies. |
| **Realtime WebSockets** | Socket.IO gateway with tenant-isolated rooms (`tenant_{tenantId}`). Emits events when rooms change state or parking entries occur. |

---

## 8. API Documentation

Base URL: `http://localhost:3001/api/v1`  
Interactive Swagger OpenAPI Docs: `http://localhost:3001/api/v1/docs`

### Authentication Endpoints
| Method | Endpoint | Description | Access / Roles |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a new tenant & admin user | Public |
| `POST` | `/auth/login` | Authenticate user; returns access token & HTTP cookie | Public |
| `POST` | `/auth/refresh` | Rotate access token via HTTP-only refresh cookie | Refresh Guard |
| `POST` | `/auth/logout` | Clear refresh token in database and revoke cookie | Refresh Guard |

### User Management Endpoints
| Method | Endpoint | Description | Access / Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/users/me` | Get active user profile | Authenticated |
| `GET` | `/users` | List all users in active tenant | `ADMIN`, `DIRECTOR`, `SUPER_ADMIN` |
| `GET` | `/users/:id` | Get specific user details | `ADMIN`, `DIRECTOR`, `SUPER_ADMIN` |
| `PATCH`| `/users/:id` | Update user details or role | `ADMIN`, `SUPER_ADMIN` |
| `DELETE`| `/users/:id` | Soft delete / deactivate user account | `ADMIN`, `SUPER_ADMIN` |

### Property Management System (PMS) Endpoints
| Method | Endpoint | Description | Access / Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/pms/rooms` | List all rooms (optional query `?status=AVAILABLE`) | Authenticated |
| `GET` | `/pms/rooms/available` | Filter available rooms by checkIn & checkOut dates | Authenticated |
| `GET` | `/pms/rooms/:id` | Get room details | Authenticated |
| `POST` | `/pms/rooms` | Create new room | `ADMIN`, `DIRECTOR` |
| `PATCH`| `/pms/rooms/:id` | Update room pricing or configuration | `ADMIN`, `DIRECTOR`, `STAFF` |
| `GET` | `/pms/bookings` | List bookings (optional query `?status=CONFIRMED`) | Authenticated |
| `GET` | `/pms/bookings/:id` | Get booking details | Authenticated |
| `POST` | `/pms/bookings` | Create new booking (with guest details) | `ADMIN`, `DIRECTOR`, `STAFF` |
| `PATCH`| `/pms/bookings/:id/check-in` | Execute guest check-in (Room status → `OCCUPIED`) | `ADMIN`, `DIRECTOR`, `STAFF` |
| `PATCH`| `/pms/bookings/:id/check-out`| Execute guest check-out (Room status → `CLEANING`) | `ADMIN`, `DIRECTOR`, `STAFF` |
| `PATCH`| `/pms/bookings/:id/cancel` | Cancel active booking | `ADMIN`, `DIRECTOR` |

### Housekeeping Endpoints
| Method | Endpoint | Description | Access / Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/housekeeping` | List tasks (optional query `?status=PENDING`) | `ADMIN`, `DIRECTOR`, `STAFF` |
| `GET` | `/housekeeping/my-tasks`| List housekeeping tasks assigned to active user | Authenticated |
| `POST` | `/housekeeping` | Create new cleaning task | `ADMIN`, `DIRECTOR`, `STAFF` |
| `PATCH`| `/housekeeping/:id/status` | Update task status (`IN_PROGRESS` / `DONE`) | Authenticated |
| `PATCH`| `/housekeeping/:id/assign/:userId` | Assign task to housekeeper | `ADMIN`, `DIRECTOR` |

### HR & Attendance Endpoints
| Method | Endpoint | Description | Access / Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/hr/employees` | List employees (optional query `?department=...`) | Authenticated |
| `GET` | `/hr/employees/:id` | Get employee profile | Authenticated |
| `POST` | `/hr/employees` | Create employee profile | `ADMIN`, `DIRECTOR` |
| `PATCH`| `/hr/employees/:id` | Update employee profile | `ADMIN`, `DIRECTOR` |
| `DELETE`| `/hr/employees/:id` | Deactivate employee | `ADMIN` |
| `GET` | `/hr/attendance` | List attendance logs | Authenticated |
| `POST` | `/hr/attendance/check-in/:employeeId` | Log employee check-in | Authenticated |
| `PATCH`| `/hr/attendance/check-out/:logId` | Log employee check-out | Authenticated |

### Parking Endpoints
| Method | Endpoint | Description | Access / Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/parking/slots` | List parking slots | Authenticated |
| `POST` | `/parking/slots` | Create new parking slot | `ADMIN`, `DIRECTOR` |
| `GET` | `/parking/sessions` | List active or historical parking sessions | Authenticated |
| `POST` | `/parking/enter` | Register vehicle entry & occupy slot | `ADMIN`, `DIRECTOR`, `STAFF`, `SECURITY` |
| `POST` | `/parking/exit` | Register vehicle exit, calculate fee & free slot | `ADMIN`, `DIRECTOR`, `STAFF`, `SECURITY` |

### Analytics & System Health Endpoints
| Method | Endpoint | Description | Access / Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/analytics/dashboard-summary` | Get aggregated tenant KPI metrics | Authenticated |
| `GET` | `/health` | Application status health check | Public |

---

## 9. Database Schema & Models

ResortOS uses PostgreSQL managed by Prisma ORM.

```mermaid
erDiagram
    Tenant ||--o{ User : "has"
    Tenant ||--o{ Room : "owns"
    Tenant ||--o{ Guest : "registers"
    Tenant ||--o{ Booking : "manages"
    Tenant ||--o{ Employee : "employs"
    Tenant ||--o{ ParkingSlot : "allocates"
    Tenant ||--o{ HousekeepingTask : "schedules"
    Tenant ||--o{ AuditLog : "records"
    Tenant ||--o| Subscription : "subscribes"

    Room ||--o{ Booking : "booked in"
    Guest ||--o{ Booking : "places"
    Room ||--o{ HousekeepingTask : "cleaned in"
    User ||--o{ HousekeepingTask : "assigned to"
    Employee ||--o{ AttendanceLog : "logs"
    ParkingSlot ||--o{ ParkingSession : "occupied by"
```

### Core Database Models

- **`tenants` (`Tenant`):** Primary tenant model. Contains `id`, `name`, `slug` (unique), `isActive`.
- **`subscriptions` (`Subscription`):** Subscription limits per tenant. Plan types: `STARTER`, `PROFESSIONAL`, `ENTERPRISE`.
- **`users` (`User`):** Administrative and operational accounts. Stores `email`, `passwordHash`, `role`, `refreshToken`, `tenantId`.
- **`rooms` (`Room`):** PMS suite inventory. Unique `[tenantId, number]`. Statuses: `AVAILABLE`, `OCCUPIED`, `CLEANING`, `MAINTENANCE`.
- **`guests` (`Guest`):** Guest identity database. Unique `[tenantId, idCard]`.
- **`bookings` (`Booking`):** Guest room bookings. Stores check-in/out dates, status (`CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`), total amount.
- **`employees` (`Employee`):** HR employee registry per department.
- **`attendance_logs` (`AttendanceLog`):** Staff clock-in/out records.
- **`parking_slots` (`ParkingSlot`):** Vehicle parking space model (`slotNumber`, `zone`, `status`). Unique `[tenantId, slotNumber]`.
- **`parking_sessions` (`ParkingSession`):** Active vehicle parking logs (`plateNumber`, `enteredAt`, `exitedAt`, `fee`).
- **`housekeeping_tasks` (`HousekeepingTask`):** Cleaning tasks linked to rooms and assigned staff.
- **`audit_logs` (`AuditLog`):** Automated mutation logs (`actorId`, `module`, `eventType`, `payload`, `ipAddress`).

---

## 10. Authentication & Security

### Security Standards & Best Practices

1. **Dual JWT Token Architecture:**
   - **Access Token:** Short-lived (15 minutes), signed with `JWT_SECRET` (HS256). Transmitted in `Authorization: Bearer <token>`.
   - **Refresh Token:** Long-lived (7 days), signed with `JWT_REFRESH_SECRET`. Stored as a hashed value in the database and issued via an HTTP-Only, Secure, SameSite cookie.
2. **Role-Based Access Control (RBAC):**
   - Enum Roles: `SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `STAFF`, `SECURITY`, `HOUSEKEEPER`.
   - Enforced by NestJS `RolesGuard` using the `@Roles(...)` metadata decorator.
3. **Multi-Tenant Context Safety:**
   - Handled by `TenantMiddleware` using Node's native `AsyncLocalStorage`.
   - Database queries automatically filter by `tenantId`, eliminating cross-tenant data leaks.
4. **Input Validation & Sanitization:**
   - NestJS `ValidationPipe` configured with `whitelist: true`, `transform: true`, and `forbidNonWhitelisted: true`.
   - Mutating audit logs strip sensitive fields like `password` and `passwordHash`.
5. **Rate Limiting & Web Hardening:**
   - `@nestjs/throttler` enforces rate limits (100 requests/minute globally; 10 login attempts/15 minutes).
   - Helmet HTTP security headers active.

---

## 11. Configuration & Environment Variables

The backend configuration is defined in `apps/backend/.env` and validated at startup in `app.module.ts`.

| Variable Name | Required | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | No | `3001` | HTTP server listening port |
| `NODE_ENV` | No | `development` | Runtime environment (`development` / `production`) |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection URI |
| `JWT_SECRET` | **Yes** | — | Secret key for signing JWT Access Tokens |
| `JWT_REFRESH_SECRET` | **Yes** | — | Secret key for signing JWT Refresh Tokens |
| `JWT_EXPIRES_IN` | No | `15m` | Expiration time for Access Tokens |
| `JWT_REFRESH_EXPIRES_IN`| No | `7d` | Expiration time for Refresh Tokens |
| `REDIS_HOST` | **Yes** | `localhost` | Redis server hostname |
| `REDIS_PORT` | **Yes** | `6379` | Redis server port |

---

## 12. Development Guide

### Workspace Command Reference

Run all workspace commands from the root directory `c:\dev\ResortOS`:

```bash
# Start backend API in watch mode
npm run start:backend

# Start admin frontend in Vite dev mode
npm run start:admin

# Start Docker containers (PostgreSQL & Redis)
npm run db:up

# Stop Docker containers
npm run db:down

# Run database migrations and dev seed script
npm run db:migrate

# Open Prisma Studio web database inspector
npm run db:studio

# Run TypeScript compilation checks across all apps
npm run typecheck

# Build all apps for production
npm run build
```

### Code Style & Architecture Guidelines
- **TypeScript Strictness:** Strict mode is enforced. Avoid explicit `any` types.
- **Frontend State Management:** Use Zustand stores in `apps/admin-ui/src/stores/`. Use `AsyncState<T>` wrapper types (`idle`, `loading`, `success`, `error`, `empty`) for data fetching.
- **UI Styling:** Follow the "Quiet Luxury" palette defined in `index.css`:
  - Dark Void Background: `#060610`
  - Deep Surface: `#0a0a14` / `#0f0f20`
  - Gold Accents: `#c5a059` / `#e8c77a`
  - Typography: `Cormorant Garamond` (display headings) + `Outfit` (body text)
- **Backend Architecture:** Keep logic within service classes; keep NestJS controllers lean and protected with `JwtAuthGuard` and `RolesGuard`.

---

## 13. Deployment

### Production Build Steps

1. **Build All Workspace Packages:**
   ```bash
   npm run build
   ```
   This compiles NestJS into `apps/backend/dist` and Vite into `apps/admin-ui/dist`.

2. **Database Migration in Production:**
   ```bash
   npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma
   ```

3. **Run Production Server:**
   ```bash
   NODE_ENV=production node apps/backend/dist/main.js
   ```

4. **Serve Admin Frontend UI:**
   Deploy the static build output in `apps/admin-ui/dist` to Nginx, AWS S3 / CloudFront, Vercel, or Netlify. Ensure reverse proxy rules map `/api` requests to the Node server on port 3001.

---

## 14. Troubleshooting

| Symptom / Error | Potential Cause | Solution |
| :--- | :--- | :--- |
| `Missing x-tenant-id header` | Request made without `x-tenant-id` header or missing JWT token context | Ensure request includes `x-tenant-id` header or authenticate via `/api/v1/auth/login`. |
| `P2002 Unique constraint failed` | Attempting to create duplicate room number or tenant slug | Check `schema.prisma` unique constraints (e.g., room numbers must be unique per tenant). |
| `ECONNREFUSED 127.0.0.1:5433` | PostgreSQL container is stopped or port is blocked | Run `npm run db:up` and check container status with `docker ps`. |
| `CORS Error in Browser` | Port mismatch or missing origin header | Verify backend `app.enableCors()` configuration in `main.ts`. |
| `Typecheck error in shared-types` | Mismatch between shared type definition and app usage | Rebuild workspace packages or verify `packages/shared-types/src/index.ts`. |

---

## 15. Dependencies & Integrations

- **Prisma ORM (`@prisma/client`, `@prisma/adapter-pg`):** Next-gen ORM with native PostgreSQL driver adapter for tenant transactions.
- **NestJS Throttler (`@nestjs/throttler`):** Rate-limiting middleware protecting API endpoints from abuse.
- **NestJS EventEmitter (`@nestjs/event-emitter`):** Decoupled internal event producer used by `EventProducerService`.
- **Socket.IO (`@nestjs/platform-socket.io`):** WebSockets engine supporting real-time tenant event distribution.
- **Framer Motion (`framer-motion`):** Production UI animation library powering dashboard transitions.
- **Lucide React (`lucide-react`):** Clean icon system.

---

## 16. Future Improvements & Technical Debt

- **Smart Shift Scheduling & Replacement Exchange:** Schema placeholders exist for employee scheduling; full shift exchange approval workflow is planned for Phase 3.
- **Event Bus Migration:** Replace internal `EventEmitter2` transport in `EventProducerService` with Apache Kafka or RabbitMQ for multi-node backend scaling.
- **Mobile Companion Apps:** Develop native iOS / Android views for housekeeping staff and gate security using React Native or PWA wrappers.
- **Automated Billing Engine:** Integrate Stripe / PayPal subscriptions for SaaS tenant billing.

---

## 17. Complete Project Flow

Here is how ResortOS handles a typical operational scenario from start to finish:

```
[1. Guest Reservation]
   - Reception logs booking in PMS UI.
   - Database creates Booking + Guest records (Status: CONFIRMED).
   - Event 'booking.created' is emitted.

[2. Guest Arrival & Parking Entry]
   - Vehicle enters property. Security logs plate number in Parking UI.
   - Slot A-01 VIP changes to OCCUPIED. ParkingSession created.
   - Event 'parking.vehicle_entered' broadcasted via WebSocket.

[3. Check-In & Room Assignment]
   - Reception executes Check-in in PMS UI.
   - Booking status changes to CHECKED_IN. Room status changes to OCCUPIED.
   - AuditInterceptor logs action for audit compliance.

[4. Guest Check-Out]
   - Reception clicks Check-out.
   - Booking status changes to CHECKED_OUT.
   - Room status automatically transitions to CLEANING.
   - System automatically generates a HousekeepingTask (Priority: 1).

[5. Housekeeping Cleaning Workflow]
   - Cleaning staff sees task in Housekeeping UI.
   - Staff updates task status: PENDING -> IN_PROGRESS -> DONE.
   - Upon completion, Room status automatically resets to AVAILABLE.
   - Socket.IO notifies reception in real time.

[6. Parking Exit & Billing]
   - Guest leaves resort. Security logs plate number exit.
   - System calculates duration, computes fee (10 MAD/hr), and releases slot to FREE.
```

---

## 18. Quick Start

Want to get ResortOS running immediately? Execute these 4 commands:

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL and Redis containers
npm run db:up

# 3. Apply schema migrations and seed dev data
npm run db:migrate

# 4. Start Backend API & React Admin UI concurrently
npm run start:backend  # (Terminal 1)
npm run start:admin    # (Terminal 2)
```

Now navigate to **`http://localhost:5173`** to access the ResortOS Executive Admin Dashboard!
