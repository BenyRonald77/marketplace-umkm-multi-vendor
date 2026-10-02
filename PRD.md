# PRD — Marketplace UMKM Multi-Vendor

## 1. Ringkasan
Marketplace untuk banyak UMKM dalam satu platform. Pembeli mengisi satu keranjang
dari beberapa toko, lalu checkout memecahnya otomatis menjadi **sub-order per vendor**:
tiap sub-order punya daftar item, ongkir sendiri, dan status sendiri. Pembeli membayar
**satu tagihan**; setelah pembayaran dikonfirmasi, dana dibagi ke **saldo tiap vendor**
setelah dipotong **komisi platform** (persentase configurable). Komisi tercatat di
**ledger platform**, mutasi saldo tercatat di **ledger vendor**.

## 2. Stack
Next.js 14 + TypeScript + Prisma 5.22 + SQLite + Tailwind CSS, App Router.

## 3. Entitas & Aturan

### Toko / Vendor
- Nama, deskripsi, pemilik, status aktif, **tarif ongkir flat per sub-order** (dapat beda tiap toko).

### Produk
- Milik satu toko; nama, harga, stok, kategori, status aktif.
- Harga/nama di-snapshot ke order item saat checkout (perubahan harga kemudian tidak mengubah order lama).

### Pembeli
- Nama, email unik.

### Keranjang
- Satu keranjang per pembeli, boleh berisi produk dari banyak toko.
- Tambah produk: qty digabung bila produk sudah ada. Qty tidak boleh melebihi stok (409).

### Checkout (Order → Sub-Order)
- Satu keranjang dipecah otomatis per toko → satu **SubOrder** per vendor.
- Tiap sub-order: item-item vendor itu + ongkir = tarif flat toko + status awal `menunggu_bayar`.
- **Stok atomik:** untuk tiap produk, stok dikurangi via `updateMany` kondisional
  (`WHERE id = ? AND stok >= qty`) — satu statement SQL, atomik di level database.
  Sebelumnya ada pre-check stok; bila ada produk yang stoknya kurang → **seluruh
  checkout gagal 409 dan tidak ada sub-order yang tercipta**. Bila race membuat
  salah satu conditional decrement gagal (0 row), decrement yang sudah berhasil
  di-rollback (increment kembali) lalu 409.
- Setelah sukses: keranjang dikosongkan, Order dibuat dengan kode unik, total =
  Σ subtotal item + Σ ongkir.

### Pembayaran Tunggal
- Pembeli membayar satu tagihan (`POST /api/pembayaran {orderId}`).
- Setelah konfirmasi, untuk tiap sub-order yang belum dibatalkan:
  - `komisi = round((subtotalItem + ongkir) × komisi_persen / 100)`
  - `bersihVendor = subtotalItem + ongkir − komisi`
  - Ledger vendor: `kredit_penjualan` sebesar bersihVendor (saldo vendor bertambah).
  - Ledger platform: `komisi` sebesar komisi.
- Saldo vendor = Σ jumlah di ledger vendor (derived, tidak disimpan terpisah).

### Pembatalan Satu Sub-Order
- `POST /api/suborder/[id]/batal`. Tidak boleh bila status `selesai` atau sudah `dibatalkan`.
- Stok tiap item sub-order dikembalikan (increment).
- Bila sub-order sudah dibayar (order lunas): ledger vendor dikoreksi
  (`koreksi_batal`, −bersihVendor) dan ledger platform dikoreksi (`koreksi_batal`, −komisi).
- Sub-order lain dalam order yang sama **tidak terganggu** (status & saldo tetap).

### Status Sub-Order
`menunggu_bayar → diproses → dikirim → selesai`, atau `dibatalkan` dari status
apa pun kecuali `selesai`. Transisi maju satu langkah via `PATCH /api/suborder/[id]`.

### Admin
- Lihat ledger komisi platform (total komisi bersih), ubah persentase komisi
  (`PATCH /api/config`). Perubahan komisi hanya berlaku untuk pembayaran berikutnya.

## 4. API
- `GET/POST /api/toko`, `GET/PATCH /api/toko/[id]`
- `GET/POST /api/produk`, `GET/PATCH /api/produk/[id]` (filter: tokoId, kategori, q)
- `GET/POST/PUT/DELETE /api/keranjang` (per pembeli)
- `POST /api/checkout`, `GET /api/checkout/preview?pembeliId=` (pratinjau pecahan sub-order)
- `GET /api/pesanan?pembeliId=` (order + sub-order pembeli)
- `POST /api/pembayaran`
- `PATCH /api/suborder/[id]` (ubah status), `POST /api/suborder/[id]/batal`
- `GET /api/vendor/[id]/dashboard` (sub-order masuk, saldo, mutasi)
- `GET /api/admin/ledger`, `GET /api/admin/ringkasan`
- `GET/PATCH /api/config`

## 5. Halaman UI (Bahasa Indonesia)
- `/` beranda + navigasi; `/katalog` (filter toko/kategori/pencarian, tambah ke keranjang);
  `/keranjang`; `/checkout` (pratinjau pecahan per vendor + ongkir); `/pesanan`
  (tagihan, bayar, batal per sub-order, lacak status); `/vendor` (pilih toko →
  dashboard: pesanan masuk, saldo, mutasi, ubah status); `/admin` (ledger komisi,
  ringkasan, ubah % komisi).

## 6. Seed
3 toko (kuliner, kerajinan, batik), 9 produk lintas toko, 1 pembeli contoh, komisi 5%.

## 7. Di luar cakupan
Refund ke pembeli saat pembatalan pasca-bayar ditangani manual/di luar sistem
(ledger hanya mencatat koreksi saldo vendor & komisi). Tidak ada payment gateway
nyata — konfirmasi pembayaran disimulasikan.
