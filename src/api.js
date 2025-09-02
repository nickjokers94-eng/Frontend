// src/api.js

// --- Hilfsfunktionen für IDs ---
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// --- Mock Database mit IDs ---
let mockUsers = [
    { id: generateId(), user: 'admin@example.com', password: 'admin', score: 2000, role: 'admin', active: true },
    { id: generateId(), user: 'NickJokers', password: '123', score: 1250, role: 'admin', active: true },
    { id: generateId(), user: 'user2@example.com', password: 'abc', score: 1100, role: 'user', active: false },
    { id: generateId(), user: 'TestUser', password: 'def', score: 950, role: 'user', active: true },
];

let wordList = [
    { id: generateId(), word: 'hallo' },
    { id: generateId(), word: 'apfel' },
    { id: generateId(), word: 'sonne' },
    { id: generateId(), word: 'wolke' },
    { id: generateId(), word: 'vogel' },
    { id: generateId(), word: 'audio' },
    { id: generateId(), word: 'brief' },
    { id: generateId(), word: 'radio' }
];

let solutionWord = '';
let lastSolutionWord = '';
let rounds = [];
let currentRound = null;

// --- Hilfsfunktionen ---
function hashPassword(pw) {
    // Platzhalter für echte Verschlüsselung
    return 'hashed_' + pw;
}
function isEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidUsername(username) {
    return /^[a-zA-Z0-9_@.-]+$/.test(username) && username.length >= 3;
}
function isValidPassword(pw) {
    return typeof pw === 'string' && pw.length >= 3;
}
function isValidWord(word) {
    return wordList.some(w => w.word === word.toLowerCase());
}
function getWordById(id) {
    return wordList.find(w => w.id === id);
}
function getUserById(id) {
    return mockUsers.find(u => u.id === id);
}

// API-Konfiguration für Backend-Integration
const API_BASE_URL = 'http://localhost:8080'; // Spring Boot Standard-Port
const USE_MOCK = false; // Auf false setzen für echtes Backend

// Hilfsfunktion für API-Calls
async function apiCall(endpoint, method = 'GET', data = null) {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  };
  
  if (data && (method === 'POST' || method === 'PUT')) {
    config.body = new URLSearchParams(data);
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  // Backend gibt boolean zurück, wir formatieren es für Frontend
  const result = await response.json();
  return {
    success: result === true || result.success === true,
    data: result,
    message: result === true ? 'Erfolgreich' : result.message || 'Aktion ausgeführt'
  };
}

// --- API Funktionen ---

/**
 * Registrierung eines neuen Users.
 * @param {string} user
 * @param {string} password
 * @returns {Promise<object>}
 */
export function registerAPI(user, password) {
    if (USE_MOCK) {
        return new Promise((resolve, reject) => {
            if (!isValidUsername(user)) return reject({ success: false, error: 'Ungültiger Benutzername. Nur Buchstaben, Zahlen, _, @, . und - erlaubt.' });
            if (!isValidPassword(password)) return reject({ success: false, error: 'Passwort zu kurz (min. 3 Zeichen).' });
            if (mockUsers.find(u => u.user === user)) return reject({ success: false, error: 'Benutzername bereits registriert.' });
            const newUser = {
                id: generateId(),
                user,
                password: hashPassword(password),
                score: 0,
                role: 'user',
                active: false // Muss erst freigeschaltet werden
            };
            mockUsers.push(newUser);
            resolve({ success: true, message: 'Registrierung erfolgreich. Bitte warte auf Freischaltung.' });
        });
    } else {
        // Backend-Integration - einfach boolean verarbeiten
        return fetch(`${API_BASE_URL}/user/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: user, password })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Registrierung fehlgeschlagen (HTTP ${response.status})`);
            }
            return response.json(); // Backend gibt boolean zurück
        })
        .then(success => {
            // Boolean direkt verarbeiten - kein einheitliches Format nötig
            if (success) {
                return { success: true, message: 'Registrierung erfolgreich. Warte auf Freischaltung.' };
            } else {
                throw new Error('Registrierung fehlgeschlagen');
            }
        })
        .catch(error => {
            throw { success: false, error: error.message };
        });
    }
}

