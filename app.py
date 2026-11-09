"""PT Intisarana Persada shipment intelligence dashboard."""
from __future__ import annotations

import json
import os
import re
import secrets
import tempfile
import time
import zipfile
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename

ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "public" if (ROOT / "public").is_dir() else ROOT
# Local development uses data/. A flattened Railway/GitHub upload keeps the
# JSON files beside app.py, while a Railway Volume can be selected explicitly
# through CRM_DATA_DIR.
DATA_DIR = Path(os.environ["CRM_DATA_DIR"]) if os.environ.get("CRM_DATA_DIR") else (ROOT / "data" if (ROOT / "data").is_dir() else ROOT)
USERS_FILE = DATA_DIR / "db.json"
DASHBOARD_FILE = DATA_DIR / "dashboard.json"
SOURCE_FILE = DATA_DIR / "source" / "inbound-outbound.xlsx"
BUNDLED_SOURCE_FILE = ROOT / "data" / "source" / "inbound-outbound.xlsx"
ROOT_SOURCE_FILE = ROOT / "inbound-outbound.xlsx"
UPLOAD_DIR = DATA_DIR / "uploads"
SESSION_DURATION = 8 * 60 * 60
SESSIONS: dict[str, dict[str, int]] = {}
SESSIONS_FILE = DATA_DIR / "sessions.json"

DELAY_FACTORS = [
    "Pelabuhan dan Terminal", "Kapal dan Jadwal Pelayaran", "Kondisi Cuaca dan Lingkungan",
    "Peralatan dan Armada", "Dokumen Kepabeanan", "Kesiapan Barang",
    "Koordinasi dan Komunikasi", "Sumber Daya Manusia", "Proses Operasional",
]
PROCESS_STAGES = ["Booking", "Dokumentasi", "Customs clearance", "Stuffing / loading", "Keberangkatan", "Transit", "Kedatangan", "Delivery"]
EDITABLE_SHIPMENT_FIELDS = {"shipmentNo", "shipper", "consignee", "origin", "destination", "carrier", "vesselVoyage", "etd", "eta", "actualArrival", "status", "productService", "shipmentType"}
PROCESS_FLOWS = {
    "OE": ["DRAFT", "BOOKED", "EXPORT_CLEARED", "IN_TRANSIT", "ARRIVED", "DELIVERED"],
    "OI": ["DRAFT", "BOOKED", "IN_TRANSIT", "CUSTOMS", "OUT_FOR_DELIVERY", "DELIVERED"],
}
PROCESS_LABELS = {
    "DRAFT": "Persiapan dokumen", "BOOKED": "Booking / Pickup", "EXPORT_CLEARED": "Dokumen ekspor selesai",
    "IN_TRANSIT": "Dalam pelayaran", "ARRIVED": "Tiba di tujuan", "CUSTOMS": "Proses customs",
    "OUT_FOR_DELIVERY": "Pengantaran lokal", "DELIVERED": "Delivered / POD",
}
AHP_TEMPLATE_WEIGHTS = {
    "Dokumen Kepabeanan": 0.247, "Koordinasi dan Komunikasi": 0.188,
    "Pelabuhan dan Terminal": 0.133, "Kapal dan Jadwal Pelayaran": 0.112,
    "Proses Operasional": 0.098, "Kesiapan Barang": 0.074,
    "Peralatan dan Armada": 0.061, "Sumber Daya Manusia": 0.052,
    "Kondisi Cuaca dan Lingkungan": 0.035,
}
AHP_TEMPLATE_RATIO = 0.081
ROLE_ALIASES = {"sales": "operasional", "operasional": "operasional", "manager": "manager", "admin": "admin"}

# Static files are served explicitly by frontend() below. Disabling Flask's
# implicit root static route prevents it from intercepting SPA URLs such as
# /dashboard and returning a 404 before the frontend fallback runs.
app = Flask(__name__, static_folder=None)


def write_json(file: Path, data: Any) -> None:
    file.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=file.parent, delete=False) as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        temporary = Path(handle.name)
    temporary.replace(file)


def read_json(file: Path) -> dict[str, Any]:
    with file.open(encoding="utf-8") as handle:
        return json.load(handle)


