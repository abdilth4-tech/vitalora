# TOHA_TASK.md — Batch Task untuk Programmer Toha

> **Dibuat oleh:** Claude Code · **Tanggal:** 2026-03-22
> **Project:** Vitalora — Healthcare PWA
> **Stack:** HTML/CSS/JS + Firebase Firestore/Auth (compat SDK 10.12.2) + Neumorphic design system

---

## Konteks Codebase

```
www/
  shared/
    neumorphic.css      — design system (jangan diubah)
    app.js              — nav(), showToast(), sparkline(), createGauge()
    firebase.js         — VAuth, VDB, VFirebase, VitalsManager, VChatManager, RTC
    chat-manager.js     — VChatManager (Firestore real-time chat)
    webrtc-manager.js   — WebRTC video call
    risk-engine.js      — RiskEngine (6 model scoring)
  patient/
    home.html           — Home pasien (quick actions grid)
    chat-room.html      — ✅ Chat pasien–dokter (SUDAH BERFUNGSI)
    edit-profile.html   — ✅ Edit profil pasien (SUDAH BERFUNGSI)
    health-profile.html — ✅ Wizard profil kesehatan
  doctor/
    home.html           — Home dokter
    chat.html           — ⚠️ List konsultasi (3 tab belum wired)
    chat-room.html      — ✅ Chat dokter–pasien (SUDAH BERFUNGSI)
    edit-profile.html   — ⚠️ Save profil pakai selector fragile
```

**Auth pattern:**
```javascript
const { user, profile } = await VAuth.guard('patient', 1); // atau 'doctor'
// 1 = redirect ke login jika tidak authenticated
```

**Firestore pattern:**
```javascript
const db = firebase.firestore();           // atau VFirebase.db
await VDB.updateUser(uid, { name, ... });  // users collection
await VDB.updatePatient(uid, { ... });     // patients collection
```

---

## TASK A — Buat `www/patient/ai-chat.html` (AI Health Assistant)

### Deskripsi
Halaman chat pasien dengan AI kesehatan (Gemini API). Pasien bisa tanya tentang gejala, herbal, dan saran kesehatan dalam Bahasa Indonesia.

### UI yang Dibutuhkan
Sama seperti `patient/chat-room.html` tapi:
- Header: nama "Vitalora AI" + avatar biru + status "Online 24/7"
- Tidak ada tombol video call
- Tidak ada "Bagikan Vital"
- Ada tombol quick suggestion chips di atas input (contoh: "Sakit kepala", "Herbal untuk diabetes", "Tips tidur", "Gejala maag")

### Implementasi Gemini API

**API:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
**Gratis:** Ya — 15 req/min, 1500 req/hari
**API Key:** Simpan di konstanta `GEMINI_KEY` di atas script (minta user isi sebelum deploy)

```javascript
const GEMINI_KEY = 'YOUR_GEMINI_API_KEY'; // ganti dengan key dari console.cloud.google.com

async function askGemini(userMessage, history) {
  const systemPrompt = `Kamu adalah Vitalora AI, asisten kesehatan yang ramah dan berpengetahuan.
Jawab dalam Bahasa Indonesia yang mudah dipahami.
Berikan saran kesehatan yang berguna tapi selalu ingatkan user untuk konsultasi ke dokter untuk diagnosis resmi.
Jika ada pertanyaan tentang tanaman herbal, berikan informasi manfaat, cara pakai, dan kontraindikasi.
Jangan memberikan diagnosis penyakit secara pasti. Batasi jawaban maksimal 3-4 kalimat singkat kecuali diminta detail.`;

  const contents = [];
  // Build history
  history.forEach(m => {
    contents.push({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: m.text }] });
  });
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
      })
    }
  );
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Maaf, saya tidak bisa menjawab saat ini.';
}
```

**State lokal (jangan simpan ke Firestore):**
```javascript
let chatHistory = []; // { role: 'user'|'ai', text: string, ts: Date }
```

**Alur:**
1. Halaman load → tampilkan pesan selamat datang dari AI
2. User ketik/klik chip → `sendToAI(text)`
3. Tampilkan bubble user (kanan) + loading indicator
4. Await `askGemini()` → tampilkan bubble AI (kiri)
5. Jika GEMINI_KEY masih 'YOUR_GEMINI_API_KEY' → tampilkan pesan "AI belum dikonfigurasi. Silakan chat dengan dokter." dengan tombol → chat-room.html

### Fallback (jika API key belum diset)
Tampilkan card info:
```html
<div class="neu-card" style="text-align:center;padding:24px;">
  <p>Fitur AI Chat belum aktif.</p>
  <p style="font-size:0.75rem;">Silakan konsultasi langsung dengan dokter.</p>
  <button onclick="nav('find-doctor.html')" class="neu-btn-primary">Cari Dokter</button>
</div>
```

