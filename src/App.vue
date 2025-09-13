<script setup>
import { ref, computed } from 'vue'
import { getHighscoresAPI, setUserActiveAPI, deleteUserAPI, changePasswordAPI, getUsersAPI, startRoundAPI, endRoundAPI } from './api.js'
import GameScreen from './components/gamescreen.vue'
import StartScreen from './components/startscreen.vue'

// --- Zustandsverwaltung ---
const activeScreen = ref('start') // 'start', 'game', 'change-password', 'admin'
const currentUser = ref(null)

// Highscore-Modal-Zustand
const showHighscoreModal = ref(false)
const highscores = ref([])

// Hilfe-Modal-Zustand
const showHelpModal = ref(false)

// Admin-Zustand
const pendingUsers = ref([]) // Benutzer die auf Freischaltung warten
const selectedUsers = ref([]) // Ausgewählte Benutzer für Freischaltung/Löschung
const adminMessage = ref('')
const adminError = ref('')

// Passwort-Ändern-Zustand
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordMessage = ref('')
const passwordError = ref('')

// --- Methoden ---

function handleLoginSuccess(userData) {
  currentUser.value = userData.data
  localStorage.setItem('currentUser', JSON.stringify({
    username: userData.data.user,
  }))
  activeScreen.value = 'game'
}

function handleLogout() {
  currentUser.value = null
  localStorage.removeItem('currentUser')
  activeScreen.value = 'start'
}

async function openHighscore() {
  const response = await getHighscoresAPI()
  highscores.value = response.data
  showHighscoreModal.value = true
}

function closeHighscore() {
  showHighscoreModal.value = false
}

function openHelp() {
  showHelpModal.value = true
}
function closeHelp() {
  showHelpModal.value = false
}

async function loadPendingUsers() {
  if (!currentUser.value || currentUser.value.role !== 'admin') return
  try {
    const response = await getUsersAPI(currentUser.value.user)
    pendingUsers.value = response.data.filter(user => !user.active)
    adminError.value = ''
  } catch (err) {
    adminError.value = err.error || err
  }
}

function toggleUserSelection(user) {
  const index = selectedUsers.value.findIndex(u => u.id === user.id)
  if (index > -1) {
    selectedUsers.value.splice(index, 1)
  } else {
    selectedUsers.value.push(user)
  }
}

async function activateSelectedUsers() {
  if (selectedUsers.value.length === 0) {
    adminError.value = 'Keine Benutzer ausgewählt'
    return
  }
  
  try {
    for (const user of selectedUsers.value) {
      await setUserActiveAPI(currentUser.value.user, user.user, true)
    }
    adminMessage.value = `${selectedUsers.value.length} Benutzer wurden freigeschaltet`
    adminError.value = ''
    selectedUsers.value = []
    await loadPendingUsers() // Liste neu laden
  } catch (err) {
    adminError.value = err.error || err
  }
}

async function deleteSelectedUsers() {
  if (selectedUsers.value.length === 0) {
    adminError.value = 'Keine Benutzer ausgewählt'
    return
  }
  
  try {
    for (const user of selectedUsers.value) {
      await deleteUserAPI(currentUser.value.user, user.user)
    }
    adminMessage.value = `${selectedUsers.value.length} Benutzer wurden gelöscht`
    adminError.value = ''
    selectedUsers.value = []
    await loadPendingUsers() // Liste neu laden
  } catch (err) {
    adminError.value = err.error || err
  }
}

function openAdminPanel() {
  activeScreen.value = 'admin'
  selectedUsers.value = []
  adminMessage.value = ''
  adminError.value = ''
  loadPendingUsers()
}

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

// Computed-Eigenschaft zur Überprüfung ob ein Benutzer angemeldet ist
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
      <button @click="activateSelectedUsers" :disabled="selectedUsers.length === 0">Freischalten</button>
      <button @click="deleteSelectedUsers" :disabled="selectedUsers.length === 0" class="delete-btn">Löschen</button>
      <button @click="loadPendingUsers" style="margin-left:16px;">Aktualisieren</button>
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
              :class="{ 'selected': selectedUsers.some(u => u.id === user.id) }"
              @click="toggleUserSelection(user)"
            >
              <input 
                type="checkbox" 
                :checked="selectedUsers.some(u => u.id === user.id)"
                @click.stop
              />
              <span class="username">{{ user.user }}</span>
              <span class="user-info">(Rolle: {{ user.role }})</span>
            </div>
          </div>
        </div>
      </div>
      <div class="box">
        <h3>WÖRTER BEARBEITEN</h3>
        <textarea placeholder="Wortliste bearbeiten..."></textarea>
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
          <tr v-for="score in highscores" :key="score.rank" 
              :class="{ 'current-player': score.name === currentUser?.user }">
            <td>{{ score.rank }}</td>
            <td>{{ score.name }}</td>
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
@media (max-width: 900px) {
  .help-modal-content {
    max-width: 98vw;
    min-width: 0;
  }
}
</style>