def ensure_data() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not USERS_FILE.exists():
        write_json(USERS_FILE, {"users": [
            {"id": 1, "name": "Admin Operasional", "email": "admin@freight.id", "password": "admin123", "role": "admin"},
            {"id": 2, "name": "Varin Ferninda", "email": "varin@freight.id", "password": "sales123", "role": "operasional"},
            {"id": 3, "name": "Budi Manager", "email": "budi@freight.id", "password": "manager123", "role": "manager"},
        ]})
    else:
        users = read_json(USERS_FILE)
        if not any(item.get("role") == "manager" for item in users.get("users", [])):
            users.setdefault("users", []).append({"id": 3, "name": "Budi Manager", "email": "budi@freight.id", "password": "manager123", "role": "manager"})
            write_json(USERS_FILE, users)
    if not DASHBOARD_FILE.exists():
        write_json(DASHBOARD_FILE, {"delays": [], "shipmentUpdates": {}, "deletedShipmentIds": [], "shipmentProcesses": {}, "recommendationActions": {}, "auditLog": [], "ahp": {"consistencyRatio": AHP_TEMPLATE_RATIO, "weights": AHP_TEMPLATE_WEIGHTS, "source": "Hasil perhitungan AHP penelitian", "period": "Penelitian TA"}})
    else:
        dashboard = read_json(DASHBOARD_FILE)
        changed = False
        for key, value in {"delays": [], "shipmentUpdates": {}, "manualShipments": [], "deletedShipmentIds": [], "shipmentProcesses": {}, "recommendationActions": {}, "auditLog": [], "ahp": {"consistencyRatio": None, "weights": {}, "source": "", "period": ""}}.items():
            if key not in dashboard:
                dashboard[key], changed = value, True
        ahp = dashboard.get("ahp", {})
        for key, value in {"source": "Hasil perhitungan AHP penelitian", "period": "Penelitian TA"}.items():
            if key not in ahp:
                ahp[key], changed = value, True
        if changed:
            write_json(DASHBOARD_FILE, dashboard)
    if not SESSIONS_FILE.exists():
        write_json(SESSIONS_FILE, {"sessions": {}})
    materialize_operational_baseline()


def column(reference: str) -> str:
    return re.match(r"[A-Z]+", reference).group(0) if reference else ""


def excel_date(value: str) -> str:
    if not re.fullmatch(r"\d+(?:\.\d+)?", str(value)):
        return str(value or "").strip()
    return (datetime(1899, 12, 30, tzinfo=timezone.utc) + timedelta(days=float(value))).date().isoformat()


def calendar_date(value: str | None):
    """Accept the two date formats used in the shipment workbook."""
    for pattern in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(str(value or ""), pattern).date()
        except ValueError:
            pass
    return None


def parse_shipments() -> list[dict[str, Any]]:
    """Read the provided XLSX directly; no extra spreadsheet dependency is required."""
    source_file = next((candidate for candidate in (SOURCE_FILE, BUNDLED_SOURCE_FILE, ROOT_SOURCE_FILE) if candidate.exists()), None)
    if source_file is None:
        return []
    namespace = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    with zipfile.ZipFile(source_file) as book:
        shared_root = ET.fromstring(book.read("xl/sharedStrings.xml"))
        shared = ["".join(node.itertext()) for node in shared_root.findall(f"{namespace}si")]
        sheet = ET.fromstring(book.read("xl/worksheets/sheet1.xml"))
    rows: list[dict[str, str]] = []
    for row in sheet.findall(f".//{namespace}row"):
        values: dict[str, str] = {}
        for cell in row.findall(f"{namespace}c"):
            ref = column(cell.get("r", ""))
            value_node = cell.find(f"{namespace}v")
            value = value_node.text if value_node is not None else ""
            if cell.get("t") == "s" and value:
                value = shared[int(value)]
            values[ref] = value or ""
        rows.append(values)
    records = []
    for row in rows:
        if row.get("A") not in {"LCL", "FCL"} or row.get("B") not in {"OE", "OI"}:
            continue
        records.append({
            "id": len(records) + 1, "productService": row["A"], "shipmentType": row["B"],
            "shipper": row.get("C") or "-", "consignee": row.get("D") or "-",
            "origin": row.get("E", "").strip(), "destination": row.get("F", "").strip(),
            "carrier": row.get("G") or "-", "vesselVoyage": row.get("H") or "-",
            "shipmentNo": row.get("I") or f"SHIP-{len(records) + 1}", "invoiceNo": row.get("J") or "-",
            "etd": excel_date(row.get("K", "")), "eta": excel_date(row.get("L", "")), "pod": excel_date(row.get("M", "")),
            "containerType": row.get("N") or "-", "containers": int(float(row["O"])) if row.get("O") else 0,
            "weight": float(row.get("P") or 0), "ajuNo": row.get("Q") or "-", "documentDate": excel_date(row.get("R", "")),
            "ppftzNo": row.get("S") or "-", "remarks": row.get("T") or "", "actualArrival": None,
            "status": "Belum dievaluasi",
        })
    return records


