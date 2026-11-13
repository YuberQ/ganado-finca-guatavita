# 🐄 Manual de Despliegue en GitHub Pages — Finca Guatavita

Esta guía le muestra cómo subir esta aplicación web a su cuenta de **GitHub** y activarla con **GitHub Pages** para que quede disponible en internet para usted y sus trabajadores autorizados.

---

## 1. Crear un Repositorio en GitHub

1. Ingrese a su cuenta en [https://github.com](https://github.com)
2. En la esquina superior derecha, haga clic en el botón **"+"** y seleccione **"New repository"**.
3. En **Repository name**, escriba: `ganado-finca-guatavita`.
4. Seleccione **Public** (necesario para GitHub Pages en cuentas gratuitas estándar) o **Private** (si tiene cuenta Pro/Enterprise).
5. Deje desmarcadas las opciones de "Add a README file", ".gitignore" y licencia.
6. Haga clic en **"Create repository"**.

---

## 2. Configurar las Claves de Supabase en el Código

Antes de subir los archivos a GitHub:

1. Abra el archivo [`js/config.js`](file:///C:/Users/Yuber/.gemini/antigravity/scratch/ganado-app/js/config.js).
2. Coloque su **Project URL** y su **anon public key** de Supabase (las que obtuvo siguiendo el archivo [`SUPABASE_SETUP.md`](file:///C:/Users/Yuber/.gemini/antigravity/scratch/ganado-app/SUPABASE_SETUP.md)):

```javascript
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

3. Guarde el archivo.

---

## 3. Subir los Archivos al Repositorio

Abra una terminal (PowerShell o Git Bash) en la carpeta del proyecto:
`C:\Users\Yuber\.gemini\antigravity\scratch\ganado-app`

Ejecute los siguientes comandos:

```bash
git init
git add .
git commit -m "Versión inicial: Sistema de Gestión Ganadera Finca Guatavita"
git branch -M main
git remote add origin https://github.com/SU-USUARIO/ganado-finca-guatavita.git
git push -u origin main
```
*(Reemplace `SU-USUARIO` por su nombre de usuario de GitHub).*

---

## 4. Activar GitHub Pages

1. En la página de su repositorio en GitHub, vaya a la pestaña **Settings** (Configuración).
2. En el menú lateral izquierdo, busque y haga clic en **Pages**.
3. En **Build and deployment** > **Source**, seleccione:
   - Branch: `main`
   - Folder: `/ (root)`
4. Haga clic en **Save** (Guardar).
5. Espere 1 a 2 minutos. GitHub generará el enlace público de su aplicación, que tendrá esta forma:
   `https://SU-USUARIO.github.io/ganado-finca-guatavita/`

---

## 5. Seguridad: Solo personas con acceso

La aplicación cuenta con una capa de seguridad estricta:
- **Nadie que no esté creado por usted en Supabase Auth podrá ver ni editar datos.**
- Aunque alguien conozca o tenga el enlace público, si no ingresa un correo y contraseña previamente autorizado por usted en el panel de Supabase, la base de datos denegará toda consulta a través de **Row Level Security (RLS)** y la aplicación no le permitirá el acceso.
