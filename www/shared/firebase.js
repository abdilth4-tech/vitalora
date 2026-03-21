/**
 * firebase.js — Vitalora Firebase Foundation
 * ============================================
 * SETUP: Ganti FIREBASE_CONFIG di bawah dengan config dari Firebase Console:
 *   Firebase Console → Project Settings → Your apps → Web app → firebaseConfig
 *
 * Cara pakai di HTML (sebelum </body>):
 *   <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
 *   <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
 *   <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
 *   <script src="../shared/firebase.js"></script>
 *
 * Setelah itu tersedia global: VAuth, VDB, VFirebase
 */

// ─── FIREBASE CONFIG ───────────────────────────────────────────────────────
// Ganti dengan config dari Firebase Console Anda
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDnL3nDROWm7TdR99aXIcss01XnE7_d32A",
  authDomain: "vitalora.firebaseapp.com",
  projectId: "vitalora",
  storageBucket: "vitalora.firebasestorage.app",
  messagingSenderId: "521936301370",
  appId: "1:521936301370:web:7f9aa1eeaf7caca8163403"
};

// ─── INIT ───────────────────────────────────────────────────────────────────
if (!firebase.apps || !firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}
const _auth = firebase.auth();
const _db   = firebase.firestore();

// ─── EXPOSED INSTANCES ─────────────────────────────────────────────────────
window.VFirebase = { auth: _auth, db: _db };

