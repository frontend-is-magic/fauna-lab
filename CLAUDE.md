# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working directories and commands

- This repo has no top-level workspace runner. Run commands from `frontend/` or `backend/`.
- For full local startup from the repo root, prefer the root-level platform scripts:
  - macOS/Linux: `bash start.sh`
  - Windows PowerShell: `./start.ps1`
  - Windows cmd: `start.bat`
- These scripts only orchestrate the existing frontend/backend dev commands. They assume dependencies are already installed, prefer the repo-local `.conda/fauna-lab` env or a named `fauna-lab` conda env when available, and wait for backend health before starting the frontend.

### Frontend (`frontend/`)

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

- Vite dev server runs on `http://localhost:5173`.
- API base URL comes from `VITE_API_BASE_URL`; fallback is `http://localhost:8000`.

### Backend (`backend/`)

```bash
conda env create -f environment.yml
conda activate fauna-lab
python -m uvicorn app.main:app --reload
curl http://localhost:8000/health
```

If conda is not being used:

```bash
pip install -r requirements.txt
pip install -e .
```

## Validation reality

- No committed automated test suite exists yet for either app.
- There is currently no real single-test command to document.
- Frontend validation is `pnpm lint && pnpm typecheck && pnpm build`.
- Backend validation is API startup plus endpoint smoke tests.

## Big-picture architecture

### Frontend

- `frontend/src/router.tsx` generates routes from `src/pages/**/*.tsx` using `import.meta.glob`.
  - `index.tsx` -> `/`
  - `_layout.tsx` -> shared shell
  - `[param].tsx` -> dynamic route segment
  - `not-found.tsx` -> fallback route
- `frontend/src/pages/_layout.tsx` owns the shared app shell and theme switcher.
- Theme state lives in Jotai; theme definitions live under `frontend/src/themes/`.
- API calls should go through `frontend/src/services/http.ts`, with feature-specific wrappers in `frontend/src/services/*.ts`.

### Backend

- `backend/app/main.py` wires FastAPI, CORS, and routers.
- Code is organized as:
  - `backend/app/routers/`: HTTP layer and status-code mapping
  - `backend/app/services/`: business logic
  - `backend/app/schemas.py`: shared request/response models
- Current local-dev CORS only allows `http://localhost:5173`.

### Cross-app contract shape

- Backend response models are centralized in `backend/app/schemas.py`.
- Frontend mirrors those shapes in `frontend/src/services/*.ts`.
- When changing API payloads, update both sides together.

## Runtime storage rules

- Runtime data must live outside the git workspace. `backend/app/storage.py` rejects repo-local storage roots.
- Storage root precedence is:
  1. `FAUNA_LAB_STORAGE_DIR`
  2. saved app config
  3. OS default app-data directory
- `FAUNA_LAB_CONFIG_DIR` can override the config directory location.
- The backend manages:
  - `datasets/`
  - `checkpoints/`
  - `metadata/`
- Do not add features that write datasets, checkpoints, or runtime metadata into the repository tree.

## Main feature flows

### Dataset flow

- Frontend: `frontend/src/pages/dataset.tsx`
- Services: `frontend/src/services/dataset.ts`, `frontend/src/services/settings.ts`
- Backend: `backend/app/routers/dataset.py`, `backend/app/routers/settings.py`, `backend/app/services/dataset_manager.py`
- Uploads use `multipart/form-data` plus `class_name` as a query param, not JSON.
- Previews are generated on the backend and returned as base64 data URLs.
- The page uses browser folder upload (`webkitdirectory`), but the backend storage root is configured separately via settings.

### Training flow

- Frontend: `frontend/src/pages/train.tsx`, `frontend/src/services/train.ts`
- Backend: `backend/app/routers/train.py`, `backend/app/services/trainer.py`
- Training runs in a background `threading.Thread` with a single global in-memory `train_state`.
- The trainer loads images from external storage with `torchvision.datasets.ImageFolder`.
- The UI polls status/history every 4 seconds while training is running.
- The practical model path right now is `vit_b_16`.
- Live training state/history are not persisted across backend restarts, though checkpoint files remain on disk.

### Inference and models

- `frontend/src/pages/inference.tsx` and `frontend/src/pages/models.tsx` are still placeholder UI.
- `backend/app/services/predictor.py` is placeholder inference logic.
- Model listing is real and reads `.pt` files from `checkpoints/`.
- Model download returns `501 Not Implemented`.
- The model delete route is still a stub and is not wired to actual file deletion.

## Current repo state

- Dataset management and training are the most complete end-to-end flows.
- Inference and model-management are only partially implemented.
- `AGENTS.md` contains broader product and collaboration decisions.
- `TODO.md` is the best quick snapshot of unfinished work on the current branch.
