"""Seed the database with demo users, courses, lessons, enrollments and reviews.

Usage: python seed.py
Refuses to run when courses already exist. Demo password for every account: Password123
"""
import random
from datetime import datetime, timedelta

import bcrypt

from db import get_connection

random.seed(42)

DEMO_PASSWORD = "Password123"

CATEGORIES = [
    ("Development", "Code, ship and scale software people love."),
    ("Design", "Interfaces, systems and visual craft."),
    ("Data Science", "Turn raw data into confident decisions."),
    ("Business", "Strategy, product and leadership skills."),
    ("Marketing", "Grow an audience and tell better stories."),
    ("Photography", "Frames, light and editing that stand out."),
]

INSTRUCTORS = [
    ("Maya", "Chen", "maya@coursehub.dev", "Former staff engineer at two unicorns. I teach the patterns I use every day.",
     12),
    ("Andre", "Silva", "andre@coursehub.dev", "Design lead and educator. I care about interfaces that feel effortless.",
     9),
    ("Priya", "Nair", "priya@coursehub.dev", "Data scientist turned teacher. SQL, Python and storytelling with numbers.",
     8),
]

STUDENTS = [
    ("Sam", "Rivera", "sam@coursehub.dev", "India"),
    ("Lena", "Park", "lena@coursehub.dev", "South Korea"),
    ("Diego", "Torres", "diego@coursehub.dev", "Spain"),
    ("Amara", "Okafor", "amara@coursehub.dev", "Nigeria"),
    ("Noah", "Williams", "noah@coursehub.dev", "United States"),
]

VIDEOS = [
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
    "https://media.w3.org/2010/05/sintel/trailer.mp4",
    "https://media.w3.org/2010/05/bunny/trailer.mp4",
    "https://media.w3.org/2010/05/video/movie_300.mp4",
    "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
]

