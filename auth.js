/* ============================================
   KDU - AUTH.JS
   Registration, Login, Session Management
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'register') initRegister();
  if (page === 'login') initLogin();
});

function initRegister() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const name = form.fullname.value.trim();
    const studentId = form.student_id.value.trim();
    const faculty = form.faculty.value;
    const year = form.year.value;
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const confirm = form.confirm_password.value;

    let valid = true;
    if (!name) { showError('err-name', 'Full name is required'); valid = false; }
    if (!studentId) { showError('err-student-id', 'Student ID is required'); valid = false; }
    if (!faculty) { showError('err-faculty', 'Please select your faculty'); valid = false; }
    if (!year) { showError('err-year', 'Please select year of study'); valid = false; }
    if (!email || !email.includes('@')) { showError('err-email', 'Valid email is required'); valid = false; }
    if (password.length < 6) { showError('err-password', 'Password must be at least 6 characters'); valid = false; }
    if (password !== confirm) { showError('err-confirm', 'Passwords do not match'); valid = false; }
    if (!valid) return;

    const users = Store.get('kdu_users');
    if (users.find(u => u.email === email)) {
      showError('err-email', 'An account with this email already exists');
      return;
    }
    if (users.find(u => u.studentId === studentId)) {
      showError('err-student-id', 'This student ID is already registered');
      return;
    }

    const newUser = {
      id: generateId('USR'),
      name, studentId, faculty, year, email, password,
      role: 'student',
      createdAt: new Date().toISOString()
    };
    Store.push('kdu_users', newUser);
    showToast('Account created successfully! Please log in.', 'success');
    setTimeout(() => window.location.href = 'login.html', 1500);
  });
}

function initLogin() {
  const form = document.getElementById('login-form');
  const roleStudent = document.getElementById('role-student');
  const roleAdmin = document.getElementById('role-admin');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const role = document.querySelector('.role-tab.active')?.dataset.role || 'student';

    if (!email) { showError('err-login-email', 'Email is required'); return; }
    if (!password) { showError('err-login-password', 'Password is required'); return; }

    const users = Store.get('kdu_users');
    const user = users.find(u => u.email === email && u.password === password && u.role === role);

    if (!user) {
      showError('err-login-email', 'Invalid email, password, or role selection');
      const btn = form.querySelector('button[type="submit"]');
      btn.classList.add('shake');
      setTimeout(() => btn.classList.remove('shake'), 500);
      return;
    }

    Store.set('kdu_session', { userId: user.id, role: user.role, loginTime: new Date().toISOString() });
    showToast(`Welcome back, ${user.name.split(' ')[0]}!`, 'success');

    setTimeout(() => {
      if (user.role === 'admin') window.location.href = 'admin-dashboard.html';
      else window.location.href = 'dashboard-student.html';
    }, 800);
  });

  // Role tab switching
  document.querySelectorAll('.role-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isAdmin = tab.dataset.role === 'admin';
      const hint = document.getElementById('admin-hint');
      if (hint) hint.style.display = isAdmin ? 'block' : 'none';
    });
  });
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function clearErrors() {
  document.querySelectorAll('.form-error').forEach(el => { el.style.display = 'none'; el.textContent = ''; });
}
