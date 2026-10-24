import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

import bcrypt
import jwt
import psycopg2
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, EmailStr, Field
import os
import uuid
from pathlib import Path

import config
from db import run_query, transaction

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("course-api")

app = FastAPI(
    title="Online Course API",
    version="1.1.0",
    description="Backend for the Instagram-themed online course platform.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

bearer = HTTPBearer()
bearer_optional = HTTPBearer(auto_error=False)

Role = Literal["student", "instructor"]
Level = Literal["beginner", "intermediate", "advanced"]
CourseStatus = Literal["draft", "published", "archived"]
ContentType = Literal["video", "article", "pdf"]


# ---------- request shapes ----------
class RegisterIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: Role = "student"


class LoginIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ProfileIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    country: Optional[str] = Field(None, max_length=60)
    profile_picture: Optional[str] = Field(None, max_length=500)
    bio: Optional[str] = Field(None, max_length=2000)
    years_of_experience: Optional[int] = Field(None, ge=0, le=60)


class PasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


class CategoryIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)


class CourseIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    category_id: int
    title: str = Field(min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=10000)
    price: float = Field(0, ge=0, le=1_000_000)
    level: Optional[Level] = None
    thumbnail_url: Optional[str] = Field(None, max_length=500)
    status: CourseStatus = "published"


class CourseUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    category_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=10000)
    price: Optional[float] = Field(None, ge=0, le=1_000_000)
    level: Optional[Level] = None
    thumbnail_url: Optional[str] = Field(None, max_length=500)
    status: Optional[CourseStatus] = None


class SectionIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    section_order: int = Field(ge=1, le=1000)


class SectionUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    section_order: Optional[int] = Field(None, ge=1, le=1000)


class LessonIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    content_type: ContentType
    content_url: Optional[str] = Field(None, max_length=500)
    duration_minutes: Optional[int] = Field(None, ge=0, le=10000)
    lesson_order: int = Field(ge=1, le=1000)
    is_preview: bool = False


class LessonUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content_type: Optional[ContentType] = None
    content_url: Optional[str] = Field(None, max_length=500)
    duration_minutes: Optional[int] = Field(None, ge=0, le=10000)
    lesson_order: Optional[int] = Field(None, ge=1, le=1000)
    is_preview: Optional[bool] = None


class EnrollIn(BaseModel):
    course_id: int


class ProgressIn(BaseModel):
    is_completed: bool = True
    last_watched_position: int = Field(0, ge=0)


class ReviewIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=2000)


# ---------- helpers ----------
def make_token(user) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user["user_id"]),
        "role": user["role"],
        "iat": now,
        "exp": now + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, config.SECRET_KEY, algorithm="HS256")


def public_user(row) -> dict:
    keys = ("user_id", "first_name", "last_name", "email", "role",
            "country", "profile_picture", "created_at")
    return {key: row.get(key) for key in keys}


