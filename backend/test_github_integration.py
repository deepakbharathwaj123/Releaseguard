from backend.github_service import normalize_repository_name, build_github_headers


def test_normalize_repository_name_accepts_url_and_slug():
    assert normalize_repository_name("https://github.com/octo/demo-app") == "octo/demo-app"
    assert normalize_repository_name("octo/demo-app") == "octo/demo-app"


def test_build_github_headers_uses_bearer_credentials():
    headers = build_github_headers("ghp_example_token")
    assert headers["Authorization"] == "Bearer ghp_example_token"
    assert headers["Accept"] == "application/vnd.github+json"
