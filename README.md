## Allgemeine Installationsanleitung

### Voraussetzungen

- **Node.js** (empfohlen: Version 18 oder neuer)  
  [Download Node.js](https://nodejs.org/)
- **npm** (wird mit Node.js installiert)
- Optional: [VSCode](https://code.visualstudio.com/) als Editor

### Projekt einrichten

1. **Repository klonen**  
   Lade das Projekt herunter oder klone es mit git:
   ```sh
   git clone <REPOSITORY-URL>
   cd vue-worti-klon
   ```

2. **Abhängigkeiten installieren**  
   Im Projektordner im Terminal ausführen:
   ```sh
   npm install
   ```

3. **Entwicklungsserver starten**  
   Starte das Frontend mit Hot-Reload:
   ```sh
   npm run dev
   ```
   Die Anwendung ist dann meist unter [http://localhost:5173](http://localhost:5173) erreichbar.

4. **Für Produktion bauen**  
   Um eine optimierte Version zu erstellen:
   ```sh
   npm run build
   ```

5. **Linter ausführen (optional)**  
   Um den Code zu prüfen:
   ```sh
   npm run lint
   ```

### Hinweise

- Das Frontend erwartet ein laufendes Backend auf `http://localhost:8080` (z.B. Spring Boot).
- Für die volle Funktionalität muss das Backend und Websocket separat gestartet werden.
- Bei Problemen mit Ports oder Abhängigkeiten bitte Node.js-Version prüfen.

---
