const APP = {
  DB: null, //the indexedDB
  isONLINE: "onLine" in navigator && navigator.onLine,
  tmdbBASEURL: "https://api.themoviedb.org/3/",
  tmdbAPIKEY: "527917a705e7338ceca3903f95d79899",
  tmdbIMAGEBASEURL: "http://image.tmdb.org/t/p/w500",
  input: "",
  results: [],
  init: () => {
    //when the page loads
    //open the database
    APP.openDatabase(APP.registerSW); //register the service worker after the DB is open
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
        console.log("Can't delete the database.");
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
    };

    nextStep();
  },

  createTransaction: (storeName) => {
    //create a transaction to use for some interaction with the database
    let tx = APP.DB.transaction(storeName, "readwrite");
    return tx;
  },

  getDBResults: (storeName, keyValue) => {
    //return the results from storeName where it matches keyValue
    let tx = APP.DB.transaction(storeName);
    let db = tx.objectStore(storeName);
    let dbResult = db.get(keyValue);

    dbResult.onsuccess = function (ev) {
      let results = ev.target.result;
      APP.results = results;
    };
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
      //listener for clicking on the movie card container
    }
    if (document.body.id === "suggest") {
      //on the suggest page
      //listener for clicking on the movie card container
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

    //check if input is valid
    if (!APP.input) {
      alert("Empty input, please try it again.");
    } else {
      let searchResult = APP.createTransaction("searchResults");
      let searchStore = searchResult.objectStore("searchResults");
      let getResult = searchStore.get(APP.input);

      getResult.onsuccess = (ev) => {
        //check the db for matches
        if (ev.target.result === undefined) {
          //do a fetch call for search results
          console.log("Fetching results from API.");
          APP.getData(APP.input);
          APP.displayCards(APP.results);
        } else {
          //save results to db
          //navigate to url
          console.log("Results already in the db, the results are from db");
          APP.getDBResults("searchResults", APP.input);
          APP.displayCards(APP.results);
        }
      };
    }
  },

  cardListClicked: (ev) => {
    // user clicked on a movie card
    //get the title and movie id
    //check the db for matches
    //do a fetch for the suggest results
    //save results to db
    //build a url
    //navigate to the suggest page
  },

  getData: (endpoint) => {
    //do a fetch call to the endpoint
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
        //save the updated results to APP.results
        //remove the properties we don't need
        let results = contents.results;
        APP.results = results;
        APP.addResultsToDB(APP.results, "searchResults");
      })
      .catch((err) => {
        //handle the NetworkError
        alert(`Error: ${err.name} ${err.message}`);
      });
  },

  displayCards: (movies) => {
    //display all the movie cards based on the results array
    let image;
    let ol = document.getElementById("ol");

    movies.forEach((movie) => {
      // check if the poster exist or not
      if (movie.poster_path === null) {
        image = "./img/imageNotFound.png";
      } else {
        image = `${APP.tmdbIMAGEBASEURL}${movie.poster_path}`;
      }

      // check if the overview exist or not
      if (movie.overview === "") {
        movie.overview = "Sorry, this movie has no description available.";
      } else {
        movie.overview = `${movie.overview}`;
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

APP.init();
