# Progress Log — Herbal Database Pipeline
<!-- Update setiap sesi kerja. Format: - [YYYY-MM-DD HH:MM] Nama AI — deskripsi -->

---

## 📊 Dashboard Status

| AI | Role | Territory | Status |
|----|------|-----------|--------|
| 🔵 Claude Code | UI & Integrasi | `www/` | ✅ Aktif |
| 🟡 Claude Desktop | OCR Buku Jamu | `data/ocr/` | ⏳ Proses |
| 🟢 Claude CLI #1 | Tanaman + Formula A | `data/claude1/` | ⏳ Menunggu mulai |
| 🔴 Claude CLI #2 | Formula B + Enrichment | `data/claude2/` | ⏳ Menunggu mulai |

---

## 📁 File Status

| File | Status | Dibuat oleh |
|------|--------|-------------|
| data/ocr/raw_formulas.json | ✅ Ada — 941 resep, 113 kondisi | Claude Desktop (Tugas A) ✅ |
| data/tcm_mkg/vitalora_enriched.json | ❌ Belum ada | Claude Desktop (Tugas B) |
| data/claude1/herbals_profiles.json | ❌ Belum ada | Claude CLI #1 |
| data/claude1/formulas_A.json | ❌ Belum ada | Claude CLI #1 |
| data/claude2/formulas_B.json | ❌ Belum ada | Claude CLI #2 |
| data/claude2/enriched_ocr.json | ❌ Belum ada | Claude CLI #2 |
| data/final/herbals_merged.json | ⏳ Menunggu herbals_profiles.json dari CLI #1 | Claude Code (scripts/merge_herbals.js siap) |
| data/final/formulas_merged.json | ❌ Belum ada | Claude Code |

---

## 🔄 Dependency & Unlock

```
Semua bisa mulai SEKARANG (paralel):
  Claude Desktop  → OCR buku
  Claude CLI #1   → herbals_profiles.json + formulas_A.json
  Claude CLI #2   → formulas_B.json
  Claude Code     → UI implementation

Unlock Task #2 Claude CLI #2:
  data/ocr/raw_formulas.json tersedia
        └──→ Claude CLI #2 mulai enriched_ocr.json

Unlock Fase Merge (Claude Code):
  data/claude1/DONE.flag    ✅ ada
  data/claude2/DONE.flag    ✅ ada
  data/ocr/raw_formulas.json ✅ ada
        └──→ Claude Code merge + seed Firestore
```

---

## 🟡 Claude Desktop — OCR + TCM Log
<!-- Claude Desktop: tambah entry di sini setiap sesi -->
- [2026-03-22] Setup: folder data/ocr/ siap — instruksi ada di COORDINATION.md
- [2026-03-22] Setup: folder data/tcm_mkg/ siap — instruksi Tugas B ada di RESOURCE_STRATEGY.md
- [2026-03-22 13:26] ✅ **OCR SELESAI** — Tesseract 4.1.1 (English engine), split-column
  - 312 halaman PDF → 624 kolom gambar terpisah → OCR → parsed
  - **941 resep valid** diekstrak dari 983 blok "Bahan" yang ditemukan
  - **183 kondisi/penyakit** unik dicakup (sesuai daftar isi buku)
  - **Catatan jumlah:** "1001" adalah kiasan marketing — jumlah aktual ~941 resep
  - File tersimpan: `data/ocr/raw_formulas.json` (860 KB) + `data/herbal-formulas-raw.json`
  - DONE flag dibuat: `data/ocr/DONE.flag`
  - Scripts disimpan: `scripts/parse_recipes.py`, `scripts/ocr_split_cols.py`, `scripts/requirements.txt`
  - **QC yang masih perlu:** ~10% herb names ada OCR noise, perlu normalisasi nama tanaman
- [2026-03-22] ✅ **TUGAS B SELESAI** — TCM-MKG filtering + enrichment
  - 9 file tidak relevan dihapus dari data/tcm_mkg/raw/ (277 MB → 11 MB)
  - Filter D6 (Chinese herbal pieces) + D7 (medicinal properties) + D8 (CHP→NP)
  - **32 tanaman Indonesia** berhasil di-match dari 6207 entri TCM-MKG
  - Data yang diekstrak: flavor, nature/temperature, meridian affinity, therapeutic actions
  - File tersimpan: `data/tcm_mkg/vitalora_enriched.json`
  - Script: `/sessions/build_enriched.py`