COURSES = [
    {
        "title": "Modern React: From Zero to Production",
        "instructor": "maya@coursehub.dev",
        "category": "Development",
        "price": 79,
        "level": "intermediate",
        "featured": True,
        "description": (
            "Build fast, accessible interfaces with the modern React toolkit. You will move from "
            "components and hooks to routing, data fetching, testing and deployment, finishing with "
            "a portfolio-ready product.\n\n"
            "Every module is hands-on: short lessons, a real project and patterns you can reuse at work. "
            "No toy examples that fall apart outside a tutorial."
        ),
        "sections": [
            ("Thinking in components", ["The React mental model", "JSX and rendering", "Props, state and one-way data", "Composition over inheritance"]),
            ("Hooks and data", ["Effectively using useState", "Effects without the bugs", "Custom hooks that scale", "Fetching, caching and errors"]),
            ("Shipping to production", ["Routing and code splitting", "Forms and validation", "Testing the critical paths", "Deploying with confidence"]),
        ],
    },
    {
        "title": "Python for Data Analysis",
        "instructor": "priya@coursehub.dev",
        "category": "Data Science",
        "price": 59,
        "level": "beginner",
        "featured": True,
        "description": (
            "Learn Python by doing the work analysts actually do. Clean messy spreadsheets, explore "
            "datasets with pandas, visualise the story and present conclusions that hold up.\n\n"
            "Includes a capstone analysis of a real e-commerce dataset with a review of your approach."
        ),
        "sections": [
            ("Python foundations", ["Notebooks and the REPL", "Lists, dicts and loops", "Functions and comprehensions", "Reading files safely"]),
            ("Pandas in practice", ["Series and DataFrames", "Cleaning missing data", "Grouping and aggregation", "Merging datasets"]),
            ("Insights and visuals", ["Matplotlib essentials", "Seaborn for stories", "A capstone analysis", "Presenting your findings"]),
        ],
    },
    {
        "title": "UI/UX Design Foundations",
        "instructor": "andre@coursehub.dev",
        "category": "Design",
        "price": 49,
        "level": "beginner",
        "featured": True,
        "description": (
            "A practical introduction to product design: research, flows, wireframes, visual hierarchy "
            "and usability testing. Finish with a clickable prototype and a case study you can show.\n\n"
            "Perfect for developers who want to design better screens and for new designers building a portfolio."
        ),
        "sections": [
            ("Understand the problem", ["Research without a big budget", "Jobs, pains and gains", "Mapping user journeys", "Defining the problem"]),
            ("Shape the solution", ["Sketching and wireframes", "Layout, spacing and rhythm", "Type and colour systems", "Accessibility from the start"]),
            ("Test and present", ["Prototyping in Figma", "Running a usability test", "Turning feedback into decisions", "Writing the case study"]),
        ],
    },
    {
        "title": "Advanced TypeScript Patterns",
        "instructor": "maya@coursehub.dev",
        "category": "Development",
        "price": 89,
        "level": "advanced",
        "featured": False,
        "description": (
            "Go beyond annotations. Learn generics, conditional types, discriminated unions and "
            "type-safe API design, then apply them to a real codebase without making it unreadable.\n\n"
            "For engineers who already write TypeScript daily and want fewer runtime surprises."
        ),
        "sections": [
            ("Type-level thinking", ["Structural typing in depth", "Generics that compose", "Inference and narrowing", "Readonly and immutability"]),
            ("Patterns that pay off", ["Discriminated unions", "Mapped and conditional types", "Type-safe builders", "Schema-first APIs"]),
            ("Scale and maintain", ["Designing a shared type layer", "Migrating a legacy codebase", "Performance and editor speed", "Reviewing type-heavy PRs"]),
        ],
    },
    {
        "title": "Instagram Marketing Masterclass",
        "instructor": "andre@coursehub.dev",
        "category": "Marketing",
        "price": 39,
        "level": "intermediate",
        "featured": True,
        "description": (
            "Build an Instagram presence that compounds. Positioning, content pillars, Reels that get "
            "watched, carousels that get saved and a measurement routine that keeps you honest.\n\n"
            "Includes templates for a 30-day content calendar and a weekly analytics review."
        ),
        "sections": [
            ("Build the foundation", ["Choosing a sharp niche", "Profile and bio teardown", "Content pillars", "A thirty-day calendar"]),
            ("Create scroll-stopping content", ["Hooks and first frames", "Reels that earn rewatches", "Carousels people save", "Captions and calls to action"]),
            ("Grow and measure", ["Stories and community", "Collaborations and UGC", "Reading your analytics", "Turning followers into customers"]),
        ],
    },
    {
        "title": "SQL & PostgreSQL for Developers",
        "instructor": "priya@coursehub.dev",
        "category": "Development",
        "price": 0,
        "level": "beginner",
        "featured": False,
        "description": (
            "The database skills every developer needs: joins, indexes, transactions, constraints and "
            "query plans explained without the jargon. Everything runs on PostgreSQL.\n\n"
            "Free and beginner friendly. Bring a laptop and a terminal."
        ),
        "sections": [
            ("Getting data out", ["Tables, rows and keys", "Filtering and sorting", "Joins demystified", "Aggregates and grouping"]),
            ("Designing a schema", ["Normalisation in practice", "Constraints that protect you", "Foreign keys and cascades", "Migrations without fear"]),
            ("Performance and safety", ["Indexes, explained", "Reading EXPLAIN", "Transactions and isolation", "Debugging slow queries"]),
        ],
    },
    {
        "title": "Product Strategy for Startups",
        "instructor": "maya@coursehub.dev",
        "category": "Business",
        "price": 69,
        "level": "intermediate",
        "featured": False,
        "description": (
            "Decide what to build next and why. Market mapping, positioning, opportunity sizing, "
            "roadmaps and the operating rhythm that turns strategy into shipped work.\n\n"
            "For founders, product managers and senior engineers who influence direction."
        ),
        "sections": [
            ("Find the wedge", ["Market and competitor mapping", "Jobs to be done", "Sizing an opportunity", "Positioning statements"]),
            ("Choose the work", ["Outcomes over output", "Roadmaps that survive contact", "Prioritisation models", "Saying no with evidence"]),
            ("Make it happen", ["Metrics that matter", "Working with engineering", "Launch and learn loops", "Quarterly planning"]),
        ],
    },
    {
        "title": "Mobile Photography that Pops",
        "instructor": "andre@coursehub.dev",
        "category": "Photography",
        "price": 0,
        "level": "beginner",
        "featured": False,
        "description": (
            "Your phone is a better camera than you think. Learn light, composition, colour and the "
            "editing workflow that makes everyday photos look intentional.\n\n"
            "No gear required beyond the phone in your pocket."
        ),
        "sections": [
            ("See like a photographer", ["Finding good light", "Composition rules and when to break them", "Colour and contrast", "Framing a story"]),
            ("Shoot with intention", ["Portraits on a phone", "Food and flat lays", "Street and travel", "Low light without noise"]),
            ("Edit and share", ["A clean editing workflow", "Presets without the plastic look", "Exporting for social", "Building a portfolio"]),
        ],
    },
    {
        "title": "Design Systems with Figma",
        "instructor": "andre@coursehub.dev",
        "category": "Design",
        "price": 59,
        "level": "intermediate",
        "featured": False,
        "description": (
            "Build a component library your team will actually use. Tokens, variables, variants, "
            "documentation and the habits that keep a design system from rotting.\n\n"
            "Hands-on in Figma with a final audit of your own component set."
        ),
        "sections": [
            ("Foundations", ["Auditing an interface", "Design tokens and variables", "Type and spacing scales", "Naming that scales"]),
            ("Components", ["Building robust components", "Variants and properties", "Patterns for complex widgets", "Documentation in Figma"]),
            ("Adoption", ["Pairing with engineering", "Versioning and releases", "Measuring adoption", "Keeping it alive"]),
        ],
    },
    {
        "title": "Machine Learning Essentials",
        "instructor": "priya@coursehub.dev",
        "category": "Data Science",
        "price": 99,
        "level": "intermediate",
        "featured": True,
        "description": (
            "A grounded introduction to machine learning: the ideas, the workflow and the pitfalls. "
            "Train, evaluate and explain models with scikit-learn, without hand-waving the maths.\n\n"
            "You will finish with a model, an evaluation report and the judgement to know when not to use ML."
        ),
        "sections": [
            ("The ML workflow", ["Framing a prediction problem", "Train, validation and test", "Bias, variance and leakage", "Baselines before models"]),
            ("Core algorithms", ["Linear and logistic regression", "Trees and random forests", "Gradient boosting", "Clustering and dimensionality"]),
            ("Evaluate and explain", ["Metrics that fit the problem", "Cross-validation", "Feature importance and SHAP", "Shipping a model responsibly"]),
        ],
    },
]

