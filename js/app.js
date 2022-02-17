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
    let tx;
    //create a transaction to use for some interaction with the database
    tx = APP.DB.transaction(storeName, "readwrite");
    return tx;
  },

  getDBResults: (storeName, keyValue) => {
    //return the results from storeName where it matches keyValue
  },

  addResultsToDB: (obj, storeName) => {
    //pass in the name of the store
    //save the obj passed in to the appropriate store
    let tx;
    tx = APP.createTransaction(storeName);
    let newStore = tx.objectStore(storeName);

    let newMoviesObj = {
      keyword: APP.input,
      result: obj,
    };

    newStore.add(newMoviesObj);
  },

  addListeners: () => {
    //add listeners
    let btnSearch = document.getElementById("btnSearch");
    btnSearch.addEventListener("click", APP.searchFormSubmitted);
    //when the search form is submitted
    //when clicking on the list of possible searches on home or 404 page
    //when a message is received
    //when online and offline

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

  messageReceived: (ev) => {
    //ev.data
  },

  sendMessage: (msg) => {
    //send a message to the service worker
  },

  searchFormSubmitted: (ev) => {
    ev.preventDefault();
    //get the keyword from teh input
    APP.input = document.getElementById("search").value;

    //make sure it is not empty
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
          APP.getData(APP.input);
        } else {
          //save results to db
          //navigate to url
          console.log("Results already in the Database");
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
        console.log(APP.results);
      })
      .catch((err) => {
        //handle the NetworkError
        alert(`Error: ${err.name} ${err.message}`);
      });
  },

  getSearchResults: (keyword) => {
    //check if online
    //check in DB for match of keyword in searchStore
    //if no match in DB do a fetch
    // APP.displayCards is the callback
  },

  getSuggestedResults: (movieid) => {
    //check if online
    //check in DB for match of movieid in suggestStore
    //if no match in DB do a fetch
    // APP.displayCards is the callback
  },

  displayCards: () => {
    //display all the movie cards based on the results array
    // in APP.results
    //these results could be from the database or from a fetch
  },

  navigate: (url) => {
    //change the current page
    window.location = url; //this should include the querystring
  },
};

document.addEventListener("DOMContentLoaded", APP.init);
