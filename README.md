# Chekora Auto Continue Editing (v1.1.0)

**Autor:** [ThowiLabs](https://github.com/ThowiLabs)  
**Repositorio:** https://github.com/ThowiLabs/chekora-auto-continue-extension  
**ZIP de instalación:** https://raw.githubusercontent.com/ThowiLabs/chekora-auto-continue-extension/main/chekora-auto-continue-extension.zip

Extensión de navegador Manifest V3 para Chrome y Edge. Pulsa `Continue editing` **solo** cuando aparece el diálogo visible `Are you still there?` con el mensaje especificado de inactividad.

## Instalación

1. Descarga el ZIP del enlace anterior y extráelo.
2. Abre `chrome://extensions` o `edge://extensions`.
3. Activa **Modo de desarrollador**.
4. Selecciona **Cargar descomprimida** y elige la carpeta extraída (la que contiene `manifest.json`).
5. Si tenías la versión anterior instalada, elimínala o recárgala desde la página de extensiones y **recarga la pestaña de prueba**.
6. Comprueba que esté activada desde el icono de la extensión.

## Diagnóstico del HTML

Desde el icono de la extensión, pulsa **Diagnosticar pestaña actual**:

- **Marcos examinados:** documentos accesibles (incluidos iframes) que se pueden revisar.
- **Encabezado encontrado:** si existe realmente un `h2` con `Are you still there?`.
- **Mensaje correcto:** si aparece el texto de inactividad en el mismo diálogo.
- **Botón encontrado:** si existe `Continue editing`.
- **Modal visible y habilitado:** si la extensión tiene una oportunidad de pulsarlo.

**Importante:** el HTML que copiaste no contiene ningún controlador de clic original. Un clic puede ejecutarse sin mostrar cambios visibles. El archivo `test-modal.html` incorpora un controlador de prueba que confirma el evento.

Los visores que solo muestran el código como texto no crean un botón HTML real. Algunos visores utilizan `iframe srcdoc`/`about:blank`/`blob:`; esta versión habilita `match_origin_as_fallback` para permitir la inyección en marcos relacionados compatibles. Algunos iframes restringidos y páginas internas del navegador siguen siendo inaccesibles.

## Seguridad y detección

- **No se promete invisibilidad ni se falsifica interacción humana.**
- La extensión se ejecuta en el entorno aislado `ISOLATED` de Chrome, por lo que sus variables internas no aparecen normalmente como variables globales de la página.
- El resultado observable es un clic programático. El sitio puede observar `event.isTrusted === false`.
- Para pruebas defensivas, `test-modal.html` muestra el valor de `isTrusted` al detectar el clic automático.
- Un control de expiración real debe imponerse también en el **servidor**, no solo mediante un modal en el cliente.

## Pruebas

- `node test-content.js` (8 pruebas con DOM simulado).
- `node test-real-html.js` (6 pruebas con DOM HTML real de jsdom, usando `jsdom@26` instalado en `/tmp/chekora-html-test`, fuera del proyecto).
- `python3 -m http.server 8765` y `http://localhost:8765/test-modal.html` para probar con el navegador real y la extensión instalada. No uses `file://` sin otorgar permiso explícito.

Estas pruebas validan la lógica y el markup aportado, **pero no equivalen a una prueba directa en el navegador/dispositivo del usuario**.

## Estructura

- `manifest.json`: permisos, frames, metadatos.
- `content.js`: reconocimiento del aviso y clic.
- `popup.html`, `popup.css`, `popup.js`: control y diagnóstico.
- `test-modal.html`: prueba interactiva local con detector de clic programático.
- `test-content.js`, `test-real-html.js`: tests automáticos.

### Ruta en sandbox

`/workspace/chekora-auto-continue-extension/`, **fuera** del repositorio de la app `/workspace/Chekora/`.
