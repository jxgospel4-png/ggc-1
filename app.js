/**
 * 지자체 협력사업 심사 시스템 애플리케이션 (app.js)
 */

// 로컬 파일 직접 열기(file://) 등 CORS 상황 대비용 기본 내장 데이터 (신청목록.json과 100% 동일)
const FALLBACK_DATA = [
  {
    "지자체명": "가람군",
    "인구수": 30000,
    "신청액": 250000,
    "예산": 250000,
    "사업명": "가람군 청년 농촌 정착 지원 사업"
  },
  {
    "지자체명": "나봄시",
    "인구수": 45000,
    "신청액": 500000,
    "예산": 500000,
    "사업명": "나봄시 스마트 관광 플랫폼 구축"
  },
  {
    "지자체명": "다솔구",
    "인구수": 80000,
    "신청액": 600000,
    "예산": 600000,
    "사업명": "다솔구 어르신 디지털 친화 도시 조성"
  },
  {
    "지자체명": "라윤시",
    "인구수": 60000,
    "신청액": 700000,
    "예산": 700000,
    "사업명": "라윤시 도심 보행자 안전망 구축"
  },
  {
    "지자체명": "마을군",
    "인구수": 25000,
    "신청액": 200000,
    "예산": 200000,
    "사업명": "마을군 지역화폐 활성화 사업"
  },
  {
    "지자체명": "바람시",
    "인구수": 100000,
    "신청액": 950000,
    "예산": 950000,
    "사업명": "바람시 친환경 에너지 전환 사업"
  },
  {
    "지자체명": "사계구",
    "인구수": 55000,
    "신청액": 600000,
    "예산": 600000,
    "사업명": "사계구 청소년 안심 귀가 시스템"
  },
  {
    "지자체명": "아현시",
    "인구수": 70000,
    "신청액": 650000,
    "예산": 650000,
    "사업명": "아현시 도시재생 거점공간 조성"
  },
  {
    "지자체명": "자연군",
    "인구수": 40000,
    "신청액": 380000,
    "예산": 380000,
    "사업명": "자연군 생태관광 마을 조성"
  },
  {
    "지자체명": "차돌시",
    "인구수": 90000,
    "신청액": 880000,
    "예산": 880000,
    "사업명": "차돌시 산업단지 디지털 전환 사업"
  }
];

// 상태 관리
let applications = [];
let currentThreshold = 600000; // 기본 한도액: 600,000 천원 (6억원)
let currentFilter = 'all'; // 'all', 'approved', 'rejected'
let searchKeyword = '';

// DOM Elements
const kpiTotalEl = document.getElementById('kpi-total');
const kpiApprovedEl = document.getElementById('kpi-approved');
const kpiRejectedEl = document.getElementById('kpi-rejected');
const kpiBudgetEl = document.getElementById('kpi-budget');

const thresholdSlider = document.getElementById('threshold-slider');
const thresholdValText = document.getElementById('threshold-val-text');
const searchInput = document.getElementById('search-input');
const filterTabs = document.querySelectorAll('.filter-tab');

const tabCountAll = document.getElementById('tab-count-all');
const tabCountApproved = document.getElementById('tab-count-approved');
const tabCountRejected = document.getElementById('tab-count-rejected');

const cardsContainer = document.getElementById('cards-container');
const sheetTableBody = document.getElementById('sheet-table-body');
const sheetsSection = document.getElementById('sheets-section');

const btnViewCards = document.getElementById('btn-view-cards');
const btnViewSheets = document.getElementById('btn-view-sheets');
const btnExportCsv = document.getElementById('btn-export-csv');
const btnPrint = document.getElementById('btn-print');

