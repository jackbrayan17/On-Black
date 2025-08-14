// === VARIABLES GLOBALES ===
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let selectedProduct = null;
let allProducts = [];
let currentType = 'All';
let searchQuery = '';
const websiteUrl = 'https://on-black.vercel.app';
const phone = '237697336997';

// === INIT APP ===
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    loadProducts();

    // Fermer modal produit
    document.getElementById('product-modal').addEventListener('click', e => {
        if (e.target.classList.contains('modal')) {
            e.currentTarget.style.display = 'none';
        }
    });

    // Fermer modal panier
    document.getElementById('cart-modal').addEventListener('click', e => {
        if (e.target.classList.contains('cart-modal')) {
            e.currentTarget.style.display = 'none';
        }
    });
});

// === CHARGEMENT PRODUITS ===
async function loadProducts() {
    const grid = document.getElementById('product-grid');
    try {
        const response = await fetch('produits.json');
        if (!response.ok) throw new Error('Échec du chargement des produits');
        allProducts = await response.json();
        renderProducts();
    } catch (error) {
        grid.innerHTML = `<div class="error-message">Erreur: ${error.message}</div>`;
    }
}

function renderProducts() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    let filtered = currentType === 'All'
        ? allProducts
        : allProducts.filter(p => p.type === currentType);

    if (searchQuery) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="error-message">Aucun produit trouvé</div>';
        return;
    }

    filtered.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product';
        div.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <p class="name">${product.name}</p>
            <p class="price">${product.price} FCFA</p>
            <button onclick="showProductModal('${product.id}')">Voir le produit</button>
        `;
        grid.appendChild(div);
    });
}

// === RECHERCHE & FILTRE ===
function searchProducts() {
    searchQuery = document.getElementById('search-input').value;
    renderProducts();
}

function toggleMenu() {
    document.getElementById('category-nav').classList.toggle('active');
}

function filterByType(type) {
    currentType = type;
    renderProducts();
    if (window.innerWidth <= 768) toggleMenu();
}

// === PANIER ===
function addToCart(id, quantity = 1, size) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    const existingItem = cart.find(item => item.id === id && item.size === size);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ ...product, quantity, size });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    toggleCart();
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
}

function toggleCart() {
    const cartModal = document.getElementById('cart-modal');
    cartModal.style.display = 'flex';
    cartModal.innerHTML = `
        <div class="cart-content">
            <span class="close-btn" onclick="document.getElementById('cart-modal').style.display='none'">&times;</span>
            <h3>Votre Panier</h3>
            ${cart.length === 0
                ? '<p>Le panier est vide</p>'
                : cart.map((p, i) => `
                    <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #333;">
                        <p>${p.name} (${p.size}) - ${p.price} FCFA</p>
                        <div class="quantity-control">
                            <button onclick="changeQty(${i}, -1)">-</button>
                            <span>${p.quantity}</span>
                            <button onclick="changeQty(${i}, 1)">+</button>
                            <button onclick="removeFromCart(${i})" style="background-color: #ff4444; margin-left: 10px;">Supprimer</button>
                        </div>
                    </div>
                `).join('')}
            <button onclick="whatsAppOrder()" class="btn-whatsapp" ${cart.length === 0 ? 'disabled' : ''}>
                <i class="fab fa-whatsapp"></i> Valider la commande via WhatsApp
            </button>
            <p>Total: ${cart.reduce((sum, p) => sum + p.price * p.quantity, 0)} FCFA</p>
        </div>
    `;
}

function changeQty(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity < 1) {
        removeFromCart(index);
        return;
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    toggleCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    toggleCart();
}

// === WHATSAPP ===
function whatsAppOrder() {
    if (cart.length === 0) return;
    const total = cart.reduce((sum, p) => sum + p.price * p.quantity, 0);
    const message = `🌟 *On Black - Votre Commande* 🌟\n\n` +
        `📋 *Récapitulatif :*\n` +
        cart.map((p, i) => 
            `${i + 1}. ${p.name}\nTaille: ${p.size}\nQuantité: ${p.quantity}\nPrix: ${p.price * p.quantity} FCFA`
        ).join('\n\n') +
        `\n\n💰 *Total*: ${total} FCFA\n` +
        `Merci pour votre confiance 😎\n🛒 ${websiteUrl}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

function whatsAppSingleOrder() {
    const p = selectedProduct;
    const size = document.getElementById('size-select').value;
    const quantity = parseInt(document.getElementById('modal-quantity').textContent);
    const total = p.price * quantity;
    const message = `🌟 *On Black - Commande Produit* 🌟\n\n` +
        `Article: ${p.name}\nDescription: ${p.description}\nTaille: ${size}\nQuantité: ${quantity}\nPrix total: ${total} FCFA\n\n` +
        `Merci pour votre commande 😎\n🛒 ${websiteUrl}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

// === MODAL PRODUIT ===
function showProductModal(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    selectedProduct = product;
    const modal = document.getElementById('product-modal');
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-btn" onclick="document.getElementById('product-modal').style.display='none'">&times;</span>
            <h3>${product.name}</h3>
            <img src="${product.image}" style="width:100%;height:auto;margin:10px 0;border-radius:4px;">
            <p>${product.description}</p>
            <label for="size-select" style="color: var(--gold); font-weight: 500; margin-bottom: 6px; display: block;">Taille :</label>
            <select id="size-select" style="background-color: #111; color: var(--gold); border: 1px solid var(--gold); padding: 8px 12px; border-radius: 8px;">
                ${product.sizes.map(size => `<option value="${size}">${size}</option>`).join('')}
            </select>
            <div class="quantity-control" style="margin: 15px 0;">
                <button onclick="changeModalQty(-1)">-</button>
                <span id="modal-quantity">1</span>
                <button onclick="changeModalQty(1)">+</button>
            </div>
            <p style="color:var(--gold)">${product.price} FCFA</p>
            <button onclick="addToCart('${product.id}', parseInt(document.getElementById('modal-quantity').textContent), document.getElementById('size-select').value)" class="btn-cart">
                <i class="fas fa-shopping-cart"></i> Ajouter au panier
            </button>
            <button onclick="whatsAppSingleOrder()" class="btn-whatsapp">
                <i class="fab fa-whatsapp"></i> Commander via WhatsApp
            </button>
        </div>
    `;
}

function changeModalQty(delta) {
    const qtySpan = document.getElementById('modal-quantity');
    let qty = parseInt(qtySpan.textContent) + delta;
    if (qty < 1) qty = 1;
    qtySpan.textContent = qty;
}
