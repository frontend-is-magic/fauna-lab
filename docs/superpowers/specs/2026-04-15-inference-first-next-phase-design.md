# Inference-First Next Phase Design

Date: 2026-04-15
Status: Ready for user review

## Background

The repository now has two relatively complete flows:

- Dataset management
- Training workflow

It also has a clear external-storage model and root-level startup scripts for local development.

What is still missing is the first complete "use the trained model" flow. Right now:

- `frontend/src/pages/inference.tsx` is still a placeholder page
- `backend/app/services/predictor.py` is still a placeholder implementation
- model listing exists, but model management is only partially implemented
- project-wide validation and acceptance work still need follow-up

That means the product can already collect data and train a model, but it still cannot complete the most important next story:

**train a model, then use that model for a real prediction**

## Goal

Define the next development phase so that the project advances by closing the real inference loop first, while still planning for model management and project stabilization as the following phases.

The design should:

- prioritize a real inference flow over evenly spreading work across all unfinished areas
- keep the first phase small enough to start immediately
- reuse existing repository patterns instead of introducing new architecture
- keep model management and stability work in the roadmap, but not let them block the first inference milestone

## Chosen approach

Use an **inference-first staged roadmap**.

### Phase 1
Complete the smallest real inference loop:

- train artifact exists in external storage
- frontend inference page becomes usable
- backend predictor becomes real
- user can select a model, upload one image, and receive real predictions

### Phase 2
Close the model-management loop:

- complete model list UX
- implement real download and delete behavior
- improve model metadata visibility

### Phase 3
Close the stability and delivery gap:

- validation commands
- smoke tests
- README and PR-check guidance
- clearer handoff and acceptance practices

This approach was chosen because it produces the clearest product-level progress with the least phase-1 scope risk.

## Scope

### In scope for the first phase

- backend real inference implementation
- frontend inference page implementation
- minimal contract alignment between training output and inference input
- minimal end-to-end validation for the inference path

### Explicitly out of scope for the first phase

- full model-management UI and workflows
- training-state persistence redesign
- broad lint/typecheck debt cleanup across the entire repo
- advanced inference features such as batch prediction, Grad-CAM, prediction history, or multi-model comparison
- large theme-system expansion or unrelated UI refactoring

## Architecture boundaries

The first phase should close this product story:

**Dataset -> Train -> model artifact -> Inference -> real prediction result**

It should not try to complete every unfinished area at once.

### Frontend boundary

The inference page is responsible for:

- selecting a model
- selecting or uploading a single image
- choosing `top_k`
- submitting the prediction request
- showing prediction results and request state

The page should remain a coordinator. API calls belong in `frontend/src/services/*.ts`, following existing repository structure.

### Backend boundary

The predictor service is responsible for:

- locating the checkpoint file
- loading checkpoint metadata and weights
- rebuilding the model for inference
- preprocessing the image
- running prediction
- returning sorted prediction results

The router should stay thin and only translate HTTP input/output and errors.

### Integration boundary

Integration work is responsible for making sure the training output can be consumed directly by inference without inventing a second metadata system.

The checkpoint format should remain the single source of truth for inference-related model information.

## Component responsibilities

### Frontend: inference page

Replace `frontend/src/pages/inference.tsx` with a real page that includes:

- model selector
- image input
- `top_k` control
- request trigger
- result list with confidence display
- empty/loading/error/success states

The page should not take on model parsing or response-shaping work that belongs in the service layer.

### Frontend: inference service

Add a feature-specific service module under `frontend/src/services/` for:

- reading available models from the existing model list endpoint
- sending inference requests
- exposing typed response shapes that mirror backend schemas

### Backend: predictor service

Replace the placeholder predictor logic with real inference behavior that:

- accepts a checkpoint identity
- validates that the checkpoint exists and is usable
- restores the classification model
- preprocesses the uploaded image using inference-safe transforms
- runs prediction and returns top-k results

### Backend: model registry relationship

The existing model list behavior should remain the source of selectable models for the inference page in phase 1.

The models page does not need to be completed before inference can ship.

### Integration: artifact contract

The inference flow depends on a minimal checkpoint contract being treated as stable.

Required inference fields:

- `arch`
- `num_classes`
- `class_names`
- `image_size`
- `state_dict`

Useful but non-blocking fields:

- `val_acc`
- `trained_at`
- `train_loss`
- `history`

## Data flow and contract rules

### End-to-end flow

The intended flow is:

