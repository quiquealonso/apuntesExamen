// Fer una funció que descarregue restaurants a la que li dius url, pagina i per_page


// Descarga UNA página de restaurantes de la API.
// - Monta la URL con parámetros de consulta: ?_page=2&_limit=25
//   (_page y _limit son los parámetros de paginación que entiende json-server).
// - El primer await (el de dentro) espera la respuesta del fetch.
// - El segundo await espera a que .json() convierta el cuerpo en un array de JS.
// - Devuelve ese array con los datos "en crudo".
async function getRestaurante(url, pagina, per_page){
    return await
        (await
            fetch(`${url}?_page=${pagina}&_limit=${per_page}`))
            .json();
}

// URL base de la API de restaurantes
const url = 'https://exemples-dwec.onrender.com/restaurants'



// Fer la classe restaurant i fer que les dades es transformen en objectes d'eixa classe


// Clase modelo de un restaurante.
class Restaurant {
  // Copia cada campo del objeto que llega de la API a propiedades de la instancia.
  constructor(data) {
    this.R = data.R;
    this.apikey = data.apikey;
    this.id = data.id;
    this.name = data.name;
    this.url = data.url;
    this.location = data.location;
    this.switch_to_order_menu = data.switch_to_order_menu;
    this.cuisines = data.cuisines;
    this.average_cost_for_two = data.average_cost_for_two;
    this.price_range = data.price_range;
    this.currency = data.currency;
    this.offers = data.offers;
    this.thumb = data.thumb;
    this.user_rating = data.user_rating;
    this.photos_url = data.photos_url;
    this.menu_url = data.menu_url;
    this.featured_image = data.featured_image;
    this.has_online_delivery = data.has_online_delivery;
    this.is_delivering_now = data.is_delivering_now;
    this.deeplink = data.deeplink;
    this.has_table_booking = data.has_table_booking;
    this.events_url = data.events_url;
    this.establishment_types = data.establishment_types;
  }

  // "cuisines" llega como texto: "Italian, Pizza, Cafe".
  // Lo convierte en array separando por ", " -> ["Italian", "Pizza", "Cafe"].
  // Si no hay cocinas, devuelve un array vacío.
  getCuisines() {
    return this.cuisines ? this.cuisines.split(", ") : [];
  }

  // Junta en un solo texto (en minúsculas) nombre, cocinas, dirección, ciudad,
  // zona y valoración. Así el buscador solo tiene que comprobar si la palabra
  // escrita aparece dentro de este texto.
  getTextoBusqueda() {
    return `${this.name} ${this.cuisines} ${this.location.address} ${this.location.city} ${this.location.locality} ${this.user_rating.rating_text}`.toLowerCase();
  }
}


// Convierte los datos crudos de la API en objetos Restaurant.
// La API devuelve cada elemento envuelto así: { restaurant: {...} },
// por eso se usa dato.restaurant.
// Con .map crea un new Restaurant(...) por cada elemento y devuelve el array nuevo.
function convertirRestaurantes(datos) {
  return datos.map((dato) => new Restaurant(dato.restaurant));
}



// Fer una funció que renderitze un restaurant, alguns tenen imatges


// Crea el elemento HTML (tarjeta) de UN restaurante.
function renderRestaurante(restaurante) {
  // Escoge la imagen: primero featured_image y, si no hay, thumb.
  // Si no hay ninguna, "imagen" queda vacía.
  const imagen = restaurante.featured_image || restaurante.thumb;

  // Template string con el HTML de la tarjeta.
  // Si no hay imagen, el ternario pone "" y la tarjeta sale sin <img>.
  const restauranteTemplate = `<div class="restaurante-card">
  ${imagen ? `<img src="${imagen}" alt="${restaurante.name}">` : ""}
  <div class="restaurante-header">
    <span class="restaurante-name">${restaurante.name}</span>
    <span class="restaurante-rating">⭐ ${restaurante.user_rating.aggregate_rating} (${restaurante.user_rating.rating_text})</span>
  </div>
  <p class="restaurante-cuisines">${restaurante.cuisines}</p>
  <p class="restaurante-location">${restaurante.location.address}</p>
  <p class="restaurante-cost">Precio para dos: ${restaurante.average_cost_for_two} ${restaurante.currency}</p>
  <a href="${restaurante.url}" target="_blank">Ver en Zomato</a>
</div>`;

  // Truco del div auxiliar: se mete el HTML en un div temporal con innerHTML
  // y se devuelve su primer hijo. El resultado es un NODO del DOM de verdad
  // (no un string), y así se puede usar con append.
  const divAux = document.createElement("div");
  divAux.innerHTML = restauranteTemplate;
  return divAux.firstElementChild;
}



// Fer una funció que renderitze una llista de restaurants