/**
 * Login (nur aktive User).
 */
export function loginAPI(user, password) {
    if (USE_MOCK) {
        return new Promise((resolve, reject) => {
            const foundUser = mockUsers.find(u => u.user === user);
            if (!foundUser) return reject({ success: false, error: 'Benutzer nicht gefunden.' });
            if (!foundUser.active) return reject({ success: false, error: 'Benutzer ist nicht freigeschaltet.' });
            if (foundUser.password !== hashPassword(password) && foundUser.password !== password) 
                return reject({ success: false, error: 'Falsches Passwort.' });
            resolve({ 
                success: true, 
                data: { 
                    id: foundUser.id,
                    user: foundUser.user, 
                    score: foundUser.score, 
                    role: foundUser.role 
                } 
            });
        });
    } else {
        // Backend hat noch keinen Login-Endpoint, also Mock verwenden
        return new Promise((resolve, reject) => {
            // Simuliere Login bis Backend-Endpoint existiert
            const mockUsers = [
                { user: 'NickJokers', password: '123', role: 'admin', score: 1250 },
                { user: 'TestUser', password: 'def', role: 'user', score: 950 }
            ];
            
            const user = mockUsers.find(u => u.user === username && u.password === password);
            if (user) {
                resolve({
                    success: true,
                    data: { user: user.user, role: user.role, score: user.score }
                });
            } else {
                reject({ success: false, error: 'Ungültige Anmeldedaten' });
            }
        });
    }
}

/**
 * Admin: User-Liste abrufen.
 */
export function getUsersAPI(adminUser) {
    return new Promise((resolve, reject) => {
        const admin = mockUsers.find(u => u.user === adminUser && u.role === 'admin');
        if (!admin) return reject({ success: false, error: 'Keine Admin-Rechte.' });
        resolve({ 
            success: true, 
            data: mockUsers.map(u => ({
                id: u.id,
                user: u.user,
                score: u.score,
                role: u.role,
                active: u.active
            }))
        });
    });
}

/**
 * Admin: User freischalten/sperren.
 */
export function setUserActiveAPI(adminUser, targetUser, active) {
    if (USE_MOCK) {
        return new Promise((resolve, reject) => {
            const admin = mockUsers.find(u => u.user === adminUser && u.role === 'admin');
            if (!admin) return reject({ success: false, error: 'Keine Admin-Rechte.' });
            const user = mockUsers.find(u => u.user === targetUser);
            if (!user) return reject({ success: false, error: 'Benutzer nicht gefunden.' });
            user.active = !!active;
            resolve({ success: true, message: 'Benutzerstatus geändert.' });
        });
    } else {
        const endpoint = active ? '/user/unlockUser' : '/user/deleteUser';
        const method = active ? 'PUT' : 'DELETE';
        
        return fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: targetUser })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Aktion fehlgeschlagen (HTTP ${response.status})`);
            }
            return response.json(); // boolean
        })
        .then(success => {
            if (success) {
                return { success: true, message: active ? 'Benutzer freigeschaltet' : 'Benutzer gelöscht' };
            } else {
                throw new Error(active ? 'Freischaltung fehlgeschlagen' : 'Löschung fehlgeschlagen');
            }
        })
        .catch(error => {
            throw { success: false, error: error.message };
        });
    }
}

/**
 * Admin: User löschen.
 */
export function deleteUserAPI(adminUser, targetUser) {
    if (USE_MOCK) {
        return new Promise((resolve, reject) => {
            const admin = mockUsers.find(u => u.user === adminUser && u.role === 'admin');
            if (!admin) return reject({ success: false, error: 'Keine Admin-Rechte.' });
            const userIndex = mockUsers.findIndex(u => u.user === targetUser);
            if (userIndex === -1) return reject({ success: false, error: 'Benutzer nicht gefunden.' });
            mockUsers.splice(userIndex, 1);
            resolve({ success: true, message: 'Benutzer gelöscht.' });
        });
    } else {
        return fetch(`${API_BASE_URL}/user/deleteUser`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: targetUser })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Benutzer löschen fehlgeschlagen (HTTP ${response.status})`);
            }
            return response.json(); // boolean
        })
        .then(success => {
            if (success) {
                return { success: true, message: 'Benutzer gelöscht' };
            } else {
                throw new Error('Benutzer löschen fehlgeschlagen');
            }
        })
        .catch(error => {
            throw { success: false, error: error.message };
        });
    }
}

