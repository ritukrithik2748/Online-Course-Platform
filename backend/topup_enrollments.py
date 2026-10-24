"""Top up enrollments and reviews so popular courses show realistic student counts.

The initial seeder under-collected student IDs (execute_values RETURNING pages),
so every course landed at ~40-50 students. This script reads the full student
pool with a plain SELECT and enrolls more students per course (target 60-600),
adding reviews along the way. Non-destructive: uses ON CONFLICT DO NOTHING.
Run: python topup_enrollments.py
"""
import random
from datetime import datetime, timedelta

import bcrypt
from psycopg2.extras import execute_values

from db import get_connection

random.seed(777)


def main():
    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("SELECT user_id FROM users WHERE role='student';")
                student_ids = [r["user_id"] for r in cur.fetchall()]
                if not student_ids:
                    print("No students found. Run seed_catalog.py first.")
                    return

                cur.execute(
                    """SELECT c.course_id, COUNT(e.enrollment_id) AS current_count
                       FROM courses c LEFT JOIN enrollments e ON e.course_id = c.course_id
                       GROUP BY c.course_id;"""
                )
                course_counts = {r["course_id"]: r["current_count"] for r in cur.fetchall()}

                now = datetime.now()
                enroll_rows = []
                review_rows = []
                for course_id, current in course_counts.items():
                    target = random.randint(60, 600)
                    deficit = target - current
                    if deficit <= 0:
                        # Still maybe add a couple reviews if none exist.
                        deficit = 0
                    if deficit > 0:
                        # Sample students not already enrolled is hard; rely on ON CONFLICT.
                        picks = random.sample(student_ids, min(deficit + 20, len(student_ids)))
                        enrolled = now - timedelta(days=random.randint(1, 500))
                        for uid in picks:
                            enroll_rows.append((
                                uid, course_id, enrolled,
                                random.choice([0, 0, 10, 35, 60, 100]), "active",
                            ))

                # Reviews: ensure a healthy number per course from enrolled students.
                cur.execute(
                    """SELECT e.course_id, e.user_id FROM enrollments e
                       WHERE e.course_id IN (SELECT course_id FROM courses);"""
                )
                enrolled_pairs = {}
                for r in cur.fetchall():
                    enrolled_pairs.setdefault(r["course_id"], []).append(r["user_id"])

                for course_id, users in enrolled_pairs.items():
                    cur.execute(
                        "SELECT COUNT(*) AS c FROM reviews WHERE course_id=%s;", (course_id,)
                    )
                    have = cur.fetchone()["c"]
                    want = max(12, int(len(users) * 0.2))
                    need = want - have
                    if need <= 0:
                        continue
                    reviewers = random.sample(users, min(need, len(users)))
                    for uid in reviewers:
                        rating = random.choices([5, 4, 3, 2, 1], weights=[46, 32, 14, 5, 3])[0]
                        review_rows.append((
                            uid, course_id, rating,
                            random.choice([
                                "Excellent — practical and clear. Used it at work right away.",
                                "Great value. The projects made it stick.",
                                "Well structured and easy to follow. Recommended.",
                                "Learned a lot in a short time. Good pace.",
                                "Solid fundamentals with real examples.",
                            ]),
                            now - timedelta(days=random.randint(1, 400)),
                        ))

                if enroll_rows:
                    execute_values(
                        cur,
                        """INSERT INTO enrollments (user_id, course_id, enrolled_at, progress_percent, status)
                           VALUES %s ON CONFLICT DO NOTHING;""",
                        enroll_rows,
                        template="(%s, %s, %s, %s, %s)",
                        page_size=1000,
                    )
                if review_rows:
                    execute_values(
                        cur,
                        """INSERT INTO reviews (user_id, course_id, rating, comment, created_at)
                           VALUES %s ON CONFLICT DO NOTHING;""",
                        review_rows,
                        template="(%s, %s, %s, %s, %s)",
                        page_size=1000,
                    )

                cur.execute(
                    """UPDATE instructors SET rating = (
                           SELECT ROUND(AVG(r.rating)::numeric, 2)
                           FROM reviews r JOIN courses c ON c.course_id = r.course_id
                           WHERE c.instructor_id = instructors.instructor_id);"""
                )
                cur.execute(
                    """SELECT (SELECT COUNT(*) FROM enrollments) AS en,
                              (SELECT COUNT(*) FROM reviews) AS rv,
                              (SELECT MAX(c) FROM (SELECT COUNT(*) c FROM enrollments GROUP BY course_id) x) AS mx;"""
                )
                row = cur.fetchone()
        print(f"Enrollments={row['en']} Reviews={row['rv']} MaxPerCourse={row['mx']}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
