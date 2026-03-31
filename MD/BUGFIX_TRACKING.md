# 🐛 VITALORA BUG FIXES — Priority List

**Date:** 2026-03-24
**Status:** Identified & Ready to Fix

---

## Issue 1: 🔴 Checkboxes Don't Toggle (Health Profile Step 3)

**Reported:** "pada bagian ini saya berusaha checlist semua namun tidak bisa"
(User can't check the condition boxes)

**Location:** `patient/health-profile.html` — Step 3 "Kondisi Diketahui"
(Lines 377-415)

**Root Cause Analysis:**
- Checkboxes are there (HTML structure correct)
- Saving mechanism is there (JavaScript lines 756-765)
- Problem: Visual feedback may not work due to opacity: 0 on input
- Alternative: Click handler might not be registering

**Components Affected:**
- `condHypertension` (Hipertensi)
- `condDiabetes` (Diabetes)
- `condHighChol` (Kolesterol Tinggi)
- `condHeartAttack` (Pernah Serangan Jantung)
- `condOnBPMeds` (Sedang Minum Obat Darah Tinggi)

**Fix Strategy:**
Add explicit click handlers + improve visual feedback + ensure checkboxes are actually clickable

---

## Issue 2: 🔴 Vital Sign Cards Show Static Graphics (Health Dashboard)

**Reported:** "ini belum ada ubah supaya di balik nya grafiknya bisa gerak2 sesuai dengan data yang ada"
(Graphics should move/animate based on actual data instead of being static decorations)

**Location:** Multiple:
- `patient/home.html` — Vital signs section
- `patient/monitoring.html` — Real-time vitals
- `patient/health-dashboard.html` — Risk cards with sparklines

**Root Cause Analysis:**
- Sparklines are generated but might not update with live data
- Charts are placeholders (SVG or placeholder text)
- Data from VitalsManager/Firestore not connected to graphics

**Example Issues:**
- HR graph shows fixed pattern, not patient's actual data
- SpO2 card shows "98.6" but graph doesn't reflect variations
- Temperature arc doesn't animate with real readings

**Fix Strategy:**
1. Connect VitalsManager real-time data to charts
2. Make sparklines dynamic
3. Add smooth animations when values change
4. Update at 5-10 second intervals (or based on new readings)

---

## Issue 3: 🟠 Monitoring Page Graphics Not Dynamic

**Similar to Issue 2** — All chart/graph areas need to be connected to live data

---

## Priority Fixes Order

1. ✅ **Issue 1 (Checkbox Toggle)** — 30 mins
   - Fix: Add proper event listeners
   - Test: Check that values save to Firestore

2. ✅ **Issue 2 (Dynamic Vital Charts)** — 1.5-2 hours
   - Fix: Connect VitalsManager to chart rendering
   - Update: Sparklines, arc charts, gauge charts
   - Test: Verify animations work with simulated data

3. ✅ **Issue 3 (Monitoring Page Graphics)** — 1-1.5 hours
   - Fix: Same as Issue 2 but for monitoring.html

---

## Testing Checklist

After fixes:
- [ ] Click checkbox → visual toggle happens instantly
- [ ] Toggle off → unchecks
- [ ] Navigate away + back → state persists (loaded from Firebase)
- [ ] Vital sign value changes → sparkline updates smoothly
- [ ] New data arrives → chart animates
- [ ] All graphics responsive on mobile

---

**Next:** Implement fixes one by one starting with Issue 1
