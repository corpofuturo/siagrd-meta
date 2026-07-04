# SQA Dispositivo Fisico - SIAGRD Meta (SATAM) - app ciudadano
# Ejecuta pruebas reales en el celular via ADB, narra por TTS y captura evidencia.

$ErrorActionPreference = "Stop"

$Device   = "102692533S008065"
$Pkg      = "org.corpofuturo.siagrd.ciudadano"
$Activity = "$Pkg/.MainActivity"
$EvidDir  = "D:\Jota\Desa\siagrd\tests\evidencia"
$TmpDir   = Join-Path $env:TEMP "claude_tts_cache"
$Voice    = "es-CO-SalomeNeural"

if (-not (Test-Path $EvidDir)) { New-Item -ItemType Directory -Force -Path $EvidDir | Out-Null }
if (-not (Test-Path $TmpDir))  { New-Item -ItemType Directory -Force -Path $TmpDir  | Out-Null }

function Get-Md5Hex($text) {
    $md5 = [System.Security.Cryptography.MD5]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    $hash = $md5.ComputeHash($bytes)
    -join ($hash | ForEach-Object { $_.ToString("x2") })
}

function Say {
    param([string]$Text)
    Write-Host "[TTS] $Text" -ForegroundColor Cyan
    $hash = Get-Md5Hex $Text
    $mp3 = Join-Path $TmpDir "$hash.mp3"
    if (-not (Test-Path $mp3)) {
        # CRITICO: pasar la ruta con / en vez de \ para evitar SyntaxError: unicodeescape en Python
        $mp3Fwd = $mp3 -replace '\\', '/'
        $textEscaped = $Text -replace '"', '\"'
        $pyArgs = @("-m", "edge_tts", "--voice", $Voice, "--text", $textEscaped, "--write-media", $mp3Fwd)
        & python @pyArgs 2>&1 | Out-Null
    }
    if (Test-Path $mp3) {
        try {
            Add-Type -AssemblyName presentationCore -ErrorAction SilentlyContinue
            $player = New-Object System.Media.SoundPlayer
            # SoundPlayer solo soporta wav; usamos ffplay/start si existe, si no solo continuamos
        } catch {}
        # Reproducir con Windows Media usando start (no bloqueante) o powershell media player
        try {
            $wmp = New-Object -ComObject WMPlayer.OCX
            $wmp.URL = $mp3
            $wmp.controls.play()
            Start-Sleep -Milliseconds 500
            $duration = 0
            $tries = 0
            while ($wmp.playState -ne 1 -and $tries -lt 200) {
                Start-Sleep -Milliseconds 300
                $tries++
            }
            $wmp.close()
        } catch {
            Write-Host "  (no se pudo reproducir audio, continuo sin sonido)" -ForegroundColor DarkYellow
        }
    } else {
        Write-Host "  (fallo generacion TTS para: $Text)" -ForegroundColor Red
    }
}

function Cap {
    param([string]$Name)
    $remote = "/sdcard/$Name.png"
    $local  = Join-Path $EvidDir "$Name.png"
    adb -s $Device shell screencap -p $remote | Out-Null
    adb -s $Device pull $remote $local | Out-Null
    adb -s $Device shell rm $remote | Out-Null
    Write-Host "[CAP] $local" -ForegroundColor Green
    return $local
}

function GetUI {
    $remoteXml = "/sdcard/ui_dump.xml"
    $localXml  = Join-Path $TmpDir "ui_dump.xml"
    adb -s $Device shell uiautomator dump $remoteXml | Out-Null
    adb -s $Device pull $remoteXml $localXml | Out-Null
    [xml]$xml = Get-Content -Raw $localXml -Encoding UTF8
    return $xml
}

