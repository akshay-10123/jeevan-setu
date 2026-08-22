// Backend API — always port 5000 unless the page is already served from there
function resolveApiBaseUrl() {
  const host = window.location.hostname || 'localhost';
  const port = window.location.port;

  if (port === '5000') {
    return `${window.location.origin}/api`;
  }

  return `http://${host}:5000/api`;
}

const API_BASE_URL = resolveApiBaseUrl();
window.API_BASE_URL = API_BASE_URL;

function getServerBaseUrl() {
  return API_BASE_URL.replace(/\/api\/?$/, '');
}

async function checkServerHealth() {
  try {
    const res = await fetch(`${getServerBaseUrl()}/health`, { method: 'GET' });
    if (!res.ok) return { ok: false, message: 'Server returned an error' };
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: `Backend is not running. Open terminal, run "npm run dev", then use ${getServerBaseUrl()}/login.html`
    };
  }
}

window.getServerBaseUrl = getServerBaseUrl;
window.checkServerHealth = checkServerHealth;

// API Helper Functions
class JeevanSetuAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Generic API call method
  async makeRequest(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log('API: Making request to', url, 'with options:', options);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(sessionStorage.getItem('user') ? { 'Authorization': `Bearer ${JSON.parse(sessionStorage.getItem('user')).token || ''}` } : {}),
          ...options.headers
        },
        ...options
      });

      console.log('API: Response status:', response.status);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg = data.message ||
          (response.status === 405
            ? 'Server error 405 — open the app at http://localhost:5000/login.html (not Live Server)'
            : `HTTP error! status: ${response.status}`);
        throw new Error(msg);
      }

      console.log('API: Response data:', data);
      return data;
    } catch (error) {
      console.error('API Error:', error);

      // Never mock auth — login/signup must hit real backend
      if (endpoint.startsWith('/auth/')) {
        if (
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Unable to connect')
        ) {
          throw new Error(
            `Cannot reach server at ${getServerBaseUrl()}. Run "npm run dev" in the project folder, then open ${getServerBaseUrl()}/login.html`
          );
        }
        throw error;
      }

      // Fallback to mock data if server is not available
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.log('Server not available, using mock data');
        return this.getMockData(endpoint, options);
      }
      
      throw error;
    }
  }

  // Mock data fallback when server is not available
  getMockData(endpoint, options) {
    console.log('Using mock data for:', endpoint);
    
    if (endpoint === '/requests' && options.method === 'POST') {
      // Mock request creation
      const mockRequest = {
        id: Date.now(),
        type: JSON.parse(options.body).type,
        location: JSON.parse(options.body).location,
        description: JSON.parse(options.body).description,
        contact: JSON.parse(options.body).contact,
        name: JSON.parse(options.body).name,
        priority: JSON.parse(options.body).priority,
        status: 'pending',
        timestamp: new Date()
      };
      
      // Store in localStorage for persistence
      const requests = JSON.parse(localStorage.getItem('mockRequests') || '[]');
      requests.push(mockRequest);
      localStorage.setItem('mockRequests', JSON.stringify(requests));
      
      return {
        success: true,
        data: mockRequest,
        message: 'Request created successfully (offline mode)'
      };
    }
    
    if (endpoint === '/requests' && !options.method) {
      // Mock get all requests
      const requests = JSON.parse(localStorage.getItem('mockRequests') || '[]');
      return {
        success: true,
        data: requests,
        count: requests.length
      };
    }
    
    // Default mock response
    return {
      success: true,
      data: [],
      message: 'Mock data (server offline)'
    };
  }

  // Request Management
  async getAllRequests() {
    return this.makeRequest('/requests');
  }

  async getRequestById(id) {
    return this.makeRequest(`/requests/${id}`);
  }

  async createRequest(requestData) {
    return this.makeRequest('/requests', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  }

  async reverseGeocode(lat, lng) {
    return this.makeRequest(`/geocode/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
  }

  async forwardGeocode(query) {
    return this.makeRequest(`/geocode/forward?q=${encodeURIComponent(query)}`);
  }

  async updateRequestStatus(id, status) {
    console.log('API: Updating request status', { id, status });
    return this.makeRequest(`/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async deleteRequest(id) {
    return this.makeRequest(`/requests/${id}`, {
      method: 'DELETE'
    });
  }

  // Volunteer Management
  async getVolunteers() {
    return this.makeRequest('/volunteers');
  }

  async updateVolunteerStatus(id, status) {
    return this.makeRequest(`/volunteers/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  // Victim Management
  async getVictims() {
    return this.makeRequest('/victims');
  }

  async createVictim(victimData) {
    return this.makeRequest('/victims', {
      method: 'POST',
      body: JSON.stringify(victimData)
    });
  }

  // Admin Management
  async getAdminStats() {
    return this.makeRequest('/admin/stats');
  }

  async getAdminUsers() {
    return this.makeRequest('/admin/users');
  }

  // Auth
  async signup(payload) {
    return this.makeRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async login(payload) {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getProfile() {
    return this.makeRequest('/auth/profile');
  }

  async updateProfile(profileData) {
    return this.makeRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }
}

// Initialize API instance
const api = new JeevanSetuAPI();

// Utility Functions
function showNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
  notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
  notification.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hour(s) ago`;
  return date.toLocaleDateString();
}

function getPriorityBadge(priority) {
  const badges = {
    'urgent': 'bg-danger',
    'high': 'bg-warning text-dark',
    'medium': 'bg-info text-dark',
    'low': 'bg-secondary'
  };
  return badges[priority] || 'bg-secondary';
}

// Export for use in other files
window.JeevanSetuAPI = JeevanSetuAPI;
window.api = api;
window.showNotification = showNotification;
window.formatTimestamp = formatTimestamp;
window.getPriorityBadge = getPriorityBadge;
