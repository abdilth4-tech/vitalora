/**
 * risk-engine.js — Vitalora Health Risk Scoring Engine
 * ======================================================
 * Batch 2.A — Rule-based v1.0 (6 model risiko)
 *
 * Scoring berbasis evidence-based medicine:
 *  - Metabolic Syndrome: IDF criteria (2006) + NCEP ATP III
 *  - Diabetes: FINDRISC scale (Lindström & Tuomilehto 2003) + ADA risk factors
 *  - Heart Disease: Framingham Risk Score simplified (D'Agostino et al. 2008)
 *  - Hypertension: WHO/ISH risk factors + JNC-8 guideline
 *  - Stroke: ASCVD + stroke-specific risk factors
 *  - Sleep Quality: Pittsburg Sleep Quality Index adapted
 *
 * Upgrade path: Batch 5 → TF.js inference dengan fallback ke rule-based ini
 *
 * Usage:
 *   const scores = RiskEngine.calculateAll(healthProfile);
 *   // scores.diabetes → { score: 42, category: 'medium', factors: [...] }
 */

window.RiskEngine = (() => {

  // ─── Constants ─────────────────────────────────────────────────────────────

  const RISK_CATEGORY = (score) => {
    if (score < 30) return 'low';
    if (score < 60) return 'medium';
    return 'high';
  };

  const RISK_LABEL_ID = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' };
  const RISK_COLOR    = { low: '#27AE60', medium: '#F2994A', high: '#EB5757' };

  // Mapping risiko → kondisi herbal untuk query ke Firestore
  const RISK_TO_CONDITION_MAP = {
    metabolic:    ['Sindrom Metabolik', 'Obesitas', 'Asam Urat', 'Kolesterol'],
    diabetes:     ['Diabetes Melitus', 'Gula Darah Tinggi', 'Prediabetes'],
    heart:        ['Jantung Koroner', 'Kolesterol', 'Hipertensi'],
    hypertension: ['Hipertensi', 'Tekanan Darah Tinggi'],
    stroke:       ['Stroke', 'Hipertensi', 'Kolesterol'],
    sleep:        ['Insomnia', 'Gangguan Tidur', 'Stres'],
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function getAge(profile) {
    if (!profile.dateOfBirth) return null;
    const dob = new Date(profile.dateOfBirth);
    const now = new Date();
    return Math.floor((now - dob) / (365.25 * 24 * 3600 * 1000));
  }

  function getBMI(profile) {
    if (profile.bmi) return profile.bmi;
    if (profile.weightKg && profile.heightCm) {
      const h = profile.heightCm / 100;
      return profile.weightKg / (h * h);
    }
    return null;
  }

  function labVal(profile, key) {
    return profile.labResults?.[key] ?? null;
  }

  function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

  // ─── 1. METABOLIC SYNDROME SCORE ───────────────────────────────────────────
  // Berbasis IDF (2006) + NCEP ATP III criteria
  function metabolicScore(profile) {
    const factors = [];
    let score = 0;

    const bmi   = getBMI(profile);
    const waist = profile.waistCircumferenceCm;
    const age   = getAge(profile);
    const hdl   = labVal(profile, 'hdl');
    const tg    = labVal(profile, 'triglycerides');
    const sbp   = labVal(profile, 'sbp');
    const dbp   = labVal(profile, 'dbp');
    const glu   = labVal(profile, 'fastingGlucose');
    const chol  = labVal(profile, 'totalCholesterol');
    const ua    = labVal(profile, 'uricAcid');
    const isMale = profile.gender !== 'female';

    // BMI
    if (bmi !== null) {
      if (bmi >= 30)       { score += 25; factors.push('Obesitas (BMI ' + bmi.toFixed(1) + ')'); }
      else if (bmi >= 25)  { score += 15; factors.push('Kelebihan berat badan (BMI ' + bmi.toFixed(1) + ')'); }
    }

    // Lingkar pinggang (IDF cutoff Asia: Pria ≥90cm, Wanita ≥80cm)
    if (waist) {
      const cutoff = isMale ? 90 : 80;
      if (waist >= cutoff + 15) { score += 20; factors.push('Lingkar pinggang sangat tinggi (' + waist + ' cm)'); }
      else if (waist >= cutoff) { score += 12; factors.push('Lingkar pinggang di atas batas (' + waist + ' cm)'); }
    }

    // Trigliserida ≥150 mg/dL
    if (tg !== null) {
      if (tg >= 200)      { score += 15; factors.push('Trigliserida sangat tinggi (' + tg + ' mg/dL)'); }
      else if (tg >= 150) { score += 8;  factors.push('Trigliserida borderline (' + tg + ' mg/dL)'); }
    }

    // HDL rendah (Pria <40, Wanita <50)
    if (hdl !== null) {
      const hdlCut = isMale ? 40 : 50;
      if (hdl < hdlCut) { score += 10; factors.push('HDL rendah (' + hdl + ' mg/dL)'); }
    }

    // Tekanan darah
    if (sbp !== null && dbp !== null) {
      if (sbp >= 140 || dbp >= 90) { score += 10; factors.push('Tekanan darah tinggi (' + sbp + '/' + dbp + ' mmHg)'); }
    }

    // Gula darah puasa ≥100
    if (glu !== null) {
      if (glu >= 126)     { score += 10; factors.push('Gula darah puasa tinggi (' + glu + ' mg/dL)'); }
      else if (glu >= 100){ score += 5;  factors.push('Gula darah puasa borderline (' + glu + ' mg/dL)'); }
    }

    // Asam urat (Pria >7, Wanita >6)
    if (ua !== null) {
      const uaCut = isMale ? 7 : 6;
      if (ua > uaCut) { score += 8; factors.push('Asam urat tinggi (' + ua + ' mg/dL)'); }
    }

    // Gaya hidup
    if (profile.sugarIntake === 'high')   { score += 8; factors.push('Konsumsi gula tinggi'); }
    if (profile.saltIntake === 'high')    { score += 5; factors.push('Konsumsi garam tinggi'); }
    if (profile.exerciseFreqPerWeek <= 1) { score += 8; factors.push('Kurang aktif (olahraga ' + (profile.exerciseFreqPerWeek ?? '?') + 'x/minggu)'); }
    if (profile.smokingStatus === 'active'){ score += 5; factors.push('Perokok aktif'); }

    // Kondisi diketahui
    if (profile.knownConditions?.highCholesterol) { score += 10; factors.push('Kolesterol tinggi terdiagnosis'); }

    // Usia
    if (age !== null && age >= 45) { score += 5; factors.push('Usia ≥45 tahun'); }

    if (factors.length === 0) factors.push('Tidak ada faktor risiko signifikan yang terdeteksi');
    return { score: clamp(score, 0, 100), category: RISK_CATEGORY(score), factors };
  }

  // ─── 2. DIABETES SCORE ─────────────────────────────────────────────────────
  // Berbasis FINDRISC + ADA 2024 risk factors
  function diabetesScore(profile) {
    const factors = [];
    let score = 0;

    const age   = getAge(profile);
    const bmi   = getBMI(profile);
    const hba1c = labVal(profile, 'hbA1c');
    const glu   = labVal(profile, 'fastingGlucose');

    // Usia (FINDRISC: skor meningkat drastis >45)
    if (age !== null) {
      if      (age >= 65) { score += 13; factors.push('Usia ≥65 tahun (risiko tinggi DM)'); }
      else if (age >= 55) { score += 10; }
      else if (age >= 45) { score += 7;  factors.push('Usia 45–64 tahun'); }
      else if (age >= 35) { score += 3; }
    }

    // BMI (FINDRISC scoring)
    if (bmi !== null) {
      if      (bmi >= 35)  { score += 20; factors.push('Obesitas tingkat II (BMI ' + bmi.toFixed(1) + ')'); }
      else if (bmi >= 30)  { score += 15; factors.push('Obesitas (BMI ' + bmi.toFixed(1) + ')'); }
      else if (bmi >= 25)  { score += 8;  factors.push('Kelebihan berat badan (BMI ' + bmi.toFixed(1) + ')'); }
    }

    // Gula darah lab
    if (glu !== null) {
      if      (glu >= 126) { score += 30; factors.push('Gula darah puasa tinggi — kemungkinan DM (' + glu + ' mg/dL)'); }
      else if (glu >= 100) { score += 15; factors.push('Gula darah puasa borderline — prediabetes (' + glu + ' mg/dL)'); }
    }
    if (hba1c !== null) {
      if      (hba1c >= 6.5) { score += 30; factors.push('HbA1c ≥6.5% — kriteria DM'); }
      else if (hba1c >= 5.7) { score += 15; factors.push('HbA1c 5.7–6.4% — prediabetes'); }
    }

    // Riwayat keluarga
    if (profile.familyHistory?.diabetes) { score += 13; factors.push('Riwayat keluarga DM'); }

    // Olahraga & gaya hidup
    if (profile.exerciseFreqPerWeek <= 1)  { score += 7;  factors.push('Kurang aktivitas fisik'); }
    if (profile.sugarIntake === 'high')    { score += 10; factors.push('Konsumsi gula tinggi'); }

    // Kondisi diketahui
    if (profile.knownConditions?.diabetes)       { score = Math.max(score, 80); factors.push('Diabetes sudah terdiagnosis'); }
    if (profile.knownConditions?.highCholesterol){ score += 5; }

    // Tekanan darah
    const sbp = labVal(profile, 'sbp');
    if (sbp !== null && sbp >= 140) { score += 5; factors.push('Hipertensi (faktor risiko DM)'); }

    if (factors.length === 0) factors.push('Tidak ada faktor risiko signifikan yang terdeteksi');
    return { score: clamp(score, 0, 100), category: RISK_CATEGORY(score), factors };
  }

  // ─── 3. HEART DISEASE SCORE ────────────────────────────────────────────────
  // Berbasis Framingham Risk Score simplified + ESC guidelines
  function heartScore(profile) {
    const factors = [];
    let score = 0;

    const age   = getAge(profile);
    const bmi   = getBMI(profile);
    const chol  = labVal(profile, 'totalCholesterol');
    const ldl   = labVal(profile, 'ldl');
    const hdl   = labVal(profile, 'hdl');
    const sbp   = labVal(profile, 'sbp');
    const isMale = profile.gender !== 'female';

    // Usia (Framingham: tiap 5 tahun di atas 35)
    if (age !== null) {
      if      (age >= 65) { score += 20; factors.push('Usia ≥65 tahun'); }
      else if (age >= 55) { score += 12; factors.push('Usia 55–64 tahun'); }
      else if (age >= 45) { score += 6;  }
      else if (age >= 35) { score += 2;  }
    }

    // Jenis kelamin (pria berisiko lebih tinggi)
    if (isMale) { score += 5; }

    // Kolesterol
    if (ldl !== null) {
      if      (ldl >= 190) { score += 20; factors.push('LDL sangat tinggi (' + ldl + ' mg/dL)'); }
      else if (ldl >= 160) { score += 12; factors.push('LDL tinggi (' + ldl + ' mg/dL)'); }
      else if (ldl >= 130) { score += 5;  factors.push('LDL borderline (' + ldl + ' mg/dL)'); }
    } else if (chol !== null) {
      if      (chol >= 240) { score += 15; factors.push('Kolesterol total tinggi (' + chol + ' mg/dL)'); }
      else if (chol >= 200) { score += 7;  factors.push('Kolesterol total borderline (' + chol + ' mg/dL)'); }
    }

    // HDL rendah (protektif jika tinggi)
    if (hdl !== null) {
      if      (hdl < 40)  { score += 12; factors.push('HDL sangat rendah (' + hdl + ' mg/dL)'); }
      else if (hdl >= 60) { score -= 5;  } // protektif
    }

    // Tekanan darah sistolik
    if (sbp !== null) {
      if      (sbp >= 160) { score += 15; factors.push('Hipertensi stage 2 (SBP ' + sbp + ' mmHg)'); }
      else if (sbp >= 140) { score += 8;  factors.push('Hipertensi stage 1 (SBP ' + sbp + ' mmHg)'); }
      else if (sbp >= 120) { score += 3;  }
    }

    // Merokok (Framingham: major risk)
    if (profile.smokingStatus === 'active')  { score += 15; factors.push('Perokok aktif'); }
    else if (profile.smokingStatus === 'former') { score += 5; }

    // Diabetes (multiplier risiko jantung 2-4x)
    if (profile.knownConditions?.diabetes)    { score += 12; factors.push('Diabetes (faktor risiko kardiovaskular mayor)'); }
    if (profile.knownConditions?.heartAttack) { score = Math.max(score, 75); factors.push('Riwayat serangan jantung'); }
    if (profile.knownConditions?.onBPMeds)    { score += 5;  factors.push('Sedang konsumsi obat antihipertensi'); }

    // Riwayat keluarga
    if (profile.familyHistory?.heart)         { score += 12; factors.push('Riwayat keluarga penyakit jantung'); }

    // BMI tinggi
    if (bmi !== null && bmi >= 30)            { score += 8;  factors.push('Obesitas'); }

    // Olahraga
    if (profile.exerciseFreqPerWeek <= 1)     { score += 8;  factors.push('Kurang aktivitas fisik'); }
    if (profile.alcoholUse === 'frequent')    { score += 7;  factors.push('Konsumsi alkohol sering'); }

    if (factors.length === 0) factors.push('Tidak ada faktor risiko signifikan yang terdeteksi');
    return { score: clamp(score, 0, 100), category: RISK_CATEGORY(score), factors };
  }

  // ─── 4. HYPERTENSION SCORE ─────────────────────────────────────────────────
  // Berbasis JNC-8 + WHO/ISH risk chart
  function hypertensionScore(profile) {
    const factors = [];
    let score = 0;

    const age   = getAge(profile);
    const bmi   = getBMI(profile);
    const sbp   = labVal(profile, 'sbp');
    const dbp   = labVal(profile, 'dbp');

    // Kondisi diketahui
    if (profile.knownConditions?.hypertension || profile.knownConditions?.onBPMeds) {
      score = Math.max(score, 70);
      factors.push('Hipertensi sudah terdiagnosis');
    }

    // Tekanan darah lab
    if (sbp !== null && dbp !== null) {
      if      (sbp >= 180 || dbp >= 110) { score += 50; factors.push('Krisis hipertensi (' + sbp + '/' + dbp + ')'); }
      else if (sbp >= 160 || dbp >= 100) { score += 35; factors.push('Hipertensi stage 2 (' + sbp + '/' + dbp + ')'); }
      else if (sbp >= 140 || dbp >= 90)  { score += 25; factors.push('Hipertensi stage 1 (' + sbp + '/' + dbp + ')'); }
      else if (sbp >= 130 || dbp >= 80)  { score += 12; factors.push('Prehipertensi (' + sbp + '/' + dbp + ')'); }
    }

    // Gaya hidup
    if (profile.saltIntake === 'high')        { score += 15; factors.push('Konsumsi garam/asin tinggi'); }
    else if (profile.saltIntake === 'moderate'){ score += 5; }
    if (profile.smokingStatus === 'active')   { score += 10; factors.push('Perokok aktif'); }
    if (profile.alcoholUse === 'frequent')    { score += 8;  factors.push('Konsumsi alkohol sering'); }
    if (profile.exerciseFreqPerWeek <= 1)     { score += 8;  factors.push('Kurang aktivitas fisik'); }
    if (profile.sleepHoursPerNight < 6)       { score += 5;  factors.push('Tidur kurang dari 6 jam'); }

    // BMI
    if (bmi !== null) {
      if      (bmi >= 30) { score += 12; factors.push('Obesitas (tekanan pada pembuluh darah)'); }
      else if (bmi >= 25) { score += 6; }
    }

    // Usia
    if (age !== null) {
      if      (age >= 65) { score += 12; factors.push('Usia ≥65 tahun'); }
      else if (age >= 50) { score += 6; }
    }

    // Stress (indirectly via sleep quality)
    if (profile.sleepQuality !== null && profile.sleepQuality <= 4) {
      score += 8; factors.push('Kualitas tidur buruk (indikator stres)');
    }

    // Riwayat keluarga
    if (profile.familyHistory?.hypertension) { score += 10; factors.push('Riwayat keluarga hipertensi'); }

    if (factors.length === 0) factors.push('Tidak ada faktor risiko signifikan yang terdeteksi');
    return { score: clamp(score, 0, 100), category: RISK_CATEGORY(score), factors };
  }

  // ─── 5. STROKE SCORE ───────────────────────────────────────────────────────
  // Berbasis ASCVD risk framework + stroke-specific factors
  function strokeScore(profile) {
    const factors = [];
    let score = 0;

    const age   = getAge(profile);
    const bmi   = getBMI(profile);
    const sbp   = labVal(profile, 'sbp');
    const chol  = labVal(profile, 'totalCholesterol');
    const isMale = profile.gender !== 'female';

    // Usia (major stroke risk factor)
    if (age !== null) {
      if      (age >= 75) { score += 25; factors.push('Usia ≥75 tahun (risiko stroke sangat tinggi)'); }
      else if (age >= 65) { score += 15; factors.push('Usia ≥65 tahun'); }
      else if (age >= 55) { score += 7;  }
    }

    // Hipertensi (faktor risiko nomor 1 stroke)
    if (profile.knownConditions?.hypertension || profile.knownConditions?.onBPMeds) {
      score += 20; factors.push('Hipertensi (faktor risiko stroke #1)');
    } else if (sbp !== null) {
      if      (sbp >= 160) { score += 18; factors.push('Tekanan darah sangat tinggi (' + sbp + ' mmHg)'); }
      else if (sbp >= 140) { score += 10; factors.push('Tekanan darah tinggi (' + sbp + ' mmHg)'); }
    }

    // Merokok
    if (profile.smokingStatus === 'active') { score += 12; factors.push('Perokok aktif (risiko stroke 2x lipat)'); }

    // Diabetes
    if (profile.knownConditions?.diabetes) { score += 10; factors.push('Diabetes mellitus'); }

    // Penyakit jantung
    if (profile.knownConditions?.heartAttack) { score += 15; factors.push('Riwayat serangan jantung (risiko emboli)'); }
    if (profile.familyHistory?.stroke)        { score += 15; factors.push('Riwayat keluarga stroke'); }
    if (profile.familyHistory?.heart)         { score += 5;  }

    // Kolesterol
    if (chol !== null && chol >= 240) { score += 8; factors.push('Kolesterol tinggi (' + chol + ' mg/dL)'); }

    // BMI & gaya hidup
    if (bmi !== null && bmi >= 30)       { score += 6; factors.push('Obesitas'); }
    if (profile.alcoholUse === 'frequent'){ score += 8; factors.push('Konsumsi alkohol sering'); }
    if (profile.exerciseFreqPerWeek <= 1) { score += 5; }

    if (factors.length === 0) factors.push('Tidak ada faktor risiko signifikan yang terdeteksi');
    return { score: clamp(score, 0, 100), category: RISK_CATEGORY(score), factors };
  }

  // ─── 6. SLEEP QUALITY SCORE ────────────────────────────────────────────────
  // Berbasis PSQI (Pittsburgh Sleep Quality Index) adapted
  function sleepScore(profile) {
    const factors = [];
    let score = 0;

    const sleepHours   = profile.sleepHoursPerNight;
    const sleepQuality = profile.sleepQuality; // 1–10 self-report
    const bmi          = getBMI(profile);
    const age          = getAge(profile);

    // Durasi tidur (optimal 7-9 jam)
    if (sleepHours !== null && sleepHours !== undefined) {
      if      (sleepHours < 5)  { score += 35; factors.push('Tidur sangat kurang (' + sleepHours + ' jam)'); }
      else if (sleepHours < 6)  { score += 20; factors.push('Tidur kurang (' + sleepHours + ' jam/malam)'); }
      else if (sleepHours > 10) { score += 15; factors.push('Tidur berlebihan (' + sleepHours + ' jam) — tanda masalah kesehatan'); }
      else if (sleepHours < 7)  { score += 8;  }
    }

    // Kualitas tidur subjektif (skala 1–10, inversed)
    if (sleepQuality !== null && sleepQuality !== undefined) {
      if      (sleepQuality <= 3) { score += 30; factors.push('Kualitas tidur sangat buruk (' + sleepQuality + '/10)'); }
      else if (sleepQuality <= 5) { score += 15; factors.push('Kualitas tidur kurang (' + sleepQuality + '/10)'); }
      else if (sleepQuality >= 9) { score -= 5; }
    }

    // Merokok (gangguan kualitas tidur)
    if (profile.smokingStatus === 'active') { score += 8; factors.push('Merokok (nikotin ganggu siklus tidur)'); }

    // Alkohol (merusak tidur REM)
    if (profile.alcoholUse === 'frequent')   { score += 10; factors.push('Alkohol sering (merusak tidur REM)'); }

    // Stres (via job type & stress indicators)
    if (profile.jobType === 'sedentary' && sleepHours < 7) {
      score += 5; factors.push('Pekerjaan duduk + tidur kurang');
    }

    // BMI tinggi → sleep apnea risk
    if (bmi !== null && bmi >= 30) { score += 10; factors.push('Obesitas (risiko sleep apnea)'); }

    if (factors.length === 0) factors.push('Kualitas tidur tampak baik berdasarkan data yang tersedia');
    return { score: clamp(score, 0, 100), category: RISK_CATEGORY(score), factors };
  }

  // ─── calculateAll ──────────────────────────────────────────────────────────
  function calculateAll(profile) {
    if (!profile) return null;

    // Rule-based scores always computed (provides factors[])
    const rb = {
      metabolic:    metabolicScore(profile),
      diabetes:     diabetesScore(profile),
      heart:        heartScore(profile),
      hypertension: hypertensionScore(profile),
      stroke:       strokeScore(profile),
      sleep:        sleepScore(profile),
    };

    // If ML models loaded: blend ML score (60%) + rule-based (40%)
    if (_modelsLoaded) {
      ['metabolic','diabetes','heart','hypertension','stroke','sleep'].forEach(key => {
        const mlScore = _mlInfer(key, profile);
        if (mlScore !== null) {
          const blended = Math.round(0.6 * mlScore + 0.4 * rb[key].score);
          const clamped = clamp(blended, 0, 100);
          rb[key] = {
            ...rb[key],
            score:    clamped,
            category: RISK_CATEGORY(clamped),
            mlScore,
          };
        }
      });
    }

    return {
      ...rb,
      calculatedWith: _modelsLoaded ? 'ml-hybrid-v2.0' : 'rule-based-v1.0',
      profileCompleteness: profile.profileCompleteness || null,
    };
  }

  // ─── getTopConditions ──────────────────────────────────────────────────────
  // Returns top condition strings for herbal query
  function getTopConditions(scores, topN = 3) {
    if (!scores) return [];
    const models = ['metabolic','diabetes','heart','hypertension','stroke','sleep'];
    const sorted = models
      .filter(m => scores[m])
      .sort((a, b) => scores[b].score - scores[a].score);
    const conditions = new Set();
    for (const m of sorted) {
      for (const cond of (RISK_TO_CONDITION_MAP[m] || [])) {
        conditions.add(cond);
        if (conditions.size >= topN * 2) break;
      }
      if (conditions.size >= topN * 2) break;
    }
    return [...conditions].slice(0, topN);
  }

  // ─── ML Model Cache ────────────────────────────────────────────────────────
  const _models = {};           // { metabolic: { model, meta }, ... }
  let   _modelsLoaded = false;

  // Feature direction: +1 = higher value raises risk, -1 = higher value lowers risk
  const _DIR = {
    age: 1, Age: 1, bmi: 1, BMI: 1, bmi_num: 1,
    waist: 1, WaistCirc: 1,
    stress: 1, salt: 1, sugar: 1,
    smoking: 1, alcohol: 1,
    glucose: 1, BloodGlucose: 1, hba1c: 1,
    bp: 1, bp_sys: 1, bp_hist: 1,
    Triglycerides: 1, trig: 1, chol: 1, UricAcid: 1,
    fam: 1, fam_heart: 1, hypert: 1, heart_dis: 1,
    gender: 1, heart_rate: 1,
    HDL: -1, sleep: -1, sleep_dur: -1, quality: -1,
    exercise: -1, activity: -1, steps: -1,
    married: -1, work: -1, residence: 0,
  };

  // Extract raw feature vector from health profile for a given model
  function _extractFeatures(modelName, profile, meta) {
    const age      = getAge(profile) || 45;
    const bmi      = getBMI(profile) || 25;
    const isMale   = profile.gender !== 'female';
    const stress   = profile.stressLevel
      ?? (profile.qualityOfSleep != null ? Math.max(1, 10 - profile.qualityOfSleep) : 5);
    const sleep    = profile.sleepHoursPerNight || 7;
    const exercise = profile.exerciseFreqPerWeek ?? 3;
    const smoking  = ({ never: 0, former: 1, active: 2 }[profile.smokingStatus] ?? 0);
    const alcohol  = ({ none: 0, light: 0, moderate: 1, heavy: 2 }[profile.alcoholConsumption] ?? 0);
    const sugar    = ({ low: 0, moderate: 1, high: 2 }[profile.sugarIntake] ?? 1);
    const salt     = ({ low: 0, moderate: 1, high: 2 }[profile.saltIntake] ?? 1);
    const fh  = profile.familyHistory    || {};
    const kc  = profile.knownConditions  || {};
    const lab = profile.labResults       || {};
    const waist = profile.waistCircumferenceCm || (isMale ? 90 : 82);

    const perModel = {
      diabetes: {
        age, bmi, waist, sleep, stress,
        fam: fh.diabetes ? 1 : 0, sugar, exercise,
        hba1c: lab.hba1c, glucose: lab.fastingGlucose,
      },
      metabolic: {
        Age: age, BMI: bmi, WaistCirc: waist,
        BloodGlucose: lab.fastingGlucose, HDL: lab.hdl,
        Triglycerides: lab.triglycerides, UricAcid: lab.uricAcid,
      },
      heart: {
        age, bmi, bp: lab.sbp, chol: lab.totalCholesterol,
        trig: lab.triglycerides, sleep, smoking, alcohol,
        exercise, stress, fam_heart: fh.heart ? 1 : 0,
        sugar, gender: isMale ? 1 : 0,
      },
      hypertension: {
        age, bmi, salt, stress, sleep,
        fam: fh.hypertension ? 1 : 0,
        smoking, exercise, bp_hist: kc.hypertensionDiagnosed ? 1 : 0,
      },
      stroke: {
        age, bmi, glucose: lab.fastingGlucose,
        hypert: kc.hypertensionDiagnosed ? 1 : 0,
        heart_dis: kc.heartAttack ? 1 : 0,
        married: 1, work: 1, smoking,
        gender: isMale ? 1 : 0, residence: 1,
      },
      sleep: {
        age, sleep_dur: sleep, quality: profile.qualityOfSleep || 6,
        activity: exercise, stress,
        heart_rate: lab.heartRate || 75,
        steps: 5000, bp_sys: lab.sbp, bmi_num: bmi,
        gender: isMale ? 1 : 0,
      },
    };

    const fm = perModel[modelName] || {};
    return meta.featureNames.map((name, i) => {
      const v = fm[name];
      return (v !== null && v !== undefined) ? v : meta.scalerMean[i];
    });
  }

  // Proxy inference: weighted-directional z-scores → sigmoid → 0-100
  function _mlInfer(modelName, profile) {
    const m = _models[modelName];
    if (!m) return null;
    const { model, meta } = m;
    const importances  = model.weights.feature_importances;
    const rawFeatures  = _extractFeatures(modelName, profile, meta);

    let ws = 0;
    meta.featureNames.forEach((name, i) => {
      const z   = (rawFeatures[i] - meta.scalerMean[i]) / (meta.scalerStd[i] || 1);
      const dir = (_DIR[name] !== undefined ? _DIR[name] : 1);
      ws += z * importances[i] * dir;
    });
    const prob = 1 / (1 + Math.exp(-3.0 * ws));
    return Math.round(clamp(prob * 100, 0, 100));
  }

  // ─── loadModels — loads vitalora_ml_v1 JSON from /models/ ──────────────────
  async function loadModels() {
    const names    = ['metabolic', 'diabetes', 'heart', 'hypertension', 'stroke', 'sleep'];
    const basePath = (typeof window !== 'undefined' && window.VITALORA_MODELS_PATH)
      ? window.VITALORA_MODELS_PATH
      : '/models';

    let loaded = 0;
    await Promise.allSettled(names.map(async name => {
      try {
        const [model, meta] = await Promise.all([
          fetch(`${basePath}/${name}/model.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
          fetch(`${basePath}/${name}/metadata.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
        ]);
        if (model.format !== 'vitalora_ml_v1') throw new Error('unknown format');
        _models[name] = { model, meta };
        loaded++;
      } catch (e) {
        console.warn(`[RiskEngine] Model "${name}" not loaded:`, e.message);
      }
    }));

    _modelsLoaded = loaded > 0;
    const version = loaded === names.length ? '2.0-ml' : loaded > 0 ? '1.5-hybrid' : '1.0-rule';
    console.info(`[RiskEngine] loadModels: ${loaded}/${names.length} — mode: ${version}`);
    return { mode: loaded > 0 ? 'ml-proxy' : 'rule-based', loaded, total: names.length, version };
  }

  // ─── Personalization Adjustments ──────────────────────────────────────────
  // Calculates risk multiplier based on mental health, diet quality, and SDOH
  function getPersonalizationMultiplier(profile) {
    let multiplier = 1.0;
    let adjustments = [];

    // Mental Health Adjustments (±20%)
    const mh = profile.mentalHealth || {};
    if (mh.anxietyLevel === 'severe' || mh.depressionLevel === 'severe') {
      multiplier *= 1.20;
      adjustments.push('Stres mental tinggi (+20%)');
    } else if (mh.anxietyLevel === 'moderate' || mh.depressionLevel === 'moderate') {
      multiplier *= 1.10;
      adjustments.push('Stres mental sedang (+10%)');
    }
    const workStress = mh.workStressLevel || 5;
    if (workStress >= 8) {
      multiplier *= 1.15;
      adjustments.push('Stress pekerjaan ekstrem (+15%)');
    }

    // Diet Quality Adjustments (±15%)
    const diet = profile.diet || {};
    if (diet.processedFoodIntake === 'high') {
      multiplier *= 1.12;
      adjustments.push('Diet ultra-processed tinggi (+12%)');
    }
    if (diet.redMeatIntake === 'high') {
      multiplier *= 1.08;
      adjustments.push('Daging merah berlebihan (+8%)');
    }
    if (diet.fruitVegIntake === 'high') {
      multiplier *= 0.90;
      adjustments.push('Diet sayur-buah baik (-10%)');
    }

    // Social Determinants Adjustments (±20%)
    const sdoh = profile.socialDeterminants || {};
    if (sdoh.employmentStatus === 'unemployed') {
      multiplier *= 1.18;
      adjustments.push('Pengangguran (+18%)');
    }
    if (sdoh.socialIsolation && sdoh.socialIsolation <= 2) {
      multiplier *= 1.12;
      adjustments.push('Isolasi sosial tinggi (+12%)');
    }
    if (sdoh.healthcareAccess === 'very-difficult' || sdoh.healthcareAccess === 'difficult') {
      multiplier *= 1.10;
      adjustments.push('Akses kesehatan terbatas (+10%)');
    }
    if (sdoh.educationLevel === 'primary') {
      multiplier *= 1.08;
      adjustments.push('Pendidikan rendah (+8%)');
    } else if (sdoh.educationLevel === 'graduate') {
      multiplier *= 0.92;
      adjustments.push('Pendidikan tinggi (-8%)');
    }

    return {
      multiplier: clamp(multiplier, 0.7, 1.5),  // Cap between 70%-150%
      adjustments: adjustments
    };
  }

  // ─── Public API ────────────────────────────────────────────────────────────
  return {
    calculateAll,
    metabolicScore,
    diabetesScore,
    heartScore,
    hypertensionScore,
    strokeScore,
    sleepScore,
    getTopConditions,
    loadModels,
    getPersonalizationMultiplier,
    get modelsLoaded() { return _modelsLoaded; },
    RISK_TO_CONDITION_MAP,
    RISK_CATEGORY,
    RISK_LABEL_ID,
    RISK_COLOR,
  };

})();
