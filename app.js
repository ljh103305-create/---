// 데이터 구조
// {
//   id: timestamp,
//   name: 계산이름 (선택사항),
//   principal: 원금,
//   rate: 이자율,
//   years: 기간,
//   type: 이자방식 (simple/compound),
//   interest: 이자액,
//   totalAmount: 만기금액,
//   createdAt: 계산일
// }

class DepositCalculator {
    constructor() {
        this.storageKey = 'depositCalculations';
        this.history = this.loadHistory();
        this.chart = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.renderHistory();
    }

    // DOM 요소 초기화
    initializeElements() {
        this.form = document.getElementById('calculatorForm');
        this.principalInput = document.getElementById('principal');
        this.rateInput = document.getElementById('rate');
        this.yearsInput = document.getElementById('years');
        this.interestTypeSelect = document.getElementById('interestType');
        this.calcNameInput = document.getElementById('calcName');
        
        this.resultCard = document.getElementById('resultCard');
        this.resultPrincipal = document.getElementById('resultPrincipal');
        this.resultInterest = document.getElementById('resultInterest');
        this.resultTotal = document.getElementById('resultTotal');
        this.graphCard = document.getElementById('graphCard');
        
        this.historyList = document.getElementById('historyList');
        this.sortBy = document.getElementById('sortBy');
        this.filterType = document.getElementById('filterType');
        this.clearAllBtn = document.getElementById('clearAllBtn');
    }

