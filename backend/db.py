import psycopg2
from psycopg2.extras import RealDictCursor
import config

def get_connection():
    return psycopg2.connect(
        host=config.DB_HOST, port=config.DB_PORT,
        user=config.DB_USER, password=config.DB_PASSWORD,
        dbname=config.DB_NAME, cursor_factory=RealDictCursor,
    )

def run_query(sql, params=None, fetch="all"):
    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                if fetch == "all":
                    return cur.fetchall()
                if fetch == "one":
                    return cur.fetchone()
                return None
    finally:
        conn.close()