def decode_token(credentials: HTTPAuthorizationCredentials) -> dict:
    try:
        return jwt.decode(
            credentials.credentials,
            config.SECRET_KEY,
            algorithms=["HS256"],
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user(cred: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    payload = decode_token(cred)
    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = run_query(
        """SELECT user_id, first_name, last_name, email, role, country,
                  profile_picture, is_active, created_at
           FROM users WHERE user_id = %s;""",
        (user_id,), fetch="one",
    )
    if not user or not user["is_active"]:
        raise HTTPException(status_code=401, detail="Account not found or deactivated")
    return dict(user)


def optional_user(cred: Optional[HTTPAuthorizationCredentials] = Depends(bearer_optional)):
    if not cred:
        return None
    try:
        return get_current_user(cred)
    except HTTPException:
        return None


def get_instructor(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] not in ("instructor", "admin"):
        raise HTTPException(status_code=403, detail="Only instructors can do this")
    row = run_query("SELECT instructor_id FROM instructors WHERE user_id = %s;",
                    (user["user_id"],), fetch="one")
    if not row:
        raise HTTPException(status_code=403, detail="Instructor profile missing")
    return {**user, "instructor_id": row["instructor_id"]}


def require_course_owner(course_id: int, instructor_id: int) -> dict:
    row = run_query(
        """SELECT course_id, instructor_id, status, title
           FROM courses WHERE course_id = %s;""",
        (course_id,), fetch="one",
    )
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")
    if row["instructor_id"] != instructor_id:
        raise HTTPException(status_code=403, detail="This is not your course")
    return dict(row)


def course_access(course: dict, user: Optional[dict]) -> tuple[bool, bool]:
    """Return (is_enrolled, is_owner)."""
    if not user:
        return False, False
    owner = run_query(
        "SELECT 1 FROM instructors WHERE user_id = %s AND instructor_id = %s;",
        (user["user_id"], course["instructor_id"]), fetch="one",
    )
    enrolled = run_query(
        "SELECT 1 FROM enrollments WHERE user_id = %s AND course_id = %s;",
        (user["user_id"], course["course_id"]), fetch="one",
    )
    return bool(enrolled), bool(owner)


def refresh_course_duration(course_id: int) -> None:
    run_query(
        """UPDATE courses SET duration_hours = COALESCE((
               SELECT ROUND(SUM(l.duration_minutes) / 60.0, 2)
               FROM lessons l JOIN sections s ON s.section_id = l.section_id
               WHERE s.course_id = %s), 0)
           WHERE course_id = %s;""",
        (course_id, course_id), fetch=None,
    )


def enrollment_progress(enrollment_id: int, course_id: int) -> dict:
    stats = run_query(
        """SELECT COUNT(l.lesson_id) AS total,
                  COUNT(*) FILTER (WHERE lp.is_completed) AS done
           FROM sections s
           LEFT JOIN lessons l ON l.section_id = s.section_id
           LEFT JOIN lesson_progress lp
                  ON lp.lesson_id = l.lesson_id AND lp.enrollment_id = %s
           WHERE s.course_id = %s;""",
        (enrollment_id, course_id), fetch="one",
    )
    total = stats["total"] or 0
    done = stats["done"] or 0
    percent = round(done * 100.0 / total, 2) if total else 0
    status = "completed" if total and done == total else "active"
    row = run_query(
        """UPDATE enrollments SET progress_percent = %s, status = %s
           WHERE enrollment_id = %s
           RETURNING enrollment_id, progress_percent, status;""",
        (percent, status, enrollment_id), fetch="one",
    )
    return dict(row)


def recalculate_course_progress(course_id: int) -> None:
    enrollments = run_query(
        "SELECT enrollment_id FROM enrollments WHERE course_id = %s;",
        (course_id,),
    )
    for row in enrollments:
        enrollment_progress(row["enrollment_id"], course_id)


def course_sections(course_id: int, has_access: bool, enrollment_id: Optional[int]):
    sections = run_query(
        """SELECT section_id, title, section_order
           FROM sections WHERE course_id = %s ORDER BY section_order;""",
        (course_id,),
    )
    lessons = run_query(
        """SELECT l.lesson_id, l.section_id, l.title, l.content_type,
                  l.content_url, l.duration_minutes, l.lesson_order, l.is_preview,
                  COALESCE(lp.is_completed, FALSE) AS is_completed,
                  COALESCE(lp.last_watched_position, 0) AS last_watched_position
           FROM lessons l
           JOIN sections s ON s.section_id = l.section_id
           LEFT JOIN lesson_progress lp
                  ON lp.lesson_id = l.lesson_id AND lp.enrollment_id = %s
           WHERE s.course_id = %s
           ORDER BY s.section_order, l.lesson_order;""",
        (enrollment_id, course_id),
    )
    result = []
    for section in sections:
        item = dict(section)
        item["lessons"] = []
        for lesson in lessons:
            if lesson["section_id"] != section["section_id"]:
                continue
            lesson_item = dict(lesson)
            if not has_access and not lesson["is_preview"]:
                lesson_item["content_url"] = None  # hide paid content
            item["lessons"].append(lesson_item)
        result.append(item)
    return result


def rating_summary(course_id: int) -> dict:
    rows = run_query(
        "SELECT rating, COUNT(*) AS count FROM reviews WHERE course_id = %s GROUP BY rating;",
        (course_id,),
    )
    distribution = {str(star): 0 for star in range(1, 6)}
    total = 0
    weighted = 0
    for row in rows:
        distribution[str(row["rating"])] = row["count"]
        total += row["count"]
        weighted += row["rating"] * row["count"]
    return {
        "average": round(weighted / total, 2) if total else 0,
        "count": total,
        "distribution": distribution,
    }


# ---------- accounts ----------
@app.get("/api/health")
def health():
    try:
        run_query("SELECT 1;", fetch="one")
    except psycopg2.Error:
        return JSONResponse(status_code=503, content={"status": "error", "database": "unavailable"})
    return {"status": "ok", "database": "ok"}


@app.post("/api/register", status_code=201)
def register(body: RegisterIn):
    email = body.email.lower().strip()
    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    try:
        with transaction() as cur:
            cur.execute(
                """WITH new_user AS (
                       INSERT INTO users (first_name, last_name, email, password_hash, role)
                       VALUES (%s, %s, %s, %s, %s)
                       RETURNING user_id, first_name, last_name, email, role, country,
                                 profile_picture, created_at
                   ), new_instructor AS (
                       INSERT INTO instructors (user_id)
                       SELECT user_id FROM new_user WHERE role = 'instructor'
                       RETURNING instructor_id
                   )
                   SELECT u.*, (SELECT instructor_id FROM new_instructor LIMIT 1) AS instructor_id
                   FROM new_user u;""",
                (body.first_name, body.last_name, email, hashed, body.role),
            )
            user = dict(cur.fetchone())
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="Email already registered")
    return {
        "user": public_user(user),
        "token": make_token(user),
        "expires_in": config.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@app.post("/api/login")
def login(body: LoginIn):
    user = run_query(
        """SELECT user_id, first_name, last_name, email, password_hash, role,
                  country, profile_picture, created_at
           FROM users WHERE email = %s AND is_active = TRUE;""",
        (body.email.lower().strip(),), fetch="one",
    )
    if not user or not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    return {
        "user": public_user(user),
        "token": make_token(user),
        "expires_in": config.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


class GoogleLoginIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    credential: str = Field(min_length=20)


def _verify_google_credential(credential: str) -> dict:
    """Verify a Google ID token via the tokeninfo endpoint and return its payload."""
    import json
    import urllib.parse
    import urllib.request

    url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + urllib.parse.quote(credential)
    try:
        with urllib.request.urlopen(url, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=401, detail="Google sign-in failed. Please try again.")

    audience = payload.get("aud")
    if config.GOOGLE_CLIENT_ID and audience != config.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Invalid Google sign-in token.")
    if not payload.get("email") or payload.get("email_verified") not in (True, "true"):
        raise HTTPException(status_code=401, detail="Google account email is not verified.")
    return payload


@app.post("/api/auth/google")
def google_login(body: GoogleLoginIn):
    payload = _verify_google_credential(body.credential)
    email = payload["email"].lower().strip()
    first_name = (payload.get("given_name") or email.split("@")[0]).strip()
    last_name = (payload.get("family_name") or "").strip()
    picture = payload.get("picture")

    user = run_query(
        """SELECT user_id, first_name, last_name, email, password_hash, role,
                  country, profile_picture, created_at
           FROM users WHERE email = %s AND is_active = TRUE;""",
        (email,), fetch="one",
    )

    if not user:
        try:
            with transaction() as cur:
                cur.execute(
                    """INSERT INTO users (first_name, last_name, email, password_hash, role,
                                          profile_picture)
                       VALUES (%s, %s, %s, %s, %s, %s)
                       RETURNING user_id, first_name, last_name, email, role, country,
                                 profile_picture, created_at;""",
                    (first_name, last_name, email, bcrypt.gensalt().decode(), "student", picture),
                )
                user = dict(cur.fetchone())
        except psycopg2.errors.UniqueViolation:
            user = run_query(
                """SELECT user_id, first_name, last_name, email, password_hash, role,
                          country, profile_picture, created_at
                   FROM users WHERE email = %s AND is_active = TRUE;""",
                (email,), fetch="one",
            )
    elif picture and not user.get("profile_picture"):
        run_query(
            "UPDATE users SET profile_picture = %s WHERE user_id = %s;",
            (picture, user["user_id"]), fetch="none",
        )

    return {
        "user": public_user(user),
        "token": make_token(user),
        "expires_in": config.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@app.get("/api/me")
def get_me(user: dict = Depends(get_current_user)):
    result = {"user": public_user(user), "instructor": None}
    instructor = run_query(
        """SELECT instructor_id, bio, years_of_experience, rating, total_earnings
           FROM instructors WHERE user_id = %s;""",
        (user["user_id"],), fetch="one",
    )
    if instructor:
        expertise = run_query(
            "SELECT expertise FROM instructor_expertise WHERE instructor_id = %s ORDER BY expertise;",
            (instructor["instructor_id"],),
        )
        result["instructor"] = {**dict(instructor),
                                "expertise": [row["expertise"] for row in expertise]}
    return result


@app.patch("/api/me")
def update_me(body: ProfileIn, user: dict = Depends(get_current_user)):
    fields = body.model_dump(exclude_unset=True)
    bio = fields.pop("bio", None)
    years = fields.pop("years_of_experience", None)
    if not fields and bio is None and years is None:
        raise HTTPException(status_code=400, detail="Nothing to update")

    if fields:
        columns = ", ".join(f"{column} = %s" for column in fields)
        values = list(fields.values()) + [user["user_id"]]
        run_query(f"UPDATE users SET {columns} WHERE user_id = %s;", values, fetch=None)

    instructor = run_query("SELECT instructor_id FROM instructors WHERE user_id = %s;",
                           (user["user_id"],), fetch="one")
    if instructor and (bio is not None or years is not None):
        if bio is not None:
            run_query("UPDATE instructors SET bio = %s WHERE instructor_id = %s;",
                      (bio, instructor["instructor_id"]), fetch=None)
        if years is not None:
            run_query("UPDATE instructors SET years_of_experience = %s WHERE instructor_id = %s;",
                      (years, instructor["instructor_id"]), fetch=None)

    updated = run_query(
        """SELECT user_id, first_name, last_name, email, role, country,
                  profile_picture, created_at
           FROM users WHERE user_id = %s;""",
        (user["user_id"],), fetch="one",
    )
    return {"user": public_user(updated)}


@app.post("/api/me/password")
def change_password(body: PasswordIn, user: dict = Depends(get_current_user)):
    row = run_query("SELECT password_hash FROM users WHERE user_id = %s;",
                    (user["user_id"],), fetch="one")
    if not bcrypt.checkpw(body.current_password.encode(), row["password_hash"].encode()):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if body.current_password == body.new_password:
        raise HTTPException(status_code=400, detail="New password must be different")
    hashed = bcrypt.hashpw(body.new_password.encode(), bcrypt.gensalt()).decode()
    run_query("UPDATE users SET password_hash = %s WHERE user_id = %s;",
              (hashed, user["user_id"]), fetch=None)
    return {"message": "Password updated"}


@app.post("/api/me/avatar")
async def upload_avatar(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    allowed = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, GIF, or WebP images allowed")
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    if ext not in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
        ext = ".jpg"
    filename = f"{user['user_id']}_{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / "profile" / filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")
    with open(dest, "wb") as f:
        f.write(content)
    url = f"/uploads/profile/{filename}"
    run_query("UPDATE users SET profile_picture = %s WHERE user_id = %s;", (url, user["user_id"]), fetch=None)
    return {"profile_picture": url}


# ---------- categories ----------
@app.get("/api/categories")
def list_categories():
    return run_query(
        """SELECT cat.category_id, cat.name, cat.description,
                  COUNT(c.course_id) FILTER (WHERE c.status = 'published') AS course_count
           FROM categories cat
           LEFT JOIN courses c ON c.category_id = cat.category_id
           GROUP BY cat.category_id, cat.name, cat.description
           ORDER BY cat.name;"""
    )


@app.post("/api/categories", status_code=201)
def create_category(body: CategoryIn, instructor: dict = Depends(get_instructor)):
    try:
        return run_query(
            """INSERT INTO categories (name, description) VALUES (%s, %s)
               RETURNING category_id, name, description;""",
            (body.name, body.description), fetch="one",
        )
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="Category already exists")


# ---------- courses ----------
@app.get("/api/courses")
def list_courses(
    search: Optional[str] = Query(None, max_length=200),
    category_id: Optional[int] = None,
    level: Optional[Level] = None,
    price: Optional[Literal["free", "paid"]] = None,
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    sort: Literal["newest", "oldest", "popular", "rating", "price_asc", "price_desc"] = "newest",
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
):
    conditions = ["c.status = 'published'"]
    params: list = []

    if search:
        like = f"%{search.strip()}%"
        conditions.append(
            "(c.title ILIKE %s OR c.description ILIKE %s "
            "OR (u.first_name || ' ' || u.last_name) ILIKE %s OR cat.name ILIKE %s)"
        )
        params.extend([like, like, like, like])
    if category_id:
        conditions.append("c.category_id = %s")
        params.append(category_id)
    if level:
        conditions.append("c.level = %s")
        params.append(level)
    if price == "free":
        conditions.append("c.price = 0")
    elif price == "paid":
        conditions.append("c.price > 0")
    if min_price is not None:
        conditions.append("c.price >= %s")
        params.append(min_price)
    if max_price is not None:
        conditions.append("c.price <= %s")
        params.append(max_price)
    if min_rating is not None:
        conditions.append("COALESCE(rv.rating, 0) >= %s")
        params.append(min_rating)

    where = " AND ".join(conditions)
    order_by = {
        "newest": "c.created_at DESC, c.course_id DESC",
        "oldest": "c.created_at ASC, c.course_id ASC",
        "popular": "student_count DESC, rating DESC, c.course_id DESC",
        "rating": "rating DESC, review_count DESC, c.course_id DESC",
        "price_asc": "c.price ASC, c.course_id DESC",
        "price_desc": "c.price DESC, c.course_id DESC",
    }[sort]

    base_from = """
        FROM courses c
        JOIN categories cat ON cat.category_id = c.category_id
        JOIN instructors i  ON i.instructor_id = c.instructor_id
        JOIN users u        ON u.user_id = i.user_id
        LEFT JOIN LATERAL (
            SELECT ROUND(AVG(r.rating)::numeric, 2) AS rating, COUNT(*) AS review_count
            FROM reviews r WHERE r.course_id = c.course_id
        ) rv ON TRUE
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS student_count
            FROM enrollments e WHERE e.course_id = c.course_id
        ) en ON TRUE
    """
    total = run_query(f"SELECT COUNT(*) AS total {base_from} WHERE {where};",
                      params, fetch="scalar")
    offset = (page - 1) * page_size
    items = run_query(
        f"""SELECT c.course_id, c.title, c.description, c.price, c.level,
                   c.duration_hours, c.thumbnail_url, c.status, c.created_at,
                   c.category_id, cat.name AS category,
                   u.first_name || ' ' || u.last_name AS instructor,
                   u.profile_picture AS instructor_avatar,
                   COALESCE(rv.rating, 0) AS rating,
                   COALESCE(rv.review_count, 0) AS review_count,
                   COALESCE(en.student_count, 0) AS student_count
            {base_from}
            WHERE {where}
            ORDER BY {order_by}
            LIMIT %s OFFSET %s;""",
        params + [page_size, offset],
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil((total or 0) / page_size),
    }


@app.get("/api/courses/{course_id}")
def get_course(course_id: int, user: Optional[dict] = Depends(optional_user)):
    course = run_query(
        """SELECT c.*, cat.name AS category,
                  i.bio AS instructor_bio, i.years_of_experience,
                  i.rating AS instructor_rating,
                  u.first_name AS instructor_first_name,
                  u.last_name AS instructor_last_name,
                  u.profile_picture AS instructor_avatar,
                  COALESCE(rv.rating, 0) AS rating,
                  COALESCE(rv.review_count, 0) AS review_count,
                  COALESCE(en.student_count, 0) AS student_count,
                  COALESCE(sc.section_count, 0) AS section_count,
                  COALESCE(sc.lesson_count, 0) AS lesson_count,
                  COALESCE(sc.lesson_minutes, 0) AS lesson_minutes
           FROM courses c
           JOIN categories cat ON cat.category_id = c.category_id
           JOIN instructors i  ON i.instructor_id = c.instructor_id
           JOIN users u        ON u.user_id = i.user_id
           LEFT JOIN LATERAL (
               SELECT ROUND(AVG(r.rating)::numeric, 2) AS rating, COUNT(*) AS review_count
               FROM reviews r WHERE r.course_id = c.course_id
           ) rv ON TRUE
           LEFT JOIN LATERAL (
               SELECT COUNT(*) AS student_count
               FROM enrollments e WHERE e.course_id = c.course_id
           ) en ON TRUE
           LEFT JOIN LATERAL (
               SELECT COUNT(DISTINCT s.section_id) AS section_count,
                      COUNT(l.lesson_id) AS lesson_count,
                      COALESCE(SUM(l.duration_minutes), 0) AS lesson_minutes
               FROM sections s
               LEFT JOIN lessons l ON l.section_id = s.section_id
               WHERE s.course_id = c.course_id
           ) sc ON TRUE
           WHERE c.course_id = %s;""",
        (course_id,), fetch="one",
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    is_enrolled, is_owner = course_access(course, user)
    is_admin = bool(user and user["role"] == "admin")
    if course["status"] != "published" and not (is_owner or is_admin):
        raise HTTPException(status_code=404, detail="Course not found")

    has_access = is_enrolled or is_owner or is_admin
    enrollment = None
    progress = 0
    enrollment_status = None
    if user:
        enrollment = run_query(
            """SELECT enrollment_id, progress_percent, status
               FROM enrollments WHERE user_id = %s AND course_id = %s;""",
            (user["user_id"], course_id), fetch="one",
        )
        if enrollment:
            progress = float(enrollment["progress_percent"])
            enrollment_status = enrollment["status"]

    instructor_courses = run_query(
        "SELECT COUNT(*) AS count FROM courses WHERE instructor_id = %s AND status = 'published';",
        (course["instructor_id"],), fetch="scalar",
    )

    return {
        "course_id": course["course_id"],
        "title": course["title"],
        "description": course["description"],
        "price": course["price"],
        "level": course["level"],
        "duration_hours": course["duration_hours"],
        "thumbnail_url": course["thumbnail_url"],
        "status": course["status"],
        "created_at": course["created_at"],
        "category": {"category_id": course["category_id"], "name": course["category"]},
        "instructor": {
            "instructor_id": course["instructor_id"],
            "name": f"{course['instructor_first_name']} {course['instructor_last_name']}",
            "first_name": course["instructor_first_name"],
            "last_name": course["instructor_last_name"],
            "bio": course["instructor_bio"],
            "years_of_experience": course["years_of_experience"],
            "rating": course["instructor_rating"],
            "profile_picture": course["instructor_avatar"],
            "courses_count": instructor_courses,
        },
        "rating": course["rating"],
        "review_count": course["review_count"],
        "student_count": course["student_count"],
        "section_count": course["section_count"],
        "lesson_count": course["lesson_count"],
        "is_enrolled": is_enrolled,
        "is_owner": is_owner,
        "has_access": has_access,
        "progress_percent": progress,
        "enrollment_status": enrollment_status,
        "sections": course_sections(
            course_id, has_access,
            enrollment["enrollment_id"] if enrollment else None,
        ),
    }


@app.post("/api/courses", status_code=201)
def create_course(body: CourseIn, instructor: dict = Depends(get_instructor)):
    try:
        course = run_query(
            """INSERT INTO courses (instructor_id, category_id, title, description,
                                    price, level, thumbnail_url, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
               RETURNING course_id, title, price, level, status, thumbnail_url;""",
            (instructor["instructor_id"], body.category_id, body.title, body.description,
             body.price, body.level, body.thumbnail_url, body.status),
            fetch="one",
        )
    except psycopg2.errors.ForeignKeyViolation:
        raise HTTPException(status_code=404, detail="Category not found")
    except psycopg2.errors.CheckViolation:
        raise HTTPException(status_code=400, detail="Invalid course data")
    return course


@app.patch("/api/courses/{course_id}")
def update_course(course_id: int, body: CourseUpdate,
                  instructor: dict = Depends(get_instructor)):
    require_course_owner(course_id, instructor["instructor_id"])
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="Nothing to update")
    allowed = {"category_id", "title", "description", "price", "level",
               "thumbnail_url", "status"}
    updates = {key: value for key, value in fields.items() if key in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    columns = ", ".join(f"{column} = %s" for column in updates)
    try:
        return run_query(
            f"""UPDATE courses SET {columns} WHERE course_id = %s
                RETURNING course_id, title, description, price, level,
                          thumbnail_url, status;""",
            list(updates.values()) + [course_id], fetch="one",
        )
    except psycopg2.errors.ForeignKeyViolation:
        raise HTTPException(status_code=404, detail="Category not found")
    except psycopg2.errors.CheckViolation:
        raise HTTPException(status_code=400, detail="Invalid course data")


@app.delete("/api/courses/{course_id}")
def delete_course(course_id: int, instructor: dict = Depends(get_instructor)):
    require_course_owner(course_id, instructor["instructor_id"])
    try:
        run_query("DELETE FROM courses WHERE course_id = %s;", (course_id,), fetch=None)
    except psycopg2.errors.ForeignKeyViolation:
        raise HTTPException(
            status_code=409,
            detail="This course has orders attached and cannot be deleted. Archive it instead.",
        )
    return {"message": "Course deleted"}


# ---------- sections and lessons ----------
@app.post("/api/courses/{course_id}/sections", status_code=201)
def create_section(course_id: int, body: SectionIn,
                   instructor: dict = Depends(get_instructor)):
    require_course_owner(course_id, instructor["instructor_id"])
    try:
        return run_query(
            """INSERT INTO sections (course_id, title, section_order)
               VALUES (%s, %s, %s)
               RETURNING section_id, course_id, title, section_order;""",
            (course_id, body.title, body.section_order), fetch="one",
        )
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="That section order already exists")


@app.patch("/api/sections/{section_id}")
def update_section(section_id: int, body: SectionUpdate,
                   instructor: dict = Depends(get_instructor)):
    section = run_query("SELECT course_id FROM sections WHERE section_id = %s;",
                        (section_id,), fetch="one")
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    require_course_owner(section["course_id"], instructor["instructor_id"])
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="Nothing to update")
    columns = ", ".join(f"{column} = %s" for column in fields)
    try:
        return run_query(
            f"""UPDATE sections SET {columns} WHERE section_id = %s
                RETURNING section_id, course_id, title, section_order;""",
            list(fields.values()) + [section_id], fetch="one",
        )
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="That section order already exists")


@app.delete("/api/sections/{section_id}")
def delete_section(section_id: int, instructor: dict = Depends(get_instructor)):
    section = run_query("SELECT course_id FROM sections WHERE section_id = %s;",
                        (section_id,), fetch="one")
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    require_course_owner(section["course_id"], instructor["instructor_id"])
    run_query("DELETE FROM sections WHERE section_id = %s;", (section_id,), fetch=None)
    refresh_course_duration(section["course_id"])
    recalculate_course_progress(section["course_id"])
    return {"message": "Section deleted"}


@app.post("/api/sections/{section_id}/lessons", status_code=201)
def create_lesson(section_id: int, body: LessonIn,
                  instructor: dict = Depends(get_instructor)):
    section = run_query("SELECT course_id FROM sections WHERE section_id = %s;",
                        (section_id,), fetch="one")
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    require_course_owner(section["course_id"], instructor["instructor_id"])
    try:
        lesson = run_query(
            """INSERT INTO lessons (section_id, title, content_type, content_url,
                                    duration_minutes, lesson_order, is_preview)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               RETURNING lesson_id, section_id, title, content_type, content_url,
                         duration_minutes, lesson_order, is_preview;""",
            (section_id, body.title, body.content_type, body.content_url,
             body.duration_minutes, body.lesson_order, body.is_preview), fetch="one",
        )
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="That lesson order already exists")
    refresh_course_duration(section["course_id"])
    return lesson


