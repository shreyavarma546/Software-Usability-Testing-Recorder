// Global helper for user session
function getCurrentUser() {
  const userStr = localStorage.getItem('sutr_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

function checkAuth(allowedRoles = []) {
  const user = getCurrentUser();
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  if (!user && currentPage !== 'index.html' && currentPage !== '') {
    window.location.href = 'index.html';
    return null;
  }

  if (user && (currentPage === 'index.html' || currentPage === '')) {
    window.location.href = 'dashboard.html';
    return user;
  }

  if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    alert(`Access denied. Your role (${user.role}) cannot access this section.`);
    window.location.href = 'dashboard.html';
    return null;
  }

  return user;
}

function renderNavbar() {
  const navContainer = document.getElementById('navbar-container');
  if (!navContainer) return;

  const user = getCurrentUser();
  if (!user) {
    navContainer.innerHTML = '';
    return;
  }

  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

  let roleClass = 'role-tester';
  if (user.role === 'admin') roleClass = 'role-admin';
  if (user.role === 'designer') roleClass = 'role-designer';

  let navLinksHtml = `
    <li><a href="dashboard.html" class="${currentPage === 'dashboard.html' ? 'active' : ''}">Dashboard</a></li>
    <li><a href="projects.html" class="${currentPage === 'projects.html' ? 'active' : ''}">Projects</a></li>
    <li><a href="scenarios.html" class="${currentPage === 'scenarios.html' ? 'active' : ''}">Test Scenarios</a></li>
    <li><a href="issues.html" class="${currentPage === 'issues.html' ? 'active' : ''}">UX Issues</a></li>
    <li><a href="adjustments.html" class="${currentPage === 'adjustments.html' ? 'active' : ''}">Design Adjustments</a></li>
  `;

  navContainer.innerHTML = `
    <nav class="navbar">
      <a href="dashboard.html" class="nav-brand">
        <div class="nav-brand-icon">🧪</div>
        <span>Software Usability Testing Recorder</span>
      </a>
      <ul class="nav-links">
        ${navLinksHtml}
      </ul>
      <div class="nav-user">
        <div class="user-badge">
          <span>${user.username}</span>
          <span class="role-tag ${roleClass}">${user.role}</span>
        </div>
        <button onclick="logoutUser()" class="btn-logout">Logout</button>
      </div>
    </nav>
  `;
}

function logoutUser() {
  localStorage.removeItem('sutr_user');
  window.location.href = 'index.html';
}

function showAlert(message, type = 'danger', containerId = 'alert-container') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="alert alert-${type}">
      <span>${type === 'danger' ? '⚠️' : '✅'} ${message}</span>
    </div>
  `;
  setTimeout(() => {
    container.innerHTML = '';
  }, 4000);
}

// Utility date formatter
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Global project fetcher for dropdowns
async function fetchProjectsSelectOptions(selectId) {
  const selectElem = document.getElementById(selectId);
  if (!selectElem) return;

  try {
    const res = await fetch('/api/projects');
    const projects = await res.json();

    selectElem.innerHTML = '<option value="">-- Select Project --</option>';
    projects.forEach(p => {
      selectElem.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });
  } catch (err) {
    console.error('Failed to fetch projects options:', err);
  }
}