function FindNode {
    param($Xml, [string]$Text, [string]$ResourceId = $null)
    $nodes = $Xml.SelectNodes("//node")
    foreach ($n in $nodes) {
        $txt = $n.text
        $desc = $n.'content-desc'
        $rid = $n.'resource-id'
        $match = $false
        if ($Text -and (($txt -and $txt -like "*$Text*") -or ($desc -and $desc -like "*$Text*"))) { $match = $true }
        if ($ResourceId -and $rid -and $rid -like "*$ResourceId*") { $match = $true }
        if ($match) {
            $bounds = $n.bounds
            if ($bounds -match '\[(\d+),(\d+)\]\[(\d+),(\d+)\]') {
                $x1=[int]$Matches[1]; $y1=[int]$Matches[2]; $x2=[int]$Matches[3]; $y2=[int]$Matches[4]
                $cx = [int](($x1+$x2)/2)
                $cy = [int](($y1+$y2)/2)
                return @{ X = $cx; Y = $cy; Node = $n }
            }
        }
    }
    return $null
}

function DumpLabels {
    param($Xml)
    $nodes = $Xml.SelectNodes("//node")
    $labels = @()
    foreach ($n in $nodes) {
        if ($n.text -and $n.text.Trim() -ne "") { $labels += $n.text }
        if ($n.'content-desc' -and $n.'content-desc'.Trim() -ne "") { $labels += $n.'content-desc' }
    }
    return $labels | Select-Object -Unique
}

function Has {
    param($Xml, [string]$Text)
    $labels = DumpLabels -Xml $Xml
    foreach ($l in $labels) {
        if ($l -like "*$Text*") { return $true }
    }
    return $false
}

function BackToHome {
    adb -s $Device shell input keyevent KEYCODE_BACK | Out-Null
    Start-Sleep -Milliseconds 500
}

function TapTexto {
    param([string]$Text, [string]$ResourceId = $null)
    $xml = GetUI
    $node = FindNode -Xml $xml -Text $Text -ResourceId $ResourceId
    if ($node) {
        adb -s $Device shell input tap $node.X $node.Y | Out-Null
        Start-Sleep -Milliseconds 800
        return $true
    }
    Write-Host "[TapTexto] No se encontro: $Text" -ForegroundColor Yellow
    return $false
}

function EsperarTexto {
    param([string]$Text, [int]$TimeoutSec = 15)
    $elapsed = 0
    while ($elapsed -lt $TimeoutSec) {
        $xml = GetUI
        if (Has -Xml $xml -Text $Text) { return $true }
        Start-Sleep -Seconds 1
        $elapsed++
    }
    return $false
}

function DismissOverlayDialog {
    $xml = GetUI
    $dismissTexts = @("Aceptar", "OK", "Entendido", "Cerrar", "Permitir", "Allow", "No, gracias", "Ahora no", "Cancelar")
    foreach ($t in $dismissTexts) {
        $node = FindNode -Xml $xml -Text $t
        if ($node) {
            Write-Host "[DismissOverlayDialog] cerrando dialogo con texto: $t" -ForegroundColor DarkYellow
            adb -s $Device shell input tap $node.X $node.Y | Out-Null
            Start-Sleep -Milliseconds 600
            return $true
        }
    }
    return $false
}

# Detectores de pantalla SATAM
function EnLogin($Xml)     { Has $Xml "Correo" -or (Has $Xml "correo electrónico") -or (Has $Xml "Contraseña") -or (Has $Xml "Iniciar sesión") -or (Has $Xml "SATAM") -or (Has $Xml "Ingresar") }
function EnDashboard($Xml) { (Has $Xml "Dashboard") -or (Has $Xml "Mapa") -or (Has $Xml "Alertas activas") -or (Has $Xml "Incidentes") -or (Has $Xml "SATAM") }
function EnApp($Xml)       { (Has $Xml "SATAM") -or (Has $Xml "Alerta") -or (Has $Xml "Incidente") -or (Has $Xml "Municipio") }

# ==================== INICIO DE PRUEBAS ====================

$resultados = @{}

Write-Host "=== SQA SIAGRD01 - Dispositivo fisico $Device ===" -ForegroundColor Magenta
Say "Iniciando pruebas de control de calidad en el dispositivo fisico para la aplicacion SATAM."

adb -s $Device shell am force-stop $Pkg | Out-Null
Start-Sleep -Seconds 1
adb -s $Device shell am start -n $Activity | Out-Null
Start-Sleep -Seconds 4
DismissOverlayDialog | Out-Null
Cap "sqa1_arranque_pantalla_inicial" | Out-Null

