import psycopg2
from psycopg2 import sql
import config

conn = psycopg2.connect(
    host=config.DB_HOST, port=config.DB_PORT,
    user=config.DB_USER, password=config.DB_PASSWORD,
    dbname="postgres",
)
conn.autocommit = True

with conn.cursor() as cur:
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (config.DB_NAME,))
    if cur.fetchone():
        print(f"Database '{config.DB_NAME}' already exists")
    else:
        cur.execute(sql.SQL("CREATE DATABASE {};").format(sql.Identifier(config.DB_NAME)))
        print(f"Database '{config.DB_NAME}' created")

conn.close()