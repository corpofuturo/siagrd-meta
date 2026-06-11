import { writeFileSync } from 'fs';

// Parse a CSV line respecting quoted fields
function parseLine(line) {
  const fields = [];
  let inQuote = false, cur = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuote = !inQuote; continue; }
    if (c === ',' && !inQuote) { fields.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  fields.push(cur.trim());
  return fields;
}

// Fix coordinates: "-75,581775" -> -75.581775
function fixCoord(s) {
  return parseFloat(s.replace(',', '.'));
}

// Full Colombia dataset
const RAW = `05,ANTIOQUIA,05001,MEDELLÍN,Municipio,"-75,581775","6,246631"
05,ANTIOQUIA,05002,ABEJORRAL,Municipio,"-75,428739","5,789315"
05,ANTIOQUIA,05004,ABRIAQUÍ,Municipio,"-76,064304","6,632282"
05,ANTIOQUIA,05021,ALEJANDRÍA,Municipio,"-75,141346","6,376061"
05,ANTIOQUIA,05030,AMAGÁ,Municipio,"-75,702188","6,038708"
05,ANTIOQUIA,05031,AMALFI,Municipio,"-75,077501","6,909655"
05,ANTIOQUIA,05034,ANDES,Municipio,"-75,878828","5,657194"
05,ANTIOQUIA,05036,ANGELÓPOLIS,Municipio,"-75,711389","6,109719"
05,ANTIOQUIA,05038,ANGOSTURA,Municipio,"-75,335116","6,885175"
05,ANTIOQUIA,05040,ANORÍ,Municipio,"-75,148355","7,074703"
05,ANTIOQUIA,05042,SANTA FÉ DE ANTIOQUIA,Municipio,"-75,826648","6,556484"
05,ANTIOQUIA,05044,ANZÁ,Municipio,"-75,854442","6,302641"
05,ANTIOQUIA,05045,APARTADÓ,Municipio,"-76,625279","7,882968"
05,ANTIOQUIA,05051,ARBOLETES,Municipio,"-76,426708","8,849317"
05,ANTIOQUIA,05055,ARGELIA,Municipio,"-75,14107","5,731474"
05,ANTIOQUIA,05059,ARMENIA,Municipio,"-75,786647","6,155667"
05,ANTIOQUIA,05079,BARBOSA,Municipio,"-75,331627","6,439195"
05,ANTIOQUIA,05086,BELMIRA,Municipio,"-75,667779","6,606319"
05,ANTIOQUIA,05088,BELLO,Municipio,"-75,555245","6,333587"
05,ANTIOQUIA,05091,BETANIA,Municipio,"-75,97679","5,74615"
05,ANTIOQUIA,05093,BETULIA,Municipio,"-75,984452","6,115208"
05,ANTIOQUIA,05101,CIUDAD BOLÍVAR,Municipio,"-76,021509","5,850273"
05,ANTIOQUIA,05107,BRICEÑO,Municipio,"-75,55036","7,112803"
05,ANTIOQUIA,05113,BURITICÁ,Municipio,"-75,907","6,720759"
05,ANTIOQUIA,05120,CÁCERES,Municipio,"-75,35205","7,578366"
05,ANTIOQUIA,05125,CAICEDO,Municipio,"-75,98293","6,405607"
05,ANTIOQUIA,05129,CALDAS,Municipio,"-75,633673","6,091077"
05,ANTIOQUIA,05134,CAMPAMENTO,Municipio,"-75,298091","6,979771"
05,ANTIOQUIA,05138,CAÑASGORDAS,Municipio,"-76,028228","6,753859"
05,ANTIOQUIA,05142,CARACOLÍ,Municipio,"-74,757421","6,409829"
05,ANTIOQUIA,05145,CARAMANTA,Municipio,"-75,643868","5,54853"
05,ANTIOQUIA,05147,CAREPA,Municipio,"-76,652652","7,755148"
05,ANTIOQUIA,05148,EL CARMEN DE VIBORAL,Municipio,"-75,333901","6,082885"
05,ANTIOQUIA,05150,CAROLINA,Municipio,"-75,283192","6,725995"
05,ANTIOQUIA,05154,CAUCASIA,Municipio,"-75,197996","7,977278"
05,ANTIOQUIA,05172,CHIGORODÓ,Municipio,"-76,681531","7,666147"
05,ANTIOQUIA,05190,CISNEROS,Municipio,"-75,087047","6,537829"
05,ANTIOQUIA,05197,COCORNÁ,Municipio,"-75,185483","6,058295"
05,ANTIOQUIA,05206,CONCEPCIÓN,Municipio,"-75,257587","6,394348"
05,ANTIOQUIA,05209,CONCORDIA,Municipio,"-75,908448","6,045738"
05,ANTIOQUIA,05212,COPACABANA,Municipio,"-75,509384","6,348557"
05,ANTIOQUIA,05234,DABEIBA,Municipio,"-76,261614","6,998112"
05,ANTIOQUIA,05237,DONMATÍAS,Municipio,"-75,39263","6,485603"
05,ANTIOQUIA,05240,EBÉJICO,Municipio,"-75,766413","6,325615"
05,ANTIOQUIA,05250,EL BAGRE,Municipio,"-74,799097","7,5975"
05,ANTIOQUIA,05264,ENTRERRÍOS,Municipio,"-75,517685","6,566273"
05,ANTIOQUIA,05266,ENVIGADO,Municipio,"-75,582192","6,166695"
05,ANTIOQUIA,05282,FREDONIA,Municipio,"-75,675072","5,928039"
05,ANTIOQUIA,05284,FRONTINO,Municipio,"-76,130765","6,776066"
05,ANTIOQUIA,05306,GIRALDO,Municipio,"-75,952158","6,680808"
05,ANTIOQUIA,05308,GIRARDOTA,Municipio,"-75,444238","6,379472"
05,ANTIOQUIA,05310,GÓMEZ PLATA,Municipio,"-75,220018","6,683269"
05,ANTIOQUIA,05313,GRANADA,Municipio,"-75,184446","6,142892"
05,ANTIOQUIA,05315,GUADALUPE,Municipio,"-75,239862","6,815069"
05,ANTIOQUIA,05318,GUARNE,Municipio,"-75,441612","6,27787"
05,ANTIOQUIA,05321,GUATAPÉ,Municipio,"-75,160041","6,232461"
05,ANTIOQUIA,05347,HELICONIA,Municipio,"-75,734322","6,206757"
05,ANTIOQUIA,05353,HISPANIA,Municipio,"-75,906587","5,799461"
05,ANTIOQUIA,05360,ITAGÜÍ,Municipio,"-75,612056","6,175079"
05,ANTIOQUIA,05361,ITUANGO,Municipio,"-75,764673","7,171629"
05,ANTIOQUIA,05364,JARDÍN,Municipio,"-75,818982","5,597542"
05,ANTIOQUIA,05368,JERICÓ,Municipio,"-75,785499","5,789748"
05,ANTIOQUIA,05376,LA CEJA,Municipio,"-75,429433","6,028062"
05,ANTIOQUIA,05380,LA ESTRELLA,Municipio,"-75,637708","6,145238"
05,ANTIOQUIA,05390,LA PINTADA,Municipio,"-75,60781","5,743808"
05,ANTIOQUIA,05400,LA UNIÓN,Municipio,"-75,360874","5,973845"
05,ANTIOQUIA,05411,LIBORINA,Municipio,"-75,812838","6,677316"
05,ANTIOQUIA,05425,MACEO,Municipio,"-74,78716","6,552116"
05,ANTIOQUIA,05440,MARINILLA,Municipio,"-75,339345","6,173995"
05,ANTIOQUIA,05467,MONTEBELLO,Municipio,"-75,523455","5,946313"
05,ANTIOQUIA,05475,MURINDÓ,Municipio,"-76,817485","6,97771"
05,ANTIOQUIA,05480,MUTATÁ,Municipio,"-76,435875","7,242875"
05,ANTIOQUIA,05483,NARIÑO,Municipio,"-75,176262","5,610777"
05,ANTIOQUIA,05490,NECOCLÍ,Municipio,"-76,787271","8,434526"
05,ANTIOQUIA,05495,NECHÍ,Municipio,"-74,77647","8,094129"
05,ANTIOQUIA,05501,OLAYA,Municipio,"-75,811773","6,626492"
05,ANTIOQUIA,05541,PEÑOL,Municipio,"-75,242693","6,219349"
05,ANTIOQUIA,05543,PEQUE,Municipio,"-75,910357","7,021029"
05,ANTIOQUIA,05576,PUEBLORRICO,Municipio,"-75,839903","5,79158"
05,ANTIOQUIA,05579,PUERTO BERRÍO,Municipio,"-74,410016","6,487028"
05,ANTIOQUIA,05585,PUERTO NARE,Municipio,"-74,583012","6,186025"
05,ANTIOQUIA,05591,PUERTO TRIUNFO,Municipio,"-74,64119","5,871318"
05,ANTIOQUIA,05604,REMEDIOS,Municipio,"-74,698135","7,029424"
05,ANTIOQUIA,05607,RETIRO,Municipio,"-75,501301","6,062454"
05,ANTIOQUIA,05615,RIONEGRO,Municipio,"-75,377316","6,147148"
05,ANTIOQUIA,05628,SABANALARGA,Municipio,"-75,816645","6,850028"
05,ANTIOQUIA,05631,SABANETA,Municipio,"-75,615479","6,149903"
05,ANTIOQUIA,05642,SALGAR,Municipio,"-75,976807","5,964198"
05,ANTIOQUIA,05647,SAN ANDRÉS DE CUERQUÍA,Municipio,"-75,674564","6,916676"
05,ANTIOQUIA,05649,SAN CARLOS,Municipio,"-74,988097","6,187746"
05,ANTIOQUIA,05652,SAN FRANCISCO,Municipio,"-75,101562","5,963476"
05,ANTIOQUIA,05656,SAN JERÓNIMO,Municipio,"-75,726975","6,44809"
05,ANTIOQUIA,05658,SAN JOSÉ DE LA MONTAÑA,Municipio,"-75,683352","6,85009"
05,ANTIOQUIA,05659,SAN JUAN DE URABÁ,Municipio,"-76,52857","8,758964"
05,ANTIOQUIA,05660,SAN LUIS,Municipio,"-74,993619","6,043017"
05,ANTIOQUIA,05664,SAN PEDRO DE LOS MILAGROS,Municipio,"-75,556743","6,46012"
05,ANTIOQUIA,05665,SAN PEDRO DE URABÁ,Municipio,"-76,380567","8,276884"
05,ANTIOQUIA,05667,SAN RAFAEL,Municipio,"-75,02849","6,293759"
05,ANTIOQUIA,05670,SAN ROQUE,Municipio,"-75,019109","6,485939"
05,ANTIOQUIA,05674,SAN VICENTE FERRER,Municipio,"-75,332616","6,282164"
05,ANTIOQUIA,05679,SANTA BÁRBARA,Municipio,"-75,567351","5,875527"
05,ANTIOQUIA,05686,SANTA ROSA DE OSOS,Municipio,"-75,460723","6,643366"
05,ANTIOQUIA,05690,SANTO DOMINGO,Municipio,"-75,164903","6,473032"
05,ANTIOQUIA,05697,EL SANTUARIO,Municipio,"-75,265465","6,136871"
05,ANTIOQUIA,05736,SEGOVIA,Municipio,"-74,701596","7,079648"
05,ANTIOQUIA,05756,SONSÓN,Municipio,"-75,309596","5,714851"
05,ANTIOQUIA,05761,SOPETRÁN,Municipio,"-75,747378","6,500745"
05,ANTIOQUIA,05789,TÁMESIS,Municipio,"-75,714429","5,664645"
05,ANTIOQUIA,05790,TARAZÁ,Municipio,"-75,401407","7,580127"
05,ANTIOQUIA,05792,TARSO,Municipio,"-75,822956","5,864542"
05,ANTIOQUIA,05809,TITIRIBÍ,Municipio,"-75,791887","6,062391"
05,ANTIOQUIA,05819,TOLEDO,Municipio,"-75,692281","7,010328"
05,ANTIOQUIA,05837,TURBO,Municipio,"-76,728858","8,089929"
05,ANTIOQUIA,05842,URAMITA,Municipio,"-76,173284","6,898393"
05,ANTIOQUIA,05847,URRAO,Municipio,"-76,133951","6,317343"
05,ANTIOQUIA,05854,VALDIVIA,Municipio,"-75,439274","7,1652"
05,ANTIOQUIA,05856,VALPARAÍSO,Municipio,"-75,624452","5,614555"
05,ANTIOQUIA,05858,VEGACHÍ,Municipio,"-74,798714","6,773525"
05,ANTIOQUIA,05861,VENECIA,Municipio,"-75,735544","5,964693"
05,ANTIOQUIA,05873,VIGÍA DEL FUERTE,Municipio,"-76,896004","6,588164"
05,ANTIOQUIA,05885,YALÍ,Municipio,"-74,840059","6,676554"
05,ANTIOQUIA,05887,YARUMAL,Municipio,"-75,418828","6,963832"
05,ANTIOQUIA,05890,YOLOMBÓ,Municipio,"-75,013385","6,594511"
05,ANTIOQUIA,05893,YONDÓ,Municipio,"-73,912445","7,00396"
05,ANTIOQUIA,05895,ZARAGOZA,Municipio,"-74,867075","7,488583"
08,ATLÁNTICO,08001,BARRANQUILLA,Municipio,"-74,815546","10,977961"
08,ATLÁNTICO,08078,BARANOA,Municipio,"-74,916077","10,79445"
08,ATLÁNTICO,08137,CAMPO DE LA CRUZ,Municipio,"-74,880847","10,378291"
08,ATLÁNTICO,08141,CANDELARIA,Municipio,"-74,879717","10,461903"
08,ATLÁNTICO,08296,GALAPA,Municipio,"-74,870385","10,919033"
08,ATLÁNTICO,08372,JUAN DE ACOSTA,Municipio,"-75,041032","10,83254"
08,ATLÁNTICO,08421,LURUACO,Municipio,"-75,14199","10,610491"
08,ATLÁNTICO,08433,MALAMBO,Municipio,"-74,776923","10,857086"
08,ATLÁNTICO,08436,MANATÍ,Municipio,"-74,956867","10,449089"
08,ATLÁNTICO,08520,PALMAR DE VARELA,Municipio,"-74,754765","10,738591"
08,ATLÁNTICO,08549,PIOJÓ,Municipio,"-75,107592","10,749216"
08,ATLÁNTICO,08558,POLONUEVO,Municipio,"-74,852981","10,777363"
08,ATLÁNTICO,08560,PONEDERA,Municipio,"-74,753885","10,641779"
08,ATLÁNTICO,08573,PUERTO COLOMBIA,Municipio,"-74,888627","11,015322"
08,ATLÁNTICO,08606,REPELÓN,Municipio,"-75,125534","10,493357"
08,ATLÁNTICO,08634,SABANAGRANDE,Municipio,"-74,759496","10,792453"
08,ATLÁNTICO,08638,SABANALARGA,Municipio,"-74,921256","10,632091"
08,ATLÁNTICO,08675,SANTA LUCÍA,Municipio,"-74,959204","10,324303"
08,ATLÁNTICO,08685,SANTO TOMÁS,Municipio,"-74,757859","10,758735"
08,ATLÁNTICO,08758,SOLEDAD,Municipio,"-74,786054","10,909921"
08,ATLÁNTICO,08770,SUAN,Municipio,"-74,881687","10,335432"
08,ATLÁNTICO,08832,TUBARÁ,Municipio,"-74,978704","10,873586"
08,ATLÁNTICO,08849,USIACURÍ,Municipio,"-74,976985","10,74298"
11,BOGOTÁ D.C.,11001,BOGOTÁ D.C.,Municipio,"-74,106992","4,649251"
13,BOLÍVAR,13001,CARTAGENA DE INDIAS,Municipio,"-75,496269","10,385126"
13,BOLÍVAR,13006,ACHÍ,Municipio,"-74,557676","8,570107"
13,BOLÍVAR,13030,ALTOS DEL ROSARIO,Municipio,"-74,164905","8,791865"
13,BOLÍVAR,13042,ARENAL,Municipio,"-73,941099","8,458865"
13,BOLÍVAR,13052,ARJONA,Municipio,"-75,344332","10,25666"
13,BOLÍVAR,13062,ARROYOHONDO,Municipio,"-75,019215","10,250075"
13,BOLÍVAR,13074,BARRANCO DE LOBA,Municipio,"-74,104391","8,947787"
13,BOLÍVAR,13140,CALAMAR,Municipio,"-74,916144","10,250431"
13,BOLÍVAR,13160,CANTAGALLO,Municipio,"-73,914605","7,378678"
13,BOLÍVAR,13188,CICUCO,Municipio,"-74,645981","9,274281"
13,BOLÍVAR,13212,CÓRDOBA,Municipio,"-74,827399","9,586942"
13,BOLÍVAR,13222,CLEMENCIA,Municipio,"-75,328469","10,567452"
13,BOLÍVAR,13244,EL CARMEN DE BOLÍVAR,Municipio,"-75,121178","9,718653"
13,BOLÍVAR,13248,EL GUAMO,Municipio,"-74,976084","10,030958"
13,BOLÍVAR,13268,EL PEÑÓN,Municipio,"-73,949274","8,988271"
13,BOLÍVAR,13300,HATILLO DE LOBA,Municipio,"-74,077912","8,956014"
13,BOLÍVAR,13430,MAGANGUÉ,Municipio,"-74,766742","9,263799"
13,BOLÍVAR,13433,MAHATES,Municipio,"-75,191643","10,233285"
13,BOLÍVAR,13440,MARGARITA,Municipio,"-74,285137","9,15784"
13,BOLÍVAR,13442,MARÍA LA BAJA,Municipio,"-75,300516","9,982402"
13,BOLÍVAR,13458,MONTECRISTO,Municipio,"-74,471176","8,297234"
13,BOLÍVAR,13468,SANTA CRUZ DE MOMPOX,Municipio,"-74,42818","9,244241"
13,BOLÍVAR,13473,MORALES,Municipio,"-73,868172","8,276558"
13,BOLÍVAR,13490,NOROSÍ,Municipio,"-74,038003","8,526259"
13,BOLÍVAR,13549,PINILLOS,Municipio,"-74,462279","8,914947"
13,BOLÍVAR,13580,REGIDOR,Municipio,"-73,821638","8,666258"
13,BOLÍVAR,13600,RÍO VIEJO,Municipio,"-73,840466","8,58795"
13,BOLÍVAR,13620,SAN CRISTÓBAL,Municipio,"-75,065076","10,392836"
13,BOLÍVAR,13647,SAN ESTANISLAO,Municipio,"-75,153101","10,398602"
13,BOLÍVAR,13650,SAN FERNANDO,Municipio,"-74,323811","9,214183"
13,BOLÍVAR,13654,SAN JACINTO,Municipio,"-75,12105","9,830275"
13,BOLÍVAR,13655,SAN JACINTO DEL CAUCA,Municipio,"-74,721156","8,25158"
13,BOLÍVAR,13657,SAN JUAN NEPOMUCENO,Municipio,"-75,081761","9,953751"
13,BOLÍVAR,13667,SAN MARTÍN DE LOBA,Municipio,"-74,039134","8,937485"
13,BOLÍVAR,13670,SAN PABLO,Municipio,"-73,924602","7,476747"
13,BOLÍVAR,13673,SANTA CATALINA,Municipio,"-75,287855","10,605294"
13,BOLÍVAR,13683,SANTA ROSA,Municipio,"-75,369824","10,444396"
13,BOLÍVAR,13688,SANTA ROSA DEL SUR,Municipio,"-74,052243","7,963938"
13,BOLÍVAR,13744,SIMITÍ,Municipio,"-73,947264","7,953916"
13,BOLÍVAR,13760,SOPLAVIENTO,Municipio,"-75,136404","10,38839"
13,BOLÍVAR,13780,TALAIGUA NUEVO,Municipio,"-74,567479","9,30403"
13,BOLÍVAR,13810,TIQUISIO,Municipio,"-74,262922","8,558666"
13,BOLÍVAR,13836,TURBACO,Municipio,"-75,427249","10,348316"
13,BOLÍVAR,13838,TURBANÁ,Municipio,"-75,44265","10,274585"
13,BOLÍVAR,13873,VILLANUEVA,Municipio,"-75,275613","10,444089"
13,BOLÍVAR,13894,ZAMBRANO,Municipio,"-74,817879","9,746306"
50,META,50001,VILLAVICENCIO,Municipio,"-73,622601","4,126369"
50,META,50006,ACACÍAS,Municipio,"-73,766034","3,990413"
50,META,50110,BARRANCA DE UPÍA,Municipio,"-72,961083","4,566225"
50,META,50124,CABUYARO,Municipio,"-72,791768","4,286705"
50,META,50150,CASTILLA LA NUEVA,Municipio,"-73,687302","3,830005"
50,META,50223,CUBARRAL,Municipio,"-73,837999","3,793653"
50,META,50226,CUMARAL,Municipio,"-73,487052","4,270042"
50,META,50245,EL CALVARIO,Municipio,"-73,713325","4,352665"
50,META,50251,EL CASTILLO,Municipio,"-73,794225","3,563907"
50,META,50270,EL DORADO,Municipio,"-73,835264","3,739984"
50,META,50287,FUENTE DE ORO,Municipio,"-73,618121","3,462875"
50,META,50313,GRANADA,Municipio,"-73,705815","3,547147"
50,META,50318,GUAMAL,Municipio,"-73,768815","3,879657"
50,META,50325,MAPIRIPÁN,Municipio,"-72,135509","2,896617"
50,META,50330,MESETAS,Municipio,"-74,044328","3,382732"
50,META,50350,LA MACARENA,Municipio,"-73,78661","2,177143"
50,META,50370,URIBE,Municipio,"-74,351508","3,239634"
50,META,50400,LEJANÍAS,Municipio,"-74,023514","3,525115"
50,META,50450,PUERTO CONCORDIA,Municipio,"-72,760209","2,624006"
50,META,50568,PUERTO GAITÁN,Municipio,"-72,087649","4,314905"
50,META,50573,PUERTO LÓPEZ,Municipio,"-72,957324","4,09349"
50,META,50577,PUERTO LLERAS,Municipio,"-73,37385","3,272117"
50,META,50590,PUERTO RICO,Municipio,"-73,206314","2,939621"
50,META,50606,RESTREPO,Municipio,"-73,565408","4,259556"
50,META,50680,SAN CARLOS DE GUAROA,Municipio,"-73,242253","3,71065"
50,META,50683,SAN JUAN DE ARAMA,Municipio,"-73,875832","3,373728"
50,META,50686,SAN JUANITO,Municipio,"-73,676699","4,458181"
50,META,50689,SAN MARTÍN,Municipio,"-73,695812","3,701899"
50,META,50711,VISTAHERMOSA,Municipio,"-73,750966","3,125579"`;

