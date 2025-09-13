// src/api.js - Echte Backend-Integration

// API-Konfiguration für Backend-Integration
// erstellt von: Nick Jokers
const API_BASE_URL = 'http://localhost:8080'; // Spring Boot Standard-Port

// Standard Spring Security Credentials
// erstellt von: Nick Jokers
const SPRING_SECURITY_USER = 'user';
const SPRING_SECURITY_PASSWORD = 'passwordtest';

// --- Hilfsfunktionen ---

/**
 * Prüft, ob der Benutzername gültig ist.
 * @param {string} username - Der zu prüfende Benutzername
 * @returns {boolean} true, wenn gültig
 * Funktion: Erlaubt Buchstaben, Zahlen, _, @, . und - und mind. 3 Zeichen.
 * erstellt von: Nick Jokers
 */
function isValidUsername(username) {
    return /^[a-zA-Z0-9_@.-]+$/.test(username) && username.length >= 3;
}

/**
 * Prüft, ob das Passwort gültig ist.
 * @param {string} pw - Das zu prüfende Passwort
 * @returns {boolean} true, wenn gültig
 * Funktion: Mindestens 3 Zeichen, String.
 * erstellt von: Nick Jokers
 */
function isValidPassword(pw) {
    return typeof pw === 'string' && pw.length >= 3;
}

/**
 * Führt einen API-Aufruf mit HTTP Basic Auth durch.
 * @param {string} endpoint - API-Endpunkt
 * @param {string} method - HTTP-Methode ('GET', 'POST', etc.)
 * @param {object|null} data - Zu sendende Daten
 * @param {boolean} requiresAuth - true, wenn Authentifizierung benötigt wird
 * @returns {Promise<object>} Antwortobjekt
 * Funktion: Baut Request zusammen, führt ihn aus und gibt das Ergebnis zurück.
 * erstellt von: Nick Jokers
 */
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
 * @param {string} username - Benutzername
 * @param {string} password - Passwort
 * @returns {Promise<object>} Ergebnisobjekt
 * Funktion: Registriert einen neuen User über das Backend.
 * erstellt von: Nick Jokers
 */
export async function registerAPI(username, password) {
    if (!isValidUsername(username)) {
        throw { success: false, error: 'Ungültiger Benutzername. Nur Buchstaben, Zahlen, _, @, . und - erlaubt.' };
    }
    if (!isValidPassword(password)) {
        throw { success: false, error: 'Passwort zu kurz (min. 3 Zeichen).' };
    }

    const result = await apiCall('/user/register', 'POST', { username, password }, false);
    if (result.data === false) {
        throw { success: false, error: 'Benutzername existiert bereits.' };
    }
    return {
        success: true,
        message: 'Registrierung erfolgreich. Bitte warte auf Admin-Freischaltung.'
    };
}

/**
 * Benutzer-Login.
 * @param {string} username - Benutzername
 * @param {string} password - Passwort
 * @returns {Promise<object>} Ergebnisobjekt
 * Funktion: Meldet den User am Backend an.
 * erstellt von: Nick Jokers
 */
