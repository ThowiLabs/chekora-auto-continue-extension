# Chekora — Auto Continue Editing

Extensión de navegador (Chromium/Chrome/Edge, Manifest V3) para confirmar automáticamente el diálogo de inactividad de una **sesión interactiva**.

## Qué hace

1. Busca un encabezado visible exactamente `Are you still there?`.
2. Comprueba que el párrafo de ese mismo diálogo contenga `You haven't made changes within your interactive session` y `keep your interactive session running`.
3. Si aparece un botón visible y habilitado cuyo texto sea exactamente `Continue editing`, le hace clic.
4. Usa `MutationObserver` y una revisión de respaldo cada 2 segundos para detectar diálogos nuevos o reutilizados.
5. Permite activar o pausar desde el icono de la extensión; muestra un contador local de clics.

No pulsa `Cancel`, no recopila datos de las páginas y no hace peticiones de red.

## Instalar en Chrome / Edge

1. Copia esta carpeta a la computadora donde utilizas el navegador, o usa el ZIP disponible al lado de esta carpeta (descomprímelo).
2. Abre `chrome://extensions` (Chrome) o `edge://extensions` (Edge).
3. Habilita **Modo de desarrollador**.
4. Selecciona **Cargar descomprimida** y elige la carpeta que contiene `manifest.json`.
5. Abre o recarga la pestaña donde aparece el diálogo. La extensión estará activa de forma predeterminada.
6. Puedes desactivarla temporalmente desde su icono.

### Alcance y límites

- Los permisos de acceso abarcan páginas `http://` y `https://` porque no se facilitó la URL concreta del servicio. **La extensión solo actúa si coinciden exactamente el diálogo y la acción esperados.** Para restringirla a un dominio, cambia el campo `matches` de `manifest.json`.
- No opera en `chrome://`, Chrome Web Store ni otras páginas que bloqueen extensiones.
- Debe estar **instalada en el navegador que muestra el diálogo**; guardar la carpeta dentro del sandbox no la activa automáticamente en otro navegador.
- No impide las desconexiones del servidor o cierres del navegador; actúa únicamente cuando el diálogo aparece y la página permite el clic.
- El contador se guarda solo en el almacenamiento local del navegador.

## Prueba manual

1. Instala la extensión.
2. Abre `test-modal.html` en un servidor web local, por ejemplo, en la carpeta de la extensión: `python3 -m http.server 8765` y visita `http://localhost:8765/test-modal.html`.
3. La prueba debe mostrar `Correcto: clic automático realizado`. El botón **Cancel** nunca debe recibir clics.
4. Desactiva la extensión y recarga la prueba: el botón no debe pulsarse automáticamente.

**Ubicación:** `/workspace/chekora-auto-continue-extension/`, fuera de `/workspace/Chekora/`.

## GitHub y autor

- **Autor:** [ThowiLabs](https://github.com/ThowiLabs)
- **Repositorio:** https://github.com/ThowiLabs/chekora-auto-continue-extension
- **Descargar ZIP:** https://github.com/ThowiLabs/chekora-auto-continue-extension/raw/refs/heads/main/chekora-auto-continue-extension.zip
- **Pruebas automatizadas:** `node test-content.js` (8 casos)
