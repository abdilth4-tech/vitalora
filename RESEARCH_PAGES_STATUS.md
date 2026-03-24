# 📖 Research-Backed Pages Status

**Purpose**: Each screening in VITALORA is backed by peer-reviewed research. These pages show the scientific foundation.

## ✅ CREATED PAGES (Ready to Deploy)

### 1. **Dyslipidemia Research Page** ✅
- **File**: `www/patient/research-dyslipidemia.html`
- **Status**: Complete
- **Content**:
  - Evidence grade: **B (Moderate)**
  - Papers: **180+** | Citations: **4,500+**
  - State-of-the-art timeline (2015-2025)
  - Key findings: Non-HDL cholesterol sensitivity 85-92%
  - Anthropometric predictors ranked by correlation
  - Lifestyle intervention efficacy (15-20% LDL reduction)
  - PRISMA-2020 compliance checklist
  - Sample 5 papers with citation counts
  - Management recommendations
- **Integration**: Link from `disease-risk.html` → "Penelitian Dyslipidemia"

---

## 📋 PENDING PAGES (To Create - Same Template as Dyslipidemia)

### 2. **Hypertension Research Page** ⏳
- **File**: `www/patient/research-hypertension.html`
- **Status**: Pending
- **Key Data**:
  - Evidence grade: **A (High)** — Multiple RCTs, N>1000, consistent results
  - Papers: **60+** | Citations: **2,000+**
  - Highlights:
    - May Measurement Month campaign: 216-269 citations
    - HOME BP trial: 189 citations (BMJ 2021, high-impact)
    - BP reduction: 6-12 mmHg over 12 months
    - Risk factors: Salt intake, obesity, family history
  - Timeline: 2015-2025 (May Measurement Month evolution)

### 3. **NAFLD Research Page** ⏳
- **File**: `www/patient/research-nafld.html`
- **Status**: Pending
- **Key Data**:
  - Evidence grade: **B (Moderate)**
  - Papers: **60+** | Citations: **2,500+**
  - Highlights:
    - FIB-4 Index: AUROC 0.88 (140+ citations)
    - Risk factors: MetS (40-50% prevalence), T2DM, obesity
    - Screening algorithm: Ultrasound + FIB-4 + clinical
    - Sensitivity 82-91%, Specificity 75-87%

### 4. **Metabolic Syndrome Research Page** ⏳
- **File**: `www/patient/research-metabolic-syndrome.html`
- **Status**: Pending
- **Key Data**:
  - Evidence grade: **A (High)** — Large RCTs, N>5000, long follow-up
  - Papers: **60+** | Citations: **2,500+**
  - Highlights:
    - PREDIMED-Plus: 304 citations, landmark intervention trial
    - IDF criteria: Standard diagnostic framework
    - Weight loss: 7-10 kg | CV event reduction: 25-30%
    - Central obesity is central feature

### 5. **Obesity Research Page** ⏳
- **File**: `www/patient/research-obesity.html`
- **Status**: Pending
- **Key Data**:
  - Evidence grade: **B (Moderate)**
  - Papers: **60+** | Citations: **2,000+**
  - Highlights:
    - BMI diagnostic accuracy: 85-92% (232+ citations)
    - Asian cutoff ≥23 better than global ≥25 (54+ citations)
    - Weight loss programs: 5-15% sustained over 6-12 months
    - Quality of life improvement: 20-40%

---

## 🎯 INTEGRATION POINTS

### Patient Disease Risk Dashboard (`disease-risk.html`)
Each disease card should have:
```html
<a href="research-[disease].html" class="info-link">
  <ion-icon name="beaker-outline"></ion-icon> Lihat Penelitian
</a>
```

**OR** create a dedicated **Research Hub Page**:
```
research-hub.html
├─ Overview: "Semua screening kami backed by 400+ papers"
├─ 5 Disease cards (clickable)
├─ Filter by Evidence Grade (A/B/C)
├─ Search by keyword
└─ Download full SLR report (PDF)
```

