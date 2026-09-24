# Qline – Product Requirements Document (PRD)

## 1. Product Overview

**Product Name:** Qline  
**Product Type:** Web-based OPD Queue & Appointment Management System  
**Target Users:** Hospitals, Clinics, Doctors, Patients  

### Vision
To digitize and optimize hospital OPD queues by enabling real-time queue management, future booking, structured scheduling, and reduced patient waiting time.

### Problem Statement
Traditional OPD systems face:
- Long physical queues
- Uncertain waiting times
- Manual scheduling
- Doctor overload
- Poor visibility into patient flow

Qline solves these through digital queueing, appointment booking, real-time updates, and structured doctor scheduling.

---

## 2. Goals & Objectives

### Primary Goals
1. Reduce physical waiting time in hospitals.
2. Enable future appointment booking.
3. Provide real-time queue visibility.
4. Allow doctors to manage daily schedules efficiently.
5. Prevent overbooking using controlled slot allocation.

### Success Metrics
- 30% reduction in waiting time
- 90% slot utilization
- <5% double-booking incidents
- Improved patient satisfaction feedback

---

## 3. User Roles & Personas

### 1. Patient
- Books appointments
- Joins real-time queue
- Views token position
- Receives delay notifications

### 2. Doctor
- Manages daily schedule
- Sets consultation time
- Extends consultation if required
- Adds breaks
- Controls max patients per day

### 3. Hospital Admin
- Creates and manages doctors
- Monitors queues
- Configures scheduling rules
- Views analytics and reports

---

## 4. Core Features

### 4.1 Patient Features

#### A. Registration & Login
- Secure authentication
- Profile management

#### B. Future Booking
- Select hospital
- Select department
- Select doctor
- Choose date
- View available time slots
- Book slot
- Receive confirmation

#### C. Real-Time Queue
- View current serving token
- See number of patients ahead
- Estimated waiting time
- Receive notification when near turn

#### D. Appointment History
- View past consultations
- Status tracking (completed, cancelled, no-show)

---

### 4.2 Doctor Features

#### A. Schedule Configuration
- Set working days
- Set working hours
- Add break slots
- Define default consultation time
- Define maximum patients per day

#### B. Slot Management
- View daily schedule
- View booked slots
- Block specific time ranges
- Add emergency breaks

#### C. Consultation Control
- Call next patient
- Mark consultation complete
- Extend consultation time
- Add consultation notes

#### D. Delay Handling
- Automatic delay propagation to upcoming slots
- Patient notification on delay

---

### 4.3 Admin Features

- Add/Edit doctors
- Assign departments
- Configure scheduling rules
- Monitor daily queue load
- View reports & analytics
- Track no-show rate
- Control walk-in vs pre-book allocation

---

## 5. Functional Requirements

### FR1: Slot Generation
System shall automatically generate time slots based on:
- Doctor working hours
- Break periods
- Default consultation duration
- Max patients per day

### FR2: Appointment Booking
System shall allow patients to book only available slots.

### FR3: Real-Time Queue Update
System shall update queue status instantly when:
- Doctor marks patient complete
- Doctor extends consultation
- Patient marked no-show

### FR4: Consultation Extension
Doctor can extend consultation time, and system shall:
- Adjust upcoming slot timings OR
- Use buffer time if available

### FR5: Break Management
Doctor can add/remove break time dynamically.

### FR6: Daily Capacity Limit
System shall prevent booking beyond doctor’s daily max patient limit.

### FR7: Notifications
System shall notify patients about:
- Booking confirmation
- Delays
- Near-turn alerts

---

## 6. Non-Functional Requirements

### Performance
- Real-time updates under 2 seconds
- Support minimum 500 concurrent users per hospital

### Security
- Role-based access control
- Encrypted authentication
- Secure patient data storage

### Scalability
- Support multi-hospital deployment
- Modular architecture

### Reliability
- 99% uptime
- Automatic slot recovery on crash

---

## 7. User Flow Summary

### Patient Flow
Login → Select Doctor → Choose Date → Book Slot → Receive Confirmation → Track Queue → Consultation Complete

### Doctor Flow
Login → View Schedule → Call Patient → Extend/Complete → Update Queue

### Admin Flow
Login → Configure Doctors → Monitor Activity → Generate Reports

---

## 8. Constraints

- Must be web-based
- Must support real-time communication
- Must handle time zone and date consistency
- Must prevent race conditions during slot booking

---

## 9. Future Enhancements

- AI-based wait time prediction
- Mobile application
- Integration with hospital EMR
- Online consultation module
- Payment gateway integration

---

## 10. MVP Scope

Included in MVP:
- Future booking
- Real-time queue
- Doctor schedule configuration
- Max patient per day control
- Basic notifications

Excluded from MVP:
- AI prediction
- EMR integration
- Advanced analytics

---

## 11. Assumptions

- Doctors follow scheduled working hours.
- Patients arrive within expected time window.
- Hospitals provide accurate doctor availability data.

---

End of Product Requirements Document.

