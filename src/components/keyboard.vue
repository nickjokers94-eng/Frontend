<script setup>
/**
 * Props für die Tastatur-Komponente.
 * @property {Object} colors - Map für die Farben der Tasten (z.B. { a: 'correct', b: 'wrong' })
 * @property {Boolean} disabled - true, wenn die Tastatur deaktiviert ist
 * Funktion: Steuert die Darstellung und Aktivierung der Tastatur.
 * erstellt von: Nick Jokers
 */
defineProps({
  colors: Object,
  disabled: {
    type: Boolean,
    default: false
  }
})

/**
 * Emits für Tastatur-Events.
 * @event add - Wird ausgelöst, wenn eine Buchstabentaste gedrückt wird
 * @event delete - Wird ausgelöst, wenn Backspace gedrückt wird
 * @event submit - Wird ausgelöst, wenn Enter gedrückt wird
 * Funktion: Gibt Tastatureingaben an das Parent-Component weiter.
 * erstellt von: Nick Jokers
 */
const emit = defineEmits(['add', 'delete', 'submit'])

/**
 * Layout der Tastaturzeilen.
 * @type {Array<Array<string>>}
 * Funktion: Definiert die Reihen und Tasten der Bildschirmtastatur.
 * erstellt von: Nick Jokers
 */
const keys = [
  ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'ü'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'],
  ['Enter', 'y', 'x', 'c', 'v', 'b', 'n', 'm', 'Backspace']
]

/**
 * Behandelt einen Tastendruck auf der Bildschirmtastatur.
 * @param {string} key - Die gedrückte Taste
 * Funktion: Löst das passende Event (add, delete, submit) aus.
 * erstellt von: Nick Jokers
 */
function handleKeyPress(key) {
  if (key === 'Enter') {
    emit('submit')
  } else if (key === 'Backspace') {
    emit('delete')
  } else {
    emit('add', key)
  }
}
</script>

<template>
  <div id="keyboard">
    <div v-for="(row, index) in keys" :key="index" class="keyboard-row">
      <button
        v-for="key in row"
        :key="key"
        class="key"
        :class="[key.length > 1 ? 'large' : '', colors[key]]"
        :disabled="disabled"
        @click="handleKeyPress(key)"
      >
        {{ key }}
      </button>
    </div>
  </div>
</template>

<style>
.key {
  width: 56px;
  height: 56px;
  font-size: 2rem;
  margin: 6px;
  border-radius: 6px;
  touch-action: manipulation;
}
.key.large {
  width: 88px;
}
</style>