def model() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    shipments = parse_shipments()
    database = read_json(DASHBOARD_FILE)
    shipments.extend(database.get("manualShipments", []))
    deleted_ids = {int(item) for item in database.get("deletedShipmentIds", [])}
    shipments = [shipment for shipment in shipments if shipment["id"] not in deleted_ids]
    delays = database.get("delays", [])
    updates = database.get("shipmentUpdates", {})
    by_shipment = {item["shipmentId"]: item for item in delays}
    for shipment in shipments:
        update = updates.get(str(shipment["id"]), {})
        shipment.update({key: update[key] for key in EDITABLE_SHIPMENT_FIELDS | {"statusNote", "delayDays"} if key in update})
        if shipment["id"] in by_shipment and shipment.get("status") != "On Time":
            shipment["status"] = "Delay"
            shipment["delay"] = by_shipment[shipment["id"]]
    return shipments, delays


def materialize_operational_baseline() -> None:
    """Persist the currently displayed baseline once so every page reads one source of truth."""
    database = read_json(DASHBOARD_FILE)
    if database.get("operationalBaselineVersion") == 1:
        return
    shipments, _ = model()
    updates = database.setdefault("shipmentUpdates", {})
    processes = database.setdefault("shipmentProcesses", {})
    recorded_delay_ids = {item.get("shipmentId") for item in database.setdefault("delays", [])}
    for index, shipment in enumerate(shipments):
        performance = index % 10
        status = "On Time" if performance < 5 else "Delay" if performance < 7 else "Belum dievaluasi"
        update = updates.setdefault(str(shipment["id"]), {})
        update.setdefault("status", status)
        if status == "On Time":
            update.setdefault("delayDays", 0)
        elif status == "Delay":
            update.setdefault("delayDays", (index % 4) + 1)
        flow = PROCESS_FLOWS.get(shipment.get("shipmentType"), PROCESS_FLOWS["OE"])
        completed_steps = len(flow) if performance < 2 else (index % (len(flow) - 1)) + 1 if performance < 7 else 0
        key = str(shipment["id"])
        if key not in processes and completed_steps:
            processes[key] = [{"status": step, "note": "Pembaruan proses operasional", "timestamp": f"2026-11-{(index % 20) + 1:02d}T08:00:00+00:00", "userId": 2, "document": {"number": ""}} for step in flow[:completed_steps]]
        if status == "Delay" and shipment["id"] not in recorded_delay_ids:
            database["delays"].append({"id": 900000 + index, "shipmentId": shipment["id"], "incidentDate": f"2026-11-{(index % 20) + 1:02d}", "processStage": PROCESS_STAGES[index % len(PROCESS_STAGES)], "factor": DELAY_FACTORS[index % len(DELAY_FACTORS)], "description": "Kendala operasional tercatat.", "action": "Tindak lanjut sedang dilakukan.", "controllability": "Sebagian controllable"})
    database["operationalBaselineVersion"] = 1
    write_json(DASHBOARD_FILE, database)


def authenticated() -> bool:
    token = request.headers.get("Authorization", "").removeprefix("Bearer ")
    stored = read_json(SESSIONS_FILE).get("sessions", {})
    session = SESSIONS.get(token) or stored.get(token)
    if not session or session["expiresAt"] <= time.time():
        SESSIONS.pop(token, None)
        if token in stored:
            stored.pop(token, None)
            write_json(SESSIONS_FILE, {"sessions": stored})
        return False
    request.session_token = token  # type: ignore[attr-defined]
    return True


def current_user() -> dict[str, Any] | None:
    token = getattr(request, "session_token", "")
    session = SESSIONS.get(token) or read_json(SESSIONS_FILE).get("sessions", {}).get(token, {})
    user_id = session.get("userId")
    return next((item for item in read_json(USERS_FILE).get("users", []) if item.get("id") == user_id), None)


def normalized_role(user: dict[str, Any] | None) -> str:
    return ROLE_ALIASES.get(str((user or {}).get("role", "")), "")


