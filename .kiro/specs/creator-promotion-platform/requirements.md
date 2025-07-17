# Requirements Document

## Introduction

Platform promosi konten kreator yang memungkinkan content creator memberikan fee kepada promoter yang berhasil mempromosikan konten mereka. Platform ini menggunakan sistem pay-per-view dengan deteksi bot otomatis, multi-subdomain architecture, dan sistem pembayaran terintegrasi.

## Requirements

### Requirement 1

**User Story:** Sebagai content creator, saya ingin dapat membuat campaign promosi dengan budget dan rate per view yang dapat saya tentukan, sehingga saya dapat meningkatkan engagement konten saya dengan cara yang terukur.

#### Acceptance Criteria

1. WHEN content creator membuat campaign THEN sistem SHALL memungkinkan pengaturan budget total dalam Rupiah
2. WHEN content creator mengatur rate THEN sistem SHALL memungkinkan penetapan fee per view (contoh: Rp 1000 per view)
3. WHEN content creator membuat campaign THEN sistem SHALL memungkinkan upload materi promosi (Google Drive links, YouTube links, social media content)
4. WHEN content creator membuat campaign THEN sistem SHALL memungkinkan penetapan persyaratan khusus untuk promoter
5. WHEN campaign dibuat THEN sistem SHALL menyimpan semua data campaign ke database PostgreSQL

### Requirement 2

**User Story:** Sebagai promoter, saya ingin dapat mendaftar untuk campaign dan mengedit konten promosi, sehingga saya dapat menghasilkan income dengan mempromosikan konten creator.

#### Acceptance Criteria

1. WHEN promoter mendaftar campaign THEN sistem SHALL memverifikasi akun social media promoter
2. WHEN promoter diterima THEN sistem SHALL memberikan akses ke materi promosi yang disediakan creator
3. WHEN promoter mengakses materi THEN sistem SHALL memungkinkan download dan edit konten (bukan hanya copy-paste)
4. WHEN promoter mengedit konten THEN sistem SHALL menyimpan tracking link unik untuk setiap promoter
5. WHEN promoter submit konten THEN sistem SHALL memvalidasi konten sesuai persyaratan campaign

### Requirement 3

**User Story:** Sebagai promoter, saya ingin dapat menghubungkan akun social media saya melalui OAuth, sehingga sistem dapat mengakses data views, likes, dan comments untuk tracking dan bot detection yang akurat.

#### Acceptance Criteria

1. WHEN promoter mendaftar THEN sistem SHALL menyediakan OAuth login untuk TikTok dan Instagram
2. WHEN OAuth berhasil THEN sistem SHALL menyimpan access token dan refresh token dengan aman
3. WHEN token expired THEN sistem SHALL otomatis refresh token untuk menjaga koneksi
4. WHEN promoter terhubung THEN sistem SHALL dapat mengakses public metrics (views, likes, comments, shares)
5. WHEN akun disconnected THEN sistem SHALL menghentikan tracking dan memberikan notifikasi

### Requirement 4

**User Story:** Sebagai sistem, saya ingin dapat melacak views, likes, dan comments secara otomatis dari platform social media melalui OAuth, sehingga pembayaran dapat dihitung dengan akurat dan bot detection dapat berjalan optimal.

#### Acceptance Criteria

1. WHEN konten dipromosikan di TikTok THEN sistem SHALL menggunakan TikTok API dengan OAuth token untuk mengambil metrics real-time
2. WHEN konten dipromosikan di Instagram THEN sistem SHALL menggunakan Instagram API dengan OAuth token untuk mengambil metrics real-time
3. WHEN metrics diperoleh THEN sistem SHALL mencatat views, likes, comments, shares dengan timestamp
4. WHEN tracking berjalan THEN sistem SHALL update data setiap menit menggunakan background worker
5. WHEN data metrics diperoleh THEN sistem SHALL menyimpan ke Redis untuk caching dan PostgreSQL untuk persistence
6. WHEN API rate limit tercapai THEN sistem SHALL implement exponential backoff dan queue system

### Requirement 5

**User Story:** Sebagai sistem anti-fraud, saya ingin dapat mendeteksi bot views dengan algoritma yang akurat, sehingga pembayaran hanya diberikan untuk views yang legitimate.

#### Acceptance Criteria

1. WHEN sistem menganalisis views THEN sistem SHALL menghitung rata-rata views, likes, dan comments per menit
2. WHEN rasio views:likes:comments abnormal (>10:1:0.1 dalam 1 menit) THEN sistem SHALL menandai sebagai suspicious
3. WHEN spike views >500% dari rata-rata normal dalam <5 menit THEN sistem SHALL menandai sebagai high-risk bot
4. WHEN bot confidence >90% THEN sistem SHALL otomatis ban promoter dan batalkan payout
5. WHEN bot confidence 50-90% THEN sistem SHALL memberikan warning dan hold payout untuk review
6. WHEN bot confidence 20-50% THEN sistem SHALL memberikan notifikasi monitoring
7. WHEN analisis selesai THEN sistem SHALL menyimpan bot detection score ke database

### Requirement 6

**User Story:** Sebagai promoter, saya ingin menerima pembayaran harian yang akurat berdasarkan views legitimate, sehingga saya mendapat kompensasi yang adil untuk usaha promosi saya.

#### Acceptance Criteria

1. WHEN hari berakhir (00:00 WIB) THEN sistem SHALL menghitung total views legitimate per promoter
2. WHEN perhitungan selesai THEN sistem SHALL mengkalikan views dengan rate campaign untuk mendapat total payout
3. WHEN payout dihitung THEN sistem SHALL memotong platform fee (contoh: 5%)
4. WHEN bot detection clear THEN sistem SHALL memproses pembayaran otomatis
5. WHEN pembayaran diproses THEN sistem SHALL mengirim notifikasi ke promoter
6. WHEN pembayaran gagal THEN sistem SHALL retry maksimal 3x dengan exponential backoff

