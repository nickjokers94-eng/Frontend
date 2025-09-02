<script setup>
import { ref } from 'vue'
import { loginAPI, registerAPI } from '../api.js'

const emit = defineEmits(['login-successful'])

const username = ref('')
const password = ref('')
const error = ref(null)
const success = ref(null)
const isLoading = ref(false)

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
</script>

<template>
  <section class="screen active">
    <img src="https://media.discordapp.net/attachments/903679816035876914/1410239792569909280/Design_ohne_Titel.png?ex=68b04ba7&is=68aefa27&hm=4e90d176d93cd71ef858cd493d48e66e3d3c0515acb7076f4f7d8cc2a60ceca2&=&format=webp&quality=lossless&width=625&height=625" alt="Wortratespiel Logo" class="logo-image">
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
      <button type="button" class="register-btn" @click="register" :disabled="isLoading">
        {{ isLoading ? 'Registriere...' : 'Registrieren' }}
      </button>
    </form>
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
</style>
