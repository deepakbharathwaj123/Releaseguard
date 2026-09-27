# =============================================================
# ReleaseGuard AI — Built with IBM Bob
# © IBM Bob | ibm.com/products/watsonx
# =============================================================


import re
from typing import List, Dict, Any

TEST_PATTERNS = [
    {
        "name": "Skipped Test Annotation",
        "pattern": r"(@pytest\.mark\.skip|it\.skip\(|describe\.skip\(|@unittest\.skip|t\.Skip\()",
        "severity": "MEDIUM",
        "title": "Automated Unit/Integration Test Was Skipped",
        "description": "Disabling or skipping existing test suites masks regressions and reduces deployment confidence.",
        "remediation": "Fix the failing test assertion instead of skipping the test suite before merging into main."
    },
    {
        "name": "Lowered Test Coverage Threshold",
        "pattern": r"(fail_under\s*=\s*([0-5]\d|60)|branches:\s*([0-5]\d|60)|coverage:\s*threshold\s*=\s*[0-5]\d)",
        "severity": "HIGH",
        "title": "Coverage Threshold Artificially Decreased",
        "description": "Decreasing code coverage thresholds permits unverified code paths into critical production services.",
        "remediation": "Maintain code coverage baseline of at least 80% on core financial and operational services."
    },
    {
        "name": "Silenced Assertion or Empty Mock",
        "pattern": r"(assert\s+True|except.*pass|def\s+test_[a-zA-Z0-9_]+\(\):\s*\n\s*pass)",
        "severity": "LOW",
        "title": "Empty Test Assertion or Silenced Exception",
        "description": "Dummy assertion (assert True) or bare except-pass suppresses real errors during CI runs.",
        "remediation": "Write concrete assertions validating return values, state changes, and error conditions."
    }
]

def scan_tests(diff_text: str, files_content: Dict[str, str] = None) -> List[Dict[str, Any]]:
    findings = []
    lines = diff_text.splitlines()
    current_file = "unknown"
    line_number = 1
    
    modified_code_files = set()
    modified_test_files = set()

    for line in lines:
        if line.startswith("+++ b/"):
            current_file = line.replace("+++ b/", "").strip()
            if any(t in current_file.lower() for t in ["test", "spec", "tests"]):
                modified_test_files.add(current_file)
            elif any(current_file.endswith(ext) for ext in [".py", ".ts", ".js", ".go", ".java"]):
                modified_code_files.add(current_file)
            continue
        if line.startswith("@@"):
            match = re.search(r"\+(\d+)", line)
            if match:
                line_number = int(match.group(1))
            continue
        
        if line.startswith("+") and not line.startswith("+++"):
            added_content = line[1:]
            for rule in TEST_PATTERNS:
                if re.search(rule["pattern"], added_content):
                    findings.append({
                        "scanner_type": "tests",
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

    # Heuristic: Significant code changed without any test files modified
    if len(modified_code_files) >= 3 and len(modified_test_files) == 0:
        findings.append({
            "scanner_type": "tests",
            "severity": "MEDIUM",
            "title": "No Accompanying Tests Found for Multi-file Logic Change",
            "description": f"{len(modified_code_files)} application source files were changed, but 0 test files were modified or added.",
            "file_path": list(modified_code_files)[0] if modified_code_files else "src/",
            "line_number": 1,
            "snippet": f"Changed files: {', '.join(list(modified_code_files)[:3])}...",
            "remediation": "Add unit and integration tests covering the newly introduced business logic and edge cases."
        })

    return findings
