/* ============================================
   KDU - COMPLAINTS.JS
   Submit, track, filter complaints
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'submit-complaint') initSubmitComplaint();
  if (page === 'track-complaint') initTrackComplaints();
});

// ---- SUBMIT COMPLAINT ----
function initSubmitComplaint() {
  if (!Auth.requireAuth('student')) return;

  const form = document.getElementById('complaint-form');
  const charCount = document.getElementById('char-count');
  const photoPreview = document.getElementById('photo-preview');
  const photoInput = document.getElementById('photo');
  const anonToggle = document.getElementById('anonymous');

  // Character counter
  const descEl = document.getElementById('description');
  if (descEl && charCount) {
    descEl.addEventListener('input', () => {
      charCount.textContent = descEl.value.length;
    });
  }

  // Photo preview
  if (photoInput && photoPreview) {
    photoInput.addEventListener('change', () => {
      const file = photoInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          photoPreview.innerHTML = `
            <div class="photo-thumb">
              <img src="${e.target.result}" alt="Preview" style="max-width:180px;max-height:120px;border-radius:8px;border:2px solid var(--gray-200);"/>
              <button type="button" class="btn btn-ghost btn-sm" onclick="clearPhoto()" style="margin-top:6px;">✕ Remove</button>
            </div>`;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Urgency selector
  document.querySelectorAll('.urgency-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.urgency-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('urgency-val').value = btn.dataset.urgency;
    });
  });

  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();
    const user = Auth.getUser();
    if (!user) return;

    const category = form.category.value;
    const title = form.title.value.trim();
    const description = form.description.value.trim();
    const location = form.location.value.trim();
    const urgency = document.getElementById('urgency-val').value;
    const anonymous = document.getElementById('anonymous')?.checked || false;

    let valid = true;
    if (!category) { showError('err-category', 'Please select a facility category'); valid = false; }
    if (!title) { showError('err-title', 'Complaint title is required'); valid = false; }
    if (description.length < 20) { showError('err-description', 'Please provide at least 20 characters of detail'); valid = false; }
    if (!location) { showError('err-location', 'Location or room number is required'); valid = false; }
    if (!urgency) { showError('err-urgency', 'Please select an urgency level'); valid = false; }
    if (!valid) return;

    // Handle photo
    let photoData = null;
    const photoFile = document.getElementById('photo')?.files[0];
    if (photoFile) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        photoData = ev.target.result;
        saveComplaint(user, category, title, description, location, urgency, anonymous, photoData);
      };
      reader.readAsDataURL(photoFile);
    } else {
      saveComplaint(user, category, title, description, location, urgency, anonymous, null);
    }
  });
}

function saveComplaint(user, category, title, description, location, urgency, anonymous, photo) {
  const complaint = {
    id: generateId('KDU'),
    studentId: user.id,
    studentName: anonymous ? 'Anonymous' : user.name,
    studentEmail: anonymous ? null : user.email,
    category, title, description, location, urgency,
    anonymous, photo,
    status: 'Pending',
    dateSubmitted: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    adminResponse: null
  };
  Store.push('kdu_complaints', complaint);
  showToast(`Complaint submitted! Reference: ${complaint.id}`, 'success', 5000);

  const refEl = document.getElementById('complaint-ref');
  if (refEl) {
    refEl.textContent = complaint.id;
    document.getElementById('success-banner')?.classList.remove('hidden');
  }
  document.getElementById('complaint-form')?.reset();
  document.querySelectorAll('.urgency-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('urgency-val').value = '';
  const pp = document.getElementById('photo-preview');
  if (pp) pp.innerHTML = '';
  document.getElementById('char-count').textContent = '0';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearPhoto() {
  document.getElementById('photo').value = '';
  document.getElementById('photo-preview').innerHTML = '';
}

// ---- TRACK COMPLAINTS ----
function initTrackComplaints() {
  if (!Auth.requireAuth('student')) return;
  renderTrackTable();

  // Search and filter
  document.getElementById('search-input')?.addEventListener('input', renderTrackTable);
  document.getElementById('filter-status')?.addEventListener('change', renderTrackTable);
  document.getElementById('filter-category')?.addEventListener('change', renderTrackTable);
}

function renderTrackTable() {
  const user = Auth.getUser();
  if (!user) return;

  let complaints = Store.get('kdu_complaints').filter(c => c.studentId === user.id);
  const search = document.getElementById('search-input')?.value.toLowerCase() || '';
  const status = document.getElementById('filter-status')?.value || '';
  const category = document.getElementById('filter-category')?.value || '';

  if (search) complaints = complaints.filter(c =>
    c.title.toLowerCase().includes(search) || c.id.toLowerCase().includes(search) || c.location.toLowerCase().includes(search)
  );
  if (status) complaints = complaints.filter(c => c.status === status);
  if (category) complaints = complaints.filter(c => c.category === category);

  complaints.sort((a, b) => new Date(b.dateSubmitted) - new Date(a.dateSubmitted));

  // Update counters
  const all = Store.get('kdu_complaints').filter(c => c.studentId === user.id);
  document.getElementById('count-all').textContent = all.length;
  document.getElementById('count-pending').textContent = all.filter(c => c.status === 'Pending').length;
  document.getElementById('count-progress').textContent = all.filter(c => c.status === 'In Progress').length;
  document.getElementById('count-resolved').textContent = all.filter(c => c.status === 'Resolved').length;

  const tbody = document.getElementById('complaints-tbody');
  if (!tbody) return;

  if (!complaints.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px 20px;color:var(--gray-400);">No complaints found matching your filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = complaints.map(c => `
    <tr>
      <td><span class="complaint-id">${c.id}</span></td>
      <td>
        <div style="font-weight:500;color:var(--gray-800);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${c.title}">${c.title}</div>
        <div style="font-size:0.75rem;color:var(--gray-400);">${c.location}</div>
      </td>
      <td><span class="chip chip-navy">${c.category}</span></td>
      <td>${urgencyBadge(c.urgency)}</td>
      <td>${statusBadge(c.status)}</td>
      <td class="hide-mobile">${formatDate(c.dateSubmitted, true)}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="openComplaintModal('${c.id}')">View ›</button>
      </td>
    </tr>
  `).join('');
}

function openComplaintModal(id) {
  const complaint = Store.get('kdu_complaints').find(c => c.id === id);
  if (!complaint) return;

  const modal = document.getElementById('complaint-modal');
  const body = document.getElementById('modal-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <div class="complaint-detail">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
        <div>
          <span class="complaint-id" style="font-size:1rem;">${complaint.id}</span>
          <h3 style="margin-top:6px;font-size:1.1rem;">${complaint.title}</h3>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${statusBadge(complaint.status)}
          ${urgencyBadge(complaint.urgency)}
        </div>
      </div>
      <div class="field-row"><span class="field-label">Category</span><span class="field-val"><span class="chip chip-navy">${complaint.category}</span></span></div>
      <div class="field-row"><span class="field-label">Location</span><span class="field-val">📍 ${complaint.location}</span></div>
      <div class="field-row"><span class="field-label">Submitted</span><span class="field-val">${formatDate(complaint.dateSubmitted)}</span></div>
      <div class="field-row"><span class="field-label">Last Updated</span><span class="field-val">${formatDate(complaint.lastUpdated)}</span></div>
      <div class="field-row"><span class="field-label">Anonymous</span><span class="field-val">${complaint.anonymous ? '🔒 Yes' : '👤 No'}</span></div>
      <hr class="divider" style="margin:16px 0;"/>
      <div style="margin-bottom:12px;">
        <div class="form-label">Description</div>
        <p style="font-size:0.875rem;color:var(--gray-700);line-height:1.6;background:var(--gray-50);padding:12px;border-radius:8px;">${complaint.description}</p>
      </div>
      ${complaint.photo ? `<div style="margin-bottom:12px;"><div class="form-label">Attached Photo</div><img src="${complaint.photo}" alt="Complaint photo" style="max-width:100%;max-height:220px;border-radius:8px;border:1px solid var(--gray-200);"/></div>` : ''}
      ${complaint.adminResponse ? `
        <div class="admin-response-box">
          <div class="resp-label">🏛️ Admin Response</div>
          <p>${complaint.adminResponse}</p>
          <p style="font-size:0.75rem;color:var(--gray-400);margin-top:8px;">Updated: ${formatDate(complaint.lastUpdated)}</p>
        </div>` : `
        <div style="background:var(--gray-50);border:1px dashed var(--gray-200);border-radius:8px;padding:16px;text-align:center;">
          <p style="font-size:0.85rem;color:var(--gray-400);">⏳ Awaiting admin response</p>
        </div>`
      }
      <ul class="timeline" style="margin-top:24px;">
        <li class="timeline-item">
          <div class="timeline-dot done">✓</div>
          <div class="timeline-content">
            <div class="tl-title">Complaint Submitted</div>
            <div class="tl-date">${formatDate(complaint.dateSubmitted)}</div>
          </div>
        </li>
        <li class="timeline-item">
          <div class="timeline-dot ${complaint.status !== 'Pending' ? 'done' : 'active'}">
            ${complaint.status !== 'Pending' ? '✓' : '2'}
          </div>
          <div class="timeline-content">
            <div class="tl-title">Under Review</div>
            ${complaint.status !== 'Pending' ? `<div class="tl-date">${formatDate(complaint.lastUpdated)}</div>` : '<div class="tl-date" style="color:var(--gray-400);">Pending</div>'}
          </div>
        </li>
        <li class="timeline-item">
          <div class="timeline-dot ${complaint.status === 'Resolved' ? 'done' : ''}">3</div>
          <div class="timeline-content">
            <div class="tl-title">Resolved</div>
            ${complaint.status === 'Resolved' ? `<div class="tl-date">${formatDate(complaint.lastUpdated)}</div>` : '<div class="tl-date" style="color:var(--gray-400);">Pending</div>'}
          </div>
        </li>
      </ul>
    </div>
  `;
  modal.classList.remove('hidden');
  modal.classList.add('show');
}

function closeModal() {
  const modal = document.getElementById('complaint-modal');
  modal?.classList.remove('show');
  setTimeout(() => modal?.classList.add('hidden'), 200);
}
