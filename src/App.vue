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
    src="https://media.discordapp.net/attachments/903679816035876914/1410239792569909280/Design_ohne_Titel.png?ex=68b04ba7&is=68aefa27&hm=4e90d176d93cd71ef858cd493d48e66e3d3c0515acb7076f4f7d8cc2a60ceca2&=&format=webp&quality=lossless&width=625&height=625"
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
    @show-change-password="() => activeScreen = 'change-password'"
    @show-admin="openAdminPanel"
  />

  <!-- Passwort-Ändern-Bildschirm -->
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
            <th>Datum</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="score in highscores" :key="score.rank" 
              :class="{ 'current-player': score.name === currentUser?.user }">
            <td>{{ score.rank }}</td>
            <td>{{ score.name }}</td>
            <td>{{ score.score }}</td>
            <td>{{ score.date }}</td>
          </tr>
        </tbody>
      </table>
      <button class="close-btn" @click="closeHighscore">Schließen</button>
    </div>
  </div>
</template>

<style scoped>
.admin-message {
  padding: 10px;
  margin-bottom: 15px;
  border-radius: 6px;
  font-weight: bold;
}

.admin-message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.admin-message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.pending-users {
  max-height: 300px;
  overflow-y: auto;
}

.no-users {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 20px;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 5px;
  background: white;
  border: 1px solid #d3d6da;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-item:hover {
  background-color: #f8f9fa;
  border-color: #007bff;
}

.user-item.selected {
  background-color: #e3f2fd;
  border-color: #2196f3;
}

.user-item input[type="checkbox"] {
  margin-right: 10px;
  cursor: pointer;
}

.username {
  font-weight: bold;
  color: #333;
  margin-right: 8px;
}

.user-info {
  font-size: 12px;
  color: #6c757d;
}

.delete-btn {
  background-color: #dc3545 !important;
  color: white !important;
}

.delete-btn:hover {
  background-color: #c82333 !important;
}

button:disabled {
  background-color: #6c757d !important;
  cursor: not-allowed !important;
  opacity: 0.6;
}
</style>
