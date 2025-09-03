// src/api.js - Echte Backend-Integration

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
 * Benutzer-Login
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>}
 */
export async function loginAPI(username, password) {
    try {
        const testResponse = await fetch(`${API_BASE_URL}/highscores`, {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + btoa(SPRING_SECURITY_USER + ':' + SPRING_SECURITY_PASSWORD),
                'Content-Type': 'application/json'
            }
        });

        if (!testResponse.ok) {
            if (testResponse.status === 401) {
                throw new Error('Ungültige Anmeldedaten');
            }
            throw new Error('Anmeldung fehlgeschlagen');
        }

        // Erfolgreiche Authentifizierung - User-Objekt erstellen
        return {
            success: true,
            data: {
                user: username,
                role: username === 'admin' ? 'admin' : 'user',
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

/**
 * Highscore-Liste abrufen
 * @returns {Promise<object>}
 */
export async function getHighscoresAPI() {
    try {
        const result = await apiCall('/highscores', 'GET');
        const formattedHighscores = result.data.map((entry, index) => ({
            rank: index + 1,
            name: entry.username,
            score: entry.score,
            date: '2024-05-20'
        }));
        
        return {
            success: true,
            data: formattedHighscores
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Wortliste abrufen (für Admins)
 * @param {string} adminUser - Username des Admins
 * @returns {Promise<object>}
 */
export async function getWordsAPI(adminUser) {
    try {
        const result = await apiCall('/words', 'GET');
        const formattedWords = result.data.map(entry => ({
            id: entry.wordid.toString(),
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

/**
 * Wort hinzufügen (Admin-Funktion)
 * @param {string} adminUser - Username des Admins
 * @param {string} word - Das hinzuzufügende Wort
 * @returns {Promise<object>}
 */
export async function addWordAPI(adminUser, word) {
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

/**
 * Admin: User freischalten
 * @param {string} adminUser - Username des Admins
 * @param {string} targetUser - Username des freizuschaltenden Users
 * @param {boolean} active - true = freischalten, false wird ignoriert (nutze deleteUserAPI)
 * @returns {Promise<object>}
 */
export async function setUserActiveAPI(adminUser, targetUser, active) {
    if (!active) {
        return deleteUserAPI(adminUser, targetUser);
    }
    
    try {
        const result = await apiCall('/user/unlockUser', 'PUT', { username: targetUser });
        return {
            success: true,
            message: 'Benutzer freigeschaltet.'
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Admin: User löschen
 * @param {string} adminUser - Username des Admins
 * @param {string} targetUser - Username des zu löschenden Users
 * @returns {Promise<object>}
 */
export async function deleteUserAPI(adminUser, targetUser) {
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

/**
 * Passwort ändern
 * @param {string} username - Username
 * @param {string} oldPassword - Altes Passwort (wird ignoriert, da Backend es nicht braucht)
 * @param {string} newPassword - Neues Passwort
 * @returns {Promise<object>}
 */
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

/**
 * User-Details abrufen (für Admin-Panel)
 * @param {number} userID - User ID
 * @returns {Promise<object>}
 */
export async function getUserAPI(userID) {
    try {
        const result = await apiCall(`/user?userID=${userID}`, 'GET');
        const formattedUser = {
            id: result.data.userID.toString(),
            user: result.data.username,
            role: result.data.role,
            active: result.data.status === 'unlocked'
        };
        
        return {
            success: true,
            data: formattedUser
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Neues Lösungswort aus der Backend-Wortliste abrufen
 * @returns {Promise<object>}
 */
export async function getNewSolutionWordAPI() {
    try {
        const wordsResult = await getWordsAPI();
        const words = wordsResult.data;
        
        if (words.length === 0) {
            throw new Error('Keine Wörter in der Datenbank verfügbar');
        }
        
        const randomWord = words[Math.floor(Math.random() * words.length)];
        
        return {
            success: true,
            data: { word: randomWord.word }
        };
    } catch (error) {
        throw error;
    }
}

// === RUNDENVERWALTUNG-APIs ===

/**
 * Neue Runde starten (Admin)
 * @param {string} adminUser - Username des Admins
 * @returns {Promise<object>}
 */
export async function startRoundAPI(adminUser) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                data: {
                    roundId: Date.now(),
                    wordLength: 5,
                    maxGuesses: 6,
                    timeLimit: 300
                },
                message: 'Neue Runde gestartet'
            });
        }, 500);
    });
}

/**
 * Aktuelle Runde abfragen
 * @returns {Promise<object>}
 */
export async function getCurrentRoundAPI() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                data: {
                    roundId: 123456,
                    status: 'active',
                    startTime: Date.now() - 60000,
                    endTime: null,
                    wordLength: 5,
                    maxGuesses: 6,
                    timeLimit: 300
                }
            });
        }, 200);
    });
}

/**
 * Rateversuch abgeben
 * @param {string} guess - Der Rateversuch
 * @returns {Promise<object>}
 */
export async function submitGuessAPI(guess) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (guess.length !== 5) {
                reject({ success: false, error: 'Rateversuch muss 5 Buchstaben haben' });
                return;
            }
            resolve({
                success: true,
                data: {
                    guess: guess,
                    timestamp: Date.now(),
                    valid: true
                },
                message: 'Rateversuch gespeichert'
            });
        }, 300);
    });
}

