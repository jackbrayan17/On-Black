/**********************
 *  ON BLACK - scripts.js
 *  Robuste au JSON mal formé + panier + WhatsApp
 **********************/

// === Globals ===
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let selectedProduct = null;
let allProducts = [];
let currentType = 'All';
let searchQuery = '';
const websiteUrl = 'https://onblack.com';
const phone = '237694103585';
const placeholderImage = 'img/logo.jpg';

// === Utils: format price ===
const fmt = n => Number(n || 0).toLocaleString('fr-FR');

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  loadProducts();

  // Open cart
  document.getElementById('cart-icon')?.addEventListener('click', toggleCart);
  // Burger menu
  document.getElementById('menu-icon')?.addEventListener('click', toggleMenu);
  // Live search
  document.getElementById('search-input')?.addEventListener('input', searchProducts);
  // Category buttons
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => filterByType(btn.dataset.type || 'All'));
  });

  // Close modals by clicking backdrop
  document.getElementById('product-modal')?.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) e.currentTarget.style.display = 'none';
  });
  document.getElementById('cart-modal')?.addEventListener('click', e => {
    if (e.target.classList.contains('cart-modal')) e.currentTarget.style.display = 'none';
  });

  // Close modals with ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.getElementById('product-modal').style.display = 'none';
      document.getElementById('cart-modal').style.display = 'none';
    }
  });
});

// ========= Load & parse produits.json (robuste) =========
async function loadProducts() {
  const grid = document.getElementById('product-grid');
  try {
    const res = await fetch('produits.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Échec du chargement des produits (${res.status})`);
    const raw = await res.text();
    const parsed = safeParseProducts(raw);
    if (!Array.isArray(parsed)) throw new Error('Le fichier produits.json doit contenir un tableau JSON.');
    allProducts = parsed
      .map(normalizeProduct)
      .filter(Boolean);
    renderProducts();
  } catch (err) {
    console.error('[Produits] Erreur:', err);
    grid.innerHTML = `<div class="error-message">Erreur: ${escapeHtml(err.message)}</div>`;
  }
}

// Nettoyage + parse JSON
function safeParseProducts(text) {
  let t = text;

  // 1) enleve BOM
  t = t.replace(/^\uFEFF/, '');

  // 2) supprime commentaires // ... et /* ... */
  t = t.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  // 3) remplace guillemets “ ” ‘ ’ par " '
  t = t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  // 4) supprime virgules traînantes avant ] ou }
  t = t.replace(/,\s*([\]}])/g, '$1');

  // 5) supprime caractères de contrôle invisibles
  t = t.replace(/[\u0000-\u001F\u007F-\u009F]/g, c => {
    // conserve tab, newline, carriage return
    return /[\t\n\r]/.test(c) ? c : '';
  });

  try {
    return JSON.parse(t);
  } catch (e) {
    // Montre le voisinage de l'erreur si "position N" est présent
    const ctx = extractJsonErrorContext(t, e.message);
    const msg = ctx ? `${e.message}\nContexte proche: ${ctx}` : e.message;
    throw new Error(msg);
  }
}

// Donne ~80 chars autour de la position d'erreur si dispo
function extractJsonErrorContext(text, message) {
  const m = message.match(/position\s+(\d+)/i);
  if (!m) return '';
  const pos = Math.min(text.length - 1, Math.max(0, parseInt(m[1], 10)));
  const start = Math.max(0, pos - 80);
  const end = Math.min(text.length, pos + 80);
  return text.slice(start, end).replace(/\s+/g, ' ');
}

