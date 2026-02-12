const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = {
  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for cookies
      body: JSON.stringify({ email_id: email, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    return data;
  },

  async updatePassword(userId: string, newPassword: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId, newPassword }), // Ensure userId and newPassword are being sent correctly
      });
  
      const data = await response.json(); // Parse JSON response
  
      if (!response.ok) {
        // Check if response is not ok and throw an error
        throw new Error(data.message || 'Update password failed');
      }
  
      return data; // Return successful response
    } catch (error) {
      // Handle errors and log them for debugging
      console.error('Error updating password:', error);
      throw error; // Re-throw error after logging it
    }
  },


  async logout() {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    const data = await response.json();
    return data;
  },

  async verify() {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Not authenticated');
    }

    const data = await response.json();
    return data;
  },

  async createUser(payload: {
    name: string;
    designation?: string;
    email_id: string;
    mob_no?: string;
    user_code?: string;
    role: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Create user failed');
    }

    return data;
  },

  async bulkCreateUsers(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/users/bulk`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Bulk create failed');
    }

    return data;
  },

  async getProfile() {
    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load profile');
    }

    return data;
  },

  async updateProfile(payload: {
    name: string;
    email_id: string;
    designation?: string;
    mob_no?: string;
    user_code?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update profile');
    }

    return data;
  },

  async createIDRMaster(payload: {
    plazas: Array<{ plaza_name: string; req_id: string }>;
    due_date: string;
    from_date: string;
    to_date: string;
    scope_name: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/idr/master`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create IDR master records');
    }

    return data;
  },

  async getAllUsers() {
    const response = await fetch(`${API_BASE_URL}/api/users/all`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch users');
    }

    return data;
  },

  async getClients() {
    const response = await fetch(`${API_BASE_URL}/api/users/clients`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch clients');
    }

    return data;
  },

  async assignPlaza(payload: {
    plaza_name: string;
    email_id: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/users/assign-plaza`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to assign plaza');
    }

    return data;
  },

  async createScope(payload: {
    scope_name: string;
    required_documents: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/scope`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create scope');
    }

    return data;
  },

  async getScopes() {
    const response = await fetch(`${API_BASE_URL}/api/scope`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch scopes');
    }

    return data;
  },

  async getScopeByName(scope_name: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/scope?scope_name=${encodeURIComponent(scope_name)}`,
      {
        method: 'GET',
        credentials: 'include',
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch scope');
    }

    return data;
  },

  async getPlazas() {
    const response = await fetch(`${API_BASE_URL}/api/users/plazas`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch plazas');
    }

    return data;
  },

  async getPlazaAssignments() {
    const response = await fetch(`${API_BASE_URL}/api/users/plaza-assignments`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch plaza assignments');
    }

    return data;
  },

  async getUniqueScopes() {
    const response = await fetch(`${API_BASE_URL}/api/idr/unique-scopes`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch unique scopes');
    }

    return data;
  },

  async getSubmittedRequests(scope_name: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/idr/submitted-requests?scope_name=${encodeURIComponent(scope_name)}`,
      {
        method: 'GET',
        credentials: 'include',
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch submitted requests');
    }

    return data;
  },

  async getClientRequests() {
    const response = await fetch(`${API_BASE_URL}/api/idr/client-requests`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch client requests');
    }

    return data;
  },

  async getDocumentsByReqId(req_id: string) {
    const response = await fetch(`${API_BASE_URL}/api/idr/documents/${encodeURIComponent(req_id)}`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch documents');
    }

    return data;
  },

  async uploadDocument(req_id: string, document_type: string, year: string, month: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('req_id', req_id);
    formData.append('document_type', document_type);
    formData.append('year', year);
    formData.append('month', month);

    const response = await fetch(`${API_BASE_URL}/api/idr/upload-document`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload document');
    }

    return data;
  },

  async replaceDocument(document_id: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_id', String(document_id));

    const response = await fetch(`${API_BASE_URL}/api/idr/replace-document`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to replace document');
    }

    return data;
  },

  async deleteDocument(document_id: string, req_id: string, document_type: string, year: string, month: string) {
    const params = new URLSearchParams({
      document_id,
      req_id,
      document_type,
      year,
      month,
    });

    const response = await fetch(`${API_BASE_URL}/api/idr/delete-document?${params}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete document');
    }

    return data;
  },

  async getDocumentCounts(req_ids: string[]) {
    const params = new URLSearchParams({
      req_ids: req_ids.join(','),
    });

    const response = await fetch(`${API_BASE_URL}/api/idr/document-counts?${params}`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch document counts');
    }

    return data;
  },

  async deleteRequest(scope_name: string, from_date: string, to_date: string) {
    const params = new URLSearchParams({
      scope_name,
      from_date,
      to_date,
    });

    const response = await fetch(`${API_BASE_URL}/api/idr/request?${params.toString()}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete request');
    }

    return data;
  },

  async getPlazaDocuments(req_id: string, year: string, month: string) {
    const params = new URLSearchParams({
      req_id,
      year,
      month,
    });

    const response = await fetch(`${API_BASE_URL}/api/idr/plaza-documents?${params}`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch plaza documents');
    }

    return data;
  },

  async rejectDocuments(document_ids: number[], reason: string) {
    const response = await fetch(`${API_BASE_URL}/api/idr/reject-documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ document_ids, reason }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to reject documents');
    }

    return data;
  },

  async getStatistics() {
    const response = await fetch(`${API_BASE_URL}/api/users/statistics`, {
      method: 'GET',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch statistics');
    }

    return data;
  },
};

