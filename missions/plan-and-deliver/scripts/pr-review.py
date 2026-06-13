#!/usr/bin/env python3
"""GitHub API helper for the `pr-review` protocol branch (coding-session inline step).

See `missions/plan-and-deliver/skills/pr-review/SKILL.md`.

Reads input in this order:

1. **Absolute path** in the **`PR_REVIEW_INPUT`** environment variable (file must exist).
   Use a temp path outside the repo (e.g. `mktemp /tmp/sedea-pr-review-input.XXXXXX`) so
   review payloads never appear as untracked files in the worktree.

2. Otherwise **`.pr-review-input.json`** then **`.pr-review-input`** in the current working
   directory (backward compatible).

Input format — either a single command object or a JSON array of command objects
(run in order, one GitHub invocation after another):

  {"command":"threads", "owner":"...", "repo":"...", "pr":123}

  [
    {"command":"minimize", "owner":"...", "repo":"...", "pr":123, "node_id":"PRR_...", "classifier":"RESOLVED"},
    {"command":"summary", "owner":"...", "repo":"...", "pr":123, "body":"..."}
  ]

Each object uses the same keys as before:
  command: threads | reply | resolve | minimize | pr-for-branch | reviews | review-comments |
           pull-reviews | issue-comments | request-review | summary
  plus command-specific fields (comment_id, thread_id, node_id, body, branch, reviewers, ...).

Usage:

  cd <repo-root> && PR_REVIEW_INPUT=/path/to/payload.json python3 .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/pr-review.py

  cd <repo-root> && python3 .sedea/centers/research-and-development/missions/plan-and-deliver/scripts/pr-review.py  # uses cwd input files
"""

from __future__ import annotations

import json
import os
import ssl
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

INPUT_FILES = (".pr-review-input.json", ".pr-review-input")
API = "https://api.github.com"
TIMEOUT = 30


def _ssl_context() -> ssl.SSLContext:
    """Build an SSL context that works on macOS framework Python where the
    default OpenSSL cert path may not exist."""
    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        pass

    for path in (
        "/etc/ssl/cert.pem",
        "/etc/ssl/certs/ca-certificates.crt",
    ):
        if os.path.isfile(path):
            return ssl.create_default_context(cafile=path)

    return ssl.create_default_context()


SSL_CTX = _ssl_context()


def die(msg: str) -> None:
    print(f"Error: {msg}", file=sys.stderr)
    sys.exit(1)


def resolve_input_file() -> str:
    env_path = os.environ.get("PR_REVIEW_INPUT", "").strip()
    if env_path:
        if os.path.isfile(env_path):
            return env_path
        die(f"PR_REVIEW_INPUT is set to {env_path!r} but that file does not exist")
    for name in INPUT_FILES:
        if os.path.isfile(name):
            return name
    cwd = os.getcwd()
    die(
        "No PR review input: set PR_REVIEW_INPUT to an absolute path to a JSON file, "
        f"or create one of {', '.join(INPUT_FILES)} in {cwd}"
    )


def find_sedea_repo_root(start: Path | None = None) -> Path | None:
    cur = (start or Path.cwd()).resolve()
    for _ in range(32):
        if (cur / ".sedea" / "centers" / "sedea").is_dir():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    return None


def _token_from_mcp_json(mcp_path: Path) -> str:
    if not mcp_path.is_file():
        return ""
    try:
        cfg = json.loads(mcp_path.read_text())
        return (
            cfg.get("mcpServers", {})
            .get("github", {})
            .get("env", {})
            .get("GITHUB_PERSONAL_ACCESS_TOKEN", "")
            or ""
        )
    except (json.JSONDecodeError, KeyError, OSError):
        return ""


def resolve_token() -> str:
    token = os.environ.get("GH_TOKEN", "")
    if token:
        return token
    candidates: list[Path] = []
    repo_root = find_sedea_repo_root()
    if repo_root is not None:
        candidates.append(repo_root / ".sedea" / "mcp.json")
    candidates.append(Path.home() / ".sedea" / "mcp.json")
    for mcp_path in candidates:
        token = _token_from_mcp_json(mcp_path)
        if token:
            return token
    die(
        "GH_TOKEN not set and could not read GITHUB_PERSONAL_ACCESS_TOKEN from "
        ".sedea/mcp.json (hosting repo or ~/.sedea/) — copy .sedea/mcp.json.example"
    )
    return token  # unreachable