### Navigasi — Tambah di `patient/home.html`
Tambah quick action item di grid quick actions (cari `<div class="quick-item"`):
```html
<div class="quick-item" onclick="nav('ai-chat.html')">
  <div class="qi-icon" style="color:#2F80ED;background:rgba(47,128,237,0.12)">
    <ion-icon name="sparkles-outline"></ion-icon>
  </div>
  <span class="qi-label">AI Health</span>
</div>
```

---

## TASK B — Fix `www/doctor/chat.html` Tab Switching

### Masalah
3 tab (Antrian / Aktif / Resep) ada di HTML tapi tidak ter-switch. Semua konsultasi ditampilkan di satu list tanpa filter per tab.

### Solusi
Modifikasi fungsi `loadConsultations(doctorId)` untuk support filter berdasarkan tab aktif.

**Tambah state tab:**
```javascript
let activeTab = 'antrian'; // 'antrian' | 'aktif' | 'resep'
```

**Tambah tab click handler (ganti div.neu-tab jadi clickable):**
```html
<div class="neu-tabs">
  <div class="neu-tab active" onclick="switchTab('antrian', this)">Antrian</div>
  <div class="neu-tab" onclick="switchTab('aktif', this)">Aktif</div>
  <div class="neu-tab" onclick="switchTab('resep', this)">Resep</div>
</div>
```

```javascript
function switchTab(tab, el) {
  activeTab = tab;
  document.querySelectorAll('.neu-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  loadConsultations(currentDoctorId);
}
```

**Filter per tab di `loadConsultations`:**
```javascript
// Tab Antrian: status = 'pending'
// Tab Aktif: status = 'active'
// Tab Resep: status = 'completed' → tampilkan resep/summary konsultasi

const statusFilter = activeTab === 'antrian' ? ['pending']
                   : activeTab === 'aktif'   ? ['active']
                   : ['completed'];
```

**Tab Resep** — Tampilkan kartu ringkasan:
```html
<!-- Setiap item tab Resep -->
<div class="neu-card-sm" style="border-left:3px solid var(--primary-dark);">
  <div style="font-weight:700;">Nama Pasien</div>
  <div style="font-size:0.7rem;color:var(--text-muted);">Selesai: 18 Mar 2026 · 30 menit</div>
  <div style="font-size:0.75rem;margin-top:6px;">Diagnosa: Tension Headache</div>
  <button class="neu-btn-sm" style="margin-top:8px;">Lihat Detail</button>
</div>
```

**Simpan doctorId:**
```javascript
let currentDoctorId = null;
(async () => {
  const { user } = await VAuth.guard('doctor', 1);
  currentDoctorId = user.uid;
  await loadConsultations(currentDoctorId);
})();
```

---

## TASK C — Fix `www/doctor/edit-profile.html` saveProfile()

### Masalah
`saveProfile()` saat ini mencari input dengan `querySelector('input[value="dr. Sarah Wijaya, Sp.PD"]')` — ini hanya bekerja saat data belum berubah (mencari berdasarkan value default hardcoded).

### Solusi
1. Tambah `id` ke setiap input field di HTML:
```html
<!-- Nama -->
<input id="input-name" class="neu-input-field" type="text" ...>

<!-- Spesialisasi -->
<input id="input-specialty" class="neu-input-field" type="text" ...>

<!-- Konsultasi Fee -->
<input id="input-fee" class="neu-input-field" type="number" ...>

<!-- Bio/Deskripsi -->
<textarea id="input-bio" class="neu-textarea-field" ...></textarea>

<!-- Tahun Pengalaman -->
<input id="input-experience" class="neu-input-field" type="number" ...>
```

2. Update `saveProfile()`:
```javascript
async function saveProfile() {
  if (!_currentUser) { showToast('Sesi tidak valid', 'error'); return; }
  try {
    const name        = document.getElementById('input-name')?.value.trim();
    const specialty   = document.getElementById('input-specialty')?.value.trim();
    const bio         = document.getElementById('input-bio')?.value.trim();
    const fee         = parseInt(document.getElementById('input-fee')?.value) || 0;
    const experience  = parseInt(document.getElementById('input-experience')?.value) || 0;

    // Collect education entries
    const eduEntries = Array.from(document.querySelectorAll('.edu-entry')).map(entry => {
      const inputs = entry.querySelectorAll('input');
      return { degree: inputs[0]?.value.trim(), institution: inputs[1]?.value.trim() };
    }).filter(e => e.degree);

    const updateData = {};
    if (name)       updateData.name = name;
    if (specialty)  updateData.specialty = specialty;
    if (bio)        updateData.bio = bio;
    if (fee)        updateData.consultationFee = fee;
    if (experience) updateData.yearsExperience = experience;
    if (eduEntries.length) updateData.education = eduEntries;

    await VDB.updateUser(_currentUser.uid, updateData);
    showToast('Profil berhasil disimpan', 'success');
    setTimeout(() => nav('profile.html'), 1000);
  } catch (err) {
    showToast('Gagal menyimpan: ' + (err.message || err), 'error');
    console.error(err);
  }
}
```

