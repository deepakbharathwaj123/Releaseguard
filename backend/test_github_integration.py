from backend.github_service import (
    build_git_login_instructions,
    build_github_headers,
    normalize_repository_name,
)


def test_normalize_repository_name_accepts_url_and_slug():
    assert normalize_repository_name("https://github.com/octo/demo-app") == "octo/demo-app"
    assert normalize_repository_name("octo/demo-app") == "octo/demo-app"


def test_build_github_headers_uses_bearer_credentials():
    headers = build_github_headers("ghp_example_token")
    assert headers["Authorization"] == "Bearer ghp_example_token"
    assert headers["Accept"] == "application/vnd.github+json"


def test_build_git_login_instructions_generates_https_commands():
    instructions = build_git_login_instructions("deepakbharathwaj123", "deepakbharathwaj123/OPS-PILOT1")
    assert instructions["username"] == "deepakbharathwaj123"
    assert "https://github.com/deepakbharathwaj123/OPS-PILOT1.git" in instructions["remote_url"]
    assert "git remote set-url origin" in instructions["commands"][0]
