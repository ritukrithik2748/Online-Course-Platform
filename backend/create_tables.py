from db import get_connection

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    user_id         SERIAL PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'student'
                    CHECK (role IN ('student','instructor','admin')),
    country         VARCHAR(100),
    profile_picture VARCHAR(500),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    category_id        SERIAL PRIMARY KEY,
    name               VARCHAR(100) NOT NULL UNIQUE,
    description        TEXT,
    parent_category_id INT REFERENCES categories(category_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS instructors (
    instructor_id       SERIAL PRIMARY KEY,
    user_id             INT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    bio                 TEXT,
    years_of_experience INT CHECK (years_of_experience >= 0),
    total_earnings      DECIMAL(12,2) NOT NULL DEFAULT 0,
    rating              DECIMAL(3,2) CHECK (rating BETWEEN 0 AND 5)
);

CREATE TABLE IF NOT EXISTS instructor_expertise (
    expertise_id  SERIAL PRIMARY KEY,
    instructor_id INT NOT NULL REFERENCES instructors(instructor_id) ON DELETE CASCADE,
    expertise     VARCHAR(100) NOT NULL,
    UNIQUE (instructor_id, expertise)
);

CREATE TABLE IF NOT EXISTS courses (
    course_id      SERIAL PRIMARY KEY,
    instructor_id  INT NOT NULL REFERENCES instructors(instructor_id),
    category_id    INT NOT NULL REFERENCES categories(category_id),
    title          VARCHAR(200) NOT NULL,
    description    TEXT,
    price          DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    level          VARCHAR(30),
    duration_hours DECIMAL(6,2),
    thumbnail_url  VARCHAR(500),
    status         VARCHAR(20) NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','published','archived')),
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_languages (
    course_language_id SERIAL PRIMARY KEY,
    course_id          INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    language           VARCHAR(50) NOT NULL,
    UNIQUE (course_id, language)
);

CREATE TABLE IF NOT EXISTS sections (
    section_id    SERIAL PRIMARY KEY,
    course_id     INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    section_order INT NOT NULL,
    UNIQUE (course_id, section_order)
);

CREATE TABLE IF NOT EXISTS lessons (
    lesson_id        SERIAL PRIMARY KEY,
    section_id       INT NOT NULL REFERENCES sections(section_id) ON DELETE CASCADE,
    title            VARCHAR(200) NOT NULL,
    content_type     VARCHAR(30)  NOT NULL,
    content_url      VARCHAR(500),
    duration_minutes INT CHECK (duration_minutes >= 0),
    lesson_order     INT NOT NULL,
    is_preview       BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (section_id, lesson_order)
);

CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id    SERIAL PRIMARY KEY,
    user_id          INT NOT NULL REFERENCES users(user_id)   ON DELETE CASCADE,
    course_id        INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    enrolled_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    status           VARCHAR(20) NOT NULL DEFAULT 'active',
    UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
    progress_id           SERIAL PRIMARY KEY,
    enrollment_id         INT NOT NULL REFERENCES enrollments(enrollment_id) ON DELETE CASCADE,
    lesson_id             INT NOT NULL REFERENCES lessons(lesson_id) ON DELETE CASCADE,
    is_completed          BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at          TIMESTAMP,
    last_watched_position INT NOT NULL DEFAULT 0,
    UNIQUE (enrollment_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS assignments (
    assignment_id SERIAL PRIMARY KEY,
    course_id     INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    due_date      TIMESTAMP,
    max_marks     INT NOT NULL CHECK (max_marks > 0)
);

CREATE TABLE IF NOT EXISTS submissions (
    submission_id  SERIAL PRIMARY KEY,
    assignment_id  INT NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
    user_id        INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    submitted_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    marks_obtained INT CHECK (marks_obtained >= 0),
    feedback       TEXT,
    UNIQUE (assignment_id, user_id)
);

CREATE TABLE IF NOT EXISTS submission_files (
    file_id       SERIAL PRIMARY KEY,
    submission_id INT NOT NULL REFERENCES submissions(submission_id) ON DELETE CASCADE,
    file_url      VARCHAR(500) NOT NULL
);

CREATE TABLE IF NOT EXISTS certificates (
    certificate_id   SERIAL PRIMARY KEY,
    enrollment_id    INT NOT NULL UNIQUE REFERENCES enrollments(enrollment_id) ON DELETE CASCADE,
    certificate_code VARCHAR(100) NOT NULL UNIQUE,
    issued_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    order_id     SERIAL PRIMARY KEY,
    user_id      INT NOT NULL REFERENCES users(user_id),
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    order_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    ordered_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id     SERIAL PRIMARY KEY,
    order_id          INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    course_id         INT NOT NULL REFERENCES courses(course_id),
    price_at_purchase DECIMAL(10,2) NOT NULL CHECK (price_at_purchase >= 0),
    UNIQUE (order_id, course_id)
);

CREATE TABLE IF NOT EXISTS payments (
    payment_id     SERIAL PRIMARY KEY,
    order_id       INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    amount         DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(30) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    transaction_id VARCHAR(100) UNIQUE,
    paid_at        TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    review_id  SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(user_id)    ON DELETE CASCADE,
    course_id  INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    rating     INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)
);
"""

if __name__ == "__main__":
    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(SCHEMA)
        print("All 18 tables created")
    finally:
        conn.close()