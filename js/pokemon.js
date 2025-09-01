import { typeKorean, imgOrder, searchTypes } from "./default_value.js";

// PokeAPI 래퍼 초기화 (캐싱 활성화)
const P = new Pokedex.Pokedex({ cache: true });

// DOM 요소
const pokemonListDiv = document.getElementById("pokemon-list");
const searchForm = document.getElementById("search-form");
const filterLimit = document.getElementById("filter-limit");
const searchLimit = document.getElementById("search-limit");
const searchType = document.getElementById("search-type");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-button");
const resetBtn = document.getElementById("reset-button");
const loadingDiv = document.getElementById("loading");

let currentPage = 1;
let limit = 20;
let isLoading = false;
let isSearching = false;
let searchValue = "";

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
    // if (typeof pokemon.sprites[key] !== "string") return;
    if (!Object.keys(imgOrder).includes(key)) return;

    console.log(key, pokemon.sprites[key]);
    console.log(key, imgOrder[key]["name"]);

    let htmlPrev = ``;
    let htmlNext = ``;
    if (key.indexOf("front") > -1 && pokemon.sprites[key]) {
      htmlPrev = `<li><span>${imgOrder[key]["name"]}</span><div>`;
    } else {
      htmlNext = `</div></li>`;
    }

    if (pokemon.sprites[key]) {
      imgArray[
        imgOrder[key].index
      ] = `${htmlPrev}<img src="${pokemon.sprites[key]}" alt="${key}">${htmlNext}`;
    } else if (key.indexOf("back") > -1 && !pokemon.sprites[key]) {
      imgArray[imgOrder[key].index] = `${htmlNext}`;
    }
  });

  const modalContainer = document.createElement("section");
  modalContainer.classList.add("modal-container");
  const modal = document.createElement("div");
  modal.classList.add("modal");

  const modalHeader = document.createElement("header");
  modalHeader.classList.add("modal-header");
  const modalH2 = document.createElement("h2");
  modalH2.classList.add("a11y-hidden");
  modalH2.innerText = `${species.koreanName} 정보`;

  const btnClose = document.createElement("button");
  btnClose.classList.add("close-btn");
  btnClose.innerText = "X";
  btnClose.addEventListener("click", () => {
    modalContainer.remove();
  });

  const modalNumber = document.createElement("p");
  modalNumber.innerHTML = `No. ${pokemon.id}`;
  const modalName = document.createElement("h3");
  modalName.classList.add("name");
  modalName.innerHTML = species.koreanName;

  modalHeader.append(modalH2, btnClose, modalNumber, modalName);

  const modalInfo = document.createElement("main");
  modalInfo.classList.add("modal-info");
  modalInfo.innerHTML = `
    <div class="pokemon-image">
      <img src="${pokemon.sprites.front_default}" alt="${species.koreanName}">
    </div>
  `;
  const infoData = document.createElement("div");
  infoData.classList.add("pokemon-info", "details-info");
  infoData.innerHTML = `
      <div class="details-info-line">
        <h4>타입</h4>
        <div class="pokemon-type">${species.typeArray.join("")}</div>
      </div>
      <div class="details-info-line">
        <h4>분류</h4>
        <p>${koreanGenera}</p>
      </div>
      <div class="details-info-line">
        <h4>키</h4>
        <p>${pokemon.height / 10}m</p>
      </div>
      <div class="details-info-line">
        <h4>몸무게</h4>
        <p>${pokemon.weight / 10}kg</p>
      </div>
      <div class="details-info-line full-line">
        <h4>설명</h4>
        <p>${description}</p>
      </div>`;

  const imgs = document.createElement("div");
  imgs.classList.add("info-imgs", "details-info-line", "full-line");
  imgs.innerHTML = `
        <h4>모습</h4>
        <ul class="details-info">
        ${imgArray.join("")}
        </ul>`;
  infoData.append(imgs);

  modalInfo.append(infoData);
  modal.append(modalHeader, modalInfo);
  modalContainer.append(modal);
  document.body.append(modalContainer);
}

