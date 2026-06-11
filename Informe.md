# SIAGRD — Sistema de Información y Alerta para la Gestión del Riesgo de Desastres
**Organización:** Corpofuturo  
**Departamento:** Meta — Colombia  
**Versión actual:** Build 99221b4 · Junio 2026  
**Repositorio:** `D:\Jota\Desa\siagrd`

---

## PARTE I — DESCRIPCIÓN TÉCNICA DEL SISTEMA

### 1. Arquitectura general

SIAGRD es una plataforma distribuida compuesta por tres capas:

```
┌─────────────────────────────────────────────────────────────────┐
│  APK Android (Expo/React Native)   Panel Web (Next.js/Netlify)  │
│  org.corpofuturo.siagrd.ciudadano  siagrd-panel-web.netlify.app │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / REST JSON
┌────────────────────────▼────────────────────────────────────────┐
│          Backend Fastify (Node.js 20 · TypeScript)              │
│       backend-production-60016.up.railway.app                   │
│                    Railway (cloud)                               │
└────────────────────────┬────────────────────────────────────────┘
                         │ postgres.js
┌────────────────────────▼────────────────────────────────────────┐
│        PostgreSQL 16 — Railway                                   │
│   viaduct.proxy.rlwy.net:56926 / siagrd                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Stack tecnológico

| Componente | Tecnología |
|---|---|
| APK móvil | React Native + Expo SDK 50 · expo-router (file-based routing) |
| Panel web | Next.js 14 App Router · Tailwind CSS · shadcn/ui |
| Backend API | Fastify 4 · TypeScript · postgres.js (sin ORM) |
| Base de datos | PostgreSQL 16 (Railway) |
| Autenticación | JWT (HS256) · SimpleJWT · SecureStore (APK) · Cookie (web) |
| Mapas | Leaflet.js + OpenStreetMap (WebView en APK · iframe en web) |
| Deploy backend | Railway (Docker) |
| Deploy web | Netlify |
| Build APK | Gradle + Android Studio · Eclipse Adoptium JDK 17 |

### 3. Estructura del monorepo

```
siagrd/
├── apps/
│   ├── ciudadano/          # APK React Native (Expo)
│   │   └── src/app/
│   │       ├── (tabs)/     # Tabs principales: panel, mapa, incidente, sync, chats, perfil
│   │       ├── admin/      # Pantallas de administración nativas
│   │       ├── incidente/  # Detalle de incidente
│   │       └── chat/       # Chat de canal
│   └── panel-web/          # Next.js 14
│       └── src/app/
│           └── (dashboard)/  # Páginas protegidas con Sidebar
├── backend/
│   └── src/
│       ├── routes/         # 21 rutas REST
│       ├── middleware/      # auth.ts (JWT verify)
│       ├── lib/db.ts        # Conexión postgres.js
│       └── types/domain.ts # Tipos compartidos
└── database/
    └── migrations/         # 019 migraciones SQL ejecutadas en Railway
```

### 4. API REST — endpoints principales

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/auth/login` | Login, devuelve JWT | No |
| POST | `/auth/register` | Registro ciudadano | No |
| GET | `/incidentes` | Lista paginada con filtros | Sí |
| POST | `/incidentes` | Crear incidente | Sí |
| GET | `/incidentes/mapa` | Incidentes con lat/lon para mapa | Sí |
| GET | `/incidentes/:id` | Detalle + actualizaciones | Sí |
| PATCH | `/incidentes/:id` | Actualizar estado/datos | ADMIN/CDGRD |
| GET | `/alertas` | Alertas activas | Sí |
| POST | `/alertas` | Emitir alerta | ADMIN/CDGRD |
| GET | `/organismos` | Organismos de socorro | Sí |
| POST/PATCH/DELETE | `/organismos/:id` | CRUD organismos | ADMIN |
| GET/POST/PATCH/DELETE | `/comites` | CRUD comités GRD | ADMIN/CDGRD |
| GET/POST/PATCH/DELETE | `/jal` | CRUD juntas de acción comunal | ADMIN/CDGRD |
| GET | `/grupos/resumen` | Conteos por tipo de grupo | Sí |
| GET | `/grupos/socorro` | Usuarios rol SOCORRO | Sí |
| GET | `/grupos/ciudadanos` | Usuarios rol CIUDADANO | Sí |
| GET | `/grupos/comites` | Usuarios rol CDGRD/CMGRD | Sí |
| GET | `/configuracion` | Configuración del sistema | No |
| PATCH | `/configuracion` | Modificar configuración | ADMIN |
| POST | `/configuracion/informe-ungrd` | Generar informe para UNGRD | ADMIN/CDGRD |
| GET | `/municipios` | Lista municipios del Meta | No |
| GET | `/estadisticas` | Métricas dashboard | Sí |
| GET/POST | `/chat/canales` | Canales de comunicación | Sí |
| GET/POST | `/chat/canales/:id/mensajes` | Mensajes de canal | Sí |
| POST | `/sync` | Sincronización offline → servidor | Sí |
| GET | `/dashboard` | Resumen ejecutivo | ADMIN/CDGRD |

