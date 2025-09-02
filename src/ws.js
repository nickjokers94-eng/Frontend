let socket = null

export function connectWebSocket(url = 'ws://localhost:3000') {
  socket = new WebSocket(url)
  return socket
}

export function sendMessage(msg) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
}

export function onMessage(cb) {
  if (!socket) return
  socket.onmessage = (event) => cb(event.data)
}

export function closeWebSocket() {
  if (socket) socket.close()
}