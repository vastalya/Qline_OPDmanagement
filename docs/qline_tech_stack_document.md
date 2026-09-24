# Qline – Tech Stack Document

## 1. Tech Stack Philosophy

Qline requires:
- Real-time updates
- Flexible scheduling logic
- High scalability
- Clean UI performance
- Multi-role authentication

The stack must support dynamic slot handling, live queue updates, and scalable hospital onboarding.

Chosen approach: **Modern MERN-style architecture with MongoDB and real-time capabilities.**

---

# 2. Frontend Stack

## Framework
**Next.js (React Framework)**

Why:
- Component-based architecture
- Server-side rendering (SEO friendly)
- Fast routing
- Production-ready structure
- Easy scalability

## Styling
- Tailwind CSS (for fast, consistent UI)
- Custom Design System (as per Design Document)

## State Management
- React Context (initially)
- Upgrade option: Zustand or Redux Toolkit (if scale increases)

## Real-Time Updates
- Socket.IO client

Used for:
- Live queue position updates
- Delay notifications
- Doctor schedule changes

---

# 3. Backend Stack

## Runtime
**Node.js**

Why:
- Non-blocking I/O
- Perfect for real-time systems
- Scalable under concurrent requests

## Framework
**Express.js**

Why:
- Lightweight
- Flexible routing
- Middleware ecosystem
- Easy JWT authentication integration

## Real-Time Engine
**Socket.IO (Server)**

Handles:
- Queue updates
- Consultation extensions
- Delay propagation
- Live notifications

---

# 4. Database Layer

## Primary Database: MongoDB

Why MongoDB is best for Qline:

1. Flexible schema (appointments & scheduling can evolve)
2. Easy nested document modeling
3. High write throughput
4. Horizontal scalability
5. JSON-like structure (perfect for JavaScript stack)


## MongoDB Collections Design

### Users
- _id
- name
- email
- password_hash
- role (patient, doctor, admin)

### Doctors
- _id
- user_id
- department
- default_consult_time
- max_patients_per_day
- working_hours
- break_slots

### Appointments
- _id
- doctor_id
- patient_id
- date
- slot_start
- slot_end
- status (booked, completed, cancelled, no_show)

### DailyQueue
- doctor_id
- date
- current_token
- waiting_list


## ODM
**Mongoose**

Provides:
- Schema validation
- Middleware hooks
- Indexing
- Query optimization

---

# 5. Authentication & Security

## Authentication
- JWT (JSON Web Tokens)
- Access token + refresh token pattern

## Password Hashing
- bcrypt

## Role-Based Access Control (RBAC)
- Middleware checks per route

## Security Enhancements
- Rate limiting
- Helmet (HTTP security headers)
- Input validation (Joi or Zod)

---

# 6. Scheduling & Slot Engine

Slot generation logic handled server-side.

When doctor configures:
- Working hours
- Breaks
- Default consultation time
- Max patients

Server dynamically generates available slots for a given date.

Logic considerations:
- Prevent race conditions during booking
- Atomic slot locking
- Handle consultation extension
- Handle delay propagation

MongoDB transactions used when needed.

---

# 7. Notifications System

## Real-Time
- Socket.IO

## Optional Upgrade
- Firebase Cloud Messaging (for mobile push)
- SMS gateway (future)

---

# 8. Deployment Architecture

## Hosting
- Frontend: Vercel
- Backend: AWS EC2 or Render
- Database: MongoDB Atlas

## Environment Setup
- Development
- Staging
- Production

---

# 9. DevOps & Tooling

- Git + GitHub
- ESLint + Prettier
- Postman for API testing
- Docker (optional for containerization)

---

# 10. Scalability Plan

Phase 1 (MVP):
- Single server instance
- MongoDB Atlas shared cluster

Phase 2 (Growth):
- Horizontal scaling using load balancer
- Redis for caching queue state
- Dedicated MongoDB cluster

---

# 11. Why This Stack Is Best for Qline

- Real-time friendly
- Scalable
- Clean separation of frontend & backend
- Flexible data modeling
- Fast development speed
- Startup-ready architecture

This stack ensures Qline can scale from a college project to a production healthcare SaaS platform.

---

End of Tech Stack Document.

