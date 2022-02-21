const APP = {
  DB: null, //the indexedDB
  input: "",
  results: [],
  isONLINE: "onLine" in navigator && navigator.onLine,
  tmdbBASEURL: "https://api.themoviedb.org/3/",
  tmdbAPIKEY: "527917a705e7338ceca3903f95d79899",
  tmdbIMAGEBASEURL: "http://image.tmdb.org/t/p/w500",

  init: () => {
    //open the database
    //register the service worker after the DB is open
    APP.openDatabase(APP.registerSW);
  },

  registerSW: () => {
    //register the service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(function (error) {
        // Something went wrong during registration. The sw.js file
        // might be unavailable or contain a syntax error.
        console.warn(error);
      });
      navigator.serviceWorker.ready.then((registration) => {
        // .ready will never reject... just wait indefinitely
        registration.active;
        //save the reference to use later or use .ready again
      });
    }
    //then add listeners and run page specific code
    APP.pageSpecific();
    APP.addListeners();
  },

  openDatabase: (nextStep) => {
    //open the database
    let version = 1;
    let dbOpenRequest = indexedDB.open("movieDB", version);

    //add the update, error, success listeners in here
    dbOpenRequest.onupgradeneeded = function (ev) {
      APP.DB = ev.target.result;
      try {
        APP.DB.deleteObjectStore("searchResults");
        APP.DB.deleteObjectStore("suggestResults");
      } catch {
        console.log("Can't delete the database, nothing in the database.");
      }

      //create searchStore with keyword as keyPath
      APP.DB.createObjectStore("searchResults", {
        keyPath: "keyword",
        autoIncrement: false,
      });

      //create suggestStore with movieid as keyPath
      APP.DB.createObjectStore("suggestResults", {
        keyPath: "movieid",
        autoIncrement: false,
      });
    };

    //call nextStep onsuccess
    dbOpenRequest.onsuccess = function (ev) {
      APP.DB = dbOpenRequest.result;
      console.log(`${APP.DB.name} is ready to be used!`);
      nextStep();
    };
  },

  createTransaction: (storeName) => {
    //create a transaction to use for some interaction with the database
    let tx = APP.DB.transaction(storeName, "readwrite");
    return tx;
  },

  addResultsToDB: (obj, storeName) => {
    //pass in the name of the store
    //save the obj passed in to the appropriate store
    let tx = APP.createTransaction(storeName);
    let newStore = tx.objectStore(storeName);
    let newMoviesObj = {
      keyword: APP.input,
      result: obj,
    };
    newStore.add(newMoviesObj);
  },

  addListeners: () => {
    let btnSearch = document.getElementById("btnSearch");
    btnSearch.addEventListener("click", APP.searchFormSubmitted);

    window.addEventListener("online", APP.changeStatus);
    window.addEventListener("offline", APP.changeStatus);
  },

  pageSpecific: () => {
    //anything that happens specifically on each page
    if (document.body.id === "home") {
      //on the home page
    }
    if (document.body.id === "results") {
      //on the results page
      console.log("on the results page");

      let url = new URL(document.location).searchParams;
      APP.input = url.get("keyword");
      APP.getSearchResults(APP.input);

      //listener for clicking on the movie card container
      let movieCard = document.getElementById("id");
      movieCard.addEventListener("click", APP.cardListClicked);
    }

    if (document.body.id === "suggest") {
      //on the suggest page
      console.log("on the suggest page");

      //listener for clicking on the movie card container
      let movieCard = document.getElementById("id");
      movieCard.addEventListener("click", APP.cardListClicked);
    }
    if (document.body.id === "fourohfour") {
      //on the 404 page
    }
  },

  changeOnlineStatus: (ev) => {
    //when the browser goes online or offline
  },

  searchFormSubmitted: (ev) => {
    ev.preventDefault();
    //get the keyword from the input
    APP.input = document.getElementById("search").value.toLowerCase();
    //check if the keyword valid, if yes navigate to the results page
    if (!APP.input) {
      alert("Empty input, please try it again.");
    } else {
      APP.navigate(`/results.html?keyword=${APP.input}`);
    }
  },

  cardListClicked: (ev) => {
    //user clicked on a movie card
    //get the title and movie id
    //check the db for matches
    //do a fetch for the suggest results
    //save results to db
    //build a url
    //navigate to the suggest page
  },

  getData: (endpoint) => {
    let url = `${APP.tmdbBASEURL}search/movie?api_key=${APP.tmdbAPIKEY}&query=${endpoint}`;
    fetch(url)
      .then((resp) => {
        if (resp.status >= 400) {
          throw new NetworkError(
            `Failed fetch to ${url}`,
            resp.status,
            resp.statusText
          );
        }
        return resp.json();
      })
      .then((contents) => {
        APP.results = contents.results;
        APP.addResultsToDB(APP.results, "searchResults");
        APP.displayCards(APP.results);
      })
      .catch((err) => {
        //handle the NetworkError
        alert(`Error: ${err.name} ${err.message}`);
      });
  },

  checkDBResults: (storeName, keyValue) => {
    let tx = APP.createTransaction(storeName);
    let store = tx.objectStore(storeName);
    let getResult = store.get(keyValue);

    getResult.onsuccess = function (ev) {
      //check the db for matches
      if (ev.target.result === undefined) {
        //do a fetch call for search results
        console.log("Fetching results from API.");
        APP.getData(keyValue);
      } else {
        //save results to db
        //navigate to url
        console.log("Results already in the db, the results are from db");
        APP.results = ev.target.result.result;
        APP.displayCards(APP.results);
      }
    };
  },

  getSearchResults: (keyValue) => {
    APP.checkDBResults("searchResults", keyValue);
  },

  displayCards: (movies) => {
    //display all the movie cards based on the results array
    let image;
    let ol = document.getElementById("ol");
    console.log(movies);
    movies.forEach((movie) => {
      // check if the poster exist or not
      if (movie.poster_path === null) {
        image = "./img/imageNotFound.png";
      } else {
        image = `${APP.tmdbIMAGEBASEURL}${movie.poster_path}`;
      }

      // check if the overview exist or not
      if (movie.overview === "") {
        movie.overview = "Sorry, no description data";
      } else {
        movie.overview = `${movie.overview}`;
      }

      // check if the release data exist or not
      if (movie.release_date === "") {
        movie.release_date = "Sorry, no release date data";
      } else {
        movie.release_date = `${movie.release_date}`;
      }

      // build movie cards
      let li = document.createElement("li");
      li.innerHTML = `
      <div class="card card-sizing">
      <img src="${image}" class="card-img-top" alt="${movie.title}">
      <div class="card-body d-flex flex-column">
      <h5 class="card-title">${movie.title}</h5>
      <p class="card-text">Release Date:<br>${movie.release_date}</p> 
      <p class="card-text">Popularity:<br>${movie.popularity.toFixed(2)}</p>
      </div>
      </div>`;

      ol.append(li);
    });
  },

  navigate: (url) => {
    //change the current page
    window.location = url; //this should include the querystring
  },
};

document.addEventListener("DOMContentLoaded", APP.init());
