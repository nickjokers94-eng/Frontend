<script setup>
// Importiert reaktive Hilfsmittel von Vue
import { ref, computed } from 'vue'
// Importiert API-Funktionen für Backend-Kommunikation
import { 
  getHighscoresAPI, setUserActiveAPI, deleteUserAPI, changePasswordAPI, getUsersAPI, 
  updateUserRoleAPI, addWordAPI, getWordsAPI, deleteWordByInputAPI 
} from './api.js'
// Importiert Komponenten
import GameScreen from './components/gamescreen.vue'
import StartScreen from './components/startscreen.vue'
import Snackbar from './components/snackbar.vue'

// --- Snackbar Queue ---
// Snackbar-Nachrichten-Warteschlange
const snackbarQueue = ref([])

/**
 * Zeigt eine Snackbar-Nachricht an.
 * @param {string} message - Die Nachricht
 * @param {string} type - Typ der Nachricht ('info', 'success', 'error')
 * @param {number} duration - Anzeigedauer in ms
 * Funktion: Fügt eine Snackbar zur Warteschlange hinzu und entfernt sie nach Ablauf.
 * erstellt von: Nick Jokers
 */
function showSnackbar(message, type = 'info', duration = 5000) {
  const id = Date.now() + Math.random()
  snackbarQueue.value.push({ id, message, type })
  setTimeout(() => {
    snackbarQueue.value = snackbarQueue.value.filter(s => s.id !== id)
  }, duration)
}

// --- Zustandsverwaltung ---
// Aktueller Screen ('start', 'game', 'admin', 'change-password')
const activeScreen = ref('start')
// Aktuell eingeloggter Benutzer (Objekt oder null)
const currentUser = ref(null)

// Highscore-Modal-Zustand
const showHighscoreModal = ref(false) // Sichtbarkeit des Highscore-Modals
const highscores = ref([]) // Highscore-Liste

// Hilfe-Modal-Zustand
const showHelpModal = ref(false) // Sichtbarkeit des Hilfe-Modals

// Admin-Zustand
const pendingUsers = ref([]) // Benutzer, die auf Freischaltung warten
const selectedUserIds = ref(new Set()) // IDs der ausgewählten Benutzer
const adminMessage = ref('') // Admin-Erfolgsmeldung
const adminError = ref('') // Admin-Fehlermeldung

// Für Rollenänderung: Temporäre Rollen pro User speichern
const tempRoles = ref({}) // Map: userId -> Rolle

// Wörter hinzufügen/löschen
const newWord = ref('') // Neues Wort zum Hinzufügen
const wordMessage = ref('') // Erfolgsmeldung für Wort
const wordError = ref('') // Fehlermeldung für Wort
const deleteWordInput = ref('') // Wort zum Löschen
const deleteWordMessage = ref('') // Erfolgsmeldung für Löschen
const deleteWordError = ref('') // Fehlermeldung für Löschen

// Wortliste für Admin-UI
const wordList = ref([]) // Liste aller Wörter
const wordListError = ref('') // Fehler beim Laden der Wortliste

// Passwort-Ändern-Zustand
const oldPassword = ref('') // Altes Passwort
const newPassword = ref('') // Neues Passwort
const confirmPassword = ref('') // Neues Passwort wiederholen
const passwordMessage = ref('') // Erfolgsmeldung Passwort
const passwordError = ref('') // Fehlermeldung Passwort

// --- Methoden ---

/**
 * Wird nach erfolgreichem Login aufgerufen.
 * @param {object} userData - Die Benutzerdaten
 * Funktion: Setzt den aktuellen User und wechselt zum Spiel-Screen.
 * erstellt von: Nick Jokers
 */
function handleLoginSuccess(userData) {
  currentUser.value = userData.data
  localStorage.setItem('currentUser', JSON.stringify({
    username: userData.data.user,
  }))
  activeScreen.value = 'game'
}

/**
 * Loggt den aktuellen Benutzer aus.
 * Keine Parameter.
 * Funktion: Entfernt User aus dem State und wechselt zum Start-Screen.
 * erstellt von: Nick Jokers
 */
function handleLogout() {
  currentUser.value = null
  localStorage.removeItem('currentUser')
  activeScreen.value = 'start'
}

/**
 * Öffnet das Highscore-Modal und lädt die Highscores.
 * Keine Parameter.
 * Funktion: Ruft Highscores vom Backend ab und zeigt das Modal.
 * erstellt von: Nick Jokers
 */
