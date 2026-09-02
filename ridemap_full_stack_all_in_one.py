#!/usr/bin/env python3
"""
RideMap Full-Stack All-in-One Launcher
Automates backend migrations, frontend dependency install, build verification,
and launches Django (port 8000) + Vite (port 5173) dev servers.
"""
import subprocess
import sys
import os
import shutil
import time
import signal
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
VENV = BACKEND / "venv"

processes = []


def log(msg):
    print(f"[RideMap] {msg}")


def resolve_command(cmd):
    if os.name != "nt" or not isinstance(cmd, list):
        return cmd

    resolved = []
    for part in cmd:
        if part in {"npm", "npm.cmd", "python", "python3", "py"}:
            candidate = shutil.which(part) or shutil.which(part + ".cmd") or shutil.which(part + ".exe")
            resolved.append(candidate or part)
        else:
            resolved.append(part)
    return resolved


def run(cmd, cwd=None, check=True):
    command = resolve_command(cmd)
    log(f"Running: {' '.join(command) if isinstance(command, list) else command}")
    result = subprocess.run(command, cwd=cwd, shell=isinstance(command, str))
    if check and result.returncode != 0:
        log(f"Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)
    return result


def find_python():
    """Resolve a working Python executable on Windows/macOS/Linux."""
    candidates = [
        os.environ.get('RIDEMAP_PYTHON'),
        str(ROOT / ".venv" / "Scripts" / "python.exe"),
        str(BACKEND / "venv" / "Scripts" / "python.exe"),
        str(ROOT / ".venv" / "bin" / "python"),
        str(BACKEND / "venv" / "bin" / "python"),
        shutil.which('python3'),
        shutil.which('python'),
    ]
    for c in candidates:
        if c and (Path(c).exists() if os.path.isabs(c) or c.startswith('.') else True):
            try:
                subprocess.run([c, '--version'], capture_output=True, check=True)
                return c
            except Exception:
                continue
    return sys.executable


def setup_backend():
    log("=== Setting up Django Backend ===")
    python_bin = find_python()
    log(f"Using Python: {python_bin}")

    if not VENV.exists():
        log("Creating Python virtual environment...")
        run([python_bin, "-m", "venv", str(VENV)])

    python = str(VENV / ("Scripts" if os.name == "nt" else "bin") / "python")
    if not os.path.exists(python):
        python = python_bin

    run([python, "-m", "pip", "install", "-r", "requirements.txt"], cwd=BACKEND)
    run([python, "manage.py", "makemigrations", "api"], cwd=BACKEND)
    run([python, "manage.py", "migrate"], cwd=BACKEND)

    log("Creating demo account...")
    run([
        python,
        "-c",
        "import os; import django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ridemap.settings'); django.setup(); from django.contrib.auth import get_user_model; User = get_user_model(); user, created = User.objects.get_or_create(username='admin', defaults={'email': 'admin@example.com'}); user.set_password('admin123'); user.is_staff = True; user.is_superuser = True; user.save(); print('created' if created else 'updated')",
    ], cwd=BACKEND)

    log("Backend setup complete.")
    return python


def setup_frontend():
    log("=== Setting up React Frontend ===")
    if not shutil.which("npm"):
        log("WARNING: npm not found. Skipping frontend setup.")
        return False

    if not (FRONTEND / "node_modules").exists():
        run(["npm", "install"], cwd=FRONTEND)
    else:
        log("node_modules already exists, skipping npm install.")

    log("Verifying frontend build...")
    run(["npm", "run", "build"], cwd=FRONTEND)
    log("Frontend build verified.")
    return True


def launch(python_path):
    log("=== Launching Dev Servers ===")

    django = subprocess.Popen(
        [python_path, "manage.py", "runserver", "0.0.0.0:8000"],
        cwd=BACKEND,
    )
    processes.append(django)
    log("Django REST API → http://127.0.0.1:8000 (0.0.0.0:8000)")

    if shutil.which("npm") or shutil.which("npm.cmd"):
        npm_cmd = shutil.which("npm.cmd") or shutil.which("npm") or "npm"
        vite = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=FRONTEND,
            shell=False,
        )
        processes.append(vite)
        log("Vite React App → http://localhost:5173")
    else:
        log("npm not available — frontend not started.")

    log("")
    log("=" * 50)
    log("  RideMap is running!")
    log("  Open http://localhost:5173 in your browser")
    log("  Press Ctrl+C to stop all servers")
    log("=" * 50)

    try:
        while True:
            time.sleep(1)
            for p in processes:
                if p.poll() is not None:
                    log(f"A server process exited (code {p.returncode}). Shutting down.")
                    cleanup()
                    sys.exit(1)
    except KeyboardInterrupt:
        cleanup()


def cleanup():
    log("Shutting down servers...")
    for p in processes:
        try:
            p.terminate()
            p.wait(timeout=5)
        except Exception:
            p.kill()


def main():
    os.chdir(ROOT)
    log("RideMap Full-Stack Launcher")
    log(f"Project root: {ROOT}")

    python_path = setup_backend()
    setup_frontend()
    launch(python_path)


if __name__ == "__main__":
    main()
