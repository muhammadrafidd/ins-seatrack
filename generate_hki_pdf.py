"""Generate the formal HKI documentation PDF for INS SeaTrack.

This utility is a documentation build tool only; it is not required by the
Flask application or Railway deployment.
"""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer,
    Table, TableStyle,
)


ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
OUTPUT = DOCS / "Paket_Dokumentasi_HKI_INS_SeaTrack_v1.0.0.pdf"

NAVY = colors.HexColor("#123B54")
TEAL = colors.HexColor("#247A91")
BLUE = colors.HexColor("#2D73B9")
LIGHT = colors.HexColor("#EDF5F7")
LINE = colors.HexColor("#D7E5E9")
MUTED = colors.HexColor("#607A89")
GREEN = colors.HexColor("#E8F5ED")
AMBER = colors.HexColor("#FFF4D8")


def styles():
    base = getSampleStyleSheet()
    base.add(ParagraphStyle(name="CoverBrand", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=colors.white, spaceAfter=2))
    base.add(ParagraphStyle(name="CoverSmall", parent=base["Normal"], fontName="Helvetica", fontSize=8, leading=10, textColor=colors.HexColor("#D8EEF4"), spaceAfter=35))
    base.add(ParagraphStyle(name="CoverTitle", parent=base["Title"], fontName="Helvetica-Bold", fontSize=30, leading=36, textColor=colors.white, spaceAfter=12))
    base.add(ParagraphStyle(name="CoverText", parent=base["Normal"], fontSize=13, leading=19, textColor=colors.HexColor("#E2F1F5"), spaceAfter=18))
    base.add(ParagraphStyle(name="Eyebrow", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=11, textColor=TEAL, spaceAfter=5, tracking=1.3))
    base.add(ParagraphStyle(name="TitleCustom", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=22, leading=27, textColor=NAVY, spaceAfter=10))
    base.add(ParagraphStyle(name="H2Custom", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=15, leading=20, textColor=NAVY, spaceBefore=10, spaceAfter=8))
    base.add(ParagraphStyle(name="H3Custom", parent=base["Heading3"], fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=NAVY, spaceBefore=6, spaceAfter=4))
    base.add(ParagraphStyle(name="BodyCustom", parent=base["BodyText"], fontName="Helvetica", fontSize=9.5, leading=14, textColor=colors.HexColor("#294F63"), spaceAfter=7))
    base.add(ParagraphStyle(name="Lead", parent=base["BodyText"], fontSize=10.5, leading=15, textColor=MUTED, spaceAfter=13))
    base.add(ParagraphStyle(name="Cell", parent=base["BodyText"], fontSize=8.4, leading=11, textColor=colors.HexColor("#294F63")))
    base.add(ParagraphStyle(name="CellHead", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=8.4, leading=11, textColor=NAVY))
    base.add(ParagraphStyle(name="Footer", parent=base["Normal"], fontSize=7.5, leading=9, alignment=TA_CENTER, textColor=MUTED))
    return base


S = styles()


def p(text, style="BodyCustom"):
    return Paragraph(text, S[style])


def table(rows, widths, header=True):
    formatted = []
    for row_index, row in enumerate(rows):
        style = "CellHead" if header and row_index == 0 else "Cell"
        formatted.append([p(str(cell), style) for cell in row])
    result = Table(formatted, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]
    if header:
        commands.append(("BACKGROUND", (0, 0), (-1, 0), LIGHT))
    result.setStyle(TableStyle(commands))
    return result


