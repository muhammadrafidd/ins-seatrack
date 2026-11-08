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
