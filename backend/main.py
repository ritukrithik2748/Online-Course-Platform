from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
import psycopg2
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

import config
from db import run_query

app = FastAPI(title="Online Course API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer = HTTPBearer()
bearer_optional = HTTPBearer(auto_error=False)


# ---------- request shapes ----------
class RegisterIn(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    role: str = "student"          # "student" or "instructor"

class LoginIn(BaseModel):
    email: str
    password: str

class CategoryIn(BaseModel):
    name: str
    description: Optional[str] = None

class CourseIn(BaseModel):
    category_id: int
    title: str
    description: Optional[str] = None
    price: float = 0
    level: Optional[str] = None

class EnrollIn(BaseModel):
    course_id: int
class SectionIn(BaseModel):
    title: str
    section_order: int

class LessonIn(BaseModel):
    title: str
    content_type: str                 # for example: video, article, quiz
    content_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    lesson_order: int
    is_preview: bool = False

# ---------- helpers ----------
def make_token(user_id: int) -> str:
    payload = {"sub": str(user_id),
               "exp": datetime.now(timezone.utc) + timedelta(hours=12)}
    return jwt.encode(payload, config.SECRET_KEY, algorithm="HS256")

def current_user_id(cred: HTTPAuthorizationCredentials = Depends(bearer)) -> int:
    try:
        data = jwt.decode(cred.credentials, config.SECRET_KEY, algorithms=["HS256"])
        return int(data["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def current_instructor_id(user_id: int = Depends(current_user_id)) -> int:
    row = run_query("SELECT instructor_id FROM instructors WHERE user_id = %s;",
                    (user_id,), fetch="one")
    if not row:
        raise HTTPException(status_code=403, detail="Only instructors can do this")
    return row["instructor_id"]
def optional_user_id(cred: Optional[HTTPAuthorizationCredentials] = Depends(bearer_optional)):
    if not cred:
        return None
    try:
        data = jwt.decode(cred.credentials, config.SECRET_KEY, algorithms=["HS256"])
        return int(data["sub"])
    except Exception:
        return None

def require_course_owner(course_id: int, instructor_id: int):
    row = run_query("SELECT instructor_id FROM courses WHERE course_id = %s;",
                    (course_id,), fetch="one")
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")
    if row["instructor_id"] != instructor_id:
        raise HTTPException(status_code=403, detail="This is not your course")

def refresh_course_duration(course_id: int):
    run_query("""UPDATE courses SET duration_hours = COALESCE((
                   SELECT SUM(l.duration_minutes) FROM lessons l
                   JOIN sections s ON s.section_id = l.section_id
                   WHERE s.course_id = %s), 0) / 60.0
                 WHERE course_id = %s;""", (course_id, course_id), fetch=None)


# ---------- accounts ----------
@app.post("/api/register", status_code=201)
def register(body: RegisterIn):
    if body.role not in ("student", "instructor"):
        raise HTTPException(status_code=400, detail="role must be student or instructor")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    try:
        user = run_query(
            """INSERT INTO users (first_name, last_name, email, password_hash, role)
               VALUES (%s, %s, %s, %s, %s)
               RETURNING user_id, first_name, last_name, email, role;""",
            (body.first_name, body.last_name, body.email, hashed, body.role),
            fetch="one")
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="Email already registered")
    if body.role == "instructor":
        run_query("INSERT INTO instructors (user_id) VALUES (%s);",
                  (user["user_id"],), fetch=None)
    return {"user": user, "token": make_token(user["user_id"])}

@app.post("/api/login")
def login(body: LoginIn):
    user = run_query("SELECT * FROM users WHERE email = %s AND is_active = TRUE;",
                     (body.email,), fetch="one")
    if not user or not bcrypt.checkpw(body.password.encode(),
                                      user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    return {"user": {"user_id": user["user_id"], "first_name": user["first_name"],
                     "email": user["email"], "role": user["role"]},
            "token": make_token(user["user_id"])}


# ---------- categories ----------
@app.get("/api/categories")
def list_categories():
    return run_query("SELECT category_id, name, description FROM categories ORDER BY name;")

@app.post("/api/categories", status_code=201)
def create_category(body: CategoryIn, instructor_id: int = Depends(current_instructor_id)):
    try:
        return run_query(
            """INSERT INTO categories (name, description) VALUES (%s, %s)
               RETURNING category_id, name, description;""",
            (body.name, body.description), fetch="one")
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="Category already exists")


# ---------- courses ----------
@app.get("/api/courses")
def list_courses():
    return run_query("""
        SELECT c.course_id, c.title, c.description, c.price, c.level,
               cat.name AS category,
               u.first_name || ' ' || u.last_name AS instructor
        FROM courses c
        JOIN categories cat ON cat.category_id = c.category_id
        JOIN instructors i  ON i.instructor_id = c.instructor_id
        JOIN users u        ON u.user_id = i.user_id
        WHERE c.status = 'published'
        ORDER BY c.created_at DESC;""")

@app.get("/api/courses/{course_id}")
def get_course(course_id: int):
    course = run_query("SELECT * FROM courses WHERE course_id = %s;",
                       (course_id,), fetch="one")
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@app.post("/api/courses", status_code=201)
def create_course(body: CourseIn, instructor_id: int = Depends(current_instructor_id)):
    try:
        return run_query(
            """INSERT INTO courses (instructor_id, category_id, title, description,
                                    price, level, status)
               VALUES (%s, %s, %s, %s, %s, %s, 'published')
               RETURNING course_id, title, price, status;""",
            (instructor_id, body.category_id, body.title, body.description,
             body.price, body.level), fetch="one")
    except psycopg2.errors.ForeignKeyViolation:
        raise HTTPException(status_code=404, detail="Category not found")
    except psycopg2.errors.CheckViolation:
        raise HTTPException(status_code=400, detail="Price cannot be negative")


# ---------- enrollment ----------
@app.post("/api/enroll", status_code=201)
def enroll(body: EnrollIn, user_id: int = Depends(current_user_id)):
    try:
        return run_query(
            """INSERT INTO enrollments (user_id, course_id) VALUES (%s, %s)
               RETURNING enrollment_id, course_id, enrolled_at;""",
            (user_id, body.course_id), fetch="one")
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="Already enrolled")
    except psycopg2.errors.ForeignKeyViolation:
        raise HTTPException(status_code=404, detail="Course not found")

@app.get("/api/my-courses")
def my_courses(user_id: int = Depends(current_user_id)):
    return run_query("""
        SELECT c.course_id, c.title, e.progress_percent, e.status
        FROM enrollments e JOIN courses c ON c.course_id = e.course_id
        WHERE e.user_id = %s;""", (user_id,))
# ---------- sections and lessons ----------
@app.post("/api/courses/{course_id}/sections", status_code=201)
def create_section(course_id: int, body: SectionIn,
                   instructor_id: int = Depends(current_instructor_id)):
    require_course_owner(course_id, instructor_id)
    try:
        return run_query(
            """INSERT INTO sections (course_id, title, section_order)
               VALUES (%s, %s, %s)
               RETURNING section_id, course_id, title, section_order;""",
            (course_id, body.title, body.section_order), fetch="one")
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="That section order already exists")

@app.post("/api/sections/{section_id}/lessons", status_code=201)
def create_lesson(section_id: int, body: LessonIn,
                  instructor_id: int = Depends(current_instructor_id)):
    sec = run_query("SELECT course_id FROM sections WHERE section_id = %s;",
                    (section_id,), fetch="one")
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")
    require_course_owner(sec["course_id"], instructor_id)
    try:
        lesson = run_query(
            """INSERT INTO lessons (section_id, title, content_type, content_url,
                                    duration_minutes, lesson_order, is_preview)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               RETURNING lesson_id, section_id, title, lesson_order, is_preview;""",
            (section_id, body.title, body.content_type, body.content_url,
             body.duration_minutes, body.lesson_order, body.is_preview), fetch="one")
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="That lesson order already exists")
    except psycopg2.errors.CheckViolation:
        raise HTTPException(status_code=400, detail="Duration cannot be negative")
    refresh_course_duration(sec["course_id"])
    return lesson

