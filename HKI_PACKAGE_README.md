# Paket Dokumen HKI INS SeaTrack

Dokumen ini menjadi indeks lampiran teknis aplikasi INS SeaTrack.

## Isi paket

1. `FLOWCHART.md` — diagram alur sistem, proses shipment, penentuan status, dan hak akses.
2. `MANUAL_BOOK.md` — panduan penggunaan setiap fitur.
3. `VERSION.md` — identitas dan versi aplikasi.
4. `CHANGELOG.md` — riwayat perubahan versi 1.0.0.
5. `SCREENSHOT_CHECKLIST.md` — daftar screenshot yang perlu dikumpulkan.
6. Source code aplikasi — `app.py`, `wsgi.py`, `requirements.txt`, `railway.toml`, folder `public/`, folder `data/source/`, serta folder `docs/`.

## File yang tidak perlu dibagikan dalam paket publik

- `data/sessions.json`, karena berisi sesi login aktif.
- Folder `data/uploads/`, jika berisi lampiran operasional asli atau data pribadi.
- Password atau token Railway/GitHub.

## Verifikasi sebelum pengumpulan

- Pastikan aplikasi dapat dijalankan dengan `python -m pip install -r requirements.txt` lalu `python app.py`.
- Pastikan endpoint kesehatan membuka respons JSON pada `/api/health`.
- Pastikan URL Railway dapat dibuka oleh pengguna lain.
- Simpan screenshot sesuai checklist dan masukkan ke dokumen HKI.
- Ekspor dokumen Markdown ini ke PDF atau Word apabila format tersebut diminta kampus.

