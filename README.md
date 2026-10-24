# LearNova — Online Learning Platform

A Udemy/Coursera-style course platform: FastAPI backend, an API gateway in front of it, and a React frontend styled with an Instagram-inspired look. Features include Google Sign-In, profile photo uploads, course filtering, enrollment tracking, and an expanded course catalog.

```
frontend (Vite + React)  →  gateway (FastAPI :8000)  →  backend API (FastAPI :8001)  →  PostgreSQL :5433
```

## Project structure

| Folder      | What it is | Runs on |
|-------------|-----------|---------|
| `backend/`  | Main FastAPI service: auth (JWT), courses, enrollments, progress, reviews, instructor management. Owns the database and all business rules. | `127.0.0.1:8001` |
| `gateway/`  | Thin API gateway: single entry point for the frontend. Forwards `/api/*` to the backend, adds rate limiting and request IDs, normalizes CORS and error responses. | `127.0.0.1:8000` |
| `frontend/` | Vite + React + Tailwind SPA: landing, catalog, course detail, player, dashboard, instructor dashboard, profile. Talks only to the gateway. | `127.0.0.1:5173` |

Everything below "Database Design Documentation" describes the 18-table PostgreSQL schema.

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL running on **localhost:5433** (the port is configurable in `backend/.env`)

## 1. Database

```bash
cd backend
python -m venv venv
# Windows:
./venv/Scripts/python.exe -m pip install -r requirements.txt
# create the database (uses DB_* values from backend/.env):
./venv/Scripts/python.exe create_database.py
./venv/Scripts/python.exe create_tables.py   # creates all 18 tables
./venv/Scripts/python.exe seed.py            # demo users, categories, courses, reviews
```

`create_tables.py` prints the logins it seeds:

- Student: `sam@coursehub.dev` / `Password123`
- Instructors: `maya@coursehub.dev`, `andre@coursehub.dev` / `Password123`

To expand the catalog with additional courses and varied videos, run:

```bash
./venv/Scripts/python.exe seed_catalog.py      # add ~250 courses
./venv/Scripts/python.exe seed_more_courses.py # add another ~250 courses
```

## 2. Backend (FastAPI, port 8001)

```bash
cd backend
cp .env.example .env    # then edit DB_PASSWORD, SECRET_KEY
./venv/Scripts/python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001
```

`.env` values (see `backend/.env.example`):

| Variable | Purpose |
|----------|---------|
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | PostgreSQL connection |
| `SECRET_KEY` | Signs JWTs — set a long random value in production |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Web Client ID for Google Sign-In (optional) |

Interactive docs: `http://127.0.0.1:8001/docs`.

## 3. Gateway (FastAPI, port 8000)

```bash
cd gateway
cp .env.example .env    # BACKEND_URL points at the backend
../backend/venv/Scripts/python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

`.env` values (see `gateway/.env.example`):

| Variable | Purpose |
|----------|---------|
| `BACKEND_URL` | Base URL of the backend service (default `http://127.0.0.1:8001`) |
| `ALLOWED_ORIGINS` | Origins allowed by CORS (default includes the Vite dev server `http://localhost:5173`) |
| `RATE_LIMIT_*` | Optional request throttling per client · enabled in prod, log-only in dev |

The gateway forwards every `/api/*` route to the backend and passes the `Authorization` header through; JWTs are issued by the backend and verified there.

Skip the gateway for development if you like — the frontend also supports talking to the backend directly.

## 4. Frontend (Vite + React, port 5173)

```bash
cd frontend
npm install
cp .env.example .env   # or edit the existing .env
npm run dev            # opens on http://localhost:5173
```

`.env` values (see `frontend/.env.example`):

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Base URL of the **gateway** (default `http://localhost:8000`). Point it at `http://localhost:8001` to bypass the gateway. |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Web Client ID for Google Sign-In (optional) |

Production build:

```bash
npm run build   # outputs to frontend/dist/ — no warnings
npm run preview # serve the build locally
```

## Full-stack quick start (Windows PowerShell / bash)

From the repo root, three terminals:

```bash
cd backend  && ./venv/Scripts/python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001
cd gateway  && ../backend/venv/Scripts/python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
cd frontend && npm run dev
```

Then open `http://localhost:5173` and sign in with `sam@coursehub.dev` / `Password123`.

## Where the demo data comes from

