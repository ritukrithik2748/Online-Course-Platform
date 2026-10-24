"""Add a large, realistic course catalog on top of the existing demo data.

- Creates extra instructors and a pool of students.
- Adds courses (Coursera/Udemy-style) across all categories with ₹ prices.
- Enrolls students and writes reviews so star ratings and student counts show.

Idempotent by title: skips any course whose title already exists.
Run: python seed_catalog.py
"""
import random
from datetime import datetime, timedelta

import bcrypt
from psycopg2.extras import execute_values

from db import get_connection

random.seed(2026)
DEMO_PASSWORD = "Password123"
TARGET_TOTAL = 250

# ---------------------------------------------------------------- categories
CATEGORY_TOPICS = {
    "Development": [
        "Python", "JavaScript", "React", "Node.js", "Django", "Spring Boot", "Java", "C#",
        ".NET", "Go", "Rust", "Kotlin", "Swift", "Flutter", "AWS", "Docker", "Kubernetes",
        "Git & GitHub", "REST APIs", "Microservices", "Frontend Architecture", "Next.js",
        "TypeScript", "GraphQL", "PostgreSQL", "MongoDB", "Redis", "System Design",
        "Data Structures & Algorithms", "Cybersecurity", "Ethical Hacking", "Blockchain",
        "Game Development with Unity", "Solidity", "DevOps", "CI/CD with GitHub Actions",
        "Terraform", "Selenium Testing", "Jest", "Cypress", "Android Development",
        "iOS & SwiftUI", "Vue.js", "Angular", "Svelte",
    ],
    "Design": [
        "Figma", "Adobe Photoshop", "Adobe Illustrator", "After Effects", "Premiere Pro",
        "UX Research", "UI Design", "Interaction Design", "Motion Graphics", "Graphic Design",
        "Branding", "Typography", "Logo Design", "Web Design", "Product Design",
        "Design Thinking", "Usability Testing", "Wireframing", "Prototyping",
        "Design Systems", "Blender 3D", "Video Editing", "Color Theory", "Digital Illustration",
        "Icon Design", "Portfolio Design", "Adobe XD", "Character Design",
    ],
    "Data Science": [
        "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Data Analysis with Pandas",
        "NumPy", "Statistics", "R Programming", "SQL for Data", "Data Visualization",
        "Tableau", "Power BI", "Excel for Data", "Business Analytics", "Natural Language Processing",
        "Computer Vision", "Reinforcement Learning", "MLOps", "Time Series Forecasting",
        "A/B Testing", "Big Data with Spark", "Data Engineering", "Airflow", "dbt",
        "Feature Engineering", "Prompt Engineering", "Generative AI", "Large Language Models",
        "Predictive Modeling", "Bayesian Statistics", "Regression Analysis", "Clustering",
    ],
    "Business": [
        "Product Management", "Project Management", "Finance", "Accounting", "Stock Market Trading",
        "Investing", "Entrepreneurship", "Startup Fundamentals", "Leadership", "Management",
        "Operations", "Supply Chain", "Human Resources", "Negotiation", "Business Communication",
        "Public Speaking", "Business Analysis", "Business Strategy", "E-commerce", "Retail",
        "Real Estate", "Banking", "CFA Exam Prep", "Six Sigma", "PMP Exam Prep", "Agile & Scrum",
        "Salesforce", "Excel for Business", "No-Code Apps", "Shopify Stores", "Amazon FBA",
    ],
    "Marketing": [
        "Digital Marketing", "SEO", "Google Ads", "Facebook Ads", "Instagram Marketing",
        "Social Media Marketing", "Content Marketing", "Email Marketing", "Copywriting",
        "Affiliate Marketing", "Influencer Marketing", "YouTube Marketing", "TikTok Marketing",
        "LinkedIn Marketing", "Google Analytics", "Marketing Automation", "HubSpot",
        "Conversion Optimization", "Growth Hacking", "Market Research", "Advertising",
        "Video Marketing", "Podcast Marketing", "WordPress", "Blogging", "E-commerce Marketing",
    ],
    "Photography": [
        "Photography", "iPhone Photography", "Portrait Photography", "Wedding Photography",
        "Wildlife Photography", "Landscape Photography", "Street Photography", "Food Photography",
        "Product Photography", "Real Estate Photography", "Astrophotography", "Macro Photography",
        "Drone Photography", "Black and White Photography", "Photo Editing in Lightroom",
        "Composition", "Studio Lighting", "DSLR Basics", "Mirrorless Cameras", "Videography",
        "Cinematography", "DaVinci Resolve", "Color Grading", "Music Production",
        "Audio Engineering", "Guitar", "Piano", "Drawing", "Digital Painting", "Procreate",
    ],
}

