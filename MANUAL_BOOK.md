# Manual Book INS SeaTrack

## 1. Tujuan sistem

INS SeaTrack digunakan oleh PT Intisarana Persada untuk memantau pengiriman laut, mencatat kendala keterlambatan, menganalisis faktor penyebab, menentukan prioritas perbaikan melalui AHP, dan membuat laporan operasional.

## 2. Login

1. Buka URL demo aplikasi.
2. Masukkan email dan password yang terdaftar.
3. Klik **Masuk**.
4. Sistem menampilkan Dashboard sesuai hak akses pengguna.

> Password akun demo harus diganti sebelum penggunaan produksi.

## 3. Dashboard

Dashboard menampilkan total shipment, status On Time/Delay, rata-rata delay, komposisi status, frekuensi kendala, progres proses shipment, aktivitas terbaru, dan daftar tindakan yang perlu ditinjau.

Klik kartu tindakan untuk membuka daftar shipment terlambat aktif atau shipment yang perlu dievaluasi.

## 4. Data Shipment

1. Buka menu **Data Shipment**.
2. Gunakan kolom pencarian untuk menemukan Shipment ID, customer, atau rute.
3. Gunakan filter rute dan proses untuk mempersempit daftar.
4. Klik **Tambah shipment** untuk membuat data baru.
5. Klik **Edit** untuk memperbarui data shipment.
6. Klik **Detail** untuk melihat riwayat kendala dan proses pengiriman.
7. Klik **Hapus** hanya jika shipment memang tidak lagi diperlukan.

Actual Arrival yang diisi akan dibandingkan dengan ETA. Sistem otomatis menetapkan status **On Time** atau **Delay** dan menghitung jumlah hari keterlambatan.

## 5. Proses pengiriman

1. Buka **Detail** pada shipment yang dipilih.
2. Klik **Update proses**.
3. Isi catatan proses.
4. Nomor dokumen dan lampiran dapat diisi bila tersedia, tetapi tidak wajib.
5. Klik **Simpan proses**, kemudian konfirmasi data.

Tahapan dicatat berurutan agar riwayat proses dapat dipertanggungjawabkan.

## 6. Catat Kendala

1. Buka menu **Catat Kendala**.
2. Cari dan pilih nomor shipment.
3. Isi tanggal kendala, tahapan proses, faktor penyebab, dan sifat kendala.
4. Isi deskripsi kejadian dan tindakan yang telah dilakukan.
5. Klik **Simpan kendala** lalu konfirmasi.

Satu catatan kendala aktif disimpan untuk satu shipment. Pencatatan ulang pada shipment yang sama memperbarui catatan sebelumnya.

## 7. Analisis Kendala

Manager atau Administrator membuka **Analisis Kendala** untuk melihat frekuensi kendala menurut sembilan kriteria dan tahapan proses. Filter rute serta tahapan dapat digunakan untuk meninjau kondisi tertentu.

## 8. Prioritas AHP

1. Buka **Prioritas AHP**.
2. Klik **Input hasil penelitian** atau **Edit bobot AHP**.
3. Isi sembilan bobot AHP, sumber hasil, periode penelitian, dan nilai CR.
4. Pastikan total bobot sama dengan 1 dan CR tidak lebih dari 0,10.
5. Simpan hasil AHP.

Hanya Manager atau Administrator yang dapat mengubah data AHP.

## 9. Rekomendasi Perbaikan

Halaman ini menampilkan tiga faktor AHP dengan bobot tertinggi. Manager atau Administrator dapat memperbarui PIC, target penyelesaian, status tindak lanjut, tanggal selesai, dan catatan perkembangan.

## 10. Laporan

Buka menu **Laporan**, pilih jenis laporan dan periode, kemudian klik **Download PDF**. Browser akan membuka tampilan cetak; pilih **Save as PDF** untuk menyimpan file laporan.

## 11. Hak akses

| Peran | Hak akses |
|---|---|
| Operasional | Data Shipment, proses pengiriman, status, dan Catat Kendala. |
| Manager | Analisis Kendala, Prioritas AHP, Rekomendasi Perbaikan, dan Laporan. |
| Administrator | Seluruh fitur. |