/**
 * Alle Rateversuche der aktuellen Runde abrufen
 * @returns {Promise<object>}
 */
export async function getAllGuessesAPI() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                data: [
                    { user: 'player1', guess: 'hallo', timestamp: Date.now() - 120000 },
                    { user: 'player2', guess: 'welt', timestamp: Date.now() - 90000 }
                ]
            });
        }, 200);
    });
}

/**
 * Runde beenden (Admin)
 * @param {string} adminUser - Username des Admins
 * @returns {Promise<object>}
 */
export async function endRoundAPI(adminUser) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                data: {
                    roundId: 123456,
                    solution: 'LÖSUNG',
                    endTime: Date.now(),
                    winners: ['player1', 'player2']
                },
                message: 'Runde beendet'
            });
        }, 500);
    });
}

// === BENUTZERVERWALTUNG-APIs ===

/**
 * User-Liste abrufen (Admin)
 * @param {string} adminUser - Username des Admins
 * @returns {Promise<object>}
 */
export async function getUsersAPI(adminUser) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                data: [
                    { id: '1', user: 'pendingUser1', role: 'user', active: false, email: 'user1@test.com' },
                    { id: '2', user: 'pendingUser2', role: 'user', active: false, email: 'user2@test.com' },
                    { id: '3', user: 'activeUser1', role: 'user', active: true, email: 'active@test.com' }
                ]
            });
        }, 300);
    });
}

/**
 * User anlegen (Admin)
 * @param {string} adminUser - Username des Admins
 * @param {object} userData - User-Daten
 * @returns {Promise<object>}
 */
export async function createUserAPI(adminUser, userData) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (!userData.username || !userData.password) {
                reject({ success: false, error: 'Username und Passwort erforderlich' });
                return;
            }
            resolve({
                success: true,
                data: { id: Date.now(), username: userData.username },
                message: 'User erfolgreich erstellt'
            });
        }, 500);
    });
}

/**
 * User bearbeiten (Admin)
 * @param {string} adminUser - Username des Admins
 * @param {string} targetUser - Username des zu bearbeitenden Users
 * @param {object} updates - Zu aktualisierende Daten
 * @returns {Promise<object>}
 */
export async function updateUserAPI(adminUser, targetUser, updates) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                message: 'User erfolgreich aktualisiert'
            });
        }, 400);
    });
}

// === WORTLISTE-APIs ===

/**
 * Wort löschen (Admin)
 * @param {string} adminUser - Username des Admins
 * @param {string} wordId - ID des zu löschenden Worts
 * @returns {Promise<object>}
 */
export async function deleteWordAPI(adminUser, wordId) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                message: 'Wort erfolgreich gelöscht'
            });
        }, 400);
    });
}

/**
 * Wort bearbeiten (Admin)
 * @param {string} adminUser - Username des Admins
 * @param {string} wordId - ID des zu bearbeitenden Worts
 * @param {string} newWord - Das neue Wort
 * @returns {Promise<object>}
 */
export async function updateWordAPI(adminUser, wordId, newWord) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (!newWord || newWord.length !== 5) {
                reject({ success: false, error: 'Wort muss genau 5 Buchstaben haben' });
                return;
            }
            resolve({
                success: true,
                message: 'Wort erfolgreich aktualisiert'
            });
        }, 400);
    });
}