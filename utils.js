/* ============================================
   KDU - UTILS.JS
   Shared utilities, toast, localStorage helpers
   ============================================ */

// ---- ID GENERATORS ----
function generateId(prefix = 'KDU') {
  return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2,5).toUpperCase();
}

// ---- TOAST NOTIFICATIONS ----
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fadeout');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---- STORAGE HELPERS ----
const Store = {
  get: (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  getOne: (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  remove: (key) => localStorage.removeItem(key),
  push: (key, item) => {
    const arr = Store.get(key);
    arr.push(item);
    Store.set(key, arr);
    return arr;
  },
  update: (key, id, updates) => {
    const arr = Store.get(key);
    const idx = arr.findIndex(i => i.id === id);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...updates };
      Store.set(key, arr);
      return arr[idx];
    }
    return null;
  },
  delete: (key, id) => {
    const arr = Store.get(key).filter(i => i.id !== id);
    Store.set(key, arr);
  }
};

// ---- AUTH HELPERS ----
const Auth = {
  session: () => Store.getOne('kdu_session'),
  isLoggedIn: () => !!Store.getOne('kdu_session'),
  getUser: () => {
    const s = Store.getOne('kdu_session');
    if (!s) return null;
    const users = Store.get('kdu_users');
    return users.find(u => u.id === s.userId) || null;
  },
  requireAuth: (role = 'student') => {
    const s = Store.getOne('kdu_session');
    if (!s) { window.location.href = '../pages/login.html'; return false; }
    if (role === 'admin' && s.role !== 'admin') { window.location.href = '../pages/login.html'; return false; }
    return true;
  },
  logout: () => {
    Store.remove('kdu_session');
    window.location.href = '../pages/index.html';
  }
};

