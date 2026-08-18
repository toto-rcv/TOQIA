#Requires -Version 5.1
<#
    Setup local de Pulseras NFC en Windows, sin Docker.

    Uso (PowerShell, parado en la carpeta del proyecto):

        powershell -ExecutionPolicy Bypass -File .\setup.ps1

    Qué hace:
      1. Verifica Node 20+
      2. Encuentra el cliente de MySQL y se asegura de que el servicio esté arriba
      3. Crea la base, el usuario y deja el servidor en UTC
      4. Genera el .env con secretos nuevos
      5. Instala dependencias, crea las tablas y carga los datos de ejemplo

    Es re-ejecutable: si algo ya está hecho, lo saltea.
#>

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

function Write-Paso  ($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Write-Ok    ($t) { Write-Host "   $t" -ForegroundColor Green }
function Write-Aviso ($t) { Write-Host "   $t" -ForegroundColor Yellow }
function Salir       ($t) { Write-Host ""; Write-Host "ERROR: $t" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  Pulseras NFC - setup local" -ForegroundColor White
Write-Host "  $PSScriptRoot" -ForegroundColor DarkGray

# ─────────────────────────────────────────────────────────────────────────────
# 1. Node
# ─────────────────────────────────────────────────────────────────────────────
Write-Paso "Verificando Node"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Salir "Node no esta en el PATH. Instalalo desde https://nodejs.org, cerra esta ventana y abri PowerShell de nuevo."
}

$nodeVersion = (node -v).Trim()
$nodeMajor = [int]($nodeVersion.TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 20) {
    Salir "Hace falta Node 20 o superior. Tenes $nodeVersion."
}
Write-Ok "Node $nodeVersion"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Cliente de MySQL + servicio
# ─────────────────────────────────────────────────────────────────────────────
Write-Paso "Buscando MySQL"

$mysqlExe = (Get-Command mysql.exe -ErrorAction SilentlyContinue).Source

if (-not $mysqlExe) {
    # El instalador de MySQL no agrega bin al PATH por defecto, asi que lo
    # buscamos en las rutas habituales. Ordenamos descendente para quedarnos
    # con la version mas nueva si hay varias instaladas.
    foreach ($raiz in @("C:\Program Files\MySQL", "C:\Program Files (x86)\MySQL")) {
        if (Test-Path $raiz) {
            $encontrado = Get-ChildItem -Path $raiz -Filter mysql.exe -Recurse -ErrorAction SilentlyContinue |
                          Sort-Object FullName -Descending |
                          Select-Object -First 1
            if ($encontrado) { $mysqlExe = $encontrado.FullName; break }
        }
    }
}

if (-not $mysqlExe) {
    Salir "No encontre mysql.exe. Revisa que hayas instalado MySQL Server (no solo Workbench)."
}
Write-Ok $mysqlExe

$servicio = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($servicio) {
    if ($servicio.Status -ne 'Running') {
        Write-Aviso "El servicio $($servicio.Name) esta detenido; intento arrancarlo."
        try {
            Start-Service $servicio.Name
            Start-Sleep -Seconds 3
            Write-Ok "Servicio $($servicio.Name) arriba"
        } catch {
            Salir "No pude arrancar el servicio $($servicio.Name). Abri PowerShell como administrador y corre: Start-Service $($servicio.Name)"
        }
    } else {
        Write-Ok "Servicio $($servicio.Name) corriendo"
    }
} else {
    Write-Aviso "No encontre el servicio de MySQL. Si el servidor no esta corriendo, el paso siguiente va a fallar."
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. Base de datos
# ─────────────────────────────────────────────────────────────────────────────
Write-Paso "Configurando la base de datos"
Write-Host "   Se necesita la contrasena de root que pusiste al instalar MySQL." -ForegroundColor DarkGray
Write-Host "   No queda guardada en ningun lado: se usa solo para esta corrida." -ForegroundColor DarkGray
Write-Host ""

$rootSecure = Read-Host "   Contrasena de root de MySQL" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($rootSecure)
$rootPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

$sql = @"
CREATE DATABASE IF NOT EXISTS pulseras CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'pulseras'@'localhost' IDENTIFIED BY 'pulseras';
CREATE USER IF NOT EXISTS 'pulseras'@'127.0.0.1' IDENTIFIED BY 'pulseras';
GRANT ALL PRIVILEGES ON pulseras.* TO 'pulseras'@'localhost';
GRANT ALL PRIVILEGES ON pulseras.* TO 'pulseras'@'127.0.0.1';
FLUSH PRIVILEGES;
SET PERSIST time_zone = '+00:00';
SELECT 'ok' AS resultado;
"@

# La contrasena va por variable de entorno y no como argumento: los argumentos
# son visibles para cualquier proceso que liste la tabla de procesos.
$env:MYSQL_PWD = $rootPass
try {
    $salida = $sql | & $mysqlExe -u root --batch --skip-column-names 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "   Salida de MySQL:" -ForegroundColor DarkGray
        Write-Host "   $salida" -ForegroundColor DarkGray
        Salir "MySQL rechazo la conexion o los comandos. Lo mas comun es que la contrasena de root no sea la correcta."
    }
} finally {
    $env:MYSQL_PWD = $null
    $rootPass = $null
    [System.GC]::Collect()
}

Write-Ok "Base 'pulseras' lista, usuario 'pulseras' creado, servidor en UTC"

# ─────────────────────────────────────────────────────────────────────────────
# 4. Archivo .env
# ─────────────────────────────────────────────────────────────────────────────
Write-Paso "Generando .env"

if (Test-Path .env) {
    Write-Aviso ".env ya existe; no lo toco."
} else {
    if (-not (Test-Path .env.example)) { Salir "No encuentro .env.example en esta carpeta." }

    $authSecret = (node -e "console.log(require('crypto').randomBytes(32).toString('base64'))").Trim()
    $ipSalt     = (node -e "console.log(require('crypto').randomBytes(32).toString('hex'))").Trim()

    $contenido = Get-Content .env.example -Raw
    $contenido = $contenido -replace 'BETTER_AUTH_SECRET="[^"]*"', ('BETTER_AUTH_SECRET="' + $authSecret + '"')
    $contenido = $contenido -replace 'IP_HASH_SALT="[^"]*"',       ('IP_HASH_SALT="' + $ipSalt + '"')

    # Sin BOM: dotenv no lo saca y la primera variable del archivo quedaria
    # con un caracter invisible pegado al nombre.
    $utf8SinBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Join-Path $PSScriptRoot ".env"), $contenido, $utf8SinBom)

    Write-Ok ".env creado con secretos nuevos"
}

