# Precandidaturas UI

Frontend React para el sistema de registro de precandidatos del partido PRD.

## Stack Tecnologico

| Componente | Tecnologia |
|------------|------------|
| Framework | React 18+ |
| Build Tool | Vite |
| Language | TypeScript |
| UI Library | Material UI (MUI) v5 |
| State Management | React Context + useReducer |
| Routing | TanStack Router (file-based) |
| Forms | TanStack Form |
| HTTP Client | Fetch API |
| Testing | Vitest |
| Package Manager | pnpm |

## Requisitos Previos

- Node.js 18+
- pnpm (instalar con `npm install -g pnpm`)

## Instalacion

```bash
# Clonar el repositorio
git clone <repository-url>
cd pre-candidaturas-ui

# Instalar dependencias
pnpm install
```

## Variables de Entorno

El proyecto utiliza archivos de entorno para configuracion por ambiente:

| Archivo | Descripcion |
|---------|-------------|
| `env-local.env` | Configuracion local (default) |
| `.env.dev` | Ambiente de desarrollo |
| `.env.qa` | Ambiente de testing |
| `.env.main` | Ambiente de produccion |

### Variables disponibles

```env
VITE_API_URL=http://localhost:9002/api/v1
VITE_AUTH_URL=http://localhost:9001/api/v1/auth

# Carpeta con los Excel de ejemplo/limpios. Absoluta o relativa al directorio
# desde donde se ejecuta el UI (default: ../demo_files).
DEMO_FILES_DIR=../demo_files
```

## Archivos demo (seccion "Ejemplos de archivos")

La seccion `Ejemplos de archivos` de `/dashboard/excel` descarga los Excel desde
`DEMO_FILES_DIR` mediante rutas relativas al mismo origen: `/demo-files/<nombre>`.

- **Desarrollo** (`pnpm dev`): el plugin `server/demoFilesPlugin.ts` sirve
  `/demo-files/*` leyendo `DEMO_FILES_DIR`. Tambien funciona con `pnpm preview`.
- **Produccion (EC2)**: solo se copia `dist/`; Vite no se ejecuta alli. Caddy debe
  servir `/demo-files/*` desde la carpeta de los Excel. Ejemplo de Caddyfile:

```caddyfile
example.com {
    handle /demo-files/* {
        uri strip_prefix /demo-files
        root * /ruta/absoluta/a/demo_files
        file_server
    }

    handle {
        root * /ruta/absoluta/a/dist
        try_files {path} /index.html
        file_server
    }
}
```

Solo se sirven los nombres de archivo declarados en el catalogo
(`src/services/demoFilesCatalog.ts`); cualquier otro nombre o intento de salir de
la carpeta responde 404. La UI valida la sesion con `GET /me` antes de descargar.

## Levantar el Proyecto

```bash
# Modo desarrollo (default)
pnpm dev

# Modo desarrollo con ambiente especifico
pnpm dev --mode dev
pnpm dev --mode qa
pnpm dev --mode main
```

El proyecto estara disponible en: `http://localhost:5173`

## Scripts Disponibles

```bash
pnpm dev          # Iniciar servidor de desarrollo
pnpm build        # Compilar para produccion
pnpm preview      # Vista previa de la build de produccion
pnpm test         # Ejecutar tests
pnpm test:ui      # Ejecutar tests con interfaz grafica
pnpm lint         # Ejecutar linter
pnpm typecheck    # Verificar tipos TypeScript
```

## Debugging

### Chrome DevTools

1. Iniciar el proyecto con `pnpm dev`
2. Abrir Chrome DevTools (F12)
3. Ir a la pestana "Sources"
4. Buscar archivos en `src/`

### VS Code

1. Abrir el proyecto en VS Code
2. Instalar extension "Debugger for Chrome"
3. Crear archivo `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

4. Presionar F5 para iniciar debugging

### React DevTools

1. Instalar extension "React Developer Tools" en Chrome
2. Abrir DevTools y usar pestana "Components" o "Profiler"

## Estructura del Proyecto

```
pre-candidaturas-ui/
  src/
    routes/              # Paginas (TanStack Router file-based)
    components/          # Componentes compartidos
    contexts/            # React Context (Auth, Theme)
    hooks/               # Custom hooks
    services/            # API calls (Fetch)
    types/               # TypeScript types
    theme/               # MUI theme (light/dark)
    utils/               # Helpers
  .agents/               # Configuracion para IA
    agents/              # Agentes especializados
    skills/              # Skills/habilidades
    tasks/               # Tareas de implementacion
```

## Backend

El frontend se conecta al backend de Precandidaturas:

- **Auth API**: `http://localhost:9001/api/v1/auth` (login, usuarios)
- **Main API**: `http://localhost:9002/api/v1` (precandidatos, documentos)

Consultar `../pre-candidaturas-backend/AGENTS.md` para documentacion del backend.

## Colores PRD

| Color | Hex | Uso |
|-------|-----|-----|
| Azul Marino | #003366 | Color primario |
| Amarillo PRD | #FFD100 | Color secundario |
| Rojo PRD | #CC0000 | Color de error |
