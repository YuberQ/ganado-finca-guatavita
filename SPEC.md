# SPEC — Sistema de Gestión Ganadera Finca Guatavita

## Arquitectura
- Frontend: HTML + CSS + JavaScript vanilla (NO frameworks, NO React/Vue/Angular)
- SPA (Single Page Application) con hash routing
- Backend: Supabase (PostgreSQL + Auth + Storage)
- Supabase JS client v2 cargado desde CDN: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- SheetJS para Excel desde CDN: `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js`
- Deploy: GitHub Pages (archivos estáticos)

## Diseño Visual
- Paleta VERDE: #1a3c1a (oscuro), #2d5016 (principal), #4a7c2e (medio), #6b8f3c (claro), #d4e6c3 (bg claro)
- Paleta MARRÓN: #3e2723 (oscuro), #5c3d2e (principal), #8b6914 (dorado), #a0522d (siena), #d2b48c (tan), #f5f0e8 (crema bg)
- Fondos: #f5f0e8 (crema) para body, #fff para cards
- Texto: #2c2c2c principal, #5c3d2e secundario
- CERO border-radius (todo cuadrado, figuras rectas)
- Bordes sólidos de 2px, líneas marcadas
- Tipografía: 'Segoe UI', Tahoma, sans-serif (NO Google Fonts)
- Sombras sutiles: 0 2px 4px rgba(0,0,0,0.1)
- Botones con bordes rectos, fondo sólido verde o marrón
- NO gradientes, NO animaciones excesivas

## Rutas (hash-based)
- `#/login` → Pantalla login
- `#/dashboard` → Dashboard principal (animales activos)
- `#/add` → Formulario agregar animal
- `#/animal/{id}` → Ficha detallada del animal
- `#/edit/{id}` → Editar animal (con nota obligatoria)
- `#/breeding/{motherId}` → Registrar cría
- `#/wean/{calfId}` → Destetar ternero
- `#/weight-session` → Jornada de pesaje
- `#/sold` → Lista de vendidos
- `#/lost` → Lista de perdidos
- `#/export` → Exportar a Excel

## Base de Datos (Supabase PostgreSQL)

### Tabla: animales
```sql
CREATE TABLE animales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('vaca','toro','novilla','ternero','ternera')),
  sexo TEXT NOT NULL CHECK (sexo IN ('masculino','femenino')),
  peso_entrada DECIMAL(10,2),
  valor_compra DECIMAL(12,2),
  fecha_ingreso DATE,
  fecha_nacimiento DATE,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','vendido','perdido')),
  madre_id UUID REFERENCES animales(id),
  padre_id UUID REFERENCES animales(id),
  es_nacido_en_finca BOOLEAN DEFAULT false,
  es_destetado BOOLEAN DEFAULT false,
  raza TEXT,
  color_pelaje TEXT,
  hierro TEXT,
  observaciones TEXT,
  foto_perfil_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: fotos_animal
```sql
CREATE TABLE fotos_animal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  es_perfil BOOLEAN DEFAULT false,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: pesajes
```sql
CREATE TABLE pesajes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  peso_kg DECIMAL(10,2) NOT NULL,
  fecha TIMESTAMPTZ DEFAULT now(),
  notas TEXT
);
```

