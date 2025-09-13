<template>
  <div class="snackbar-stack">
    <transition-group name="fade" tag="div">
      <div
        v-for="(snack, idx) in snackbars"
        :key="snack.id"
        :class="['snackbar', snack.type]"
        role="status"
        aria-live="polite"
        :style="{ top: `${idx * 90}px`, transform: 'translateX(-50%)' }"
      >
        {{ snack.message }}
      </div>
    </transition-group>
  </div>
</template>

<script setup>
const props = defineProps({
  snackbars: Array
})
</script>

<style scoped>
.snackbar-stack {
  position: absolute;
  left: 50%;
  top: 0;
  width: 0;
  z-index: 3000;
  pointer-events: none;
}

.snackbar {
  position: absolute;
  left: 50%;
  min-width: 320px;
  max-width: 90vw;
  background: #23272f;
  color: #fff;
  padding: 22px 40px;
  border-radius: 14px;
  font-size: 1.25rem;
  font-weight: bold;
  box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 1.5px 0 #fff2;
  opacity: 0.98;
  transition: all 0.35s cubic-bezier(.4,2,.6,1);
  margin-bottom: 16px;
  letter-spacing: 0.02em;
  text-align: center;
  border: 2.5px solid #fff4;
  filter: drop-shadow(0 2px 8px #0008);
  pointer-events: auto;
}

.snackbar.success { background: #43a047; border-color: #b9f6ca; }
.snackbar.error { background: #d32f2f; border-color: #ffcdd2; }
.snackbar.info { background: #1976d2; border-color: #bbdefb; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.35s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>