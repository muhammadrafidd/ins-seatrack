# PT Intisarana Persada — Shipment Intelligence

Dashboard operasional untuk memantau pengiriman laut, mencatat kendala keterlambatan, dan menyiapkan analisis AHP.

## Teknologi

- Python 3.12
- Flask
- Frontend HTML, CSS, dan JavaScript tanpa framework
- File Excel sumber pada `data/source/inbound-outbound.xlsx`

## Menjalankan aplikasi

```powershell
python -m pip install -r requirements.txt
python app.py
```

Buka `http://localhost:3000`.

## Login

- Email: `varin@freight.id`
- Password: `sales123`

## Data dashboard

Data Excel yang tersedia menghasilkan 140 shipment valid: 114 LCL dan 26 FCL. Data actual arrival dan status on-time belum tersedia, sehingga dashboard tidak membuat metrik ketepatan waktu yang tidak didukung oleh data.

## Struktur kode

- `app.py`: backend Flask dan API
- `public/app.js`: interaksi antarmuka
- `public/styles.css`, `theme.css`, `voyage.css`, `harbor.css`: tema antarmuka
- `requirements.txt`: dependensi Python

## Deploy ke Railway

Konfigurasi deploy sudah tersedia melalui `railway.toml`. Railway menjalankan aplikasi dengan Gunicorn dan mengecek kesehatan aplikasi di `/api/health`.

Untuk data operasional yang tidak hilang saat service restart atau redeploy, buat **Volume** di Railway lalu atur environment variable berikut pada service:

```text
CRM_DATA_DIR=/data
```

Pasang Volume tersebut pada path `/data`. Folder ini menyimpan `dashboard.json`, `sessions.json`, dan lampiran proses. Tanpa Volume, perubahan operasional dan file lampiran dapat hilang saat container Railway dibuat ulang.

Jika repository diunggah dalam struktur datar (semua file berada di root), aplikasi tetap dapat membaca aset dan data awal dari root. Untuk struktur proyek normal, gunakan folder `public/` dan `data/` seperti pada repository ini.
