import { typeKorean, imgOrder, searchTypes } from "./default_value.js";

// PokeAPI 래퍼 초기화 (캐싱 활성화)
const P = new Pokedex.Pokedex({ cache: true });

// DOM 요소
const pokemonListDiv = document.getElementById("pokemon-list");
const searchLimit = document.getElementById("search-limit");
const searchType = document.getElementById("search-type");
const searchInput = document.getElementById("pokemon-search-input");
const loadingDiv = document.getElementById("loading");

let currentPage = 1;
let limit = 20;
let isLoading = false;
let isSearching = false;

// 관찰할 요소(로딩 표시기)를 생성
const moreBtn = document.getElementById("more-btn");

// 로딩 인디케이터 표시
const observer = new IntersectionObserver(callback, {
  root: null,
  threshold: 0.1,
});

async function callback(entries, observer) {
  // console.log(entries[0]);
  if (entries[0].isIntersecting && !isLoading && !isSearching) {
    await loadPokemonList();
  }
}

// ===========================================포켓몬 데이터 로드 함수
async function loadPokemonList() {
  if (isLoading || isSearching) return;
  isLoading = true;

  const offset = (currentPage - 1) * limit;

  // 로딩 메시지 숨기기
  loadingDiv.style.display = "block"; // 로딩 완료 후 숨김

  try {
    // 시작 ID부터 count개의 포켓몬 데이터를 가져오기
    // for (let i = startId; i < startId + limit; i++) {
    const interval = {
      offset: offset,
      limit: limit,
    };
    P.getPokemonsList(interval).then(function (response) {
      // console.log(response);
      // 포켓몬 기본 정보 가져오기
      const data = response.results;
      // console.log(data);

      // 값 뿌려주기
      data.forEach(async (item) => {
        // console.log(item);
        if (item && item.name) {
          const pokemonInfo = await getPokeminById(item.name);

          await makeCard(pokemonInfo);
        }
      });
    });

    currentPage++;
  } catch (error) {
    console.error("포켓몬 데이터를 불러오는 중 오류가 발생했습니다:", error);
    loadingDiv.textContent =
      "데이터를 불러오는 중 오류가 발생했습니다. 다시 시도해 주세요.";
  } finally {
    // 로딩 메시지 숨기기
    loadingDiv.style.display = "none"; // 로딩 완료 후 숨김
    isLoading = false;
  }
}

// ===========================================카드 만들기
async function makeCard({ pokemon, species }) {
  // 포켓몬 카드 생성
  const card = document.createElement("div");
  card.classList.add("pokemon-card");
  card.dataset.name = pokemon.name;

  card.innerHTML = `
    <div class="pokemon-title">
      <h2>${species.koreanName}</h2>
      <p>No. ${pokemon.id}</p>
    </div>
    <div class="pokemon-image">
      <img src="${pokemon.sprites.front_default}" alt="${species.koreanName}">
    </div>
    <div class="pokemon-info">
      <div class="pokemon-type">${species.typeArray.join("")}</div>
    </div>
  `;
  // 카드 내용 구성
  pokemonListDiv.appendChild(card);
}

// ===========================================정보 가져오기
async function getPokeminById(name) {
  if (name) {
    try {
      const pokemon = await P.getPokemonByName(name);

      // 데이터가 없다면
      if (pokemon.id > 1025) {
        // 관찰 요소 삭제
        observer.unobserve(moreBtn);

        // 더 보기 요소 가리기
        moreBtn.style.display = "none";
        loadingDiv.style.display = "none";

        return;
      }

      // 포켓몬 종(species) 정보 가져오기 (한국어 이름을 위해)
      const species = await P.getPokemonSpeciesByName(name);

      // 한국어 이름 찾기
      const koreanName =
        species.names.find((name) => name.language.name === "ko")?.name ||
        pokemon.name;
      species.koreanName = koreanName;

      // 타입 정보 가져오기
      const types = pokemon.types.map((type) => type.type.name);
      const typeArray = [];
      types.forEach((type) => {
        typeArray.push(`<p class="type-${type}">${typeKorean[type]}</p>`);
      });
      species.typeArray = typeArray;

      return { pokemon, species };
    } catch (err) {
      console.log(err);
    }
  }
}

