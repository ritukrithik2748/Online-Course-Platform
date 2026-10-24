from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor

import config


def get_connection():
    return psycopg2.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        dbname=config.DB_NAME,
        cursor_factory=RealDictCursor,
    )


def run_query(sql, params=None, fetch="all"):
    """Run a single statement. Returns rows for fetch='all'/'one'/'scalar'."""
    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                if fetch == "all":
                    return cur.fetchall()
                if fetch == "one":
                    return cur.fetchone()
                if fetch == "scalar":
                    row = cur.fetchone()
                    return next(iter(row.values())) if row else None
                return None
    finally:
        conn.close()


@contextmanager
def transaction():
    """Run several statements atomically. Commits on success, rolls back on error."""
    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                yield cur
    finally:
        conn.close()