// Pinta TODA la lista de restaurantes dentro del contenedor.
function renderListaRestaurantes(restaurantes, contenedor) {
  // Primero vacía el contenedor
  contenedor.innerHTML = "";

  // Si no hay restaurantes, muestra un mensaje y sale de la función
  if (restaurantes.length === 0) {
    contenedor.innerHTML = "<p>No hay restaurantes que coincidan.</p>";
    return;
  }

  // Si hay, crea la tarjeta de cada uno y la añade al contenedor
  restaurantes.forEach((restaurante) => {
    contenedor.append(renderRestaurante(restaurante));
  });
}



// Fer un formulari per filtrar restaurants sobre els que estan descarregats


// Rellena el <select> con todas las cocinas distintas de los restaurantes.
function rellenarSelectCocinas(restaurantes, select) {
  // Un Set no admite repetidos: cada cocina aparecerá una sola vez
  const cocinas = new Set();
  restaurantes.forEach((restaurante) => {
    restaurante.getCuisines().forEach((cocina) => cocinas.add(cocina));
  });

  // Primera opción: "Todas las cocinas" con value vacío (= sin filtro)
  select.innerHTML = `<option value="">Todas las cocinas</option>`;
  // Convierte el Set en array, lo ordena alfabéticamente y añade un <option> por cocina
  [...cocinas].sort().forEach((cocina) => {
    select.innerHTML += `<option value="${cocina}">${cocina}</option>`;
  });
}


// Aplica los dos filtros, uno detrás de otro. Devuelve un array nuevo
// (no modifica el original).
function filtrarRestaurantes(restaurantes, cocina, texto) {
  return restaurantes
    // 1. Por cocina: si es "" (todas) deja pasar todo; si no, solo los que la incluyen
    .filter((restaurante) => cocina === "" || restaurante.getCuisines().includes(cocina))
    // 2. Por texto: solo los que contienen lo escrito (en minúsculas, así no
    //    distingue mayúsculas de minúsculas)
    .filter((restaurante) => restaurante.getTextoBusqueda().includes(texto.toLowerCase()));
}



// Fer un sistema de paginació Següent - Anterior
// Fer una web que mostre, filtre i navegue pels restaurants de la API


// Programa principal: se ejecuta cuando el HTML ya está cargado.
document.addEventListener("DOMContentLoaded", async () => {

    // Referencias a los elementos del DOM
    const contenedor = document.querySelector("#restaurante");
    const selectCocina = document.querySelector("#cocina");
    const inputBuscar = document.querySelector("#buscar");
    const botonAnterior = document.querySelector("#anterior");
    const botonSiguiente = document.querySelector("#siguiente");
    const spanPagina = document.querySelector("#pagina");

    // Restaurantes por página y página en la que estamos
    const per_page = 25;
    let paginaActual = 1;

    // Guardem les pàgines ja descarregades per no tornar a demanar-les
    // Caché: clave = número de página, valor = array de Restaurant
    const RestaurantesMap = new Map();
    // Restaurantes de la página que se está viendo ahora
    let restaurantes = [];

    // Filtra los restaurantes actuales según el select y el buscador, y los pinta.
    // Se llama cada vez que cambia un filtro.
    function mostrar() {
      const filtrados = filtrarRestaurantes(restaurantes, selectCocina.value, inputBuscar.value);
      renderListaRestaurantes(filtrados, contenedor);
    }

    // Carga una página (de la caché o de la API) y actualiza toda la interfaz.
    async function cargarPagina(pagina) {
      // 1. Mensaje mientras se descarga
      contenedor.innerHTML = "<p>Cargando...</p>";

      // 2. Si la página no está en la caché, se descarga, se convierte
      //    en objetos Restaurant y se guarda
      if (!RestaurantesMap.has(pagina)) {
        const datos = await getRestaurante(url, pagina, per_page);
        RestaurantesMap.set(pagina, convertirRestaurantes(datos));
      }

      // 3. La página pasa a ser la actual
      restaurantes = RestaurantesMap.get(pagina);
      console.log(restaurantes);

      // 4. Actualiza el texto "Página X"
      spanPagina.textContent = `Página ${pagina}`;
      // 5. "Anterior" desactivado en la página 1.
      //    "Siguiente" desactivado si llegan menos de 25 (= última página).
      botonAnterior.disabled = pagina === 1;
      botonSiguiente.disabled = restaurantes.length < per_page;

      // 6. Reinicia los filtros, rellena el select con las cocinas de esta
      //    página y pinta los restaurantes
      selectCocina.value = "";
      inputBuscar.value = "";
      rellenarSelectCocinas(restaurantes, selectCocina);
      mostrar();
    }

    // Filtrado en tiempo real: al cambiar el select o al escribir en el buscador
    selectCocina.addEventListener("change", mostrar);
    inputBuscar.addEventListener("input", mostrar);

    // Botón Anterior: resta 1 a la página y la carga
    botonAnterior.addEventListener("click", () => {
      paginaActual--;
      cargarPagina(paginaActual);
    });

    // Botón Siguiente: suma 1 a la página y la carga
    botonSiguiente.addEventListener("click", () => {
      paginaActual++;
      cargarPagina(paginaActual);
    });

    // Al abrir la web, carga la primera página
    await cargarPagina(paginaActual);

});