// ===========================================modal
async function openModal(name) {
  const info = await getPokeminById(name);
  const pokemon = info.pokemon;
  const species = info.species;

  const koreanGenera = species.genera.find(
    (genera) => genera.language.name === "ko"
  )?.genus;
  const description = species.flavor_text_entries.find(
    (description) => description.language.name === "ko"
  )?.flavor_text;

  const imgArray = [];
  Object.keys(pokemon.sprites).forEach((key) => {
    if (typeof pokemon.sprites[key] !== "string") return;

    console.log(key, pokemon.sprites[key]);
    imgArray[
      imgOrder[key]
    ] = `<img src="${pokemon.sprites[key]}" alt="${key}">`;
  });

  const modalContainer = document.createElement("section");
  modalContainer.classList.add("modal-container");
  const modal = document.createElement("div");
  modal.classList.add("modal");

  const modalHeader = document.createElement("header");
  modalHeader.classList.add("modal-title", "pokemon-title");

  const btnClose = document.createElement("button");
  btnClose.classList.add("close-btn");
  btnClose.innerText = "X";
  btnClose.addEventListener("click", () => {
    modalContainer.remove();
  });

  const modalNumber = document.createElement("p");
  modalNumber.innerHTML = `No. ${pokemon.id}`;
  const modalTitle = document.createElement("h2");
  modalTitle.innerHTML = species.koreanName;

  modalHeader.append(btnClose, modalNumber, modalTitle);

  const modalInfo = document.createElement("main");
  modalInfo.classList.add("modal-info");
  modalInfo.innerHTML = `
    <div class="pokemon-image">
      <img src="${pokemon.sprites.front_default}" alt="${species.koreanName}">
    </div>
    <div class="pokemon-info details-info">
      <div class="details-info-line">
        <h3>타입</h3>
        <div class="pokemon-type">${species.typeArray.join("")}</div>
      </div>
      <div class="details-info-line">
        <h3>키</h3>
        <p>${pokemon.height / 10}m</p>
      </div>
      <div class="details-info-line">
        <h3>몸무게</h3>
        <p>${pokemon.weight / 10}kg</p>
      </div>
      <div class="details-info-line">
        <h3>분류</h3>
        <p>${koreanGenera}</p>
      </div>
      <div class="details-info-line full-line">
        <h3>설명</h3>
        <p>${description}</p>
      </div>
    </div>
  `;

  const imgs = document.createElement("div");
  imgs.classList.add("info-imgs");
  imgs.innerHTML = imgArray.join("");

  modalInfo.append(imgs);
  modal.append(modalHeader, modalInfo);
  modalContainer.append(modal);
  document.body.append(modalContainer);
}

// ===========================================Event
// 페이지 로드 시 포켓몬 데이터 불러오기
document.addEventListener("DOMContentLoaded", async () => {
  const param = new URL(window.location.href).searchParams;
  limit = param.get("limit") ? param.get("limit") : 20;

  searchLimit.value = limit;

  await loadPokemonList();

  // 2초 후 인식하기
  setTimeout(() => observer.observe(moreBtn), 2000);
});

// more 버튼을 눌러도 리스트 가져올 수 있도록
moreBtn.addEventListener("click", async () => {
  await loadPokemonList();
});

searchLimit.addEventListener("change", () => {
  location.href = "./?limit=" + searchLimit.value;
});

searchType.addEventListener("change", () => {
  searchInput.placeholder = searchTypes[searchType.value] + "  검색";
});

pokemonListDiv.addEventListener("click", (e) => {
  openModal(e.target.dataset.name);
});
