# RideMap

Motorcycle travel journal and community platform — full-stack example with a Django backend and a Vite + React frontend.

**Project Snapshot**

- **Frontend:** Vite + React (see `frontend/`)
- **Backend:** Django REST Framework (see `backend/`)
- **Database:** SQLite (`backend/db.sqlite3` for local development)
- **One-file runner:** `ridemap_full_stack_all_in_one.py` (convenience entry)
- **Windows helper:** `ride.bat`

**Quick Launch**

Run the bundled runner (Windows):

```powershell
ride
```

Or run the all-in-one script:

```bash
python ridemap_full_stack_all_in_one.py
```

Default local URLs:

- Frontend: http://localhost:5173
- Backend API: http://127.0.0.1:8000/api/

**Repository Structure**

```
.
├─ backend/                # Django project and API
│  ├─ manage.py
│  ├─ requirements.txt
│  └─ db.sqlite3
├─ frontend/               # Vite + React app
│  └─ src/
├─ ridemap_full_stack_all_in_one.py
├─ ride.bat
└─ README.md
```

**Prerequisites**

- Python 3.10+ (recommended)
- Node.js 16+ and npm or yarn
- Git (optional)

**Backend — Setup & Run**

1. Create a Python virtual environment and activate it:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install backend dependencies:

```bash
pip install -r backend/requirements.txt
```

3. Apply migrations and create a superuser:

```bash
cd backend
python manage.py migrate
python manage.py createsuperuser
```

4. Run the Django development server:

```bash
python manage.py runserver
```

API root will be available at `/api/` (e.g. http://127.0.0.1:8000/api/).

**Frontend — Setup & Run**

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Run the dev server (Vite):

```bash
npm run dev
```

The frontend will typically be served at http://localhost:5173 and proxy calls to the backend API during development.

**Full-stack options**

- Use `ridemap_full_stack_all_in_one.py` to start both backend and frontend together (convenience script).
- Use `ride.bat` on Windows to run the recommended local startup sequence.

**Environment / Configuration**

- For production or advanced local configs, provide environment variables (example `.env`):

```
SECRET_KEY=replace-with-your-secret
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

Note: The Django settings file is at `backend/ridemap/settings.py`.

**Database**

- This project uses SQLite for local development. The file is at `backend/db.sqlite3`.
- To switch to PostgreSQL or another DB, update `backend/ridemap/settings.py` and install the appropriate DB driver.

**Testing**

Run backend tests:

```bash
cd backend
python manage.py test
```

Frontend tests (if any) are run with the frontend test runner (configure in `frontend/package.json`).

**Development Notes & Tips**

- API endpoints and serializers live in `backend/api/` (`views.py`, `serializers.py`, `urls.py`).
- Frontend app bootstrap is in `frontend/src/main.jsx` and main components are in `frontend/src/components/`.
- Use the Django admin at `/admin/` to manage models during development.

**Deployment**

- For production, build the frontend (`npm run build`) and serve static files with Django or a separate static hosting solution.
- Configure a proper production database, DEBUG=False, secure SECRET_KEY, and allowed hosts.

**Contributing**

- Fork the repo, create a branch for your change, and open a pull request.
- Keep changes focused and include tests where applicable.

**License**

Specify your project license here (e.g., MIT). Replace this section with the chosen license.

---

If you want, I can also add a short section with common troubleshooting steps, or generate a `.env.sample` and `CONTRIBUTING.md` file next.