// ---- SEED DEFAULT DATA ----
function seedDefaults() {
  // Admin user
  let users = Store.get('kdu_users');
  if (!users.find(u => u.email === 'admin@kdu.edu')) {
    users.push({
      id: 'admin-001',
      name: 'System Administrator',
      email: 'admin@kdu.edu',
      password: 'admin123',
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    Store.set('kdu_users', users);
  }

  // Sample facility statuses
  if (!Store.get('kdu_facilities').length) {
    Store.set('kdu_facilities', [
      { id: 'fac-1', name: 'Internet / Wi-Fi', status: 'operational', lastUpdated: new Date().toISOString() },
      { id: 'fac-2', name: 'Library', status: 'operational', lastUpdated: new Date().toISOString() },
      { id: 'fac-3', name: 'Hostel Block A', status: 'limited', lastUpdated: new Date().toISOString() },
      { id: 'fac-4', name: 'Hostel Block B', status: 'operational', lastUpdated: new Date().toISOString() },
      { id: 'fac-5', name: 'Sports Complex', status: 'maintenance', lastUpdated: new Date().toISOString() },
    ]);
  }

  // Sample announcements
  if (!Store.get('kdu_announcements').length) {
    Store.set('kdu_announcements', [
      {
        id: 'ann-001',
        title: 'Library Extended Hours — Finals Week',
        message: 'The KDU Library will be open 24/7 during finals week (June 1–7). Study rooms must be booked in advance via the main desk.',
        facility: 'Library',
        datePosted: new Date(Date.now() - 86400000).toISOString(),
        postedBy: 'admin-001'
      },
      {
        id: 'ann-002',
        title: 'Wi-Fi Upgrade in Hostel Block C',
        message: 'Network infrastructure upgrades are scheduled for Hostel Block C from May 20–22. Expect intermittent connectivity during this period.',
        facility: 'Internet / Wi-Fi',
        datePosted: new Date(Date.now() - 3 * 86400000).toISOString(),
        postedBy: 'admin-001'
      },
      {
        id: 'ann-003',
        title: 'Sports Complex Maintenance Notice',
        message: 'The Swimming Pool and Gym will be closed for routine maintenance this week. The outdoor courts remain open.',
        facility: 'Sports Complex',
        datePosted: new Date(Date.now() - 5 * 86400000).toISOString(),
        postedBy: 'admin-001'
      }
    ]);
  }

  // Sample complaints for demo
  if (!Store.get('kdu_complaints').length) {
    Store.set('kdu_complaints', [
      {
        id: generateId('KDU'),
        studentId: '',
        studentName: 'Anonymous',
        category: 'Internet / Wi-Fi',
        title: 'No internet in Room 214',
        description: 'The Wi-Fi signal is extremely weak in Room 214 of Hostel Block A. Cannot connect to e-learning portal.',
        location: 'Hostel Block A, Room 214',
        urgency: 'High',
        anonymous: true,
        status: 'In Progress',
        dateSubmitted: new Date(Date.now() - 4 * 86400000).toISOString(),
        lastUpdated: new Date(Date.now() - 2 * 86400000).toISOString(),
        adminResponse: 'Our network team has identified the access point issue. Replacement hardware has been ordered and will be installed within 2 business days.'
      }
    ]);
  }
}

// ---- DATE FORMATTER ----
function formatDate(iso, short = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (short) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(iso, true);
}

// ---- BADGE HELPERS ----
function statusBadge(status) {
  const map = {
    'Pending': 'badge-pending',
    'In Progress': 'badge-in-progress',
    'Resolved': 'badge-resolved'
  };
  return `<span class="badge ${map[status] || 'badge-info'}">${status}</span>`;
}
function urgencyBadge(urgency) {
  const map = {
    'Low': 'badge-low',
    'Medium': 'badge-medium',
    'High': 'badge-high',
    'Critical': 'badge-critical'
  };
  return `<span class="badge ${map[urgency] || ''}">${urgency}</span>`;
}

// ---- KDU LOGO SVG ----
const KDU_LOGO_SVG = `<svg class="kdu-logo-svg" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#c9a84c"/>
      <stop offset="100%" style="stop-color:#a07830"/>
    </linearGradient>
  </defs>
  <!-- Shield shape -->
  <path d="M22 3 L38 10 L38 24 C38 33 30 40 22 42 C14 40 6 33 6 24 L6 10 Z" fill="url(#shieldGrad)" opacity="0.15"/>
  <path d="M22 3 L38 10 L38 24 C38 33 30 40 22 42 C14 40 6 33 6 24 L6 10 Z" fill="none" stroke="#c9a84c" stroke-width="1.5"/>
  <!-- KDU text -->
  <text x="22" y="20" text-anchor="middle" font-family="serif" font-size="7" font-weight="bold" fill="#0a1f44">KDU</text>
  <!-- Ribbon -->
  <path d="M10 30 Q22 34 34 30" fill="none" stroke="#c9a84c" stroke-width="1.2"/>
  <!-- Lion silhouette simple -->
  <circle cx="22" cy="26" r="4" fill="#0a1f44" opacity="0.7"/>
  <path d="M19 24 Q22 22 25 24" fill="#c9a84c" stroke="none"/>
</svg>`;

// ---- SIDEBAR NAV INIT ----
function initSidebarNav(activeId) {
  const user = Auth.getUser();
  if (!user) return;

  // Set avatar and name
  const nameEl = document.getElementById('sidebar-username');
  const avatarEl = document.getElementById('sidebar-avatar');
  if (nameEl) nameEl.textContent = user.name;
  if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();

  // Active nav highlight
  document.querySelectorAll('.nav-item[data-id]').forEach(el => {
    el.classList.toggle('active', el.dataset.id === activeId);
  });

  // Hamburger toggle
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay && overlay.classList.toggle('show');
    });
    overlay && overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  }

  // Pending complaint badge
  if (user.role === 'student') {
    const complaints = Store.get('kdu_complaints').filter(c => c.studentId === user.id && c.status === 'Pending');
    const badgeEl = document.getElementById('pending-badge');
    if (badgeEl && complaints.length > 0) {
      badgeEl.textContent = complaints.length;
      badgeEl.style.display = 'inline';
    }
  }
}

// ---- RENDER LOGO ----
function renderLogos() {
  document.querySelectorAll('.kdu-logo-placeholder').forEach(el => {
    el.innerHTML = KDU_LOGO_SVG;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  seedDefaults();
  renderLogos();
});
