/*class Restaurant {
  constructor(restarantRaw){
    Object.assign(this.restarantRaw.restaurant);
  }
}*/
//la clave per al filtro es que no estiga en el mateix element que es va a recarregar, vaya, es de caixó
async function getRestaurants(url, pagina, per_page){
  const restaurantsObjc = await fetch (`${url}?_page=${pagina}&_limit=${per_page}`)
  const restaurants = await restaurantsObjc.json()
  //const restaurantClass = restaurants.map(r => new Restaurant(r))
  return restaurants
}



function renderRestaurant(restaurant){
  console.log(restaurant)
  const divRest = document.createElement('div');
  divRest.innerHTML = `
  <h1>${restaurant.name}</h1>
  <h2>${restaurant.cuisines}</h2>
  <img src=${restaurant.thumb} alt="noimage">
  `
  return divRest
}

function renderRestaurants(resturants){
  return resturants.map(r => renderRestaurant(r.restaurant))
}

function generateSelectCuina(restaurants){
  const selectCuina = document.createElement('select');

  // 1) sacar los tipos sin repetir
  const tipus = [...new Set(restaurants.map(r => r.restaurant["cuisines"]))];

  const options = tipus.map(t => {
      const option = document.createElement('option')
      option.value = t
      option.textContent = t
      return option       
  })
   // 3) la opción "Totes", con value vacío
  const totes = document.createElement('option')
  totes.value = ""
  totes.textContent = "Totes"

  selectCuina.append(totes, ...options)
  return selectCuina
}
/*function getRestaurantsCocina(restaurants, cusines){
  return restaurants.filter(r => (r.restaurant["cuisines"] === cusines))
}*/

function getRestaurantsCocina(restaurants, cusines){
  return restaurants.filter(r => cusines === "" || r.restaurant["cuisines"] === cusines)
}

function addDivs(container,arrayDivs){
    container.append(...arrayDivs);
}

function getRestaurantsNom(restaurants, nom){
  return restaurants.filter(r => r.restaurant["name"].toLowerCase().includes(nom.toLowerCase()))
}

function getPagina(restaurants, pagina, perPagina){
  return restaurants.slice(pagina * perPagina, (pagina + 1) * perPagina)
}

document.addEventListener('DOMContentLoaded', async () => {

//console.log(await getRestaurants("https://exemples-dwec.onrender.com/restaurants", 1, 50 ))
const restaurants = await getRestaurants("https://exemples-dwec.onrender.com/restaurants", 1, 50 )
console.log(restaurants)
const container = document.querySelector('#app');
const form = document.querySelector('#formFiltre')
const buscador = document.querySelector('#buscador');

form.addEventListener('submit', (e) => {
  e.preventDefault();
});

const select = generateSelectCuina(restaurants);
form.append(select) 
//console.log(select)

const anterior = document.querySelector('#anterior');
const seguent = document.querySelector('#seguent');
const numPagina = document.querySelector('#numPagina');

const PER_PAGINA = 10;
let pagina = 0;
let actuals = restaurants;   // la lista que toca mostrar (filtrada o no)

function pintar(){
  container.innerHTML = '';
  addDivs(container, renderRestaurants(getPagina(actuals, pagina, PER_PAGINA)));
  const totalPagines = Math.ceil(actuals.length / PER_PAGINA);
  numPagina.innerText = `${pagina + 1} / ${totalPagines}`;
  anterior.disabled = pagina === 0;
  seguent.disabled = pagina + 1 >= totalPagines;
}

select.addEventListener('change', () => {
  actuals = getRestaurantsCocina(restaurants, select.value);
  pagina = 0;
  pintar();
});

buscador.addEventListener('keyup', () => {
  actuals = getRestaurantsNom(restaurants, buscador.value);
  pagina = 0;
  pintar();
});



anterior.addEventListener('click', () => {
  pagina--;
  pintar();
});

seguent.addEventListener('click', () => {
  pagina++;
  pintar();
});

pintar();   // en lugar de tu addDivs(container, renderRestaurants(restaurants)) inicial


});