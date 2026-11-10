# Change Log

Semua perubahan penting pada INS SeaTrack dicatat dalam dokumen ini.

## [1.0.0] — 10 November 2026

### Ditambahkan

- Dashboard ringkasan shipment, status evaluasi, kendala, dan progres proses pengiriman.
- Pengelolaan Data Shipment: tambah, lihat detail, edit, cari, filter, paginasi, dan hapus shipment.
- Detail Shipment dengan informasi pengiriman, riwayat kendala, riwayat proses, nomor dokumen, dan lampiran opsional.
- Alur proses berbeda untuk arus outbound (OE) dan inbound (OI).
- Catat Kendala yang terhubung langsung dengan Shipment ID.
- Pencatatan faktor kendala, tahapan proses, sifat kendala, deskripsi, dan tindak lanjut.
- Analisis kendala menurut 9 kriteria faktor penyebab dan tahapan proses pengiriman.
- Prioritas AHP dengan bobot, peringkat, CI, CR, sumber hasil, dan periode penelitian.
- Rekomendasi perbaikan yang mengikuti tiga bobot AHP tertinggi.
- Status tindak lanjut rekomendasi: Belum Dimulai, Dalam Proses, dan Selesai.
- Laporan operasional yang dapat dicetak atau disimpan menjadi PDF dari browser.
- Konfirmasi sebelum penyimpanan perubahan data.
- Audit trail internal untuk perubahan shipment, kendala, proses, AHP, dan rekomendasi.
- Hak akses Operasional, Manager, dan Administrator.
- Konfigurasi deploy Railway serta dukungan Volume untuk data persisten.

### Diperbaiki

- Status On Time dan Delay dihitung otomatis berdasarkan Actual Arrival dibandingkan ETA.
- Sesi login dan halaman aktif dipulihkan saat pengguna melakukan refresh halaman.
- Form edit shipment dan pembaruan proses menggunakan pop-up agar tidak memindahkan pengguna ke bagian bawah halaman.
- Navigasi kembali dari detail shipment ke Data Shipment, daftar shipment terlambat, atau daftar shipment evaluasi.

