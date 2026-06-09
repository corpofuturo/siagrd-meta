import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = 'https://backend-production-60016.up.railway.app';

const errorRate = new Rate('errors');

const SCENARIOS = {
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '30s',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 50 },
      { duration: '3m', target: 50 },
      { duration: '30s', target: 0 },
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 200 },
      { duration: '2m', target: 200 },
      { duration: '30s', target: 0 },
    ],
  },
};

const scenario = __ENV.SCENARIO || 'smoke';

if (!SCENARIOS[scenario]) {
  throw new Error(`SCENARIO "${scenario}" no válido. Opciones: smoke, load, stress`);
}

export const options = {
  scenarios: {
    [scenario]: SCENARIOS[scenario],
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
};

function login() {
  const payload = JSON.stringify({
    email: 'gerente@corpofuturo.org',
    password: 'SiAgRd2026!',
  });

  const res = http.post(`${BASE_URL}/api/v1/auth/login/`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const ok = check(res, {
    'login status 200': (r) => r.status === 200,
    'login devuelve token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.access !== undefined || body.token !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!ok);

  if (!ok) {
    return null;
  }

  try {
    const body = JSON.parse(res.body);
    return body.access || body.token || null;
  } catch {
    return null;
  }
}

export default function () {
  const token = login();

  if (!token) {
    sleep(1);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // GET /api/v1/dashboard/stats
  const statsRes = http.get(`${BASE_URL}/api/v1/dashboard/stats`, { headers });
  const statsOk = check(statsRes, {
    'dashboard/stats status 2xx': (r) => r.status >= 200 && r.status < 300,
    'dashboard/stats tiempo < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!statsOk);

  sleep(0.5);

  // GET /api/v1/incidentes
  const incidentesRes = http.get(`${BASE_URL}/api/v1/incidentes`, { headers });
  const incidentesOk = check(incidentesRes, {
    'incidentes status 2xx': (r) => r.status >= 200 && r.status < 300,
    'incidentes tiempo < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!incidentesOk);

  sleep(0.5);

  // GET /api/v1/incidentes/cerca
  const cercaRes = http.get(
    `${BASE_URL}/api/v1/incidentes/cerca?lat=4.142&lng=-73.626&radio_km=50`,
    { headers }
  );
  const cercaOk = check(cercaRes, {
    'incidentes/cerca status 2xx': (r) => r.status >= 200 && r.status < 300,
    'incidentes/cerca tiempo < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!cercaOk);

  sleep(1);
}
