<script setup>
import { ref, computed } from 'vue'
import { getHighscoresAPI, getUsersAPI, setUserActiveAPI, deleteUserAPI } from './api.js'
import GameScreen from './components/gamescreen.vue'
import StartScreen from './components/startscreen.vue'

// --- State Management ---
const activeScreen = ref('start') // 'start', 'game', 'change-password', 'admin'
const currentUser = ref(null)

// Highscore Modal State
const showHighscoreModal = ref(false)
const highscores = ref([])

// Admin State
const pendingUsers = ref([]) // Benutzer die auf Freischaltung warten
const selectedUsers = ref([]) // Ausgewählte Benutzer für Freischaltung/Löschung
const adminMessage = ref('')
const adminError = ref('')

// --- Methods ---

function handleLoginSuccess(userData) {
  currentUser.value = userData.data // userData.data enthält jetzt die Benutzerdaten
  activeScreen.value = 'game'
}

function handleLogout() {
  currentUser.value = null
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
    // Nur inaktive Benutzer anzeigen (warten auf Freischaltung)
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

// Computed property to check if a user is logged in
const isLoggedIn = computed(() => activeScreen.value !== 'start')
</script>

<template>
  <!-- Fixed Logo, visible on all screens except start -->
  <img
    v-if="isLoggedIn"
    src="https://media.discordapp.net/attachments/903679816035876914/1410239792569909280/Design_ohne_Titel.png?ex=68b04ba7&is=68aefa27&hm=4e90d176d93cd71ef858cd493d48e66e3d3c0515acb7076f4f7d8cc2a60ceca2&=&format=webp&quality=lossless&width=625&height=625"
    alt="Logo"
    class="header-logo"
  />

  <!-- Start Screen -->
  <StartScreen 
    v-if="activeScreen === 'start'" 
    @login-successful="handleLoginSuccess"
  />

  <!-- Game Screen -->
  <GameScreen
    v-if="activeScreen === 'game'"
    :user="currentUser"
    @logout="handleLogout"
    @show-highscore="openHighscore"
    @show-change-password="activeScreen = 'change-password'"
    @show-admin="openAdminPanel"
  />

  <!-- Change Password Screen -->
  <section v-if="activeScreen === 'change-password'" class="screen">
    <h1>Passwort ändern</h1>
    <form id="change-password-form" class="login-form">
      <div class="form-group">
        <label for="change-username">Benutzername</label>
        <input type="text" id="change-username" :value="currentUser.username" disabled />
      </div>
      <div class="form-group">
        <label for="old-password">Altes Passwort</label>
        <input type="password" id="old-password" required />
      </div>
      <div class="form-group">
        <label for="new-password">Neues Passwort</label>
        <input type="password" id="new-password" required />
      </div>
      <div class="form-group">
        <label for="confirm-password">Neues Passwort bestätigen</label>
        <input type="password" id="confirm-password" required />
      </div>
      <button type="submit">Speichern</button>
      <button type="button" @click="activeScreen = 'game'">Abbrechen</button>
    </form>
  </section>

  <!-- Admin Screen -->
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
                @click.stop="toggleUserSelection(user)"
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

  <!-- Highscore Modal -->
  <div v-if="showHighscoreModal" class="modal">
    <div class="modal-content">
      <span class="close-btn" @click="closeHighscore">&times;</span>
      <h2>Highscore</h2>
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
          <tr
            v-for="score in highscores"
            :key="score.rank"
            :class="{ 'current-player': score.name === currentUser.username }"
          >
            <td>{{ score.rank }}</td>
            <td>{{ score.name }}</td>
            <td>{{ score.score }}</td>
            <td>{{ score.date }}</td>
          </tr>
        </tbody>
      </table>
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
