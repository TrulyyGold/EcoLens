#!/usr/bin/env python3
"""
scripts/start_ecolens.py

One-command launcher for the EcoLens backend (FastAPI/uvicorn) and the
Expo mobile app. Auto-detects this machine's LAN IP and keeps
apps/mobile/.env in sync (EXPO_PUBLIC_API_URL) so a phone running Expo Go
can always reach the API - even after Wi-Fi reconnects and the IP
changes.

Usage (run from anywhere inside the repo):

    python scripts/start_ecolens.py [options]

Common options:

    --api-only            Only start the FastAPI server
    --mobile-only         Only start the Expo dev server
    --ip 192.168.1.20     Override auto-detected LAN IP (use this if you're
                          on a VPN or have multiple network adapters and the
                          auto-detected address isn't the one your phone
                          can reach)
    --port 8000           API port (default: 8000)
    --separate-windows    Open each process in its own terminal window
                          instead of streaming both into this one
    --skip-env-sync       Don't touch apps/mobile/.env
    -h, --help            Show all options

Default behavior runs both processes in THIS terminal with output
prefixed "[api]" / "[mobile]", and shuts both down cleanly on Ctrl+C.
Pass --separate-windows if you'd rather have two terminal windows.

Requirements (see README "Quick start" for full setup):
    - apps/api/.venv            (python3 -m venv .venv && pip install -e '.[dev]')
    - apps/mobile/node_modules  (npm ci)
"""

from __future__ import annotations

import argparse
import re
import shutil
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path


def find_repo_root(start: Path) -> Path:
    """Walk upward from this script's location to find the repo root
    (a folder containing both apps/api and apps/mobile). Works whether
    the script lives at the repo root or inside scripts/."""
    current = start
    for _ in range(5):
        if (current / "apps" / "api").exists() and (current / "apps" / "mobile").exists():
            return current
        if current.parent == current:
            break
        current = current.parent
    sys.exit(
        "Could not find a repo root containing apps/api and apps/mobile.\n"
        "Run this script from inside the EcoLens repo, e.g.:\n"
        "  python scripts/start_ecolens.py"
    )


def get_lan_ip(override: str | None) -> str:
    """Best-effort detection of this machine's LAN IP (not 127.0.0.1)."""
    if override:
        return override
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't actually send anything; just used to pick the right interface.
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except OSError:
        ip = "127.0.0.1"
    finally:
        s.close()

    if ip == "127.0.0.1":
        print(
            "[net] Warning: could not detect a LAN IP (no network connection?). "
            "Falling back to 127.0.0.1, which will NOT work from a physical phone.\n"
            "      Fix by connecting to Wi-Fi, or pass --ip <your-computer's-LAN-IP> manually."
        )
    return ip


def sync_mobile_env(mobile_dir: Path, ip: str, port: int) -> None:
    """Ensure apps/mobile/.env points EXPO_PUBLIC_API_URL at the current LAN IP."""
    env_path = mobile_dir / ".env"
    example_path = mobile_dir / ".env.example"

    if not env_path.exists():
        if example_path.exists():
            env_path.write_text(example_path.read_text(encoding="utf-8"), encoding="utf-8")
        else:
            env_path.write_text("", encoding="utf-8")

    content = env_path.read_text(encoding="utf-8")
    new_line = f"EXPO_PUBLIC_API_URL=http://{ip}:{port}"

    if "EXPO_PUBLIC_API_URL=" in content:
        content = re.sub(r"EXPO_PUBLIC_API_URL=.*", new_line, content)
    else:
        content = content.rstrip("\n") + f"\n{new_line}\n"

    env_path.write_text(content, encoding="utf-8")
    print(f"[env] apps/mobile/.env -> {new_line}")


def find_venv_python(api_dir: Path) -> Path:
    """Locate the API's virtualenv Python, on Windows or POSIX."""
    windows_python = api_dir / ".venv" / "Scripts" / "python.exe"
    posix_python = api_dir / ".venv" / "bin" / "python"
    if windows_python.exists():
        return windows_python
    if posix_python.exists():
        return posix_python
    sys.exit(
        "Could not find apps/api/.venv. Set it up first:\n"
        "  cd apps/api\n"
        "  python3 -m venv .venv\n"
        "  " + (r".venv\Scripts\activate" if sys.platform.startswith("win") else ". .venv/bin/activate") + "\n"
        "  pip install -e '.[dev]'\n"
        "  cp .env.example .env"
    )


def find_npm() -> str:
    """Locate npm, accounting for npm.cmd on Windows."""
    npm = shutil.which("npm")
    if npm is None:
        sys.exit(
            "Could not find npm on your PATH. Install Node.js 20+ from "
            "https://nodejs.org and re-open your terminal."
        )
    return npm


def check_mobile_deps(mobile_dir: Path) -> None:
    if not (mobile_dir / "node_modules").exists():
        sys.exit(
            "Could not find apps/mobile/node_modules. Set it up first:\n"
            "  cd apps/mobile\n"
            "  npm ci\n"
            "  cp .env.example .env"
        )


# --------------------------------------------------------------------------
# Mode 1 (default): run both processes inline, in this terminal
# --------------------------------------------------------------------------

def stream_output(proc: subprocess.Popen, prefix: str) -> None:
    assert proc.stdout is not None
    for raw_line in iter(proc.stdout.readline, b""):
        line = raw_line.decode(errors="replace").rstrip()
        print(f"[{prefix}] {line}")


