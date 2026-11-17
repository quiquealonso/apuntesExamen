import "./style.css";

/*
 ==========================================================================
  CÓMO ESTÁ DISEÑADA LA API  →  PokeAPI (https://pokeapi.co/api/v2/)
 ==========================================================================

  Es una API "EN DOS NIVELES": primero pides una LISTA y la lista NO trae
  los datos buenos, solo un enlace a cada elemento. Luego pides cada enlace.

  NIVEL 1 · LISTADO
    GET https://pokeapi.co/api/v2/pokemon?limit=20&offset=0
    Devuelve un OBJETO (¡no un array!):
      {
        count: 1350,                      ← total de pokemons que existen
        next: "https://...offset=20...",  ← url de la página siguiente (o null)
        previous: null,                   ← url de la anterior (o null)
        results: [                        ← AQUÍ está el array
          { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/" },
          ...
        ]
      }
    - Paginación con limit (cuántos) y offset (desde cuál, empieza en 0).
      Si te dan página y tamaño: offset = (pagina - 1) * limit
    - Para llegar al array:  data.results   (si haces data.map → ERROR)
    - Cada elemento SOLO trae name y url. Ni id, ni imagen, ni tipos.

  NIVEL 2 · DETALLE
    GET la url que viene en cada results[i]   (o /pokemon/25 o /pokemon/pikachu)
    Devuelve UN pokemon con todo:
      {
        id: 1, name: "bulbasaur",
        height: 7,     ← en DECÍMETROS  (÷10 = metros)
        weight: 69,    ← en HECTOGRAMOS (÷10 = kilos)
        sprites: { front_default: "url de la imagen" },   ← puede ser null
        types: [ { slot: 1, type: { name: "grass", url } }, ... ],
        stats: [ { base_stat: 45, stat: { name: "hp" } }, ... ]
      }
    - types y stats son ARRAYS DE OBJETOS CON OTRO OBJETO DENTRO.
        nombres de tipos →  p.types.map(t => t.type.name)   → ["grass","poison"]
        suma de stats    →  p.stats.reduce((tot, s) => tot + s.base_stat, 0)
    - Si el nombre no existe → error 404 → response.ok es false.

  QUÉ OBLIGA A HACER ESTE DISEÑO
    1) Descargar la lista.
    2) Por cada elemento, descargar su url  →  map(p => fetch(p.url))
    3) Esperar a TODOS a la vez             →  await Promise.all(promesas)
    Si te olvidas del paso 2 pintas undefined (la lista no tiene id/imagen).

  CÓMO RECONOCER ESTE TIPO EN EL EXAMEN
    - La respuesta trae { count, next, previous, results }.
    - Cada elemento de results solo tiene un nombre y una url.
    → Entonces necesitas la función intermedia con Promise.all.

 ==========================================================================
  ESQUEMA DEL PROGRAMA (vale para cualquier API)
 ==========================================================================
    1. DESCARGAR   (funciones async, con await)      getPokemons, getDetallePokemon...
    2. GUARDAR     (variables de estado en el main)  pokemons, lista, pagina, perPage
    3. TRANSFORMAR (funciones normales que reciben   filterByName, filterByType,
                    un array y DEVUELVEN otro)        sortPokemons, getPage
    4. PINTAR      (funciones render que DEVUELVEN   renderPokemon, renderDetail...
                    divs; el DOM se toca en el main)
    Cada evento (click, keyup, change, submit) solo cambia variables y
    llama a pintar().
 ==========================================================================
*/

// ---------------------------------------------------------------------------
// NIVEL 1: descarga el LISTADO.
// Recibe la url base, cuántos (limit) y desde cuál (offset) y monta la query
// con un template string: .../pokemon?limit=20&offset=0
// DEVUELVE el objeto entero { count, next, previous, results }, NO un array.
// ---------------------------------------------------------------------------
async function getPokemons(url, limit, offset) {
  const pokemonPeticion = await fetch(`${url}?limit=${limit}&offset=${offset}`)
  const pokemons = await pokemonPeticion.json()
  //const restaurantClass = restaurants.map(r => new Restaurant(r))
  return pokemons
}

