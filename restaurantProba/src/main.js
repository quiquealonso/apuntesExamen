/*
 * Fer una funció que descarregue restaurants a la que li dius url, pagina i per_page
 * Fer una funció que renderitze un restaurant, alguns tenen imatges
 * Fer la classe restaurant i fer que les dades es transformen en objectes d'eixa classe
 * Fer una funció que renderitze una llista de restaurants
 * Fer un formulari per filtrar restaurants sobre els que estan descarregats
 * Selector per tipus de cuina i buscador en el nom o qualsevol camp de text
 * Sistema de paginació Següent - Anterior
 */

/*
 ==========================================================================
  CÓMO ESTÁ DISEÑADA LA API  →  json-server del profe (restaurants)
 ==========================================================================

  GET https://exemples-dwec.onrender.com/restaurants?_page=1&_limit=25

  PAGINACIÓN (json-server tiene DOS versiones y cambian la respuesta):
    - versión 0.17:  ?_page=1&_limit=25      → devuelve UN ARRAY directo
    - versión 1.x:   ?_page=1&_per_page=25   → devuelve un OBJETO:
                     { first, prev, next, last, pages, items, data: [...] }
    Este servidor ignora _per_page y devuelve todo, así que aquí manda _limit.
    Por eso getRestaurants pide los dos parámetros y mira con
    Array.isArray(data) qué le ha llegado.
    ¿Hay página siguiente?  versión 0.17 → si llegan menos de per_page, no.
                            versión 1.x  → si data.next es null, no.

  CADA ELEMENTO VIENE "ENVUELTO" (lo raro de esta API):
    [
      { restaurant: { name: "...", cuisines: "Asian, Sushi", ... } },   ← ¡envoltorio!
      { restaurant: { ... } },
    ]
    Para llegar a los datos hay que hacer r.restaurant.name, no r.name.
    La clase lo arregla en el constructor: Object.assign(this, dades.restaurant)
    → a partir de ahí ya es restaurant.name directo.

  DENTRO DE CADA RESTAURANTE:
    {
      name: "...",
      cuisines: "Asian, Sushi",          ← ¡UN STRING con comas, no un array!
                                           → split(",").map(c => c.trim())
      featured_image: "url" o "",        ← puede venir vacío: usar ||
      thumb: "url" o "",
      location: { address, city, ... },  ← objeto dentro → restaurant.location.city
      user_rating: {
        aggregate_rating: "4.5",         ← puede venir como TEXTO → parseFloat
        rating_text: "Excellent"
      },
      average_cost_for_two: 50, currency: "$",
      url: "https://zomato..."
    }

  COMPARADO CON LAS OTRAS APIs QUE HAS HECHO
    PokeAPI      → objeto { count, results }; results solo trae url →
                   2 niveles, Promise.all.                     (probapokemons)
    Punk API     → array directo, cada elemento completo.      (probacerveces)
    json-server  → array de { restaurant: {...} } → desenvolver. (ESTE)
    PRIMERA PREGUNTA EN EL EXAMEN: console.log(data) y mira la forma.

 ==========================================================================
  ESQUEMA DEL PROGRAMA
    descargar página (await) → guardar en "restaurants" → filtrar + ordenar
    (funciones que devuelven arrays) → pintar() → eventos que llaman a pintar()
    La paginación aquí es EN LA API: cada página nueva es un fetch nuevo
    (al revés que en pokemons, donde se descargaba todo y se cortaba con slice).
 ==========================================================================
*/


const URL_API = "https://exemples-dwec.onrender.com/restaurants";
const PER_PAGE = 25;

// ---------------------------------------------------------------------------
// CLASE Restaurant: guarda TODOS los datos.
// Object.assign(this, objeto) copia todas las propiedades del objeto al this.
// dades.restaurant ?? dades → si viene envuelto ({ restaurant: {...} }) coge
// lo de dentro; si no (?? = "si es null o undefined"), coge dades tal cual.
// Así, después, se usa restaurant.name y no r.restaurant.name.
// ---------------------------------------------------------------------------
// Classe Restaurant: guarda TOTES les dades (les de dins de "restaurant")
class Restaurant {
  constructor(dades) {
    Object.assign(this, dades.restaurant ?? dades);
  }

  // cuisines es un STRING con comas → split lo parte en array y trim quita
  // los espacios. Si no tiene cocina, devuelve [] para que no pete el .includes.
  // "Asian, Sushi" -> ["Asian", "Sushi"]
  getCuines() {
    return this.cuisines ? this.cuisines.split(",").map((c) => c.trim()) : [];
  }

  // Imagen: la primera que no esté vacía ("" cuenta como falso con ||).
  getImatge() {
    return this.featured_image || this.thumb || "";
  }

