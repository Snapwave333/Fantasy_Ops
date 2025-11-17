// Fantasy Ops Frontend Application
const API_URL = '/api';

// State management
const state = {
  user: null,
  token: localStorage.getItem('token'),
  currentView: 'home'
};

// DOM Elements
const elements = {
  views: document.querySelectorAll('.view'),
  navLinks: document.querySelectorAll('.nav-link'),
  loginBtn: document.getElementById('loginBtn'),
  registerBtn: document.getElementById('registerBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  authButtons: document.getElementById('authButtons'),
  userMenu: document.getElementById('userMenu'),
  userGreeting: document.getElementById('userGreeting'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalContent: document.getElementById('modalContent'),
  authRequiredElements: document.querySelectorAll('.auth-required')
};

// API Helper
async function api(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'An error occurred');
  }

  return data;
}

// Authentication
async function checkAuth() {
  if (!state.token) {
    updateAuthUI(false);
    return;
  }

  try {
    const response = await api('/auth/profile');
    state.user = response.data.user;
    updateAuthUI(true);
  } catch (error) {
    localStorage.removeItem('token');
    state.token = null;
    state.user = null;
    updateAuthUI(false);
  }
}

function updateAuthUI(isLoggedIn) {
  if (isLoggedIn) {
    elements.authButtons.style.display = 'none';
    elements.userMenu.style.display = 'flex';
    elements.userGreeting.textContent = `Hello, ${state.user.username}`;
    elements.authRequiredElements.forEach(el => el.style.display = '');
  } else {
    elements.authButtons.style.display = 'flex';
    elements.userMenu.style.display = 'none';
    elements.authRequiredElements.forEach(el => el.style.display = 'none');
  }
}

function logout() {
  localStorage.removeItem('token');
  state.token = null;
  state.user = null;
  updateAuthUI(false);
  showView('home');
}

// Modal Functions
function showModal(content) {
  elements.modalContent.innerHTML = content;
  elements.modalOverlay.classList.add('active');
}

function hideModal() {
  elements.modalOverlay.classList.remove('active');
}

function showLoginModal() {
  showModal(`
    <div class="modal-header">
      <h3>Login</h3>
      <button class="modal-close" onclick="hideModal()">&times;</button>
    </div>
    <div id="loginError" class="error-message" style="display: none;"></div>
    <form id="loginForm">
      <div class="form-group">
        <label for="loginUsername">Username or Email</label>
        <input type="text" id="loginUsername" required>
      </div>
      <div class="form-group">
        <label for="loginPassword">Password</label>
        <input type="password" id="loginPassword" required>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Login</button>
      </div>
    </form>
  `);

  document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

function showRegisterModal() {
  showModal(`
    <div class="modal-header">
      <h3>Register</h3>
      <button class="modal-close" onclick="hideModal()">&times;</button>
    </div>
    <div id="registerError" class="error-message" style="display: none;"></div>
    <form id="registerForm">
      <div class="form-group">
        <label for="regUsername">Username</label>
        <input type="text" id="regUsername" required minlength="3" maxlength="30">
      </div>
      <div class="form-group">
        <label for="regEmail">Email</label>
        <input type="email" id="regEmail" required>
      </div>
      <div class="form-group">
        <label for="regPassword">Password</label>
        <input type="password" id="regPassword" required minlength="6">
        <small>Must be at least 6 characters with at least one number</small>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Register</button>
      </div>
    </form>
  `);

  document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

async function handleLogin(e) {
  e.preventDefault();
  const login = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');

  try {
    const response = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password })
    });

    state.token = response.data.token;
    state.user = response.data.user;
    localStorage.setItem('token', state.token);
    updateAuthUI(true);
    hideModal();
    showView('leagues');
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('regUsername').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const errorEl = document.getElementById('registerError');

  try {
    const response = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });

    state.token = response.data.token;
    state.user = response.data.user;
    localStorage.setItem('token', state.token);
    updateAuthUI(true);
    hideModal();
    showView('leagues');
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  }
}

