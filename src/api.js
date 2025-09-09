// src/api.js - Korrigierte Backend-Integration

// API-Konfiguration für Backend-Integration
const API_BASE_URL = 'http://localhost:8080'; 

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
  
  // Auth NUR hinzufügen wenn explizit erforderlich
  if (requiresAuth === true) {
    config.headers['Authorization'] = 'Basic ' + btoa(SPRING_SECURITY_USER + ':' + SPRING_SECURITY_PASSWORD);
  }
  
  // Content-Type und Body
  if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
    config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    config.body = new URLSearchParams(data);
  }
  
  try {
    console.log(`🌐 API-Call: ${method} ${endpoint}`, data);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Antwort-Text für Debugging abrufen
    const responseText = await response.text();
    console.log(`📨 Response ${response.status}:`, responseText);
    
    if (!response.ok) {
      console.error(`API-Fehler ${response.status}:`, responseText);
      
      if (response.status === 401) {
        throw new Error('Ungültige Anmeldedaten');
      }
      if (response.status === 403) {
        throw new Error('Zugriff verweigert - Keine Berechtigung');
      }
      if (response.status === 404) {
        throw new Error('Endpoint nicht gefunden');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // JSON parsen nur wenn Inhalt vorhanden
    let result;
    if (responseText.trim()) {
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        // Falls kein JSON, als Text zurückgeben
        result = responseText;
      }
    } else {
      result = null;
    }
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('API-Call Fehler:', error);
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
        // requiresAuth explizit auf false setzen für Registrierung
        const result = await apiCall('/user/register', 'POST', { username, password }, false);
        
        if (result.data && result.data.success) {
            return {
                success: true,
                message: result.data.message || 'Registrierung erfolgreich. Bitte warte auf Admin-Freischaltung.'
            };
        } else {
            throw new Error(result.data?.error || 'Registrierung fehlgeschlagen');
        }
    } catch (error) {
        throw error;
    }
}

/**
 * Benutzer-Login - Nur API-Call, kein WebSocket
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>}
 */
export async function loginAPI(username, password) {
    if (!isValidUsername(username)) {
        throw { success: false, error: 'Ungültiger Benutzername.' };
    }
    if (!isValidPassword(password)) {
        throw { success: false, error: 'Ungültiges Passwort.' };
    }

    try {
        // requiresAuth explizit auf false setzen für Login
        const result = await apiCall('/user/login', 'POST', { username, password }, false);
        
        if (result.data && result.data.success) {
            return {
                success: true,
                data: {
                    user: result.data.user,
                    role: result.data.role || 'user',
                    score: result.data.score || 0
                }
            };
        } else {
            throw new Error(result.data?.error || 'Login fehlgeschlagen');
        }
    } catch (error) {
        throw {
            success: false,
            error: error.error || 'Ungültige Anmeldedaten'
        };
    }
}

export async function getHighscoresAPI() {
    try {
        const result = await apiCall('/highscores', 'GET');
        
        if (result.data && Array.isArray(result.data)) {
            const formattedHighscores = result.data.map((entry, index) => ({
                rank: index + 1,
                name: entry.username,
                score: entry.score,
                date: entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : new Date().toLocaleDateString()
            }));
            
            return {
                success: true,
                data: formattedHighscores
            };
        } else {
            return {
                success: true,
                data: []
            };
        }
    } catch (error) {
        throw error;
    }
}

export async function getWordsAPI() {
    try {
        const result = await apiCall('/words', 'GET');
        
        if (result.data && Array.isArray(result.data)) {
            const formattedWords = result.data.map(entry => ({
                id: entry.wordid ? entry.wordid.toString() : entry.id?.toString() || Math.random().toString(),
                word: entry.word
            }));
            
            return {
                success: true,
                data: formattedWords
            };
        } else {
            return {
                success: true,
                data: []
            };
        }
    } catch (error) {
        throw error;
    }
}

export async function addWordAPI(word) {
    if (!word || word.length < 4) {
        throw { success: false, error: 'Wort muss mindestens 4 Buchstaben haben.' };
    }
    
    try {
        const result = await apiCall('/words/addWord', 'POST', { word });
        
        if (result.data && result.data.success !== false) {
            return {
                success: true,
                message: 'Wort hinzugefügt.'
            };
        } else {
            throw new Error(result.data?.error || 'Wort konnte nicht hinzugefügt werden');
        }
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
        
        if (result.data && result.data.success !== false) {
            return {
                success: true,
                message: 'Passwort erfolgreich geändert.'
            };
        } else {
            throw new Error(result.data?.error || 'Passwort konnte nicht geändert werden');
        }
    } catch (error) {
        throw error;
    }
}

export async function unlockUserAPI(username) {
    try {
        const result = await apiCall('/user/unlockUser', 'PUT', { username });
        
        if (result.data && result.data.success !== false) {
            return {
                success: true,
                message: 'Benutzer freigeschaltet.'
            };
        } else {
            throw new Error(result.data?.error || 'Benutzer konnte nicht freigeschaltet werden');
        }
    } catch (error) {
        throw error;
    }
}

export async function deleteUserAPI(targetUser) {
    try {
        const result = await apiCall('/user/deleteUser', 'DELETE', { username: targetUser });
        
        if (result.data && result.data.success !== false) {
            return {
                success: true,
                message: 'Benutzer gelöscht.'
            };
        } else {
            throw new Error(result.data?.error || 'Benutzer konnte nicht gelöscht werden');
        }
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

// Korrigierte Implementierung für alle User
export async function getUsersAPI() {
    try {
        const result = await apiCall('/users', 'GET');
        
        if (result.data && Array.isArray(result.data)) {
            const formattedUsers = result.data.map(user => ({
                id: user.userID?.toString() || Math.random().toString(),
                user: user.username,
                role: user.role,
                active: user.status === 'unlocked'
            }));
            
            return {
                success: true,
                data: formattedUsers
            };
        } else {
            return {
                success: true,
                data: []
            };
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Benutzerliste:', error);
        // Fallback für Entwicklung
        return {
            success: true,
            data: []
        };
    }
}

export async function setUserActiveAPI(adminUser, targetUser, active) {
    try {
        if (active) {
            return await unlockUserAPI(targetUser);
        } else {
            // TODO: Implementiere deaktivieren falls nötig
            return {
                success: true,
                message: 'Benutzer deaktiviert.'
            };
        }
    } catch (error) {
        throw error;
    }
}

// Neue Methode für Punktemanagement
export async function saveScoreAPI(username, score) {
    try {
        const result = await apiCall('/user/saveScore', 'POST', { username, score });
        
        if (result.data && result.data.success !== false) {
            return {
                success: true,
                message: 'Score gespeichert.'
            };
        } else {
            throw new Error(result.data?.error || 'Score konnte nicht gespeichert werden');
        }
    } catch (error) {
        throw error;
    }
}

// Neue Methode für Wort löschen
export async function deleteWordAPI(word) {
    try {
        const result = await apiCall('/words/deleteWord', 'DELETE', { word });
        
        if (result.data && result.data.success !== false) {
            return {
                success: true,
                message: 'Wort gelöscht.'
            };
        } else {
            throw new Error(result.data?.error || 'Wort konnte nicht gelöscht werden');
        }
    } catch (error) {
        throw error;
    }
}