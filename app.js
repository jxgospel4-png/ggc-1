/**
 * 청렴감사관실 청렴 윤리 모니터링 포털 - Frontend Logic
 * - 신고 사건 검색 / 다중 필터링 (신고유형, 처리상태, 키워드)
 * - 결과 건수 표시 ("결과 N건")
 * - 사건 카드 그리드 렌더링 (신고일자, 신고유형, 지역, 처리상태)
 * - korea.kr RSS 정적 목록 및 교육 이수율 표시
 */

// 전역 상태
let allIncidents = [];
let filteredIncidents = [];
let currentPage = 1;
const pageSize = 12;

// DOM 요소
const filterTypeEl = document.getElementById('filter-type');
const filterStatusEl = document.getElementById('filter-status');
const searchInputEl = document.getElementById('search-input');
const btnSearchClearEl = document.getElementById('btn-search-clear');
const btnResetEl = document.getElementById('btn-reset');
const resultCountEl = document.getElementById('result-count');
const cardsContainerEl = document.getElementById('incident-cards-container');
const pageInfoEl = document.getElementById('page-info');
const btnPrevPageEl = document.getElementById('btn-prev-page');
const btnNextPageEl = document.getElementById('btn-next-page');
const quickBtns = document.querySelectorAll('.quick-btn');

/**
 * 초기 데이터 로드 (data.json fetch 시도 -> 로컬 fetch 불가능 시 fallback 데이터 사용)
 */
async function loadData() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();
    initDashboard(data);
  } catch (err) {
    console.warn('data.json을 직접 fetch할 수 없어 내장 데이터 또는 fallback 모드로 동작합니다.', err);
    // fallback 데이터 로드 시도
    if (window.__FALLBACK_DATA__) {
      initDashboard(window.__FALLBACK_DATA__);
    }
  }
}

/**
 * 대시보드 초기화
 */
function initDashboard(data) {
  if (!data) return;

  // 1. KPI 지표 업데이트
  if (data.summary) {
    const { total_incidents, completed_incidents, avg_duration } = data.summary;
    const totalEl = document.getElementById('kpi-total');
    const completedEl = document.getElementById('kpi-completed');
    const avgDurationEl = document.getElementById('kpi-avg-duration');
    const rateEl = document.getElementById('kpi-complete-rate');

    if (totalEl) totalEl.innerHTML = `${total_incidents}<span class="unit">건</span>`;
    if (completedEl) completedEl.innerHTML = `${completed_incidents}<span class="unit">건</span>`;
    if (avgDurationEl) avgDurationEl.innerHTML = `${avg_duration}<span class="unit">일</span>`;
    if (rateEl && total_incidents > 0) {
      rateEl.textContent = `${((completed_incidents / total_incidents) * 100).toFixed(1)}%`;
    }
  }

  // 2. 사건 데이터 설정
  allIncidents = data.incidents || [];
  filteredIncidents = [...allIncidents];

  // 3. 이벤트 리스너 바인딩
  setupEventListeners();

  // 4. 초기 렌더링
  applyFilters();
}

/**
 * 이벤트 리스너 등록
 */
function setupEventListeners() {
  // 필터 변경 시
  filterTypeEl.addEventListener('change', () => {
    syncQuickButtons();
    applyFilters();
  });

  filterStatusEl.addEventListener('change', () => {
    syncQuickButtons();
    applyFilters();
  });

  // 검색어 입력 시 실시간 반영
  searchInputEl.addEventListener('input', (e) => {
    if (e.target.value.trim().length > 0) {
      btnSearchClearEl.classList.add('show');
    } else {
      btnSearchClearEl.classList.remove('show');
    }
    applyFilters();
  });

  // 검색어 지우기
  btnSearchClearEl.addEventListener('click', () => {
    searchInputEl.value = '';
    btnSearchClearEl.classList.remove('show');
    searchInputEl.focus();
    applyFilters();
  });

  // 초기화 버튼
  btnResetEl.addEventListener('click', () => {
    filterTypeEl.value = 'ALL';
    filterStatusEl.value = 'ALL';
    searchInputEl.value = '';
    btnSearchClearEl.classList.remove('show');
    syncQuickButtons();
    applyFilters();
  });

  // 빠른 필터 버튼 클릭
  quickBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      const status = btn.getAttribute('data-status');

      if (type) {
        filterTypeEl.value = type;
      }
      if (status) {
        filterStatusEl.value = status;
      }

      syncQuickButtons();
      applyFilters();
    });
  });

  // 페이지네이션
  btnPrevPageEl.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderCards();
      window.scrollTo({ top: document.querySelector('.incident-search-section').offsetTop - 30, behavior: 'smooth' });
    }
  });

  btnNextPageEl.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredIncidents.length / pageSize) || 1;
    if (currentPage < totalPages) {
      currentPage++;
      renderCards();
      window.scrollTo({ top: document.querySelector('.incident-search-section').offsetTop - 30, behavior: 'smooth' });
    }
  });
}

/**
 * 빠른 필터 버튼 활성화 상태 동기화
 */
function syncQuickButtons() {
  const currentType = filterTypeEl.value;
  const currentStatus = filterStatusEl.value;

  quickBtns.forEach((btn) => {
    const bType = btn.getAttribute('data-type');
    const bStatus = btn.getAttribute('data-status');

    if (bType && bStatus && bType === 'ALL' && bStatus === 'ALL') {
      btn.classList.toggle('active', currentType === 'ALL' && currentStatus === 'ALL');
    } else if (bType && !bStatus) {
      btn.classList.toggle('active', currentType === bType);
    } else if (bStatus && !bType) {
      btn.classList.toggle('active', currentStatus === bStatus);
    }
  });
}

