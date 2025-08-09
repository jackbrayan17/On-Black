let cart = JSON.parse(localStorage.getItem('cart')) || [];
let selectedProducts = [];
let allProducts = [];
let slideIntervals = {};
const websiteUrl = 'https://on-black.vercel.app';
const phoneNumber = '237694103585';
const placeholderImage = 'img/logo.jpg';

document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    loadProducts();

    document.getElementById('cart-icon')?.addEventListener('click', toggleCart);
    document.getElementById('menu-icon').addEventListener('click', toggleMenu);
    document.getElementById('search-input').addEventListener('input', searchProducts);

    document.getElementById('product-modal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) closeModal();
    });
    document.getElementById('cart-modal').addEventListener('click', (e) => {
        if (e.target.classList.contains('cart-modal')) closeCart();
    });

    document.getElementById('product-modal').addEventListener('keydown', handleThumbnailKeyboardNavigation);
});

async function loadProducts() {
    const grid = document.getElementById('product-grid');
    try {
        const response = await fetch('produits.json');
        if (!response.ok) throw new Error('Échec du chargement des produits');
        const text = await response.text();
        allProducts = JSON.parse(text.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'));
        displayProducts(allProducts.sort(() => Math.random() - 0.5));
        setupFilters(allProducts);
    } catch (error) {
        console.error(error);
        grid.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}

function displayProducts(products) {
    const productGrid = document.getElementById('product-grid');
    productGrid.innerHTML = '';
    products.forEach(product => {
        const frontImage = product.images[0] || placeholderImage;
        const backImage = product.images[1] || frontImage;
        const productCard = document.createElement('div');
        productCard.className = 'product';
        productCard.innerHTML = `
            <div class="product-image-container">
                <img src="${frontImage}" alt="${product.name}" class="product-image-front">
                <img src="${backImage}" alt="${product.name} back" class="product-image-back">
            </div>
            <p class="name">${product.name}</p>
            <p class="price">${product.price.toLocaleString()} FCFA</p>
            <button class="btn-cart">Voir détails</button>
        `;
        productCard.querySelector('.btn-cart').addEventListener('click', (e) => {
            e.stopPropagation();
            showProductModal([product.id]);
        });
        productCard.addEventListener('click', () => showProductModal([product.id]));
        productGrid.appendChild(productCard);
    });
}

function setupFilters(products) {
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => {
                b.style.backgroundColor = '#222';
                b.style.color = 'var(--gold)';
            });
            btn.style.backgroundColor = 'var(--gold)';
            btn.style.color = 'var(--black)';

            const type = btn.dataset.type;
            const filtered = type === 'Tous'
                ? products.sort(() => Math.random() - 0.5)
                : products.filter(p => p.type === type).sort(() => Math.random() - 0.5);

            displayProducts(filtered);
        });
    });
}

function searchProducts() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    ).sort(() => Math.random() - 0.5);
    displayProducts(filtered);
}

function toggleMenu() {
    document.getElementById('category-nav').classList.toggle('active');
}

function updateCartCount() {
    document.getElementById('cart-count').textContent = cart.reduce((sum, i) => sum + i.quantity, 0);
}

function toggleCart() {
    document.getElementById('cart-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('product-modal').style.display = 'none';
}
function closeCart() {
    document.getElementById('cart-modal').style.display = 'none';
}
// Show product modal
function showProductModal(ids) {
    const products = ids.map(id => allProducts.find(p => p.id === id)).filter(Boolean);
    if (!products.length) return;

    const modal = document.getElementById('product-modal');
    const list = document.getElementById('modal-product-list');

    list.innerHTML = products.map(product => {
        const firstImage = product.images[0] || placeholderImage;
        return `
            <div class="product-item">
                <h3>${product.name}</h3>
                <div class="main-image-container">
                    <img id="modal-main-image-${product.id}" 
                         src="${firstImage}" 
                         alt="${product.name}" 
                         class="main-image">
                </div>
                <div class="thumbnail-container">
                    ${product.images.map((img, idx) => `
                        <img 
                            id="modal-thumbnail-${product.id}-${idx}"
                            class="thumbnail ${idx === 0 ? 'active' : ''}"
                            src="${img}"
                            alt="${product.name} image ${idx + 1}"
                            data-product-id="${product.id}"
                            data-index="${idx}">
                    `).join('')}
                </div>
                <p>${product.description}</p>
                <p class="price">${product.price.toLocaleString()} FCFA</p>
            </div>
        `;
    }).join('');

    // Add click listeners for thumbnails
    list.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.addEventListener('click', function () {
            const productId = parseInt(this.dataset.productId);
            const index = parseInt(this.dataset.index);
            changeImage(productId, index);
        });
    });

    // Start slideshow for each product
    products.forEach(product => {
        startSlideshow(product.id);
    });

    modal.style.display = 'flex';
    document.getElementById('close-modal').onclick = closeModal;
}

// Change main image in modal
function changeImage(id, index) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    const mainImage = document.getElementById(`modal-main-image-${id}`);
    mainImage.src = product.images[index] || placeholderImage;
    mainImage.alt = `${product.name} image ${index + 1}`;

    // Update active thumbnail
    document.querySelectorAll(`.thumbnail[data-product-id="${id}"]`)
        .forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });

    // Reset slideshow timer
    stopSlideshow(id);
    startSlideshow(id, index);
}

// Start slideshow for modal images
function startSlideshow(productId, startIndex = 0) {
    stopSlideshow(productId); // Prevent duplicates

    let product = allProducts.find(p => p.id === productId);
    if (!product || product.images.length <= 1) return;

    let currentIndex = startIndex;
    slideIntervals[productId] = setInterval(() => {
        currentIndex = (currentIndex + 1) % product.images.length;
        changeImage(productId, currentIndex);
    }, 5000); // 5 seconds
}

// Stop slideshow for a product
function stopSlideshow(productId) {
    if (slideIntervals[productId]) {
        clearInterval(slideIntervals[productId]);
        delete slideIntervals[productId];
    }
}


function handleThumbnailKeyboardNavigation(e) {
    const el = document.activeElement;
    if (!el.classList.contains('thumbnail')) return;
    const match = el.id.match(/modal-thumbnail-(\d+)-(\d+)/);
    if (!match) return;
    const [_, productId, currentIndex] = match;
    const product = allProducts.find(p => p.id == productId);
    if (!product) return;

    let newIndex;
    if (e.key === 'ArrowRight') {
        newIndex = (parseInt(currentIndex) + 1) % product.images.length;
    } else if (e.key === 'ArrowLeft') {
        newIndex = (parseInt(currentIndex) - 1 + product.images.length) % product.images.length;
    } else {
        return;
    }
    e.preventDefault();
    document.getElementById(`modal-thumbnail-${productId}-${newIndex}`).focus();
    changeImage(parseInt(productId), newIndex);
}