const lines = RAW.trim().split('\n');
const depts = new Map();
const munis = [];

for (const line of lines) {
  const f = parseLine(line.trim());
  if (f.length < 7) continue;
  const [codDep, nomDep, codMun, nomMun, tipo, lon, lat] = f;
  const codDep2 = codDep.padStart(2,'0');
  const codMun5 = codMun.padStart(5,'0');
  if (!depts.has(codDep2)) depts.set(codDep2, nomDep);
  munis.push({ codDep: codDep2, codMun: codMun5, nomMun, tipo, lon: fixCoord(lon), lat: fixCoord(lat) });
}

const esc = s => s.replace(/'/g, "''");

let sql = `-- =============================================================================
-- Migración 015: Departamentos y Municipios de Colombia (datos DANE)
-- Incluye coordenadas para uso en mapas
-- Departamento inicial configurado: META (código 50)
-- =============================================================================

BEGIN;

-- Columnas adicionales en municipios (lat/lon simples + tipo)
ALTER TABLE municipios
  ADD COLUMN IF NOT EXISTS latitud  NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitud NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS tipo     TEXT DEFAULT 'Municipio';

-- Columna departamento en profiles para multi-departamento
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS departamento_id UUID REFERENCES departamentos(id);

-- =========================================================================
-- DEPARTAMENTOS
-- =========================================================================
INSERT INTO departamentos (codigo_dane, nombre) VALUES
`;

const deptRows = [];
for (const [cod, nom] of depts) {
  deptRows.push(`  ('${cod}', '${esc(nom)}')`);
}
sql += deptRows.join(',\n');
sql += `
ON CONFLICT (codigo_dane) DO UPDATE SET nombre = EXCLUDED.nombre;

-- =========================================================================
-- MUNICIPIOS
-- =========================================================================
INSERT INTO municipios (codigo_dane, nombre, tipo, latitud, longitud, departamento_id)
SELECT
  m.codigo_dane, m.nombre, m.tipo, m.latitud, m.longitud,
  d.id
FROM (VALUES
`;

const muniRows = munis.map(m =>
  `  ('${m.codMun}','${esc(m.nomMun)}','${m.tipo}',${m.lat},${m.lon},'${m.codDep}')`
);
sql += muniRows.join(',\n');
sql += `
) AS m(codigo_dane, nombre, tipo, latitud, longitud, cod_dep)
JOIN departamentos d ON d.codigo_dane = m.cod_dep
ON CONFLICT (codigo_dane) DO UPDATE SET
  nombre       = EXCLUDED.nombre,
  tipo         = EXCLUDED.tipo,
  latitud      = EXCLUDED.latitud,
  longitud     = EXCLUDED.longitud,
  departamento_id = EXCLUDED.departamento_id;

-- =========================================================================
-- CUERPOS DE SOCORRO DEMO (Meta)
-- =========================================================================
INSERT INTO organismos (nombre, tipo, municipio_id)
SELECT o.nombre, o.tipo, mu.id
FROM (VALUES
  ('Cuerpo de Bomberos Villavicencio','BOMBEROS','50001'),
  ('Defensa Civil Meta','DEFENSA_CIVIL','50001'),
  ('Cruz Roja Colombiana Seccional Meta','CRUZ_ROJA','50001'),
  ('Cuerpo de Bomberos Acacías','BOMBEROS','50006'),
  ('Defensa Civil Acacías','DEFENSA_CIVIL','50006'),
  ('Cruz Roja Granada','CRUZ_ROJA','50313'),
  ('Cuerpo de Bomberos Granada','BOMBEROS','50313'),
  ('Defensa Civil San Martín','DEFENSA_CIVIL','50689'),
  ('Policía Nacional Meta','POLICIA','50001')
) AS o(nombre, tipo, cod_mun)
JOIN municipios mu ON mu.codigo_dane = o.cod_mun
ON CONFLICT DO NOTHING;

-- =========================================================================
-- EVENTOS DEMO (Meta — 3 por municipio, al menos 1 activo)
-- =========================================================================
INSERT INTO incidentes (
  codigo, titulo, descripcion, tipo_amenaza, estado,
  municipio_id, latitud, longitud, es_simulacro, nivel_confianza
)
SELECT
  ev.codigo, ev.titulo, ev.descripcion, ev.tipo::tipo_amenaza,
  ev.estado::estado_evento_v2,
  mu.id, mu.latitud, mu.longitud,
  ev.simulacro, ev.confianza
FROM (VALUES
  -- Villavicencio
  ('EV-2026-001','Desbordamiento Caño Maizaro',
   'El caño Maizaro presenta desbordamiento en el sector La Reliquia afectando 200 familias.',
   'INUNDACION','EN_CURSO','50001',false,95),
  ('EV-2025-089','Incendio estructural barrio Barzal',
   'Incendio en bodega de materiales reciclables. Controlado sin víctimas.',
   'INCENDIO','CERRADO','50001',false,100),
  ('EV-2025-042','Simulacro evacuación zona norte',
   'Ejercicio de evacuación masiva coordinado con bomberos y defensa civil.',
   'OTRO','CERRADO','50001',true,100),
  -- Acacías
  ('EV-2026-012','Remoción en masa vereda El Triunfo',
   'Deslizamiento de tierra en vía Acacías-San Luis de Cubarral, vía bloqueada 3 km.',
   'REMOCION','EN_CURSO','50006',false,90),
  ('EV-2025-067','Incendio forestal sector piedemonte',
   'Quema de rastrojos que se extendió 15 hectáreas. Extinguido con apoyo aéreo.',
   'INCENDIO','CERRADO','50006',false,100),
  ('EV-2026-003','Vendaval con daños en infraestructura',
   'Vientos fuertes derribaron postes de energía en el casco urbano.',
   'VENDAVAL','CONTROLADO','50006',false,85),
  -- Granada
  ('EV-2026-015','Inundación río Ariari sector urbano',
   'El río Ariari superó nivel de alerta roja. 450 personas evacuadas preventivamente.',
   'INUNDACION','EN_CURSO','50313',false,92),
  ('EV-2025-031','Sismo 3.8 ML sin daños reportados',
   'Sismo de baja intensidad percibido por la población. Inspección de estructuras sin novedades.',
   'SISMO','CERRADO','50313',false,100),
  ('EV-2025-078','Contaminación río por derrame combustible',
   'Derrame de ACPM en afluente del Ariari. Autoridades ambientales en atención.',
   'OTRO','CERRADO','50313',false,100),
  -- San Martín
  ('EV-2026-008','Incendio forestal cercanías finca ganadera',
   'Incendio que amenaza pastizales y corrales. Bomberos y defensa civil en control.',
   'INCENDIO','EN_CURSO','50689',false,88),
  ('EV-2025-055','Desbordamiento caño La Venturosa',
   'Creciente súbita por lluvias afectó 80 familias ribereñas.',
   'INUNDACION','CERRADO','50689',false,100),
  ('EV-2025-091','Simulacro sismo y evacuación',
   'Ejercicio institucional con participación de colegios y entidades.',
   'SISMO','CERRADO','50689',true,100)
) AS ev(codigo, titulo, descripcion, tipo, estado, cod_mun, simulacro, confianza)
JOIN municipios mu ON mu.codigo_dane = ev.cod_mun
ON CONFLICT (codigo) DO NOTHING;

COMMIT;
`;

writeFileSync('D:\\Jota\\Desa\\siagrd\\database\\migrations\\015_colombia_geo.sql', sql);
console.log(`Generated: ${depts.size} departamentos, ${munis.length} municipios`);
console.log('File: database/migrations/015_colombia_geo.sql');
SCRIPT