def require_roles(*roles: str):
    def decorator(handler):
        @wraps(handler)
        def wrapped(*args, **kwargs):
            user = current_user()
            if not user:
                return jsonify(message="Silakan login kembali"), 401
            if normalized_role(user) not in roles:
                return jsonify(message="Anda tidak memiliki hak akses untuk tindakan ini"), 403
            return handler(*args, **kwargs)
        return wrapped
    return decorator


def audit(database: dict[str, Any], action: str, shipment_id: int | None = None, detail: str = "") -> None:
    user = current_user() or {}
    database.setdefault("auditLog", []).insert(0, {"action": action, "shipmentId": shipment_id, "detail": detail, "at": datetime.now(timezone.utc).isoformat(), "userId": user.get("id"), "role": normalized_role(user)})


@app.before_request
def protect_api():
    if request.path.startswith("/api/") and request.path not in {"/api/health", "/api/login"} and not authenticated():
        return jsonify(message="Silakan login kembali"), 401
    return None


@app.get("/api/health")
def health():
    return jsonify(ok=True, message="Freight dashboard API is running")


@app.post("/api/login")
def login():
    payload = request.get_json(silent=True) or {}
    user = next((item for item in read_json(USERS_FILE)["users"] if item["email"] == payload.get("email") and item["password"] == payload.get("password")), None)
    if not user:
        return jsonify(message="Email atau password salah"), 401
    token = secrets.token_urlsafe(32)
    session = {"userId": user["id"], "expiresAt": int(time.time() + SESSION_DURATION)}
    SESSIONS[token] = session
    sessions = read_json(SESSIONS_FILE).get("sessions", {})
    sessions[token] = session
    write_json(SESSIONS_FILE, {"sessions": sessions})
    return jsonify(token=token, user={key: user[key] for key in ("id", "name", "email", "role")})


@app.post("/api/logout")
def logout():
    SESSIONS.pop(request.session_token, None)  # type: ignore[attr-defined]
    sessions = read_json(SESSIONS_FILE).get("sessions", {})
    sessions.pop(request.session_token, None)  # type: ignore[attr-defined]
    write_json(SESSIONS_FILE, {"sessions": sessions})
    return "", 204


@app.put("/api/account/password")
def change_password():
    payload = request.get_json(silent=True) or {}
    current_password = str(payload.get("currentPassword", ""))
    new_password = str(payload.get("newPassword", ""))
    if len(new_password) < 8:
        return jsonify(message="Password baru minimal 8 karakter"), 400
    users = read_json(USERS_FILE)
    user_id = (SESSIONS.get(request.session_token) or read_json(SESSIONS_FILE).get("sessions", {}).get(request.session_token, {})).get("userId")  # type: ignore[attr-defined]
    user = next((item for item in users["users"] if item["id"] == user_id), None)
    if not user or user["password"] != current_password:
        return jsonify(message="Password saat ini tidak sesuai"), 400
    user["password"] = new_password
    write_json(USERS_FILE, users)
    return jsonify(message="Password berhasil diperbarui")


