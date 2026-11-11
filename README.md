# Multi Modal AI

**Multimodal AI platform for document Q&A, AI content creation, and intelligent document extraction — in one full-stack application.**

Multi Modal AI brings three modalities together behind a single authenticated web interface: ask questions over documents with retrieval-augmented generation (RAG), generate and repurpose content in the Content Studio, and extract structured data from images and PDFs in the OCR review workspace. It is intended for developers exploring how local document retrieval, hosted language/vision models, and structured document processing fit together.

> Formerly developed under the working name *ExcellenceTech RAG Project*; the application has since grown beyond RAG into a multimodal platform covering text, image, and document understanding.

[Quick start](#quick-start) · [Configuration](#configuration) · [API](#api) · [Deployment](#deployment) · [Current limitations](#current-limitations)

## What you can do

| Workspace | Purpose | Implementation |
| --- | --- | --- |
| **Q&A** | Ask questions about the bundled company policy and review retrieved source passages. | Sentence Transformers embeddings, FAISS retrieval, and Gemini answer generation. Chats are saved per account. |
| **Content Studio** | Maintain company information, projects, and brand voices; generate and repurpose content. | Groq-powered generation with SQLite storage. |
| **Documents / OCR** | Upload images or PDFs, extract fields and tables, review bounding boxes, correct results, and export JSON, CSV, or Excel. | OpenCV preprocessing, EasyOCR text recognition, Gemini vision extraction, and a review interface. Approved results can be appended to the active Q&A index. |

Authentication uses email/password accounts, bcrypt password hashing, and JWTs. Cloudflare Turnstile is optional for local development and required by the backend in production mode.

## Technology and structure

The React 19 frontend uses TypeScript, TanStack Start/Router, Tailwind CSS, Vite, and Nitro. A same-origin `/api` proxy connects it to the Python FastAPI backend. SQLite stores accounts, chat history, content, and OCR metadata; FAISS holds the active retrieval index in memory.

```text
.
├── backend/
│   ├── main.py              # FastAPI application and startup
│   ├── core/               # Configuration, authentication, shared database
│   ├── rag/                # Loading, chunking, embeddings, retrieval, answers
│   ├── content/            # Content Studio API and generation
│   ├── ocr/                # OCR API, processing services, document schemas
│   ├── data/               # Bundled company policy; local runtime data
│   ├── .env.example         # Backend configuration template
│   └── requirements.txt
├── frontend/
│   ├── src/                # Routes, UI, API clients, frontend tests
│   ├── .env.example         # Public frontend configuration template
│   └── package-lock.json
├── sample_documents/       # Sample OCR artifacts
├── deploy/                 # Example reverse proxy configuration
├── docker-compose.yml
└── ecosystem.config.js     # Optional PM2 process configuration
```

## Quick start

### Prerequisites

- **Python 3.12** is recommended and used in the Docker/devcontainer setup.
- **Node.js 22.12 or newer** with npm. Node 22 is used in the frontend Docker image.
- A **Gemini API key** for the default backend startup, Q&A, and OCR vision calls.
- A **Groq API key** to use Content Studio generation and repurposing.
- Internet access for dependency installation, initial embedding/OCR model downloads, and hosted AI calls. OCR dependencies include PyTorch and can take significant time and disk space to install.

### 1. Clone the repository

```bash
git clone https://github.com/AmanBadola01/Multi_Modal_AI.git
cd Multi_Modal_AI
```

### 2. Configure the backend

From the repository root:

```bash
python -m venv backend/.venv
```

Activate the virtual environment:

```bash
# macOS / Linux
source backend/.venv/bin/activate
```

```powershell
# Windows PowerShell
.\backend\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

Copy `backend/.env.example` to `backend/.env`, then fill in `GEMINI_API_KEY`, `GROQ_API_KEY`, and a random `JWT_SECRET`. For example, on macOS/Linux:

```bash
cp backend/.env.example backend/.env
```

Generate a signing secret locally and paste it into your private `.env` file:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Keep `APP_ENV=development` and leave Turnstile unset for local use. Backend `.env` files and credentials are ignored by Git.

### 3. Start the backend

In the activated terminal:

```bash
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8092
```

The first startup downloads the embedding model and indexes `backend/data/company_policy.txt`. Wait for Uvicorn to report that startup is complete.

- Health: <http://127.0.0.1:8092/health>
- Interactive API documentation: <http://127.0.0.1:8092/docs>

### 4. Start the frontend

Open a second terminal at the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open **<http://localhost:5178>** and create an account. Passwords require at least eight characters, with uppercase, lowercase, a digit, and a special character. There are no seeded login credentials.

The frontend proxies `/api` requests to `http://127.0.0.1:8092`, so no frontend environment file is needed for this default setup. Vite binds to `0.0.0.0`; use this development server on a trusted network.

### 5. Try the workflows

1. Open Q&A and ask about the bundled company policy. Inspect the source passages alongside the answer.
2. Open Content Studio, configure company details or a brand voice, and generate content using your Groq account.
3. Open Documents, upload an image or PDF, run extraction, review/correct fields and tables, and export the result. Approving a document adds its extracted text to the active shared Q&A index when that index is initialized.

To use a different initial Q&A document, replace `backend/data/company_policy.txt` with your own text and restart the backend. The loader also supports text-based PDFs programmatically; scanned documents use the OCR workspace.

## Configuration

Backend settings load from the process environment first, then `backend/.env`, then the repository-root `.env`. Existing values take precedence. Keep frontend-only settings in `frontend/.env` using its example template.

| Variable | Purpose / default |
| --- | --- |
| `GEMINI_API_KEY` | Required for default RAG startup and Gemini vision extraction. |
| `GEMINI_MODEL` | Gemini model ID; the code defaults to `gemini-3.5-flash-lite`. Override it with a model available to your account if necessary. |
| `GROQ_API_KEY` | Enables Content Studio generation and repurposing. |
| `GROQ_MODEL_FAST` | Short-form and repurposing model; default `openai/gpt-oss-20b`. |
| `GROQ_MODEL_QUALITY` | Long-form model; default `openai/gpt-oss-120b`. |
| `JWT_SECRET` | Stable token-signing secret. Production requires at least 32 characters. Development generates a temporary secret if unset, invalidating tokens after a restart. |
| `APP_ENV` | Defaults to `development`. `production` enforces required backend credentials and Turnstile configuration. |
| `APP_DATA_DIR` | Defaults to `backend/data`. Holds `app.db`, OCR uploads, and extracted text. With a custom directory, copy `company_policy.txt` into it before startup to initialize Q&A. |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist for direct browser-to-backend access. The template includes local port 5178; the default same-origin proxy does not require CORS. |
| `TURNSTILE_SECRET_KEY` | Backend Turnstile verification secret. Pair with the frontend site key. |
| `VITE_TURNSTILE_SITE_KEY` | Public frontend Turnstile key. Set before frontend build; rebuild after changing it. |
| `VITE_API_URL` | Optional public API origin; empty uses the same-origin `/api` proxy. |
| `BACKEND_URL` | Frontend server/proxy target; defaults to `http://127.0.0.1:8092`. Set in the frontend process environment when overriding. |

Never put provider keys, signing secrets, or private tokens in `VITE_` variables: those values are bundled into browser code. AI requests can incur provider charges. Retrieved passages, questions, document images, and generation prompts may be sent to the configured AI providers.

An optional OpenAI branch exists for RAG (`LLM_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_MODEL`), but its SDK is not included in the default requirements. Install `openai` separately if choosing it. OCR vision still uses Gemini.

## API

Open `/docs` on the backend for the complete request and response schemas. Most application endpoints require `Authorization: Bearer <access_token>`, obtained from signup or login.

| Prefix / endpoint | Role |
| --- | --- |
| `GET /health`, `GET /api/health` | Backend health status |
| `/api/auth` | Signup, login, current user |
| `/api/rag/chats` | Chat sessions, history, and questions |
| `/api/content` | Company details, projects, content pieces, brand voices, generation |
| `/api/ocr` | Upload, extraction, document review, exports, approval to RAG |

Check both processes after startup:

```bash
curl --fail http://127.0.0.1:8092/health
curl --fail http://localhost:5178/api/health
```

## Development and validation

From `frontend/`:

```bash
npm test           # Vitest unit/component tests
npm run build     # Production frontend/server bundle
npm run lint      # ESLint and formatting checks
```

The repository currently has existing lint errors; a successful build or test run does not imply lint passes.

From an activated backend environment at the repository root:

```bash
python -m pip check
python backend/ocr/test_pipeline.py
```

The standalone OCR script is an integration demonstration: it downloads models as needed, calls Gemini, generates a tilted invoice image, and writes annotated/export artifacts under `sample_documents/invoices/`. It overwrites `sample_export.xlsx`. It is not an offline unit test. Other OCR test scripts use API/database fixtures; run those only with an isolated development data directory.

A devcontainer is included with Python 3.12, Node 22, and forwarded ports 5178/8092. Supply your private environment configuration and start both services after dependencies install.

## Deployment

Review the limitations below before exposing a deployment to other users. Use HTTPS, private backend access, persistent data storage, and a host secret manager. Set production Turnstile keys for the actual public hostname.

### Docker Compose

The included Compose configuration requires `GEMINI_API_KEY`, `GROQ_API_KEY`, `JWT_SECRET`, `TURNSTILE_SECRET_KEY`, and `VITE_TURNSTILE_SITE_KEY` in its environment or a private repository-root `.env`. The site key is passed as a frontend build argument. Backend `.env` is not used for Compose interpolation.

The frontend is published at `127.0.0.1:5178` on the Docker host; the backend is internal to the Compose network. Put a reverse proxy in front of the frontend for remote HTTPS access. [`deploy/Caddyfile.example`](deploy/Caddyfile.example) is an example, not evidence that a proxy is installed or configured on your host.

The `backend-data` volume stores application data and `model-cache` stores Hugging Face downloads. **Before the first backend startup, seed `company_policy.txt` in the data volume**, because the configured `APP_DATA_DIR` differs from the bundled source directory:

```bash
docker compose build
docker compose run --rm --no-deps backend python -c "from pathlib import Path; import shutil; p=Path('/var/lib/excellencetech/company_policy.txt'); shutil.copyfile('/app/backend/data/company_policy.txt', p) if not p.exists() else None"
docker compose up -d
docker compose ps
```

Back up persistent data. Removing volumes deletes stored accounts and documents. Python dependencies are not fully locked, so image builds can resolve different dependency versions over time.

### PM2

An optional [`ecosystem.config.js`](ecosystem.config.js) starts the backend from `backend/.venv` and the built frontend from `frontend/.output/server/index.mjs`. Install dependencies, run `npm run build` in `frontend/`, and supply production secrets before starting:

```bash
pm2 start ecosystem.config.js
pm2 status
```

The checked-in configuration binds the backend to `127.0.0.1:8092` and the frontend to `0.0.0.0:20300`. Review these settings and your firewall/reverse proxy for your own host. Set `VITE_TURNSTILE_SITE_KEY` during the build, and `BACKEND_URL` in the production frontend server environment when using another backend address.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Backend exits during startup | Check `GEMINI_API_KEY`, virtual environment activation, dependency installation, and network access for the first embedding-model download. |
| Gemini returns a model or permission error | Set `GEMINI_MODEL` to a model your account can access, check API permissions/quota, and restart the backend. |
| Frontend reports a backend connection error | Confirm the backend completed startup on port 8092; check `BACKEND_URL` if overriding the default. |
| Port 5178 is occupied | Stop your own conflicting process or select another Vite port with `npm run dev -- --port <port>`. Update direct-access CORS settings if needed. |
| Sign-in security check fails | Configure both Turnstile keys for the hostname, or leave both unset in local development. Production requires them. |
| Q&A says no document is indexed | Ensure `company_policy.txt` exists in `APP_DATA_DIR` and restart. |
| Content generation fails | Check `GROQ_API_KEY`, model access, and provider quota. |
| OCR is slow on first use | Allow the recognition model to download. CPU OCR and multi-page PDFs take longer than plain-text retrieval. |
| Existing login stops working after a restart | Set a stable `JWT_SECRET` and sign in again. |

## Current limitations

- **Shared retrieval index:** one process-wide Q&A index serves all authenticated users. Documents approved into that index become available to other users' questions. Use non-sensitive demonstration data; private per-user retrieval is not implemented.
- **In-memory retrieval:** startup indexes only `company_policy.txt`. OCR-approved text is saved to disk but is not automatically reindexed on restart. Multiple backend workers would have independent indexes.
- **AI accuracy:** grounding prompts and similarity thresholds reduce unsupported answers but cannot guarantee correctness. Review generated text and extracted fields before using them.
- **Release verification:** frontend tests and builds are available, but lint has existing failures, npm audit reports unresolved dependency advisories, and Python dependencies are not fully pinned. Provider-backed end-to-end checks require valid credentials, quota, and separate validation.

See [the readiness review](docs/READINESS.md) for verification results and remaining release work.

## Contributing and license

Keep changes focused, document configuration changes, run relevant checks, and exclude credentials and generated runtime data from commits. Explain any failing checks when proposing a change.

No license file is currently included. Ask the repository owner about permitted reuse and redistribution before adopting this code outside the intended project.