### Tabla: historial_cambios
```sql
CREATE TABLE historial_cambios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  campo_cambiado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  nota TEXT NOT NULL,
  usuario TEXT,
  fecha TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: ventas
```sql
CREATE TABLE ventas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES animales(id) ON DELETE CASCADE,
  peso_salida DECIMAL(10,2),
  precio_venta DECIMAL(12,2) NOT NULL,
  comprador TEXT,
  fecha_venta DATE DEFAULT CURRENT_DATE,
  nota TEXT
);
```

## Módulos JavaScript (ES Modules)

### js/config.js
Exporta: `supabase` (client instance)
```js
const SUPABASE_URL = 'TU_URL_AQUI';
const SUPABASE_ANON_KEY = 'TU_KEY_AQUI';
// import { createClient } from supabase CDN
```

### js/auth.js
Exporta: `login(email, password)`, `logout()`, `getSession()`, `onAuthChange(callback)`

### js/db.js
Exporta funciones CRUD:
- `getAnimales(filters)` → array de animales con filtros opcionales {tipo, estado, etc}
- `getAnimal(id)` → animal con fotos, pesajes, crías
- `createAnimal(data)` → nuevo animal
- `updateAnimal(id, data, nota)` → actualizar + registrar en historial
- `getCrias(madreId)` → crías de una vaca
- `getCriaActual(madreId)` → cría no destetada
- `destetar(terneroId, nuevoTipo)` → marca como destetado, cambia tipo
- `registrarCria(madreId, data)` → crea ternero vinculado
- `getPesajes(animalId)` → historial de pesajes
- `addPesaje(animalId, pesoKg, notas)` → nuevo pesaje
- `venderAnimal(animalId, data)` → marcar vendido
- `revertirVenta(animalId, nota)` → revertir venta
- `marcarPerdido(animalId, nota)` → marcar perdido
- `revertirPerdido(animalId, nota)` → revertir perdido
- `getHistorial(animalId)` → historial de cambios
- `getVendidos()` → animales vendidos
- `getPerdidos()` → animales perdidos

### js/storage.js
Exporta:
- `uploadPhoto(file, animalId)` → sube foto, retorna URL
- `deletePhoto(url)` → elimina foto
- `getPhotoUrl(path)` → URL pública

### js/ui.js
Exporta componentes UI reutilizables:
- `showModal(title, content, onConfirm)` → modal genérico
- `showNoteModal(title, onConfirm)` → modal que EXIGE nota obligatoria
- `showToast(message, type)` → notificación temporal (type: 'success','error','info')
- `showConfirm(message, onConfirm)` → confirmación
- `createAnimalCard(animal)` → HTML string de tarjeta de animal
- `createTable(headers, rows)` → HTML string de tabla
- `showLoading()` / `hideLoading()` → spinner de carga
- `formatDate(date)` → formato legible
- `formatMoney(amount)` → formato moneda

### js/animals.js
Exporta funciones de renderizado de páginas:
- `renderDashboard(container)` → dashboard principal con cards de animales
- `renderAddForm(container)` → formulario agregar animal
- `renderAnimalDetail(container, id)` → ficha detallada
- `renderEditForm(container, id)` → formulario edición con nota obligatoria

### js/breeding.js
Exporta:
- `renderBreedingForm(container, motherId)` → formulario registrar cría
- `renderWeanForm(container, calfId)` → formulario destete
- `renderBreedingHistory(container, motherId)` → historial de crías

### js/weights.js
Exporta:
- `renderWeightSession(container)` → jornada de pesaje

### js/sales.js
Exporta:
- `renderSellForm(container, animalId)` → formulario venta
- `renderSoldList(container)` → lista de vendidos
- `renderLostList(container)` → lista de perdidos

### js/history.js
Exporta:
- `renderHistoryModal(animalId)` → modal con historial de cambios

### js/excel.js
Exporta:
- `renderExportPage(container)` → página de exportación
- `exportToExcel()` → genera y descarga archivo .xlsx

Formato Excel basado en el archivo del usuario:
- Título: "RELACION GANADO FINCA GUATAVITA UVER QUINTERO"
- Columnas: N°, PESO KG entrada, precio entrada, precio total, tipo, nombre, observaciones
- Secciones separadas: Vacas, Toros, Novillas, Terneros

### js/app.js
- Router hash-based
- Inicialización de la app
- Renderizado de navegación lateral
- Manejo de rutas

## HTML Structure

### index.html (Login)
- Pantalla centrada con formulario email + password
- Logo/título de la app
- Fondo crema con card de login en blanco

### app.html (SPA Shell)
```html
<body>
  <nav id="sidebar">
    <!-- Logo, links de navegación, botón logout -->
  </nav>
  <main id="main-content">
    <header id="top-bar">
      <!-- Título de página actual, botón menú móvil -->
    </header>
    <div id="page-content">
      <!-- Contenido dinámico renderizado por JS -->
    </div>
  </main>
</body>
```

Navegación del sidebar:
- Dashboard (ícono home)
- Agregar Animal (ícono +)
- Jornada de Peso (ícono balanza)
- Vendidos (ícono $)
- Perdidos (ícono x)
- Exportar Excel (ícono descarga)
- Cerrar Sesión (ícono salir)

## CSS Class Conventions

### Layout
- `.sidebar` → navegación lateral
- `.sidebar-link` → links del sidebar
- `.sidebar-link.active` → link activo
- `.main-content` → área principal
- `.top-bar` → barra superior
- `.page-content` → contenedor de página

### Components
- `.btn` → botón base
- `.btn-primary` → botón verde principal (#2d5016)
- `.btn-secondary` → botón marrón (#5c3d2e)
- `.btn-danger` → botón rojo (#c62828)
- `.btn-warning` → botón naranja (#e65100)
- `.btn-sm` → botón pequeño
- `.btn-icon` → botón solo ícono
- `.card` → tarjeta base
- `.card-header` → encabezado de tarjeta
- `.card-body` → cuerpo de tarjeta
- `.animal-card` → tarjeta de animal en dashboard
- `.animal-card__photo` → foto en tarjeta
- `.animal-card__info` → info en tarjeta
- `.animal-card__name` → nombre en tarjeta
- `.animal-card__badge` → badge de tipo/estado
- `.form-group` → grupo de formulario
- `.form-label` → label
- `.form-input` → input
- `.form-select` → select
- `.form-textarea` → textarea
- `.form-row` → fila de formulario (grid 2 cols)
- `.modal` → overlay del modal
- `.modal-content` → contenido del modal
- `.modal-header` → header del modal
- `.modal-body` → body del modal
- `.modal-footer` → footer del modal
- `.toast` → notificación toast
- `.toast-success` → toast éxito
- `.toast-error` → toast error
- `.table` → tabla base
- `.table th` → encabezado
- `.table td` → celda
- `.badge` → badge genérico
- `.badge-vaca` → verde
- `.badge-toro` → marrón
- `.badge-ternero` → dorado
- `.badge-vendido` → gris
- `.badge-perdido` → rojo
- `.history-icon` → ícono ⚠️ de historial
- `.photo-gallery` → galería de fotos
- `.photo-upload` → área de subida de foto
- `.stats-grid` → grid de estadísticas del dashboard
- `.stat-card` → tarjeta de estadística
- `.loading` → spinner de carga
- `.empty-state` → estado vacío
- `.detail-section` → sección en ficha de animal
- `.cria-info` → información de cría actual (debajo de vaca parida)
- `.filter-bar` → barra de filtros
- `.search-input` → input de búsqueda

### Responsive
- Mobile: sidebar se oculta, se muestra con botón hamburguesa
- Breakpoint: 768px
- Cards en grid: 1 col mobile, 2 cols tablet, 3-4 cols desktop