1. user uploads dataset
2. user starts training
3. backend writes a checkpoint to external `checkpoints/`
4. inference page loads model list
5. user chooses a model and uploads one image
6. backend loads the checkpoint and runs inference
7. frontend renders ranked predictions and confidence values

### Model identity rule

For phase 1, `model_id` should remain the checkpoint filename.

That means:

- frontend obtains the `id` from the model list response
- frontend sends that `id` back during inference
- backend resolves the model file from `checkpoints/`

This keeps the system simple and aligned with the repository's current file-based runtime model.

### Inference request shape

Use `multipart/form-data` with:

- image file
- `model_id`
- `top_k`

### Inference response shape

Return:

- `predictions`
- `inference_time_ms`

Each prediction item should include:

- `class_name`
- `confidence`

The backend should sort predictions from highest to lowest confidence before returning them.

### Relationship to models work

Phase 1 may depend on the existing model-list API, but it should not depend on a completed models page.

This prevents the inference milestone from being blocked by model-management UX work.

## Error handling

The first phase should only cover the failures that are both realistic and blocking for the core flow.

### Frontend validation failures

Prevent request submission and show direct feedback when:

- no model is selected
- no image is selected
- `top_k` is invalid

These errors should be handled before the request is sent.

### Backend failure classes

#### Model not found

If the requested `model_id` does not exist, return `404`.

#### Checkpoint unusable

If the checkpoint is corrupted, missing required inference fields, or structurally incompatible with the rebuilt model, return a clear failure that distinguishes model invalidity from user input errors.

#### Invalid image

If the uploaded file cannot be decoded as an image, return `400`.

#### `top_k` larger than class count

Do not fail the request for this alone. Clamp it to the number of available classes.

### UI error expression

The page should distinguish between:

- form-state problems
- request failures
- result-state emptiness

It should not collapse all failures into one generic message.

### Non-goals in error design

The first phase should not introduce:

- model caching and cache invalidation strategy
- device selection UI
- advanced concurrency optimization
- persisted inference history

## Validation and acceptance

### Phase-1 required validation

The first phase is successful only if the following can be demonstrated:

1. backend starts and `/health` is healthy
2. model list returns at least one trained checkpoint
3. inference page can select a model
4. inference page can upload one image
5. backend returns real predictions instead of placeholder output
6. frontend correctly renders class names and confidence values

### Recommended validation layers

#### Backend

- startup verification
- minimal inference smoke tests
- smoke coverage for:
  - valid prediction
  - missing model
  - invalid image

#### Frontend

- page-level manual acceptance
- maintain buildability for the touched frontend surface

#### Integration

- at least one full manual run from trained artifact to prediction result

### Lint and typecheck positioning

The repository already has known validation debt in `lint` and `typecheck`.

The first inference phase should avoid increasing that debt, but broad cleanup should be handled as a dedicated later phase rather than blocking the initial inference milestone.

## Phase plan

### Phase 1: real inference loop

#### Objective

Turn inference from placeholder state into a usable product flow.

#### Deliverables

- real backend predictor
- real inference page
- stable minimum checkpoint contract for inference
- local proof that trained models can be used for real predictions

#### Completion standard

A user can choose an existing trained model, upload one image, and receive real ranked predictions.

### Phase 2: model management closure

#### Objective

Turn model artifacts from passive files into manageable assets.

#### Deliverables

- real models page behavior
- real download behavior
- real delete behavior
- improved model metadata display

#### Completion standard

Users can see, download, and delete models through the application rather than only through filesystem inspection.

### Phase 3: stabilization and delivery closure

#### Objective

Improve repeatability and handoff quality for ongoing development.

#### Deliverables

- frontend validation command closure
- backend smoke-test coverage for core routes
- clearer README setup and validation guidance
- clearer PR-check and acceptance guidance

#### Completion standard

The main flows have clearer verification rules and lower handoff friction.

## Recommended execution order

1. backend predictor implementation
2. inference contract verification against training artifacts
3. frontend inference page implementation
4. end-to-end manual validation
5. then move to model-management closure
6. then move to stabilization work

This order is recommended because the current inference page is mostly empty, while backend contract reality determines what the page can reliably present.

## Non-goals

This design does not attempt to:

- finish every unfinished page in one phase
- redesign training architecture
- introduce a database-backed model registry
- solve all historical validation debt before feature progress continues
- define the low-level implementation steps yet

## Review standard

This design is successful if it gives the next implementation planning step a clear answer to all of the following:

- what the next phase is really trying to accomplish
- what belongs in phase 1 versus later phases
- which module owns which responsibility
- what minimal contract makes inference possible
- how success will be verified before claiming completion