// ===========================================검색
// ID로 포켓몬 검색하기
async function searchPokemonById(id) {
  try {
    // ID로 포켓몬 정보 가져오기
    const pokemon = await P.getPokemonByName(id);
    // 포켓몬 종(species) 정보도 가져오기 (한국어 이름을 위해)
    const species = await P.getPokemonSpeciesByName(id);

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

    // 결과 표시
    makeCard({ pokemon, species });
  } catch (error) {
    console.error("포켓몬을 찾을 수 없습니다:", error);
    alert("해당 번호의 포켓몬을 찾을 수 없습니다.");
  } finally {
    // 관찰 요소 삭제
    observer.unobserve(moreBtn);

    // 더 보기 요소 가리기
    moreBtn.style.display = "none";
    loadingDiv.style.display = "none";
    isLoading = false;
    isSearching = false;
  }
}

// 영어 이름으로 포켓몬 검색하기
async function searchPokemonByEnglishName(name) {
  try {
    // 영어 이름으로 포켓몬 정보 가져오기 (소문자로 변환)
    const pokemon = await P.getPokemonByName(name.toLowerCase());
    // 포켓몬 종 정보도 가져오기
    const species = await P.getPokemonSpeciesByName(pokemon.id);

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

    // 결과 표시
    makeCard({ pokemon, species });
  } catch (error) {
    console.error("포켓몬을 찾을 수 없습니다:", error);
    alert("해당 이름의 포켓몬을 찾을 수 없습니다.");
  } finally {
    // 관찰 요소 삭제
    observer.unobserve(moreBtn);

    // 더 보기 요소 가리기
    moreBtn.style.display = "none";
    loadingDiv.style.display = "none";
    isLoading = false;
    isSearching = false;
  }
}

// 한국어 이름 매핑을 저장할 객체
const koreanNameMap = new Map();
let mappingPage = 1;
// 한국어 이름 매핑 데이터 구축하기
async function buildKoreanNameMap(limit = 300) {
  try {
    console.log("한국어 이름 데이터 로딩 중...");

    // 포켓몬 목록 가져오기
    // const response = await P.getPokemonsList({ limit: limit });

    const offset = (mappingPage - 1) * limit;
    const response = await P.getPokemonsList({
      offset: offset,
      limit: limit,
    });

    // 각 포켓몬의 종 정보 가져오기
    for (const pokemon of response.results) {
      const species = await P.getPokemonSpeciesByName(pokemon.name);

      // 한국어 이름 찾기
      const koreanName = species.names.find(
        (name) => name.language.name === "ko"
      )?.name;

      if (koreanName) {
        // 한국어 이름 -> 영어 이름/ID 매핑 저장
        koreanNameMap.set(koreanName.toLowerCase(), {
          id: species.id,
          englishName: pokemon.name,
        });
      }
    }

    console.log(`총 ${koreanNameMap.size}개의 한국어 이름 매핑 완료`);

    return offset;
  } catch (error) {
    console.error("한국어 이름 데이터 로드 오류:", error);
    // buildKoreanNameMap();
  }
}

// 한글 이름으로 포켓몬 검색하기
async function searchPokemonByKoreanName(koreanName) {
  try {
    // 소문자로 변환하여 검색
    const normalizedName = koreanName.toLowerCase();

    // 매핑 데이터에서 찾기
    if (koreanNameMap.has(normalizedName)) {
      const pokemonInfo = koreanNameMap.get(normalizedName);

      // ID로 상세 정보 가져오기
      const pokemon = await P.getPokemonByName(pokemonInfo.id);
      const species = await P.getPokemonSpeciesByName(pokemonInfo.id);

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

      // 결과 표시
      makeCard({ pokemon, species });
    } else {
      alert("해당 이름의 포켓몬을 찾을 수 없습니다.");
    }
  } catch (error) {
    console.error("포켓몬을 찾을 수 없습니다:", error);
    alert("검색 중 오류가 발생했습니다.");
  } finally {
    // 관찰 요소 삭제
    observer.unobserve(moreBtn);

    // 더 보기 요소 가리기
    moreBtn.style.display = "none";
    loadingDiv.style.display = "none";
    isLoading = false;
    isSearching = false;
  }
}