def api_request(
    url: str, *, token: str, method: str = "GET", data: dict | None = None
) -> dict | list:
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
    }
    body = json.dumps(data).encode() if data else None
    if body:
        headers["Content-Type"] = "application/json"
    req = Request(url, data=body, headers=headers, method=method)
    try:
        with urlopen(req, timeout=TIMEOUT, context=SSL_CTX) as resp:
            return json.loads(resp.read())
    except HTTPError as e:
        resp_body = e.read().decode(errors="replace")
        die(f"HTTP {e.code} from {url}: {resp_body}")
    except URLError as e:
        die(f"Connection error for {url}: {e.reason}")


def _paged_pull_subresource(
    owner: str, repo: str, pr: int, subpath: str, token: str, *, max_pages: int = 50
) -> list:
    """GET /repos/{owner}/{repo}/pulls/{pr}/{subpath} with per_page=100 until empty or max_pages."""
    out: list = []
    page = 1
    while page <= max_pages:
        url = f"{API}/repos/{owner}/{repo}/pulls/{pr}/{subpath}?per_page=100&page={page}"
        chunk = api_request(url, token=token)
        if not isinstance(chunk, list):
            die(f"Expected JSON array from {url}, got {type(chunk).__name__}")
        out.extend(chunk)
        if len(chunk) < 100:
            break
        page += 1
    return out


def _paged_issue_comments(owner: str, repo: str, issue: int, token: str, *, max_pages: int = 50) -> list:
    out: list = []
    page = 1
    while page <= max_pages:
        url = f"{API}/repos/{owner}/{repo}/issues/{issue}/comments?per_page=100&page={page}"
        chunk = api_request(url, token=token)
        if not isinstance(chunk, list):
            die(f"Expected JSON array from {url}, got {type(chunk).__name__}")
        out.extend(chunk)
        if len(chunk) < 100:
            break
        page += 1
    return out


def graphql(query: str, *, token: str) -> dict:
    return api_request(
        f"{API}/graphql", token=token, method="POST", data={"query": query}
    )


def cmd_threads(inp: dict, token: str) -> None:
    owner, repo, pr = inp["owner"], inp["repo"], inp["pr"]
    q = (
        "{\n"
        f'  repository(owner: "{owner}", name: "{repo}") {{\n'
        f"    pullRequest(number: {pr}) {{\n"
        "      reviewThreads(first: 100) {\n"
        "        nodes {\n"
        "          id\n"
        "          isResolved\n"
        "          comments(first: 1) {\n"
        "            nodes {\n"
        "              databaseId\n"
        "              path\n"
        "              line\n"
        "              isMinimized\n"
        "              minimizedReason\n"
        "              author { login }\n"
        "            }\n"
        "          }\n"
        "        }\n"
        "      }\n"
        "    }\n"
        "  }\n"
        "}"
    )
    print(json.dumps(graphql(q, token=token)))


def cmd_reply(inp: dict, token: str) -> None:
    owner, repo, pr = inp["owner"], inp["repo"], inp["pr"]
    comment_id = inp["comment_id"]
    url = f"{API}/repos/{owner}/{repo}/pulls/{pr}/comments/{comment_id}/replies"
    result = api_request(url, token=token, method="POST", data={"body": inp["body"]})
    print(json.dumps(result))


def cmd_resolve(inp: dict, token: str) -> None:
    tid = inp["thread_id"]
    q = (
        "mutation { resolveReviewThread(input: "
        f'{{{" "}threadId: "{tid}"{" "}}})'
        " { thread { isResolved } } }"
    )
    print(json.dumps(graphql(q, token=token)))


def cmd_pr_for_branch(inp: dict, token: str) -> None:
    owner, repo = inp["owner"], inp["repo"]
    branch = inp["branch"]
    url = f"{API}/repos/{owner}/{repo}/pulls?head={owner}:{branch}&state=open"
    prs = api_request(url, token=token)
    if prs:
        print(
            json.dumps(
                {
                    "number": prs[0]["number"],
                    "html_url": prs[0]["html_url"],
                    "title": prs[0]["title"],
                }
            )
        )
    else:
        print(json.dumps({"error": "No open PR found for branch"}))


