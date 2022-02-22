const APP = {
  DB: null, //the indexedDB
  sw: null,
  input: "",
  id: "",
  title: "",
  results: [],
  isOnline: "onLine" in navigator && navigator.onLine,
  tmdbBASEURL: "https://api.themoviedb.org/3/",
  tmdbAPIKEY: "527917a705e7338ceca3903f95d79899",
  tmdbIMAGEBASEURL: "http://image.tmdb.org/t/p/w500",
  param: new URL(document.location).searchParams,
  init: () => {
    //open the database
    //register the service worker after the DB is open
    APP.openDatabase(APP.registerSW);
    APP.changeDisplay();
    setTimeout(APP.checkNavCount, 10000);
    console.log("init function called");
  },

  registerSW: () => {
    //register the service worker
    console.log("register the service worker");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(function (error) {
        // Something went wrong during registration. The sw.js file
        // might be unavailable or contain a syntax error.
        console.warn(error);
      });
      navigator.serviceWorker.ready.then((registration) => {
        // .ready will never reject... just wait indefinitely
        APP.sw = registration.active;
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
    let moviesObj;

    if (storeName === "searchResults") {
      moviesObj = {
        keyword: APP.input,
        result: obj,
      };
      console.log("add results to searchStore");
    } else {
      moviesObj = {
        movieid: APP.id,
        title: APP.title,
        result: obj,
      };
      console.log("add results to suggestStore");
    }
    newStore.add(moviesObj);
  },

  addListeners: () => {
    console.warn("adding listeners");
    let btnSearch = document.getElementById("btnSearch");
    btnSearch.addEventListener("click", APP.searchFormSubmitted);

    window.addEventListener("online", APP.changeStatus);
    window.addEventListener("offline", APP.changeStatus);

    if (navigator.standalone) {
      console.log("Launched: Installed (iOS)");
      APP.isStandalone = true;
    } else if (matchMedia("(display-mode: standalone)").matches) {
      console.log("Launched: Installed");
      APP.isStandalone = true;
    } else {
      // console.log('Launched: Browser Tab');
      APP.isStandalone = false;
    }
    window.addEventListener("pageshow", APP.updateNavCount);
  },

  pageSpecific: () => {
    //anything that happens specifically on each page
    switch (document.body.id) {
      case "home":
        console.log("on the home page");
        break;

      case "results":
        console.log("on the results page");
        let searchUrl = new URL(document.location).searchParams;
        APP.input = searchUrl.get("keyword");
        APP.getSearchResults(APP.input);
        let search = document.getElementById("searchKey");
        search.textContent = `You were searching for "${APP.input}"`;
        break;

      case "suggest":
        console.log("on the suggest page");

        APP.title = APP.param.get("title");
        APP.checkDBResults("suggestResults", APP.title);

        let suggest = document.getElementById("suggestKey");
        suggest.textContent = `Similar Movies to movie "${APP.title}"`;
        break;

      case "fourohfour":
        console.log("on the 404 page");
        // location.href = "/404.html";
        break;
    }
  },

  cardListClicked: (ev) => {
    //user clicked on a movie card
    console.log("card is clicked");
    let div = ev.target.closest(".card");
    APP.title = div.title;
    APP.id = div.id;
    APP.navigate(`/suggest.html?id=${div.id}&title=${APP.title}`);
  },

  changeStatus: (ev) => {
    // Jet Brains Mono
    //toggling between online and offline
    APP.isOnline = ev.type === "online" ? true : false;
    //TODO: send message to sw about being online or offline
    navigator.serviceWorker.ready.then((registration) => {
      registration.active.postMessage({ ONLINE: APP.isOnline });
    });
    APP.changeDisplay();
  },

  changeDisplay: () => {
    if (APP.isOnline) {
      //online
      document.querySelector(".isonline").textContent = "Online";
    } else {
      //offline
      document.querySelector(".isonline").textContent = " Offline ";
    }
  },

  gotMessage: (ev) => {
    //received message from service worker
    console.log(ev.data);
  },

  sendMessage: (msg) => {
    //send messages to the service worker
    navigator.serviceWorker.ready.then((registration) => {
      registration.active.postMessage(msg);
    });
  },

  searchFormSubmitted: (ev) => {
    console.log("search form submitted");
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

  getData: (endpoint) => {
    let url;

    if (APP.param.get("keyword")) {
      //build the url with keyword
      url = `${APP.tmdbBASEURL}search/movie?api_key=${APP.tmdbAPIKEY}&query=${endpoint}`;
    } else {
      APP.id = APP.param.get("id");
      url = `${APP.tmdbBASEURL}movie/${APP.id}/recommendations?api_key=${APP.tmdbAPIKEY}&language=en-US&page=1`;
    }

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
        //check if there have any results
        if (APP.results.length === 0) {
          APP.navigate("/404.html");
        } else {
          if (APP.param.get("keyword")) {
            // add to search results store
            APP.addResultsToDB(APP.results, "searchResults");
          } else {
            // add to suggest results store
            APP.addResultsToDB(APP.results, "suggestResults");
          }
          APP.displayCards(APP.results);
        }
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
        APP.title = ev.target.result.title;
        APP.displayCards(APP.results);
      }
    };
  },

  getSearchResults: (keyValue) => {
    if (APP.param.get("keyword")) {
      console.log(`Getting search key for: ${keyValue}`);
      APP.checkDBResults("searchResults", keyValue);
    } else {
      console.log(`Getting suggest key for: ${keyValue}`);
      APP.checkDBResults("suggestResults", keyValue);
    }
  },

  displayCards: (movies) => {
    //display all the movie cards based on the results array
    let image;
    let ol = document.getElementById("ol");

    movies.forEach((movie) => {
      let li = document.createElement("li");
      // check if the poster exist or not
      if (movie.poster_path === null) {
        image = "./img/imageNotFound.png";
      } else {
        image = `${APP.tmdbIMAGEBASEURL}${movie.poster_path}`;
      }
      // check if the release data exist or not
      if (movie.release_date === "") {
        movie.release_date = "Sorry, no release date data";
      } else {
        movie.release_date = `${movie.release_date}`;
      }

      // build movie cards
      li.innerHTML = `
      <div class="card" id="${movie.id}" title="${movie.title}">
      <img src="${image}" class="card-img-top" alt="${movie.title}">
      <div class="card-body d-flex flex-column">
      <h5 class="card-title">${movie.title}</h5>
      <p class="card-text">Release Date:<br>${movie.release_date}</p> 
      <p class="card-text">Popularity:<br>${movie.popularity.toFixed(2)}</p>
      </div>
      </div>`;
      ol.append(li);

      li.addEventListener("click", APP.cardListClicked);
    });
  },

  navigate: (url) => {
    //change the current page
    window.location = url; //this should include the querystring
  },

  updateNavCount: (ev) => {
    //TODO: when the app loads check to see if the sessionStorage key exists
    // if the number exists then increment by 1.
    // triggered by the pageshow event
    //console.log(ev);
    //don't need to do this if the app is already installed...
    if (!APP.isStandalone) {
      APP.navCount = 0;
      let storage = sessionStorage.getItem("exercise3NavCount");
      if (storage) {
        APP.navCount = Number(storage) + 1;
      } else {
        APP.navCount = 1;
      }
      sessionStorage.setItem("exercise3NavCount", APP.navCount);
    }
  },

  checkNavCount: () => {
    //page has just loaded if the count is high enough then show the prompt
    let storage = sessionStorage.getItem("exercise3NavCount");
    if (storage) {
      APP.navCount = Number(storage);
      if (APP.navCount > 2) {
        console.log("show the prompt"); //only works on user interaction
        document.body.addEventListener(
          "click",
          () => {
            if (APP.deferredPrompt) {
              APP.deferredPrompt.prompt();
              APP.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === "accepted") {
                  //user says yes
                  console.log("User accepted the install prompt");
                  APP.deferredPrompt = null; //we will not need it again.
                  //and clear out sessionStorage
                  sessionStorage.clear();
                } else {
                  //user says not now
                  console.log("User dismissed the install prompt");
                }
              });
            } else {
              window.addEventListener("beforeinstallprompt", (ev) => {
                console.log("beforeinstallprompt");
                ev.preventDefault();
                APP.deferredPrompt = ev;
              });
            }
          },
          { once: true }
        );
      }
    }
  },
};

document.addEventListener("DOMContentLoaded", APP.init());