// 통합 검색 함수
async function searchPokemon(query) {
  if (isLoading || isSearching) return;
  isSearching = true;

  resetBtn.style.display = "block";

  // 검색어가 비어있으면 중단
  if (!query.trim()) {
    alert("검색어를 입력해주세요.");
    return;
  }
  reset();
  getParam();

  try {
    // 1. 숫자인지 확인 (ID 검색)
    if (searchType.value === "id") {
      await searchPokemonById(parseInt(query));
      return;
    }

    // 2. 한국어 이름으로 검색
    if (
      koreanNameMap.has(query.toLowerCase()) ||
      searchType.value === "korean-name"
    ) {
      await searchPokemonByKoreanName(query);
      return;
    }

    // 3. 영어 이름으로 검색
    await searchPokemonByEnglishName(query);
  } catch (error) {
    alert(
      "검색 결과가 없습니다. 포켓몬 번호, 한글 이름 또는 영어 이름을 입력해주세요."
    );
  }
}

// ===========================================Event
// 페이지 로드 시 포켓몬 데이터 불러오기
document.addEventListener("DOMContentLoaded", async () => {
  getParam();

  if (!searchValue) {
    await loadPokemonList();

    // 2초 후 인식하기
    setTimeout(() => observer.observe(moreBtn), 2000);
  } else {
    searchPokemon(searchValue);
  }

  let offset = await buildKoreanNameMap();
  for (mappingPage; offset < 1025; mappingPage++) {
    offset = await buildKoreanNameMap();
  }
  console.log(koreanNameMap);
});

// more 버튼을 눌러도 리스트 가져올 수 있도록
moreBtn.addEventListener("click", async () => {
  await loadPokemonList();
});

filterLimit.addEventListener("change", async () => {
  history.pushState(null, null, `?limit=${filterLimit.value}`);

  reset();
  getParam();
  await loadPokemonList();
});

searchType.addEventListener("change", () => {
  searchInput.placeholder = searchTypes[searchType.value] + "  검색";

  if (searchType.value === "id") {
    searchInput.type = "number";
    searchInput.min = "1";
    searchInput.max = "1025";
  } else {
    searchInput.type = "text";
    searchInput.min = "";
    searchInput.max = "";
  }
});

pokemonListDiv.addEventListener("click", (e) => {
  openModal(e.target.dataset.name);
});

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  searchPokemon(searchInput.value);
});

resetBtn.addEventListener("click", async () => {
  window.location = window.location.pathname;
  reset();

  await loadPokemonList();
});

function reset() {
  pokemonListDiv.innerHTML = "";

  currentPage = 1;
  limit = 20;
  searchValue = "";

  filterLimit.value = limit;
  searchLimit.value = limit;
  searchInput.value = searchValue;

  // 더 보기 요소 보이기
  moreBtn.style.display = "block";
  loadingDiv.style.display = "block";
}

function getParam() {
  const param = new URL(window.location.href).searchParams;

  limit = param.get("limit") ? param.get("limit") : 20;
  filterLimit.value = limit;
  searchLimit.value = limit;

  searchValue = param.get("search-value") ? param.get("search-value") : "";
  searchInput.value = searchValue;

  searchType.value = param.get("search-type") ? param.get("search-type") : "id";
  searchInput.placeholder = searchTypes[searchType.value] + "  검색";

  if (searchType.value === "id") {
    searchInput.type = "number";
    searchInput.min = "1";
    searchInput.max = "1025";
  } else {
    searchInput.type = "text";
    searchInput.min = "";
    searchInput.max = "";
  }
}