/**
 * 3. 신고유형 또는 처리상태, 검색어로 필터링
 */
function applyFilters() {
  const selectedType = filterTypeEl.value;
  const selectedStatus = filterStatusEl.value;
  const keyword = searchInputEl.value.trim().toLowerCase();

  filteredIncidents = allIncidents.filter((item) => {
    // 1) 신고유형 매칭
    if (selectedType !== 'ALL' && item['신고유형'] !== selectedType) {
      return false;
    }

    // 2) 처리상태 매칭
    if (selectedStatus !== 'ALL' && item['처리상태'] !== selectedStatus) {
      return false;
    }

    // 3) 키워드 검색 (사건ID, 지역, 조치결과, 신고자유형 등)
    if (keyword) {
      const matchId = (item['사건ID'] || '').toLowerCase().includes(keyword);
      const matchRegion = (item['지역'] || '').toLowerCase().includes(keyword);
      const matchType = (item['신고유형'] || '').toLowerCase().includes(keyword);
      const matchStatus = (item['처리상태'] || '').toLowerCase().includes(keyword);
      const matchResult = (item['조치결과'] || '').toLowerCase().includes(keyword);
      const matchReporter = (item['신고자유형'] || '').toLowerCase().includes(keyword);

      if (!matchId && !matchRegion && !matchType && !matchStatus && !matchResult && !matchReporter) {
        return false;
      }
    }

    return true;
  });

  // 4. 화면에 "결과N건" 표시 업데이트
  resultCountEl.textContent = filteredIncidents.length.toLocaleString();

  // 첫 페이지로 리셋 후 렌더링
  currentPage = 1;
  renderCards();
}

/**
 * 처리상태에 따른 배지 HTML 반환
 */
function getStatusBadge(status) {
  switch (status) {
    case '처리완료':
      return `<span class="status-badge status-completed">✅ 처리완료</span>`;
    case '조사중':
      return `<span class="status-badge status-investigating">🔍 조사중</span>`;
    case '접수완료':
      return `<span class="status-badge status-received">📥 접수완료</span>`;
    case '이첩':
      return `<span class="status-badge status-transferred">↗️ 이첩</span>`;
    case '기각':
      return `<span class="status-badge status-dismissed">⛔ 기각</span>`;
    default:
      return `<span class="status-badge">${status || '상태미정'}</span>`;
  }
}

/**
 * 2. 신고일자, 신고유형, 지역, 처리상태를 카드 형태로 사건 카드 렌더링
 */
function renderCards() {
  cardsContainerEl.innerHTML = '';

  if (filteredIncidents.length === 0) {
    cardsContainerEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3 class="empty-title">조건에 일치하는 신고 사건이 없습니다</h3>
        <p class="empty-desc">필터 조건을 변경하거나 검색어를 다시 확인해보세요.</p>
      </div>
    `;
    updatePagination(0);
    return;
  }

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredIncidents.length);
  const pageItems = filteredIncidents.slice(startIndex, endIndex);

  const fragment = document.createDocumentFragment();

  pageItems.forEach((incident) => {
    const card = document.createElement('article');
    card.className = 'incident-card';

    // 주요 필드 (신고일자, 신고유형, 지역, 처리상태)
    const reportDate = incident['신고일자'] || '-';
    const reportType = incident['신고유형'] || '미분류';
    const region = incident['지역'] || '-';
    const status = incident['처리상태'] || '-';

    // 부가 필드
    const caseId = incident['사건ID'] || '';
    const reporterType = incident['신고자유형'] || '-';
    const duration = incident['처리기간_일'] ? `${incident['처리기간_일']}일` : '진행중 (결측)';
    const amount = incident['위반금액_만원'] ? `${Number(incident['위반금액_만원']).toLocaleString()}만원` : '-';
    const actionResult = incident['조치결과'] || '-';

    card.innerHTML = `
      <div>
        <div class="card-top">
          <span class="card-case-id">${caseId}</span>
          ${getStatusBadge(status)}
        </div>
        <h3 class="card-main-title">
          <span class="type-tag">[${reportType}]</span> 사건 모니터링
        </h3>
        <div class="card-info-table">
          <div class="info-item">
            <span class="info-label">📅 신고일자</span>
            <span class="info-val">${reportDate}</span>
          </div>
          <div class="info-item">
            <span class="info-label">📍 지역</span>
            <span class="info-val">${region}</span>
          </div>
          <div class="info-item">
            <span class="info-label">👤 신고자</span>
            <span class="info-val">${reporterType}</span>
          </div>
          <div class="info-item">
            <span class="info-label">⏱️ 처리기간</span>
            <span class="info-val">${duration}</span>
          </div>
        </div>
      </div>
      <div class="card-footer-meta">
        <span>위반금액: <strong>${amount}</strong></span>
        <span class="meta-action">조치: ${actionResult}</span>
      </div>
    `;

    fragment.appendChild(card);
  });

  cardsContainerEl.appendChild(fragment);
  updatePagination(filteredIncidents.length);
}

/**
 * 페이지네이션 UI 업데이트
 */
function updatePagination(totalItems) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  pageInfoEl.textContent = `${currentPage} / ${totalPages} 페이지`;

  btnPrevPageEl.disabled = currentPage <= 1;
  btnNextPageEl.disabled = currentPage >= totalPages;
}

// DOMContentLoaded 시 실행
document.addEventListener('DOMContentLoaded', () => {
  loadData();
});
