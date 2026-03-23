# 🎯 TOHA IMPLEMENTATION PLAN — Lengkap

**Status:** 2026-03-23 | Claude Code | Comprehensive Task Analysis & Execution Plan

---

## 📊 COMPLETION STATUS

### ✅ COMPLETED (Progress.md)
| Module | Task | Status |
|--------|------|--------|
| Health Intelligence | Batch 1-5 Setup | ✅ |
| Risk Engine | 6 Models + Scoring | ✅ |
| Dashboard | Health Profile + Risk Cards | ✅ |
| ML Integration | Hybrid 60/40 Mode | ✅ |
| Admin Import | Bug Fix + Error Handling | ✅ |

### 🔄 IN PROGRESS (Phase 1)
| Task | Status | ETA |
|------|--------|-----|
| Run merge_herbals.js | ✅ DONE | - |
| Create seed_herbals.js | ✅ DONE | - |
| Seed to Firestore | ⏳ PENDING | Now |

### ❌ NOT STARTED (TOHA_TASK.md Batch 1-12)
| Batch | Task | Priority | Est. Time |
|-------|------|----------|-----------|
| 1 | Onboarding Wizard | HIGH | 1.5h |
| 2 | Admin Suspend/Delete | HIGH | 1h |
| 3 | Admin Herbal CRUD | HIGH | 2h |
| 4 | Admin Formula CRUD | MED | 2h |
| 5 | Admin Consultations | MED | 2h |
| 6 | Admin Reports/Export | MED | 2h |
| 7 | Admin Settings | LOW | 1.5h |
| 8 | Chat/Video Hardening + ML Hybrid | MED | 2h |
| 9 | ML Models UI Activation | MED | 1.5h |
| 10 | Gemini Chat Integration | LOW | 2.5h |
| 11 | Stress Detection UI | LOW | 1.5h |
| 12 | Health Analytics Chart | LOW | 2h |

**Total Remaining:** ~21 hours of implementation

---

## 🚀 EXECUTION SEQUENCE

### PHASE 1 (NOW) — Data Pipeline ⚡
```
1. Seed herbals_merged.json to Firestore
   → Verify patient.herbal page shows data
   → Deploy hosting
```

### PHASE 2 (2-3 hours) — Critical UI/Admin ⭐
```
1. BATCH 1: Onboarding Wizard → patient/onboarding.html
   - Modify patient/home.html (add guard check)
   - Create onboarding flow (4 steps)

2. BATCH 2: Admin Suspend/Delete Fix → admin/user-detail.html
   - Add suspendUser() function
   - Add deleteUserSoft() function
   - Add confirmation modals

3. BATCH 3: Admin Herbal Catalog → admin/herbals.html (NEW)
   - List/search/edit/delete herbals
   - Wired to Firestore
```

### PHASE 3 (4-6 hours) — Admin CRUD Features
```
4. BATCH 4: Admin Formula Jamu → admin/formulas.html (NEW)
5. BATCH 5: Admin Consultations → admin/consultations.html (NEW)
6. BATCH 6: Admin Reports/Export → admin/reports.html (NEW)
7. BATCH 7: Admin Settings → admin/settings.html (NEW)
```

### PHASE 4 (6-8 hours) — Advanced Features
```
8. BATCH 8-12: Chat hardening, Gemini integration, stress detection, analytics
```

---

## 📝 NEXT STEPS

**USER DECISION NEEDED:**
1. Which TOHA batches should be implemented? (All 12 or prioritized?)
2. Do you have Firebase Admin SDK credentials for seeding?
3. Timeline preference? (Quick MVP vs. Full implementation)

