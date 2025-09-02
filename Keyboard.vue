<script setup>
defineProps({
  colors: Object
})
const emit = defineEmits(['add', 'delete', 'submit'])

const keys = [
  ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'ü'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'],
  ['Enter', 'y', 'x', 'c', 'v', 'b', 'n', 'm', 'Backspace']
]

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
        @click="handleKeyPress(key)"
      >
        {{ key }}
      </button>
    </div>
  </div>
</template>