`backend/seed.py` creates three instructors, six categories, ten courses with sections/lessons (video URLs point at public sample MP4s to avoid external video hosting), demo enrollments and progress, and one course with a few reviews. Delete rows or re-run `seed.py` after resetting tables to restore a clean state.

---

# Database Design Documentation

## Online Learning Platform Database (PostgreSQL), 18 Tables

A simplified relational database design for an online learning platform similar to Udemy or Coursera. This document describes all 18 entities, their purpose, attributes, data types, keys, and constraints.

---

## Table of Contents

1. [Project structure](#project-structure)
2. [Prerequisites](#prerequisites)
3. [Database](#1-database)
4. [Backend (FastAPI, port 8001)](#2-backend-fastapi-port-8001)
5. [Gateway (FastAPI, port 8000)](#3-gateway-fastapi-port-8000)
6. [Frontend (Vite + React, port 5173)](#4-frontend-vite--react-port-5173)
7. [Full-stack quick start](#full-stack-quick-start-windows-powershell--bash)
8. [Where the demo data comes from](#where-the-demo-data-comes-from)
9. [Legend](#legend)
10. [Core](#core): Users, Instructors, Instructor_Expertise, Categories, Courses, Course_Languages, Sections, Lessons
11. [Learning Activity](#learning-activity): Enrollments, Lesson_Progress, Assignments, Submissions, Submission_Files, Certificates
12. [Commerce](#commerce): Orders, Order_Items, Payments
13. [Engagement](#engagement): Reviews
14. [Relationship Summary](#relationship-summary)
15. [Suggested Creation Order](#suggested-creation-order)

---

## Legend

| Symbol | Meaning |
|--------|---------|
| **PK** | Primary Key |
| **FK** | Foreign Key |
| **UQ** | Unique constraint |
| **NN** | NOT NULL |
| **CK** | CHECK constraint |
| **DEF** | Default value |

Data types are PostgreSQL types. `SERIAL` is an auto-incrementing integer.

**Participation:** *Total* means every row must take part in the relationship (the foreign key is NOT NULL). *Partial* means a row may exist without taking part.

---

# Core

## 1. Users

**Purpose:** Stores every person registered on the platform, including students, instructors, and admins. A `role` column distinguishes them.

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| user_id | SERIAL | PK | NN | Unique identifier of the user |
| first_name | VARCHAR(100) | | NN | First name of the user |
| last_name | VARCHAR(100) | | NN | Last name of the user |
| email | VARCHAR(150) | UQ | NN | Login email, must be unique |
| password_hash | VARCHAR(255) | | NN | Hashed password (never store plain text) |
| role | VARCHAR(20) | | NN, CK (`student`, `instructor`, `admin`), DEF `student` | Role of the user |
| country | VARCHAR(60) | | | Country of residence |
| profile_picture | VARCHAR(255) | | | URL of profile image |
| is_active | BOOLEAN | | NN, DEF `TRUE` | Whether the account is active |
| created_at | TIMESTAMP | | NN, DEF `CURRENT_TIMESTAMP` | Registration time |

**Relationships:**

| Related table | Relationship | Cardinality | Users participation | Other table participation |
|---|---|---|---|---|
| Instructors | is a / extended by | 1:1 | Partial (only teachers) | Total |
| Enrollments | enrolls | 1:N | Partial | Total |
| Orders | places | 1:N | Partial | Total |
| Reviews | writes | 1:N | Partial | Total |
| Submissions | submits | 1:N | Partial | Total |

---

## 2. Instructors

**Purpose:** Holds extra information that only applies to users who teach, keeping the Users table clean.

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| instructor_id | SERIAL | PK | NN | Unique identifier of the instructor |
| user_id | INT | FK, UQ | NN, references `Users(user_id)` ON DELETE CASCADE | Links to the user account (1:1) |
| bio | TEXT | | | Instructor biography |
| years_of_experience | INT | | CK (>= 0) | Teaching or industry experience |
| total_earnings | NUMERIC(12,2) | | DEF 0, CK (>= 0) | Total revenue earned |
| rating | NUMERIC(2,1) | | CK (0 to 5) | Average rating across courses |

**Relationships:**

| Related table | Relationship | Cardinality | Instructors participation | Other table participation |
|---|---|---|---|---|
| Users | is a | 1:1 | Total | Partial |
| Courses | creates | 1:N | Partial (may have no courses yet) | Total |
| Instructor_Expertise | has | 1:N | Partial | Total |

---

## 3. Instructor_Expertise

**Purpose:** Stores each area of expertise of an instructor as its own row, because one instructor can have several (a multivalued attribute of Instructors).

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| expertise_id | SERIAL | PK | NN | Unique identifier of the expertise record |
| instructor_id | INT | FK | NN, references `Instructors(instructor_id)` ON DELETE CASCADE | Instructor who has this expertise |
| expertise | VARCHAR(100) | | NN | Area of expertise |

**Additional constraint:** UQ (`instructor_id`, `expertise`) so the same expertise is not listed twice for one instructor.

**Relationships:**

| Related table | Relationship | Cardinality | Instructor_Expertise participation | Other table participation |
|---|---|---|---|---|
| Instructors | belongs to | N:1 | Total | Partial |

---

## 4. Categories

**Purpose:** Organizes courses into subject areas such as Programming, Design, or Business. Supports subcategories through a self-reference.

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| category_id | SERIAL | PK | NN | Unique identifier of the category |
| name | VARCHAR(100) | UQ | NN | Category name |
| description | TEXT | | | Short description of the category |
| parent_category_id | INT | FK | References `Categories(category_id)` ON DELETE SET NULL | Parent category (NULL for top-level) |

**Relationships:**

| Related table | Relationship | Cardinality | Categories participation | Other table participation |
|---|---|---|---|---|
| Courses | classifies | 1:N | Partial | Total |
| Categories (self) | parent of | 1:N (recursive) | Partial (a leaf has no child) | Partial (a top-level category has no parent) |

---

## 5. Courses

**Purpose:** The main product of the platform. Each course is created by one instructor and belongs to one category.

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| course_id | SERIAL | PK | NN | Unique identifier of the course |
| instructor_id | INT | FK | NN, references `Instructors(instructor_id)` | Instructor who created the course |
| category_id | INT | FK | NN, references `Categories(category_id)` | Category of the course |
| title | VARCHAR(200) | | NN | Course title |
| description | TEXT | | | Detailed course description |
| price | NUMERIC(10,2) | | NN, CK (>= 0), DEF 0 | Course price (0 means free) |
| level | VARCHAR(20) | | CK (`beginner`, `intermediate`, `advanced`) | Difficulty level |
| duration_hours | NUMERIC(5,1) | | CK (>= 0) | Total course length in hours |
| thumbnail_url | VARCHAR(255) | | | Course image URL |
| status | VARCHAR(20) | | NN, CK (`draft`, `published`, `archived`), DEF `draft` | Publication status |
| created_at | TIMESTAMP | | NN, DEF `CURRENT_TIMESTAMP` | Creation time |

**Relationships:**

| Related table | Relationship | Cardinality | Courses participation | Other table participation |
|---|---|---|---|---|
| Instructors | created by | N:1 | Total | Partial |
| Categories | belongs to | N:1 | Total | Partial |
| Course_Languages | offered in | 1:N | Partial | Total |
| Sections | contains | 1:N | Partial (a draft may be empty) | Total |
| Assignments | has | 1:N | Partial | Total |
| Reviews | reviewed by | 1:N | Partial | Total |
| Users (via Enrollments) | enrolled in | M:N | Partial | Partial |
| Orders (via Order_Items) | sold in | M:N | Partial | Partial |

---

## 6. Course_Languages

**Purpose:** Stores each language in which a course is offered as its own row, because one course can support several languages (a multivalued attribute of Courses).

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| course_language_id | SERIAL | PK | NN | Unique identifier of the course language record |
| course_id | INT | FK | NN, references `Courses(course_id)` ON DELETE CASCADE | Course offered in this language |
| language | VARCHAR(50) | | NN | Language of instruction |

**Additional constraint:** UQ (`course_id`, `language`) so a language is not listed twice for one course.

**Relationships:**

| Related table | Relationship | Cardinality | Course_Languages participation | Other table participation |
|---|---|---|---|---|
| Courses | language of | N:1 | Total | Partial |

---

## 7. Sections

**Purpose:** Groups lessons into logical chapters or modules inside a course.

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| section_id | SERIAL | PK | NN | Unique identifier of the section |
| course_id | INT | FK | NN, references `Courses(course_id)` ON DELETE CASCADE | Parent course |
| title | VARCHAR(200) | | NN | Section title |
| section_order | INT | | NN, CK (> 0) | Position within the course |

**Additional constraint:** UQ (`course_id`, `section_order`) so two sections cannot share the same position in a course.

**Relationships:**

| Related table | Relationship | Cardinality | Sections participation | Other table participation |
|---|---|---|---|---|
| Courses | part of (identifying) | N:1 | Total | Partial |
| Lessons | contains | 1:N | Partial | Total |

---

## 8. Lessons

**Purpose:** The individual units of learning content, such as a video, article, or PDF.

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| lesson_id | SERIAL | PK | NN | Unique identifier of the lesson |
| section_id | INT | FK | NN, references `Sections(section_id)` ON DELETE CASCADE | Parent section |
| title | VARCHAR(200) | | NN | Lesson title |
| content_type | VARCHAR(20) | | NN, CK (`video`, `article`, `pdf`) | Type of content |
| content_url | VARCHAR(255) | | | Link to the video or file |
| duration_minutes | INT | | CK (>= 0) | Length of the lesson |
| lesson_order | INT | | NN, CK (> 0) | Position within the section |
| is_preview | BOOLEAN | | DEF `FALSE` | Whether non-enrolled users can view it free |

**Additional constraint:** UQ (`section_id`, `lesson_order`).

**Relationships:**

| Related table | Relationship | Cardinality | Lessons participation | Other table participation |
|---|---|---|---|---|
| Sections | part of (identifying) | N:1 | Total | Partial |
| Lesson_Progress | tracked by | 1:N | Partial | Total |

---

# Learning Activity

## 9. Enrollments

**Purpose:** Records that a student has joined a course. It resolves the many-to-many relationship between Users and Courses.

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| enrollment_id | SERIAL | PK | NN | Unique identifier of the enrollment |
| user_id | INT | FK | NN, references `Users(user_id)` ON DELETE CASCADE | Enrolled student |
| course_id | INT | FK | NN, references `Courses(course_id)` ON DELETE CASCADE | Course joined |
| enrolled_at | TIMESTAMP | | NN, DEF `CURRENT_TIMESTAMP` | Enrollment time |
| progress_percent | NUMERIC(5,2) | | DEF 0, CK (0 to 100) | Overall completion percentage |
| status | VARCHAR(20) | | NN, CK (`active`, `completed`, `dropped`), DEF `active` | Current state |

**Additional constraint:** UQ (`user_id`, `course_id`) so a student cannot enroll twice in the same course.

**Relationships:**

| Related table | Relationship | Cardinality | Enrollments participation | Other table participation |
|---|---|---|---|---|
| Users | made by | N:1 | Total | Partial |
| Courses | for | N:1 | Total | Partial |
| Lesson_Progress | records | 1:N | Partial | Total |
| Certificates | earns | 1:1 | Partial (only completed enrollments) | Total |

---

## 10. Lesson_Progress

**Purpose:** Tracks which lessons a student has completed. Overall course progress is calculated from this table.

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| progress_id | SERIAL | PK | NN | Unique identifier of the progress record |
| enrollment_id | INT | FK | NN, references `Enrollments(enrollment_id)` ON DELETE CASCADE | Related enrollment |
| lesson_id | INT | FK | NN, references `Lessons(lesson_id)` ON DELETE CASCADE | Lesson tracked |
| is_completed | BOOLEAN | | NN, DEF `FALSE` | Whether the lesson is finished |
| completed_at | TIMESTAMP | | | Completion time |
| last_watched_position | INT | | DEF 0, CK (>= 0) | Last playback position in seconds |

**Additional constraint:** UQ (`enrollment_id`, `lesson_id`).

**Relationships:**

| Related table | Relationship | Cardinality | Lesson_Progress participation | Other table participation |
|---|---|---|---|---|
| Enrollments | belongs to | N:1 | Total | Partial |
| Lessons | tracks | N:1 | Total | Partial |

---

## 11. Assignments

**Purpose:** Practical tasks created by an instructor for a course.

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| assignment_id | SERIAL | PK | NN | Unique identifier of the assignment |
| course_id | INT | FK | NN, references `Courses(course_id)` ON DELETE CASCADE | Course the assignment belongs to |
| title | VARCHAR(200) | | NN | Assignment title |
| description | TEXT | | | Instructions for students |
| due_date | TIMESTAMP | | | Submission deadline |
| max_marks | INT | | NN, CK (> 0) | Maximum marks |

**Relationships:**

| Related table | Relationship | Cardinality | Assignments participation | Other table participation |
|---|---|---|---|---|
| Courses | belongs to | N:1 | Total | Partial |
| Submissions | receives | 1:N | Partial | Total |

---

## 12. Submissions

**Purpose:** A student's response to an assignment, along with grading and feedback.

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| submission_id | SERIAL | PK | NN | Unique identifier of the submission |
| assignment_id | INT | FK | NN, references `Assignments(assignment_id)` ON DELETE CASCADE | Assignment answered |
| user_id | INT | FK | NN, references `Users(user_id)` ON DELETE CASCADE | Student who submitted |
| submitted_at | TIMESTAMP | | NN, DEF `CURRENT_TIMESTAMP` | Submission time |
| marks_obtained | NUMERIC(5,2) | | CK (>= 0) | Marks awarded (NULL until graded) |
| feedback | TEXT | | | Instructor feedback |

**Additional constraint:** UQ (`assignment_id`, `user_id`) if only one submission per student is allowed.

**Relationships:**

| Related table | Relationship | Cardinality | Submissions participation | Other table participation |
|---|---|---|---|---|
| Assignments | answers | N:1 | Total | Partial |
| Users | submitted by | N:1 | Total | Partial |
| Submission_Files | contains | 1:N | Partial in the schema (total by business rule) | Total |

---

## 13. Submission_Files

**Purpose:** Stores each file of a submission as its own row, because one submission can contain several files (a multivalued attribute of Submissions).

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| file_id | SERIAL | PK | NN | Unique identifier of the file record |
| submission_id | INT | FK | NN, references `Submissions(submission_id)` ON DELETE CASCADE | Submission the file belongs to |
| file_url | VARCHAR(255) | | NN | Link to the submitted file |

**Relationships:**

| Related table | Relationship | Cardinality | Submission_Files participation | Other table participation |
|---|---|---|---|---|
| Submissions | belongs to | N:1 | Total | Partial |

---

## 14. Certificates

**Purpose:** Issued when a student completes a course.

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| certificate_id | SERIAL | PK | NN | Unique identifier of the certificate |
| enrollment_id | INT | FK, UQ | NN, references `Enrollments(enrollment_id)` ON DELETE CASCADE | Completed enrollment (1:1) |
| certificate_code | VARCHAR(50) | UQ | NN | Public verification code |
| issued_at | TIMESTAMP | | NN, DEF `CURRENT_TIMESTAMP` | Issue time |

**Relationships:**

| Related table | Relationship | Cardinality | Certificates participation | Other table participation |
|---|---|---|---|---|
| Enrollments | issued for (identifying) | 1:1 | Total | Partial |

---

# Commerce

## 15. Orders

**Purpose:** A single checkout made by a user. It may include multiple courses.

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| order_id | SERIAL | PK | NN | Unique identifier of the order |
| user_id | INT | FK | NN, references `Users(user_id)` | User who placed the order |
| total_amount | NUMERIC(10,2) | | NN, CK (>= 0) | Total amount of the order |
| order_status | VARCHAR(20) | | NN, CK (`pending`, `completed`, `cancelled`), DEF `pending` | Status of the order |
| ordered_at | TIMESTAMP | | NN, DEF `CURRENT_TIMESTAMP` | Order time |

**Relationships:**

| Related table | Relationship | Cardinality | Orders participation | Other table participation |
|---|---|---|---|---|
| Users | placed by | N:1 | Total | Partial |
| Order_Items | includes | 1:N | Partial in the schema (total by business rule) | Total |
| Payments | paid through | 1:N | Partial (a pending order may have no payment yet) | Total |

---

## 16. Order_Items

**Purpose:** The individual courses inside an order. It resolves the many-to-many relationship between Orders and Courses.

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| order_item_id | SERIAL | PK | NN | Unique identifier of the order item |
| order_id | INT | FK | NN, references `Orders(order_id)` ON DELETE CASCADE | Parent order |
| course_id | INT | FK | NN, references `Courses(course_id)` | Course purchased |
| price_at_purchase | NUMERIC(10,2) | | NN, CK (>= 0) | Price at the time of purchase |

**Additional constraint:** UQ (`order_id`, `course_id`).

**Note:** `price_at_purchase` preserves the price even if the course price changes later.

**Relationships:**

| Related table | Relationship | Cardinality | Order_Items participation | Other table participation |
|---|---|---|---|---|
| Orders | part of | N:1 | Total | Partial |
| Courses | refers to | N:1 | Total | Partial |

---

## 17. Payments

**Purpose:** Records the financial transaction for an order. An order can have multiple payment attempts.

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| payment_id | SERIAL | PK | NN | Unique identifier of the payment |
| order_id | INT | FK | NN, references `Orders(order_id)` ON DELETE CASCADE | Order being paid |
| amount | NUMERIC(10,2) | | NN, CK (>= 0) | Amount paid |
| payment_method | VARCHAR(30) | | NN, CK (`card`, `upi`, `net_banking`, `wallet`) | Method used |
| payment_status | VARCHAR(20) | | NN, CK (`pending`, `success`, `failed`, `refunded`), DEF `pending` | Status of the transaction |
| transaction_id | VARCHAR(100) | UQ | | Gateway transaction reference |
| paid_at | TIMESTAMP | | | Time payment completed |

**Relationships:**

| Related table | Relationship | Cardinality | Payments participation | Other table participation |
|---|---|---|---|---|
| Orders | settles | N:1 | Total | Partial |

---

# Engagement

## 18. Reviews

**Purpose:** Ratings and written feedback left by students on courses.

| Attribute | Data Type | Key | Constraints | Description |
|-----------|-----------|-----|-------------|-------------|
| review_id | SERIAL | PK | NN | Unique identifier of the review |
| user_id | INT | FK | NN, references `Users(user_id)` ON DELETE CASCADE | Reviewer |
| course_id | INT | FK | NN, references `Courses(course_id)` ON DELETE CASCADE | Course reviewed |
| rating | INT | | NN, CK (1 to 5) | Star rating |
| comment | TEXT | | | Written feedback |
| created_at | TIMESTAMP | | NN, DEF `CURRENT_TIMESTAMP` | Review time |

**Additional constraint:** UQ (`user_id`, `course_id`) so a student reviews a course only once. Ideally only enrolled students can review.

**Relationships:**

| Related table | Relationship | Cardinality | Reviews participation | Other table participation |
|---|---|---|---|---|
| Users | written by | N:1 | Total | Partial |
| Courses | about | N:1 | Total | Partial |

---

# Relationship Summary

| Type | Relationships |
|------|---------------|
| **One-to-One** | Users to Instructors; Enrollments to Certificates |
| **One-to-Many** | Instructors to Courses; Categories to Courses; Courses to Sections; Sections to Lessons; Courses to Assignments; Assignments to Submissions; Users to Orders; Orders to Payments; Instructors to Instructor_Expertise; Courses to Course_Languages; Submissions to Submission_Files |
| **Many-to-Many (junction table)** | Users and Courses via **Enrollments**; Orders and Courses via **Order_Items**; Enrollments and Lessons via **Lesson_Progress**; Users and Courses via **Reviews** |
| **Self-Referencing** | Categories (parent and child) |

---

# Suggested Creation Order

Create tables in this order so that foreign keys always reference tables that already exist:

1. Users
2. Instructors
3. Instructor_Expertise
4. Categories
5. Courses
6. Course_Languages
7. Sections
8. Lessons
9. Orders
10. Order_Items
11. Payments
12. Enrollments
13. Lesson_Progress
14. Assignments
15. Submissions
16. Submission_Files
17. Certificates
18. Reviews

---

# Design Notes (for project justification)

- **Instructors vs Users:** Users stores common identity data for everyone; Instructors stores teaching-specific data. This avoids NULL-heavy columns for students.
- **Payments vs Orders:** An order represents what was bought; a payment represents the money transaction. One order can have several payment attempts (for example a failed one and then a successful one).
- **Scope reduction:** Quizzes (with Questions, Options, Quiz_Attempts), Coupons, Cart, Wishlist, Discussions, and Notifications were removed as non-essential. Assessment is handled by Assignments and Submissions, and checkout goes directly from course to Order.
- **Normalization:** All tables are designed to satisfy 3NF. Many-to-many relationships are resolved through junction tables, and repeating data such as price history is captured with `price_at_purchase`.
