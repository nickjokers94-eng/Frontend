// src/api.js - Korrigierte Backend-Integration

// API-Konfiguration für Backend-Integration
const API_BASE_URL = 'http://localhost:8080'; // Spring Boot Standard-Port

// Standard Spring Security Credentials
const SPRING_SECURITY_USER = 'user';
const SPRING_SECURITY_PASSWORD = 'passwordtest';

// --- Hilfsfunktionen ---
function isValidUsername(username) {
    return /^[a-zA-Z0-9_@.-]+$/.test(username) && username.length >= 3;
}

function isValidPassword(pw) {
    return typeof pw === 'string' && pw.length >= 3;
}

// Hilfsfunktion für API-Aufrufe mit HTTP Basic Auth
async function apiCall(endpoint, method = 'GET', data = null, requiresAuth = true) {
  const config = {
    method,
    headers: {},
    credentials: 'include'
  };
  
  if (requiresAuth) {
    config.headers['Authorization'] = 'Basic ' + btoa(SPRING_SECURITY_USER + ':' + SPRING_SECURITY_PASSWORD);
  }
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
    config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    config.body = new URLSearchParams(data);
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Ungültige Anmeldedaten');
      }
      if (response.status === 403) {
        throw new Error('Keine Berechtigung');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return {
      success: true,
      data: result
    };
  } catch (error) {
    throw {
      success: false,
      error: error.message
    };
  }
}

// --- API-Funktionen ---

/**
 * Registrierung eines neuen Users.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>}
 */
export async function registerAPI(username, password) {
    if (!isValidUsername(username)) {
        throw { success: false, error: 'Ungültiger Benutzername. Nur Buchstaben, Zahlen, _, @, . und - erlaubt.' };
    }
    if (!isValidPassword(password)) {
        throw { success: false, error: 'Passwort zu kurz (min. 3 Zeichen).' };
    }

    try {
        const result = await apiCall('/user/register', 'POST', { username, password }, false);
        return {
            success: true,
            message: 'Registrierung erfolgreich. Bitte warte auf Admin-Freischaltung.'
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Benutzer-Login - Korrigiert für echtes Backend
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>}
 */
export async function loginAPI(username, password) {
    try {
        const result = await apiCall('/user/login', 'POST', { username, password });
        
        return {
            success: true,
            data: {
                user: username,
                role: result.data.role || 'user',
                score: 0
            }
        };
    } catch (error) {
        throw {
            success: false,
            error: error.message || 'Ungültige Anmeldedaten'
        };
    }
}


export async function getHighscoresAPI() {
    try {
        const result = await apiCall('/highscores', 'GET');
        const formattedHighscores = result.data.map((entry, index) => ({
            rank: index + 1,
            name: entry.username,
            score: entry.score,
            date: entry.timestamp || new Date().toISOString()
        }));
        
        return {
            success: true,
            data: formattedHighscores
        };
    } catch (error) {
        throw error;
    }
}

export async function getWordsAPI() {
    try {
        const result = await apiCall('/words', 'GET');
        const formattedWords = result.data.map(entry => ({
            id: entry.wordid ? entry.wordid.toString() : entry.id?.toString() || Math.random().toString(),
            word: entry.word
        }));
        
        return {
            success: true,
            data: formattedWords
        };
    } catch (error) {
        throw error;
    }
}

export async function addWordAPI(word) {
    if (!word || word.length !== 5) {
        throw { success: false, error: 'Wort muss genau 5 Buchstaben haben.' };
    }
    
    try {
        const result = await apiCall('/words/addWord', 'POST', { word });
        return {
            success: true,
            message: 'Wort hinzugefügt.'
        };
    } catch (error) {
        throw error;
    }
}

export async function changePasswordAPI(username, oldPassword, newPassword) {
    if (!isValidPassword(newPassword)) {
        throw { success: false, error: 'Neues Passwort zu kurz (min. 3 Zeichen).' };
    }
    
    try {
        const result = await apiCall('/user/passwordChange', 'PUT', { 
            username,
            password: newPassword
        });
        return {
            success: true,
            message: 'Passwort erfolgreich geändert.'
        };
    } catch (error) {
        throw error;
    }
}

export async function unlockUserAPI(username) {
    try {
        const result = await apiCall('/user/unlockUser', 'PUT', { username });
        return {
            success: true,
            message: 'Benutzer freigeschaltet.'
        };
    } catch (error) {
        throw error;
    }
}

export async function deleteUserAPI(targetUser) {
    try {
        const result = await apiCall('/user/deleteUser', 'DELETE', { username: targetUser });
        return {
            success: true,
            message: 'Benutzer gelöscht.'
        };
    } catch (error) {
        throw error;
    }
}

export async function getUserAPI(userID) {
    try {
        const result = await apiCall(`/user?userID=${userID}`, 'GET');
        return {
            success: true,
            data: result.data
        };
    } catch (error) {
        throw error;
    }
}