// Normalise un produit pour avoir toujours les mêmes champs
function normalizeProduct(p) {
  if (p == null) return null;
  const id = p.id != null ? String(p.id) : null;
  if (!id) return null;

  const images = Array.isArray(p.images)
    ? p.images
    : (p.image ? [p.image] : []);
  const cleanImages = images.filter(Boolean);
  if (cleanImages.length === 0) cleanImages.push(placeholderImage);

  const priceNum = Number(String(p.price).replace(/\s+/g, '').replace(',', '.'));
  const price = Number.isFinite(priceNum) ? priceNum : 0;

  const sizes = Array.isArray(p.sizes) && p.sizes.length ? p.sizes : ['Taille unique'];
  const type = p.type || 'Tous';

  return {
    id,
    name: p.name || 'Sans nom',
    description: p.description || '',
    images: cleanImages,
    price,
    sizes,
    type
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ========= Rendering produits =========
function renderProducts() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '';

  let filtered = currentType === 'All' || currentType === 'Tous'
    ? allProducts
    : allProducts.filter(p => p.type === currentType);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="error-message">Aucun produit trouvé</div>';
    return;
  }

  filtered.forEach(product => {
    const firstImage = product.images[0] || placeholderImage;
    const div = document.createElement('div');
    div.className = 'product';
    div.innerHTML = `
      <div class="product-image-container">
        <img src="${firstImage}" alt="${escapeHtml(product.name)}" class="product-image-front">
        <img src="${product.images[1] || firstImage}" alt="${escapeHtml(product.name)} back" class="product-image-back">
      </div>
      <p class="name">${escapeHtml(product.name)}</p>
      <p class="price">${fmt(product.price)} FCFA</p>
      <button class="btn-cart" data-id="${product.id}">Voir le produit</button>
    `;
    // Ouvre modal sur clic
    div.querySelector('.btn-cart').addEventListener('click', e => {
      e.stopPropagation();
      showProductModal(product.id);
    });
    div.addEventListener('click', () => showProductModal(product.id));
    grid.appendChild(div);
  });
}

// ========= Recherche & Filtres =========
function searchProducts() {
  searchQuery = document.getElementById('search-input').value || '';
  renderProducts();
}

function toggleMenu() {
  document.getElementById('category-nav').classList.toggle('active');
}

function filterByType(type) {
  currentType = type || 'All';
  // UI highlight (optionnel)
  document.querySelectorAll('.category-btn').forEach(b => {
    b.style.backgroundColor = '#222';
    b.style.color = 'var(--gold)';
  });
  const activeBtn = [...document.querySelectorAll('.category-btn')].find(b => (b.dataset.type || 'All') === currentType);
  if (activeBtn) {
    activeBtn.style.backgroundColor = 'var(--gold)';
    activeBtn.style.color = 'var(--black)';
  }
  renderProducts();
  if (window.innerWidth <= 768) toggleMenu();
}

// ========= Panier =========
function addToCart(id, quantity = 1, size) {
  const product = allProducts.find(p => p.id === String(id));
  if (!product) return;

  const chosenSize = size || (product.sizes[0] || 'Taille unique');
  const existing = cart.find(i => i.id === product.id && i.size === chosenSize);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      size: chosenSize,
      quantity: Math.max(1, Number(quantity) || 1)
    });
  }
  persistCart();
  updateCartCount();
  toggleCart(); // ouvre le panier
}

function updateCartCount() {
  const count = cart.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  document.getElementById('cart-count').textContent = count;
}

function toggleCart() {
  const modal = document.getElementById('cart-modal');
  modal.style.display = 'flex';
  const total = cart.reduce((sum, p) => sum + p.price * p.quantity, 0);

  document.getElementById('cart-items').innerHTML = cart.length
    ? cart.map((p, i) => `
      <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #333;">
        <p>${escapeHtml(p.name)} (${escapeHtml(p.size)}) - ${fmt(p.price)} FCFA</p>
        <div class="quantity-control">
          <button onclick="changeQty(${i}, -1)">-</button>
          <span>${p.quantity}</span>
          <button onclick="changeQty(${i}, 1)">+</button>
          <button onclick="removeFromCart(${i})" style="background-color:#ff4444;margin-left:10px;">Supprimer</button>
        </div>
      </div>
    `).join('')
    : '<p>Le panier est vide</p>';

  document.getElementById('cart-total').textContent = `Total : ${fmt(total)} FCFA`;

  // Attach WhatsApp button each time (DOM peut être reconstruit)
  const btn = document.getElementById('whatsapp-cart-order');
  if (btn) {
    btn.disabled = cart.length === 0;
    btn.onclick = whatsAppOrder;
  }

  // Close button (au cas où)
  document.getElementById('close-cart').onclick = () => {
    document.getElementById('cart-modal').style.display = 'none';
  };
}

function changeQty(index, delta) {
  const item = cart[index];
  if (!item) return;
  item.quantity += delta;
  if (item.quantity < 1) return removeFromCart(index);
  persistCart();
  updateCartCount();
  toggleCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  persistCart();
  updateCartCount();
  toggleCart();
}

function persistCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// ========= WhatsApp =========
function whatsAppOrder() {
  if (!cart.length) return;
  const total = cart.reduce((s, p) => s + p.price * p.quantity, 0);
  const message =
    `🌟 *On Black - Votre Commande* 🌟\n\n` +
    `📋 *Récapitulatif :*\n` +
    cart.map((p, i) =>
      `${i + 1}. ${p.name}\n   Taille: ${p.size}\n   Quantité: ${p.quantity}\n   Prix: ${fmt(p.price * p.quantity)} FCFA`
    ).join('\n\n') +
    `\n\n💰 *Total*: ${fmt(total)} FCFA\n` +
    `🛒 ${websiteUrl}\n` +
    `Merci pour votre confiance 😎`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

function whatsAppSingleOrder() {
  const p = selectedProduct;
  if (!p) return;
  const size = document.getElementById('size-select')?.value || (p.sizes[0] || 'Taille unique');
  const quantity = parseInt(document.getElementById('modal-quantity')?.textContent || '1', 10) || 1;
  const total = p.price * quantity;
  const message =
    `🌟 *On Black - Commande Produit* 🌟\n\n` +
    `Article: ${p.name}\n` +
    `Description: ${p.description}\n` +
    `Taille: ${size}\n` +
    `Quantité: ${quantity}\n` +
    `Prix total: ${fmt(total)} FCFA\n\n` +
    `🛒 ${websiteUrl}\n` +
    `Merci pour votre commande 😎`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

// ========= Modal Produit =========
function showProductModal(id) {
  const product = allProducts.find(p => p.id === String(id));
  if (!product) return;

  selectedProduct = product;
  const modal = document.getElementById('product-modal');
  modal.style.display = 'flex';

  const thumbs = product.images.map((img, idx) =>
    `<img class="thumbnail ${idx === 0 ? 'active' : ''}" src="${img}" alt="${escapeHtml(product.name)} ${idx + 1}" data-index="${idx}">`
  ).join('');

  const content = `
    <div class="modal-content">
      <i class="fas fa-times close-btn" id="close-modal"></i>
      <h3>${escapeHtml(product.name)}</h3>
      <div class="main-image-container">
        <img id="modal-main-image" src="${product.images[0] || placeholderImage}" alt="${escapeHtml(product.name)}" class="main-image">
      </div>
      <div class="thumbnail-container">${thumbs}</div>
      <p>${escapeHtml(product.description)}</p>

      <label for="size-select" style="color: var(--gold); font-weight: 500; margin: 10px 0 6px; display: block;">Taille :</label>
      <select id="size-select" style="background:#111;color:var(--gold);border:1px solid var(--gold);padding:8px 12px;border-radius:8px;width:100%;">
        ${product.sizes.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
      </select>

      <div class="quantity-control" style="margin:15px 0;">
        <button id="qty-minus">-</button>
        <span id="modal-quantity">1</span>
        <button id="qty-plus">+</button>
      </div>

      <p style="color:var(--gold);margin:6px 0;">${fmt(product.price)} FCFA</p>

      <button id="btn-add-cart" class="btn-cart"><i class="fas fa-shopping-cart"></i> Ajouter au panier</button>
      <button id="btn-wa" class="btn-whatsapp"><i class="fab fa-whatsapp"></i> Commander via WhatsApp</button>
    </div>
  `;
  modal.innerHTML = content;

  // Close button
  document.getElementById('close-modal').onclick = () => { modal.style.display = 'none'; };

  // Qty controls
  document.getElementById('qty-minus').onclick = () => changeModalQty(-1);
  document.getElementById('qty-plus').onclick = () => changeModalQty(1);

  // Thumbnails behavior
  modal.querySelectorAll('.thumbnail').forEach((t, idx) => {
    t.addEventListener('click', () => {
      modal.querySelectorAll('.thumbnail').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const main = document.getElementById('modal-main-image');
      main.src = product.images[idx] || placeholderImage;
      main.alt = `${product.name} ${idx + 1}`;
    });
  });

  // Add to cart
  document.getElementById('btn-add-cart').onclick = () => {
    const size = document.getElementById('size-select').value;
    const qty = parseInt(document.getElementById('modal-quantity').textContent || '1', 10) || 1;
    addToCart(product.id, qty, size);
    modal.style.display = 'none';
  };

  // WhatsApp single
  document.getElementById('btn-wa').onclick = whatsAppSingleOrder;
}

function changeModalQty(delta) {
  const el = document.getElementById('modal-quantity');
  let q = parseInt(el.textContent || '1', 10) || 1;
  q += delta;
  if (q < 1) q = 1;
  el.textContent = String(q);
}