REVIEWS = {
    "Modern React: From Zero to Production": [
        (5, "The hooks module alone paid for the course. Clear, practical and zero fluff."),
        (5, "I refactored our dashboard after module two and it is noticeably faster."),
        (4, "Great pace and examples. Would love even more on testing."),
    ],
    "Python for Data Analysis": [
        (5, "Finally a pandas course that uses realistic messy data."),
        (4, "Super clear for a beginner. The capstone was challenging in a good way."),
    ],
    "UI/UX Design Foundations": [
        (5, "Andre explains the why behind every layout decision. My portfolio is much stronger."),
        (4, "Loved the usability testing section. The Figma parts move quickly."),
    ],
    "Instagram Marketing Masterclass": [
        (5, "The content pillar template is now pinned in our team workspace."),
        (4, "Practical and current. The analytics week changed how I plan posts."),
    ],
    "SQL & PostgreSQL for Developers": [
        (5, "I use the EXPLAIN lesson weekly at work. Incredible free course."),
        (5, "Short, sharp and exactly what I needed for backend interviews."),
    ],
    "Machine Learning Essentials": [
        (5, "The leakage warnings saved me from a very embarrassing model."),
        (4, "Solid grounding. The SHAP lesson is excellent."),
    ],
    "Design Systems with Figma": [
        (4, "Very useful for structuring our tokens. Some parts assume a mature team."),
    ],
    "Product Strategy for Startups": [
        (5, "The measurement and prioritisation weeks are gold for a first PM."),
    ],
}