// View Navigation
function showView(viewName) {
  elements.views.forEach(view => view.classList.remove('active'));
  elements.navLinks.forEach(link => link.classList.remove('active'));

  const targetView = document.getElementById(`${viewName}View`);
  const targetLink = document.querySelector(`[data-view="${viewName}"]`);

  if (targetView) {
    targetView.classList.add('active');
    state.currentView = viewName;
  }

  if (targetLink) {
    targetLink.classList.add('active');
  }

  // Load view data
  switch (viewName) {
    case 'leagues':
      loadLeagues();
      break;
    case 'teams':
      loadTeams();
      break;
    case 'players':
      loadPlayers();
      break;
    case 'news':
      loadNews();
      break;
    case 'media':
      loadMedia();
      break;
  }
}

// Leagues
async function loadLeagues() {
  const listEl = document.getElementById('leaguesList');
  const sport = document.getElementById('sportFilter').value;
  const status = document.getElementById('statusFilter').value;

  listEl.innerHTML = '<p class="loading">Loading leagues...</p>';

  try {
    let url = '/leagues?';
    if (sport) url += `sport=${sport}&`;
    if (status) url += `status=${status}&`;

    const response = await api(url);
    const leagues = response.data.leagues;

    if (leagues.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <h4>No leagues found</h4>
          <p>Create a new league to get started!</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = leagues.map(league => `
      <div class="league-card">
        <div class="card-header">
          <h3>${escapeHtml(league.name)}</h3>
          <span class="badge badge-${league.status}">${league.status.replace('_', ' ')}</span>
        </div>
        <div class="card-meta">
          <span>Sport: ${league.sport}</span>
          <span>Teams: ${league.team_count}/${league.max_teams}</span>
          <span>Commissioner: ${escapeHtml(league.commissioner_name)}</span>
        </div>
        ${league.description ? `<p>${escapeHtml(league.description)}</p>` : ''}
        <div class="card-actions">
          <button class="btn btn-primary" onclick="viewLeague('${league.id}')">View Details</button>
          ${state.user && league.team_count < league.max_teams ?
            `<button class="btn btn-success" onclick="showJoinLeagueModal('${league.id}')">Join League</button>` : ''}
        </div>
      </div>
    `).join('');
  } catch (error) {
    listEl.innerHTML = `<p class="error-message">${error.message}</p>`;
  }
}

function showCreateLeagueModal() {
  showModal(`
    <div class="modal-header">
      <h3>Create New League</h3>
      <button class="modal-close" onclick="hideModal()">&times;</button>
    </div>
    <div id="createLeagueError" class="error-message" style="display: none;"></div>
    <form id="createLeagueForm">
      <div class="form-group">
        <label for="leagueName">League Name</label>
        <input type="text" id="leagueName" required minlength="3" maxlength="50">
      </div>
      <div class="form-group">
        <label for="leagueDescription">Description</label>
        <textarea id="leagueDescription" rows="3" maxlength="500"></textarea>
      </div>
      <div class="form-group">
        <label for="leagueSport">Sport</label>
        <select id="leagueSport">
          <option value="football">Football</option>
          <option value="basketball">Basketball</option>
          <option value="baseball">Baseball</option>
          <option value="hockey">Hockey</option>
        </select>
      </div>
      <div class="form-group">
        <label for="leagueMaxTeams">Max Teams</label>
        <input type="number" id="leagueMaxTeams" value="12" min="4" max="20">
      </div>
      <div class="form-group">
        <label for="leagueScoringType">Scoring Type</label>
        <select id="leagueScoringType">
          <option value="standard">Standard</option>
          <option value="ppr">PPR</option>
          <option value="half_ppr">Half PPR</option>
        </select>
      </div>
      <div class="form-group">
        <label for="leagueDraftType">Draft Type</label>
        <select id="leagueDraftType">
          <option value="snake">Snake</option>
          <option value="auction">Auction</option>
          <option value="linear">Linear</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Create League</button>
      </div>
    </form>
  `);

  document.getElementById('createLeagueForm').addEventListener('submit', handleCreateLeague);
}

async function handleCreateLeague(e) {
  e.preventDefault();
  const errorEl = document.getElementById('createLeagueError');

  const data = {
    name: document.getElementById('leagueName').value,
    description: document.getElementById('leagueDescription').value,
    sport: document.getElementById('leagueSport').value,
    max_teams: parseInt(document.getElementById('leagueMaxTeams').value),
    scoring_type: document.getElementById('leagueScoringType').value,
    draft_type: document.getElementById('leagueDraftType').value
  };

  try {
    await api('/leagues', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    hideModal();
    loadLeagues();
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  }
}

function showJoinLeagueModal(leagueId) {
  if (!state.user) {
    showLoginModal();
    return;
  }

  showModal(`
    <div class="modal-header">
      <h3>Join League</h3>
      <button class="modal-close" onclick="hideModal()">&times;</button>
    </div>
    <div id="joinLeagueError" class="error-message" style="display: none;"></div>
    <form id="joinLeagueForm">
      <div class="form-group">
        <label for="teamName">Your Team Name</label>
        <input type="text" id="teamName" required minlength="3" maxlength="50" placeholder="e.g., Thunder Hawks">
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-success">Join League</button>
      </div>
    </form>
  `);

  document.getElementById('joinLeagueForm').addEventListener('submit', (e) => handleJoinLeague(e, leagueId));
}

async function handleJoinLeague(e, leagueId) {
  e.preventDefault();
  const teamName = document.getElementById('teamName').value;
  const errorEl = document.getElementById('joinLeagueError');

  try {
    await api(`/leagues/${leagueId}/join`, {
      method: 'POST',
      body: JSON.stringify({ team_name: teamName })
    });

    hideModal();
    loadLeagues();
    showView('teams');
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  }
}

async function viewLeague(leagueId) {
  const view = document.getElementById('leagueDetailView');
  const content = document.getElementById('leagueDetailContent');

  showView('leagueDetail');
  content.innerHTML = '<p class="loading">Loading league details...</p>';

  try {
    const response = await api(`/leagues/${leagueId}`);
    const { league, teams } = response.data;

    const standingsResponse = await api(`/leagues/${leagueId}/standings`);
    const standings = standingsResponse.data.standings;

    content.innerHTML = `
      <button class="btn btn-outline" onclick="showView('leagues')">&larr; Back to Leagues</button>
      <div style="margin-top: 1rem;">
        <div class="card-header">
          <h2>${escapeHtml(league.name)}</h2>
          <span class="badge badge-${league.status}">${league.status.replace('_', ' ')}</span>
        </div>
        <div class="card-meta">
          <span>Sport: ${league.sport}</span>
          <span>Scoring: ${league.scoring_type}</span>
          <span>Draft: ${league.draft_type}</span>
          <span>Season: ${league.season}</span>
        </div>
        ${league.description ? `<p style="margin: 1rem 0;">${escapeHtml(league.description)}</p>` : ''}
        <p>Commissioner: ${escapeHtml(league.commissioner_name)}</p>
      </div>

      <h3 style="margin-top: 2rem;">Standings</h3>
      ${standings.length > 0 ? `
        <table class="standings-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Owner</th>
              <th>W</th>
              <th>L</th>
              <th>T</th>
              <th>PF</th>
              <th>PA</th>
            </tr>
          </thead>
          <tbody>
            ${standings.map((team, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${escapeHtml(team.name)}</td>
                <td>${escapeHtml(team.owner_name)}</td>
                <td>${team.wins}</td>
                <td>${team.losses}</td>
                <td>${team.ties}</td>
                <td>${team.points_for.toFixed(1)}</td>
                <td>${team.points_against.toFixed(1)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p>No teams have joined yet.</p>'}
    `;
  } catch (error) {
    content.innerHTML = `<p class="error-message">${error.message}</p>`;
  }
}

// Teams
async function loadTeams() {
  if (!state.user) {
    document.getElementById('teamsList').innerHTML = `
      <div class="empty-state">
        <h4>Please log in</h4>
        <p>You need to be logged in to view your teams.</p>
      </div>
    `;
    return;
  }

  const listEl = document.getElementById('teamsList');
  listEl.innerHTML = '<p class="loading">Loading your teams...</p>';

  try {
    const response = await api('/teams');
    const teams = response.data.teams;

    if (teams.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <h4>No teams yet</h4>
          <p>Join a league to create your first team!</p>
          <button class="btn btn-primary" onclick="showView('leagues')">Browse Leagues</button>
        </div>
      `;
      return;
    }

    listEl.innerHTML = teams.map(team => `
      <div class="team-card">
        <div class="card-header">
          <h3>${escapeHtml(team.name)}</h3>
        </div>
        <div class="card-meta">
          <span>League: ${escapeHtml(team.league_name)}</span>
          <span>Sport: ${team.sport}</span>
          <span>Record: ${team.wins}-${team.losses}-${team.ties}</span>
        </div>
        <div class="card-meta">
          <span>Points For: ${team.points_for.toFixed(1)}</span>
          <span>Points Against: ${team.points_against.toFixed(1)}</span>
        </div>
        <div class="card-actions">
          <button class="btn btn-primary" onclick="viewTeam('${team.id}')">View Roster</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    listEl.innerHTML = `<p class="error-message">${error.message}</p>`;
  }
}

async function viewTeam(teamId) {
  const view = document.getElementById('teamDetailView');
  const content = document.getElementById('teamDetailContent');

  showView('teamDetail');
  content.innerHTML = '<p class="loading">Loading team details...</p>';

  try {
    const response = await api(`/teams/${teamId}/roster`);
    const { team, roster } = response.data;

    content.innerHTML = `
      <button class="btn btn-outline" onclick="showView('teams')">&larr; Back to Teams</button>
      <div style="margin-top: 1rem;">
        <h2>${escapeHtml(team.name)}</h2>
        <div class="card-meta">
          <span>League: ${escapeHtml(team.league_name)}</span>
          <span>Record: ${team.wins}-${team.losses}-${team.ties}</span>
        </div>
      </div>

      <div class="roster-section">
        <h4>Roster (${roster.length} players)</h4>
        ${roster.length > 0 ? roster.map(player => `
          <div class="roster-player">
            <span class="position">${player.roster_position}</span>
            <div class="player-info">
              <strong>${escapeHtml(player.player_name)}</strong>
              <span style="color: #666;"> - ${player.position} | ${player.nfl_team}</span>
            </div>
            <span class="player-points">${player.avg_points.toFixed(1)} avg pts</span>
          </div>
        `).join('') : '<p>No players on roster yet.</p>'}
      </div>

      ${team.owner_id === state.user?.id ? `
        <div style="margin-top: 2rem;">
          <button class="btn btn-success" onclick="showAddPlayerModal('${teamId}')">Add Player</button>
        </div>
      ` : ''}
    `;
  } catch (error) {
    content.innerHTML = `<p class="error-message">${error.message}</p>`;
  }
}

async function showAddPlayerModal(teamId) {
  showModal(`
    <div class="modal-header">
      <h3>Add Player to Roster</h3>
      <button class="modal-close" onclick="hideModal()">&times;</button>
    </div>
    <div id="addPlayerError" class="error-message" style="display: none;"></div>
    <div class="form-group">
      <label for="positionSelect">Filter by Position</label>
      <select id="positionSelect" onchange="loadAvailablePlayers('${teamId}')">
        <option value="">All Positions</option>
        <option value="QB">Quarterback</option>
        <option value="RB">Running Back</option>
        <option value="WR">Wide Receiver</option>
        <option value="TE">Tight End</option>
        <option value="K">Kicker</option>
        <option value="DST">Defense/ST</option>
      </select>
    </div>
    <div id="availablePlayers" class="loading">Loading available players...</div>
  `);

  loadAvailablePlayers(teamId);
}

async function loadAvailablePlayers(teamId) {
  const position = document.getElementById('positionSelect').value;
  const container = document.getElementById('availablePlayers');

  try {
    let url = `/teams/${teamId}/available-players?limit=20`;
    if (position) url += `&position=${position}`;

    const response = await api(url);
    const players = response.data.players;

    if (players.length === 0) {
      container.innerHTML = '<p>No available players found.</p>';
      return;
    }

    container.innerHTML = players.map(player => `
      <div class="roster-player" style="cursor: pointer;" onclick="addPlayerToTeam('${teamId}', '${player.id}', '${player.position}')">
        <span class="position">${player.position}</span>
        <div class="player-info">
          <strong>${escapeHtml(player.name)}</strong>
          <span style="color: #666;"> - ${player.team}</span>
        </div>
        <span class="player-points">${player.avg_points.toFixed(1)} avg</span>
      </div>
    `).join('');
  } catch (error) {
    container.innerHTML = `<p class="error-message">${error.message}</p>`;
  }
}

async function addPlayerToTeam(teamId, playerId, position) {
  const rosterPosition = position === 'DST' ? 'DST' :
                         ['QB', 'RB', 'WR', 'TE', 'K'].includes(position) ? position : 'BENCH';
  const errorEl = document.getElementById('addPlayerError');

  try {
    await api(`/teams/${teamId}/roster`, {
      method: 'POST',
      body: JSON.stringify({ player_id: playerId, roster_position: rosterPosition })
    });

    hideModal();
    viewTeam(teamId);
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  }
}

// News
async function loadNews() {
  const listEl = document.getElementById('newsList');
  const category = document.getElementById('newsCategoryFilter').value;
  const featuredOnly = document.getElementById('featuredOnly').checked;

  listEl.innerHTML = '<p class="loading">Loading news...</p>';

  try {
    let url = '/news?limit=20';
    if (category) url += `&category=${category}`;
    if (featuredOnly) url += '&featured=true';

    const response = await api(url);
    const articles = response.data.articles;

    if (articles.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <h4>No news articles found</h4>
          <p>Check back later for updates!</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = articles.map(article => `
      <div class="news-card ${article.featured ? 'news-featured' : ''}" onclick="viewNewsArticle('${article.id}')">
        ${article.image_url ? `<img src="${article.image_url}" alt="${escapeHtml(article.title)}" class="news-card-image" onerror="this.style.display='none'">` : ''}
        <div class="news-card-content">
          <span class="news-card-category">${article.category}</span>
          <h3 class="news-card-title">${escapeHtml(article.title)}</h3>
          <p class="news-card-summary">${escapeHtml(article.summary)}</p>
          <div class="news-card-meta">
            <span>By ${escapeHtml(article.author)}</span>
            <span>${new Date(article.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    listEl.innerHTML = `<p class="error-message">${error.message}</p>`;
  }
}

async function viewNewsArticle(articleId) {
  const content = document.getElementById('newsArticleContent');
  showView('newsArticle');
  content.innerHTML = '<p class="loading">Loading article...</p>';

  try {
    const response = await api(`/news/${articleId}`);
    const article = response.data.article;

    content.innerHTML = `
      <button class="btn btn-outline" onclick="showView('news')">&larr; Back to News</button>
      <div class="news-article">
        <div class="news-article-header">
          <span class="news-card-category">${article.category}</span>
          <h1 class="news-article-title">${escapeHtml(article.title)}</h1>
          <div class="news-card-meta">
            <span>By ${escapeHtml(article.author)}</span>
            <span>${new Date(article.created_at).toLocaleDateString()}</span>
            <span>${article.views} views</span>
          </div>
        </div>
        ${article.image_url ? `<img src="${article.image_url}" alt="${escapeHtml(article.title)}" class="news-article-image" onerror="this.style.display='none'">` : ''}
        <div class="news-article-content">
          ${escapeHtml(article.content)}
        </div>
        ${article.video_url ? `
          <div class="news-article-video">
            <h4>Watch Video</h4>
            <iframe src="${article.video_url}" allowfullscreen></iframe>
          </div>
        ` : ''}
      </div>
    `;
  } catch (error) {
    content.innerHTML = `<p class="error-message">${error.message}</p>`;
  }
}

// Media Gallery
let currentMediaType = 'all';

async function loadMedia(type = null) {
  if (type) currentMediaType = type;
  const gallery = document.getElementById('mediaGallery');
  gallery.innerHTML = '<p class="loading">Loading media...</p>';

  try {
    let url = '/media?limit=20';
    if (currentMediaType && currentMediaType !== 'all') {
      url = `/media/${currentMediaType}s?limit=20`;
    }

    const response = await api(url);
    const items = currentMediaType === 'all' ? response.data.media :
                  currentMediaType === 'image' ? response.data.images : response.data.videos;

    if (!items || items.length === 0) {
      gallery.innerHTML = `
        <div class="empty-state">
          <h4>No media found</h4>
          <p>Check back later for more content!</p>
        </div>
      `;
      return;
    }

    gallery.innerHTML = items.map(item => `
      <div class="media-item" onclick="viewMedia('${item.id}', '${item.type}', '${item.url}', '${escapeHtml(item.title)}')">
        <div class="media-thumbnail">
          <img src="${item.thumbnail_url || item.url}" alt="${escapeHtml(item.title)}" onerror="this.src='https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=400'">
          <span class="media-type-badge">${item.type}</span>
          ${item.type === 'video' ? '<div class="media-play-icon">▶</div>' : ''}
        </div>
        <div class="media-info">
          <div class="media-title">${escapeHtml(item.title)}</div>
          <div class="media-description">${escapeHtml(item.description || '')}</div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    gallery.innerHTML = `<p class="error-message">${error.message}</p>`;
  }
}

function viewMedia(id, type, url, title) {
  if (type === 'video') {
    showModal(`
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" onclick="hideModal()">&times;</button>
      </div>
      <div class="video-player">
        <iframe src="${url}" allowfullscreen></iframe>
      </div>
    `);
  } else {
    showModal(`
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" onclick="hideModal()">&times;</button>
      </div>
      <div class="image-viewer">
        <img src="${url}" alt="${title}">
      </div>
    `);
  }
}

// Players
async function loadPlayers() {
  const listEl = document.getElementById('playersList');
  const search = document.getElementById('playerSearch').value;
  const position = document.getElementById('positionFilter').value;

  listEl.innerHTML = '<p class="loading">Loading players...</p>';

  try {
    let url = '/players?limit=50';
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (position) url += `&position=${position}`;

    const response = await api(url);
    const players = response.data.players;

    if (players.length === 0) {
      listEl.innerHTML = '<p>No players found.</p>';
      return;
    }

    listEl.innerHTML = `
      <table class="player-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Position</th>
            <th>Team</th>
            <th>Avg Points</th>
            <th>Total Points</th>
            <th>Games</th>
            <th>Bye Week</th>
          </tr>
        </thead>
        <tbody>
          ${players.map(player => `
            <tr>
              <td>${escapeHtml(player.name)}</td>
              <td>${player.position}</td>
              <td>${player.team}</td>
              <td>${player.avg_points.toFixed(1)}</td>
              <td>${player.total_points.toFixed(1)}</td>
              <td>${player.games_played}</td>
              <td>${player.bye_week || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    listEl.innerHTML = `<p class="error-message">${error.message}</p>`;
  }
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  checkAuth();

  // Navigation
  elements.navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = e.target.dataset.view;
      if (view) showView(view);
    });
  });

  // Auth buttons
  elements.loginBtn.addEventListener('click', showLoginModal);
  elements.registerBtn.addEventListener('click', showRegisterModal);
  elements.logoutBtn.addEventListener('click', logout);

  // Hero buttons
  document.getElementById('heroRegister').addEventListener('click', showRegisterModal);
  document.getElementById('heroLeagues').addEventListener('click', () => showView('leagues'));

  // Create league button
  document.getElementById('createLeagueBtn').addEventListener('click', showCreateLeagueModal);

  // League filters
  document.getElementById('sportFilter').addEventListener('change', loadLeagues);
  document.getElementById('statusFilter').addEventListener('change', loadLeagues);

  // Player search
  document.getElementById('playerSearch').addEventListener('input', debounce(loadPlayers, 300));
  document.getElementById('positionFilter').addEventListener('change', loadPlayers);

  // News filters
  document.getElementById('newsCategoryFilter').addEventListener('change', loadNews);
  document.getElementById('featuredOnly').addEventListener('change', loadNews);

  // Media tabs
  document.querySelectorAll('.media-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.media-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      loadMedia(e.target.dataset.type);
    });
  });

  // Modal close on overlay click
  elements.modalOverlay.addEventListener('click', (e) => {
    if (e.target === elements.modalOverlay) {
      hideModal();
    }
  });

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideModal();
    }
  });
});

// Make functions globally available
window.showView = showView;
window.viewLeague = viewLeague;
window.viewTeam = viewTeam;
window.hideModal = hideModal;
window.showJoinLeagueModal = showJoinLeagueModal;
window.showAddPlayerModal = showAddPlayerModal;
window.loadAvailablePlayers = loadAvailablePlayers;
window.addPlayerToTeam = addPlayerToTeam;
window.viewNewsArticle = viewNewsArticle;
window.viewMedia = viewMedia;
window.loadMedia = loadMedia;
