/* MEADOWPURE — SHARED APP JS */
const API = 'https://meadowpure-backend-production.up.railway.app';

function showToast(msg, type='') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.className = `toast show ${type}`;
  clearTimeout(t._tid); t._tid = setTimeout(() => t.classList.remove('show'), 3000);
}

async function apiFetch(path, method='GET', body=null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('mp_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(API + path, opts);
    return await res.json();
  } catch(e) { return { success: false, message: 'Network error.' }; }
}

const Auth = {
  getToken: () => localStorage.getItem('mp_token'),
  getUser: () => { try { return JSON.parse(localStorage.getItem('mp_user') || 'null'); } catch { return null; } },
  isLoggedIn: () => !!localStorage.getItem('mp_token'),
  isAdmin: () => { const u = Auth.getUser(); return u && u.role === 'admin'; },
  setSession: (token, user) => { localStorage.setItem('mp_token', token); localStorage.setItem('mp_user', JSON.stringify(user)); },
  clearSession: () => { localStorage.removeItem('mp_token'); localStorage.removeItem('mp_user'); }
};

let cart = JSON.parse(localStorage.getItem('mp_cart') || '[]');

function saveCart() { localStorage.setItem('mp_cart', JSON.stringify(cart)); updateCartUI(); }

function addToCart(product) {
  const existing = cart.find(c => c.id === product.id);
  if (existing) existing.qty++;
  else cart.push({ ...product, qty: 1 });
  saveCart();
  showToast(`${product.emoji || '🥛'} ${product.name} added to cart`, 'success');
  openCart();
}

function removeFromCart(id) { cart = cart.filter(c => c.id !== id); saveCart(); }

function changeQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(id);
  else saveCart();
}

function getCartTotal() { return cart.reduce((sum, item) => sum + parseFloat(item.price) * item.qty, 0); }
function getCartCount() { return cart.reduce((sum, item) => sum + item.qty, 0); }

function updateCartUI() {
  const count = getCartCount();
  document.querySelectorAll('#cartBadge').forEach(el => el.textContent = count);
  document.querySelectorAll('#cartItemCount').forEach(el => el.textContent = `(${count} item${count !== 1 ? 's' : ''})`);
  const itemsEl = document.getElementById('cartItems');
  const footerEl = document.getElementById('cartFooter');
  if (!itemsEl) return;
  if (cart.length === 0) {
    itemsEl.innerHTML = `<div class="cart-empty"><span>🛒</span><p>Your cart is empty</p><a href="shop.html" class="btn-dark btn-sm" style="display:inline-block;margin-top:1rem;padding:0.5rem 1.2rem;background:#1A1A1A;color:#fff;border-radius:50px;font-size:0.82rem;font-weight:600">Shop Now</a></div>`;
    if (footerEl) footerEl.style.display = 'none';
    return;
  }
  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-line">
      <div class="cart-line-emoji">${item.emoji || '🥛'}</div>
      <div class="cart-line-info"><div class="cl-name">${item.name}</div><div class="cl-size">${item.size || ''}</div></div>
      <div class="cart-line-right">
        <span class="cart-line-price">$${(parseFloat(item.price) * item.qty).toFixed(2)}</span>
        <div class="cart-qty">
          <button onclick="changeQty(${item.id},-1)">−</button>
          <span>${item.qty}</span>
          <button onclick="changeQty(${item.id},1)">+</button>
        </div>
      </div>
    </div>`).join('');
  document.querySelectorAll('#cartSubtotal').forEach(el => el.textContent = `$${getCartTotal().toFixed(2)}`);
  if (footerEl) footerEl.style.display = 'block';
}

function openCart() { document.getElementById('cartDrawer')?.classList.add('open'); document.getElementById('cartOverlay')?.classList.add('open'); }
function closeCart() { document.getElementById('cartDrawer')?.classList.remove('open'); document.getElementById('cartOverlay')?.classList.remove('open'); }

function renderProductsTo(gridId, products) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  if (!products.length) { grid.innerHTML = '<p style="text-align:center;color:#888;padding:3rem;grid-column:1/-1">No products found.</p>'; return; }
  grid.innerHTML = products.map(p => `
    <div class="product-card" data-id="${p.id}" data-cat="${p.category}">
      <div class="product-img cat-${p.category}">
        ${p.emoji || '🥛'}
        ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
      </div>
      <div class="product-body">
        <div class="product-meta">${p.size || ''} · ${p.category.charAt(0).toUpperCase()+p.category.slice(1)}</div>
        <h3>${p.name}</h3>
        <p class="product-desc">${p.description || ''}</p>
        <div class="product-footer">
          <div>
            <div class="product-price-row">
              <span class="product-price">$${parseFloat(p.price).toFixed(2)}</span>
              ${p.old_price ? `<span class="product-old-price">$${parseFloat(p.old_price).toFixed(2)}</span>` : ''}
            </div>
            <div class="product-rating"><span>★</span> ${p.rating} (${(p.review_count||0).toLocaleString()})</div>
          </div>
          <button class="add-to-cart" onclick='addToCart(${JSON.stringify(p).replace(/'/g,"&apos;")})' title="Add to cart">+</button>
        </div>
      </div>
    </div>`).join('');
}

async function fetchProducts(params={}) {
  const query = new URLSearchParams(params).toString();
  const data = await apiFetch(`/api/products?${query}`);
  return data.success ? data.products : [];
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartUI();
  document.getElementById('cartToggle')?.addEventListener('click', openCart);
  document.getElementById('closeCart')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
  document.getElementById('searchToggle')?.addEventListener('click', () => {
    const bar = document.getElementById('searchBar');
    bar?.classList.toggle('open');
    if (bar?.classList.contains('open')) setTimeout(() => document.getElementById('searchInput')?.focus(), 200);
  });
  const header = document.getElementById('header');
  if (header) window.addEventListener('scroll', () => { header.style.boxShadow = window.scrollY > 10 ? '0 4px 20px rgba(0,0,0,0.08)' : 'none'; });
});