---

## 📊 RESEARCH PAGE TEMPLATE (for remaining 3 pages)

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <title>Vitalora — Penelitian: [DISEASE]</title>
  <!-- Same header styling with unique color per disease -->
  <style>
    /* Color scheme:
    - Dyslipidemia: Orange (#F2994A)
    - Hypertension: Red (#EB5757)
    - NAFLD: Blue (#2F80ED)
    - MetS: Purple (#6C63FF)
    - Obesity: Green (#6FCF97)
    */
  </style>
</head>
<body>
  <div class="mobile-frame page-enter">
    <header class="app-header"><!-- COLOR: [disease-specific] --></header>

    <div class="section">
      <!-- 1. Hero Card -->
      <!-- 2. Evidence Grade -->
      <!-- 3. State-of-the-Art Timeline -->
      <!-- 4. Key Findings (Meta-Analysis) -->
      <!-- 5. Screening Tool Specification -->
      <!-- 6. PRISMA Compliance Box -->
      <!-- 7. Sample Papers (5 of N) -->
      <!-- 8. Management Recommendations -->
      <!-- 9. Footer -->
    </div>
  </div>
</body>
</html>
```

---

## 🔗 LINKING STRATEGY

### Option 1: Add to existing pages
- `disease-risk.html` → add "📚 Penelitian" button per disease
- `health-profile.html` → add link in kidney-info style per screening

### Option 2: Create Research Hub
- NEW: `research-hub.html` (centralized)
  - Overview of all 5 diseases
  - Links to individual research pages
  - Download SLR PDF report

### Option 3: Embed in screening flow
- Show research badge in screening intro step
- "Screening ini didukung oleh 180+ papers PRISMA-SLR"
- Link to research page from Step 1

---

## 🚀 DEPLOYMENT ROADMAP

**Phase 1 (THIS WEEK):**
- [x] Create Dyslipidemia research page (done)
- [ ] Create Hypertension research page (30 min)
- [ ] Create NAFLD research page (30 min)
- [ ] Create MetS research page (30 min)
- [ ] Create Obesity research page (30 min)
- [ ] Test all links & styling
- [ ] Deploy & get user review

**Phase 2 (NEXT WEEK):**
- [ ] SLR Phase 2: Collect papers for remaining 10 diseases
- [ ] Create research pages for Thyroid, PCOS, OSA, Gout, etc.
- [ ] Finalize screening questionnaire designs (Batches 17-22)

**Phase 3 (WEEK 3):**
- [ ] Implement screening features with research badges
- [ ] Deploy to patient dashboard

---

## 📋 RESEARCH PAGE CHECKLIST (per page)

**Content Requirements:**
- [x] Evidence Grade (A-D with justification)
- [x] Paper count & total citations
- [x] State-of-the-art timeline (2015-2026)
- [x] Key findings from meta-analysis
- [x] Screening tool specification
- [x] PRISMA-2020 compliance checklist
- [x] Sample 5 papers with metadata
- [x] Management recommendations
- [x] Color-coded styling per disease

**Design Requirements:**
- [x] Neumorphic cards matching design system
- [x] Mobile-responsive layout
- [x] Scroll animations (data-animate)
- [x] Color hierarchy (primary color per disease)
- [x] Back button linking to disease-risk.html

---

## 📚 REFERENCE DOCUMENTS

Related files:
- `SLR_METHODOLOGY_FRAMEWORK.md` — Full methodology
- `SCREENING_PRIORITY_BY_PREVALENCE.md` — Disease ranking
- `METABOLIC_SCREENING_DISEASES.md` — Disease details
- `MASTER_IMPLEMENTATION_PLAN.md` — Feature batches

---

**Status Update**: 1 of 5 research pages complete. On track to finish all 5 by end of week.