### 5. Roles y permisos

```
ADMIN       → Acceso total. Configura el sistema, crea usuarios, ve todo.
CDGRD       → Coordinador Departamental. Gestiona comités, incidentes, alertas.
CMGRD       → Coordinador Municipal. Ve su municipio.
SDGRD       → Secretaría Departamental. Lectura extendida.
SOCORRO     → Organismo de socorro. Ve su organismo y responde incidentes.
CIUDADANO   → Reporta incidentes. Acceso limitado.
```

### 6. Modelo de datos principal

| Tabla | Descripción |
|---|---|
| `profiles` | Usuarios del sistema (extiende auth) |
| `incidentes` | Eventos de riesgo reportados |
| `actualizaciones_incidente` | Novedades por incidente |
| `alertas` | Alertas emitidas (VERDE/AMARILLO/NARANJA/ROJO) |
| `municipios` | 29 municipios del Meta con lat/lon |
| `organismos_socorro` | Cruz Roja, Bomberos, Defensa Civil, Policía |
| `comites_gestion_riesgo` | CONGRD, CDGRD, SDGRD, CMGRD |
| `juntas_accion_comunal` | JAC por barrio/vereda |
| `configuracion` | Singleton con datos del sistema |
| `canales_comunicacion` | Canales de chat |
| `mensajes` | Mensajes por canal |
| `recursos` | Inventario de recursos de respuesta |
| `damnificados` | Registro de personas afectadas |

### 7. Seguridad implementada

- JWT firmado con `JWT_SECRET` (variable de entorno, nunca en código)
- `DEBUG = false` en producción (Railway)
- CORS restringido a dominios autorizados (Netlify + Railway)
- Roles verificados en cada endpoint sensible antes de ejecutar
- SecureStore para token JWT en el APK (cifrado por Android Keystore)
- Cookie `HttpOnly` para JWT en panel web
- Sin `float` para valores monetarios (Decimal en toda la lógica)
- Datos PII: contraseñas con bcrypt, tokens no almacenados en base de datos

### 8. Funcionamiento offline (APK)

El APK detecta pérdida de conexión y guarda incidentes en `AsyncStorage` con estado `PENDIENTE`. Al recuperar conectividad, el tab **Sync** los envía al backend automáticamente vía `POST /sync`.

### 9. Mapa — Leaflet + OpenStreetMap

No requiere Google Maps API Key. El mapa se renderiza con Leaflet.js dentro de un `WebView` en el APK. Los tiles provienen de OpenStreetMap (gratuito, sin límites de cuota). Los marcadores se colorean por `nivel_alerta`:

