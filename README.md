# 🔔 BELSKO — Bel Sekolah Otomatis

<p align="center">
  <img src="resources/icons/appIcon.png" alt="BELSKO Logo" width="128" height="128" style="border-radius: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);" />
</p>

<p align="center">
  <strong>Aplikasi Desktop Bel Sekolah Otomatis Modern, Ringan, dan Mandiri untuk Windows</strong>
</p>

<p align="center">
  <a href="#-fitur-unggulan"><img src="https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D6?logo=windows&logoColor=white" alt="Platform" /></a>
  <a href="#-teknologi"><img src="https://img.shields.io/badge/Framework-Neutralinojs%20v6.9-f58231?logo=javascript&logoColor=white" alt="Neutralinojs" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Version-v1.0.0-blue.svg" alt="Version" /></a>
</p>

---

## 📖 Tentang BELSKO

**BELSKO** (*Bel Sekolah Otomatis*) adalah aplikasi desktop *open-source* yang dirancang khusus untuk mempermudah manajemen waktu kegiatan belajar mengajar (KBM) di sekolah. Aplikasi ini beroperasi otomatis sesuai jam yang ditentukan dan terhubung langsung ke sistem pengeras suara (*speaker sentral/amplifier*) sekolah.

Dibangun menggunakan arsitektur **Neutralinojs**, BELSKO sangat ringan, hemat penggunaan memori RAM (< 35 MB), cepat dibuka, dan tidak membebani komputer sekolah.

---

## ✨ Fitur Unggulan

- ⏰ **Penjadwalan 7 Hari Penuh (Senin – Minggu)**
  - Mendukung pengaturan jadwal KBM harian dari Senin hingga Sabtu, serta kegiatan ekstrakurikuler / khusus di hari Minggu.
  - Validasi pintar anti-bentrok: menolak input jam yang sama pada hari yang sama.
- 🔊 **Pemutar Audio Fleksibel & Manajemen File**
  - Mendukung file audio populer: `.mp3`, `.wav`, `.ogg`, dan `.m4a`.
  - Dilengkapi antarmuka pemutar audio untuk uji dengar (*preview*) sebelum diterapkan ke jadwal.
  - Fitur unggah file audio langsung dari aplikasi ke folder `resources/audio/`.
  - **Fallback Cerdas**: Jika file audio belum diunggah, sistem otomatis membunyikan bel sintetis 8-nada bawaan (*Web Audio API*).
- 📋 **Salin Jadwal Antar Hari (Copy Schedule)**
  - Salin jadwal satu hari ke hari-hari lain dalam satu kali klik dengan pilihan mode:
    - **Gantikan Jadwal (Replace)**: Menimpa bersih jadwal hari tujuan.
    - **Gabungkan (Append)**: Menambahkan ke jadwal yang ada dan melewati jam yang sama.
- 📦 **Cadangkan & Pulihkan Data (Backup & Restore JSON)**
  - Simpan (*Export*) seluruh konfigurasi dan jadwal ke file format `.json`.
  - Pulihkan (*Import*) data cadangan kapan saja dengan mudah saat berpindah komputer.
- 🚀 **Auto-Start Windows (Startup Otomatis)**
  - Opsi agar BELSKO otomatis terbuka dan aktif berjalan setiap kali komputer Windows dinyalakan.
- 🛡️ **Minimasi ke System Tray & Proteksi Keluar**
  - Menekan tombol silang `[X]` tidak mematikan bel, melainkan menyembunyikan jendela ke *System Tray* Windows agar bel tetap berbunyi tepat waktu.
  - Dilengkapi tombol khusus **⛔ Matikan** dengan dialog konfirmasi keamanan agar bel tidak sengaja dinonaktifkan.
- 🕒 **Sinkronisasi Waktu Windows Instan**
  - Tombol pintas **🕒 Waktu** di header untuk langsung membuka menu pengaturan *Date & Time* Windows guna memastikan jam sistem selalu akurat.
- 🎨 **Tema Terang (Light Mode) & Gelap (Dark Mode)**
  - Tampilan *Light Mode* bersih dan elegan sebagai standar, serta opsi *Dark Mode* untuk kenyamanan mata dengan sakelar toggle instan di header.
- 🏫 **Kustomisasi Profil Sekolah**
  - Pengaturan nama sekolah yang tampil di header utama aplikasi.
- 🖥️ **Layar Penuh Otomatis (Fullscreen / Maximized)**
  - Aplikasi otomatis terbuka secara layar penuh (*maximized*) saat pertama kali dijalankan untuk visibilitas optimal operator sekolah.

---

## 🛠️ Teknologi yang Digunakan

- **Core Engine**: [Neutralinojs](https://neutralino.js.org/) (Framework Desktop Portabel & Ringan)
- **Frontend**: HTML5, Modern CSS3 (CSS Variables, Flexbox, CSS Grid)
- **Logika & Audio**: Vanilla JavaScript ES6+, Web Audio API, HTML5 Audio API
- **Penyimpanan**: Neutralino Storage API & LocalStorage Fallback

---

## 🚀 Panduan Menjalankan Proyek

### Prasyarat

Pastikan Anda telah memasang:
1. [Node.js](https://nodejs.org/) (v16 atau yang lebih baru)
2. Neutralinojs CLI:
   ```bash
   npm install -g @neutralinojs/neu
   ```

### Langkah Instalasi & Menjalankan

1. **Clone Repositori**:
   ```bash
   git clone https://github.com/username/bel-sekolah.git
   cd bel-sekolah
   ```

2. **Jalankan Aplikasi dalam Mode Pengembangan**:
   ```bash
   neu run
   ```

3. **Membangun Aplikasi untuk Distribusi (Build Windows .exe)**:
   ```bash
   neu build
   ```
   Hasil berkas executable siap pakai akan berada di folder `dist/bel-sekolah/`.

---

## 📁 Struktur Direktori

```text
bel-sekolah/
├── bin/                       # Binary Neutralinojs untuk Windows, Linux, macOS
├── resources/
│   ├── audio/                 # Direktori penyimpanan file audio bel (.mp3, .wav)
│   ├── icons/
│   │   ├── appIcon.png        # Ikon resmi aplikasi (HD 512x512)
│   │   └── trayIcon.png       # Ikon System Tray Windows
│   ├── js/
│   │   ├── neutralino.js      # Library Neutralino client API
│   │   └── main.js            # Logika utama aplikasi BELSKO
│   ├── index.html             # Tampilan antarmuka utama (UI)
│   └── styles.css             # Tema & styling tampilan (Dark & Light)
├── neutralino.config.json     # Konfigurasi aplikasi Neutralinojs
├── LICENSE                    # Lisensi Open Source (MIT)
└── README.md                  # Dokumentasi proyek
```

---

## 🤝 Berkontribusi

Kontribusi dari komunitas pendidikan dan pengembang perangkat lunak sangat disambut baik!

1. *Fork* repositori ini
2. Buat *branch* fitur baru Anda (`git checkout -b fitur/FiturKeren`)
3. *Commit* perubahan Anda (`git commit -m 'Menambahkan fitur keren'`)
4. *Push* ke *branch* tersebut (`git push origin fitur/FiturKeren`)
5. Buat *Pull Request* baru

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi [MIT License](LICENSE) — bebas digunakan, dimodifikasi, dan didistribusikan untuk keperluan sekolah maupun komersial.

---

## 👨‍💻 Pengembang

Dikembangkan dengan dedikasi untuk kemajuan teknologi pendidikan oleh:

**Andri Fernanda S.Pd., Gr.**  
*Pendidik & Software Developer*
