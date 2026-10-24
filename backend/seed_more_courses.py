"""Add another 250 courses with varied free video URLs"""
import random
from datetime import datetime, timedelta

import bcrypt
from psycopg2.extras import execute_values

from db import get_connection

random.seed(2027)
DEMO_PASSWORD = "Password123"
TARGET_ADD = 250

VIDEO_URLS = [
    "https://media.w3.org/2010/05/sintel/trailer.mp4",
    "https://media.w3.org/2010/05/bunny/trailer.mp4",
    "https://media.w3.org/2010/05/video/movie_300.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
    "https://www.w3schools.com/html/mov_bbb.mp4",
    "https://www.w3schools.com/tags/movie.mp4",
]

CATEGORY_TOPICS = {
    "Development": ["Python Automation", "API Design", "Full Stack Projects", "Clean Code"],
    "Design": ["UI Motion", "3D Design Basics", "Design Systems"],
    "Data Science": ["Data Storytelling", "Time Series", "AutoML"],
    "Business": ["Remote Leadership", "Product Analytics"],
    "Marketing": ["Content Strategy", "AI Marketing"],
    "Photography": ["Cinematography Basics", "Color Grading"],
}

TITLE_PATTERNS = ["{t} Mastery", "Practical {t}", "{t} in Action", "Modern {t}"]
LEVELS = ["beginner", "intermediate", "advanced"]
PRICE_POINTS = [0, 0, 0, 499, 699, 899, 1299, 1599]

def main():
    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("SELECT title FROM courses;")
                existing_titles = {row["title"] for row in cur.fetchall()}
                cur.execute("SELECT category_id, name FROM categories;")
                category_ids = {row["name"]: row["category_id"] for row in cur.fetchall()}
                cur.execute("SELECT instructor_id FROM instructors;")
                instructor_ids = [r["instructor_id"] for r in cur.fetchall()]
                cur.execute("SELECT user_id FROM users WHERE role='student';")
                student_ids = [r["user_id"] for r in cur.fetchall()]
                
                now = datetime.now()
                added = 0
                course_ids_new = []
                lesson_rows = []
                cats = list(CATEGORY_TOPICS.keys())
                while added < TARGET_ADD:
                    cat = random.choice(cats)
                    topics = CATEGORY_TOPICS[cat]
                    topic = random.choice(topics)
                    pattern = random.choice(TITLE_PATTERNS)
                    title = f"{pattern.format(t=topic)} {random.randint(1000,9999)}"
                    if title in existing_titles: continue
                    existing_titles.add(title)
                    level = random.choice(LEVELS)
                    price = random.choice(PRICE_POINTS)
                    duration = round(random.uniform(3.0, 12.0), 1)
                    cur.execute("""INSERT INTO courses
                           (instructor_id, category_id, title, description, price, level,
                            duration_hours, thumbnail_url, status, created_at)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,NULL,'published',%s) RETURNING course_id;""",
                    (random.choice(instructor_ids) if instructor_ids else 1,
                     category_ids[cat], title, f"Learn {topic} with practical projects.",
                     price, level, duration, now - timedelta(days=random.randint(1,300))))
                    cid = cur.fetchone()["course_id"]
                    course_ids_new.append(cid)
                    sections = ["Introduction", "Core Concepts", "Practice", "Final Project"]
                    for si, sec_title in enumerate(sections,1):
                        cur.execute("INSERT INTO sections (course_id,title,section_order) VALUES (%s,%s,%s) RETURNING section_id;",
                                    (cid,sec_title,si))
                        sid = cur.fetchone()["section_id"]
                        for li in range(1,4):
                            lesson_rows.append((sid,f"{sec_title} Lesson {li}","video",random.choice(VIDEO_URLS),
                                               random.randint(5,12),li,(si==1 and li==1)))
                    added += 1
                if lesson_rows:
                    execute_values(cur,"""INSERT INTO lessons (section_id,title,content_type,content_url,duration_minutes,lesson_order,is_preview) VALUES %s;""",lesson_rows)
                enroll_rows=[]; review_rows=[]
                for cid in course_ids_new:
                    if not student_ids: break
                    k=min(random.randint(25,150),len(student_ids))
                    cohort=random.sample(student_ids,k)
                    for uid in cohort:
                        enroll_rows.append((uid,cid,now-timedelta(days=random.randint(1,200)),random.choice([0,30,60,90,100]),'active'))
                    if cohort:
                        rc=max(1,int(len(cohort)*0.15))
                        for uid in random.sample(cohort,min(rc,len(cohort))):
                            review_rows.append((uid,cid,random.choice([5,4,5,4,3]),"Great course!",now-timedelta(days=random.randint(1,150))))
                if enroll_rows:
                    execute_values(cur,"INSERT INTO enrollments (user_id,course_id,enrolled_at,progress_percent,status) VALUES %s ON CONFLICT DO NOTHING;",enroll_rows,template="(%s,%s,%s,%s,%s)")
                if review_rows:
                    execute_values(cur,"INSERT INTO reviews (user_id,course_id,rating,comment,created_at) VALUES %s ON CONFLICT DO NOTHING;",review_rows,template="(%s,%s,%s,%s,%s)")
                cur.execute("SELECT COUNT(*) as count FROM courses;")
                print(f'Added {added} courses. Total: {cur.fetchone()["count"]}')
    finally:
        conn.close()

if __name__=='__main__': main()
