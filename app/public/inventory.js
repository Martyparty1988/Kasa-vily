// Globální proměnné pro správu inventáře
let products = [];
let currentProductId = null;

// DOM elementy
const inventorySection = document.getElementById('inventory-section');
const inventoryBody = document.getElementById('inventory-body');
const inventorySearchInput = document.getElementById('inventory-search-input');
const addProductBtn = document.getElementById('add-product-btn');
const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const modalTitle = document.getElementById('modal-title');
const productIdInput = document.getElementById('product-id');
const productNameInput = document.getElementById('product-name');
const productPriceInput = document.getElementById('product-price');
const productStockInput = document.getElementById('product-stock');
const cancelBtn = document.getElementById('cancel-btn');
const confirmModal = document.getElementById('confirm-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const closeButtons = document.querySelectorAll('.close');

// Event listenery
document.addEventListener('DOMContentLoaded', () => {
    // Přepínání navigace pro sklad
    document.getElementById('inventory-link').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('inventory-section');
        loadProducts();
    });

    // Inicializace event listenerů pro správu inventáře
    if (inventorySearchInput) {
        inventorySearchInput.addEventListener('input', filterProducts);
    }

    if (addProductBtn) {
        addProductBtn.addEventListener('click', showAddProductModal);
    }

    if (productForm) {
        productForm.addEventListener('submit', saveProduct);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeProductModal);
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDeleteProduct);
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeConfirmModal);
    }

    // Zavírání modálních oken kliknutím na křížek
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Zavírání modálních oken kliknutím mimo obsah
    window.addEventListener('click', (e) => {
        if (e.target === productModal) {
            closeProductModal();
        }
        if (e.target === confirmModal) {
            closeConfirmModal();
        }
    });
});

/**
 * Načte produkty z API
 */
function loadProducts() {
    // Zobrazení indikátoru načítání
    inventoryBody.innerHTML = '<tr><td colspan="5" class="text-center">Načítání produktů...</td></tr>';
    
    fetch('/api/products')
        .then(response => {
            if (!response.ok) {
                throw new Error('Nepodařilo se načíst produkty');
            }
            return response.json();
        })
        .then(data => {
            products = data;
            renderProducts();
        })
        .catch(error => {
            console.error('Chyba při načítání produktů:', error);
            inventoryBody.innerHTML = `<tr><td colspan="5" class="text-center error">Chyba: ${error.message}</td></tr>`;
        });
}

/**
 * Vykreslí produkty do tabulky
 * @param {Array} filteredProducts - Pole produktů k vykreslení (volitelné)
 */
