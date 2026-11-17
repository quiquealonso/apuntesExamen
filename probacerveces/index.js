import { beers } from "./beers.js";
export { generateDivsBeers, addDivs, sortBy };  

/*
 ==========================================================================
  CÓMO ESTÁN DISEÑADOS LOS DATOS  →  Punk API (cervezas de BrewDog)
 ==========================================================================

  En este ejercicio los datos NO se piden por internet: vienen en beers.js
  y se importan con:   import { beers } from "./beers.js";
  (la API original dejó de funcionar, por eso el profe la dio en un archivo).
  Pero el FORMATO es el mismo que daba la API, así que hay que saberlo:

  CÓMO ERA LA API
    GET https://api.punkapi.com/v2/beers?page=1&per_page=25
    Devuelve DIRECTAMENTE UN ARRAY (no hay { results } ni { data }):
      [ { id: 1, name: "Buzz", ... }, { id: 2, ... }, ... ]
    - Paginación con page (empieza en 1) y per_page.
    - NO dice cuántas hay en total ni si hay página siguiente.
      Truco: si te llegan MENOS de per_page → estás en la última página.
    - Con el array directo puedes hacer data.map(...) sin nada en medio.

  CÓMO ES CADA CERVEZA (un solo nivel: ya viene todo, no hay urls de detalle)
    {
      id: 1, name: "Buzz", tagline: "A Real Bitter Experience.",
      description: "...", image_url: "https://...",
      abv: 4.5, ibu: 60, ebc: 20, ph: 4.4,     ← NÚMEROS sueltos (planos)
                                                 ¡alguno puede ser null!
      volume: { value: 20, unit: "litres" },   ← objeto dentro
      ingredients: {                           ← objeto con arrays dentro
        malt:  [ { name: "Munich", amount: { value: 0.4, unit: "kilograms" } } ],
        hops:  [ { name: "Fuggles", amount: {...}, add: "start", attribute: "bitter" } ],
        yeast: "Wyeast 1056 - American Ale"    ← este es un string, no array
      },
      food_pairing: [ "Spicy chicken tikka masala", ... ],   ← array de strings
      brewers_tips: "..."
    }
    - Propiedades planas → se usan directas: beer.abv
    - Propiedad por variable → con corchetes: beer[prop]  (prop = "abv")
    - Anidadas → se baja nivel a nivel: beer.ingredients.malt.map(m => m.name)
    - Array de strings → directo a map + join: beer.food_pairing.map(f => `<li>${f}</li>`)

  COMPARADO CON LAS OTRAS APIs QUE HAS HECHO
    PokeAPI      → objeto { count, results }; results solo trae url → 2 niveles,
                   Promise.all.                              (probapokemons)
    Punk API     → ARRAY directo, cada elemento completo → 1 nivel. (ESTE)
    json-server  → array de { restaurant: {...} } → hay que "desenvolver"
                   r.restaurant.                             (restaurantProba)
    PRIMERA PREGUNTA EN EL EXAMEN: haz console.log(data) y mira si es
    un array, un objeto con el array dentro, o un objeto que envuelve a cada uno.

 ==========================================================================
  ESQUEMA DEL PROGRAMA
    datos (beers) → estado (lista, criterio, pagina) → transformar
    (filterBeers, sortBy, getPage) → pintar() → eventos que llaman a pintar()
 ==========================================================================
*/

// ---------------------------------------------------------------------------
// PINTAR: recibe un array de cervezas y DEVUELVE un array de divs.
// El parámetro se llama "lista" y NO "beers": si se llamara beers taparía al
// array importado (todas las cervezas) y el botón "Similar" buscaría solo
// entre las de la página actual.
// Los datos planos (abv, ibu...) van directos; los anidados (ingredientes,
// food_pairing) con map + join('') porque van dentro del innerHTML.
// ---------------------------------------------------------------------------
function generateDivsBeers(lista){
    //recorre cada cervez y genera un div con la información de la cerveza
    return lista.map(beer => {
        const divBeer = document.createElement('div');
        divBeer.classList.add('col');
        divBeer.innerHTML = `
        <h2>${beer.name}</h2>
        <h3>${beer.tagline}</h3>
        <p>${beer.description}</p>
        ${renderIngredientes(beer)}
        <ul>
        <li>ABV: ${beer.abv}</li>
        <li>IBU: ${beer.ibu}</li>
        <li>EBC: ${beer.ebc}</li>
        <li>PH: ${beer.ph}</li>
        <button>25 Similar</button>
        </ul>
        `;

        // 6  (esto es del último punto)
        // Botón "25 Similar": busca entre TODAS las cervezas (beers importado).
        // Ojo: pinta directamente en #container, así que se salta la paginación
        // y los filtros (es un "modo aparte"); al buscar u ordenar se vuelve
        // a la vista normal.
        divBeer.querySelector('button').addEventListener('click',()=>{
            let similar = findSimilarBeers(beer,beers);
            const container = document.querySelector('#container');
            container.innerHTML = '';
            addDivs(container,generateDivsBeers(similar));
        });

        return divBeer;
    });
}

