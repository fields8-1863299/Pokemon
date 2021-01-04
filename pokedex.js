/**
 * Sam Fields
 * 05/13
 * AL Shriya Kurpad
 *
 * This is the pokedex.js page for the pokedex web application.
 * Includes functionality to display and update pokemon by if they are
 * found or not. Also supports functionality to play and update a pokemon
 * battle mode.
 */

"use strict";
(function() {
  const URL_POKEDEX = "https://courses.cs.washington.edu/courses/cse154/webservices/pokedex/";
  const IMG_PATH = "https://courses.cs.washington.edu/courses/cse154/webservices/pokedex/sprites/";
  const GAME_URL = "https://courses.cs.washington.edu/courses/cse154/webservices/pokedex/game.php";
  window.addEventListener('load', init);

  const FOUND = ["bulbasaur", "squirtle", "charmander"];
  let GUID = null;
  let PID = null;
  let DEFAULT_HP = null;

  /**
   * Initializes the web application, populating the pokedex with the starter pokemon being found
   */
  function init() {
    id("endgame").addEventListener('click', switchPokedex);
    id("flee-btn").addEventListener("click", flee);
    qs("#p1 #start-btn").addEventListener("click", gameView);

    fetch(URL_POKEDEX + "pokedex.php?pokedex=all")
      .then(checkStatus)
      .then(resp => resp.text())
      .then(populate)
      .catch(console.error);
  }

  /**
   * Populates the pokedex view with all the pokemon with the "found" default pokemon
   *  visible.
   * @param {String} pokemon - String of all pokemon seperated by line break and in
   *  "Name:shortname" syntax
   */
  function populate(pokemon) {
    pokemon = pokemon.split("\n");
    for (let i = 0; i < pokemon.length; i++) {
      let poke = pokemon[i];
      poke = poke.split(":")[1];
      let img = document.createElement("img");
      img.src = IMG_PATH + poke + ".png";
      img.alt = poke;
      img.id = poke;
      img.classList.add("sprite");
      if (FOUND.includes(poke)) {
        img.classList.add("found");
        img.addEventListener("click", cardView);
      }
      id("pokedex-view").appendChild(img);
    }
  }

  /**
   * Initiates a card view format for given selected pokemon.
   */
  function cardView() {
    fetch(URL_POKEDEX + "pokedex.php?pokemon=" + this.id)
      .then(checkStatus)
      .then(resp => resp.json())
      .then(data => genCard(data, "#p1"))
      .catch(console.error);
  }

  /**
   * Updates the card info of the given player id with the given pokeData
   * @param {object} pokeData - JSON object with pokemon data from pokedex api
   * @param {string} player - String of the player ID
   */
  function genCard(pokeData, player) {
    genHelper(pokeData, player);
    let cardMoves = qsa(player + " .moves  button");
    for (let i = 0; i < pokeData.moves.length; i++) {
      cardMoves[i].classList.remove("hidden");
      cardMoves[i].querySelector(".move").textContent = pokeData.moves[i].name;
      if (Object.keys(pokeData.moves[i]).includes("dp")) {
        cardMoves[i].querySelector(".dp").textContent = pokeData.moves[i].dp + " DP";
      } else {
        cardMoves[i].querySelector(".dp").textContent = "";
      }
      cardMoves[i].querySelector("img").src = URL_POKEDEX + "icons/" +
        pokeData.moves[i].type + ".jpg";
    }
    if (pokeData.moves.length !== 4) {
      for (let i = pokeData.moves.length; i < 4; i++) {
        cardMoves[i].classList.add("hidden");
      }
    }
    if (player === "#p1") {
      DEFAULT_HP = pokeData.hp;
      qs("#p1 #start-btn").classList.remove("hidden");
    }
  }

  /**
   * Helper method for genCard to fill about miscellanious dom info with pokeData
   * @param {object} pokeData - JSON object with pokemon data from pokedex api
   * @param {string} player - String of the player ID
   */
  function genHelper(pokeData, player) {
    qs(player + " .name").textContent = pokeData.name;
    qs(player + " .pokepic").src = URL_POKEDEX + pokeData.images.photo;
    qs(player + " .pokepic").alt = pokeData.shortname;
    qs(player + " .type").src = URL_POKEDEX + pokeData.images.typeIcon;
    qs(player + " .type").alt = pokeData.info.type;
    qs(player + " .weakness").src = URL_POKEDEX + pokeData.images.weaknessIcon;
    qs(player + " .weakness").alt = pokeData.info.weakness;
    qs(player + " .hp").textContent = pokeData.hp + "HP";
    qs(player + " .info").textContent = pokeData.info.description;
  }

  /**
   * Initiates battle mode with current selected player one card
   */
  function gameView() {
    qs("h1").textContent = "Pokemon Battle Mode!";
    id("pokedex-view").classList.add("hidden");
    id("p2").classList.remove("hidden");
    qs("#p1 .hp-info").classList.remove("hidden");
    id("results-container").classList.remove("hidden");
    id("p1-turn-results").classList.remove("hidden");
    id("p2-turn-results").classList.remove("hidden");
    qs("#p1 #flee-btn").classList.remove("hidden");
    qs("#p1 #start-btn").classList.add("hidden");
    let moves = qsa("#p1 .moves button");
    for (let i = 0; i < moves.length; i++) {
      moves[i].disabled = false;
      moves[i].addEventListener('click', move);
    }

    let params = new FormData();
    params.append("startgame", true);
    params.append("mypokemon", qs("#p1 .pokemon-pic img").alt);

    fetch(GAME_URL, {method: "POST", body: params})
      .then(checkStatus)
      .then(resp => resp.json())
      .then(initiateGame)
      .catch(console.error);
  }

  /**
   * Initiates a for the current game with selected move
   */
  function move() {
    load();
    let params = new FormData();
    params.append("guid", GUID);
    params.append("pid", PID);
    let moveName = this.querySelector(".move").textContent.split(' ').join('')
      .toLowerCase();
    params.append("movename", moveName);
    postMove(params);
  }

  /**
   * Sends post request for game with passed move params FormData
   * @param {object} params - FormData object with appended gameid, playerid, and move name
   */
  function postMove(params) {
    fetch(GAME_URL, {method: "POST", body: params})
      .then(checkStatus)
      .then(resp => resp.json())
      .then(updateGame)
      .then(load)
      .catch(console.error);
  }

  /**
   * Updates the game during battle mode after a move has been made. If either player reaches
   * 0 current hp, ends the game.
   * @param {object} results - JSON object with updated game information
   */
  function updateGame(results) {
    id("p1-turn-results").textContent = "Player 1 played " + results['results']['p1-move'] +
      " and " + results['results']['p1-result'] + "!";
    id("p2-turn-results").textContent = "Player 2 played " + results['results']['p2-move'] +
      " and " + results['results']['p2-result'] + "!";
    qs("#p1 .hp").textContent = results.p1['current-hp'] + "HP";
    qs("#p2 .hp").textContent = results.p2['current-hp'] + "HP";

    if (results['results']['p2-move'] === null) {
      id("p2-turn-results").classList.add("hidden");
    }

    let p1Health = results.p1['current-hp'] / results.p1['hp'];
    qs("#p1 .health-bar").style.width = (p1Health * 100) + "%";
    if (p1Health < 0.2) {
      qs("#p1 .health-bar").classList.add("low-health");
    } else {
      qs("#p1 .health-bar").classList.remove("low-health");
    }

    let p2Health = results.p2['current-hp'] / results.p2['hp'];
    qs("#p2 .health-bar").style.width = (p2Health * 100) + "%";
    if (p2Health < 0.2) {
      qs("#p2 .health-bar").classList.add("low-health");
    } else {
      qs("#p2 .health-bar").classList.remove("low-health");
    }

    if (results.p1['current-hp'] === 0 || results.p2['current-hp'] === 0) {
      endGame(results);
    }
  }

  /**
   * Ends the game displaying relevant end game information, removing functionality of moves,
   * and allows user to return to pokedex view
   * @param {object} results - JSON object with updated game information
   */
  function endGame(results) {
    if (results.p1['current-hp'] === 0) {
      qs("h1").textContent = "You lost!";
    } else {
      qs("h1").textContent = "You won!";
      id(results.p2.shortname).classList.add("found");
      id(results.p2.shortname).addEventListener("click", cardView);
    }
    let moves = qsa("#p1 .moves button");
    for (let i = 0; i < moves.length; i++) {
      moves[i].disabled = true;
    }
    id("flee-btn").classList.add("hidden");
    id("endgame").classList.remove("hidden");
  }

  /**
   * Switches view from battle mode to pokedex view
   */
  function switchPokedex() {
    qs("h1").textContent = "Your Pokedex";
    id("endgame").classList.add("hidden");
    id("results-container").classList.add("hidden");
    qs("#p1 .hp-info").classList.add("hidden");
    qs("#p1 #start-btn").classList.remove("hidden");
    qs("#p1 .hp").textContent = DEFAULT_HP + "HP";
    qs("#p1 .health-bar").style.width = "100%";
    qs("#p2 .health-bar").style.width = "100%";
    qs("#p2 .health-bar").classList.remove("low-health");
    qs("#p1 .health-bar").classList.remove("low-health");
    id("p2").classList.add("hidden");
    id("pokedex-view").classList.remove("hidden");
    id("p1-turn-results").textContent = "";
    id("p2-turn-results").textContent = "";
  }

  /**
   * Toggles loading pikachu animation
   */
  function load() {
    id("loading").classList.toggle("hidden");
  }

  /**
   * Sets the game and player id for a new battle mode generating the player 2 card information
   * @param {object} gameData - JSON object with the game / battle mode information
   */
  function initiateGame(gameData) {
    GUID = gameData.guid;
    PID = gameData.pid;
    genCard(gameData.p2, "#p2");
  }

  /**
   * "Flees" from a battle. Automatically looses battle and allows user to return to pokedex view
   */
  function flee() {
    load();
    let params = new FormData();
    params.append("guid", GUID);
    params.append("pid", PID);
    params.append("move", "flee");
    postMove(params);
  }

  /**
   * Helper function to return the response's result text if successful, otherwise
   * returns the rejected Promise result with an error status and corresponding text
   * @param {object} response - response to check for success/error
   * @return {object} - valid response if response was successful, otherwise rejected
   *                    Promise result
   */
  function checkStatus(response) {
    if (response.ok) {
      return response;
    } else {
      throw Error("Error in request: " + response.statusText);
    }
  }

  /**
   * returns the id dom element with the given idName
   * @param {String} idName - id name of the element selecting
   * @return {object} Dom elemented of the given id
   */
  function id(idName) {
    return document.getElementById(idName);
  }

  /**
   * returns the query dom element with the given query
   * @param {String} query - query of the element selecting
   * @return {object} Dom elemented of the given id
   */
  function qs(query) {
    return document.querySelector(query);
  }

  /**
   * returns all the dom element with the given query
   * @param {String} query - query of the elements selecting
   * @return {object} Dom elemented of the given id
   */
  function qsa(query) {
    return document.querySelectorAll(query);
  }
})();