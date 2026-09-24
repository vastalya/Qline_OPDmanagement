# Qline – Design Document

## 1. Design Vision

Qline will follow a **modern, minimal, soft UI aesthetic** inspired by premium mobile interfaces.

Design characteristics:
- No gradients
- Soft neutral color palette
- Rounded components
- Spacious layout
- Subtle shadows
- Calm, healthcare-friendly visual tone

The interface should feel:
Clean. Professional. Trustworthy. Lightweight.

---

## 2. Design Principles

1. Clarity over decoration
2. Consistent spacing system
3. High readability
4. Soft rounded geometry
5. Minimal visual noise
6. Accessible contrast ratios

---

## 3. Color System (No Gradients)

### Primary Colors
- Primary Blue: #4C6FFF
- Soft Blue Background: #F4F6FF

### Neutral Colors
- Background: #F8F9FB
- Surface (Cards): #FFFFFF
- Border: #E6E8EF
- Text Primary: #1E1F24
- Text Secondary: #6B7280

### Semantic Colors
- Success: #22C55E
- Warning: #F59E0B
- Error: #EF4444
- Info: #3B82F6

No gradient backgrounds anywhere in the system.

---

## 4. Typography System

Font Family: Urbanist (or similar rounded sans-serif)

### Type Scale
- H1: 28px / 600 weight
- H2: 22px / 600 weight
- H3: 18px / 600 weight
- Body Large: 16px / 500 weight
- Body Regular: 14px / 400 weight
- Caption: 12px / 400 weight

Line height: 1.4 – 1.6

---

## 5. Spacing System

Use 8px base grid.

Spacing scale:
- 4px
- 8px
- 16px
- 24px
- 32px
- 48px

All components must align to this grid.

---

## 6. Border Radius & Shadows

### Border Radius
- Small elements: 8px
- Buttons & Inputs: 12px
- Cards: 16px
- Modals: 20px

### Shadow System
Subtle elevation only.

Shadow Level 1:
0px 2px 8px rgba(0, 0, 0, 0.04)

Shadow Level 2:
0px 4px 16px rgba(0, 0, 0, 0.06)

No heavy drop shadows.

---

## 7. Core UI Components

### 7.1 Buttons

Primary Button:
- Background: Primary Blue
- Text: White
- Radius: 12px
- Height: 44px

Secondary Button:
- Background: White
- Border: 1px solid Border Color
- Text: Primary Blue

Disabled State:
- Background: #E5E7EB
- Text: #9CA3AF

---

### 7.2 Input Fields

- Height: 44px
- Radius: 12px
- Border: 1px solid #E6E8EF
- Focus State: Border becomes Primary Blue
- Background: White

---

### 7.3 Cards

- Background: White
- Radius: 16px
- Shadow Level 1
- Padding: 16px

Used for:
- Doctor cards
- Appointment details
- Queue status panels

---

### 7.4 Slot Pills

- Rounded (24px radius)
- Default: White background, light border
- Selected: Primary Blue background, white text
- Booked: Light gray background, disabled interaction

---

### 7.5 Status Badges

Waiting: Soft Blue background
In Progress: Warning color
Completed: Success color
Cancelled: Error color

Rounded capsule style.

---

## 8. Layout Structure

### Container Width
Max width: 1200px (web)
Centered layout.

### Sections
- Header (Fixed top navigation)
- Main content area
- Optional right sidebar (Doctor Dashboard)

Plenty of whitespace between sections.

---

## 9. Screen Designs

### 9.1 Login Screen
- Centered card layout
- Clean white card on soft neutral background
- Minimal inputs
- Single primary CTA

---

### 9.2 Doctor Listing Screen
- Grid or list of doctor cards
- Each card shows:
  - Name
  - Department
  - Next available slot
  - Book button

---

### 9.3 Slot Booking Screen
- Date selector (calendar view)
- Available slots displayed as rounded pills
- Clear visual difference between available and booked slots

---

### 9.4 Queue Screen
- Large current token display
- Patient’s position highlighted
- Estimated time display
- Calm visual hierarchy

---

### 9.5 Doctor Dashboard
- Today’s schedule in vertical timeline
- Patients listed by slot time
- Extend button per patient
- Add break button
- Status color indicators

---

### 9.6 Admin Dashboard
- Overview cards (Total Patients, Avg Wait Time, No-Shows)
- Simple bar/line charts
- Doctor performance list

---

## 10. Interaction Design

- Smooth 200ms–300ms transitions
- Subtle hover elevation on cards
- Button press micro-interaction (slight scale 0.98)
- Toast notifications slide from top-right

No flashy animations.

---

## 11. Accessibility

- Minimum 4.5:1 contrast ratio
- Clear focus indicators
- Keyboard navigation supported
- Large tap targets (min 44px height)

---

## 12. Responsive Design

Mobile First approach.

Breakpoints:
- Mobile: < 768px
- Tablet: 768px – 1024px
- Desktop: > 1024px

Cards stack vertically on mobile.

---

## 13. Design Constraints

- No gradients allowed
- No heavy shadows
- No cluttered layouts
- No sharp corners

All screens must follow the same visual system.

---

End of Design Document.