// Mete un array de divs en el contenedor (el ... los separa uno a uno).
function addDivs(container,arrayDivs){
    container.append(...arrayDivs);
}

// ---------------------------------------------------------------------------
// ORDENAR GENÉRICO: recibe la función de comparación y el array.
// [...array] → copia, porque sort modifica el original.
// Ejemplo: sortBy((a, b) => b.abv - a.abv, beers)  → de más a menos alcohol.
// (Las que tienen null cuentan como 0 al restar.)
// ---------------------------------------------------------------------------
function sortBy(comparationFunction, array) {
    return [...array].sort(comparationFunction);
}

// ---------------------------------------------------------------------------
// REDUCE CON NÚMEROS: cuánto se parecen dos cervezas.
// Suma la diferencia (en positivo, Math.abs) de cada característica.
// Cuanto MÁS PEQUEÑO el resultado, más parecidas.
// beer1[carac] con corchetes porque el nombre de la propiedad está en la variable.
// ---------------------------------------------------------------------------
function compareBeers(beer1, beer2) {
    const caracteristicas = ['abv', 'ibu', 'ebc', 'ph'];
    return caracteristicas.reduce((suma, carac) => {
        return suma + Math.abs(beer1[carac] - beer2[carac]);
    }, 0);
}

// ---------------------------------------------------------------------------
// LAS 25 MÁS PARECIDAS:
//  1) map → para cada cerveza un objeto pequeño { id, similar: puntuación }
//  2) ordenar por puntuación de menor a mayor (más parecida primero)
//  3) map + find → volver de los ids a las cervezas completas
//  4) slice(0, 25) → quedarse con las 25 primeras
// ---------------------------------------------------------------------------
function findSimilarBeers(beer, array) {
    let beersComparate = array.map(b => {
        return { id: b.id, similar: compareBeers(b, beer) }
    });
    let beersComparateSorted = sortBy((a, b) => a.similar > b.similar ? 1 : -1, beersComparate);
    let similarBeers = beersComparateSorted.map(b => array.find(B => B.id === b.id)).slice(0, 25);
    return similarBeers;
}

// ===========================================================================
// FUNCIONES NUEVAS (refuerzo para el examen)
// ===========================================================================

// ---------------------------------------------------------------------------
// CÓMO SE DESCARGARÍA SI LA API FUNCIONARA (no se usa: los datos están en
// beers.js). Es el formato "array directo": el json YA es el array, así que
// se devuelve tal cual, sin .results ni .data.
// ---------------------------------------------------------------------------
async function getBeersAPI(url, page, perPage) {
    const response = await fetch(`${url}?page=${page}&per_page=${perPage}`);
    if (!response.ok) {
        throw new Error('Failed to fetch beers');
    }
    const data = await response.json();   // [ {cerveza}, {cerveza}, ... ]
    return data;
}

// ---------------------------------------------------------------------------
// DATOS ANIDADOS: saca los ingredientes de una cerveza.
//   ingredients.malt  → array de objetos → map(m => m.name)
//   ingredients.hops  → array de objetos, con REPETIDOS (el mismo lúpulo se
//                       añade al principio y al final) → map + Set
//   ingredients.yeast → string, se usa directo
// ---------------------------------------------------------------------------
function getIngredientes(beer) {
    return {
        maltas: beer.ingredients.malt.map(m => m.name),
        lupulos: [...new Set(beer.ingredients.hops.map(h => h.name))],
        levadura: beer.ingredients.yeast
    };
}

// Pinta los ingredientes y los platos recomendados. Devuelve un STRING
// (no un div) porque se mete dentro de la plantilla de generateDivsBeers.
function renderIngredientes(beer) {
    const { maltas, lupulos, levadura } = getIngredientes(beer);   // desestructuración
    return `
        <p><b>Maltas:</b> ${maltas.join(', ')}</p>
        <p><b>Lúpulos:</b> ${lupulos.join(', ')}</p>
        <p><b>Levadura:</b> ${levadura}</p>
        <p><b>Para comer con:</b></p>
        <ol>${beer.food_pairing.map(f => `<li>${f}</li>`).join('')}</ol>
    `;
}