| Color | Nivel |
|---|---|
| 🟢 Verde (#22C55E) | VERDE |
| 🟡 Amarillo (#EAB308) | AMARILLO |
| 🟠 Naranja (#F97316) | NARANJA |
| 🔴 Rojo (#EF4444) | ROJO |

---

## PARTE II — MANUAL DEL SUPERUSUARIO (ROL ADMIN)

### 1. Cómo ingresar al sistema

**APK Android:**
1. Abra la app **SIAGRD** en su teléfono
2. Ingrese su correo y contraseña de administrador
3. El sistema lo llevará al **Panel** automáticamente

**Panel Web:**
1. Abra `https://siagrd-panel-web.netlify.app` en su navegador
2. Ingrese sus credenciales
3. Quedará en el Dashboard con el menú lateral izquierdo

---

### 2. Panel principal (Dashboard)

Al ingresar verá la lista de **incidentes activos** ordenados por fecha. Cada tarjeta muestra:
- Código del evento (EV-YYYY-NNN)
- Tipo de amenaza (SISMO, INUNDACIÓN, INCENDIO, etc.)
- Descripción breve
- Nivel de alerta (badge de color)
- Estado (EN CURSO, CERRADO, CONTROLADO, etc.)

Toque cualquier incidente para ver el detalle completo con actualizaciones y mini-mapa.

---

### 3. Mapa de eventos

**Tab Mapa** (APK) o sección **Mapa** (web):
- Muestra todos los incidentes georeferenciados sobre Colombia/Meta
- Filtros en la parte superior: **Todos · Activos · Este mes · Cerrados**
- Contador en la esquina inferior izquierda
- Pellizque para hacer zoom / arrastre para desplazarse

---

### 4. Reportar un nuevo incidente

**APK → Tab "Incidente" (ícono +):**
1. Seleccione el tipo de amenaza (Inundación, Remoción, Sismo, Incendio, Vendaval, Otro)
2. Complete la descripción y municipio
3. Adjunte una foto si lo desea
4. Toque **Registrar** — se enviará al servidor o se guardará offline si no hay conexión

---

### 5. Configuración del Sistema

**APK → Perfil → Configuración del Sistema**  
**Web → Menú lateral → Administración → Configuración**

Aquí puede establecer:

| Campo | Descripción |
|---|---|
| Nombre del Sistema | Nombre que aparece en reportes (ej: SIAGRD Meta) |
| Nombre del Departamento | Departamento que opera el sistema (ej: Meta) |
| Código DANE | Código DANE del departamento (ej: 50) |
| Correo UNGRD | Correo al que se referencia el informe UNGRD |
| URL UNGRD | Dirección web de la UNGRD |

Toque **Guardar** para confirmar los cambios.

**Generar Informe UNGRD:** Produce un archivo JSON con estadísticas de los últimos 30 días listo para reportar a la Unidad Nacional para la Gestión del Riesgo. El informe incluye: total de incidentes, cerrados, activos, controlados, falsos positivos y la lista completa de eventos.

---

### 6. Organismos de Socorro

**APK → Perfil → Organismos de Socorro**  
**Web → Menú lateral → Organizaciones → Organismos**

Gestiona los organismos registrados:
- **Cruz Roja Colombiana** (seccional y municipal)
- **Defensa Civil Colombiana**
- **Cuerpo de Bomberos** (municipal y departamental)
- **Policía Nacional**

**Acciones disponibles:**
- Ver lista completa con municipio y tipo
- Crear nuevo organismo con el botón **+** (azul, esquina inferior derecha)
- Ver los usuarios vinculados a cada organismo
- Agregar usuarios al organismo desde el detalle

---

### 7. Comités de Gestión del Riesgo

**APK → Perfil → Comités GRD**  
**Web → Menú lateral → Organizaciones → Comités**

Administra los cuatro tipos de comités:

| Sigla | Nombre completo | Nivel |
|---|---|---|
| CONGRD | Consejo Nacional para la Gestión del Riesgo | Nacional |
| CDGRD | Consejo Departamental para la Gestión del Riesgo | Departamental |
| SDGRD | Secretaría Departamental de Gestión del Riesgo | Departamental |
| CMGRD | Consejo Municipal para la Gestión del Riesgo | Municipal |

Para cada comité puede registrar: nombre, presidente, secretario, correo, teléfono y dirección.

---

### 8. Juntas de Acción Comunal (JAC / JAL)

**APK → Perfil → Juntas de Acción Comunal**  
**Web → Menú lateral → Organizaciones → JAC**

Registra las juntas por barrio o vereda con:
- Nombre de la JAC
- Barrio / Vereda
- Municipio
- Presidente
- Correo y teléfono de contacto

Use el botón **+** para agregar nuevas juntas. Toque **Editar** en cada registro para actualizar datos.

---

### 9. Grupos de Usuarios

**APK → Perfil → Grupos de Usuarios**  
**Web → Menú lateral → Organizaciones → Grupos**

Vista consolidada de todos los usuarios del sistema divididos en tres pestañas:

| Pestaña | Quiénes aparecen |
|---|---|
| Socorro | Usuarios vinculados a organismos de socorro |
| Ciudadanos | Ciudadanos registrados que reportan incidentes |
| Comités | Coordinadores departamentales y municipales |

Muestra nombre, correo y organismo/rol de cada persona.

---

### 10. Alertas

**Web → Menú lateral → Operaciones → Alertas**

Permite emitir y consultar alertas del sistema con cuatro niveles:

| Nivel | Significado |
|---|---|
| 🟢 VERDE | Situación normal — vigilancia |
| 🟡 AMARILLO | Alerta temprana — preparación |
| 🟠 NARANJA | Alerta activa — movilización |
| 🔴 ROJO | Emergencia — respuesta inmediata |

---

### 11. Comunicaciones (Chats)

**APK → Tab Chats**  
**Web → Menú lateral → Operaciones → Comunicaciones**

Canales de comunicación interna entre organismos y coordinadores. El canal **General Organismos** es el canal por defecto para todos los usuarios con rol SOCORRO y superiores.

---

### 12. Estadísticas y Reportes

**Web → Menú lateral → Administración → Estadísticas / Reportes**

Métricas del sistema: incidentes por municipio, por tipo de amenaza, por período, tiempos de respuesta y organismos que respondieron.

---

### 13. Sincronización offline (APK)

**APK → Tab Sync (ícono ↻)**

Cuando el campo tiene conectividad limitada, los incidentes se guardan localmente. Al recuperar señal, abra este tab — si dice **"Todo sincronizado"** (check verde) todos los datos están en el servidor. Si hay pendientes, aparecerá un contador y un botón para enviarlos manualmente.

---

### 14. Cerrar sesión

**APK → Tab Perfil → botón rojo "Cerrar sesión"**  
**Web → Sidebar → botón "Salir" en la esquina inferior**

---

## PARTE III — ACCESO RÁPIDO

| Recurso | URL / Dato |
|---|---|
| Panel Web | https://siagrd-panel-web.netlify.app |
| API Backend | https://backend-production-60016.up.railway.app |
| Salud del sistema | https://backend-production-60016.up.railway.app/health |
| APK (instalar) | `android/app/build/outputs/apk/release/app-release.apk` |
| ID de paquete APK | `org.corpofuturo.siagrd.ciudadano` |
| Base de datos | `viaduct.proxy.rlwy.net:56926 / siagrd` (Railway) |
| Correo admin | `admin` (usuario de prueba en base de datos) |

---

## PARTE IV — GLOSARIO

| Término | Definición |
|---|---|
| SIAGRD | Sistema de Información y Alerta para la Gestión del Riesgo de Desastres |
| UNGRD | Unidad Nacional para la Gestión del Riesgo de Desastres (Colombia) |
| CONGRD | Consejo Nacional para la Gestión del Riesgo |
| CDGRD | Consejo Departamental para la Gestión del Riesgo de Desastres |
| SDGRD | Secretaría Departamental de Gestión del Riesgo de Desastres |
| CMGRD | Consejo Municipal para la Gestión del Riesgo de Desastres |
| JAC / JAL | Junta de Acción Comunal / Junta de Acción Local |
| DANE | Departamento Administrativo Nacional de Estadística |
| JWT | JSON Web Token — mecanismo de autenticación segura |
| APK | Android Package — archivo de instalación para Android |
| OSM | OpenStreetMap — proveedor de mapas libre y gratuito |
| Nivel de alerta | Clasificación del riesgo: VERDE · AMARILLO · NARANJA · ROJO |
| Incidente | Evento de riesgo registrado en el sistema |
| Organismo de socorro | Entidad de respuesta: Cruz Roja, Bomberos, Defensa Civil, Policía |

---

*Documento generado el 11 de junio de 2026 — Corpofuturo · gerente@corpofuturo.org*