- [2026-03-22] ✅ **FASE 2 PLANNING SELESAI** — Health Intelligence setup
  - 10 dataset Kaggle dianalisis (280.550 baris gabungan)
  - WESAD dataset dipelajari — pipeline GSR → stress score dirancang
  - `COORDINATION.md` diperbarui ke v2.0 (tambah territory ML)
  - `CLAUDE_CODE_ML_TASKS.md` dibuat — perintah batch 1–5 untuk Claude Code
  - `CLAUDE_DESKTOP_ML_TASKS.md` dibuat — pipeline training 7 model
  - `vitalora_ml_guide.docx` dibuat — panduan teknis lengkap
  - `claude_code_plan.docx` dibuat — rencana kerja detail Claude Code
  - **Claude Code: silakan mulai Batch 1 (lihat CLAUDE_CODE_ML_TASKS.md)**
  - **Claude Desktop: tunggu instruksi Andre untuk mulai training ML**
- [2026-03-22] ✅ **ML TRAINING SELESAI** — 7 model terlatih dan siap pakai
  - scikit-learn 1.7.2 | RandomForestClassifier
  - metabolic:    acc=86.5% | 7 features  | dataset=2.401 baris
  - diabetes:     acc=92.2% | 10 features | dataset=6.000 baris
  - heart:        acc=80.6% | 13 features | dataset=10.000 baris
  - hypertension: acc=77.1% | 9 features  | dataset=1.985 baris
  - stroke:       acc=86.8% | 10 features | dataset=5.110 baris (class_weight=balanced)
  - sleep:        acc=87.1% | 10 features | dataset=374 baris
  - stress_wesad: synthetic WESAD distributions | 7 GSR features
  - Script: scripts/preprocess_train_export.py
  - Model JSON: data/ml_models/tfjs/ + **sudah dicopy ke www/models/**
  - **→ Claude Code: TIDAK perlu copy manual — mulai langsung Batch 2 (risk-engine.js)**

---

## 🟢 Claude CLI #1 — Research Log
<!-- Claude CLI #1: tambah entry di sini setiap selesai bagian -->
- [2026-03-22] Setup: folder data/claude1/ siap — instruksi ada di CLAUDE_1_TASK.md

---

## 🔴 Claude CLI #2 — Research Log
<!-- Claude CLI #2: tambah entry di sini setiap selesai bagian -->
- [2026-03-22] Setup: folder data/claude2/ siap — instruksi ada di CLAUDE_2_TASK.md
- [2026-03-22] Task #2 (enrichment) ON HOLD — menunggu data/ocr/raw_formulas.json

---

## 🔵 Claude Code — Implementation Log
- [2026-03-22] Master plan dibuat: AI_WORKFLOW.md (versi Claude all-Claude)
- [2026-03-22] Instruksi dibuat: CLAUDE_1_TASK.md + CLAUDE_2_TASK.md
- [2026-03-22] Folder struktur dibuat: data/ocr/, claude1/, claude2/, final/
- [2026-03-22] RESOURCE_STRATEGY.md dibuat: strategi TCM-MKG + GraphAI
- [2026-03-22] AI_WORKFLOW.md diperbarui: tambah Tugas B Claude Desktop (TCM-MKG)
- [2026-03-22] Folder data/tcm_mkg/ + subfolders dibuat
- [2026-03-22] ✅ shared/firebase.js — tambah 5 method baru: getHerbalFormulasByCondition, getHerbalFormulasPage, getHerbalsByCategory, batchSeedHerbals, batchSeedFormulas
- [2026-03-22] ✅ admin/seed-data.html — tambah 20 resep manual schema baru (Asam Urat×4, Batuk×4, Maag×3, DM×3, Hipertensi×3, Kolesterol×3)
- [2026-03-22] ✅ admin/import-herbal.html — dibuat: halaman import JSON batch ke Firestore (490 docs/batch)
- [2026-03-22] ✅ patient/herbal-formula.html — support schema baru + lama: evidenceLevel badge, isTopical, preparationType, warnings, disclaimer medis
- [2026-03-22] ✅ patient/herbal.html — tab Formula wired up + pagination 20/halaman + filter isTopical + filter kategori + disclaimer
- [2026-03-22] ✅ patient/disease-risk.html — tambah seksi Rekomendasi Herbal (load dari Firestore by condition)
- [2026-03-22] ✅ firestore.indexes.json — tambah index: indications array-contains, isTopical, categories array-contains
- [2026-03-22] ✅ firebase deploy — hosting + indexes deployed ke vitalora.web.app
- [2026-03-22] ✅ admin/import-herbal.html — tambah OCR cleaning engine: cleanText (7-step), cleanWarnings (keyword filter), mapPrepType, cleanOCRFormula + auto-detect + cleaning stats
- [2026-03-22] ✅ shared/firebase.js — tambah VDB.searchHerbalFormulas(query, limitN) — client-side search by name/condition/ingredients
- [2026-03-22] ✅ Fix OCR cleaning edge cases: (1) noise setelah ½ gelas "oA x, 2 =~ ap", (2) backslash bleed "\"3\ Iscam..." — tambah step 4b operator-strip regex
- [2026-03-22] ✅ scripts/merge_herbals.js — dibuat: merge herbals_profiles.json + vitalora_enriched.json → data/final/herbals_merged.json (siap dijalankan setelah Claude CLI #1 selesai)
- [2026-03-22] ✅ **Batch 1 — Health Intelligence Foundation**
  - admin/import-herbal.html: tambah cleanTCMHerb() + auto-detect TCM schema (vitalora_enriched.json → herbals collection)
  - shared/firebase.js: tambah 8 VDB methods: saveHealthProfile, getHealthProfile, updateHealthSection, saveLabResults, saveRiskScore, getLatestRiskScore, getRiskScoreHistory, _calcCompleteness
  - firestore.indexes.json: tambah riskScores collectionGroup index (calculatedAt DESC)
  - patient/home.html: tambah quick action "Profil Kesehatan" → health-profile.html
- [2026-03-22] ✅ **Batch 2 — Risk Engine + Disease Risk**
  - shared/risk-engine.js: dibuat — 6 scoring models (IDF/Metabolik, FINDRISC/Diabetes, Framingham/Jantung, JNC-8/Hipertensi, ASCVD/Stroke, PSQI/Tidur), output {score 0-100, category, factors[]}
  - patient/disease-risk.html: ditulis ulang — load health profile → RiskEngine.calculateAll() → saveRiskScore, 6 gauge bars dinamis + factor chips + herbal recs dari getTopConditions
- [2026-03-22] ✅ **Batch 3 — Dashboard + Doctor View + Admin ML**
  - patient/health-profile.html: dibuat — wizard 5 langkah (basic, lifestyle, riwayat keluarga, kondisi, lab) + BMI real-time + saves via updateHealthSection
  - patient/health-dashboard.html: dibuat — hero card, 6 mini risk cards, active factors, herbal recs, quick actions
  - doctor/patient-detail.html: Risk Score tab diperbarui — dynamic load VDB.getLatestRiskScore(patientId), renderRiskScores() semua 6 penyakit, gauge warna dinamis, no-data state
  - admin/ml-models.html: dibuat — monitoring 6 model aktif, distribusi risiko (collectionGroup query), pengguna risiko tinggi, roadmap v1/v2/v3
- [2026-03-22] ✅ **Batch 5 — ML Model Integration (risk-engine.js upgrade)**
  - shared/risk-engine.js: loadModels() sekarang nyata — fetch /models/*/model.json + metadata.json (vitalora_ml_v1 format)
  - Tambah _extractFeatures(): map health profile → feature vector per model (6 model, per-model mapping)
  - Tambah _mlInfer(): weighted-directional z-score + sigmoid → skor 0–100 per model
  - calculateAll() diperbarui: blend 60% ML + 40% rule-based saat _modelsLoaded=true, fallback pure rule-based
  - calculatedWith field: 'ml-hybrid-v2.0' atau 'rule-based-v1.0'
  - admin/ml-models.html: tambah loadMLModelStatus() — fetch metadata.json setiap model, update badge akurasi live
  - Roadmap v2.0 ditandai AKTIF di admin page
