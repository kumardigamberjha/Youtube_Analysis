#!/usr/bin/env python3
"""
API Key Validator
Checks if Gemini and Groq API keys (from .env.local) are valid and active.
"""

import os
import sys
import json
import urllib.request
import urllib.error
from dotenv import load_dotenv

# ─── Load .env.local first, then .env as fallback ─────────────────────────────
load_dotenv(".env.local")
load_dotenv(".env")

RESET  = "\033[0m"
BOLD   = "\033[1m"
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
DIM    = "\033[2m"


def mask(key: str) -> str:
    return key[:6] + "..." + key[-4:] if key and len(key) > 10 else "***"


# ──────────────────────────────────────────────────────────────────────────────
# Gemini checker
# ──────────────────────────────────────────────────────────────────────────────

def check_gemini(api_key: str) -> dict:
    """Validates a Gemini API key via the models-list endpoint."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = [m["name"] for m in data.get("models", [])]
            return {
                "valid": True,
                "message": "✅ VALID and ACTIVE",
                "models_available": len(models),
                "sample_models": models[:5],
            }

    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            err  = json.loads(body).get("error", {})
            msg  = err.get("message", body)
            code = err.get("code", e.code)
        except Exception:
            msg, code = body, e.code

        if code in (400, 401, 403):
            return {"valid": False, "message": f"❌ INVALID / UNAUTHORIZED (HTTP {code})", "detail": msg}
        if code == 429:
            return {"valid": True,  "message": f"⚠️  VALID but QUOTA EXCEEDED (HTTP {code})", "detail": msg}
        return {"valid": False, "message": f"❌ HTTP error {code}", "detail": msg}

    except urllib.error.URLError as e:
        return {"valid": False, "message": "❌ Network error — cannot reach Gemini API", "detail": str(e.reason)}
    except Exception as e:
        return {"valid": False, "message": "❌ Unexpected error", "detail": str(e)}


# ──────────────────────────────────────────────────────────────────────────────
# Groq checker
# ──────────────────────────────────────────────────────────────────────────────

def check_groq(api_key: str) -> dict:
    """Validates a Groq API key via the models-list endpoint."""
    url = "https://api.groq.com/openai/v1/models"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {api_key}")
    req.add_header("Content-Type", "application/json")
    # Cloudflare blocks urllib's default empty User-Agent (error 1010).
    # A browser-like UA bypasses the WAF check.
    req.add_header(
        "User-Agent",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = [m["id"] for m in data.get("data", [])]
            return {
                "valid": True,
                "message": "✅ VALID and ACTIVE",
                "models_available": len(models),
                "sample_models": models[:5],
            }

    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            err  = json.loads(body).get("error", {})
            msg  = err.get("message", body)
            code = e.code
        except Exception:
            msg, code = body, e.code

        if code in (400, 401, 403):
            return {"valid": False, "message": f"❌ INVALID / UNAUTHORIZED (HTTP {code})", "detail": msg}
        if code == 429:
            return {"valid": True,  "message": f"⚠️  VALID but RATE LIMITED (HTTP {code})", "detail": msg}
        return {"valid": False, "message": f"❌ HTTP error {code}", "detail": msg}

    except urllib.error.URLError as e:
        return {"valid": False, "message": "❌ Network error — cannot reach Groq API", "detail": str(e.reason)}
    except Exception as e:
        return {"valid": False, "message": "❌ Unexpected error", "detail": str(e)}


# ──────────────────────────────────────────────────────────────────────────────
# YouTube checker
# ──────────────────────────────────────────────────────────────────────────────

def check_youtube(api_key: str) -> dict:
    """Validates a YouTube Data API v3 key via the videoCategories endpoint."""

    # Gemini AI Studio keys start with "AQ." — they cannot be used for YouTube.
    if api_key.startswith("AQ."):
        return {
            "valid": False,
            "message": "❌ WRONG KEY TYPE — this is a Gemini AI Studio key, not a YouTube API key",
            "detail": "YouTube Data API v3 requires a Google Cloud API key (starts with 'AIza...').",
            "action": (
                "👉 Fix: Go to https://console.cloud.google.com/ → APIs & Services → Credentials\n"
                "        → Create Credentials → API key\n"
                "        → (Optional) Restrict to 'YouTube Data API v3'\n"
                "        → Set YOUTUBE_API_KEY=AIza... in .env.local"
            ),
        }

    url = (
        f"https://www.googleapis.com/youtube/v3/videoCategories"
        f"?part=snippet&regionCode=US&key={api_key}"
    )
    req = urllib.request.Request(url, method="GET")
    req.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            count = len(data.get("items", []))
            return {
                "valid": True,
                "message": "✅ VALID and ACTIVE",
                "detail": f"{count} video categories returned",
            }

    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            err     = json.loads(body).get("error", {})
            msg     = err.get("message", body)
            code    = err.get("code", e.code)
            reason  = ""
            for d in err.get("details", []):
                reason = reason or d.get("reason", "")
        except Exception:
            msg, code, reason = body, e.code, ""

        if "not supported" in msg.lower() or "oauth2" in msg.lower():
            return {
                "valid": False,
                "message": f"❌ WRONG KEY TYPE — YouTube requires an 'AIza...' API key (HTTP {code})",
                "detail": msg,
                "action": (
                    "👉 Fix: Go to https://console.cloud.google.com/ → APIs & Services → Credentials\n"
                    "        → Create Credentials → API key\n"
                    "        → Set YOUTUBE_API_KEY=AIza... in .env.local"
                ),
            }
        if reason == "API_KEY_INVALID" or "expired" in msg.lower():
            return {
                "valid": False,
                "message": f"❌ API KEY EXPIRED — please renew it (HTTP {code})",
                "detail": msg,
                "action": "👉 Go to https://console.cloud.google.com/ → Credentials → delete & recreate the key",
            }
        if code in (400, 401, 403):
            return {"valid": False, "message": f"❌ INVALID / UNAUTHORIZED (HTTP {code})", "detail": msg}
        if code == 429:
            return {"valid": True,  "message": f"⚠️  VALID but QUOTA EXCEEDED (HTTP {code})", "detail": msg}
        return {"valid": False, "message": f"❌ HTTP error {code}", "detail": msg}

    except urllib.error.URLError as e:
        return {"valid": False, "message": "❌ Network error — cannot reach YouTube API", "detail": str(e.reason)}
    except Exception as e:
        return {"valid": False, "message": "❌ Unexpected error", "detail": str(e)}


# ──────────────────────────────────────────────────────────────────────────────
# Display helpers
# ──────────────────────────────────────────────────────────────────────────────

def print_section(title: str, key_masked: str, result: dict) -> None:
    color = GREEN if result["valid"] else RED
    print(f"\n{BOLD}{CYAN}{'─' * 52}{RESET}")
    print(f"{BOLD} {title}{RESET}")
    print(f"  Key     : {DIM}{key_masked}{RESET}")
    print(f"  Status  : {color}{result['message']}{RESET}")
    if "models_available" in result:
        print(f"  Models  : {result['models_available']} available")
    if "sample_models" in result:
        for m in result["sample_models"]:
            print(f"    {DIM}•{RESET} {m}")
    if "detail" in result:
        print(f"  Detail  : {DIM}{result['detail']}{RESET}")
    if "action" in result:
        print(f"  {YELLOW}{result['action']}{RESET}")


def print_summary(results: list[tuple[str, dict]]) -> None:
    print(f"\n{BOLD}{CYAN}{'═' * 52}{RESET}")
    print(f"{BOLD}  Summary{RESET}")
    print(f"{BOLD}{CYAN}{'─' * 52}{RESET}")
    all_valid = True
    for name, result in results:
        icon  = f"{GREEN}✅{RESET}" if result["valid"] else f"{RED}❌{RESET}"
        label = "OK    " if result["valid"] else "FAILED"
        print(f"  {icon}  {name:<12}  {label}")
        if not result["valid"]:
            all_valid = False
    print(f"{BOLD}{CYAN}{'═' * 52}{RESET}\n")
    return all_valid


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    print(f"\n{BOLD}🔍 API Key Checker — reading from .env.local{RESET}")

    results = []

    # ── Gemini ────────────────────────────────────────────────────────────────
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if gemini_key:
        print(f"\nChecking {BOLD}Gemini{RESET} key ({mask(gemini_key)}) …")
        gemini_result = check_gemini(gemini_key)
        print_section("Gemini (Google AI)", mask(gemini_key), gemini_result)
        results.append(("Gemini", gemini_result))
    else:
        print(f"\n{YELLOW}⚠️  GEMINI_API_KEY / GOOGLE_API_KEY not found in .env.local — skipping.{RESET}")

    # ── Groq ──────────────────────────────────────────────────────────────────
    # The codebase uses three different env names (legacy inconsistency)
    groq_key = (
        os.getenv("GROQ_API_KEY")
        or os.getenv("NEXT_PUBLIC_GROQ_API_KEY")
        or os.getenv("groq_api_key")
    )
    if groq_key:
        print(f"\nChecking {BOLD}Groq{RESET} key ({mask(groq_key)}) …")
        groq_result = check_groq(groq_key)
        print_section("Groq (LLM — llama / mixtral)", mask(groq_key), groq_result)
        results.append(("Groq", groq_result))
    else:
        print(f"\n{YELLOW}⚠️  GROQ_API_KEY / groq_api_key not found in .env.local — skipping.{RESET}")

    # ── YouTube ───────────────────────────────────────────────────────────────
    # Codebase uses two names: server-side and client-side (NEXT_PUBLIC_)
    yt_key = (
        os.getenv("YOUTUBE_API_KEY")
        or os.getenv("NEXT_PUBLIC_YOUTUBE_API_KEY")
    )
    if yt_key:
        print(f"\nChecking {BOLD}YouTube{RESET} key ({mask(yt_key)}) …")
        yt_result = check_youtube(yt_key)
        print_section("YouTube Data API v3", mask(yt_key), yt_result)
        results.append(("YouTube", yt_result))
    else:
        print(f"\n{YELLOW}⚠️  YOUTUBE_API_KEY not found in .env.local — skipping.{RESET}")

    # ── Summary ───────────────────────────────────────────────────────────────
    if results:
        all_ok = print_summary(results)
        sys.exit(0 if all_ok else 1)
    else:
        print(f"\n{RED}No API keys found in .env.local. Nothing to check.{RESET}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