@app.patch("/api/lessons/{lesson_id}")
def update_lesson(lesson_id: int, body: LessonUpdate,
                  instructor: dict = Depends(get_instructor)):
    lesson = run_query(
        """SELECT s.course_id FROM lessons l
           JOIN sections s ON s.section_id = l.section_id
           WHERE l.lesson_id = %s;""",
        (lesson_id,), fetch="one",
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    require_course_owner(lesson["course_id"], instructor["instructor_id"])
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="Nothing to update")
    columns = ", ".join(f"{column} = %s" for column in fields)
    try:
        result = run_query(
            f"""UPDATE lessons SET {columns} WHERE lesson_id = %s
                RETURNING lesson_id, section_id, title, content_type, content_url,
                          duration_minutes, lesson_order, is_preview;""",
            list(fields.values()) + [lesson_id], fetch="one",
        )
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="That lesson order already exists")
    refresh_course_duration(lesson["course_id"])
    recalculate_course_progress(lesson["course_id"])
    return result


@app.delete("/api/lessons/{lesson_id}")
def delete_lesson(lesson_id: int, instructor: dict = Depends(get_instructor)):
    lesson = run_query(
        """SELECT s.course_id FROM lessons l
           JOIN sections s ON s.section_id = l.section_id
           WHERE l.lesson_id = %s;""",
        (lesson_id,), fetch="one",
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    require_course_owner(lesson["course_id"], instructor["instructor_id"])
    run_query("DELETE FROM lessons WHERE lesson_id = %s;", (lesson_id,), fetch=None)
    refresh_course_duration(lesson["course_id"])
    recalculate_course_progress(lesson["course_id"])
    return {"message": "Lesson deleted"}


# ---------- enrollment and learning ----------
@app.post("/api/enroll", status_code=201)
def enroll(body: EnrollIn, user: dict = Depends(get_current_user)):
    course = run_query(
        "SELECT course_id, instructor_id, status FROM courses WHERE course_id = %s;",
        (body.course_id,), fetch="one",
    )
    if not course or course["status"] != "published":
        raise HTTPException(status_code=404, detail="Course not found")

    owner = run_query(
        "SELECT 1 FROM instructors WHERE user_id = %s AND instructor_id = %s;",
        (user["user_id"], course["instructor_id"]), fetch="one",
    )
    if owner:
        raise HTTPException(status_code=400, detail="You cannot enroll in your own course")

    try:
        return run_query(
            """INSERT INTO enrollments (user_id, course_id) VALUES (%s, %s)
               RETURNING enrollment_id, course_id, enrolled_at, progress_percent, status;""",
            (user["user_id"], body.course_id), fetch="one",
        )
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="Already enrolled")
    except psycopg2.errors.ForeignKeyViolation:
        raise HTTPException(status_code=404, detail="Course not found")