// ---------------------------------------------------------------------------
// LA FUNCIÓN CLAVE de las APIs en dos niveles: une el listado con el detalle.
//  1) getPokemons → { results: [ {name, url}, ... ] }
//  2) map: por cada uno lanza getDetallePokemon(p.url). Eso NO son pokemons,
//     son PROMESAS ("tickets"), porque una función async siempre devuelve
//     una promesa.
//  3) Promise.all(promesas) espera a que lleguen TODAS y devuelve el array
//     de pokemons completos, en el mismo orden.
// DEVUELVE: array de pokemons con id, sprites, types, stats...
// ---------------------------------------------------------------------------
async function getPokemonsConDetalle(url, limit, offset) {
  const data = await getPokemons(url, limit, offset)                 // { count, results: [{name, url}] }
  const promesas = data.results.map(p => getDetallePokemon(p.url))   // 20 "tickets"
  const detalles = await Promise.all(promesas)                       // espera a los 20
  return detalles                                                    // array de pokemons completos
}

// ---------------------------------------------------------------------------
// NIVEL 2: descarga UN pokemon a partir de su url (la que viene en results).
// La url ya va completa, no hay que añadirle limit ni offset.
// (Hace lo mismo que getData, pero sin comprobar errores.)
// ---------------------------------------------------------------------------
async function getDetallePokemon(url) {
  const pokemonPeticion = await fetch(url)
  const pokemon = await pokemonPeticion.json()
  console.log(pokemon)
  return pokemon
}

