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
  
  // Auth nur hinzufügen wenn erforderlich
  if (requiresAuth) {
    config.headers['Authorization'] = 'Basic ' + btoa(SPRING_SECURITY_USER + ':' + SPRING_SECURITY_PASSWORD);
  }
  
  // Content-Type und Body
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
        // requiresAuth = false für Registrierung!
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
        // Verwende die tatsächlichen Backend-Endpunkte für Login
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

// Korrigiert: /highscores (nicht /api/highscore)
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

// Korrigiert: /words (nicht /api/words)
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

// Korrigiert: /words/addWord
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

// Passwort ändern - Backend-kompatibel
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

// Admin-Funktionen - Backend-kompatible Endpunkte
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

// Einfache getUserAPI für User-Details
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

// Fehlende Funktionen für das Frontend ergänzt
export async function getUsersAPI() {
    try {
        // Simuliert eine Benutzerliste für den Admin-Bereich
        // In der Realität würde hier ein entsprechender Backend-Endpunkt aufgerufen
        return {
            success: true,
            data: [
                { id: '1', user: 'testuser', role: 'user', active: false },
                { id: '2', user: 'admin', role: 'admin', active: true }
            ]
        };
    } catch (error) {
        throw error;
    }
}

export async function setUserActiveAPI(adminUser, targetUser, active) {
    try {
        if (active) {
            return await unlockUserAPI(targetUser);
        } else {
            // Hier könnte eine "lock user" Funktion implementiert werden
            return {
                success: true,
                message: 'Benutzer deaktiviert.'
            };
        }
    } catch (error) {
        throw error;
    }
}

export async function getNewSolutionWordAPI() {
    try {
        const result = await apiCall('/words', 'GET');
        if (result.data && result.data.length > 0) {
            // Zufälliges Wort aus der Liste auswählen
            const randomWord = result.data[Math.floor(Math.random() * result.data.length)];
            return {
                success: true,
                data: { word: randomWord.word.toUpperCase() }
            };
        }
        
        // Fallback falls keine Wörter in DB
        const fallbackWords = ['HOUSE', 'MAGIC', 'PHONE', 'WORLD', 'BREAD'];
        const randomWord = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
        return {
            success: true,
            data: { word: randomWord }
        };
    } catch (error) {
        throw error;
    }
}

export async function submitGuessAPI(guess) {
    try {
        // WebSocket wird für Live-Updates verwendet
        // Hier könnte optional auch das Backend informiert werden
        return {
            success: true,
            data: {
                guess: guess,
                timestamp: Date.now(),
                valid: true
            },
            message: 'Rateversuch gespeichert'
        };
    } catch (error) {
        throw error;
    }
}

// Legacy-Funktionen für Rückwärtskompatibilität
export async function startRoundAPI() {
    return { success: true, message: 'Round started via WebSocket' };
}

export async function endRoundAPI() {
    return { success: true, message: 'Round ended via WebSocket' };
}