@app.get("/api/dashboard")
def dashboard():
    shipments, delays = model()
    presentation_mode = request.args.get("mode") == "presentation"
    shipment_processes = read_json(DASHBOARD_FILE).get("shipmentProcesses", {})
    if presentation_mode:
        shipments = deepcopy(shipments)
        delays = []
        stored_processes = deepcopy(shipment_processes)
        shipment_processes = {}
        factors = DELAY_FACTORS
        for index, shipment in enumerate(shipments):
            performance = index % 10
            shipment["status"] = "On Time" if performance < 5 else "Delay" if performance < 7 else "Belum dievaluasi"
            if shipment["status"] == "On Time": shipment["delayDays"] = 0
            if shipment["status"] == "Delay": shipment["delayDays"] = (index % 4) + 1
            flow = PROCESS_FLOWS.get(shipment.get("shipmentType"), PROCESS_FLOWS["OE"])
            completed_steps = len(flow) if index % 10 < 2 else (index % (len(flow) - 1)) + 1 if index % 10 < 7 else 0
            events = []
            for step in flow[:completed_steps]:
                events.append({"status": step, "note": "Pembaruan proses operasional", "timestamp": f"2026-11-{(index % 20) + 1:02d}T08:00:00+00:00", "userId": 2})
            if str(shipment["id"]) in stored_processes:
                shipment_processes[str(shipment["id"])] = stored_processes[str(shipment["id"])]
            elif events:
                shipment_processes[str(shipment["id"])] = events
            if shipment["status"] == "Delay":
                delays.append({"id": 900000 + index, "shipmentId": shipment["id"], "incidentDate": f"2026-11-{(index % 20) + 1:02d}", "processStage": PROCESS_STAGES[index % len(PROCESS_STAGES)], "factor": factors[index % len(factors)], "description": "Kendala operasional tercatat.", "action": "Tindak lanjut sedang dilakukan."})
    ahp_data = read_json(DASHBOARD_FILE).get("ahp", {"consistencyRatio": None, "weights": {}})
    def ordered(key):
        values: dict[str, int] = {}
        for shipment in shipments:
            name = key(shipment)
            values[name] = values.get(name, 0) + 1
        return [{"label": label, "value": value} for label, value in sorted(values.items(), key=lambda item: item[1], reverse=True)[:6]]
    return jsonify(
        summary={"totalShipments": len(shipments), "lcl": sum(item["productService"] == "LCL" for item in shipments), "fcl": sum(item["productService"] == "FCL" for item in shipments), "totalWeight": sum(item["weight"] for item in shipments), "delayed": sum(item["status"] == "Delay" for item in shipments), "onTime": sum(item["status"] == "On Time" for item in shipments), "evaluated": sum(item["status"] in {"Delay", "On Time"} for item in shipments), "pendingEvaluation": sum(item["status"] == "Belum dievaluasi" for item in shipments)},
        routes=ordered(lambda item: f"{item['origin']} → {item['destination']}"), carriers=ordered(lambda item: item["carrier"]),
        shipments=shipments, delays=delays, delayFactors=DELAY_FACTORS, processStages=PROCESS_STAGES, shipmentProcesses=shipment_processes, recommendationActions=read_json(DASHBOARD_FILE).get("recommendationActions", {}), presentationMode=presentation_mode,
        ahp=[{"rank": index + 1, "factor": factor, "weight": ahp_data.get("weights", {}).get(factor), "status": "Hasil AHP tersimpan" if ahp_data.get("weights", {}).get(factor) is not None else "Menunggu hasil AHP final"} for index, factor in enumerate(DELAY_FACTORS)],
        consistencyRatio=ahp_data.get("consistencyRatio"), ahpMeta={"source": ahp_data.get("source", ""), "period": ahp_data.get("period", ""), "updatedAt": ahp_data.get("updatedAt", "")},
    )


@app.get("/api/shipments")
def shipments(): return jsonify(model()[0])


def validate_shipment_changes(payload: dict[str, Any], creating: bool = False) -> dict[str, Any]:
    changes = {key: payload[key] for key in EDITABLE_SHIPMENT_FIELDS if key in payload}
    if creating:
        required = {"shipmentNo", "shipper", "origin", "destination", "etd", "eta", "productService", "shipmentType"}
        if not required.issubset(changes) or any(not str(changes[key]).strip() for key in required):
            raise ValueError("Nomor shipment, customer, rute, ETD, ETA, layanan, dan arus wajib diisi")
    for key, value in changes.items():
        if key in {"etd", "eta", "actualArrival"} and value and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(value)):
            raise ValueError("Format tanggal harus YYYY-MM-DD")
        if key in {"productService"} and value not in {"LCL", "FCL"}:
            raise ValueError("Jenis layanan harus LCL atau FCL")
        if key == "shipmentType" and value not in {"OE", "OI"}:
            raise ValueError("Arus shipment harus OE atau OI")
        if key == "status" and value not in {"Belum dievaluasi", "On Time", "Delay"}:
            raise ValueError("Status shipment tidak valid")
        if key not in {"status"} and value is not None and len(str(value)) > 300:
            raise ValueError("Data shipment terlalu panjang")
    return changes


@app.post("/api/shipments")
@require_roles("admin", "operasional")
def add_shipment():
    payload = request.get_json(silent=True) or {}
    try:
        changes = validate_shipment_changes(payload, creating=True)
    except ValueError as error:
        return jsonify(message=str(error)), 400
    database = read_json(DASHBOARD_FILE)
    existing, _ = model()
    shipment_id = max((item["id"] for item in existing), default=0) + 1
    shipment = {"id": shipment_id, "invoiceNo": "-", "pod": "-", "containerType": "-", "containers": 0, "weight": 0, "ajuNo": "-", "documentDate": "-", "ppftzNo": "-", "remarks": "", "actualArrival": None, "status": "Belum dievaluasi", "carrier": "-", "vesselVoyage": "-", "consignee": "-"}
    shipment.update(changes)
    database.setdefault("manualShipments", []).append(shipment)
    audit(database, "shipment_created", shipment_id, shipment["shipmentNo"])
    write_json(DASHBOARD_FILE, database)
    return jsonify(shipment), 201


