# HNX26PSI07: Autonomous Vision & Behaviour Understanding System - Backend

High-performance backend foundation for video input processing, real-time object tracking, temporal behaviour understanding, zone intrusion detection, anomaly evidence extraction, and LLM-assisted explanation.

---

## Architecture Overview

```
Video Input
    ↓
Video Processing
    ↓
Object Detection (YOLO)
    ↓
Object Tracking (ByteTrack / BoT-SORT)
    ↓
Temporal Analysis
    ↓
Behaviour Recognition
    ↓
Spatial Zone Analysis
    ↓
Anomaly / Event Detection
    ↓
Event Context
    ↓
Evidence Generation
    ↓
Natural Language Explanation (LLM)
    ↓
REST API (FastAPI)
```

---

## Directory Structure

```text
backend/
├── app/
│   ├── main.py              # FastAPI application entrypoint, middleware, lifespan
│   ├── config.py            # Pydantic Settings configuration & env loading
│   ├── database.py          # SQLAlchemy engine, session maker, get_db dependency
│   ├── models/              # SQLAlchemy database models (Video, Track, Detection, Event)
│   ├── schemas/             # Pydantic validation schemas
│   ├── api/                 # Versioned REST API endpoints (/api/v1)
│   ├── services/            # Business and database query services
│   ├── vision/              # Computer vision & tracking modules (Phase 2)
│   ├── behaviour/           # Behaviour & spatial zone analysis (Phase 3)
│   ├── events/              # Anomaly detection & event contextualization (Phase 4)
│   ├── explanation/         # Natural language reporting & LLM generation (Phase 5)
│   └── utils/               # Centralized logging, helpers
├── uploads/                 # Storage for uploaded raw video files
├── processed/               # Storage for processed annotated videos
├── evidence/                # Extracted anomaly image keyframes / clips
├── tests/                   # Pytest test suite
├── requirements.txt         # Python project dependencies
├── .env.example             # Example configuration
├── .env                     # Local environment settings
└── README.md                # System documentation
```

---

## Getting Started

### 1. Prerequisites
- Python 3.11+
- Virtual environment (recommended)

### 2. Setup Virtual Environment & Install Dependencies
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Run the Development Server
```bash
uvicorn app.main:app --reload
```

The server starts by default on `http://localhost:8000`.

- Interactive Swagger Docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health Check: `http://localhost:8000/health`

---

## REST Endpoints (Complete API Matrix)

### Videos
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/videos` | Upload video file (MP4, AVI, MOV, MKV) with validation & OpenCV metadata extraction |
| `GET` | `/api/v1/videos` | List all uploaded videos |
| `GET` | `/api/v1/videos/{id}` | Retrieve video details & metadata |
| `DELETE` | `/api/v1/videos/{id}` | Delete video record and delete stored file on disk |
| `GET` | `/api/v1/videos/{id}/stream` | Stream video supporting HTTP 206 Partial Content (seeking/scrubbing) |
| `GET` | `/api/v1/videos/{id}/status` | Real-time processing progress and status (`QUEUED`, `DETECTING`, `TRACKING`, `ANALYZING`, etc.) |

### Processing
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/videos/{id}/process` | Trigger end-to-end background processing pipeline |

### Detection
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/videos/{id}/detections` | Retrieve detected objects (filtered by `class_name`, `min_confidence`, `frame_id`) |

### Tracking
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/videos/{id}/tracks` | Retrieve tracked objects with persistent Track IDs and time ranges |
| `GET` | `/api/v1/tracks/{id}` | Retrieve tracked object details by Track ID |
| `GET` | `/api/v1/tracks/{id}/history` | Retrieve full spatial trajectory history (`center_x`, `center_y`, `width`, `height`) |

### Behaviour
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/videos/{id}/behaviours` | Retrieve behavior intervals for a video |
| `GET` | `/api/v1/tracks/{id}/behaviours` | Retrieve behavior intervals for a specific Track ID |

### Spatial Zones
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/videos/{id}/zones` | Define custom spatial polygon zones (`Safe Zone`, `Restricted Zone`, `Machine Area`, etc.) |
| `GET` | `/api/v1/videos/{id}/zones` | Retrieve defined polygon zones for a video |
| `PUT` | `/api/v1/zones/{id}` | Update name, type, or polygon coordinates of a zone |
| `DELETE` | `/api/v1/zones/{id}` | Delete a polygon zone |

### Events & Evidence
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/videos/{id}/events` | Retrieve detected events & anomalies (`LOITERING`, `RESTRICTED_ZONE_ENTRY`) |
| `GET` | `/api/v1/events/{id}` | Retrieve specific event details with trigger reasons and contextual metadata |
| `GET` | `/api/v1/events/{id}/evidence` | Stream/download generated evidence video clip with boundary padding and HUD overlays |

---

## Testing

Run unit and integration tests using pytest:

```bash
pytest
```

---

## Database Migration Path
The backend currently defaults to SQLite (`sqlite:///./hnx_vision.db`) for lightweight local development. The database abstraction is built on SQLAlchemy 2.0 ORM. To switch to PostgreSQL in production, simply update `DATABASE_URL` in your `.env`:

```env
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/hnx_vision
```