export async function loginAPI(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ username, password })
        });

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Warten Sie auf Freischaltung durch den Admin');
            }
            if (response.status === 401) {
                throw new Error('Ungültige Anmeldedaten');
            }
            throw new Error('Anmeldung fehlgeschlagen');
        }

        const result = await response.json();
        return {
            success: true,
            data: {
                user: result.username,
                role: result.role,
                status: result.status,
                id: result.userid
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
 * Highscore-Liste abrufen.
 * @param {string|null} currentUserName - Aktueller Benutzername (optional)
 * @returns {Promise<object>} Highscore-Liste
 * Funktion: Holt und sortiert die Highscores, markiert eigenen Rang.
 * erstellt von: Nick Jokers
 */
export async function getHighscoresAPI(currentUserName = null) {
    try {
        const result = await apiCall('/highscores/all', 'GET');
        // Sortiere nach Score absteigend
        const sorted = result.data
            .map(entry => ({
                name: entry.username,
                score: entry.score
            }))
            .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
        // Füge Rang hinzu
        sorted.forEach((entry, idx) => entry.rank = idx + 1);
        // Top 10
        const top10 = sorted.slice(0, 10);
        // Eigener Rang suchen
        let ownEntry = null;
        if (currentUserName) {
            ownEntry = sorted.find(entry => entry.name === currentUserName);
        }
        // Wenn eigener Rang nicht in Top 10, füge ihn ans Ende an
        let highscoresToShow = [...top10];
        if (ownEntry && !top10.some(entry => entry.name === ownEntry.name)) {
            highscoresToShow.push({ ...ownEntry, isOwn: true });
        }
        return {
            success: true,
            data: highscoresToShow
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Wortliste abrufen (für Admins).
 * @param {string} adminUser - Username des Admins
 * @returns {Promise<object>} Wortliste
 * Funktion: Holt alle Wörter aus dem Backend.
 * erstellt von: Nick Jokers
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
 * Wort hinzufügen (Admin-Funktion).
 * @param {string} adminUser - Username des Admins
 * @param {string} word - Das hinzuzufügende Wort
 * @returns {Promise<object>} Ergebnisobjekt
 * Funktion: Fügt ein neues Wort hinzu, prüft auf Gültigkeit.
 * erstellt von: Nick Jokers
 */
export async function addWordAPI(adminUser, word) {
    if (!word || word.length !== 5) {
        throw { success: false, error: 'Wort muss genau 5 Buchstaben haben.' };
    }
    if (!/^[A-Za-zÄÖÜäöüß]+$/.test(word)) {
        throw { success: false, error: 'Nur Buchstaben (keine Zahlen/Sonderzeichen) erlaubt.' };
    }
    const result = await apiCall('/words/addWord', 'POST', { word });
    if (result.data === false) {
        throw { success: false, error: 'Das Wort existiert bereits.' };
    }
    return {
        success: true,
        message: 'Wort hinzugefügt.'
    };
}

/**
 * Admin: User freischalten.
 * @param {string} adminUser - Username des Admins
 * @param {string} targetUser - Username des freizuschaltenden Users
 * @param {boolean} active - true = freischalten, false wird ignoriert (nutze deleteUserAPI)
 * @returns {Promise<object>} Ergebnisobjekt
 * Funktion: Schaltet einen User frei oder löscht ihn.
 * erstellt von: Nick Jokers
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
 * Admin: User löschen.
 * @param {string} adminUser - Username des Admins
 * @param {string} targetUser - Username des zu löschenden Users
 * @returns {Promise<object>} Ergebnisobjekt
 * Funktion: Löscht einen User im Backend.
 * erstellt von: Nick Jokers
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
 * Passwort ändern.
 * @param {string} username - Username
 * @param {string} oldPassword - Altes Passwort (wird ignoriert, da Backend es nicht braucht)
 * @param {string} newPassword - Neues Passwort
 * @returns {Promise<object>} Ergebnisobjekt
 * Funktion: Ändert das Passwort eines Users.
 * erstellt von: Nick Jokers
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
 * User-Details abrufen (für Admin-Panel).
 * @param {number} userID - User ID
 * @returns {Promise<object>} Userdaten
 * Funktion: Holt die Details eines Users.
 * erstellt von: Nick Jokers
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
 * Neues Lösungswort aus der Backend-Wortliste abrufen.
 * @returns {Promise<object>} Lösungswort
 * Funktion: Holt ein zufälliges Wort aus der Wortliste.
 * erstellt von: Nick Jokers
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
 * Neue Runde starten (Admin).
 * @param {string} adminUser - Username des Admins
 * @returns {Promise<object>} Rundeninfos
 * Funktion: Startet eine neue Runde (Demo-Implementierung).
 * erstellt von: Nick Jokers
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
 * Aktuelle Runde abfragen.
 * @returns {Promise<object>} Rundeninfos
 * Funktion: Holt die aktuelle Runde (Demo-Implementierung).
 * erstellt von: Nick Jokers
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
 * Rateversuch abgeben.
 * @param {string} guess - Der Rateversuch
 * @returns {Promise<object>} Ergebnisobjekt
 * Funktion: Simuliert das Absenden eines Rateversuchs.
 * erstellt von: Nick Jokers
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
 * Alle Rateversuche der aktuellen Runde abrufen.
 * @returns {Promise<object>} Liste der Rateversuche
 * Funktion: Holt alle bisherigen Rateversuche (Demo).
 * erstellt von: Nick Jokers
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
 * Runde beenden (Admin).
 * @param {string} adminUser - Username des Admins
 * @returns {Promise<object>} Ergebnisobjekt
 * Funktion: Beendet die aktuelle Runde (Demo).
 * erstellt von: Nick Jokers
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
 * User-Liste abrufen (Admin).
 * @param {string} adminUser - Username des Admins
 * @returns {Promise<object>} Liste der User
 * Funktion: Holt alle User für das Admin-Panel.
 * erstellt von: Nick Jokers
 */
export async function getUsersAPI(adminUser) {
    try {
        const result = await apiCall('/user/lockedUsers', 'GET');
        const formattedUsers = result.data.map(entry => ({
            id: entry.userid?.toString() || entry.username, // Username als Fallback!
            user: entry.username,
            role: entry.role,
            active: entry.status === 'active'
        }));
        return {
            success: true,
            data: formattedUsers
        };
    } catch (error) {
        throw error;
    }
}

/**
 * User anlegen (Admin).
 * @param {string} adminUser - Username des Admins
 * @param {object} userData - User-Daten
 * @returns {Promise<object>} Ergebnisobjekt
 * Funktion: Legt einen neuen User an (Demo).
 * erstellt von: Nick Jokers
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
 * User bearbeiten (Admin).
 * @param {string} adminUser - Username des Admins
 * @param {string} targetUser - Username des zu bearbeitenden Users
 * @param {object} updates - Zu aktualisierende Daten
 * @returns {Promise<object>} Ergebnisobjekt
 * Funktion: Aktualisiert Userdaten (Demo).
 * erstellt von: Nick Jokers
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

/**
 * Rolle eines Users aktualisieren (Admin).
 * @param {string} adminUser - Username des Admins
 * @param {string} targetUser - Username des Users
 * @param {string} newRole - Neue Rolle
 * @returns {Promise<object>} Ergebnisobjekt
 * Funktion: Setzt die Rolle eines Users im Backend.
 * erstellt von: Nick Jokers
 */
export async function updateUserRoleAPI(adminUser, targetUser, newRole) {
    try {
        const result = await apiCall('/user/updateRole', 'PUT', { username: targetUser, role: newRole });
        return {
            success: true,
            message: 'Rolle aktualisiert.'
        };
    } catch (error) {
        throw error;
    }
}

// === WORTLISTE-APIs ===

/**
 * Wort löschen (Admin).
 * @param {string} adminUser - Username des Admins
 * @param {string} word - Das zu löschende Wort
 * @returns {Promise<object>} Ergebnisobjekt
 * Funktion: Löscht ein Wort anhand der Eingabe.
 * erstellt von: Nick Jokers
 */
export async function deleteWordByInputAPI(adminUser, word) {
    if (!word || word.length !== 5) {
        throw { success: false, error: 'Wort muss genau 5 Buchstaben haben.' };
    }
    const result = await apiCall('/words/deleteWord', 'DELETE', { word });
    if (result.data === false) {
        throw { success: false, error: 'Das Wort existiert nicht.' };
    }
    return {
        success: true,
        message: 'Wort erfolgreich gelöscht.'
    };
}

/**
 * Wort bearbeiten (Admin).
 * @param {string} adminUser - Username des Admins
 * @param {string} wordId - ID des zu bearbeitenden Worts
 * @param {string} newWord - Das neue Wort
 * @returns {Promise<object>} Ergebnisobjekt
 * Funktion: Aktualisiert ein Wort (Demo).
 * erstellt von: Nick Jokers
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