async function openHighscore() {
  const response = await getHighscoresAPI(currentUser.value?.user)
  highscores.value = response.data
  showHighscoreModal.value = true
}

/**
 * Schließt das Highscore-Modal.
 * Keine Parameter.
 * Funktion: Setzt die Sichtbarkeit auf false.
 * erstellt von: Nick Jokers
 */
function closeHighscore() {
  showHighscoreModal.value = false
}

/**
 * Öffnet das Hilfe-Modal.
 * Keine Parameter.
 * Funktion: Setzt die Sichtbarkeit auf true.
 * erstellt von: Nick Jokers
 */
function openHelp() {
  showHelpModal.value = true
}

/**
 * Schließt das Hilfe-Modal.
 * Keine Parameter.
 * Funktion: Setzt die Sichtbarkeit auf false.
 * erstellt von: Nick Jokers
 */
function closeHelp() {
  showHelpModal.value = false
}

/**
 * Lädt alle Benutzer, die noch nicht aktiviert wurden (nur für Admin).
 * Keine Parameter.
 * Funktion: Holt Benutzerliste vom Backend und filtert inaktive User.
 * erstellt von: Nick Jokers
 */
async function loadPendingUsers() {
  if (!currentUser.value || currentUser.value.role !== 'admin') return
  try {
    const response = await getUsersAPI(currentUser.value.user)
    pendingUsers.value = response.data.filter(user => !user.active)
    // tempRoles initialisieren
    tempRoles.value = {}
    for (const user of pendingUsers.value) {
      tempRoles.value[user.id] = user.role
    }
    adminError.value = ''
  } catch (err) {
    adminError.value = err.error || err
  }
}

/**
 * Markiert oder demarkiert einen Benutzer in der Auswahl.
 * @param {object} user - Benutzerobjekt
 * Funktion: Fügt die User-ID zur Auswahl hinzu oder entfernt sie.
 * erstellt von: Nick Jokers
 */
function toggleUserSelection(user) {
  if (selectedUserIds.value.has(user.id)) {
    selectedUserIds.value.delete(user.id)
    selectedUserIds.value = new Set(selectedUserIds.value)
  } else {
    selectedUserIds.value.add(user.id)
    selectedUserIds.value = new Set(selectedUserIds.value)
  }
}

/**
 * Aktiviert alle ausgewählten Benutzer.
 * Keine Parameter.
 * Funktion: Setzt die ausgewählten User auf aktiv im Backend.
 * erstellt von: Nick Jokers
 */
async function activateSelectedUsers() {
  if (selectedUserIds.value.size === 0) {
    adminError.value = 'Keine Benutzer ausgewählt'
    return
  }
  try {
    const usersToActivate = pendingUsers.value.filter(u => selectedUserIds.value.has(u.id))
    await Promise.all(usersToActivate.map(user =>
      setUserActiveAPI(currentUser.value.user, user.user, true)
    ))
    adminMessage.value = `${usersToActivate.length} Benutzer wurden freigeschaltet`
    adminError.value = ''
    selectedUserIds.value = new Set()
    await loadPendingUsers()
  } catch (err) {
    adminError.value = err.error || err
  }
}

/**
 * Löscht alle ausgewählten Benutzer.
 * Keine Parameter.
 * Funktion: Entfernt die ausgewählten User im Backend.
 * erstellt von: Nick Jokers
 */
async function deleteSelectedUsers() {
  if (selectedUserIds.value.size === 0) {
    adminError.value = 'Keine Benutzer ausgewählt'
    return
  }
  try {
    const usersToDelete = pendingUsers.value.filter(u => selectedUserIds.value.has(u.id))
    await Promise.all(usersToDelete.map(user =>
      deleteUserAPI(currentUser.value.user, user.user)
    ))
    adminMessage.value = `${usersToDelete.length} Benutzer wurden gelöscht`
    adminError.value = ''
    selectedUserIds.value = new Set()
    await loadPendingUsers()
  } catch (err) {
    adminError.value = err.error || err
  }
}

/**
 * Lädt die Wortliste für die Admin-UI.
 * Keine Parameter.
 * Funktion: Holt alle Wörter vom Backend.
 * erstellt von: Nick Jokers
 */