  // Para el buscador "en cualquier campo de texto": recorre TODAS las
  // propiedades con Object.values. Si es un string (y no una url) lo guarda;
  // si es un objeto (location, user_rating...) se llama a sí misma para
  // entrar dentro (recursividad). flatMap junta todo en un solo array.
  // Tots els textos de l'objecte (també dins de location, user_rating...) sense URLs
  getTextos(obj = this) {
    return Object.values(obj).flatMap((valor) => {
      if (typeof valor === "string") {
        return valor.startsWith("http") || valor.includes("://") ? [] : [valor];
      }
      if (valor && typeof valor === "object") return this.getTextos(valor);
      return [];
    });
  }
}

// ---------------------------------------------------------------------------
// DESCARGAR UNA PÁGINA. Se piden _per_page y _limit para que funcione con las
// dos versiones de json-server, y con Array.isArray se ve cuál ha respondido.
// response.ok false → throw (el error lo vería quien la llama).
// DEVUELVE { restaurants: [objetos Restaurant], hiHaSeguent: true/false }
// ---------------------------------------------------------------------------
// Descarregar restaurants: url, pagina i per_page
async function getRestaurants(url, pagina, per_page) {
  const response = await fetch(`${url}?_page=${pagina}&_per_page=${per_page}&_limit=${per_page}`);
  if (!response.ok) {
    throw new Error("Failed to fetch restaurants");
  }
  const data = await response.json();
  // json-server 1.x torna {data, next, prev...}, la 0.17 torna un array
  const llista = Array.isArray(data) ? data : data.data;
  return {
    restaurants: llista.map((r) => new Restaurant(r)),
    hiHaSeguent: Array.isArray(data) ? llista.length === per_page : data.next !== null,
  };
}

// ---------------------------------------------------------------------------
// PINTAR UNO: devuelve un div.card. Imagen solo si existe (ternario).
// Datos anidados con punto: restaurant.location.city,
// restaurant.user_rating.aggregate_rating
// ---------------------------------------------------------------------------
// Renderitzar un restaurant
function renderRestaurant(restaurant) {
  const imatge = restaurant.getImatge();
  const plantilla = `
    <h2>${restaurant.name}</h2>
    ${imatge ? `<img src="${imatge}" alt="${restaurant.name}" width="200">` : ""}
    <p><b>Cuina:</b> ${restaurant.cuisines}</p>
    <p><b>Adreça:</b> ${restaurant.location.address}</p>
    <p><b>Ciutat:</b> ${restaurant.location.city}</p>
    <p><b>Valoració:</b> ${restaurant.user_rating.aggregate_rating} (${restaurant.user_rating.rating_text})</p>
    <p><b>Preu per a dos:</b> ${restaurant.average_cost_for_two} ${restaurant.currency}</p>
    <a href="${restaurant.url}" target="_blank">Veure a Zomato</a>
  `;
  const div = document.createElement("div");
  div.classList.add("card");
  div.innerHTML = plantilla;
  return div;
}

// Array de restaurantes → array de divs (no toca el DOM).
// Renderitzar una llista de restaurants
function renderRestaurants(restaurants) {
  return restaurants.map(renderRestaurant);
}

// TIPOS ÚNICOS: flatMap junta los arrays de cocinas de todos en uno solo,
// Set quita repetidos, [... ] vuelve a array y sort los pone por orden.
// Tipus de cuina únics dels restaurants descarregats
function getTipusCuina(restaurants) {
  return [...new Set(restaurants.flatMap((r) => r.getCuines()))].sort();
}

// Options del select con map + join('') (va dentro de un innerHTML).
// La primera, con value "", significa "todos".
function renderOpcions(tipus) {
  return `<option value="">Tots els tipus de cuina</option>
    ${tipus.map((t) => `<option value="${t}">${t}</option>`).join("")}`;
}

// ---------------------------------------------------------------------------
// FILTRAR por los dos a la vez: dos filter seguidos.
//  1) tipo: si es "" pasan todos (tipus === "" es true); si no, el que lo incluya.
//  2) texto: some → basta con que UNO de sus textos contenga lo buscado.
// ---------------------------------------------------------------------------
// Filtrar per tipus de cuina i per text en qualsevol camp
function filterRestaurants(restaurants, tipus, text) {
  return restaurants
    .filter((r) => tipus === "" || r.getCuines().includes(tipus))
    .filter((r) => r.getTextos().some((t) => t.toLowerCase().includes(text.toLowerCase())));
}


// ===========================================================================
// FUNCIONES NUEVAS (refuerzo para el examen)
// ===========================================================================

