# Mis Gastos 💚

Una app web simple para controlar gastos personales, pensada para usarse desde
el celular como si fuera una app instalada — sin instalaciones, sin comandos,
sin conexión a internet una vez instalada.

## Abrir la app ahora mismo

Simplemente abrí el archivo `index.html` en el navegador (Chrome recomendado).
No hace falta instalar nada, ni ejecutar `npm install` ni ningún comando: es
HTML, CSS y JavaScript puro.

## Publicarla en GitHub Pages (para usarla desde el celular)

1. Creá un repositorio nuevo en GitHub (puede ser privado o público).
2. Subí **todos** los archivos y carpetas de esta carpeta tal cual están
   (`index.html`, `manifest.json`, `service-worker.js`, `css/`, `js/`, `icons/`).
3. En el repositorio, andá a **Settings → Pages**.
4. En "Source" elegí la rama `main` (o `master`) y la carpeta `/ (root)`.
5. Guardá. GitHub te va a dar una URL parecida a:
   `https://tu-usuario.github.io/tu-repositorio/`
6. Abrí esa URL desde el celular de tu mamá.

## Instalarla como app en el celular (Android / Chrome)

1. Abrí la URL de la app en Chrome.
2. Tocá los **tres puntos** (⋮) arriba a la derecha.
3. Elegí **"Instalar aplicación"** (o "Agregar a pantalla de inicio").
4. Listo: va a aparecer un ícono como cualquier otra app, y va a funcionar
   **sin internet** una vez instalada.

También va a aparecer un banner dentro de la app ("Instalar") que hace lo mismo
con un solo toque.

## Cómo se usa

- **Chat**: escribí el gasto como le contarías a alguien — "Comida 5000",
  "Luz 12000", "nafta 8k". La app reconoce el monto y la categoría sola y
  te muestra un recibo de confirmación. Tocando "Editar" en el recibo podés
  corregirlo.
- **Inicio**: totales de hoy, del mes y general, gráfico de gastos por día y
  gráfico circular por categoría, más el historial completo (con opción de
  editar ✏️ o eliminar 🗑️ cada gasto).
- **Deudas**: tocá el botón **+** para agregar una deuda (nombre, monto total,
  cuánto ya pagaste y vencimiento opcional). Cada deuda muestra una barra de
  progreso y se puede editar o eliminar.

## Datos

Todo se guarda en el propio celular, en el `localStorage` del navegador. No se
envía nada a ningún servidor. Si se borra la caché del navegador o los datos
del sitio, se pierde la información — no hay backup en la nube en esta
versión.

## Estructura del proyecto

```
gastos-mama/
├── index.html          # página principal
├── manifest.json        # configuración de la PWA
├── service-worker.js     # funcionamiento offline
├── css/
│   └── styles.css
├── js/
│   └── app.js            # toda la lógica (chat, gráficos, almacenamiento)
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    ├── icon-maskable-512.png
    └── apple-touch-icon.png
```