async function loadWordList() {
  try {
    const result = await getWordsAPI(currentUser.value.user)
    wordList.value = result.data
    wordListError.value = ''
  } catch (err) {
    wordListError.value = err.error || err
  }
}

/**
 * Öffnet das Admin-Panel.
 * Keine Parameter.
 * Funktion: Wechselt zum Admin-Screen und lädt Daten.
 * erstellt von: Nick Jokers
 */
function openAdminPanel() {
  activeScreen.value = 'admin'
  selectedUserIds.value = new Set()
  adminMessage.value = ''
  adminError.value = ''
  loadPendingUsers()
  loadWordList()
}

/**
 * Aktualisiert die Rolle eines Benutzers.
 * @param {object} user - Benutzerobjekt
 * Funktion: Setzt die Rolle im Backend.
 * erstellt von: Nick Jokers
 */
async function updateRole(user) {
  try {
    await updateUserRoleAPI(currentUser.value.user, user.user, tempRoles.value[user.id])
    adminMessage.value = `Rolle für ${user.user} geändert`
    await loadPendingUsers()
  } catch (err) {
    adminError.value = err.error || err
  }
}

/**
 * Fügt ein neues Wort hinzu.
 * Keine Parameter.
 * Funktion: Validiert und sendet das neue Wort ans Backend.
 * erstellt von: Nick Jokers
 */
async function addWord() {
  wordMessage.value = ''
  wordError.value = ''
  if (!newWord.value || newWord.value.length !== 5) {
    wordError.value = 'Das Wort muss genau 5 Buchstaben haben.'
    return
  }
  if (!/^[A-Za-zÄÖÜäöüß]+$/.test(newWord.value)) {
    wordError.value = 'Nur Buchstaben (keine Zahlen/Sonderzeichen) erlaubt.'
    return
  }
  try {
    await addWordAPI(currentUser.value.user, newWord.value)
    wordMessage.value = 'Wort erfolgreich hinzugefügt!'
    newWord.value = ''
    await loadWordList()
  } catch (err) {
    wordError.value = err.error || 'Fehler beim Hinzufügen des Wortes'
  }
}

/**
 * Löscht ein Wort anhand der Eingabe.
 * Keine Parameter.
 * Funktion: Validiert und löscht das Wort im Backend.
 * erstellt von: Nick Jokers
 */
async function deleteWordByInput() {
  deleteWordMessage.value = ''
  deleteWordError.value = ''
  if (!deleteWordInput.value || deleteWordInput.value.length !== 5) {
    deleteWordError.value = 'Das Wort muss genau 5 Buchstaben haben.'
    return
  }
  try {
    await deleteWordByInputAPI(currentUser.value.user, deleteWordInput.value)
    deleteWordMessage.value = 'Wort erfolgreich gelöscht!'
    deleteWordInput.value = ''
    await loadWordList()
  } catch (err) {
    deleteWordError.value = err.error || 'Fehler beim Löschen des Wortes'
  }
}

/**
 * Ändert das Passwort des aktuellen Benutzers.
 * Keine Parameter.
 * Funktion: Validiert Eingaben und sendet Passwortänderung ans Backend.
 * erstellt von: Nick Jokers
 */
async function changePassword() {
  passwordError.value = ''
  passwordMessage.value = ''
  
  if (!oldPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordError.value = 'Bitte alle Felder ausfüllen'
    return
  }
  
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Neue Passwörter stimmen nicht überein'
    return
  }
  
  if (newPassword.value.length < 3) {
    passwordError.value = 'Neues Passwort muss mindestens 3 Zeichen haben'
    return
  }
  
  try {
    await changePasswordAPI(currentUser.value.user, oldPassword.value, newPassword.value)
    passwordMessage.value = 'Passwort erfolgreich geändert'
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    passwordError.value = err.error || 'Fehler beim Ändern des Passworts'
  }
}

// Computed Property: true, wenn ein User eingeloggt ist
const isLoggedIn = computed(() => activeScreen.value !== 'start')
</script>

