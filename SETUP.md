# SETUP: urutan kerja (target sekitar 5-6 jam, belajar platform baru bisa molor)

Catatan jujur: sisi ServiceNow di paket ini tidak dijalankan di instance asli saat dibuat.
Script mengikuti pola API standar, tapi nama menu bisa sedikit beda antar release dan
nama Assignment Group di PDI bisa beda. Kalau ada yang error, baca log di
System Logs > System Log > All.

## Bagian A: Deploy classifier (30-45 menit)

1. Jalankan lokal dulu:
   ```
   cd classifier
   pip install -r requirements-dev.txt
   pytest -q            # semua harus hijau
   uvicorn main:app --reload
   ```
   Coba: `curl -X POST localhost:8000/classify -H "Content-Type: application/json" -d '{"text":"wifi kantor mati"}'`
2. Push folder `classifier/` ke repo GitHub.
3. Deploy ke layanan hosting yang bisa Docker (mis. Render atau Hugging Face Spaces, tipe Docker).
   Set env var `AITRIAGE_API_KEY` ke string acak panjang.
4. Tes URL publiknya: `https://HOST/health` harus balas `{"status":"ok",...}`.
   Layanan gratis biasanya tidur kalau lama tidak dipakai. Buka `/health` dulu sebelum demo,
   kalau tidak panggilan pertama bisa timeout (5 detik) dan fallback keyword yang jalan.

## Bagian B: ServiceNow (4-5 jam)

### B0. Instance + Update Set (10 menit)
1. developer.servicenow.com > daftar > Request instance (Personal Developer Instance, gratis).
2. Di instance: System Update Sets > Local Update Sets > New. Nama: `Smart Helpdesk v1`. Set sebagai current.
   Semua perubahan di bawah akan tercatat di sini, nanti di-export sebagai XML.

### B1. System Properties (5 menit)
Buka `sys_properties.list` > New, buat dua:
- `aitriage.endpoint` = `https://HOST/classify`
- `aitriage.api_key` = nilai yang sama dengan `AITRIAGE_API_KEY`

(Untuk demo, API key di property biasa sudah cukup. Di produksi pakai Credentials / Connection & Credential Alias.)

### B2. Cek Assignment Group dan nilai Category (10 menit)
- `sys_user_group.list`: pastikan ada group bernama Network, Hardware, Software, Database, Service Desk.
  Kalau ada yang tidak ada, buat, atau ubah mapping di Business Rule.
- Buka form Incident, lihat pilihan Category. Nilai (value) yang dipakai script:
  network, hardware, software, database, inquiry.

### B3. Script Include (15 menit)
System Definition > Script Includes > New. Name: `AITriage`. Client callable: tidak.
Isi dengan `servicenow/script_include_AITriage.js`.

### B4. Business Rule (20 menit)
System Definition > Business Rules > New.
- Table: Incident, When: before, Insert: dicentang
- Filter condition: Category is empty
- Advanced dicentang, isi Script dengan `servicenow/business_rule_incident_triage.js`

### B5. Record Producer (45 menit)
Service Catalog > Catalog Definitions > Record Producers > New.
- Name: `Report an Issue`, Table: Incident, tampilkan di catalog (Catalogs dan Category sesuai)
- Variables: `short_description`, `description`, `urgency_level` (Select Box, nilai 1/2/3)
- Script: isi dengan `servicenow/record_producer_script.js`
- Buat Catalog Client Script (onSubmit) dari `servicenow/catalog_client_script_validate.js`

### B6. Flow Designer (45-60 menit)
Tampilan Flow Designer berubah antar release, jadi ikuti nama komponennya, bukan posisi menu.
- Trigger: Record > Created, table Incident, condition Priority is 1 - Critical (urgency/impact High)
- Action: Send Email ke Assignment Group (atau Ask For Approval / Create Task, pilih salah satu)
- Aktifkan flow. Email di PDI tidak benar-benar terkirim, cek di System Mailboxes > Outbound > Sent / Outbox.

### B7. Tes (30 menit)
Kirim 6-8 tiket lewat Record Producer (campur Indonesia dan Inggris, beda kategori, satu urgensi High).
Buka `incident.list` dan cek: Category terisi, Assignment Group terisi, Work notes menyebut source
`ml-api`. Lalu kosongkan property `aitriage.endpoint`, kirim tiket lagi, dan pastikan source jadi
`keyword-fallback` (ini bukti fallback jalan). Screenshot semuanya.

### B8. Dokumentasi (45 menit)
- Update Set > Mark Complete > Export to XML. Simpan di `servicenow/update-set/`.
- Tambah screenshot ke `docs/` dan rekam GIF/video pendek 1-2 menit alurnya.
- Commit semuanya ke GitHub, isi bagian "Screenshots" di README.

Opsional kalau masih ada waktu: ACL dan role, tes dengan Impersonate User, atau pindahkan
panggilan REST ke async Business Rule supaya tidak menahan penyimpanan tiket.