@app.put("/api/shipments/<int:shipment_id>")
@require_roles("admin", "operasional")
def edit_shipment(shipment_id):
    payload = request.get_json(silent=True) or {}
    shipment = next((item for item in model()[0] if item["id"] == shipment_id), None)
    if not shipment:
        return jsonify(message="Shipment tidak ditemukan"), 404
    try:
        changes = validate_shipment_changes(payload)
    except ValueError as error:
        return jsonify(message=str(error)), 400
    current = {**shipment, **changes}
    if current.get("actualArrival") and calendar_date(current["actualArrival"]) and calendar_date(current.get("eta")):
        changes["delayDays"] = max(0, (calendar_date(current["actualArrival"]) - calendar_date(current["eta"])).days)
        changes["status"] = "Delay" if changes["delayDays"] >= 1 else "On Time"
    database = read_json(DASHBOARD_FILE)
    database.setdefault("shipmentUpdates", {}).setdefault(str(shipment_id), {}).update(changes)
    if changes.get("status") == "On Time":
        database["delays"] = [item for item in database.get("delays", []) if item["shipmentId"] != shipment_id]
    audit(database, "shipment_updated", shipment_id, shipment.get("shipmentNo", ""))
    write_json(DASHBOARD_FILE, database)
    return jsonify({**shipment, **changes})


@app.delete("/api/shipments/<int:shipment_id>")
@require_roles("admin", "operasional")
def delete_shipment(shipment_id):
    shipment = next((item for item in model()[0] if item["id"] == shipment_id), None)
    if not shipment:
        return jsonify(message="Shipment tidak ditemukan"), 404
    database = read_json(DASHBOARD_FILE)
    database.setdefault("deletedShipmentIds", []).append(shipment_id)
    database["deletedShipmentIds"] = sorted(set(database["deletedShipmentIds"]))
    database.get("shipmentUpdates", {}).pop(str(shipment_id), None)
    database.get("shipmentProcesses", {}).pop(str(shipment_id), None)
    database["delays"] = [item for item in database.get("delays", []) if item.get("shipmentId") != shipment_id]
    database["manualShipments"] = [item for item in database.get("manualShipments", []) if item.get("id") != shipment_id]
    audit(database, "shipment_deleted", shipment_id, shipment.get("shipmentNo", ""))
    write_json(DASHBOARD_FILE, database)
    return "", 204


@app.get("/api/delays")
def delays(): return jsonify(model()[1])


@app.put("/api/recommendations/<path:factor>")
@require_roles("admin", "manager")
def update_recommendation(factor):
    if factor not in DELAY_FACTORS:
        return jsonify(message="Kriteria rekomendasi tidak valid"), 404
    payload = request.get_json(silent=True) or {}
    status = payload.get("status")
    owner = str(payload.get("owner", "")).strip()
    target_date = str(payload.get("targetDate", "")).strip()
    completed_date = str(payload.get("completedDate", "")).strip()
    note = str(payload.get("note", "")).strip()
    if status not in {"Belum Dimulai", "Dalam Proses", "Selesai"}:
        return jsonify(message="Status tindak lanjut tidak valid"), 400
    if not owner or len(owner) > 100 or len(note) > 1000:
        return jsonify(message="PIC wajib diisi dan catatan maksimal 1000 karakter"), 400
    for value in (target_date, completed_date):
        if value and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            return jsonify(message="Format tanggal harus YYYY-MM-DD"), 400
    database = read_json(DASHBOARD_FILE)
    action = {"status": status, "owner": owner, "targetDate": target_date, "completedDate": completed_date, "note": note, "updatedAt": datetime.now(timezone.utc).isoformat(), "updatedBy": (SESSIONS.get(request.session_token) or {}).get("userId")}  # type: ignore[attr-defined]
    database.setdefault("recommendationActions", {})[factor] = action
    audit(database, "recommendation_updated", detail=factor)
    write_json(DASHBOARD_FILE, database)
    return jsonify(action)


