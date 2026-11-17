/*
 * Fer una funció que descarregue restaurants a la que li dius url, pagina i per_page
 * Fer una funció que renderitze un restaurant, alguns tenen imatges
 * Fer la classe restaurant i fer que les dades es transformen en objectes d'eixa classe
 * Fer una funció que renderitze una llista de restaurants
 * Fer un formulari per filtrar restaurants sobre els que estan descarregats
 * Selector per tipus de cuina i buscador en el nom o qualsevol camp de text
 * Sistema de paginació Següent - Anterior
 */

const URL_API = "https://exemples-dwec.onrender.com/restaurants";
const PER_PAGE = 25;

// Classe Restaurant: guarda TOTES les dades (les de dins de "restaurant")
class Restaurant {
  constructor(dades) {
    Object.assign(this, dades.restaurant ?? dades);
  }

  // "Asian, Sushi" -> ["Asian", "Sushi"]
  getCuines() {
    return this.cuisines ? this.cuisines.split(",").map((c) => c.trim()) : [];
  }

  getImatge() {
    return this.featured_image || this.thumb || "";
  }

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

// Renderitzar una llista de restaurants
function renderRestaurants(restaurants) {
  return restaurants.map(renderRestaurant);
}

// Tipus de cuina únics dels restaurants descarregats
function getTipusCuina(restaurants) {
  return [...new Set(restaurants.flatMap((r) => r.getCuines()))].sort();
}

function renderOpcions(tipus) {
  return `<option value="">Tots els tipus de cuina</option>
    ${tipus.map((t) => `<option value="${t}">${t}</option>`).join("")}`;
}

// Filtrar per tipus de cuina i per text en qualsevol camp
function filterRestaurants(restaurants, tipus, text) {
  return restaurants
    .filter((r) => tipus === "" || r.getCuines().includes(tipus))
    .filter((r) => r.getTextos().some((t) => t.toLowerCase().includes(text.toLowerCase())));
}

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.querySelector("#container");
  const form = document.querySelector("#formFiltre");
  const selectTipus = document.querySelector("#tipus");
  const buscador = document.querySelector("#buscador");
  const anterior = document.querySelector("#anterior");
  const seguent = document.querySelector("#seguent");
  const numPagina = document.querySelector("#numPagina");

  let pagina = 1;
  let restaurants = [];

  function pintar() {
    const filtrats = filterRestaurants(restaurants, selectTipus.value, buscador.value);
    container.innerHTML = "";
    container.append(...renderRestaurants(filtrats));
  }

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