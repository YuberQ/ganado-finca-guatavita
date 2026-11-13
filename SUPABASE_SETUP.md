# Guía de Configuración de Supabase — Finca Guatavita

Esta guía le explica paso a paso cómo configurar la base de datos en la nube para la aplicación de gestión ganadera.

---

## Paso 1: Crear una cuenta en Supabase

1. Abra su navegador y vaya a **[https://supabase.com](https://supabase.com)**
2. Haga clic en el botón **"Start your project"** (Iniciar su proyecto)
3. Puede registrarse con su cuenta de **GitHub** o con **correo electrónico y contraseña**
4. Si usa correo electrónico, revise su bandeja de entrada y haga clic en el enlace de confirmación

---

## Paso 2: Crear un nuevo proyecto

1. Una vez dentro de Supabase, haga clic en **"New Project"** (Nuevo Proyecto)
2. Complete los datos:
   - **Name** (Nombre): escriba `ganado-finca-guatavita`
   - **Database Password** (Contraseña de base de datos): invente una contraseña segura y **guárdela en un lugar seguro** (la necesitará si quiere conectarse directamente a la base de datos)
   - **Region** (Región): seleccione la más cercana a Colombia, por ejemplo **South America (São Paulo)**
3. Haga clic en **"Create new project"**
4. Espere unos minutos mientras Supabase crea su proyecto

---

## Paso 3: Ejecutar los scripts SQL

Debe ejecutar 3 archivos SQL en orden. Cada uno configura una parte de la base de datos.

1. En el menú lateral izquierdo de Supabase, haga clic en **"SQL Editor"** (el ícono que parece un documento con código)
2. Haga clic en **"New query"** (Nueva consulta)

### Script 1: Crear las tablas (`01_schema.sql`)

3. Abra el archivo `sql/01_schema.sql` de este proyecto con un editor de texto (como Bloc de notas)
4. Copie **todo** el contenido del archivo
5. Péguelo en el editor SQL de Supabase
6. Haga clic en el botón **"Run"** (Ejecutar) — el botón verde en la esquina inferior derecha
7. Debe aparecer un mensaje de **"Success"** (Éxito). Si aparece un error, verifique que copió todo el contenido

### Script 2: Configurar la seguridad (`02_rls_policies.sql`)

8. Haga clic en **"New query"** para abrir una nueva consulta vacía
9. Abra el archivo `sql/02_rls_policies.sql` y copie todo su contenido
10. Péguelo en el editor SQL y haga clic en **"Run"**
11. Debe aparecer **"Success"**

### Script 3: Configurar almacenamiento de fotos (`03_storage_setup.sql`)

12. Haga clic en **"New query"** nuevamente
13. Abra el archivo `sql/03_storage_setup.sql` y copie todo su contenido
14. Péguelo en el editor SQL y haga clic en **"Run"**
15. Debe aparecer **"Success"**

> **Nota:** Es importante ejecutar los scripts en este orden (01, 02, 03) porque cada uno depende del anterior.

---

## Paso 4: Configurar la autenticación

Para que solo las personas autorizadas puedan usar la aplicación:

### 4a. Desactivar registros públicos

1. En el menú lateral, haga clic en **"Authentication"** (Autenticación) — el ícono de una persona
2. Haga clic en **"Providers"** (Proveedores) en el submenú
3. Busque el proveedor **"Email"** y haga clic en él para expandirlo
4. **Desactive** la opción **"Confirm email"** (Confirmar correo) si desea que los usuarios puedan acceder inmediatamente
5. Haga clic en **"Save"** (Guardar)

### 4b. Agregar usuarios autorizados

1. Todavía en **"Authentication"**, haga clic en **"Users"** (Usuarios) en el submenú
2. Haga clic en **"Add user"** (Agregar usuario) → **"Create new user"**
3. Ingrese:
   - **Email**: el correo electrónico de la persona autorizada
   - **Password**: una contraseña para esa persona
   - Marque **"Auto Confirm User"** para que el usuario quede activo de inmediato
4. Haga clic en **"Create user"** (Crear usuario)
5. Repita este paso para cada persona que necesite acceso a la aplicación

---

## Paso 5: Obtener la URL y la clave del proyecto

Estos datos son necesarios para conectar la aplicación web con Supabase.

1. En el menú lateral, haga clic en **"Project Settings"** (Configuración del proyecto) — el ícono de engranaje en la parte inferior
2. Haga clic en **"API"** en el submenú
3. Encontrará dos datos importantes:
   - **Project URL**: es la dirección de su proyecto (algo como `https://xxxxxxxx.supabase.co`)
   - **anon public key** (clave anónima pública): es una clave larga que empieza con `eyJ...`
4. **Copie ambos valores** y guárdelos en un lugar seguro

### Configurar la aplicación

5. Abra el archivo `js/config.js` de la aplicación con un editor de texto
6. Reemplace `'TU_URL_AQUI'` con la **Project URL** que copió (mantenga las comillas)
7. Reemplace `'TU_KEY_AQUI'` con la **anon public key** que copió (mantenga las comillas)
8. Guarde el archivo

---

## Paso 6: Configurar la URL de redirección para GitHub Pages

Si la aplicación estará alojada en GitHub Pages, debe configurar la URL de redirección para que la autenticación funcione correctamente.

1. Vaya a **"Authentication"** → **"URL Configuration"** en el menú lateral
2. En el campo **"Site URL"**, ingrese la URL de su sitio en GitHub Pages:
   ```
   https://SU-USUARIO.github.io/ganado-finca-guatavita/
   ```
   (Reemplace `SU-USUARIO` con su nombre de usuario de GitHub)
3. En **"Redirect URLs"** (URLs de redirección), haga clic en **"Add URL"** y agregue:
   ```
   https://SU-USUARIO.github.io/ganado-finca-guatavita/**
   ```
4. Haga clic en **"Save"** (Guardar)

---

## Verificación final

Para confirmar que todo está configurado correctamente:

1. Vaya a **"Table Editor"** (Editor de tablas) en el menú lateral — verá las 5 tablas creadas:
   - `animales`
   - `fotos_animal`
   - `pesajes`
   - `historial_cambios`
   - `ventas`
2. Vaya a **"Storage"** en el menú lateral — verá el bucket `animal-photos`
3. Vaya a **"Authentication"** → **"Users"** — verá los usuarios que creó

Si todo aparece correctamente, ¡su base de datos está lista! 🎉

---

## Solución de problemas comunes

| Problema | Solución |
|----------|----------|
| Error al ejecutar un script SQL | Asegúrese de ejecutar los scripts en orden (01, 02, 03). Si ya ejecutó uno parcialmente, puede necesitar borrar las tablas e intentar de nuevo |
| No puedo iniciar sesión en la app | Verifique que creó el usuario en Authentication → Users y que la contraseña es correcta |
| Las fotos no se suben | Verifique que el bucket `animal-photos` existe en Storage |
| Error de "URL no permitida" | Verifique que configuró correctamente la Site URL y Redirect URLs en el Paso 6 |
| La página se ve en blanco | Verifique que copió correctamente la URL y la clave en `js/config.js` |