### Requirement 7

**User Story:** Sebagai admin platform, saya ingin memiliki dashboard khusus untuk mengelola user, campaign, dan keuangan, sehingga saya dapat mengoperasikan platform dengan efisien.

#### Acceptance Criteria

1. WHEN admin mengakses admin.domain.com THEN sistem SHALL menampilkan dashboard admin dengan autentikasi BetterAuth
2. WHEN admin melihat users THEN sistem SHALL menampilkan list user dengan opsi ban/unban
3. WHEN admin melihat complaints THEN sistem SHALL menampilkan sistem ticketing untuk keluhan user
4. WHEN admin melihat finances THEN sistem SHALL menampilkan total fee platform dan opsi withdrawal
5. WHEN admin melakukan withdrawal THEN sistem SHALL mencatat transaksi dan update balance
6. WHEN admin melihat bot detection THEN sistem SHALL menampilkan log dan statistik bot detection

### Requirement 8

**User Story:** Sebagai developer, saya ingin menggunakan arsitektur monorepo dengan Turborepo untuk mengorganisir berbagai aplikasi subdomain, sehingga codebase mudah di-maintain dan di-deploy secara terpisah.

#### Acceptance Criteria

1. WHEN project di-setup THEN sistem SHALL menggunakan Turborepo untuk monorepo management
2. WHEN struktur dibuat THEN sistem SHALL memiliki apps terpisah: landing-page, auth-app, dashboard-app, admin-app
3. WHEN shared code diperlukan THEN sistem SHALL menggunakan packages untuk shared components, utils, dan database schemas
4. WHEN database diperlukan THEN sistem SHALL memiliki package terpisah untuk PostgreSQL dan Redis configurations
5. WHEN build process berjalan THEN sistem SHALL menggunakan Turborepo untuk parallel building dan caching

### Requirement 9

**User Story:** Sebagai user, saya ingin mengakses berbagai fitur platform melalui subdomain yang terorganisir, sehingga pengalaman pengguna menjadi lebih intuitif dan terstruktur.

#### Acceptance Criteria

1. WHEN user mengakses domain utama THEN sistem SHALL menampilkan landing page di www.domain.com (apps/landing-page)
2. WHEN user perlu login/register THEN sistem SHALL redirect ke auth.domain.com (apps/auth-app) dengan BetterAuth
3. WHEN user sudah login THEN sistem SHALL memberikan akses ke dashboard.domain.com (apps/dashboard-app)
4. WHEN admin login THEN sistem SHALL memberikan akses ke admin.domain.com (apps/admin-app)
5. WHEN subdomain diakses THEN setiap app SHALL menggunakan Next.js dengan shared packages untuk consistency

### Requirement 10

**User Story:** Sebagai developer, saya ingin memiliki struktur direktori yang terorganisir untuk testing, documentation, dan summary files, sehingga project mudah di-maintain dan tidak berantakan.

#### Acceptance Criteria

1. WHEN testing files dibuat THEN sistem SHALL mengorganisir dalam direktori __tests__/ atau tests/ di setiap package/app
2. WHEN documentation diperlukan THEN sistem SHALL menyimpan dalam direktori docs/ di root project
3. WHEN summary atau report files dibuat THEN sistem SHALL menyimpan dalam direktori reports/ atau summaries/
4. WHEN log files diperlukan THEN sistem SHALL menyimpan dalam direktori logs/ dengan rotation policy
5. WHEN temporary files dibuat THEN sistem SHALL menggunakan direktori temp/ atau tmp/ dengan auto-cleanup
6. WHEN configuration files diperlukan THEN sistem SHALL mengorganisir dalam direktori config/ di setiap package

### Requirement 11

**User Story:** Sebagai developer, saya ingin memiliki kontrol yang baik terhadap terminal commands dan long-running processes, sehingga development workflow tidak terganggu oleh processes yang berjalan tanpa batas.

#### Acceptance Criteria

1. WHEN menjalankan development server (npm run dev) THEN sistem SHALL memberikan timeout warning setelah 30 detik
2. WHEN menjalankan build process THEN sistem SHALL memiliki timeout maksimal 10 menit
3. WHEN menjalankan test suite THEN sistem SHALL memiliki timeout maksimal 5 menit per test file
4. WHEN menjalankan database migration THEN sistem SHALL memiliki timeout maksimal 2 menit
5. WHEN process berjalan lebih dari timeout THEN sistem SHALL memberikan opsi untuk terminate atau continue
6. WHEN long-running process diperlukan THEN sistem SHALL menyediakan background process management dengan proper logging

### Requirement 12

**User Story:** Sebagai sistem, saya ingin menggunakan arsitektur yang scalable dan reliable, sehingga platform dapat menangani traffic tinggi dan data processing yang intensif.

#### Acceptance Criteria

1. WHEN aplikasi di-deploy THEN sistem SHALL menggunakan Railway untuk hosting dengan multi-app deployment
2. WHEN database diperlukan THEN sistem SHALL menggunakan PostgreSQL dengan Docker di packages/database
3. WHEN caching diperlukan THEN sistem SHALL menggunakan Redis dengan Docker di packages/cache
4. WHEN background processing diperlukan THEN sistem SHALL menggunakan Next.js API routes sebagai workers dengan cron jobs
5. WHEN UI diperlukan THEN sistem SHALL menggunakan ShadcnUI dengan Tailwind CSS di packages/ui
6. WHEN real-time updates diperlukan THEN sistem SHALL menggunakan WebSocket atau Server-Sent Events