TITLE_PATTERNS = [
    "Complete {t} Bootcamp",
    "{t} Masterclass: From Beginner to Pro",
    "The Complete {t} Course",
    "{t} for Beginners",
    "Advanced {t} Techniques",
    "{t}: Hands-on Projects",
    "Ultimate {t} Guide",
    "{t} A-Z: Build Real Projects",
    "Real-World {t}",
    "{t} Bootcamp 2026",
    "Learn {t} from Scratch",
    "{t} Deep Dive",
    "Professional {t} Secrets",
    "{t} in Practice",
    "Crash Course in {t}",
]

LEVELS = ["beginner", "intermediate", "advanced"]
PRICE_POINTS = [0, 0, 499, 699, 899, 1299, 1599, 1899, 2499, 2999, 3499, 3999, 4999]

INSTRUCTOR_NAMES = [
    ("Arjun", "Mehta"), ("Sofia", "Rossi"), ("Daniel", "Kim"), ("Elena", "Petrova"),
    ("Marcus", "Johnson"), ("Ayesha", "Khan"), ("Tom", "Baker"), ("Yuki", "Tanaka"),
    ("Priya", "Sharma"), ("Liam", "O'Brien"), ("Nadia", "Ali"), ("Carlos", "Mendez"),
]

STUDENT_FIRST = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan",
    "Rohan", "Ananya", "Diya", "Aadhya", "Saanvi", "Myra", "Anika", "Navya", "Pari", "Riya",
    "Meera", "Zara", "Aryan", "Kabir", "Advait", "Dhruv", "Kian", "Omar", "Leo", "Noah",
    "Emma", "Olivia", "Ava", "Sophia", "Mia", "Isabella", "Amelia", "Haruto", "Min-jun",
    "Wei", "Chen", "Fatima", "Layla", "Amina", "Yusuf", "Diego", "Lucas", "Mateo", "Valentina",
]
STUDENT_LAST = [
    "Sharma", "Verma", "Patel", "Singh", "Gupta", "Kumar", "Das", "Banerjee", "Nair", "Reddy",
    "Chen", "Wang", "Kim", "Park", "Tanaka", "Sato", "Alvarez", "Garcia", "Rodriguez", "Lopez",
    "O'Brien", "Murphy", "Walsh", "Ali", "Hassan", "Khan", "Ahmed", "Okafor", "Mensah", "Diallo",
    "Rossi", "Conti", "Ferrari", "Muller", "Schmidt", "Novak", "Ivanov", "Popescu", "Kowalski",
]
COUNTRIES = [
    "India", "United States", "United Kingdom", "Canada", "Australia", "Germany", "France",
    "Japan", "South Korea", "Brazil", "Spain", "Italy", "Netherlands", "Nigeria", "Egypt",
    "United Arab Emirates", "Singapore", "Mexico", "Poland", "Sweden",
]

REVIEW_COMMENTS = [
    "Excellent course — practical and well structured. I applied it at work the same week.",
    "Clear explanations and real projects. Worth every rupee.",
    "The instructor knows the material deeply and teaches it without the jargon.",
    "Short lessons that respect your time. Great for busy schedules.",
    "Starts gentle and ramps up nicely. I finished with a real portfolio piece.",
    "Best online course I have taken this year. Highly recommended.",
    "Good pacing and the resources are genuinely useful. A few sections felt quick.",
    "I came in as a total beginner and left confident. Thank you!",
    "Concrete examples instead of theory dumps. Exactly what I wanted.",
    "The final project tied everything together. Solid value.",
    "Well organised and up to date with current best practices.",
    "Learned more here than in a semester of lectures.",
]


