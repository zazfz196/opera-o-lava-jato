// Estado local do painel. A fonte definitiva dos dados continua sendo a API protegida.
const state = {
    bookings: [],
    filtered: []
};

const statusLabels = {
    pending: 'Aguardando',
    confirmed: 'Confirmado',
    completed: 'Concluído',
    cancelled: 'Cancelado'
};

document.addEventListener('DOMContentLoaded', () => {
    setDefaultSunday();
    bindControls();
    loadBookings();
});

function bindControls() {
    document.getElementById('refreshButton').addEventListener('click', loadBookings);
    document.getElementById('exportButton').addEventListener('click', exportCsv);
    document.getElementById('dateFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('searchFilter').addEventListener('input', applyFilters);
    document.getElementById('logoutButton').addEventListener('click', logout);
}

function setDefaultSunday() {
    const date = new Date();
    const daysUntilSunday = (7 - date.getDay()) % 7;
    date.setDate(date.getDate() + daysUntilSunday);
    document.getElementById('dateFilter').value = date.toISOString().split('T')[0];
}

async function loadBookings() {
    setMessage('');
    try {
        const response = await fetch('/api/admin/agendamentos');
        if (response.status === 401) {
            window.location.replace('/login.html');
            return;
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Não foi possível carregar a agenda.');
        state.bookings = result;
        applyFilters();
    } catch (error) {
        state.bookings = [];
        applyFilters();
        setMessage(error.message);
    }
}

function applyFilters() {
    const date = document.getElementById('dateFilter').value;
    const status = document.getElementById('statusFilter').value;
    const query = document.getElementById('searchFilter').value.trim().toLowerCase();

    state.filtered = state.bookings.filter(booking => {
        const matchesDate = !date || booking.data === date;
        const matchesStatus = !status || booking.status === status;
        const haystack = `${booking.nome} ${booking.telefone} ${booking.veiculo || ''}`.toLowerCase();
        return matchesDate && matchesStatus && (!query || haystack.includes(query));
    });

    render();
}

function render() {
    renderStats();
    renderTable();
}

function renderStats() {
    const active = state.bookings.filter(item => item.status !== 'cancelled');
    document.getElementById('totalStat').textContent = state.bookings.length;
    document.getElementById('pendingStat').textContent = state.bookings.filter(item => item.status === 'pending').length;
    document.getElementById('confirmedStat').textContent = state.bookings.filter(item => item.status === 'confirmed').length;
    const revenue = active.reduce((sum, item) => sum + Number(item.preco || 0), 0);
    document.getElementById('revenueStat').textContent = currency(revenue);
}

function renderTable() {
    const body = document.getElementById('bookingsBody');
    const empty = document.getElementById('emptyState');
    body.replaceChildren();

    state.filtered
        .sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`))
        .forEach(booking => body.appendChild(createRow(booking)));

    empty.hidden = state.filtered.length > 0;
    document.getElementById('resultCount').textContent =
        `${state.filtered.length} ${state.filtered.length === 1 ? 'solicitação' : 'solicitações'}`;

    const activeForDay = state.filtered.filter(item => item.status !== 'cancelled').length;
    document.getElementById('capacityLabel').textContent = `${activeForDay} de 4 carros`;
}

function createRow(booking) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><strong>${escapeHtml(booking.horario)}</strong><br><small>${formatDate(booking.data)}</small></td>
        <td class="client-cell"><strong>${escapeHtml(booking.nome)}</strong><a href="tel:+55${escapeHtml(booking.telefone)}">${formatPhone(booking.telefone)}</a></td>
        <td>${escapeHtml(booking.veiculo || 'Não informado')}</td>
        <td class="service-cell"><strong>${escapeHtml(booking.servicoNome || booking.servico)}</strong><span>${escapeHtml(booking.duracao || '')}</span></td>
        <td><strong>${currency(booking.preco)}</strong></td>
        <td><span class="status-badge status-${escapeHtml(booking.status)}">${statusLabels[booking.status] || booking.status}</span></td>
        <td><div class="booking-actions">
            <select class="status-select" aria-label="Alterar status de ${escapeHtml(booking.nome)}">
                ${Object.entries(statusLabels).map(([value, label]) =>
                    `<option value="${value}" ${value === booking.status ? 'selected' : ''}>${label}</option>`
                ).join('')}
            </select>
            <button class="delete-button" type="button" aria-label="Excluir agendamento de ${escapeHtml(booking.nome)}">
                <i class="fas fa-trash-alt" aria-hidden="true"></i>
                Excluir
            </button>
        </div></td>
    `;

    row.querySelector('.status-select').addEventListener('change', event => {
        updateStatus(booking.id, event.target.value);
    });
    row.querySelector('.delete-button').addEventListener('click', () => {
        deleteBooking(booking);
    });
    return row;
}

async function updateStatus(id, status) {
    setMessage('');
    try {
        const response = await fetch(`/api/admin/agendamentos/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (response.status === 401) {
            window.location.replace('/login.html');
            return;
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar o status.');
        await loadBookings();
    } catch (error) {
        setMessage(error.message);
        await loadBookings();
    }
}

async function deleteBooking(booking) {
    // A confirmação evita que um clique acidental remova definitivamente um registro.
    const description = `${booking.nome}, ${formatDate(booking.data)} às ${booking.horario}`;
    if (!window.confirm(`Excluir permanentemente o agendamento de ${description}?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }

    setMessage('');
    try {
        const response = await fetch(`/api/admin/agendamentos/${encodeURIComponent(booking.id)}`, {
            method: 'DELETE'
        });
        if (response.status === 401) {
            window.location.replace('/login.html');
            return;
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Não foi possível excluir o agendamento.');
        await loadBookings();
    } catch (error) {
        setMessage(error.message);
    }
}

async function logout() {
    try {
        await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
        window.location.replace('/login.html');
    }
}

function exportCsv() {
    if (!state.filtered.length) {
        setMessage('Não há agendamentos para exportar com os filtros atuais.');
        return;
    }

    const rows = [
        ['Data', 'Horário', 'Nome', 'Telefone', 'Veículo', 'Serviço', 'Valor', 'Status', 'Observações'],
        ...state.filtered.map(item => [
            item.data, item.horario, item.nome, item.telefone, item.veiculo || '',
            item.servicoNome || item.servico, item.preco, statusLabels[item.status], item.observacoes || ''
        ])
    ];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    link.download = `agendamentos-lava-jato-sol-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

function setMessage(message) {
    const element = document.getElementById('dashboardMessage');
    element.textContent = message;
    element.hidden = !message;
}

function currency(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
    if (!value) return '';
    return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

function formatPhone(value) {
    const digits = String(value || '');
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return digits;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