def node(label, fill=colors.white):
    result = Table([[p(label, "CellHead")]], colWidths=[25 * mm], rowHeights=[18 * mm])
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fill), ("BOX", (0, 0), (-1, -1), .7, colors.HexColor("#BBD7E0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    return result


def arrow():
    return Paragraph("→", ParagraphStyle("arrow", parent=S["BodyCustom"], alignment=TA_CENTER, fontSize=17, textColor=TEAL))


def flow(labels):
    items = []
    for index, label in enumerate(labels):
        items.append(node(label, colors.HexColor("#E7F4F7") if index in {0, len(labels) - 1} else colors.white))
        if index != len(labels) - 1:
            items.append(arrow())
    result = Table([items], colWidths=[25 * mm if index % 2 == 0 else 5 * mm for index in range(len(items))])
    result.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    return result


def footer(canvas, doc):
    if doc.page == 1:
        return
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(16 * mm, 12 * mm, A4[0] - 16 * mm, 12 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(16 * mm, 7.5 * mm, "INS SeaTrack · Paket Dokumentasi HKI · v1.0.0")
    canvas.drawRightString(A4[0] - 16 * mm, 7.5 * mm, f"Halaman {doc.page}")
    canvas.restoreState()


def build():
    document = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=16 * mm, leftMargin=16 * mm, topMargin=16 * mm, bottomMargin=18 * mm, title="Paket Dokumentasi HKI INS SeaTrack", author="PT Intisarana Persada")
    story = []

    # Cover
    story += [Spacer(1, 22 * mm), p("PT INTISARANA PERSADA", "CoverBrand"), p("FREIGHT FORWARDING · OPERATIONS", "CoverSmall"), p("PAKET DOKUMENTASI HKI", "Eyebrow"), p("INS SeaTrack", "CoverTitle"), p("Monitoring Pengiriman Laut &amp; Prioritas Penanganan Keterlambatan", "CoverText"), p("Dokumentasi fungsi aplikasi, flowchart sistem, panduan penggunaan, informasi versi, change log, dan kebutuhan bukti visual.", "CoverText"), Spacer(1, 55 * mm), table([["Versi aplikasi", "v1.0.0", "Tanggal dokumen", "10 November 2026"], ["Platform", "Aplikasi web", "Backend", "Python · Flask"]], [33 * mm, 45 * mm, 33 * mm, 45 * mm], header=False), PageBreak()]

    # Index
    story += [p("01 · INDEKS PAKET HKI", "Eyebrow"), p("Identitas dan ruang lingkup aplikasi", "TitleCustom"), p("INS SeaTrack merupakan aplikasi web internal PT Intisarana Persada untuk mengelola shipment laut, proses pengiriman, kendala keterlambatan, analisis, prioritas AHP, rekomendasi perbaikan, dan laporan operasional.", "Lead")]
    story.append(table([
        ["Item", "Keterangan"], ["Nama aplikasi", "INS SeaTrack — Shipment Intelligence"], ["Sumber data awal", "inbound-outbound.xlsx: 140 shipment valid, 114 LCL dan 26 FCL."], ["Data penelitian", "9 faktor keterlambatan dan nilai Consistency Ratio AHP awal 0,081."], ["Teknologi", "Python 3.12, Flask, HTML, CSS, JavaScript."], ["Demo / staging", "https://ins-seatrack-production.up.railway.app"], ["Dokumen pendukung", "Flowchart, manual book, version, change log, dan checklist screenshot."],
    ], [44 * mm, 140 * mm]))
    story += [p("Isi source code yang disarankan untuk lampiran: app.py, wsgi.py, requirements.txt, railway.toml, folder public/, data/source/, dan docs/. Jangan memasukkan sessions.json, token, password asli, atau lampiran operasional privat.", "Lead"), PageBreak()]

    # Flowchart
    story += [p("02 · FLOWCHART SISTEM", "Eyebrow"), p("Alur utama aplikasi", "TitleCustom"), p("Menu serta tindakan yang tersedia mengikuti peran Operasional, Manager, atau Administrator.", "Lead"), flow(["Login", "Dashboard", "Data Shipment", "Proses &amp; Kendala", "Analisis", "AHP &amp; Rekomendasi", "Laporan"]), Spacer(1, 8 * mm), p("Alur operasional", "H2Custom")]
    story.append(table([
        ["Tahap", "Aktivitas", "Data yang diperbarui"], ["1", "Kelola Data Shipment", "Shipment baru, perubahan data, atau penghapusan data."], ["2", "Update proses shipment", "Tahap, catatan, nomor dokumen, dan lampiran opsional."], ["3", "Catat kendala", "Shipment ID, faktor, tahapan, sifat, deskripsi, dan tindakan."], ["4", "Evaluasi status", "Actual Arrival dibandingkan dengan ETA; status On Time/Delay."],
    ], [18 * mm, 63 * mm, 103 * mm]))
    story += [p("Alur manajerial", "H2Custom")]
    story.append(table([
        ["Tahap", "Aktivitas", "Hasil"], ["1", "Analisis Kendala", "Frekuensi kendala berdasarkan 9 faktor dan tahapan proses."], ["2", "Prioritas AHP", "Bobot, peringkat, sumber, periode, dan Consistency Ratio."], ["3", "Rekomendasi", "Tiga prioritas AHP dengan PIC dan status tindak lanjut."], ["4", "Laporan", "Rekap kinerja dan kendala yang dapat dicetak menjadi PDF."],
    ], [18 * mm, 63 * mm, 103 * mm]))
    story += [PageBreak()]

    # Shipment flows
    story += [p("03 · FLOW PROSES SHIPMENT", "Eyebrow"), p("Tahapan pengiriman yang tercatat", "TitleCustom"), p("Catatan proses wajib diisi. Nomor dokumen dan lampiran bersifat opsional. Tahapan tidak dapat dilompati agar riwayat pengiriman valid.", "Lead"), p("Outbound / OE", "H2Custom"), flow(["Persiapan dokumen", "Booking / Pickup", "Dokumen ekspor selesai", "Dalam pelayaran", "Tiba di tujuan", "Delivered / POD"]), Spacer(1, 9 * mm), p("Inbound / OI", "H2Custom"), flow(["Persiapan dokumen", "Booking / Pickup", "Dalam pelayaran", "Proses customs", "Pengantaran lokal", "Delivered / POD"]), Spacer(1, 12 * mm), p("Aturan penentuan status", "H2Custom")]
    story.append(table([
        ["Kondisi", "Status", "Hasil"], ["Actual Arrival belum diisi", "Belum dievaluasi", "Status belum dapat dihitung."], ["Actual Arrival ≤ ETA", "On Time", "Durasi delay = 0 hari."], ["Actual Arrival > ETA", "Delay", "Durasi delay dihitung dalam hari kalender."],
    ], [64 * mm, 42 * mm, 78 * mm]))
    story += [PageBreak()]

    # Manual
    story += [p("04 · MANUAL BOOK", "Eyebrow"), p("Panduan penggunaan ringkas", "TitleCustom")]
    story.append(table([
        ["Fitur", "Langkah utama", "Hasil"], ["Login", "Masukkan email dan password akun terdaftar.", "Dashboard sesuai hak akses."], ["Data Shipment", "Cari/filter data; pilih Tambah, Edit, Detail, atau Hapus.", "Data shipment dikelola dan tersimpan."], ["Detail & Proses", "Buka Detail lalu pilih Update proses.", "Timeline, catatan, dan dokumen proses tersimpan."], ["Catat Kendala", "Cari Shipment ID dan isi tahapan, faktor, sifat, serta deskripsi.", "Kendala terhubung ke shipment."], ["Analisis", "Buka Analisis Kendala dan gunakan filter.", "Pola kendala dapat ditinjau."], ["Prioritas AHP", "Manager/Admin mengisi 9 bobot, sumber, periode, dan CR.", "Ranking prioritas dan validasi AHP."], ["Rekomendasi", "Perbarui PIC, target, status, dan catatan.", "Tindak lanjut terpantau."], ["Laporan", "Klik Download PDF lalu Save as PDF dari browser.", "Rekap operasional tersimpan."],
    ], [34 * mm, 80 * mm, 70 * mm]))
    story += [Spacer(1, 5 * mm), p("Hak akses", "H2Custom"), table([["Peran", "Hak akses"], ["Operasional", "Kelola shipment, proses pengiriman, status, dan kendala."], ["Manager", "Analisis kendala, AHP, rekomendasi perbaikan, dan laporan."], ["Administrator", "Seluruh fitur operasional serta manajerial."]], [44 * mm, 140 * mm]), PageBreak()]

    # Version / Changes
    story += [p("05 · VERSI &amp; CHANGE LOG", "Eyebrow"), p("Informasi rilis aplikasi", "TitleCustom"), table([["Versi", "Tanggal", "Ringkasan"], ["1.0.0", "10 November 2026", "Rilis awal INS SeaTrack: Data Shipment, proses, kendala, analisis, AHP, rekomendasi, laporan, dan hak akses."]], [28 * mm, 38 * mm, 118 * mm]), p("Perubahan penting versi 1.0.0", "H2Custom")]
    story.append(table([
        ["Area", "Perubahan"], ["Data Shipment", "Tambah, detail, edit, hapus, pencarian, filter, paginasi, dan status otomatis."], ["Proses shipment", "Timeline OE/OI, catatan proses, nomor dokumen, dan lampiran opsional."], ["AHP", "Bobot sembilan faktor, peringkat, CI, CR, sumber, periode, serta validasi total bobot."], ["Rekomendasi", "Mengikuti tiga bobot AHP tertinggi; PIC dan status tindak lanjut dapat diperbarui."], ["Akses", "Pemisahan peran Operasional, Manager, dan Administrator pada UI serta backend."], ["Reliabilitas", "Sesi/halaman aktif dipulihkan saat refresh dan data dapat disimpan pada Railway Volume."],
    ], [45 * mm, 139 * mm]))
    story += [PageBreak()]

    # Before After
    story += [p("06 · BEFORE–AFTER", "Eyebrow"), p("Dokumentasi perubahan antarmuka dan fungsi", "TitleCustom"), p("Arsip gambar versi lama tidak tersedia di folder proyek. Agar tidak membuat bukti visual fiktif, bagian ini mendokumentasikan perubahan secara faktual. Screenshot asli dapat dimasukkan pada lampiran berikutnya.", "Lead")]
    story.append(table([
        ["Sebelum", "Sesudah"], ["Form edit shipment muncul di bagian bawah tabel dan memerlukan scrolling panjang.", "Edit shipment tampil melalui pop-up/modal agar pengguna tetap berada pada konteks tabel."], ["Riwayat proses belum menjadi bagian utama detail shipment.", "Detail shipment memiliki timeline OE/OI, catatan proses, nomor dokumen, dan lampiran opsional."], ["Rekomendasi dapat terbentuk dari data fallback.", "Rekomendasi mengikuti bobot AHP tersimpan dan hanya dapat diperbarui Manager/Admin."], ["Pembagian hak akses belum diterapkan pada semua tindakan backend.", "Pembatasan Operasional, Manager, dan Administrator diterapkan pada tampilan dan API."],
    ], [92 * mm, 92 * mm]))
    story += [PageBreak()]

    # screenshot appendix
    story += [p("07 · LAMPIRAN SCREENSHOT", "Eyebrow"), p("Bukti visual yang perlu dilengkapi", "TitleCustom"), p("Masukkan capture asli aplikasi pada daftar berikut. Jangan menampilkan password, token, atau data operasional rahasia.", "Lead")]
    asset = ROOT / "public" / "login-harbor-v2.png"
    if asset.exists():
        image = Image(str(asset), width=90 * mm, height=57 * mm)
        story += [KeepTogether([p("Aset tampilan Login yang tersedia pada proyek", "H3Custom"), image, p("Gambar ini adalah aset antarmuka yang tersedia di repository; tambahkan screenshot halaman aplikasi saat berjalan sebagai bukti fungsi.", "BodyCustom")])]
    story.append(table([
        ["No.", "Screenshot yang dikumpulkan", "Keterangan"], ["1", "Dashboard", "KPI, grafik status, tindakan, dan progres proses."], ["2", "Data Shipment", "Pencarian, filter, paginasi, Edit, Detail, dan Hapus."], ["3", "Detail / Update Proses", "Timeline dan pop-up pembaruan proses."], ["4", "Catat Kendala", "Pencarian Shipment ID dan faktor kendala."], ["5", "Prioritas AHP", "Bobot, ranking, CR, sumber, dan periode."], ["6", "Rekomendasi / Laporan", "PIC, status tindak lanjut, serta laporan."], ["7", "Hak Akses", "Perbedaan menu Operasional dan Manager."],
    ], [12 * mm, 70 * mm, 102 * mm]))
    story += [Spacer(1, 5 * mm), p("Checklist akhir: source code aman, flowchart sesuai sistem berjalan, manual book sesuai versi 1.0.0, screenshot diberi caption, dan link demo dapat dibuka penguji.", "Lead")]

    document.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)


if __name__ == "__main__":
    build()