// ═══════════════════════════════════════════════════════════════════════════
//  VAuth — Authentication helpers
// ═══════════════════════════════════════════════════════════════════════════
window.VAuth = {

  /** Daftar dengan email + password */
  async register(name, email, password, role = 'patient') {
    const cred = await _auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });
    await _db.collection('users').doc(cred.user.uid).set({
      uid: cred.user.uid, name, email, role,
      photoURL: null, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      isActive: true
    });
    if (role === 'patient') {
      await _db.collection('patients').doc(cred.user.uid).set({
        uid: cred.user.uid, dob: null, gender: null, bloodType: null,
        weight: null, height: null, allergies: [], familyHistory: [], assignedDoctors: []
      });
    }
    // Email verification DISABLED - tidak perlu kirim email verifikasi
    // await cred.user.sendEmailVerification({ url: window.location.origin + '/auth/login.html' });
    return cred.user;
  },

  /** Login dengan email + password */
  async login(email, password) {
    const cred = await _auth.signInWithEmailAndPassword(email, password);
    // Email verification disabled - langsung login
    const profile = await VAuth.getProfile(cred.user.uid);
    return { user: cred.user, role: profile?.role || 'patient' };
  },

  /** Login / daftar via Google */
  async loginGoogle(defaultRole = 'patient') {
    const provider = new firebase.auth.GoogleAuthProvider();
    const cred = await _auth.signInWithPopup(provider);
    const exists = await _db.collection('users').doc(cred.user.uid).get();

    if (!exists.exists) {
      // New user - redirect to role selection page
      return { user: cred.user, role: null, isNewUser: true };
    }

    const profile = exists.data();

    // Check role approval status
    if (profile.roleStatus === 'pending') {
      return { user: cred.user, role: profile.role, roleStatus: 'pending' };
    }

    if (profile.roleStatus === 'rejected') {
      return { user: cred.user, role: profile.role, roleStatus: 'rejected' };
    }

    return { user: cred.user, role: profile.role, roleStatus: 'approved' };
  },

  /** Logout */
  async logout() {
    localStorage.removeItem('vitalora_debug_role');
    await _auth.signOut();
    window.location.href = window.location.pathname.includes('/admin/') ||
      window.location.pathname.includes('/doctor/') ||
      window.location.pathname.includes('/patient/') ? '../auth/login.html' : 'auth/login.html';
  },

  /** Reset password via email */
  async resetPassword(email) {
    await _auth.sendPasswordResetEmail(email, {
      url: window.location.origin + '/auth/login.html'
    });
  },

  /** Kirim ulang email verifikasi */
  async resendVerification() {
    const user = _auth.currentUser;
    if (user) await user.sendEmailVerification({ url: window.location.origin + '/auth/login.html' });
  },

  /** Ambil profil user dari Firestore */
  async getProfile(uid) {
    const snap = await _db.collection('users').doc(uid).get();
    return snap.exists ? snap.data() : null;
  },

  /** URL redirect berdasarkan role */
  redirectByRole(role, depth = 1) {
    const prefix = '../'.repeat(depth);
    const map = { patient: 'patient/home.html', doctor: 'doctor/home.html', admin: 'admin/home.html' };
    window.location.href = prefix + (map[role] || 'auth/login.html');
  },

  /** Guard: panggil di setiap halaman app */
  guard(expectedRole = null, depth = 1) {
    // ── DEBUG BYPASS ──────────────────────────────────────────────────────
    const debugRole = localStorage.getItem('vitalora_debug_role');
    if (debugRole) {
      const nameMap = { patient: 'Pasien (Debug)', doctor: 'Dokter (Debug)', admin: 'Admin (Debug)' };
      return new Promise(async (resolve) => {
        // Sign in anonymously so Firestore operations work
        if (!_auth.currentUser) {
          try { await _auth.signInAnonymously(); } catch(e) {
            console.warn('[Debug] Enable Anonymous auth di Firebase Console: Authentication → Sign-in method → Anonymous');
          }
        }
        const uid = _auth.currentUser ? _auth.currentUser.uid : ('debug-uid-' + debugRole);
        // Upsert user doc agar Firestore reads konsisten
        try {
          await _db.collection('users').doc(uid).set(
            { uid, name: nameMap[debugRole], email: debugRole + '@debug.local', role: debugRole, isActive: true },
            { merge: true }
          );
        } catch(e) { /* rules belum aktif, lanjutkan saja */ }
        const mockUser    = { uid, email: debugRole + '@debug.local', emailVerified: true, providerData: [] };
        const mockProfile = { uid, name: nameMap[debugRole], email: mockUser.email, role: debugRole };
        if (!expectedRole || expectedRole === debugRole) {
          resolve({ user: mockUser, profile: mockProfile });
          return;
        }
        VAuth.redirectByRole(debugRole, depth);
      });
    }
    // ─────────────────────────────────────────────────────────────────────
    return new Promise((resolve) => {
      _auth.onAuthStateChanged(async (user) => {
        if (!user) {
          window.location.href = '../'.repeat(depth) + 'auth/login.html';
          return;
        }
        // Email verification DISABLED - semua user bisa langsung akses
        const profile = await VAuth.getProfile(user.uid);
        if (!profile) {
          // New user without profile - redirect to role selection
          window.location.href = '../'.repeat(depth) + 'auth/select-role.html';
          return;
        }

        // Check role approval status
        if (profile.roleStatus === 'pending') {
          window.location.href = '../'.repeat(depth) + 'auth/pending-approval.html';
          return;
        }
        if (profile.roleStatus === 'rejected') {
          window.location.href = '../'.repeat(depth) + 'auth/role-rejected.html';
          return;
        }

        if (expectedRole && profile.role !== expectedRole) {
          VAuth.redirectByRole(profile.role, depth);
          return;
        }
        resolve({ user, profile });
      });
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  VDB — Firestore CRUD helpers
// ═══════════════════════════════════════════════════════════════════════════
window.VDB = {

  // ── Users ─────────────────────────────────────────────────────────────
  async getUser(uid) {
    const s = await _db.collection('users').doc(uid).get();
    return s.exists ? s.data() : null;
  },
  async updateUser(uid, data) {
    await _db.collection('users').doc(uid).update({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  },
  async getAllUsers(role = null) {
    let q = _db.collection('users');
    if (role) q = q.where('role', '==', role);
    const snap = await q.orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => d.data());
  },

  // ── Patient profile ───────────────────────────────────────────────────
  async getPatient(uid) {
    const s = await _db.collection('patients').doc(uid).get();
    return s.exists ? s.data() : null;
  },
  async updatePatient(uid, data) {
    await _db.collection('patients').doc(uid).set(data, { merge: true });
  },

  // ── Vitals ────────────────────────────────────────────────────────────
  async saveVitals(patientId, vitalsData) {
    await _db.collection('vitals').doc(patientId).collection('readings').add({
      ...vitalsData,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      source: vitalsData.source || 'device'
    });
  },
  async getVitalsHistory(patientId, limitDays = 7) {
    const since = new Date();
    since.setDate(since.getDate() - limitDays);
    const snap = await _db.collection('vitals').doc(patientId).collection('readings')
      .where('timestamp', '>=', since)
      .orderBy('timestamp', 'asc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ── Consultations ─────────────────────────────────────────────────────
  async createConsultation(data) {
    const ref = await _db.collection('consultations').add({
      ...data,
      status: 'pending',
      startTime: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  },
  async getConsultation(consultId) {
    const s = await _db.collection('consultations').doc(consultId).get();
    return s.exists ? { id: s.id, ...s.data() } : null;
  },
  async updateConsultation(consultId, data) {
    await _db.collection('consultations').doc(consultId).update(data);
  },
  async getPatientConsultations(patientId) {
    const snap = await _db.collection('consultations')
      .where('patientId', '==', patientId)
      .orderBy('startTime', 'desc')
      .limit(20)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async getDoctorConsultations(doctorId, statusFilter = null) {
    let q = _db.collection('consultations').where('doctorId', '==', doctorId);
    if (statusFilter) q = q.where('status', '==', statusFilter);
    const snap = await q.orderBy('startTime', 'desc').limit(30).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ── Messages (real-time) ──────────────────────────────────────────────
  subscribeMessages(consultId, callback) {
    return _db.collection('messages').doc(consultId).collection('items')
      .orderBy('timestamp', 'asc')
      .onSnapshot(snap => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(msgs);
      });
  },
  async sendMessage(consultId, data) {
    await _db.collection('messages').doc(consultId).collection('items').add({
      ...data,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  // ── Medical Records ───────────────────────────────────────────────────
  async createMedicalRecord(data) {
    const ref = await _db.collection('medicalRecords').add({
      ...data,
      date: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  },
  async getPatientRecords(patientId) {
    const snap = await _db.collection('medicalRecords')
      .where('patientId', '==', patientId)
      .orderBy('date', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ── Notifications ─────────────────────────────────────────────────────
  async sendNotification(uid, { title, body, type = 'info', data = {} }) {
    await _db.collection('notifications').doc(uid).collection('items').add({
      title, body, type, data, read: false,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  },
  async sendNotificationToAll(notifData, role = null) {
    const users = await VDB.getAllUsers(role);
    const batch = _db.batch();
    users.forEach(u => {
      const ref = _db.collection('notifications').doc(u.uid).collection('items').doc();
      batch.set(ref, { ...notifData, read: false, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();
  },
  subscribeNotifications(uid, callback) {
    return _db.collection('notifications').doc(uid).collection('items')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  },
  async markNotificationRead(uid, notifId) {
    await _db.collection('notifications').doc(uid).collection('items').doc(notifId).update({ read: true });
  },
  async getUnreadCount(uid) {
    const snap = await _db.collection('notifications').doc(uid).collection('items')
      .where('read', '==', false).get();
    return snap.size;
  },

  // ── Articles / News ───────────────────────────────────────────────────
  async createArticle(data) {
    const ref = await _db.collection('articles').add({
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: data.status || 'draft'
    });
    return ref.id;
  },
  async updateArticle(articleId, data) {
    await _db.collection('articles').doc(articleId).update({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },
  async getPublishedArticles(category = null) {
    let q = _db.collection('articles').where('status', '==', 'published');
    if (category) q = q.where('category', '==', category);
    const snap = await q.orderBy('publishedAt', 'desc').limit(20).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async getAllArticles() {
    const snap = await _db.collection('articles').orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async deleteArticle(articleId) {
    await _db.collection('articles').doc(articleId).delete();
  },

  // ── Admin stats ───────────────────────────────────────────────────────
  async getStats() {
    const [usersSnap, consultSnap, articlesSnap] = await Promise.all([
      _db.collection('users').get(),
      _db.collection('consultations').where('status', '==', 'completed').get(),
      _db.collection('articles').where('status', '==', 'published').get()
    ]);
    const patients = usersSnap.docs.filter(d => d.data().role === 'patient').length;
    const doctors  = usersSnap.docs.filter(d => d.data().role === 'doctor').length;
    return {
      totalUsers: usersSnap.size, patients, doctors,
      completedConsultations: consultSnap.size,
      publishedArticles: articlesSnap.size
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════
//  VitalsManager — Real-time buffer + 1-minute Firestore upload
// ═══════════════════════════════════════════════════════════════════════════
window.VitalsManager = (() => {
  let _patientId = null;
  let _buffer = {};      // Stores latest reading in memory
  let _subscribers = []; // UI callbacks (called every 1s)
  let _displayInterval = null;
  let _uploadInterval = null;
  let _isStarted = false;

  // Simulate BLE sensor data (replace with Web Bluetooth API for real device)
  function _simulate() {
    _buffer = {
      hr:              72 + Math.round((Math.random() - 0.5) * 16),
      spo2:            96 + Math.round(Math.random() * 3 * 10) / 10,
      temperature:     36.2 + Math.round(Math.random() * 1.2 * 10) / 10,
      gsr:             Math.round((0.3 + Math.random() * 0.4) * 100) / 100,
      steps:           Math.round(Math.random() * 8),
      hrv:             40 + Math.round(Math.random() * 20),
      respirationRate: 14 + Math.round(Math.random() * 4),
      batteryLevel:    87,
      source:          'simulated'
    };
  }

  async function _uploadToFirestore() {
    if (!_patientId || !_buffer.hr) return;
    try {
      await VDB.saveVitals(_patientId, { ..._buffer });
    } catch (e) {
      console.warn('Vitals upload failed:', e.message);
    }
  }

  return {
    start(patientId) {
      if (_isStarted) return;
      _patientId = patientId;
      _isStarted = true;
      _simulate(); // initial reading

      // Update display every 1 second
      _displayInterval = setInterval(() => {
        _simulate();
        _subscribers.forEach(cb => cb({ ..._buffer }));
      }, 1000);

      // Upload to Firestore every 60 seconds
      _uploadInterval = setInterval(_uploadToFirestore, 60000);
    },

    stop() {
      clearInterval(_displayInterval);
      clearInterval(_uploadInterval);
      _isStarted = false;
      _subscribers = [];
    },

    getCurrent() { return { ..._buffer }; },

    subscribe(callback) {
      _subscribers.push(callback);
      if (_buffer.hr) callback({ ..._buffer }); // immediate first value
      return () => { _subscribers = _subscribers.filter(c => c !== callback); };
    },

    async getHistory(patientId, days = 7) {
      return await VDB.getVitalsHistory(patientId, days);
    },

    // Force upload now (e.g., before page unload)
    forceUpload() { return _uploadToFirestore(); }
  };
})();

console.log('[Vitalora] Firebase initialized. VAuth, VDB, VitalsManager ready.');