// La valoración viene dentro de user_rating y puede llegar como texto
// ("4.5"), así que se pasa a número con parseFloat. Si no es un número
// (NaN), cuenta como 0. Se usa para ordenar y para las estadísticas.
function getValoracio(restaurant) {
  return parseFloat(restaurant.user_rating.aggregate_rating) || 0;
}

// ---------------------------------------------------------------------------
// ORDENAR por el criterio del select #ordre. [...] = copia (sort modifica).
//   "valoracio" → de mayor a menor  (b - a)
//   "preu"      → de menor a mayor  (a - b)
//   "nom"       → alfabético con ? 1 : -1 (los textos no se pueden restar)
//   ""          → sin ordenar, tal como vienen de la API
// ---------------------------------------------------------------------------
function sortRestaurants(restaurants, criteri) {
  const copia = [...restaurants];
  if (criteri === "valoracio") {
    return copia.sort((a, b) => getValoracio(b) - getValoracio(a));
  }
  if (criteri === "preu") {
    return copia.sort((a, b) => a.average_cost_for_two - b.average_cost_for_two);
  }
  if (criteri === "nom") {
    return copia.sort((a, b) => (a.name > b.name ? 1 : -1));
  }
  return copia;
}

// ---------------------------------------------------------------------------
// ESTADÍSTICAS con reduce sobre un dato ANIDADO.
//   media = suma de todas las valoraciones / cuántos hay
//   el mejor = reduce que se va quedando con el de más valoración
//              (compara el acumulado "millor" con el actual "r")
// ---------------------------------------------------------------------------
function getMitjanaValoracio(restaurants) {
  if (restaurants.length === 0) return 0;
  const suma = restaurants.reduce((total, r) => total + getValoracio(r), 0);
  return suma / restaurants.length;
}

function getMillor(restaurants) {
  return restaurants.reduce((millor, r) => (getValoracio(r) > getValoracio(millor) ? r : millor));
}

function renderStats(restaurants) {
  const div = document.createElement("div");
  div.innerHTML = restaurants.length === 0
    ? `<p>No hi ha restaurants</p>`
    : `<p><b>${restaurants.length} restaurants</b> ·
         Valoració mitjana: ${getMitjanaValoracio(restaurants).toFixed(2)} ·
         Millor: ${getMillor(restaurants).name} (${getValoracio(getMillor(restaurants))})</p>`;
  return div;
}

// ===========================================================================
// MAIN
// ===========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.querySelector("#container");
  const form = document.querySelector("#formFiltre");
  const selectTipus = document.querySelector("#tipus");
  const buscador = document.querySelector("#buscador");
  const anterior = document.querySelector("#anterior");
  const seguent = document.querySelector("#seguent");
  const numPagina = document.querySelector("#numPagina");
  const selectOrdre = document.querySelector("#ordre");
  const stats = document.querySelector("#stats");

  // ESTADO: la página que se ve y los restaurantes descargados de esa página.
  let pagina = 1;
  let restaurants = [];

  // pintar(): NO descarga nada. Filtra + ordena lo que ya hay en
  // "restaurants" leyendo los valores del formulario, y lo pinta.
  // Las estadísticas se calculan sobre los filtrados.
  function pintar() {
    const filtrats = filterRestaurants(restaurants, selectTipus.value, buscador.value);
    const ordenats = sortRestaurants(filtrats, selectOrdre.value);
    container.innerHTML = "";
    container.append(...renderRestaurants(ordenats));
    stats.innerHTML = "";
    stats.append(renderStats(filtrats));
  }

  // carregarPagina(): SÍ descarga (fetch de la página actual), rehace el
  // select de tipos con los de esta página (y conserva el que estaba elegido),
  // activa/desactiva los botones y llama a pintar().
  async function carregarPagina() {
    const data = await getRestaurants(URL_API, pagina, PER_PAGE);
    restaurants = data.restaurants;
    console.log(restaurants);

    const tipusActual = selectTipus.value;
    selectTipus.innerHTML = renderOpcions(getTipusCuina(restaurants));
    selectTipus.value = tipusActual;

    numPagina.innerText = pagina;
    anterior.disabled = pagina === 1;
    seguent.disabled = !data.hiHaSeguent;
    pintar();
  }

  form.addEventListener("submit", (e) => e.preventDefault());
  buscador.addEventListener("keyup", pintar);
  selectTipus.addEventListener("change", pintar);
  selectOrdre.addEventListener("change", pintar);
  // Filtros y orden → solo pintar(). Cambiar de página → carregarPagina(),
  // porque hace falta un fetch nuevo.

  anterior.addEventListener("click", () => {
    if (pagina > 1) {
      pagina--;
      carregarPagina();
    }
  });

  seguent.addEventListener("click", () => {
    pagina++;
    carregarPagina();
  });

  carregarPagina();
});