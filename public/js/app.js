const API_URL = window.location.origin + '/api';
let token = localStorage.getItem('token');
let currentUser = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        loadDashboard();
    } else {
        showLogin();
    }

    // Event listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
});

// Funções de autenticação
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            token = data.token;
            currentUser = data.user;
            localStorage.setItem('token', token);
            loadDashboard();
        } else {
            alert(data.error || 'Erro ao fazer login');
        }
    } catch (error) {
        alert('Erro de conexão');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Conta criada com sucesso! Faça login.');
            showLogin();
        } else {
            alert(data.error || 'Erro ao criar conta');
        }
    } catch (error) {
        alert('Erro de conexão');
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    showLogin();
}

// Funções de navegação
function showLogin() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('registerSection').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('navMenu').style.display = 'none';
    document.getElementById('userDropdown').style.display = 'none';
}

function showRegister() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('registerSection').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
}

function loadDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('registerSection').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('navMenu').style.display = 'flex';
    document.getElementById('userDropdown').style.display = 'block';
    document.getElementById('usernameDisplay').textContent = currentUser?.username || 'Usuário';

    showSection('dashboard');
    loadDashboardData();
}

function showSection(section) {
    // Esconder todas as seções
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    
    // Mostrar seção selecionada
    document.getElementById(`${section}Section`).style.display = 'block';
    
    // Carregar dados da seção
    switch(section) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'products':
            loadProducts();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'suppliers':
            loadSuppliers();
            break;
        case 'sales':
            loadSales();
            break;
        case 'purchases':
            loadPurchases();
            break;
    }
}

// Funções de API
async function apiRequest(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        },
        ...options
    };

    const response = await fetch(`${API_URL}${endpoint}`, config);
    return response;
}

// Dashboard
async function loadDashboardData() {
    try {
        const [productsRes, customersRes, lowStockRes] = await Promise.all([
            apiRequest('/products'),
            apiRequest('/customers'),
            apiRequest('/products/low-stock')
        ]);

        if (productsRes.ok) {
            const productsData = await productsRes.json();
            document.getElementById('totalProducts').textContent = productsData.total;
        }

        if (customersRes.ok) {
            const customersData = await customersRes.json();
            document.getElementById('totalCustomers').textContent = customersData.total;
        }

        if (lowStockRes.ok) {
            const lowStockData = await lowStockRes.json();
            document.getElementById('lowStockProducts').textContent = lowStockData.length;
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

// Produtos
async function loadProducts() {
    try {
        const response = await apiRequest('/products');
        if (response.ok) {
            const data = await response.json();
            displayProducts(data.products);
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

function displayProducts(products) {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';

    products.forEach(product => {
        const row = `
            <tr>
                <td>${product.name}</td>
                <td>${product.sku}</td>
                <td>R$ ${parseFloat(product.price).toFixed(2)}</td>
                <td>${product.stock_quantity}</td>
                <td>${product.supplier_name || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Clientes
async function loadCustomers() {
    try {
        const response = await apiRequest('/customers');
        if (response.ok) {
            const data = await response.json();
            displayCustomers(data.customers);
        }
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
    }
}

function displayCustomers(customers) {
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = '';

    customers.forEach(customer => {
        const row = `
            <tr>
                <td>${customer.name}</td>
                <td>${customer.email || '-'}</td>
                <td>${customer.phone || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editCustomer(${customer.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Fornecedores
async function loadSuppliers() {
    try {
        const response = await apiRequest('/suppliers');
        if (response.ok) {
            const data = await response.json();
            displaySuppliers(data.suppliers);
        }
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
    }
}

function displaySuppliers(suppliers) {
    const tbody = document.getElementById('suppliersTableBody');
    tbody.innerHTML = '';

    suppliers.forEach(supplier => {
        const row = `
            <tr>
                <td>${supplier.name}</td>
                <td>${supplier.email || '-'}</td>
                <td>${supplier.phone || '-'}</td>
                <td>${supplier.cnpj || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editSupplier(${supplier.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSupplier(${supplier.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Vendas
async function loadSales() {
    try {
        const response = await apiRequest('/sales');
        if (response.ok) {
            const data = await response.json();
            displaySales(data.sales);
        }
    } catch (error) {
        console.error('Erro ao carregar vendas:', error);
    }
}

function displaySales(sales) {
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';

    sales.forEach(sale => {
        const row = `
            <tr>
                <td>${sale.id}</td>
                <td>${sale.customer_name || 'Cliente não informado'}</td>
                <td>R$ ${parseFloat(sale.total_amount).toFixed(2)}</td>
                <td>${new Date(sale.sale_date).toLocaleDateString('pt-BR')}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewSale(${sale.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSale(${sale.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Compras
async function loadPurchases() {
    try {
        const response = await apiRequest('/purchases');
        if (response.ok) {
            const data = await response.json();
            displayPurchases(data.purchases);
        }
    } catch (error) {
        console.error('Erro ao carregar compras:', error);
    }
}

function displayPurchases(purchases) {
    const tbody = document.getElementById('purchasesTableBody');
    tbody.innerHTML = '';

    purchases.forEach(purchase => {
        const row = `
            <tr>
                <td>${purchase.id}</td>
                <td>${purchase.supplier_name || 'Fornecedor não informado'}</td>
                <td>R$ ${parseFloat(purchase.total_amount).toFixed(2)}</td>
                <td>
                    <span class="badge ${purchase.status === 'completed' ? 'bg-success' : 'bg-warning'}">
                        ${purchase.status}
                    </span>
                </td>
                <td>${new Date(purchase.purchase_date).toLocaleDateString('pt-BR')}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewPurchase(${purchase.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deletePurchase(${purchase.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Funções auxiliares
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('pt-BR');
}