    // 이벤트 리스너 연결
    attachEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleCalculate(e));
        this.sortBy.addEventListener('change', () => this.renderHistory());
        this.filterType.addEventListener('change', () => this.renderHistory());
        this.clearAllBtn.addEventListener('click', () => this.clearAllHistory());
    }

    // 로컬스토리지에서 내역 불러오기
    loadHistory() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('로컬스토리지 데이터를 불러오는데 실패했습니다:', error);
            this.showAlert('오류', '저장된 데이터를 불러오는데 실패했습니다.');
            return [];
        }
    }

    // 로컬스토리지에 내역 저장
    saveHistory() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.history));
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                this.showAlert('오류', '저장 공간이 부족합니다. 일부 내역을 삭제해주세요.');
            } else {
                console.error('로컬스토리지에 저장하는데 실패했습니다:', error);
                this.showAlert('오류', '데이터 저장에 실패했습니다.');
            }
        }
    }

    // 커스텀 알림창 표시
    showAlert(title, message, type = 'error') {
        // 기존 알림창이 있으면 제거
        const existingAlert = document.querySelector('.custom-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // 새로운 알림창 생성
        const alertDiv = document.createElement('div');
        alertDiv.className = 'custom-alert';
        alertDiv.innerHTML = `
            <div class="alert-content">
                <div class="alert-header">
                    <span class="alert-title">${title}</span>
                    <button class="alert-close" onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
                </div>
                <div class="alert-message">${message}</div>
            </div>
        `;

        document.body.appendChild(alertDiv);

        // 5초 후 자동 제거
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);

        // 애니메이션 적용
        setTimeout(() => alertDiv.classList.add('show'), 10);
    }

    // 계산 처리
    handleCalculate(event) {
        event.preventDefault();

        const principal = parseFloat(this.principalInput.value);
        const rate = parseFloat(this.rateInput.value);
        const years = parseFloat(this.yearsInput.value);
        const interestType = this.interestTypeSelect.value;
        const calcName = this.calcNameInput.value.trim();

        // 유효성 검사
        if (!this.validateInput(principal, rate, years)) {
            return;
        }

        // 계산
        const result = this.calculate(principal, rate, years, interestType);

        // 결과 표시
        this.displayResult(principal, result);

        // 그래프 그리기
        this.drawChart(principal, rate, years, interestType);

        // 내역 저장
        this.saveCalculation(principal, rate, years, interestType, result, calcName);

        // 내역 다시 렌더링
        this.renderHistory();

        // 폼 초기화
        this.calcNameInput.value = '';
    }

    // 입력값 유효성 검사 (개선)
    validateInput(principal, rate, years) {
        // 빈 값 체크
        if (this.principalInput.value.trim() === '') {
            this.showAlert('입력 오류', '원금을 입력해주세요.');
            this.principalInput.focus();
            return false;
        }

        if (this.rateInput.value.trim() === '') {
            this.showAlert('입력 오류', '이자율을 입력해주세요.');
            this.rateInput.focus();
            return false;
        }

        if (this.yearsInput.value.trim() === '') {
            this.showAlert('입력 오류', '기간을 입력해주세요.');
            this.yearsInput.focus();
            return false;
        }

        // 숫자 변환 실패 체크
        if (isNaN(principal) || isNaN(rate) || isNaN(years)) {
            this.showAlert('입력 오류', '모든 값은 숫자로 입력해주세요.');
            return false;
        }

        // 범위 체크
        if (principal <= 0) {
            this.showAlert('입력 오류', '원금은 0보다 큰 숫자를 입력해주세요.');
            this.principalInput.focus();
            return false;
        }

        if (rate <= 0 || rate > 100) {
            this.showAlert('입력 오류', '이자율은 0보다 크고 100 이하의 숫자를 입력해주세요.');
            this.rateInput.focus();
            return false;
        }

        if (years <= 0) {
            this.showAlert('입력 오류', '기간은 0보다 큰 숫자를 입력해주세요.');
            this.yearsInput.focus();
            return false;
        }

        return true;
    }

    // 이자 계산
    calculate(principal, rate, years, interestType) {
        let totalAmount, interest;

        if (interestType === 'simple') {
            // 단리 계산
            interest = Math.round(principal * (rate / 100) * years);
            totalAmount = principal + interest;
        } else {
            // 복리 계산
            totalAmount = Math.round(principal * Math.pow(1 + rate / 100, years));
            interest = totalAmount - principal;
        }

        return { interest, totalAmount };
    }

    // 단계별 계산 데이터 생성 (그래프용)
    generateChartData(principal, rate, years, interestType) {
        const data = [];
        
        for (let year = 0; year <= Math.ceil(years); year++) {
            let amount;
            if (interestType === 'simple') {
                amount = year === 0 ? principal : principal + (principal * (rate / 100) * year);
            } else {
                amount = principal * Math.pow(1 + rate / 100, year);
            }
            data.push({
                year,
                amount: Math.round(amount),
                interest: Math.round(amount - principal)
            });
        }
        
        return data;
    }

    // 그래프 그리기
    drawChart(principal, rate, years, interestType) {
        const ctx = document.getElementById('interestChart');
        if (!ctx) return;

        const chartData = this.generateChartData(principal, rate, years, interestType);

        // 기존 차트 제거
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.map(d => `${d.year}년`),
                datasets: [
                    {
                        label: '누적 금액',
                        data: chartData.map(d => d.amount),
                        borderColor: '#4a90e2',
                        backgroundColor: 'rgba(74, 144, 226, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: '이자액',
                        data: chartData.map(d => d.interest),
                        borderColor: '#50c878',
                        backgroundColor: 'rgba(80, 200, 120, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 14,
                                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                            },
                            padding: 15
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed.y;
                                return `${context.dataset.label}: ${this.formatCurrency(value)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '경과 기간',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '금액',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            callback: (value) => {
                                if (value >= 100000000) {
                                    return (value / 100000000).toFixed(1) + '억원';
                                } else if (value >= 10000) {
                                    return (value / 10000).toFixed(0) + '만원';
                                }
                                return value + '원';
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });

        this.graphCard.style.display = 'block';
    }

    // 결과 표시
    displayResult(principal, result) {
        this.resultPrincipal.textContent = this.formatCurrency(principal);
        this.resultInterest.textContent = this.formatCurrency(result.interest);
        this.resultTotal.textContent = this.formatCurrency(result.totalAmount);
        
        this.resultCard.style.display = 'block';
        this.resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // 계산 결과 저장
    saveCalculation(principal, rate, years, interestType, result, name = '') {
        const calculation = {
            id: new Date().toISOString(),
            name: name || '',
            principal,
            rate,
            years,
            type: interestType,
            interest: result.interest,
            totalAmount: result.totalAmount,
            createdAt: new Date().toISOString().split('T')[0]
        };

        this.history.unshift(calculation);
        this.saveHistory();
    }

    // 화폐 형식으로 변환
    formatCurrency(amount) {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(amount);
    }

    // 화폐 형식으로 변환 (요약용)
    formatCurrencyShort(amount) {
        if (amount >= 100000000) {
            return (amount / 100000000).toFixed(1) + '억원';
        } else if (amount >= 10000) {
            return (amount / 10000).toFixed(0) + '만원';
        } else {
            return this.formatCurrency(amount);
        }
    }

    // 날짜 형식으로 변환
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // 내역 렌더링
    renderHistory() {
        const filtered = this.filterHistory();
        const sorted = this.sortHistory(filtered);

        if (sorted.length === 0) {
            this.historyList.innerHTML = '<p class="empty-message">아직 계산 내역이 없습니다.</p>';
            return;
        }

        this.historyList.innerHTML = sorted.map(item => this.createHistoryItemHTML(item)).join('');
        
        // 삭제, 수정, 이름 변경 버튼에 이벤트 리스너 추가
        this.attachHistoryItemListeners();
    }

    // 내역 필터링
    filterHistory() {
        const filterValue = this.filterType.value;
        
        if (filterValue === 'all') {
            return this.history;
        }
        
        return this.history.filter(item => item.type === filterValue);
    }

    // 내역 정렬
    sortHistory(items) {
        const sortValue = this.sortBy.value;
        
        const sorted = [...items].sort((a, b) => {
            switch (sortValue) {
                case 'date':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'years':
                    return b.years - a.years;
                case 'rate':
                    return b.rate - a.rate;
                case 'amount':
                    return b.totalAmount - a.totalAmount;
                default:
                    return 0;
            }
        });
        
        return sorted;
    }

    // 내역 항목 HTML 생성
    createHistoryItemHTML(item) {
        const badgeClass = item.type === 'simple' ? 'badge-simple' : 'badge-compound';
        const badgeText = item.type === 'simple' ? '단리' : '복리';
        const nameDisplay = item.name ? 
            `<span class="history-item-name">${this.escapeHtml(item.name)}</span>` : 
            '<span class="history-item-name-placeholder">이름 없음</span>';
        
        return `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-header">
                    <div>
                        ${nameDisplay}
                        <span class="badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <span class="history-item-date">${this.formatDate(item.createdAt)}</span>
                </div>
                <div class="history-item-details">
                    <div class="detail-item">
                        <span class="detail-label">원금</span>
                        <span class="detail-value">${this.formatCurrency(item.principal)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">이자율</span>
                        <span class="detail-value">${item.rate.toFixed(2)}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">기간</span>
                        <span class="detail-value">${item.years}년</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">이자액</span>
                        <span class="detail-value" style="color: var(--secondary-color);">${this.formatCurrency(item.interest)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">만기 금액</span>
                        <span class="detail-value" style="color: var(--primary-color); font-size: 1.2rem;">${this.formatCurrency(item.totalAmount)}</span>
                    </div>
                </div>
                <div class="history-item-actions">
                    <button class="btn btn-edit" onclick="calculator.renameCalculation('${item.id}')">이름 변경</button>
                    <button class="btn btn-edit" onclick="calculator.editCalculation('${item.id}')">수정</button>
                    <button class="btn btn-delete btn-danger" onclick="calculator.deleteCalculation('${item.id}')">삭제</button>
                </div>
            </div>
        `;
    }

    // HTML 이스케이프
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // 내역 항목 버튼에 이벤트 리스너 추가
    attachHistoryItemListeners() {
        // 이미 onclick으로 연결되어 있으므로 추가 작업 불필요
    }

    // 이름 변경
    renameCalculation(id) {
        const item = this.history.find(calc => calc.id === id);
        
        if (!item) {
            this.showAlert('오류', '항목을 찾을 수 없습니다.');
            return;
        }

        const newName = prompt('새로운 이름을 입력하세요:', item.name || '');
        
        if (newName === null) {
            // 취소한 경우
            return;
        }

        if (newName.trim() === '') {
            item.name = '';
        } else {
            item.name = newName.trim();
        }

        this.saveHistory();
        this.renderHistory();
    }

    // 내역 수정
    editCalculation(id) {
        const item = this.history.find(calc => calc.id === id);
        
        if (!item) {
            this.showAlert('오류', '항목을 찾을 수 없습니다.');
            return;
        }

        // 폼에 값 채우기
        this.principalInput.value = item.principal;
        this.rateInput.value = item.rate;
        this.yearsInput.value = item.years;
        this.interestTypeSelect.value = item.type;
        this.calcNameInput.value = item.name || '';

        // 해당 항목 삭제
        this.deleteCalculation(id, false);

        // 스크롤을 폼으로 이동
        this.form.scrollIntoView({ behavior: 'smooth' });
        this.principalInput.focus();
    }

    // 내역 삭제
    deleteCalculation(id, confirmNeeded = true) {
        if (confirmNeeded && !confirm('이 계산 내역을 삭제하시겠습니까?')) {
            return;
        }

        this.history = this.history.filter(calc => calc.id !== id);
        this.saveHistory();
        this.renderHistory();
    }

    // 전체 초기화
    clearAllHistory() {
        if (!confirm('모든 계산 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            return;
        }

        this.history = [];
        this.saveHistory();
        this.renderHistory();
        this.resultCard.style.display = 'none';
        this.graphCard.style.display = 'none';
        
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

// 앱 초기화
let calculator;
document.addEventListener('DOMContentLoaded', () => {
    calculator = new DepositCalculator();
});