def run_inline(jobs: list[tuple[list[str], Path, str]]) -> None:
    processes: list[tuple[subprocess.Popen, str]] = []
    threads = []

    for cmd, cwd, prefix in jobs:
        proc = subprocess.Popen(
            cmd,
            cwd=str(cwd),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        processes.append((proc, prefix))
        t = threading.Thread(target=stream_output, args=(proc, prefix), daemon=True)
        t.start()
        threads.append(t)

    print("\nBoth servers are running in this terminal. Press Ctrl+C to stop them.\n")

    try:
        while any(p.poll() is None for p, _ in processes):
            time.sleep(0.3)
    except KeyboardInterrupt:
        print("\n[shutdown] Stopping servers...")
    finally:
        for proc, prefix in processes:
            if proc.poll() is None:
                proc.terminate()
        for proc, prefix in processes:
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()


# --------------------------------------------------------------------------
# Mode 2 (--separate-windows): open each process in its own terminal window
# --------------------------------------------------------------------------

def launch_windows(cmd: list[str], cwd: Path, title: str) -> None:
    subprocess.Popen(
        ["cmd.exe", "/c", "start", title, "cmd.exe", "/k", " ".join(cmd)],
        cwd=str(cwd),
    )


def launch_posix(cmd: list[str], cwd: Path, title: str, root: Path) -> None:
    """
    Best-effort equivalent on macOS/Linux: tries a new Terminal window,
    falls back to a background process with output piped to a log file.
    """
    if sys.platform == "darwin":
        script = f'tell app "Terminal" to do script "cd {cwd} && {" ".join(cmd)}"'
        subprocess.Popen(["osascript", "-e", script])
        return

    for terminal in ("gnome-terminal", "x-terminal-emulator", "konsole", "xterm"):
        if shutil.which(terminal):
            subprocess.Popen([terminal, "--", "bash", "-c", f'{" ".join(cmd)}; exec bash'], cwd=str(cwd))
            return

    log_path = root / f"{title.lower().replace(' ', '_')}.log"
    print(f"[{title}] No terminal emulator found on PATH; logging to {log_path}")
    with open(log_path, "w", encoding="utf-8") as log_file:
        subprocess.Popen(cmd, cwd=str(cwd), stdout=log_file, stderr=subprocess.STDOUT)


def run_separate_windows(jobs: list[tuple[list[str], Path, str]], root: Path) -> None:
    for cmd, cwd, title in jobs:
        if sys.platform.startswith("win"):
            launch_windows(cmd, cwd, title)
        else:
            launch_posix(cmd, cwd, title, root)
    print("\nEach server is starting in its own window/log file (see above).")


# --------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Launch the EcoLens API and/or Expo app.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--api-only", action="store_true", help="Only start the FastAPI server")
    mode.add_argument("--mobile-only", action="store_true", help="Only start the Expo dev server")
    parser.add_argument("--port", type=int, default=8000, help="API port (default: 8000)")
    parser.add_argument(
        "--ip",
        default=None,
        help="Override auto-detected LAN IP (useful on VPN or with multiple network adapters)",
    )
    parser.add_argument(
        "--separate-windows",
        action="store_true",
        help="Open each process in its own terminal window instead of streaming both here",
    )
    parser.add_argument("--skip-env-sync", action="store_true", help="Don't touch apps/mobile/.env")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    root = find_repo_root(Path(__file__).resolve().parent)
    api_dir = root / "apps" / "api"
    mobile_dir = root / "apps" / "mobile"

    run_api = not args.mobile_only
    run_mobile = not args.api_only

    # Resolve the LAN IP once up front - reused for display and for syncing
    # apps/mobile/.env, so we never print two conflicting warnings.
    ip = get_lan_ip(args.ip)

    jobs: list[tuple[list[str], Path, str]] = []

    if run_api:
        venv_python = find_venv_python(api_dir)
        api_cmd = [
            str(venv_python),
            "-m",
            "uvicorn",
            "app.main:app",
            "--reload",
            "--host",
            "0.0.0.0",
            "--port",
            str(args.port),
        ]
        jobs.append((api_cmd, api_dir, "api"))

    if run_mobile:
        check_mobile_deps(mobile_dir)
        print(f"[net] Using LAN IP: {ip}")
        if not args.skip_env_sync:
            sync_mobile_env(mobile_dir, ip, args.port)
        npm = find_npm()
        jobs.append(([npm, "start"], mobile_dir, "mobile"))

    if not jobs:
        sys.exit("Nothing to run: --api-only and --mobile-only can't both be excluded.")

    if run_api:
        print(f"[api] http://{ip}:{args.port}/docs")
    if run_mobile:
        print("[mobile] Scan the QR code that appears with Expo Go once it starts.")

    if args.separate_windows:
        run_separate_windows(jobs, root)
    else:
        run_inline(jobs)

    if sys.platform.startswith("win") and run_api:
        print(
            "\nTip: if your phone can't reach the API, allow the port through the firewall "
            "(run as Administrator):\n"
            f'  netsh advfirewall firewall add rule name="EcoLens API" dir=in action=allow '
            f'protocol=TCP localport={args.port}'
        )


if __name__ == "__main__":
    main()