def main():
    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) AS count FROM courses;")
                if cur.fetchone()["count"]:
                    print("Courses already exist - seed skipped. Drop/reset the data to reseed.")
                    return

                password_hash = bcrypt.hashpw(DEMO_PASSWORD.encode(), bcrypt.gensalt()).decode()

                category_ids = {}
                for name, description in CATEGORIES:
                    cur.execute(
                        """INSERT INTO categories (name, description) VALUES (%s, %s)
                           RETURNING category_id;""",
                        (name, description),
                    )
                    category_ids[name] = cur.fetchone()["category_id"]

                instructor_ids = {}
                for first, last, email, bio, years in INSTRUCTORS:
                    cur.execute(
                        """INSERT INTO users (first_name, last_name, email, password_hash, role)
                           VALUES (%s, %s, %s, %s, 'instructor') RETURNING user_id;""",
                        (first, last, email, password_hash),
                    )
                    user_id = cur.fetchone()["user_id"]
                    cur.execute(
                        """INSERT INTO instructors (user_id, bio, years_of_experience)
                           VALUES (%s, %s, %s) RETURNING instructor_id;""",
                        (user_id, bio, years),
                    )
                    instructor_ids[email] = cur.fetchone()["instructor_id"]
                    for expertise in ["Product engineering", "Teaching", "Design"]:
                        cur.execute(
                            """INSERT INTO instructor_expertise (instructor_id, expertise)
                               VALUES (%s, %s) ON CONFLICT DO NOTHING;""",
                            (instructor_ids[email], expertise),
                        )

                student_ids = {}
                for first, last, email, country in STUDENTS:
                    cur.execute(
                        """INSERT INTO users (first_name, last_name, email, password_hash, role, country)
                           VALUES (%s, %s, %s, %s, 'student', %s) RETURNING user_id;""",
                        (first, last, email, password_hash, country),
                    )
                    student_ids[email] = cur.fetchone()["user_id"]

                course_ids = {}
                course_lesson_ids = {}
                for index, course in enumerate(COURSES):
                    cur.execute(
                        """INSERT INTO courses
                               (instructor_id, category_id, title, description, price, level,
                                thumbnail_url, status, created_at)
                           VALUES (%s, %s, %s, %s, %s, %s, NULL, 'published', %s)
                           RETURNING course_id;""",
                        (
                            instructor_ids[course["instructor"]],
                            category_ids[course["category"]],
                            course["title"],
                            course["description"],
                            course["price"],
                            course["level"],
                            datetime.now() - timedelta(days=index * 9 + 3),
                        ),
                    )
                    course_id = cur.fetchone()["course_id"]
                    course_ids[course["title"]] = course_id
                    lesson_ids = []
                    lesson_counter = 0
                    for section_index, (section_title, lessons) in enumerate(course["sections"], 1):
                        cur.execute(
                            """INSERT INTO sections (course_id, title, section_order)
                               VALUES (%s, %s, %s) RETURNING section_id;""",
                            (course_id, section_title, section_index),
                        )
                        section_id = cur.fetchone()["section_id"]
                        for lesson_index, title in enumerate(lessons, 1):
                            duration = 7 + (lesson_counter % 5) * 4 + index % 3
                            cur.execute(
                                """INSERT INTO lessons
                                       (section_id, title, content_type, content_url,
                                        duration_minutes, lesson_order, is_preview)
                                   VALUES (%s, %s, 'video', %s, %s, %s, %s)
                                   RETURNING lesson_id;""",
                                (
                                    section_id,
                                    title,
                                    VIDEOS[lesson_counter % len(VIDEOS)],
                                    duration,
                                    lesson_index,
                                    lesson_counter == 0,
                                ),
                            )
                            lesson_ids.append(cur.fetchone()["lesson_id"])
                            lesson_counter += 1
                    course_lesson_ids[course_id] = lesson_ids
                    cur.execute(
                        """UPDATE courses SET duration_hours = ROUND(
                               (SELECT SUM(duration_minutes) FROM lessons l
                                JOIN sections s ON s.section_id = l.section_id
                                WHERE s.course_id = %s) / 60.0, 2)
                           WHERE course_id = %s;""",
                        (course_id, course_id),
                    )

                # Enroll students in a deterministic spread of courses.
                student_emails = list(student_ids)
                enrollments = {}
                for course_index, (title, course_id) in enumerate(course_ids.items()):
                    for student_index, email in enumerate(student_emails):
                        if (course_index + student_index) % 2 == 0:
                            cur.execute(
                                """INSERT INTO enrollments (user_id, course_id, enrolled_at)
                                   VALUES (%s, %s, %s)
                                   RETURNING enrollment_id;""",
                                (
                                    student_ids[email],
                                    course_id,
                                    datetime.now() - timedelta(days=course_index * 3 + student_index),
                                ),
                            )
                            enrollments[(email, course_id)] = cur.fetchone()["enrollment_id"]

                # Give the demo student visible progress in three courses.
                demo_progress = {
                    "Modern React: From Zero to Production": 0.55,
                    "Python for Data Analysis": 0.3,
                    "SQL & PostgreSQL for Developers": 1.0,
                }
                for title, ratio in demo_progress.items():
                    course_id = course_ids[title]
                    email = "sam@coursehub.dev"
                    enrollment_id = enrollments.get((email, course_id))
                    if not enrollment_id:
                        cur.execute(
                            """INSERT INTO enrollments (user_id, course_id)
                               VALUES (%s, %s) RETURNING enrollment_id;""",
                            (student_ids[email], course_id),
                        )
                        enrollment_id = cur.fetchone()["enrollment_id"]
                        enrollments[(email, course_id)] = enrollment_id
                    lesson_ids = course_lesson_ids[course_id]
                    completed = int(len(lesson_ids) * ratio)
                    for lesson_id in lesson_ids[:completed]:
                        cur.execute(
                            """INSERT INTO lesson_progress
                                   (enrollment_id, lesson_id, is_completed, completed_at)
                               VALUES (%s, %s, TRUE, NOW())
                               ON CONFLICT DO NOTHING;""",
                            (enrollment_id, lesson_id),
                        )
                    percent = round(completed * 100.0 / len(lesson_ids), 2)
                    status = "completed" if completed == len(lesson_ids) else "active"
                    cur.execute(
                        """UPDATE enrollments SET progress_percent = %s, status = %s
                           WHERE enrollment_id = %s;""",
                        (percent, status, enrollment_id),
                    )

                # Reviews from enrolled students, kept unique per user/course.
                for course_index, (title, course_id) in enumerate(course_ids.items()):
                    for review_index, (rating, comment) in enumerate(REVIEWS.get(title, [])):
                        email = student_emails[(course_index + review_index + 1) % len(student_emails)]
                        key = (email, course_id)
                        if key not in enrollments:
                            continue
                        cur.execute(
                            """INSERT INTO reviews (user_id, course_id, rating, comment, created_at)
                               VALUES (%s, %s, %s, %s, %s)
                               ON CONFLICT DO NOTHING;""",
                            (
                                student_ids[email],
                                course_id,
                                rating,
                                comment,
                                datetime.now() - timedelta(days=(review_index + 1) * 2),
                            ),
                        )

                cur.execute(
                    """UPDATE instructors SET rating = (
                           SELECT ROUND(AVG(r.rating)::numeric, 2)
                           FROM reviews r JOIN courses c ON c.course_id = r.course_id
                           WHERE c.instructor_id = instructors.instructor_id);"""
                )
        print("Seeded demo data.")
        print(f"Student login:    sam@coursehub.dev / {DEMO_PASSWORD}")
        print(f"Instructor login: maya@coursehub.dev / {DEMO_PASSWORD}")
        print(f"Instructor login: andre@coursehub.dev / {DEMO_PASSWORD}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
