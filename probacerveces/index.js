import { beers } from "./beers.js";
export { generateDivsBeers, addDivs, sortBy };  

function generateDivsBeers(beers){
    //recorre cada cervez y genera un div con la información de la cerveza
    return beers.map(beer => {
        const divBeer = document.createElement('div');
        divBeer.classList.add('col');
        divBeer.innerHTML = `
        <h2>${beer.name}</h2>
        <h3>${beer.tagline}</h3>
        <p>${beer.description}</p>
        <ul>
        <li>ABV: ${beer.abv}</li>
        <li>IBU: ${beer.ibu}</li>
        <li>EBC: ${beer.ebc}</li>
        <li>PH: ${beer.ph}</li>
        <button>25 Similar</button>
        </ul>
        `;

        // 6  (esto es del último punto)
        divBeer.querySelector('button').addEventListener('click',()=>{
            let similar = findSimilarBeers(beer,beers);
            const container = document.querySelector('#container');
            container.innerHTML = '';
            addDivs(container,generateDivsBeers(similar));
        });

        return divBeer;
    });
}

function addDivs(container,arrayDivs){
    container.append(...arrayDivs);
}

function sortBy(comparationFunction, array) {
    return [...array].sort(comparationFunction);
}

function compareBeers(beer1, beer2) {
    const caracteristicas = ['abv', 'ibu', 'ebc', 'ph'];
    return caracteristicas.reduce((suma, carac) => {
        return suma + Math.abs(beer1[carac] - beer2[carac]);
    }, 0);
}

function findSimilarBeers(beer, array) {
    let beersComparate = array.map(b => {
        return { id: b.id, similar: compareBeers(b, beer) }
    });
    let beersComparateSorted = sortBy((a, b) => a.similar > b.similar ? 1 : -1, beersComparate);
    let similarBeers = beersComparateSorted.map(b => array.find(B => B.id === b.id)).slice(0, 25);
    return similarBeers;
}
document.addEventListener('DOMContentLoaded',()=>{
    const container = document.querySelector('#container');
    //se li pasa el element del conetnidor, i la funcio que genera el array de divs de les cerveses
    addDivs(container,generateDivsBeers(beers));
    //clavarli listener al dic, i en el event click, agafar el id del element que ha fet click i agafar la primera part
   document.querySelector('#botons').addEventListener('click', e => {
    const prop = e.target.id.split('_')[0];
    const sorted = sortBy((a, b) => b[prop] - a[prop], beers);
    container.innerHTML = '';                         
    //vaciar las cervezas que hay, y añadir las que estan ordenadas
    addDivs(container, generateDivsBeers(sorted));
});
});