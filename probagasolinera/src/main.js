//npm create vite@latest probagasolinera -- --template vanilla, npm rnu dev
async function getProvincias(){
  const provinciasRespuesta = await fetch("https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/Listados/Provincias/");
  const provincias = await provinciasRespuesta.json()
  return provincias
}

async function getStations(idProvincia){
  const stationsRespuesta = await fetch(`https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/${idProvincia}`);
  const stations = await stationsRespuesta.json()
  return stations.ListaEESSPrecio;
}

function generateSelectProvincias(provincias){
  const selectProvincias = document.createElement('select');

  const options = provincias.map(prov => {
        const option = document.createElement('option')
        option.value = prov.IDPovincia
        option.textContent = prov.Provincia
        return option       
  })
  selectProvincias.append(...options)
  return selectProvincias
}

function normalizeStations(rawStations) {
    return rawStations.map(s => {
        return {
            id: s["IDEESS"],
            nombre: s["Rótulo"],
            direccion: s["Dirección"],
            municipio: s["Localidad"],
            horario: s["Horario"],
            gas95: toPrice(s["Precio Gasolina 95 E5"]),
            gas98: toPrice(s["Precio Gasolina 98 E5"]),
            diesel: toPrice(s["Precio Gasoleo A"]),
        };
    });
}

function toPrice(texto){
return texto==="" ? null : parseFloat(texto.replace(',', '.'))
}

function generateDivsStations(stations){
return stations.map(station => {
        const divStation = document.createElement('div');
        divStation.classList.add('col');
        divStation.innerHTML = `
        <h2>${station.nombre}</h2>
        <h3>${station.direccion}, ${station.municipio}</h3>
        <p>${station.horario}</p>
          <ul>
            ${station.gas98 ? `<li>Gasolina 98: ${station.gas98} €</li>` : ''}
            ${station.gas95 ? `<li>Gasolina 95: ${station.gas95} €</li>` : ''}
            ${station.diesel ? `<li>Diesel: ${station.diesel} €</li>` : ''}
          </ul>`        
        return divStation;
});
}
function getAveragePrice(stations, fuel) {
    const conPrecio = stations.filter(s => s[fuel]);
    if (conPrecio.length === 0) return null;                   // no hay ninguna
    const suma = conPrecio.reduce((acc, s) => acc + s[fuel], 0); // 2. sumar los precios
    return suma / conPrecio.length;
}

function addDivs(container,arrayDivs){
    container.append(...arrayDivs);
}

function sortBy(comparationFunction, array) {
    return [...array].sort(comparationFunction);
}
//sin este async en la declaracion, dentro no se puede utilizar await
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.querySelector('#container');
    const info = document.querySelector('#info');

    // Provincias y select
    const provincias = await getProvincias();
    const select = generateSelectProvincias(provincias);
    document.querySelector('#filtros h2').after(select);

    let estaciones = [];   // ← let: irá cambiando según la provincia

    // Al cambiar de provincia
    select.addEventListener('change', async () => {
        info.textContent = 'Cargando gasolineras...';
        container.innerHTML = '';
        estaciones = normalizeStations(await getStations(select.value));   // ← reasigna
        info.textContent = '';
        addDivs(container, generateDivsStations(estaciones));
    });

    // Al pulsar un botón de combustible (tu código, sin cambios)
    document.querySelector('#filtros').addEventListener('click', e => {
        if (e.target.tagName !== 'BUTTON') return;
        const prop = e.target.id.split('_')[0];
        const filtradas = estaciones.filter(s => s[prop]);                // 1. solo las que lo venden
        const sorted = sortBy((a, b) => a[prop] - b[prop], filtradas);    // 2. de más barata a más cara
        container.innerHTML = '';
        addDivs(container, generateDivsStations(sorted));

        const media = getAveragePrice(filtradas, prop);
        info.textContent = media === null
            ? 'No hay gasolineras con ese combustible'
            : `Precio medio ${e.target.textContent}: ${media.toFixed(3)} €`;
    });

    // Cargar la provincia que se ve en el select al abrir la página
    select.dispatchEvent(new Event('change'));
});