/**
 * Admin: User anlegen.
 */
export function createUserAPI(adminUser, userData) {
    return new Promise((resolve, reject) => {
        const admin = mockUsers.find(u => u.user === adminUser && u.role === 'admin');
        if (!admin) return reject({ success: false, error: 'Keine Admin-Rechte.' });
        if (!isValidUsername(userData.user)) return reject({ success: false, error: 'Ungültiger Benutzername.' });
        if (mockUsers.find(u => u.user === userData.user)) return reject({ success: false, error: 'Benutzername existiert bereits.' });
        const newUser = {
            id: generateId(),
            user: userData.user,
            password: hashPassword(userData.password),
            score: userData.score || 0,
            role: userData.role || 'user',
            active: !!userData.active
        };
        mockUsers.push(newUser);
        resolve({ success: true, message: 'Benutzer angelegt.', data: { id: newUser.id } });
    });
}

/**
 * Admin: User ändern.
 */
export function updateUserAPI(adminUser, targetUser, updates) {
    return new Promise((resolve, reject) => {
        const admin = mockUsers.find(u => u.user === adminUser && u.role === 'admin');
        if (!admin) return reject({ success: false, error: 'Keine Admin-Rechte.' });
        const user = mockUsers.find(u => u.user === targetUser);
        if (!user) return reject({ success: false, error: 'Benutzer nicht gefunden.' });
        
        // Validierung für Username-Änderung
        if (updates.user && updates.user !== targetUser) {
            if (!isValidUsername(updates.user)) return reject({ success: false, error: 'Ungültiger neuer Benutzername.' });
            if (mockUsers.find(u => u.user === updates.user)) return reject({ success: false, error: 'Neuer Benutzername existiert bereits.' });
        }
        
        Object.assign(user, updates);
        resolve({ success: true, message: 'Benutzer aktualisiert.' });
    });
}

/**
 * Admin: Wortliste abrufen.
 */
export function getWordsAPI(adminUser) {
    return new Promise((resolve, reject) => {
        const admin = mockUsers.find(u => u.user === adminUser && u.role === 'admin');
        if (!admin) return reject({ success: false, error: 'Keine Admin-Rechte.' });
        resolve({ success: true, data: wordList.map(w => ({ id: w.id, word: w.word })) });
    });
}

/**
 * Admin: Wort hinzufügen.
 */
export function addWordAPI(adminUser, word) {
    return new Promise((resolve, reject) => {
        const admin = mockUsers.find(u => u.user === adminUser && u.role === 'admin');
        if (!admin) return reject({ success: false, error: 'Keine Admin-Rechte.' });
        if (!word || word.length !== 5) return reject({ success: false, error: 'Wort muss genau 5 Buchstaben haben.' });
        if (wordList.some(w => w.word === word.toLowerCase())) return reject({ success: false, error: 'Wort existiert bereits.' });
        const newWord = { id: generateId(), word: word.toLowerCase() };
        wordList.push(newWord);
        resolve({ success: true, message: 'Wort hinzugefügt.', data: { id: newWord.id } });
    });
}

/**
 * Admin: Wort löschen.
 */
export function deleteWordAPI(adminUser, wordId) {
    return new Promise((resolve, reject) => {
        const admin = mockUsers.find(u => u.user === adminUser && u.role === 'admin');
        if (!admin) return reject({ success: false, error: 'Keine Admin-Rechte.' });
        const wordIndex = wordList.findIndex(w => w.id === wordId);
        if (wordIndex === -1) return reject({ success: false, error: 'Wort nicht gefunden.' });
        wordList.splice(wordIndex, 1);
        resolve({ success: true, message: 'Wort gelöscht.' });
    });
}

/**
 * Startet eine neue Runde (Admin).
 */
