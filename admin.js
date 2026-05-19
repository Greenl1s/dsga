// Глобальные переменные
let equipmentData = [];
let currentEditId = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, есть ли пароль в localStorage
    const isAuthenticated = localStorage.getItem('equipment_auth');
    if (!isAuthenticated && !window.location.pathname.includes('card.html')) {
        showLoginModal();
    } else {
        loadData();
    }
});

// Показать окно входа
function showLoginModal() {
    const password = prompt('Введите пароль для доступа к админке:');
    if (password === 'admin123') {
        localStorage.setItem('equipment_auth', 'true');
        loadData();
    } else {
        alert('Неверный пароль!');
        // Если не админка и не карточка, перенаправляем на карточку или показываем ошибку
        if (!window.location.pathname.includes('card.html')) {
            document.body.innerHTML = '<div class="container"><h1>Доступ запрещён</h1><p>Неверный пароль.</p></div>';
        }
    }
}

// Загрузка данных
async function loadData() {
    try {
        const response = await fetch('data.json?_=' + Date.now());
        const data = await response.json();
        equipmentData = data.equipment || [];
        renderTable();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        document.getElementById('tableBody').innerHTML = '<tr><td colspan="10">Ошибка загрузки данных</td></tr>';
    }
}

// Сохранение данных
async function saveData() {
    const dataToSave = { equipment: equipmentData, password: 'admin123' };
    // В реальном проекте здесь нужно отправлять данные на сервер
    // Для GitHub Pages данные сохраняются через скачивание файла
    const dataStr = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
    alert('Данные сохранены! Скачайте файл data.json и загрузите его на GitHub.');
}

// Рендер таблицы
function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    // Поиск и фильтрация
    const searchText = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const docFilter = document.getElementById('docFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    let filtered = [...equipmentData];
    
    if (searchText) {
        filtered = filtered.filter(item => 
            item.name.toLowerCase().includes(searchText) ||
            item.serial_number.toLowerCase().includes(searchText) ||
            item.model.toLowerCase().includes(searchText)
        );
    }
    
    if (docFilter) {
        filtered = filtered.filter(item => item.doc_type === docFilter);
    }
    
    if (statusFilter) {
        const today = new Date().toISOString().split('T')[0];
        if (statusFilter === 'valid') {
            filtered = filtered.filter(item => !item.valid_until || item.valid_until >= today);
        } else if (statusFilter === 'expired') {
            filtered = filtered.filter(item => item.valid_until && item.valid_until < today);
        }
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10">Нет данных</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(item => {
        const isExpired = item.valid_until && item.valid_until < new Date().toISOString().split('T')[0];
        const statusClass = isExpired ? 'status-expired' : 'status-valid';
        const statusText = isExpired ? 'Просрочен' : 'Действителен';
        
        // Генерируем QR-код
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin + '/card.html?id=' + item.id)}`;
        
        return `
            <tr>
                <td>${item.id}</td>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.serial_number)}</td>
                <td>${escapeHtml(item.model)}</td>
                <td>${escapeHtml(item.doc_type)}</td>
                <td>${item.verification_date || '-'}</td>
                <td>${item.valid_until || 'Бессрочно'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td><img src="${qrUrl}" class="qr-code" alt="QR" onclick="viewCard(${item.id})" title="Смотреть карточку"></td>
                <td class="action-buttons">
                    <button class="btn btn-primary" onclick="editItem(${item.id})">✏️</button>
                    <button class="btn btn-danger" onclick="deleteItem(${item.id})">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Добавить прибор
function addItem() {
    currentEditId = null;
    document.getElementById('modalTitle').textContent = 'Добавить прибор';
    document.getElementById('itemName').value = '';
    document.getElementById('itemSerial').value = '';
    document.getElementById('itemModel').value = '';
    document.getElementById('itemDocType').value = 'Поверка';
    document.getElementById('itemVerifDate').value = '';
    document.getElementById('itemValidUntil').value = '';
    document.getElementById('itemDocLink').value = '';
    document.getElementById('itemInfo').value = '';
    document.getElementById('editModal').classList.add('active');
}

// Редактировать прибор
function editItem(id) {
    const item = equipmentData.find(i => i.id === id);
    if (!item) return;
    
    currentEditId = id;
    document.getElementById('modalTitle').textContent = 'Редактировать прибор';
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemSerial').value = item.serial_number;
    document.getElementById('itemModel').value = item.model;
    document.getElementById('itemDocType').value = item.doc_type;
    document.getElementById('itemVerifDate').value = item.verification_date || '';
    document.getElementById('itemValidUntil').value = item.valid_until || '';
    document.getElementById('itemDocLink').value = item.doc_link || '';
    document.getElementById('itemInfo').value = item.additional_info || '';
    document.getElementById('editModal').classList.add('active');
}

// Сохранить прибор
function saveItem() {
    const item = {
        id: currentEditId || (equipmentData.length > 0 ? Math.max(...equipmentData.map(i => i.id)) + 1 : 1),
        name: document.getElementById('itemName').value,
        serial_number: document.getElementById('itemSerial').value,
        model: document.getElementById('itemModel').value,
        doc_type: document.getElementById('itemDocType').value,
        verification_date: document.getElementById('itemVerifDate').value,
        valid_until: document.getElementById('itemValidUntil').value,
        doc_link: document.getElementById('itemDocLink').value,
        additional_info: document.getElementById('itemInfo').value
    };
    
    if (currentEditId === null) {
        equipmentData.push(item);
    } else {
        const index = equipmentData.findIndex(i => i.id === currentEditId);
        if (index !== -1) equipmentData[index] = item;
    }
    
    closeModal();
    renderTable();
    saveData();
}

// Удалить прибор
function deleteItem(id) {
    if (confirm('Удалить прибор?')) {
        equipmentData = equipmentData.filter(i => i.id !== id);
        renderTable();
        saveData();
    }
}

// Закрыть модальное окно
function closeModal() {
    document.getElementById('editModal').classList.remove('active');
}

// Просмотр карточки прибора
function viewCard(id) {
    window.open(`card.html?id=${id}`, '_blank');
}

// Сортировка таблицы
let sortColumn = null;
let sortDirection = 'asc';

function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    equipmentData.sort((a, b) => {
        let valA = a[column] || '';
        let valB = b[column] || '';
        if (sortDirection === 'asc') {
            return valA > valB ? 1 : -1;
        } else {
            return valA < valB ? 1 : -1;
        }
    });
    
    renderTable();
}

// Экспорт в CSV
function exportToCSV() {
    const headers = ['ID', 'Наименование', 'Серийный номер', 'Модель', 'Тип документа', 'Дата поверки', 'Действителен до', 'Ссылка'];
    const rows = equipmentData.map(item => [
        item.id,
        item.name,
        item.serial_number,
        item.model,
        item.doc_type,
        item.verification_date,
        item.valid_until || 'Бессрочно',
        item.doc_link
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'equipment.csv');
    link.click();
    URL.revokeObjectURL(url);
}

// Функция для защиты от XSS
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}