@app.get("/api/my-courses")
def my_courses(user: dict = Depends(get_current_user)):
    return run_query(
        """SELECT e.enrollment_id, e.course_id, e.progress_percent, e.status,
                  e.enrolled_at, c.title, c.thumbnail_url, c.level, c.price,
                  c.duration_hours, c.description,
                  cat.name AS category,
                  u.first_name || ' ' || u.last_name AS instructor,
                  COALESCE(st.total_lessons, 0) AS total_lessons,
                  COALESCE(st.completed_lessons, 0) AS completed_lessons,
                  nxt.lesson_id AS next_lesson_id,
                  nxt.title AS next_lesson_title
           FROM enrollments e
           JOIN courses c ON c.course_id = e.course_id
           JOIN categories cat ON cat.category_id = c.category_id
           JOIN instructors i ON i.instructor_id = c.instructor_id
           JOIN users u ON u.user_id = i.user_id
           LEFT JOIN LATERAL (
               SELECT COUNT(l.lesson_id) AS total_lessons,
                      COUNT(*) FILTER (WHERE lp.is_completed) AS completed_lessons
               FROM sections s
               LEFT JOIN lessons l ON l.section_id = s.section_id
               LEFT JOIN lesson_progress lp
                      ON lp.lesson_id = l.lesson_id AND lp.enrollment_id = e.enrollment_id
               WHERE s.course_id = c.course_id
           ) st ON TRUE
           LEFT JOIN LATERAL (
               SELECT l.lesson_id, l.title
               FROM sections s
               JOIN lessons l ON l.section_id = s.section_id
               LEFT JOIN lesson_progress lp
                      ON lp.lesson_id = l.lesson_id AND lp.enrollment_id = e.enrollment_id
               WHERE s.course_id = c.course_id AND COALESCE(lp.is_completed, FALSE) = FALSE
               ORDER BY s.section_order, l.lesson_order
               LIMIT 1
           ) nxt ON TRUE
           WHERE e.user_id = %s
           ORDER BY e.enrolled_at DESC;""",
        (user["user_id"],),
    )