<template>
  <!-- Festes Logo, sichtbar auf allen Bildschirmen außer Start -->
  <img
    v-if="isLoggedIn"
    src="https://i.imgur.com/rE702YZ.png"
    alt="Logo"
    class="header-logo"
  />

  <!-- Start-Bildschirm -->
  <StartScreen 
    v-if="activeScreen === 'start'"
    @login-successful="handleLoginSuccess"
  />

  <!-- Spiel-Bildschirm -->
  <GameScreen
    v-if="activeScreen === 'game'"
    :user="currentUser"
    @logout="handleLogout"
    @show-highscore="openHighscore"
    @show-help="openHelp"
    @show-admin="openAdminPanel"
    @snackbar="e => showSnackbar(e.message, e.type)"
  />

  <!-- Passwort-Ändern-Bildschirm -->
  <section v-if="activeScreen === 'change-password'" class="screen">
    <h1>Passwort ändern</h1>
    <form id="change-password-form" class="login-form" @submit.prevent="changePassword">
      <div class="form-group">
        <label for="old-password">Altes Passwort</label>
        <input type="password" id="old-password" v-model="oldPassword" required>
      </div>
      <div class="form-group">
        <label for="new-password">Neues Passwort</label>
        <input type="password" id="new-password" v-model="newPassword" required>
      </div>
      <div class="form-group">
        <label for="confirm-password">Neues Passwort bestätigen</label>
        <input type="password" id="confirm-password" v-model="confirmPassword" required>
      </div>
      <div v-if="passwordError" class="form-group">
        <p style="color: red;">{{ passwordError }}</p>
      </div>
      <div v-if="passwordMessage" class="form-group">
        <p style="color: green;">{{ passwordMessage }}</p>
      </div>
      <button type="submit">Speichern</button>
      <button type="button" @click="activeScreen = 'game'">Abbrechen</button>
    </form>
  </section>

  <!-- Admin-Bildschirm -->
  <section v-if="activeScreen === 'admin'" class="screen">
    <header>
      <button @click="activateSelectedUsers" :disabled="selectedUserIds.size === 0">Freischalten</button>
      <button @click="deleteSelectedUsers" :disabled="selectedUserIds.size === 0" class="delete-btn">Löschen</button>
    </header>
    
    <div v-if="adminMessage" class="admin-message success">{{ adminMessage }}</div>
    <div v-if="adminError" class="admin-message error">{{ adminError }}</div>
    
    <main class="admin-layout">
      <div class="box">
        <h3>SPIELER UND ADMIN KONFIGURATION</h3>
        <div class="pending-users">
          <div v-if="pendingUsers.length === 0" class="no-users">
            Keine Registrierungsanfragen vorhanden
          </div>
          <div v-else>
            <div 
              v-for="user in pendingUsers" 
              :key="user.id" 
              class="user-item"
              :class="{ 'selected': selectedUserIds.has(user.id) }"
            >
              <input 
                type="checkbox" 
                :checked="selectedUserIds.has(user.id)"
                @change="toggleUserSelection(user)"
                @click.stop
              />
              <span class="username">{{ user.user }}</span>
              <span class="user-info">
                (Rolle: 
                <select v-model="tempRoles[user.id]" style="margin-left:4px;">
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                <button @click="updateRole(user)" style="margin-left:6px;">Eintragen</button>
                )
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="box">
        <h3>WÖRTER HINZUFÜGEN</h3>
        <input
          v-model="newWord"
          maxlength="5"
          placeholder="Wort hinzufügen"
          style="width: 80%; font-size: 1.2rem; padding: 8px; margin-bottom: 8px;"
        />
        <button @click="addWord" style="margin-left:8px;">Hinzufügen</button>
        <div v-if="wordMessage" style="color:green; margin-top:8px;">{{ wordMessage }}</div>
        <div v-if="wordError" style="color:red; margin-top:8px;">{{ wordError }}</div>

        <h4 style="margin-top:24px;">WORT LÖSCHEN</h4>
        <input
          v-model="deleteWordInput"
          maxlength="5"
          placeholder="Wort zum Löschen"
          style="width: 80%; font-size: 1.2rem; padding: 8px; margin-bottom: 8px;"
        />
        <button @click="deleteWordByInput" style="margin-left:8px;">Löschen</button>
        <div v-if="deleteWordMessage" style="color:green; margin-top:8px;">{{ deleteWordMessage }}</div>
        <div v-if="deleteWordError" style="color:red; margin-top:8px;">{{ deleteWordError }}</div>

        <h4 style="margin-top:24px;">WORTLISTE</h4>
        <div v-if="wordListError" style="color:red;">{{ wordListError }}</div>
        <!-- Scrollbare Wortliste, max. 10 Wörter sichtbar -->
        <div style="max-height: 370px; overflow-y: auto; border: 1px solid #eee; border-radius: 6px; background: #fafbfc; margin-top: 8px;">
          <ul style="list-style:none; padding:0; margin:0;">
            <li v-for="wordObj in wordList" :key="wordObj.id" style="margin-bottom:8px; padding: 8px 12px;">
              <span style="font-family:monospace; font-size:1.1em;">{{ wordObj.word }}</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
    <button class="close-btn" @click="activeScreen = 'game'">ADMIN BEREICH SCHLIESSEN</button>
  </section>

  <!-- Highscore-Modal -->
  <div v-if="showHighscoreModal" class="modal">
    <div class="modal-content">
      <h2>Highscores</h2>
      <table id="highscore-table">
        <thead>
          <tr>
            <th>Rang</th>
            <th>Spieler</th>
            <th>Punkte</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="score in highscores" 
            :key="score.rank + '-' + score.name"
            :class="{ 'current-player': score.name === currentUser?.user }"
          >
            <td>{{ score.rank }}</td>
            <td>
              <span :style="{ fontWeight: score.name === currentUser?.user ? 'bold' : 'normal' }">
                {{ score.name }}
              </span>
            </td>
            <td>{{ score.score }}</td>
          </tr>
        </tbody>
      </table>
      <button class="close-btn" @click="closeHighscore">Schließen</button>
    </div>
  </div>

  <!-- Hilfe-Modal -->
  <div v-if="showHelpModal" class="modal">
    <div class="modal-content help-modal-content">
      <h2>Hilfe – Spielregeln & Bedienung</h2>
      <h3>Spielregeln</h3>
      <div class="help-section">
        <p>
          Errate ein Wort mit <strong>5 Buchstaben</strong>.<br>
          Du hast eine begrenzte Anzahl an Versuchen:<br>
          <strong>Alleine:</strong> 6 Versuche<br>
          <strong>2 Spieler:</strong> 3 Versuche pro Spieler<br>
          <strong>3 Spieler:</strong> 2 Versuche pro Spieler<br>
        </p>
        <p>
          Nach jedem Versuch siehst du für jeden Buchstaben:<br>
          <span style="color:#6aaa64;font-weight:bold;">Grün</span>: Richtiger Buchstabe an der richtigen Stelle<br>
          <span style="color:#b59f3b;font-weight:bold;">Gelb</span>: Richtiger Buchstabe, aber an falscher Stelle<br>
          <span style="color:#787c7e;font-weight:bold;">Grau</span>: Buchstabe kommt im Wort nicht vor
        </p>
        <p>
          Das zuletzt gesuchte Wort wird zu Beginn jeder neuen Runde angezeigt.<br>
          Jede Runde dauert maximal 60 Sekunden. Danach startet automatisch eine neue Runde.<br>
          Punkte gibt es für richtige Lösungen – je schneller und mit weniger Versuchen, desto mehr Punkte!<br>
          Die Highscore-Liste zeigt die besten Spieler.
        </p>
      </div>
      <h3>Bedienung</h3>
      <div class="help-section">
        <p>
          Gib dein Wort über die Bildschirm-Tastatur oder die PC-Tastatur ein.<br>
          Mit <strong>Enter</strong> bestätigst du deinen Rateversuch.<br>
          Mit <strong>Backspace</strong> kannst du Buchstaben löschen.<br>
          Im Menü kannst du dich abmelden, dein Passwort ändern oder die Highscore-Liste ansehen.<br>
          Admins können zusätzlich Benutzer und Wörter verwalten.
        </p>
      </div>
      <button class="close-btn small-close-btn" @click="closeHelp">Schließen</button>
    </div>
  </div>

  <!-- Snackbar-Stack ganz unten einbinden -->
  <Snackbar :snackbars="snackbarQueue" />
</template>

<style>
.help-modal-content {
  max-width: 800px;
  min-width: 400px;
  font-size: 1.15rem;
  line-height: 1.6;
}
.help-section p {
  margin-bottom: 18px;
  text-align: left;
}
.small-close-btn {
  font-size: 0.95rem;
  padding: 2px 8px;
  min-width: 0;
  margin-top: 10px;
}
#highscore-table tr.current-player {
  background-color: #e7f3ff;
  font-weight: bold;
}
@media (max-width: 900px) {
  .help-modal-content {
    max-width: 98vw;
    min-width: 0;
  }
}
</style>