// 데이터 로드
async function loadApplications() {
  try {
    const response = await fetch('신청목록.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    applications = await response.json();
  } catch (error) {
    console.warn('신청목록.json fetch 실패 또는 로컬 파일 모드 감지됨. 백업 데이터를 로드합니다.', error);
    applications = JSON.parse(JSON.stringify(FALLBACK_DATA));
  }
  
  renderApp();
}

// 금액 포맷터
function formatNumber(num) {
  return Number(num).toLocaleString('ko-KR');
}

// 억 단위 환산
function formatInBillion(thousandWon) {
  const won = thousandWon * 1000;
  const billion = (won / 100000000).toFixed(1);
  return `${billion}억`;
}

// 애플리케이션 전체 렌더링
function renderApp() {
  // 1. 심사 판정 및 데이터 가공
  const processedData = applications.map((item, index) => {
    const budget = item.예산 || item.신청액 || 0;
    const isOverLimit = budget > currentThreshold;
    const diff = budget - currentThreshold;
    
    return {
      ...item,
      id: index + 1,
      budget,
      isApproved: !isOverLimit,
      diff: Math.abs(diff),
      isOverLimit
    };
  });

  // 2. 통계 KPI 업데이트
  const totalCount = processedData.length;
  const approvedCount = processedData.filter(d => d.isApproved).length;
  const rejectedCount = processedData.filter(d => !d.isApproved).length;
  const totalBudget = processedData.reduce((sum, d) => sum + d.budget, 0);

  kpiTotalEl.innerHTML = `${totalCount}<small>건</small>`;
  kpiApprovedEl.innerHTML = `${approvedCount}<small>건</small>`;
  kpiRejectedEl.innerHTML = `${rejectedCount}<small>건</small>`;
  kpiBudgetEl.innerHTML = `${formatNumber(totalBudget)}<small>천원</small>`;

  tabCountAll.textContent = totalCount;
  tabCountApproved.textContent = approvedCount;
  tabCountRejected.textContent = rejectedCount;

  // 3. 필터 및 검색 적용
  const filteredData = processedData.filter(item => {
    // 탭 필터
    if (currentFilter === 'approved' && !item.isApproved) return false;
    if (currentFilter === 'rejected' && item.isApproved) return false;

    // 검색어 필터
    if (searchKeyword.trim() !== '') {
      const kw = searchKeyword.trim().toLowerCase();
      const matchGov = item.지자체명.toLowerCase().includes(kw);
      const matchProject = item.사업명.toLowerCase().includes(kw);
      if (!matchGov && !matchProject) return false;
    }

    return true;
  });

  // 4. 카드 렌더링
  renderCards(filteredData);

  // 5. 시트 테이블 렌더링
  renderSheetTable(processedData);
}

// 카드 렌더링 함수
function renderCards(data) {
  cardsContainer.innerHTML = '';

  if (data.length === 0) {
    cardsContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;">
        <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: #94a3b8; margin-bottom: 1rem;"></i>
        <p style="font-size: 1.1rem; font-weight: 600;">조건에 해당하는 신청 내역이 없습니다.</p>
        <p style="font-size: 0.9rem; margin-top: 0.3rem;">검색어나 한도액 설정을 조정해 보세요.</p>
      </div>
    `;
    return;
  }

  data.forEach(item => {
    const card = document.createElement('div');
    const isApproved = item.isApproved;
    card.className = `app-card ${isApproved ? 'card-approved' : 'card-rejected'}`;

    const statusBadgeHtml = isApproved
      ? `<span class="status-tag approved"><i class="fa-solid fa-circle-check"></i> 심사 승인 (적합)</span>`
      : `<span class="status-tag rejected"><i class="fa-solid fa-circle-xmark"></i> 한도 초과 (반려)</span>`;

    const statusReasonHtml = isApproved
      ? `<i class="fa-solid fa-check-double"></i> 예산 기준(${formatNumber(currentThreshold)}천원) 이하 정상 승인`
      : `<i class="fa-solid fa-triangle-exclamation"></i> 한도액 초과: ${formatNumber(item.diff)}천원 초과 신청됨`;

    card.innerHTML = `
      <div class="card-header-status">
        <div class="gov-name-badge">
          <i class="fa-solid fa-building-columns"></i>
          <span>${item.지자체명}</span>
        </div>
        ${statusBadgeHtml}
      </div>
      
      <div class="card-body">
        <h3 class="project-title">${item.사업명}</h3>
        
        <div class="card-meta-list">
          <div class="meta-item">
            <span class="meta-label">관할 인구수</span>
            <span class="meta-value">${formatNumber(item.인구수)}명</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">예산 규모</span>
            <span class="meta-value">${formatInBillion(item.budget)}원</span>
          </div>
        </div>

        <div class="card-budget-box">
          <div>
            <div class="budget-detail-label">신청 예산</div>
            <div style="font-size: 0.75rem; color: #64748b;">(단위: 천원)</div>
          </div>
          <div class="budget-amount">
            ${formatNumber(item.budget)} <span style="font-size: 0.85rem; font-weight: normal; color: #64748b;">천원</span>
          </div>
        </div>
      </div>

      <div class="card-footer-reason">
        ${statusReasonHtml}
      </div>
    `;

    cardsContainer.appendChild(card);
  });
}

// 구글 시트 테이블 렌더링
function renderSheetTable(data) {
  sheetTableBody.innerHTML = '';

  data.forEach((item, index) => {
    const tr = document.createElement('tr');
    const isApproved = item.isApproved;

    const diffText = isApproved
      ? `-${formatNumber(item.diff)} (여유)`
      : `+${formatNumber(item.diff)} (초과)`;

    tr.innerHTML = `
      <td class="col-num">${index + 1}</td>
      <td style="font-weight: 700;">${item.지자체명}</td>
      <td>${formatNumber(item.인구수)}</td>
      <td style="font-weight: 600; color: #1e293b;">${item.사업명}</td>
      <td style="font-weight: 700; font-family: 'Inter', sans-serif;">${formatNumber(item.budget)}</td>
      <td>${formatInBillion(item.budget)}원</td>
      <td>
        <span class="table-badge ${isApproved ? 'approved' : 'rejected'}">
          ${isApproved ? '승인' : '반려'}
        </span>
      </td>
      <td style="color: ${isApproved ? '#059669' : '#dc2626'}; font-weight: 600; font-family: 'Inter', sans-serif;">
        ${diffText}
      </td>
    `;
    sheetTableBody.appendChild(tr);
  });
}

// 이벤트 리스너 설정
function initEvents() {
  // 1. 한도액 슬라이더
  thresholdSlider.addEventListener('input', (e) => {
    currentThreshold = parseInt(e.target.value, 10);
    thresholdValText.textContent = formatNumber(currentThreshold);
    renderApp();
  });

  // 2. 검색창
  searchInput.addEventListener('input', (e) => {
    searchKeyword = e.target.value;
    renderApp();
  });

  // 3. 필터 탭
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderApp();
    });
  });

  // 4. 뷰 전환
  btnViewCards.addEventListener('click', () => {
    btnViewCards.classList.add('active');
    btnViewSheets.classList.remove('active');
    cardsContainer.style.display = 'grid';
    sheetsSection.style.display = 'none';
  });

  btnViewSheets.addEventListener('click', () => {
    btnViewSheets.classList.add('active');
    btnViewCards.classList.remove('active');
    cardsContainer.style.display = 'none';
    sheetsSection.style.display = 'block';
  });

  // 5. CSV 내보내기
  btnExportCsv.addEventListener('click', () => {
    exportToCsv();
  });

  // 6. 인쇄 / PDF
  btnPrint.addEventListener('click', () => {
    window.print();
  });
}

// CSV 파일 다운로드 로직
function exportToCsv() {
  const headers = ["번호", "지자체명", "인구수", "사업명", "신청예산(천원)", "예산환산(억원)", "심사판정", "초과여유액(천원)"];
  const rows = applications.map((item, idx) => {
    const budget = item.예산 || item.신청액 || 0;
    const isApproved = budget <= currentThreshold;
    const diff = isApproved ? `-${currentThreshold - budget}` : `+${budget - currentThreshold}`;
    return [
      idx + 1,
      `"${item.지자체명}"`,
      item.인구수,
      `"${item.사업명.replace(/"/g, '""')}"`,
      budget,
      `"${formatInBillion(budget)}원"`,
      isApproved ? "승인" : "반려",
      `"${diff}"`
    ];
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `협력사업_심사결과대장_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 초기화 시작
document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  loadApplications();
});