$xml = GetUI
DumpLabels -Xml $xml | Out-Host

# ---------- PRUEBA A: DT-006 Reportar ----------
Say "Iniciando prueba A. Verificando el tab Reportar."
$tabReportarOk = TapTexto -Text "Reportar"
Start-Sleep -Seconds 1
DismissOverlayDialog | Out-Null
$capA1 = Cap "sqa2_reportar_paso1_grid"
$xml = GetUI
$labelsA1 = DumpLabels -Xml $xml
Write-Host "Labels tras tocar Reportar:" -ForegroundColor Cyan
$labelsA1 | Out-Host

$paso1Ok = $false
foreach ($amenaza in @("Inundación","Incendio","Deslizamiento","Sismo","Vendaval","Sequía","Accidente","Otro")) {
    if ($labelsA1 -contains $amenaza -or ($labelsA1 | Where-Object { $_ -like "*$amenaza*" })) { $paso1Ok = $true }
}

if ($paso1Ok) {
    Say "El tab Reportar muestra el grid de tipos de amenaza correctamente."
    # Intentar seleccionar el primer tipo de amenaza disponible
    $tipoNode = $null
    $xml = GetUI
    foreach ($n in $xml.SelectNodes("//node")) {
        if ($n.'class' -like "*Button*" -or $n.'clickable' -eq "true") {
            if ($n.text -and $n.text.Trim() -ne "" -and $n.text -notin @("Reportar")) {
                $tipoNode = $n
                break
            }
        }
    }
    if ($tipoNode -and $tipoNode.bounds -match '\[(\d+),(\d+)\]\[(\d+),(\d+)\]') {
        $x1=[int]$Matches[1]; $y1=[int]$Matches[2]; $x2=[int]$Matches[3]; $y2=[int]$Matches[4]
        $cx=[int](($x1+$x2)/2); $cy=[int](($y1+$y2)/2)
        adb -s $Device shell input tap $cx $cy | Out-Null
        Start-Sleep -Seconds 1
        Cap "sqa3_reportar_paso2_formulario" | Out-Null
        $xml = GetUI
        DumpLabels -Xml $xml | Out-Host
    }
    $resultados["DT-006"] = "parcial-ver-reporte"
} else {
    Say "Alerta. El tab Reportar no muestra el grid esperado de tipos de amenaza."
    $resultados["DT-006"] = "NO_RESUELTO_o_requiere_login"
}

BackToHome
Start-Sleep -Seconds 1

# ---------- PRUEBA B: DT-007 mapa anonimo ----------
Say "Iniciando prueba B. Verificando el mapa en modo anonimo."
adb -s $Device logcat -c
$tabMapaOk = TapTexto -Text "Mapa"
Start-Sleep -Seconds 4
DismissOverlayDialog | Out-Null
$capMapa = Cap "sqa4_mapa_anonimo"
$logcatDump = adb -s $Device logcat -d
$logcatFile = Join-Path $EvidDir "sqa5_mapa_logcat.txt"
$logcatDump | Out-File -FilePath $logcatFile -Encoding utf8
$logLines401 = $logcatDump | Select-String -Pattern "401|anonymous|Unauthorized|$Pkg|satam.corpofuturo"
$logLines401 | Out-File -FilePath (Join-Path $EvidDir "sqa6_mapa_logcat_filtrado.txt") -Encoding utf8

$xml = GetUI
$mapaLabels = DumpLabels -Xml $xml
Write-Host "Labels en pantalla Mapa:" -ForegroundColor Cyan
$mapaLabels | Out-Host

if ($logLines401 -match "401") {
    Say "Se encontraron errores 401 en el log al cargar el mapa."
    $resultados["DT-007"] = "NO_RESUELTO"
} else {
    Say "No se encontraron errores 401 en el log al cargar el mapa."
    $resultados["DT-007"] = "posiblemente_resuelto_ver_reporte"
}

Say "Pruebas finalizadas. Revisando resultados."
Write-Host "=== RESULTADOS ===" -ForegroundColor Magenta
$resultados | Format-Table -AutoSize
Say "Fin del script de control de calidad para SATAM."
