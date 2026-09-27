# =============================================================
# ReleaseGuard AI — Built with IBM Bob
# © IBM Bob | ibm.com/products/watsonx
# =============================================================


import re
from typing import List, Dict, Any

DB_PATTERNS = [
    {
        "name": "Destructive DROP TABLE Statement",
        "pattern": r"DROP\s+TABLE\s+(IF\s+EXISTS\s+)?[a-zA-Z0-9_]+",
        "severity": "CRITICAL",
        "title": "Destructive DDL: DROP TABLE Detected",
        "description": "Dropping a database table immediately deletes all persisted records and breaks running legacy application services.",
        "remediation": "Do not drop tables in standard deployment migrations. Follow expand-and-contract: deprecate, archive data, and drop in a scheduled maintenance window."
    },
    {
        "name": "Destructive DROP COLUMN Statement",
        "pattern": r"ALTER\s+TABLE\s+[a-zA-Z0-9_]+\s+DROP\s+COLUMN\s+[a-zA-Z0-9_]+",
        "severity": "HIGH",
        "title": "Backward-Incompatible Schema Change: DROP COLUMN",
        "description": "Dropping a column immediately causes 500 errors on running web nodes executing queries against that field before the new code is deployed.",
        "remediation": "Stop referencing the column in application code first, verify in production, and drop column in a subsequent release."
    },
    {
        "name": "Adding NOT NULL Column Without Default",
        "pattern": r"ALTER\s+TABLE\s+[a-zA-Z0-9_]+\s+ADD\s+(COLUMN\s+)?[a-zA-Z0-9_]+\s+[a-zA-Z0-9_()]+\s+NOT\s+NULL(?!\s+DEFAULT)",
        "severity": "HIGH",
        "title": "Table Lock: Adding NOT NULL Column Without Default",
        "description": "Adding a NOT NULL column without a default value causes an immediate migration failure if the table already contains rows, or requires an exclusive table rewrite lock.",
        "remediation": "Add column as nullable first, backfill data in batches, set default value, and then enforce NOT NULL constraint."
    },
    {
        "name": "Index Creation Without CONCURRENTLY",
        "pattern": r"CREATE\s+(UNIQUE\s+)?INDEX\s+(?!CONCURRENTLY)[a-zA-Z0-9_]+\s+ON\s+[a-zA-Z0-9_]+",
        "severity": "MEDIUM",
        "title": "Postgres Table Lock: CREATE INDEX Without CONCURRENTLY",
        "description": "Creating an index without CONCURRENTLY acquires an ACCESS EXCLUSIVE lock on the table, blocking writes and queries until completion.",
        "remediation": "Use CREATE INDEX CONCURRENTLY on PostgreSQL to build indices in the background without locking client writes."
    },
    {
        "name": "Explicit Table Lock Acquisition",
        "pattern": r"LOCK\s+TABLE\s+[a-zA-Z0-9_]+\s+IN\s+[a-zA-Z\s]+MODE",
        "severity": "HIGH",
        "title": "Explicit Table Lock Requested in Migration Script",
        "description": "Explicit table locks halt application read/write traffic and frequently cause connection pool timeouts and cascading outages.",
        "remediation": "Avoid manual table locks; perform operations in non-blocking chunked batches or during off-peak hours."
    }
]

def scan_db(diff_text: str, files_content: Dict[str, str] = None) -> List[Dict[str, Any]]:
    findings = []
    lines = diff_text.splitlines()
    current_file = "unknown"
    line_number = 1

    for line in lines:
        if line.startswith("+++ b/"):
            current_file = line.replace("+++ b/", "").strip()
            continue
        if line.startswith("@@"):
            match = re.search(r"\+(\d+)", line)
            if match:
                line_number = int(match.group(1))
            continue
        
        # Check if file looks like SQL or migration
        is_migration = any(kw in current_file.lower() for kw in ["migration", "alembic", "flyway", "schema", ".sql", "migrate"])
        
        if line.startswith("+") and not line.startswith("+++"):
            added_content = line[1:]
            for rule in DB_PATTERNS:
                if re.search(rule["pattern"], added_content, re.IGNORECASE):
                    findings.append({
                        "scanner_type": "db",
                        "severity": rule["severity"],
                        "title": rule["title"],
                        "description": f"{rule['description']} (File: {current_file})",
                        "file_path": current_file,
                        "line_number": line_number,
                        "snippet": added_content.strip()[:120],
                        "remediation": rule["remediation"]
                    })
            line_number += 1
        elif not line.startswith("-"):
            line_number += 1

    return findings
