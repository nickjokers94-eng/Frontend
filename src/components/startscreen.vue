<script setup>
import { ref } from 'vue'
import { loginAPI, registerAPI, changePasswordAPI } from '../api.js'

// Emits das Event 'login-successful' nach erfolgreichem Login
const emit = defineEmits(['login-successful'])

// Benutzername für Login/Registrierung
const username = ref('')
// Passwort für Login/Registrierung
const password = ref('')
// Fehlermeldung für Login/Registrierung
const error = ref(null)
// Erfolgsmeldung für Registrierung
const success = ref(null)
// Ladezustand für Buttons
const isLoading = ref(false)

// Passwort ändern Modal sichtbar?
const showChangePw = ref(false)
// Benutzername für Passwortänderung
const pwUser = ref('')
// Altes Passwort für Passwortänderung
const oldPassword = ref('')
// Neues Passwort für Passwortänderung
const newPassword = ref('')
// Bestätigung neues Passwort für Passwortänderung
const confirmPassword = ref('')
// Fehlermeldung für Passwortänderung
const pwError = ref('')
// Erfolgsmeldung für Passwortänderung
const pwMessage = ref('')

/**
 * Meldet den Benutzer an.
 * Keine Parameter.
 * Funktion: Ruft das Login-API auf und gibt das Ergebnis an das Parent-Component weiter.
 * erstellt von: Nick Jokers
 */
async function login() {
  isLoading.value = true
  error.value = null
  success.value = null
  try {
    const userData = await loginAPI(username.value, password.value)
    emit('login-successful', userData)
  } catch (err) {
    error.value = err.error || err
  } finally {
    isLoading.value = false
  }
}

/**
 * Registriert einen neuen Benutzer.
 * Keine Parameter.
 * Funktion: Ruft das Register-API auf und zeigt Erfolg/Fehler an.
 * erstellt von: Nick Jokers
 */
async function register() {
  if (!username.value || !password.value) {
    error.value = 'Bitte Benutzername und Passwort eingeben'
    return
  }
  
  isLoading.value = true
  error.value = null
  success.value = null
  try {
    const result = await registerAPI(username.value, password.value)
    success.value = 'Registrierung erfolgreich! Warte auf Admin-Freischaltung.'
    username.value = ''
    password.value = ''
  } catch (err) {
    error.value = err.error || err
  } finally {
    isLoading.value = false
  }
}

/**
 * Öffnet das Passwort ändern Modal.
 * Keine Parameter.
 * Funktion: Setzt die Modal-Variablen und zeigt das Modal an.
 * erstellt von: Nick Jokers
 */
function openChangePw() {
  showChangePw.value = true
  pwUser.value = username.value // Username vorausfüllen
  oldPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  pwError.value = ''
  pwMessage.value = ''
}

/**
 * Schließt das Passwort ändern Modal.
 * Keine Parameter.
 * Funktion: Blendet das Modal aus.
 * erstellt von: Nick Jokers
 */
function closeChangePw() {
  showChangePw.value = false
}

/**
 * Ändert das Passwort des Benutzers.
 * Keine Parameter.
 * Funktion: Validiert Eingaben und ruft das Passwort-API auf.
 * erstellt von: Nick Jokers
 */
async function changePassword() {
  pwError.value = ''
  pwMessage.value = ''
  if (!pwUser.value || !oldPassword.value || !newPassword.value || !confirmPassword.value) {
    pwError.value = 'Bitte alle Felder ausfüllen'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    pwError.value = 'Neue Passwörter stimmen nicht überein'
    return
  }
  if (newPassword.value.length < 3) {
    pwError.value = 'Neues Passwort muss mindestens 3 Zeichen haben'
    return
  }
  try {
    await changePasswordAPI(pwUser.value, oldPassword.value, newPassword.value)
    pwMessage.value = 'Passwort erfolgreich geändert'
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    pwError.value = err.error || 'Fehler beim Ändern des Passworts'
  }
}
</script>

<template>
  <section class="screen active">
    <img src="https://i.imgur.com/rE702YZ.png" alt="Wortratespiel Logo" class="logo-image">
    <h1>Das Wortratespiel</h1>
    <p>alleine oder mit Freunden</p>

    <form class="login-form" @submit.prevent="login">
      <div class="form-group">
        <label for="username">Benutzername</label>
        <input type="text" id="username" v-model="username" required>
      </div>
      <div class="form-group">
        <label for="password">Passwort</label>
        <input type="password" id="password" v-model="password" required>
      </div>
      <p v-if="error" style="color: red;">{{ error }}</p>
      <p v-if="success" style="color: green;">{{ success }}</p>
      <button type="submit" :disabled="isLoading">
        {{ isLoading ? 'Melde an...' : 'Anmelden' }}
      </button>
      <button type="button" class="register-btn" style="background:#0077cc;margin-top:16px;" @click="openChangePw">
        Passwort ändern
      </button>
      <button type="button" class="register-btn" @click="register" :disabled="isLoading">
        {{ isLoading ? 'Registriere...' : 'Registrieren' }}
      </button>
    </form>

    <!-- Passwort ändern Modal -->
    <div v-if="showChangePw" class="modal">
      <div class="modal-content" style="max-width:400px;">
        <h2>Passwort ändern</h2>
        <form @submit.prevent="changePassword">
          <div class="form-group">
            <label for="pw-user">Benutzername</label>
            <input type="text" id="pw-user" v-model="pwUser" required readonly>
          </div>
          <div class="form-group">
            <label for="old-pw">Altes Passwort</label>
            <input type="password" id="old-pw" v-model="oldPassword" required>
          </div>
          <div class="form-group">
            <label for="new-pw">Neues Passwort</label>
            <input type="password" id="new-pw" v-model="newPassword" required>
          </div>
          <div class="form-group">
            <label for="confirm-pw">Neues Passwort bestätigen</label>
            <input type="password" id="confirm-pw" v-model="confirmPassword" required>
          </div>
          <div v-if="pwError" style="color:red;">{{ pwError }}</div>
          <div v-if="pwMessage" style="color:green;">{{ pwMessage }}</div>
          <button type="submit">Speichern</button>
          <button type="button" @click="closeChangePw" style="margin-left:10px;">Abbrechen</button>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.register-btn {
  width: 100%;
  background-color: #6c757d;
  color: white;
  padding: 8px;
  font-size: 14px;
  margin-top: 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.register-btn:hover {
  background-color: #5a6268;
}

.register-btn:disabled {
  background-color: #adb5bd;
  cursor: not-allowed;
}

/* Modal Styles */
.modal {
  display: block;
  position: fixed;
  z-index: 1000;
  left: 0; top: 0; width: 100%; height: 100%;
  background-color: rgba(0,0,0,0.5);
}
.modal-content {
  background: #fff;
  margin: 8% auto;
  padding: 20px 30px;
  border-radius: 10px;
  max-width: 400px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  position: relative;
}
</style>