// ---------------------------------------------------------------------------
// PINTAR UNO: recibe un pokemon (ya con detalle) y DEVUELVE un div.card.
//  - Imagen solo si existe: ${condición ? `<img...>` : ''}  (ternario)
//  - Tipos: map a <span> + join('') porque va dentro de un innerHTML.
//  - El click se engancha aquí mismo: cada carta ya sabe qué pokemon es,
//    y al pulsarla pinta su detalle en #detail.
// No hace fetch ni await: los datos tienen que llegar ya descargados.
// ---------------------------------------------------------------------------
function renderPokemon(pokemon) {
  const divPoke = document.createElement('div');
  divPoke.classList.add('card');
  divPoke.innerHTML = `
    ${pokemon.sprites.front_default ? `<img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">` : ''}
    <h2>#${pokemon.id} ${pokemon.name}</h2>
    <p>${pokemon.types.map(t => `<span class="tipo">${t.type.name}</span>`).join('')}</p>
    <p>Stats: ${getTotalStats(pokemon)}</p>
  `;
  divPoke.addEventListener('click', () => {
    const detail = document.querySelector('#detail');
    detail.innerHTML = '';
    detail.append(renderDetail(pokemon));
  });
  return divPoke;
}

// PINTAR VARIOS: array de pokemons → array de divs (map con renderPokemon).
// No toca el DOM; eso lo hace addDivs.
function renderPokemons(pokemons) {
  return pokemons.map(p => renderPokemon(p))
}

// Mete un array de divs en el contenedor. El ... (spread) los separa uno a uno
// porque append quiere elementos sueltos, no un array.
function addDivs(container, arrayDivs) {
  container.append(...arrayDivs);
}

// ---------------------------------------------------------------------------
// (YA NO SE USA) Versión antigua de los botones de tipo, copiada de
// pokemons26. La sustituyen los botones que se crean dentro del main, porque
// esos tienen que cambiar las variables de estado (lista y pagina).
// ---------------------------------------------------------------------------
function buttonType(type, pokemons, container) {
  const button = document.createElement('button');
  button.innerText = type;
  button.addEventListener('click', () => {
    const pokemonsType = pokemons.filter(p => p.types.map(t => t.type.name).includes(type));
    container.innerHTML = '';
    addDivs(container, renderPokemons(pokemonsType));
  });
  return button;
}

// ---------------------------------------------------------------------------
// PAGINACIÓN EN EL NAVEGADOR (los datos ya están todos descargados).
// Corta el trozo de array que toca con slice(inicio, fin) — el fin no se incluye.
//   página 1, 10 por página → slice(0, 10)
//   página 2, 10 por página → slice(10, 20)
// Total de páginas: Math.ceil(total / perPage)  (redondea hacia arriba)
// ---------------------------------------------------------------------------
function getPage(pokemons, page, perPage){
  const inicio = (page - 1) * perPage;
  return pokemons.slice(inicio, inicio + perPage);
}

// FILTRAR POR TIPO. Como types es [{ type: { name } }], primero se saca un
// array de nombres con map y luego se mira si incluye el tipo pedido.
// SOLO filtra: recibe pokemons y un tipo, devuelve los que lo tienen
function filterByType(pokemons, type) {
  return pokemons.filter(p => p.types.map(t => t.type.name).includes(type));
}

// FILTRAR POR NOMBRE (buscador con keyup). toLowerCase en los dos lados para
// que no importen las mayúsculas. Si el texto está vacío, includes('') es
// true para todos → salen todos, no hace falta un if.
function filterByName(pokemons, texto){
  return pokemons.filter(p => p.name.toLowerCase().includes(texto.toLowerCase()));
}

// SOLO pinta: vacía y pinta los que le pases
function renderList(container, pokemons) {
  container.innerHTML = '';
  addDivs(container, renderPokemons(pokemons));
}

// ---------------------------------------------------------------------------
// REDUCE CON NÚMEROS: suma el base_stat de cada stat de UN pokemon.
//   reduce((acumulado, elemento) => nuevoAcumulado, valorInicial)
//   0 + 45 (hp) → 45 + 49 (attack) → 94 + ... → total
// ---------------------------------------------------------------------------
function getTotalStats(pokemon){
  return pokemon.stats.reduce((total, s) => total + s.base_stat, 0);
}

// ---------------------------------------------------------------------------
// ORDENAR. sort((a, b) => ...)  negativo → a va antes, positivo → b va antes.
//   a.id - b.id                              → de menor a mayor
//   getTotalStats(b) - getTotalStats(a)      → de mayor a menor (b primero)
//   texto: a.name > b.name ? 1 : -1          → alfabético (no se pueden restar)
// [...pokemons] hace una COPIA, porque sort modifica el array original.
// ---------------------------------------------------------------------------
function sortPokemons(pokemons, criterio){
  const copia = [...pokemons];
  if (criterio === 'name') {
    return copia.sort((a, b) => a.name > b.name ? 1 : -1);
  }
  if (criterio === 'stats') {
    return copia.sort((a, b) => getTotalStats(b) - getTotalStats(a));
  }
  return copia.sort((a, b) => a.id - b.id);   // 'id' por defecto
}

// ---------------------------------------------------------------------------
// DETALLE (click en una carta o formulario). Tabla con una fila por stat:
// map → strings <tr> → join('') porque va dentro del innerHTML.
// height y weight se dividen entre 10 (la API da decímetros y hectogramos).
// ---------------------------------------------------------------------------
function renderDetail(pokemon) {
  const div = document.createElement('div');
  div.innerHTML = `
    ${pokemon.sprites.front_default ? `<img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">` : ''}
    <h2>${pokemon.name}</h2>
    <p>Altura: ${pokemon.height / 10} m · Peso: ${pokemon.weight / 10} kg</p>
    <table>
      <tr><th>Stat</th><th>Valor</th></tr>
      ${pokemon.stats.map(s => `<tr><td>${s.stat.name}</td><td>${s.base_stat}</td></tr>`).join('')}
      <tr><th>Total</th><th>${getTotalStats(pokemon)}</th></tr>
    </table>
  `;
  return div;
}

// ---------------------------------------------------------------------------
// ESTADÍSTICA: media de un campo numérico (height, weight...).
// p[campo] con corchetes = acceder a la propiedad cuyo nombre está en la
// variable (si campo es 'height' es lo mismo que p.height).
// El if evita dividir entre 0 (daría NaN) cuando el filtro no encuentra nada.
// ---------------------------------------------------------------------------
function getMedia(pokemons, campo) {
  if (pokemons.length === 0) return 0;
  const suma = pokemons.reduce((total, p) => total + p[campo], 0);
  return suma / pokemons.length;
}

// Pinta las estadísticas. toFixed(2) deja 2 decimales.
// Se llama desde pintar() con "lista", así cambia con cada filtro.
function renderStats(pokemons) {
  const div = document.createElement('div');
  div.innerHTML = `
    <h3>Estadísticas (${pokemons.length} pokemons)</h3>
    <p>Altura media: ${(getMedia(pokemons, 'height') / 10).toFixed(2)} m</p>
    <p>Peso medio: ${(getMedia(pokemons, 'weight') / 10).toFixed(2)} kg</p>
  `;
  return div;
}
// ---------------------------------------------------------------------------
// DESCARGA CON CONTROL DE ERRORES (apartado 1 y formulario).
// Si el pokemon no existe la API responde 404 y response.ok es false.
// throw corta la función y manda el error a quien la llamó, que lo recoge
// con try { ... } catch (error) { ... }.
// ---------------------------------------------------------------------------
async function getData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Pokemon no encontrado');
  }
  const data = await response.json();
  return data;
}
// ===========================================================================
// MAIN. Orden: 1) coger elementos del HTML  2) descargar (await)
//              3) variables de estado       4) pintar()  5) eventos
// ===========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.querySelector('#content');
  const paginacion = document.querySelector('#paginacion');
  const buscador = document.querySelector('#buscador');
  const selectTipo = document.querySelector('#selectTipo');
  const selectPerPage = document.querySelector('#perPage');
  const buttons = document.querySelector('#buttons');
  const selectOrden = document.querySelector('#orden');
  const stats = document.querySelector('#stats');

  // OJO: el segundo número es cuántos se descargan. Cada uno es una petición
  // de detalle → con números grandes tarda mucho. En el examen usa 20-200.
  const pokemons = await getPokemonsConDetalle("https://pokeapi.co/api/v2/pokemon", 2000, 0);

  // VARIABLES DE ESTADO: lo que hay que recordar mientras el usuario pulsa.
  //   pagina  → en qué página estamos
  //   perPage → cuántos por página (parseInt porque el value del select es texto)
  //   lista   → los pokemons que tocan ahora (todos o los filtrados)
  // pokemons NO se toca nunca: es la copia original para volver a filtrar.
  // estado
  let pagina = 1;
  let perPage = parseInt(selectPerPage.value);
  let lista = pokemons;

  // pintar() es la ÚNICA función que pinta. Lee las variables de estado y:
  //   ordena → pagina → pinta cartas → pinta botones → pinta estadísticas.
  // Como el orden se aplica aquí dentro, se combina solo con cualquier filtro.
  // disabled con ternario: en la página 1 no se puede ir atrás, en la última
  // no se puede ir adelante.
  // pinta la página actual y los botones de paginación
  function pintar(){
    const ordenados = sortPokemons(lista, selectOrden.value);
  const pages = Math.ceil(ordenados.length / perPage);
  renderList(container, getPage(ordenados, pagina, perPage));

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

  // cambiar cuántos por página → vuelve a la 1
  selectPerPage.addEventListener('change', () => {
    perPage = parseInt(selectPerPage.value);
    pagina = 1;
    pintar();
  });

  // buscador
  buscador.addEventListener('keyup', () => {
    lista = filterByName(pokemons, buscador.value);
    pagina = 1;
    pintar();
  });

  // TIPOS ÚNICOS: map (array de arrays) → flat (un solo array) → Set (quita
  // repetidos) → [... ] (vuelve a array). Igual que en pokemons26.
  // Select: options con map + join(''). Botones: createElement + click.
  // Los dos hacen lo mismo: cambian lista, vuelven a la página 1 y pintar().
  // tipos (select y botones)
  const tipos = [...new Set(pokemons.map(p => p.types.map(t => t.type.name)).flat())];

  selectTipo.innerHTML = `<option value="">Todos</option>` +
    tipos.map(t => `<option value="${t}">${t}</option>`).join('');

  selectTipo.addEventListener('change', () => {
    lista = selectTipo.value === '' ? pokemons : filterByType(pokemons, selectTipo.value);
    pagina = 1;
    pintar();
  });

  tipos.forEach(t => {
    const button = document.createElement('button');
    button.innerText = t;
    button.addEventListener('click', () => {
      lista = filterByType(pokemons, t);
      pagina = 1;
      pintar();
    });
    buttons.append(button);
  });
  selectOrden.addEventListener('change', () => {
  pagina = 1;
  pintar();
});
});

// ===========================================================================
// FORMULARIO (apartado 9): buscar UN pokemon en la API por nombre.
//  - e.preventDefault(): sin esto el formulario recarga la página.
//  - toLowerCase().trim(): la API solo entiende minúsculas y sin espacios.
//  - try/catch: si getData lanza el error (404), salta al catch y se muestra
//    el mensaje en lugar de romperse.
// Nota: está fuera del DOMContentLoaded. Funciona porque los scripts
// type="module" esperan a que el HTML esté cargado, pero lo normal es
// ponerlo dentro del main con todo lo demás.
// ===========================================================================
const formBuscar = document.querySelector('#formBuscar');
const nombreBuscar = document.querySelector('#nombreBuscar');
const detail = document.querySelector('#detail');

formBuscar.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = nombreBuscar.value.toLowerCase().trim();
  if (nombre === '') return;

  try {
    const pokemon = await getData(`https://pokeapi.co/api/v2/pokemon/${nombre}`);
    detail.innerHTML = '';
    detail.append(renderDetail(pokemon));
  } catch (error) {
    console.log(error);
    detail.innerHTML = `<p>Pokemon no encontrado</p>`;
  }
});