export function startRoundAPI(adminUser) {
    return new Promise((resolve, reject) => {
        const admin = mockUsers.find(u => u.user === adminUser && u.role === 'admin');
        if (!admin) return reject({ success: false, error: 'Keine Admin-Rechte.' });
        lastSolutionWord = solutionWord;
        solutionWord = wordList[Math.floor(Math.random() * wordList.length)].word;
        currentRound = {
            id: Date.now(),
            word: solutionWord,
            start: Date.now(),
            end: null,
            guesses: [],
            status: 'running'
        };
        rounds.push(currentRound);
        resolve({ success: true, data: { wordLength: solutionWord.length, roundId: currentRound.id }, message: 'Neue Runde gestartet.' });
    });
}

/**
 * Gibt die aktuelle Runde zurück.
 */
export function getCurrentRoundAPI(userAuth) {
    return new Promise((resolve, reject) => {
        if (userAuth) {
            const user = mockUsers.find(u => u.user === userAuth && u.active);
            if (!user) return reject({ success: false, error: 'Benutzer nicht authentifiziert.' });
        }
        
        if (!currentRound) return resolve({ success: true, data: null });
        resolve({
            success: true,
            data: {
                id: currentRound.id,
                status: currentRound.status,
                start: currentRound.start,
                end: currentRound.end,
                guesses: currentRound.guesses.map(g => ({ user: g.user, guess: g.guess })),
                lastSolutionWord
            }
        });
    });
}

/**
 * Spieler gibt einen Rateversuch ab.
 */
export function submitGuessAPI(userAuth, guess) {
    return new Promise((resolve, reject) => {
        if (!currentRound || currentRound.status !== 'running') 
            return reject({ success: false, error: 'Keine laufende Runde.' });
        if (!isValidWord(guess)) 
            return reject({ success: false, error: 'Kein gültiges Wort.' });
        const user = mockUsers.find(u => u.user === userAuth && u.active);
        if (!user) return reject({ success: false, error: 'Benutzer nicht aktiv.' });
        
        // Max. Versuche pro User: 6/3/2 je nach Spielerzahl
        const playerCount = mockUsers.filter(u => u.active && u.role === 'user').length;
        let maxTries = 6;
        if (playerCount === 2) maxTries = 3;
        if (playerCount >= 3) maxTries = 2;
        const userGuesses = currentRound.guesses.filter(g => g.user === userAuth);
        if (userGuesses.length >= maxTries) 
            return reject({ success: false, error: 'Keine Versuche mehr.' });
        
        currentRound.guesses.push({ user: userAuth, guess });
        resolve({ success: true, message: 'Rateversuch gespeichert.' });
    });
}

/**
 * Gibt Rateversuche aller Spieler zurück.
 */
export function getAllGuessesAPI(userAuth) {
    return new Promise((resolve, reject) => {
        if (userAuth) {
            const user = mockUsers.find(u => u.user === userAuth && u.active);
            if (!user) return reject({ success: false, error: 'Benutzer nicht authentifiziert.' });
        }
        
        if (!currentRound) return resolve({ success: true, data: [] });
        resolve({ 
            success: true, 
            data: currentRound.guesses.map(g => ({ user: g.user, guess: g.guess })) 
        });
    });
}

/**
 * Runde beenden (Admin).
 */
export function endRoundAPI(adminUser) {
    return new Promise((resolve, reject) => {
        const admin = mockUsers.find(u => u.user === adminUser && u.role === 'admin');
        if (!admin) return reject({ success: false, error: 'Keine Admin-Rechte.' });
        if (!currentRound) return reject({ success: false, error: 'Keine laufende Runde.' });
        currentRound.status = 'ended';
        currentRound.end = Date.now();
        resolve({ success: true, message: 'Runde beendet.', data: { solution: currentRound.word } });
    });
}

/**
 * Gibt die verbleibende Zeit der Runde zurück (z.B. 60 Sekunden pro Runde).
 */