def cmd_reviews(inp: dict, token: str) -> None:
    owner, repo, pr = inp["owner"], inp["repo"], inp["pr"]
    q = (
        "{\n"
        f'  repository(owner: "{owner}", name: "{repo}") {{\n'
        f"    pullRequest(number: {pr}) {{\n"
        "      reviews(first: 50) {\n"
        "        nodes {\n"
        "          id\n"
        "          databaseId\n"
        "          state\n"
        "          isMinimized\n"
        "          minimizedReason\n"
        "          author { login }\n"
        "        }\n"
        "      }\n"
        "    }\n"
        "  }\n"
        "}"
    )
    print(json.dumps(graphql(q, token=token)))


def cmd_review_comments(inp: dict, token: str) -> None:
    """REST: all inline review comments on the PR (paginated)."""
    owner, repo, pr = inp["owner"], inp["repo"], inp["pr"]
    rows = _paged_pull_subresource(owner, repo, pr, "comments", token)
    print(json.dumps(rows))


def cmd_pull_reviews(inp: dict, token: str) -> None:
    """REST: all pull request reviews including body and node_id (paginated)."""
    owner, repo, pr = inp["owner"], inp["repo"], inp["pr"]
    rows = _paged_pull_subresource(owner, repo, pr, "reviews", token)
    print(json.dumps(rows))


def cmd_issue_comments(inp: dict, token: str) -> None:
    """REST: issue timeline comments on the PR (same number as the issue API)."""
    owner, repo, pr = inp["owner"], inp["repo"], inp["pr"]
    rows = _paged_issue_comments(owner, repo, pr, token)
    print(json.dumps(rows))


def cmd_minimize(inp: dict, token: str) -> None:
    node_id = inp["node_id"]
    classifier = inp.get("classifier", "RESOLVED")
    q = (
        "mutation { minimizeComment(input: "
        f'{{subjectId: "{node_id}", classifier: {classifier}}})'
        " { minimizedComment { isMinimized minimizedReason } } }"
    )
    print(json.dumps(graphql(q, token=token)))


def cmd_request_review(inp: dict, token: str) -> None:
    owner, repo, pr = inp["owner"], inp["repo"], inp["pr"]
    reviewers = inp.get("reviewers", [])
    url = f"{API}/repos/{owner}/{repo}/pulls/{pr}/requested_reviewers"
    result = api_request(url, token=token, method="POST", data={"reviewers": reviewers})
    print(json.dumps(result))


def cmd_summary(inp: dict, token: str) -> None:
    owner, repo, pr = inp["owner"], inp["repo"], inp["pr"]
    url = f"{API}/repos/{owner}/{repo}/issues/{pr}/comments"
    result = api_request(url, token=token, method="POST", data={"body": inp["body"]})
    print(json.dumps(result))


COMMANDS = {
    "threads": cmd_threads,
    "reply": cmd_reply,
    "resolve": cmd_resolve,
    "pr-for-branch": cmd_pr_for_branch,
    "reviews": cmd_reviews,
    "review-comments": cmd_review_comments,
    "pull-reviews": cmd_pull_reviews,
    "issue-comments": cmd_issue_comments,
    "minimize": cmd_minimize,
    "request-review": cmd_request_review,
    "summary": cmd_summary,
}


def _run_one(inp: dict, token: str, index: int | None) -> None:
    cmd = inp.get("command", "")
    if cmd not in COMMANDS:
        prefix = f"Item {index}: " if index is not None else ""
        die(f"{prefix}Unknown command: {cmd}")
    COMMANDS[cmd](inp, token)


def main() -> None:
    input_path = resolve_input_file()

    with open(input_path) as f:
        payload = json.load(f)

    token = resolve_token()

    if isinstance(payload, list):
        for i, inp in enumerate(payload):
            if not isinstance(inp, dict):
                die(f"Item {i}: expected object, got {type(inp).__name__}")
            _run_one(inp, token, i)
        return

    if not isinstance(payload, dict):
        die(f"Expected object or array, got {type(payload).__name__}")

    _run_one(payload, token, None)


if __name__ == "__main__":
    main()