/*
  POKEDEX - PokeAPI  (https://pokeapi.co/api/v2/)

  Listado:  https://pokeapi.co/api/v2/pokemon?limit=20&offset=0
     devuelve { count, next, previous, results: [ { name, url }, ... ] }
     (results NO trae imagen ni tipos, solo nombre y url del detalle)

  Detalle:  https://pokeapi.co/api/v2/pokemon/25   (o /pokemon/pikachu)
     devuelve { id, name, height, weight,
                sprites: { front_default },
                types: [ { type: { name } } ],
                stats: [ { base_stat, stat: { name } } ] }

  1. (1p) Función getData(url): descarga la url y devuelve el JSON.
     Si la respuesta no es ok, lanza un Error.

  3. (1,5p) Función getPokemonsPage(page, perPage):
       - calcula el offset a partir de la página (la primera página es la 1)
       - descarga el listado y luego el detalle de cada pokemon (pista: Promise.all)
       - devuelve { pokemons: [objetos Pokemon], pages: total de páginas }

  4. (1p) Función renderPokemons(pokemons, content): vacía el content y pinta
     todas las cartas usando el render() de la clase.

  5. (1,5p) Paginación en #paginacion:
       - botones "Anterior" y "Siguiente" y un texto "Página X de Y"
       - "Anterior" deshabilitado en la primera página y "Siguiente" en la última
       - al cambiar el select #perPage se vuelve a la página 1 con el nuevo tamaño

  6. (1p) Botones de tipos en #buttons (como en pokemons26):
       - un botón por cada tipo distinto que haya en la página ACTUAL (sin repetir)
       - al hacer click solo se ven los de ese tipo
       - un botón "Todos" que los vuelve a mostrar todos
       - se tienen que regenerar cada vez que cambia la página

  7. (1p) Filtros sobre la página actual:
       - #buscador (keyup): filtra por nombre, sin distinguir mayúsculas
       - #orden (change): ordena por id, por nombre o por stats totales (de mayor a menor)
       - el buscador y el orden se tienen que poder combinar

  8. (1p) Al hacer click en una carta, en #detail sale una tabla con todos sus
     stats (una fila por stat, con map + join) y su altura y peso.

  9. (0,5p) Formulario #formBuscar (submit): busca en la API el pokemon por nombre
     (/pokemon/{nombre}) y lo muestra en #detail. Si no existe, en lugar de
     romperse muestra "Pokemon no encontrado".
*/