@app.get("/api/courses/{course_id}/content")
def course_content(course_id: int, user_id: Optional[int] = Depends(optional_user_id)):
    course = run_query("SELECT instructor_id FROM courses WHERE course_id = %s;",
                       (course_id,), fetch="one")
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    has_access = False
    if user_id:
        enrolled = run_query("SELECT 1 FROM enrollments WHERE user_id = %s AND course_id = %s;",
                             (user_id, course_id), fetch="one")
        owner = run_query("SELECT 1 FROM instructors WHERE user_id = %s AND instructor_id = %s;",
                          (user_id, course["instructor_id"]), fetch="one")
        has_access = bool(enrolled or owner)

    sections = run_query("""SELECT section_id, title, section_order FROM sections
                            WHERE course_id = %s ORDER BY section_order;""", (course_id,))
    lessons = run_query("""SELECT l.lesson_id, l.section_id, l.title, l.content_type,
                                  l.content_url, l.duration_minutes, l.lesson_order, l.is_preview
                           FROM lessons l JOIN sections s ON s.section_id = l.section_id
                           WHERE s.course_id = %s ORDER BY l.lesson_order;""", (course_id,))
    for s in sections:
        s["lessons"] = []
        for l in lessons:
            if l["section_id"] == s["section_id"]:
                item = dict(l)
                if not has_access and not l["is_preview"]:
                    item["content_url"] = None      # hide paid content
                s["lessons"].append(item)
    return {"course_id": course_id, "has_access": has_access, "sections": sections}