@app.post("/api/shipments/<int:shipment_id>/process")
@require_roles("admin", "operasional")
def add_shipment_process(shipment_id):
    shipment = next((item for item in model()[0] if item["id"] == shipment_id), None)
    if not shipment:
        return jsonify(message="Shipment tidak ditemukan"), 404
    payload = request.form if request.form else (request.get_json(silent=True) or {})
    status = str(payload.get("status", ""))
    note = str(payload.get("note", "")).strip()
    flow = PROCESS_FLOWS.get(shipment.get("shipmentType"), PROCESS_FLOWS["OE"])
    database = read_json(DASHBOARD_FILE)
    history = database.setdefault("shipmentProcesses", {}).setdefault(str(shipment_id), [])
    expected = flow[len(history)] if len(history) < len(flow) else None
    if status != expected:
        if expected:
            return jsonify(message=f"Tahap berikutnya yang perlu dicatat: {PROCESS_LABELS[expected]}"), 400
        return jsonify(message="Proses shipment ini sudah selesai dan tidak dapat ditambah lagi"), 400
    if not note:
        return jsonify(message="Catatan proses wajib diisi"), 400
    document_no = str(payload.get("documentNo", "")).strip()
    upload = request.files.get("documentFile")
    document = {"number": document_no}
    if upload and upload.filename:
        allowed = {".pdf", ".png", ".jpg", ".jpeg", ".xlsx", ".doc", ".docx"}
        name = secure_filename(upload.filename)
        if not name or Path(name).suffix.lower() not in allowed:
            return jsonify(message="Format lampiran harus PDF, gambar, Excel, atau Word"), 400
        target = UPLOAD_DIR / str(shipment_id)
        target.mkdir(parents=True, exist_ok=True)
        stored_name = f"{int(time.time())}_{name}"
        upload.save(target / stored_name)
        document["fileName"] = name
        document["filePath"] = stored_name
    history.append({"status": status, "note": note, "timestamp": datetime.now(timezone.utc).isoformat(), "userId": (SESSIONS.get(request.session_token) or {}).get("userId"), "document": document})  # type: ignore[attr-defined]
    audit(database, "shipment_process_updated", shipment_id, PROCESS_LABELS[status])
    write_json(DASHBOARD_FILE, database)
    return jsonify(history=history, currentStatus=status)


@app.get("/api/shipments/<int:shipment_id>/process-documents/<int:event_index>")
def process_document(shipment_id, event_index):
    events = read_json(DASHBOARD_FILE).get("shipmentProcesses", {}).get(str(shipment_id), [])
    if event_index < 0 or event_index >= len(events) or not events[event_index].get("document", {}).get("filePath"):
        return jsonify(message="Lampiran tidak ditemukan"), 404
    directory = UPLOAD_DIR / str(shipment_id)
    filename = events[event_index]["document"]["filePath"]
    if not (directory / filename).is_file():
        return jsonify(message="Lampiran tidak tersedia pada penyimpanan server"), 404
    return send_from_directory(directory, filename, as_attachment=True, download_name=events[event_index]["document"]["fileName"])


@app.put("/api/shipments/<int:shipment_id>/status")
@require_roles("admin", "operasional")
def update_shipment_status(shipment_id):
    payload = request.get_json(silent=True) or {}
    source_shipment = next((item for item in model()[0] if item["id"] == shipment_id), None)
    if not source_shipment:
        return jsonify(message="Shipment tidak ditemukan"), 404
    status = payload.get("status")
    actual_arrival = payload.get("actualArrival")
    note = payload.get("statusNote", "")
    if status not in {"Belum dievaluasi", "On Time", "Delay"}:
        return jsonify(message="Status shipment tidak valid"), 400
    if actual_arrival is not None and actual_arrival != "" and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(actual_arrival)):
        return jsonify(message="Actual arrival tidak valid"), 400
    if not isinstance(note, str) or len(note) > 1000:
        return jsonify(message="Catatan status tidak valid"), 400
    delay_days = None
    if actual_arrival:
        arrival, eta = calendar_date(actual_arrival), calendar_date(source_shipment["eta"])
        if arrival and eta:
            delay_days = max(0, (arrival - eta).days)
            status = "Delay" if delay_days >= 1 else "On Time"
    database = read_json(DASHBOARD_FILE)
    # Keep edits made from Data Shipment (customer, route, ETA, etc.) when
    # the operational team subsequently updates actual arrival/status.
    update = database.setdefault("shipmentUpdates", {}).setdefault(str(shipment_id), {})
    update.update({"status": status, "actualArrival": actual_arrival or None, "statusNote": note.strip(), "delayDays": delay_days})
    if status == "On Time":
        database["delays"] = [item for item in database.get("delays", []) if item["shipmentId"] != shipment_id]
    audit(database, "shipment_status_updated", shipment_id, status)
    write_json(DASHBOARD_FILE, database)
    return jsonify(update)