@app.get("/api/courses/{course_id}/content")
def course_content(course_id: int, user: Optional[dict] = Depends(optional_user)):
    course = run_query(
        """SELECT c.course_id, c.instructor_id, c.status, c.title, c.price,
                  c.level, c.duration_hours, c.thumbnail_url, cat.name AS category
           FROM courses c JOIN categories cat ON cat.category_id = c.category_id
           WHERE c.course_id = %s;""",
        (course_id,), fetch="one",
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    is_enrolled, is_owner = course_access(course, user)
    is_admin = bool(user and user["role"] == "admin")
    if course["status"] != "published" and not (is_owner or is_admin):
        raise HTTPException(status_code=404, detail="Course not found")

    has_access = is_enrolled or is_owner or is_admin
    enrollment = None
    if user:
        enrollment = run_query(
            """SELECT enrollment_id, progress_percent, status
               FROM enrollments WHERE user_id = %s AND course_id = %s;""",
            (user["user_id"], course_id), fetch="one",
        )

    sections = course_sections(
        course_id, has_access,
        enrollment["enrollment_id"] if enrollment else None,
    )
    completed = [
        lesson["lesson_id"]
        for section in sections for lesson in section["lessons"]
        if lesson["is_completed"]
    ]
    return {
        "course_id": course_id,
        "title": course["title"],
        "category": course["category"],
        "price": course["price"],
        "level": course["level"],
        "duration_hours": course["duration_hours"],
        "thumbnail_url": course["thumbnail_url"],
        "status": course["status"],
        "has_access": has_access,
        "is_enrolled": is_enrolled,
        "is_owner": is_owner,
        "progress_percent": float(enrollment["progress_percent"]) if enrollment else 0,
        "enrollment_status": enrollment["status"] if enrollment else None,
        "completed_lesson_ids": completed,
        "sections": sections,
    }


@app.post("/api/lessons/{lesson_id}/progress")
def update_progress(lesson_id: int, body: ProgressIn,
                    user: dict = Depends(get_current_user)):
    lesson = run_query(
        """SELECT l.lesson_id, s.course_id FROM lessons l
           JOIN sections s ON s.section_id = l.section_id
           WHERE l.lesson_id = %s;""",
        (lesson_id,), fetch="one",
    )
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    enrollment = run_query(
        """SELECT enrollment_id FROM enrollments
           WHERE user_id = %s AND course_id = %s;""",
        (user["user_id"], lesson["course_id"]), fetch="one",
    )
    if not enrollment:
        raise HTTPException(status_code=403, detail="Enroll in this course first")

    run_query(
        """INSERT INTO lesson_progress
               (enrollment_id, lesson_id, is_completed, completed_at, last_watched_position)
           VALUES (%s, %s, %s,
                   CASE WHEN %s THEN NOW() ELSE NULL END, %s)
           ON CONFLICT (enrollment_id, lesson_id) DO UPDATE
           SET is_completed = EXCLUDED.is_completed,
               completed_at = EXCLUDED.completed_at,
               last_watched_position = EXCLUDED.last_watched_position;""",
        (enrollment["enrollment_id"], lesson_id, body.is_completed,
         body.is_completed, body.last_watched_position), fetch=None,
    )
    progress = enrollment_progress(enrollment["enrollment_id"], lesson["course_id"])
    return {"lesson_id": lesson_id, **progress}


# ---------- reviews ----------
@app.get("/api/courses/{course_id}/reviews")
def list_reviews(course_id: int):
    course = run_query("SELECT course_id FROM courses WHERE course_id = %s;",
                       (course_id,), fetch="one")
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    items = run_query(
        """SELECT r.review_id, r.rating, r.comment, r.created_at,
                  u.user_id, u.first_name, u.last_name, u.profile_picture
           FROM reviews r JOIN users u ON u.user_id = r.user_id
           WHERE r.course_id = %s
           ORDER BY r.created_at DESC
           LIMIT 100;""",
        (course_id,),
    )
    summary = rating_summary(course_id)
    return {"items": items, **summary}


@app.post("/api/courses/{course_id}/reviews", status_code=201)
def create_review(course_id: int, body: ReviewIn,
                  user: dict = Depends(get_current_user)):
    course = run_query(
        "SELECT course_id, instructor_id, status FROM courses WHERE course_id = %s;",
        (course_id,), fetch="one",
    )
    if not course or course["status"] != "published":
        raise HTTPException(status_code=404, detail="Course not found")
    enrolled = run_query(
        "SELECT enrollment_id FROM enrollments WHERE user_id = %s AND course_id = %s;",
        (user["user_id"], course_id), fetch="one",
    )
    if not enrolled:
        raise HTTPException(status_code=403, detail="Only enrolled students can review this course")

    review = run_query(
        """INSERT INTO reviews (user_id, course_id, rating, comment)
           VALUES (%s, %s, %s, %s)
           ON CONFLICT (user_id, course_id) DO UPDATE
           SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
           RETURNING review_id, rating, comment, created_at;""",
        (user["user_id"], course_id, body.rating, body.comment), fetch="one",
    )
    run_query(
        """UPDATE instructors SET rating = (
               SELECT ROUND(AVG(r.rating)::numeric, 2)
               FROM reviews r JOIN courses c ON c.course_id = r.course_id
               WHERE c.instructor_id = instructors.instructor_id)
           WHERE instructor_id = %s;""",
        (course["instructor_id"],), fetch=None,
    )
    return {"review": review, **rating_summary(course_id)}


# ---------- instructor dashboard ----------
@app.get("/api/instructor/courses")
def instructor_courses(instructor: dict = Depends(get_instructor)):
    return run_query(
        """SELECT c.course_id, c.title, c.description, c.price, c.level,
                  c.duration_hours, c.thumbnail_url, c.status, c.created_at,
                  cat.name AS category,
                  COALESCE(rv.rating, 0) AS rating,
                  COALESCE(rv.review_count, 0) AS review_count,
                  COALESCE(en.student_count, 0) AS student_count,
                  COALESCE(sc.lesson_count, 0) AS lesson_count
           FROM courses c
           JOIN categories cat ON cat.category_id = c.category_id
           LEFT JOIN LATERAL (
               SELECT ROUND(AVG(r.rating)::numeric, 2) AS rating, COUNT(*) AS review_count
               FROM reviews r WHERE r.course_id = c.course_id
           ) rv ON TRUE
           LEFT JOIN LATERAL (
               SELECT COUNT(*) AS student_count
               FROM enrollments e WHERE e.course_id = c.course_id
           ) en ON TRUE
           LEFT JOIN LATERAL (
               SELECT COUNT(l.lesson_id) AS lesson_count
               FROM sections s LEFT JOIN lessons l ON l.section_id = s.section_id
               WHERE s.course_id = c.course_id
           ) sc ON TRUE
           WHERE c.instructor_id = %s
           ORDER BY c.created_at DESC;""",
        (instructor["instructor_id"],),
    )


@app.get("/api/instructor/stats")
def instructor_stats(instructor: dict = Depends(get_instructor)):
    row = run_query(
        """SELECT COUNT(*) AS courses,
                  COUNT(*) FILTER (WHERE status = 'published') AS published_courses,
                  COALESCE(SUM(student_count), 0) AS students,
                  COALESCE(SUM(review_count), 0) AS reviews,
                  COALESCE(ROUND(AVG(NULLIF(rating, 0)), 2), 0) AS rating
           FROM (
               SELECT c.status,
                      (SELECT COUNT(*) FROM enrollments e
                       WHERE e.course_id = c.course_id) AS student_count,
                      (SELECT COUNT(*) FROM reviews r
                       WHERE r.course_id = c.course_id) AS review_count,
                      (SELECT AVG(r.rating) FROM reviews r
                       WHERE r.course_id = c.course_id) AS rating
               FROM courses c WHERE c.instructor_id = %s
           ) course_stats;""",
        (instructor["instructor_id"],), fetch="one",
    )
    return dict(row)


# ---------- error handling ----------
@app.exception_handler(psycopg2.OperationalError)
async def database_unavailable(request: Request, exc: psycopg2.OperationalError):
    logger.error("Database unavailable on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})


@app.exception_handler(psycopg2.Error)
async def database_error(request: Request, exc: psycopg2.Error):
    logger.error("Database error on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=400, content={"detail": "Invalid database operation"})


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
