# Flowchart Sistem INS SeaTrack

## 1. Alur utama sistem

```mermaid
flowchart TD
    A[Pengguna membuka INS SeaTrack] --> B{Login berhasil?}
    B -- Tidak --> C[Tampilkan pesan kredensial tidak sesuai]
    C --> A
    B -- Ya --> D[Dashboard]
    D --> E[Data Shipment]
    E --> F{Peran pengguna}
    F -- Operasional atau Admin --> G[Tambah, edit, hapus, cari dan filter shipment]
    G --> H[Detail Shipment]
    H --> I[Perbarui proses pengiriman]
    I --> J[Riwayat proses tersimpan]
    H --> K[Catat kendala]
    K --> L[Pilih Shipment ID, tahapan proses dan faktor kendala]
    L --> M[Kendala tersimpan dan terhubung ke shipment]
    M --> D
    F -- Manager atau Admin --> N[Analisis Kendala]
    N --> O[Frekuensi 9 kriteria dan tahapan proses]
    O --> P[Prioritas AHP]
    P --> Q[Bobot, peringkat dan Consistency Ratio]
    Q --> R[Rekomendasi Perbaikan]
    R --> S[PIC, target, status dan catatan tindak lanjut]
    S --> T[Laporan Operasional]
    T --> D
```

## 2. Alur proses shipment

Setiap pembaruan tahap mewajibkan catatan proses. Nomor dokumen dan lampiran dokumen bersifat opsional. Tahap tidak dapat dilompati agar riwayat pengiriman tetap valid.

### Arus outbound (OE)

```mermaid
flowchart LR
    A[Persiapan dokumen] --> B[Booking / Pickup]
    B --> C[Dokumen ekspor selesai]
    C --> D[Dalam pelayaran]
    D --> E[Tiba di tujuan]
    E --> F[Delivered / POD]
```

### Arus inbound (OI)

```mermaid
flowchart LR
    A[Persiapan dokumen] --> B[Booking / Pickup]
    B --> C[Dalam pelayaran]
    C --> D[Proses customs]
    D --> E[Pengantaran lokal]
    E --> F[Delivered / POD]
```

## 3. Alur penentuan status shipment

```mermaid
flowchart TD
    A[Operasional mengisi Actual Arrival] --> B{Actual Arrival tersedia?}
    B -- Tidak --> C[Status: Belum dievaluasi]
    B -- Ya --> D[Bandingkan Actual Arrival dengan ETA]
    D -- Tiba setelah ETA --> E[Status: Delay]
    D -- Tiba pada atau sebelum ETA --> F[Status: On Time]
    E --> G[Hitung durasi delay dalam hari]
    F --> H[Durasi delay = 0 hari]
    G --> I[Dashboard dan laporan diperbarui]
    H --> I
```

## 4. Alur hak akses

| Peran | Akses utama |
|---|---|
| Operasional | Kelola shipment, proses pengiriman, status actual arrival, dan kendala. |
| Manager | Analisis kendala, hasil AHP, rekomendasi perbaikan, dan laporan. |
| Administrator | Seluruh akses operasional dan manajerial. |

