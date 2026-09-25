import os
import psycopg2

# BUG / VULNERABILITY 1: Hardcoded production database credentials
DB_CONNECTION_STRING = "postgres://analytics_admin:SuperSecretPass123@prod-cluster.internal:5432/warehouse"

def run_nightly_etl_pipeline():
    conn = psycopg2.connect(DB_CONNECTION_STRING)
    cursor = conn.cursor()
    
    # Destructive unindexed operation
    cursor.execute("DROP TABLE IF EXISTS staging_daily_transactions;")
    cursor.execute("CREATE TABLE staging_daily_transactions AS SELECT * FROM raw_events WHERE event_date = CURRENT_DATE;")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    run_nightly_etl_pipeline()