# ─────────────────────────────────────────────────────────────────────────────
# 5. Dependencias, tablas y datos
# ─────────────────────────────────────────────────────────────────────────────
Write-Paso "Instalando dependencias"
if (Test-Path node_modules) {
    Write-Ok "node_modules ya existe; salteo npm install"
} else {
    npm install
    if ($LASTEXITCODE -ne 0) { Salir "npm install fallo." }
    Write-Ok "Dependencias instaladas"
}

Write-Paso "Creando las tablas"
npm run db:push -- --force
if ($LASTEXITCODE -ne 0) { Salir "drizzle-kit push fallo. Revisa DATABASE_URL en el .env." }
Write-Ok "Tablas creadas"

Write-Paso "Cargando datos de ejemplo"
npm run db:seed
if ($LASTEXITCODE -ne 0) { Salir "El seed fallo." }

# ─────────────────────────────────────────────────────────────────────────────
# Listo
# ─────────────────────────────────────────────────────────────────────────────
$ipLan = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
          Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
          Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "  Todo listo." -ForegroundColor Green
Write-Host ""
Write-Host "  Arrancar:            npm run dev"
Write-Host "  Panel:               http://localhost:3000/admin"
Write-Host "  Usuario:             admin@pulseras.local / admin1234"
Write-Host "  Probar redireccion:  http://localhost:3000/r/B001"

if ($ipLan) {
    Write-Host ""
    Write-Host "  Para probar desde el celular en la misma red:" -ForegroundColor DarkGray
    Write-Host "    1. En el .env pone:  NEXT_PUBLIC_APP_URL=`"http://${ipLan}:3000`""
    Write-Host "                         BETTER_AUTH_URL=`"http://${ipLan}:3000`""
    Write-Host "    2. Arranca con:      npm run dev:lan"
    Write-Host "    3. Desde el celular: http://${ipLan}:3000/r/B001"
}
Write-Host ""