def build_courses(existing_titles):
    """Deterministically compose course definitions until TARGET_TOTAL is reached."""
    per_category = {name: [] for name in CATEGORY_TOPICS}
    counters = {name: 0 for name in CATEGORY_TOPICS}
    cats = list(CATEGORY_TOPICS)
    pattern_i = 0
    courses = []
    while True:
        cat = cats[len(courses) % len(cats)]
        topics = CATEGORY_TOPICS[cat]
        topic = topics[counters[cat] % len(topics)]
        counters[cat] += 1
        pattern = TITLE_PATTERNS[pattern_i % len(TITLE_PATTERNS)]
        pattern_i += 1
        title = pattern.format(t=topic)
        # De-duplicate within category by appending a track tag on collision.
        base = title
        suffix_n = 2
        while title in existing_titles or title in per_category[cat]:
            title = f"{base} ({['Part 2','Pro','Plus','Specialization','Master track'][suffix_n % 5]} {suffix_n})"
            suffix_n += 1
        level = random.choice(LEVELS)
        price = random.choice(PRICE_POINTS)
        duration = round(random.uniform(2.0, 22.0), 1)
        per_category[cat].append(title)
        courses.append({
            "title": title,
            "category": cat,
            "level": level,
            "price": price,
            "duration": duration,
        })
        if sum(len(v) for v in per_category.values()) >= TARGET_TOTAL - len(existing_titles):
            break
    return courses