@app.put("/api/ahp")
@require_roles("admin", "manager")
def update_ahp():
    payload = request.get_json(silent=True) or {}
    weights = payload.get("weights")
    ratio = payload.get("consistencyRatio")
    source = str(payload.get("source", "")).strip()
    period = str(payload.get("period", "")).strip()
    if not isinstance(weights, dict) or set(weights) != set(DELAY_FACTORS):
        return jsonify(message="Bobot untuk sembilan faktor wajib diisi"), 400
    try:
        normalized = {factor: float(weights[factor]) for factor in DELAY_FACTORS}
        ratio = float(ratio)
    except (TypeError, ValueError):
        return jsonify(message="Bobot dan Consistency Ratio harus berupa angka"), 400
    if any(value < 0 or value > 1 for value in normalized.values()) or not 0 <= ratio <= 1:
        return jsonify(message="Bobot dan Consistency Ratio harus berada pada rentang 0 sampai 1"), 400
    if abs(sum(normalized.values()) - 1) > 0.02:
        return jsonify(message="Total bobot AHP harus bernilai 1"), 400
    if not source or len(source) > 200 or len(period) > 100:
        return jsonify(message="Sumber hasil AHP wajib diisi dan periode maksimal 100 karakter"), 400
    database = read_json(DASHBOARD_FILE)
    database["ahp"] = {"consistencyRatio": ratio, "weights": normalized, "source": source, "period": period, "updatedAt": datetime.now(timezone.utc).isoformat()}
    audit(database, "ahp_updated", detail=source)
    write_json(DASHBOARD_FILE, database)
    return jsonify(database["ahp"])


@app.post("/api/delays")
@require_roles("admin", "operasional")
def add_delay():
    payload = request.get_json(silent=True) or {}
    try:
        shipment_id = int(payload.get("shipmentId"))
    except (TypeError, ValueError):
        return jsonify(message="Shipment wajib dipilih"), 400
    shipment_list, _ = model()
    if not any(item["id"] == shipment_id for item in shipment_list):
        return jsonify(message="Shipment wajib dipilih"), 400
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(payload.get("incidentDate", ""))):
        return jsonify(message="Tanggal kendala tidak valid"), 400
    if payload.get("processStage") not in PROCESS_STAGES or payload.get("factor") not in DELAY_FACTORS:
        return jsonify(message="Tahapan proses atau kategori kendala tidak valid"), 400
    description, action = payload.get("description", ""), payload.get("action", "")
    controllability = payload.get("controllability")
    if controllability not in {"Controllable", "Uncontrollable", "Sebagian controllable"}:
        return jsonify(message="Sifat kendala wajib dipilih"), 400
    if not isinstance(description, str) or not description.strip() or len(description) > 2000 or not isinstance(action, str) or len(action) > 2000:
        return jsonify(message="Deskripsi kendala wajib diisi, maksimal 2000 karakter"), 400
    delay = {"id": int(time.time() * 1000), "shipmentId": shipment_id, "incidentDate": payload["incidentDate"], "processStage": payload["processStage"], "factor": payload["factor"], "controllability": controllability, "description": description.strip(), "action": action.strip(), "createdAt": datetime.now(timezone.utc).isoformat()}
    database = read_json(DASHBOARD_FILE)
    database["delays"] = [item for item in database.get("delays", []) if item["shipmentId"] != shipment_id]
    database["delays"].insert(0, delay)
    audit(database, "delay_recorded", shipment_id, delay["factor"])
    write_json(DASHBOARD_FILE, database)
    return jsonify(delay), 201


@app.route("/api/<path:unused>")
def api_not_found(unused): return jsonify(message="Endpoint tidak ditemukan"), 404


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def frontend(path):
    file = STATIC_DIR / path
    if path and file.is_file():
        return send_from_directory(STATIC_DIR, path)
    return send_from_directory(STATIC_DIR, "index.html")


if __name__ == "__main__":
    ensure_data()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "3000")), debug=False)