// ---------------------------------------------------------------------------
// BUSCADOR: busca el texto en el nombre O en el tagline, sin mayúsculas.
// Con || basta con que coincida en uno de los dos.
// ---------------------------------------------------------------------------
function filterBeers(beers, texto) {
    const t = texto.toLowerCase();
    return beers.filter(b => b.name.toLowerCase().includes(t) ||
                             b.tagline.toLowerCase().includes(t));
}

// ---------------------------------------------------------------------------
// PAGINACIÓN EN EL NAVEGADOR: corta el trozo que toca.
//   página 1 → slice(0, perPage),  página 2 → slice(perPage, perPage*2) ...
// (Con la API real no haría falta: se pediría ?page=2&per_page=12.)
// ---------------------------------------------------------------------------
function getPage(beers, page, perPage) {
    const inicio = (page - 1) * perPage;
    return beers.slice(inicio, inicio + perPage);
}

// ---------------------------------------------------------------------------
// ESTADÍSTICA: media de un campo numérico, SALTÁNDOSE LOS null.
// En esta API algunas cervezas tienen ibu/ebc/ph a null. Si las sumas,
// cuentan como 0 y la media sale mal → primero filter, luego reduce.
// ---------------------------------------------------------------------------
function getMedia(beers, campo) {
    const conValor = beers.filter(b => b[campo] !== null);
    if (conValor.length === 0) return 0;
    const suma = conValor.reduce((total, b) => total + b[campo], 0);
    return suma / conValor.length;
}

// Pinta las medias de las 4 características con map + join.
function renderStats(beers) {
    const div = document.createElement('div');
    div.innerHTML = `
        <b>${beers.length} cervezas</b> ·
        ${['abv', 'ibu', 'ebc', 'ph'].map(c => `${c.toUpperCase()} medio: ${getMedia(beers, c).toFixed(1)}`).join(' · ')}
    `;
    return div;
}

// ===========================================================================
// MAIN
// ===========================================================================
document.addEventListener('DOMContentLoaded',()=>{
    const container = document.querySelector('#container');
    const buscador = document.querySelector('#buscador');
    const paginacion = document.querySelector('#paginacion');
    const stats = document.querySelector('#stats');

    // VARIABLES DE ESTADO
    //   lista    → las cervezas que tocan (todas o las del buscador)
    //   criterio → por qué propiedad se ordena ('abv', 'ibu'...) o null
    //   pagina   → página actual
    // beers (el importado) no se toca nunca: es el original para volver a filtrar.
    let lista = beers;
    let criterio = null;
    let pagina = 1;
    const PER_PAGE = 12;

    // La única función que pinta: ordena → pagina → pinta → botones → stats.
    function pintar() {
        const ordenadas = criterio ? sortBy((a, b) => b[criterio] - a[criterio], lista) : lista;
        const pages = Math.ceil(ordenadas.length / PER_PAGE);

        container.innerHTML = '';
        addDivs(container, generateDivsBeers(getPage(ordenadas, pagina, PER_PAGE)));

        paginacion.innerHTML = `
            <button id="anterior" ${pagina === 1 ? 'disabled' : ''}>Anterior</button>
            <span>Página ${pagina} de ${pages}</span>
            <button id="siguiente" ${pagina >= pages ? 'disabled' : ''}>Siguiente</button>
        `;
        document.querySelector('#anterior').addEventListener('click', () => { pagina--; pintar(); });
        document.querySelector('#siguiente').addEventListener('click', () => { pagina++; pintar(); });

        stats.innerHTML = '';
        stats.append(renderStats(lista));
    }

    pintar();   // primera vez

    // ORDENAR: un solo listener en el div #botons para los 4 botones
    // (delegación de eventos). e.target es el elemento pulsado; de su id
    // "abv_Button" se saca "abv" con split('_')[0].
    // Si se pulsa el h2 o el hueco entre botones, e.target no es un botón → nada.
    document.querySelector('#botons').addEventListener('click', e => {
        if (e.target.tagName !== 'BUTTON') return;
        criterio = e.target.id.split('_')[0];
        pagina = 1;
        pintar();
    });

    // BUSCADOR: cambia la lista, vuelve a la página 1 y repinta.
    // Como el orden se aplica dentro de pintar(), se combina solo.
    buscador.addEventListener('keyup', () => {
        lista = filterBeers(beers, buscador.value);
        pagina = 1;
        pintar();
    });
});