function renderProducts(filteredProducts) {
    const productsToRender = filteredProducts || products;
    
    // Vyčištění tabulky
    inventoryBody.innerHTML = '';
    
    if (productsToRender.length === 0) {
        inventoryBody.innerHTML = '<tr><td colspan="5" class="text-center">Žádné produkty k zobrazení</td></tr>';
        return;
    }
    
    // Vykreslení produktů
    productsToRender.forEach(product => {
        const row = document.createElement('tr');
        
        // Formátování ceny
        const formattedPrice = new Intl.NumberFormat('cs-CZ', {
            style: 'currency',
            currency: 'CZK',
            minimumFractionDigits: 0
        }).format(product.price);
        
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${formattedPrice}</td>
            <td>${product.stock}</td>
            <td class="actions">
                <button class="edit-btn" data-id="${product.id}">Upravit</button>
                <button class="delete-btn" data-id="${product.id}">Smazat</button>
            </td>
        `;
        
        inventoryBody.appendChild(row);
    });
    
    // Přidání event listenerů pro tlačítka
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            editProduct(parseInt(id));
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            showDeleteConfirmation(parseInt(id));
        });
    });
}

/**
 * Filtruje produkty podle vyhledávacího řetězce
 */
function filterProducts() {
    const searchTerm = inventorySearchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        renderProducts(); // Zobrazit všechny produkty
        return;
    }
    
    // Filtrování produktů
    const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) || 
        product.id.toString().includes(searchTerm)
    );
    
    renderProducts(filtered);
}

/**
 * Zobrazí modální okno pro přidání produktu
 */
function showAddProductModal() {
    modalTitle.textContent = 'Přidat produkt';
    currentProductId = null;
    productForm.reset();
    productModal.style.display = 'block';
    productNameInput.focus();
}

/**
 * Zobrazí modální okno pro úpravu produktu
 * @param {number} id - ID produktu k úpravě
 */
function editProduct(id) {
    const product = products.find(p => p.id === id);
    
    if (!product) {
        console.error(`Produkt s ID ${id} nenalezen`);
        return;
    }
    
    modalTitle.textContent = 'Upravit produkt';
    currentProductId = id;
    productIdInput.value = id;
    productNameInput.value = product.name;
    productPriceInput.value = product.price;
    productStockInput.value = product.stock;
    
    productModal.style.display = 'block';
    productNameInput.focus();
}

/**
 * Uloží produkt (přidání nebo úprava)
 * @param {Event} e - Událost odeslání formuláře
 */
function saveProduct(e) {
    e.preventDefault();
    
    // Získání hodnot z formuláře
    const name = productNameInput.value.trim();
    const price = parseFloat(productPriceInput.value);
    const stock = parseInt(productStockInput.value);
    
    // Validace vstupů
    if (!name) {
        alert('Zadejte název produktu');
        productNameInput.focus();
        return;
    }
    
    if (isNaN(price) || price < 0) {
        alert('Zadejte platnou cenu');
        productPriceInput.focus();
        return;
    }
    
    if (isNaN(stock) || stock < 0) {
        alert('Zadejte platný počet kusů na skladě');
        productStockInput.focus();
        return;
    }
    
    // Vytvoření objektu produktu
    const productData = {
        name,
        price,
        stock
    };
    
    // Určení, zda jde o přidání nebo úpravu
    let url = '/api/products';
    let method = 'POST';
    
    if (currentProductId !== null) {
        url = `/api/products/${currentProductId}`;
        method = 'PUT';
    }
    
    // Odeslání požadavku na server
    fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Nepodařilo se uložit produkt');
        }
        return response.json();
    })
    .then(() => {
        closeProductModal();
        loadProducts(); // Znovu načtení seznamu produktů
    })
    .catch(error => {
        console.error('Chyba při ukládání produktu:', error);
        alert(`Chyba: ${error.message}`);
    });
}

/**
 * Zobrazí potvrzovací dialog pro smazání produktu
 * @param {number} id - ID produktu ke smazání
 */
function showDeleteConfirmation(id) {
    currentProductId = id;
    confirmModal.style.display = 'block';
}

/**
 * Smaže produkt po potvrzení
 */
function confirmDeleteProduct() {
    if (currentProductId === null) {
        closeConfirmModal();
        return;
    }
    
    fetch(`/api/products/${currentProductId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Nepodařilo se smazat produkt');
        }
        return response.json();
    })
    .then(() => {
        closeConfirmModal();
        loadProducts(); // Znovu načtení seznamu produktů
    })
    .catch(error => {
        console.error('Chyba při mazání produktu:', error);
        alert(`Chyba: ${error.message}`);
        closeConfirmModal();
    });
}

/**
 * Zavře modální okno pro úpravu/přidání produktu
 */
function closeProductModal() {
    productModal.style.display = 'none';
    productForm.reset();
}

/**
 * Zavře potvrzovací dialog
 */
function closeConfirmModal() {
    confirmModal.style.display = 'none';
    currentProductId = null;
}

/**
 * Zobrazí požadovanou sekci a skryje ostatní
 * @param {string} sectionId - ID sekce, která má být zobrazena
 */
function showSection(sectionId) {
    // Skrytí všech sekcí
    document.querySelectorAll('main > section').forEach(section => {
        section.classList.remove('active-section');
        section.classList.add('hidden-section');
    });
    
    // Zobrazení požadované sekce
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden-section');
        targetSection.classList.add('active-section');
    }
    
    // Aktualizace navigačních odkazů
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Aktivace odpovídajícího odkazu
    const navLink = document.querySelector(`nav a[id="${sectionId.replace('-section', '-link')}"]`);
    if (navLink) {
        navLink.classList.add('active');
    }
}