export function getRoundCountdownAPI() {
    return new Promise((resolve) => {
        if (!currentRound || currentRound.status !== 'running') 
            return resolve({ success: true, data: { secondsLeft: 0 } });
        const duration = 60 * 1000; // 60 Sekunden
        const elapsed = Date.now() - currentRound.start;
        const secondsLeft = Math.max(0, Math.floor((duration - elapsed) / 1000));
        resolve({ success: true, data: { secondsLeft } });
    });
}

/**
 * Gibt Hilfetexte zurück.
 */
export function getHelpTextsAPI() {
    return new Promise((resolve) => {
        resolve({
            success: true,
            data: [
                { title: 'Spielregeln', text: 'Errate das Wort in möglichst wenigen Versuchen.' },
                { title: 'Mehrspieler', text: 'Jeder Spieler hat je nach Spielerzahl unterschiedlich viele Versuche.' },
                { title: 'Admin', text: 'Admins können User und Wörter verwalten.' }
            ]
        });
    });
}

// --- Highscore ---

/**
 * Simulates fetching the highscore list.
 * @returns {Promise<Array<object>>} A promise that resolves with the highscore list.
 */
export function getHighscoresAPI() {
    return new Promise((resolve) => {
        const highscores = mockUsers
            .sort((a, b) => b.score - a.score)
            .map((user, index) => ({
                rank: index + 1,
                name: user.user,
                score: user.score,
                date: '2024-05-20' // Mock date
            }));
        resolve({ success: true, data: highscores });
    });
}

/**
 * Simulates fetching a new solution word for the game.
 * @returns {Promise<string>} A promise that resolves with the solution word.
 */
export function getNewSolutionWordAPI() {
    return new Promise((resolve) => {
        const random = wordList[Math.floor(Math.random() * wordList.length)];
        solutionWord = random.word;
        resolve({ success: true, data: { word: solutionWord } });
    });
}

/**
 * --- Passwort ändern ---
 */
export function changePasswordAPI(userAuth, oldPassword, newPassword) {
    if (USE_MOCK) {
        return new Promise((resolve, reject) => {
            const user = mockUsers.find(u => u.user === userAuth && u.active);
            if (!user) return reject({ success: false, error: 'Benutzer nicht gefunden.' });
            if (user.password !== hashPassword(oldPassword) && user.password !== oldPassword)
                return reject({ success: false, error: 'Altes Passwort falsch.' });
            if (!isValidPassword(newPassword)) return reject({ success: false, error: 'Neues Passwort zu kurz (min. 3 Zeichen).' });
            user.password = hashPassword(newPassword);
            resolve({ success: true, message: 'Passwort geändert.' });
        });
    } else {
        // Backend erwartet nur username und neues password
        return fetch(`${API_BASE_URL}/user/passwordChange`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username: userAuth, password: newPassword })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Passwort ändern fehlgeschlagen (HTTP ${response.status})`);
            }
            return response.json(); // boolean
        })
        .then(success => {
            if (success) {
                return { success: true, message: 'Passwort erfolgreich geändert' };
            } else {
                throw new Error('Passwort ändern fehlgeschlagen');
            }
        })
        .catch(error => {
            throw { success: false, error: error.message };
        });
    }
}

/**
 * --- Wort ändern ---
 */
export function updateWordAPI(adminUser, wordId, newWord) {
    return new Promise((resolve, reject) => {
        const admin = mockUsers.find(u => u.user === adminUser && u.role === 'admin');
        if (!admin) return reject({ success: false, error: 'Keine Admin-Rechte.' });
        const wordObj = getWordById(wordId);
        if (!wordObj) return reject({ success: false, error: 'Wort nicht gefunden.' });
        if (!newWord || newWord.length !== 5) return reject({ success: false, error: 'Wort muss genau 5 Buchstaben haben.' });
        if (wordList.some(w => w.word === newWord.toLowerCase() && w.id !== wordId))
            return reject({ success: false, error: 'Wort existiert bereits.' });
        wordObj.word = newWord.toLowerCase();
        resolve({ success: true, message: 'Wort geändert.' });
    });
}

/**
 * --- Logout (Mock, macht nichts) ---
 */
export function logoutAPI() {
    return new Promise((resolve) => {
        resolve({ success: true, message: 'Logout erfolgreich.' });
    });
}