3. Update pre-fill di init untuk menggunakan ID yang sama:
```javascript
// Ganti selector lama dengan:
document.getElementById('input-name').value = userData.name || '';
document.getElementById('input-specialty').value = userData.specialty || '';
document.getElementById('input-bio').value = userData.bio || '';
document.getElementById('input-fee').value = userData.consultationFee || '';
document.getElementById('input-experience').value = userData.yearsExperience || '';
```

---

## TASK D — Perbaikan Kecil `www/patient/edit-profile.html`

### Masalah
Setelah save, halaman tidak redirect ke profil. Juga tidak ada konfirmasi visual yang jelas.

### Solusi
Di `saveProfile()`, setelah `showToast('Profil berhasil disimpan', 'success')` tambahkan:
```javascript
setTimeout(() => nav('profile.html'), 1200);
```

Juga, tambah field **nomor telepon** sebelum tombol simpan:
```html
<div class="form-group">
  <label class="form-label">Nomor Telepon</label>
  <input id="input-phone" class="neu-input-full" type="tel" placeholder="+62 81x xxxx xxxx">
</div>
```

Dan simpan di `saveProfile()`:
```javascript
const phone = document.getElementById('input-phone')?.value.trim();
if (phone) await VDB.updateUser(_currentUser.uid, { phone });
```

Pre-fill:
```javascript
const phoneInput = document.getElementById('input-phone');
if (phoneInput && profile.phone) phoneInput.value = profile.phone;
```

---

## Urutan Pengerjaan (Prioritas)

```
1. TASK C — doctor/edit-profile.html fix (30 menit, paling mudah)
2. TASK D — patient/edit-profile.html + redirect (15 menit)
3. TASK B — doctor/chat.html tab switching (1 jam)
4. TASK A — patient/ai-chat.html AI chat (2-3 jam, paling kompleks)
```

---

## Catatan Penting

1. **Design system** — Jangan ubah `neumorphic.css`. Gunakan class existing:
   - `.neu-card`, `.neu-card-sm`, `.neu-card-flat` — card variants
   - `.neu-btn-primary`, `.neu-btn`, `.neu-btn-sm` — tombol
   - `.neu-input-full`, `.neu-input-field` — input
   - `.neu-tabs`, `.neu-tab` — tab navigation

2. **Firebase SDK** — SELALU pakai compat SDK (bukan modular):
   ```javascript
   // ✅ Benar
   firebase.firestore().collection('users').doc(uid).get()
   // ❌ Salah
   import { getFirestore } from 'firebase/firestore'
   ```

3. **Auth guard** — Setiap halaman protected harus mulai dengan:
   ```javascript
   const { user, profile } = await VAuth.guard('patient', 1); // atau 'doctor'
   ```

4. **Script order** — Selalu ikuti urutan ini di `<head>` atau sebelum `</body>`:
   ```html
   <script src="../shared/app.js"></script>
   <script src="https://...firebase-app-compat.js"></script>
   <script src="https://...firebase-auth-compat.js"></script>
   <script src="https://...firebase-firestore-compat.js"></script>
   <script src="../shared/firebase.js"></script>
   ```

5. **Gemini API key** — Simpan di `GEMINI_KEY` konstanta. Kalau belum ada API key dari user, implementasi fallback dulu (rule-based atau redirect ke dokter).

6. **Free infra constraint** — Semua backend adalah Firebase free tier. Tidak ada server Node.js. Gemini API key untuk AI chat butuh akun Google Cloud.

---

## File yang Perlu Dibuat/Diubah

| File | Status | Action |
|------|--------|--------|
| `www/patient/ai-chat.html` | ❌ Belum ada | CREATE (Task A) |
| `www/patient/home.html` | ✅ Ada | EDIT — tambah quick action AI Health (Task A) |
| `www/doctor/chat.html` | ⚠️ Tab tidak berfungsi | EDIT — wire up 3 tabs (Task B) |
| `www/doctor/edit-profile.html` | ⚠️ Selector fragile | EDIT — tambah ID + fix saveProfile (Task C) |
| `www/patient/edit-profile.html` | ✅ Hampir selesai | EDIT — redirect + phone field (Task D) |

---

*Jika ada pertanyaan teknis, lihat CLAUDE.md di root folder untuk full context codebase.*
