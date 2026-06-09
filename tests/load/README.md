# Pruebas de carga — SiAgRd (k6)

## Instalación de k6

### Windows (recomendado: winget)
```powershell
winget install k6 --source winget
```

### Windows (alternativa: Chocolatey)
```powershell
choco install k6
```

### Linux / WSL
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

### macOS
```bash
brew install k6
```

Documentación oficial: https://k6.io/docs/get-started/installation/

---

## Uso

Todos los comandos se ejecutan desde la raíz del proyecto o desde esta carpeta.

### Smoke test (1 usuario, 30 segundos)
```powershell
k6 run -e SCENARIO=smoke tests/load/k6-siagrd.js
```

### Load test (rampa 0→50 usuarios en 1 min, sostenido 3 min)
```powershell
k6 run -e SCENARIO=load tests/load/k6-siagrd.js
```

### Stress test (rampa 0→200 usuarios en 2 min, sostenido 2 min)
```powershell
k6 run -e SCENARIO=stress tests/load/k6-siagrd.js
```

---

## Thresholds configurados

| Métrica | Umbral |
|---------|--------|
| `http_req_duration` p(95) | < 2000 ms |
| `http_req_failed` | < 1 % |
| `errors` (custom) | < 1 % |

Si algún threshold falla, k6 termina con código de salida distinto de 0 (útil en CI/CD).

---

## Salida con reporte HTML (requiere k6 extensions)

```powershell
k6 run -e SCENARIO=load --out json=results.json tests/load/k6-siagrd.js
```

Luego visualizar con k6 Cloud o con el dashboard local:
```powershell
k6 run -e SCENARIO=load --out web-dashboard tests/load/k6-siagrd.js
```

---

## Notas

- El script extrae el JWT del endpoint `/api/v1/auth/login/` y lo reutiliza en cada iteración.
- Los tres endpoints ejercitados por iteración son:
  - `GET /api/v1/dashboard/stats`
  - `GET /api/v1/incidentes`
  - `GET /api/v1/incidentes/cerca?lat=4.142&lng=-73.626&radio_km=50`
- El escenario por defecto (si no se pasa `SCENARIO`) es `smoke`.