def main():
    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("SELECT title FROM courses;")
                existing_titles = {row["title"] for row in cur.fetchall()}
                cur.execute("SELECT category_id, name FROM categories;")
                category_ids = {row["name"]: row["category_id"] for row in cur.fetchall()}

                password_hash = bcrypt.hashpw(DEMO_PASSWORD.encode(), bcrypt.gensalt()).decode()

                # --- instructors ---
                cur.execute("SELECT instructor_id FROM instructors;")
                existing_instructors = [r["instructor_id"] for r in cur.fetchall()]
                instructor_ids = list(existing_instructors)
                cat_instructors = {}
                for i, (first, last) in enumerate(INSTRUCTOR_NAMES):
                    cur.execute(
                        """INSERT INTO users (first_name, last_name, email, password_hash, role)
                           VALUES (%s, %s, %s, %s, 'instructor') RETURNING user_id;""",
                        (first, last, f"{first.lower()}.{last.lower().replace(chr(39),'')}@demo.learnova.com", password_hash),
                    )
                    uid = cur.fetchone()["user_id"]
                    cur.execute(
                        """INSERT INTO instructors (user_id, bio, years_of_experience)
                           VALUES (%s, %s, %s) RETURNING instructor_id;""",
                        (uid, f"{first} {last} — practitioner and educator with industry experience.", random.randint(4, 18)),
                    )
                    instructor_ids.append(cur.fetchone()["instructor_id"])
                for cat in CATEGORY_TOPICS:
                    random.shuffle(instructor_ids)
                    cat_instructors[cat] = instructor_ids[:6]

                # --- student pool ---
                existing_student_ids = []
                cur.execute("SELECT user_id FROM users WHERE role='student';")
                existing_student_ids = [r["user_id"] for r in cur.fetchall()]
                student_ids = list(existing_student_ids)
                needed = max(0, 550 - len(student_ids))
                student_rows = []
                for _ in range(needed):
                    first = random.choice(STUDENT_FIRST)
                    last = random.choice(STUDENT_LAST)
                    email = f"{first.lower()}.{last.lower().replace(chr(39),'')}.{random.randint(1000,999999)}@learner.demo"
                    student_rows.append((first, last, email, password_hash, random.choice(COUNTRIES)))
                if student_rows:
                    execute_values(
                        cur,
                        """INSERT INTO users (first_name, last_name, email, password_hash, role, country)
                           VALUES %s RETURNING user_id;""",
                        student_rows,
                        template="(%s, %s, %s, %s, 'student', %s)",
                    )
                    student_ids.extend(r["user_id"] for r in cur.fetchall())

                # --- courses ---
                new_courses = build_courses(existing_titles)
                now = datetime.now()
                course_ids = []
                lesson_rows = []
                section_rows = []
                for idx, course in enumerate(new_courses):
                    cur.execute(
                        """INSERT INTO courses
                               (instructor_id, category_id, title, description, price, level,
                                duration_hours, thumbnail_url, status, created_at)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, NULL, 'published', %s)
                           RETURNING course_id;""",
                        (
                            random.choice(cat_instructors[course["category"]]),
                            category_ids[course["category"]],
                            course["title"],
                            f"Learn {course['title'].split(':')[0]} with hands-on projects, clear lessons and real-world examples. "
                            f"This {course['level']} course takes you from fundamentals to a portfolio-ready outcome.",
                            course["price"],
                            course["level"],
                            course["duration"],
                            now - timedelta(days=random.randint(1, 700)),
                        ),
                    )
                    cid = cur.fetchone()["course_id"]
                    course_ids.append(cid)
                    sections = ["Getting Started", "Core Concepts", "Advanced Techniques", "Real-World Projects"]
                    lesson_n = 0
                    for si, sec_title in enumerate(sections, 1):
                        cur.execute(
                            """INSERT INTO sections (course_id, title, section_order)
                               VALUES (%s, %s, %s) RETURNING section_id;""",
                            (cid, sec_title, si),
                        )
                        sid = cur.fetchone()["section_id"]
                        for li in range(1, 5):
                            lesson_rows.append((
                                sid,
                                f"{sec_title} — lesson {li}",
                                "video",
                                "https://media.w3.org/2010/05/sintel/trailer.mp4",
                                random.randint(6, 22),
                                li,
                                lesson_n == 0,
                            ))
                            lesson_n += 1

                execute_values(
                    cur,
                    """INSERT INTO lessons (section_id, title, content_type, content_url,
                                            duration_minutes, lesson_order, is_preview)
                       VALUES %s;""",
                    lesson_rows,
                )

                # --- enrollments + reviews ---
                enroll_rows = []
                review_rows = []
                now = datetime.now()
                for cid in course_ids:
                    k = random.randint(40, min(420, len(student_ids)))
                    cohort = random.sample(student_ids, k)
                    for uid in cohort:
                        enrolled = now - timedelta(days=random.randint(1, 500))
                        enroll_rows.append((uid, cid, enrolled, random.choice([0, 0, 10, 35, 60, 100]), "active"))
                    # ~18% of the cohort leaves a review, weighted to higher ratings.
                    reviewer_count = max(1, int(k * 0.18))
                    for uid in random.sample(cohort, reviewer_count):
                        rating = random.choices([5, 4, 3, 2, 1], weights=[46, 32, 14, 5, 3])[0]
                        review_rows.append((
                            uid, cid, rating, random.choice(REVIEW_COMMENTS),
                            now - timedelta(days=random.randint(1, 400)),
                        ))

                execute_values(
                    cur,
                    """INSERT INTO enrollments (user_id, course_id, enrolled_at, progress_percent, status)
                       VALUES %s ON CONFLICT DO NOTHING;""",
                    enroll_rows,
                    template="(%s, %s, %s, %s, %s)",
                )
                execute_values(
                    cur,
                    """INSERT INTO reviews (user_id, course_id, rating, comment, created_at)
                       VALUES %s ON CONFLICT DO NOTHING;""",
                    review_rows,
                    template="(%s, %s, %s, %s, %s)",
                )

                # Refresh instructor ratings.
                cur.execute(
                    """UPDATE instructors SET rating = (
                           SELECT ROUND(AVG(r.rating)::numeric, 2)
                           FROM reviews r JOIN courses c ON c.course_id = r.course_id
                           WHERE c.instructor_id = instructors.instructor_id);"""
                )
                cur.execute("SELECT COUNT(*) AS count FROM courses;")
                total = cur.fetchone()["count"]

        print(f"Seeded {len(new_courses)} new courses. Catalog total: {total}.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
