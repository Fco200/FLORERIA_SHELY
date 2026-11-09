(function () {
    const C = window.SHELY_CONFIG;
    const $ = id => document.getElementById(id);
    const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
    const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const money = n => `$${Number(n).toLocaleString('es-MX')} MXN`;

    Object.assign(C, read('shely_settings_' + C.id, {}));
    if (localStorage.getItem(C.storageKey) === null) write(C.storageKey, C.seedProducts);
    const waLink = text => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(text)}`;

    let products = read(C.storageKey, C.seedProducts);
    let orders = read('shely_orders', []);
    let cart = read('shely_cart_' + C.id, []);
    let currentUser = read('shely_current_user', null);
    let currentCat = 'Todos';
    let pendingAction = null;

    const MODALS = `
    <div id="login-modal" class="modal">
        <div class="modal-box relative">
            <button onclick="SHELY.closeModal('login-modal')" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"><i class="fa-solid fa-xmark"></i></button>
            <div class="text-center space-y-2 mb-6">
                <div class="w-14 h-14 grad-brand text-white rounded-2xl mx-auto flex items-center justify-center text-xl shadow-md float"><i class="fa-solid fa-user-check"></i></div>
                <h3 class="text-xl font-bold text-slate-900">Inicia sesión en ${esc(C.name)}</h3>
                <p class="text-xs text-slate-500">Necesitas identificarte para realizar pedidos. Tus datos quedan guardados para la próxima vez.</p>
            </div>
            <form id="login-form" class="space-y-4">
                <div><label class="lbl">Nombre completo</label><input type="text" id="login-name" required placeholder="Ej. Carlos Mendoza" class="field"></div>
                <div><label class="lbl">Número de teléfono</label><input type="tel" id="login-phone" required pattern="[0-9]{10}" title="Ingresa 10 dígitos" placeholder="662XXXXXXX" class="field"></div>
                <div><label class="lbl">Correo electrónico (opcional)</label><input type="email" id="login-email" placeholder="correo@ejemplo.com" class="field"></div>
                <button type="submit" class="w-full py-3 btn-brand rounded-xl font-semibold text-sm">Continuar</button>
            </form>
        </div>
    </div>

    <div id="orders-modal" class="modal">
        <div class="modal-box relative">
            <button onclick="SHELY.closeModal('orders-modal')" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="text-xl font-bold text-slate-900 flex items-center gap-2 pb-4 border-b border-rose-100"><i class="fa-solid fa-box-archive text-brand"></i> Mis pedidos</h3>
            <div id="orders-list" class="space-y-4 mt-4"></div>
        </div>
    </div>

    <div id="detail-modal" class="modal">
        <div class="modal-box relative sm:max-w-xl">
            <button onclick="SHELY.closeModal('detail-modal')" class="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/90 text-slate-500 flex items-center justify-center hover:bg-slate-200 shadow"><i class="fa-solid fa-xmark"></i></button>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                <div class="relative overflow-hidden rounded-2xl h-64 bg-soft flex items-center justify-center">
                    <i class="fa-solid ${C.icon} text-6xl text-brand opacity-30 absolute"></i>
                    <img id="detail-img" alt="" class="relative w-full h-full object-cover">
                </div>
                <div class="space-y-4">
                    <span id="detail-cat" class="bg-soft text-brand px-3 py-1 rounded-full text-xs font-bold"></span>
                    <h3 id="detail-name" class="text-xl font-bold text-slate-900"></h3>
                    <p id="detail-desc" class="text-xs text-slate-500 leading-relaxed"></p>
                    <div id="detail-price" class="text-2xl font-black text-slate-900"></div>
                    <div id="detail-status"></div>
                    <button id="detail-add" class="w-full py-3 rounded-xl"></button>
                </div>
            </div>
        </div>
    </div>

    <div id="cart-modal" class="modal">
        <div class="modal-box relative">
            <button onclick="SHELY.closeModal('cart-modal')" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="text-xl font-bold text-slate-900 flex items-center gap-2 pb-4 mb-4 border-b border-rose-100"><i class="fa-solid fa-cart-shopping text-brand"></i> Carrito y pedido</h3>
            <div id="cart-items" class="space-y-3 mb-6 max-h-48 overflow-y-auto pr-1"></div>
            <form id="checkout-form" class="space-y-4 pt-4 border-t border-rose-100">
                <h4 class="text-xs font-bold uppercase text-slate-400 tracking-wider">Datos de entrega</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label class="lbl">Nombre</label><input type="text" id="cust-name" readonly class="field bg-slate-100 font-semibold"></div>
                    <div><label class="lbl">Teléfono</label><input type="tel" id="cust-phone" readonly class="field bg-slate-100 font-semibold"></div>
                </div>
                <div><label class="lbl">Dirección de entrega en Hermosillo</label><textarea id="cust-address" rows="2" required placeholder="Calle, número, colonia..." class="field"></textarea></div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label class="lbl">Fecha de entrega</label><input type="date" id="cust-date" required class="field"></div>
                    <div><label class="lbl">Hora</label><input type="time" id="cust-time" required class="field"></div>
                </div>
                <div><label class="lbl">Dedicatoria</label><input type="text" id="cust-note" placeholder="Ej. ¡Feliz cumpleaños!" class="field"></div>
                <div class="bg-soft border border-rose-200 rounded-2xl p-4 text-xs text-slate-800 space-y-1">
                    <p class="font-bold"><i class="fa-solid fa-circle-exclamation text-brand"></i> Anticipo del 50% requerido</p>
                    <p>BBVA | CLABE: <strong>${esc(C.clabe)}</strong></p>
                </div>
                <div class="pt-2 flex items-center justify-between">
                    <div><span class="text-xs text-slate-400 block font-medium">Total</span><span id="cart-total" class="text-xl font-extrabold text-slate-950">$0 MXN</span></div>
                    <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5"><i class="fa-solid fa-check"></i> Realizar pedido</button>
                </div>
            </form>
        </div>
    </div>

    <div id="custom-modal" class="modal">
        <div class="modal-box relative">
            <button onclick="SHELY.closeModal('custom-modal')" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"><i class="fa-solid fa-xmark"></i></button>
            <div class="text-center space-y-2 mb-6">
                <div class="w-14 h-14 grad-brand text-white rounded-2xl mx-auto flex items-center justify-center text-xl shadow-md"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                <h3 class="text-xl font-bold text-slate-900">Pedido personalizado</h3>
                <p class="text-xs text-slate-500">Cuéntanos tu idea y te enviaremos una cotización por WhatsApp.</p>
            </div>
            <form id="custom-form" class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label class="lbl">Tipo de evento</label>
                        <select id="custom-type" class="field">${C.customTypes.map(t => `<option>${esc(t)}</option>`).join('')}</select>
                    </div>
                    <div><label class="lbl">Tamaño / personas</label><input type="text" id="custom-size" placeholder="Ej. 40 personas" class="field"></div>
                </div>
                <div><label class="lbl">Descripción de tu idea</label><textarea id="custom-desc" rows="3" required placeholder="${esc(C.customPlaceholder)}" class="field"></textarea></div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label class="lbl">Fecha del evento</label><input type="date" id="custom-date" required class="field"></div>
                    <div><label class="lbl">Hora de entrega</label><input type="time" id="custom-time" class="field"></div>
                </div>
                <div><label class="lbl">Dirección de entrega</label><input type="text" id="custom-address" required placeholder="Calle, número, colonia" class="field"></div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label class="lbl">Presupuesto aproximado (opcional)</label><input type="number" min="0" id="custom-budget" placeholder="$" class="field"></div>
                    <div><label class="lbl">Imagen de referencia (opcional)</label><input type="url" id="custom-ref" placeholder="https://..." class="field"></div>
                </div>
                <div class="bg-soft border border-rose-200 rounded-2xl p-3 text-xs text-slate-700"><i class="fa-solid fa-circle-info text-brand"></i> Tras aprobar la cotización se solicita un anticipo del 50%.</div>
                <button type="submit" class="w-full py-3 btn-brand rounded-xl font-semibold text-sm"><i class="fa-solid fa-paper-plane"></i> Enviar solicitud</button>
            </form>
        </div>
    </div>

    <div id="alert-modal" class="modal">
        <div class="modal-box text-center space-y-4 max-w-sm">
            <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl"><i class="fa-solid fa-check"></i></div>
            <h3 id="alert-title" class="text-xl font-bold text-slate-900"></h3>
            <p id="alert-msg" class="text-xs text-slate-500 leading-relaxed"></p>
            <button onclick="SHELY.closeModal('alert-modal')" class="w-full py-3 btn-brand rounded-xl font-semibold text-sm">Entendido</button>
        </div>
    </div>

    <div class="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        <div class="group flex items-center gap-3">
            <span class="opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg whitespace-nowrap">¿Es urgente? Escríbenos ya</span>
            <a id="fab-urgent" href="#" target="_blank" class="pulse-ring w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center text-xl shadow-xl hover:scale-110 transition-transform" title="Mensaje urgente"><i class="fa-solid fa-bell"></i></a>
        </div>
        <div class="group flex items-center gap-3">
            <span class="opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg whitespace-nowrap">Escríbenos por WhatsApp</span>
            <a id="fab-wa" href="#" target="_blank" class="float w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center text-3xl shadow-xl hover:scale-110 transition-transform" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
        </div>
    </div>`;

    function save() {
        write('shely_orders', orders);
        write('shely_cart_' + C.id, cart);
        write('shely_current_user', currentUser);
        renderNav();
        updateCounter();
    }

    function showModal(id) { $(id).classList.add('open'); }
    function closeModal(id) {
        $(id).classList.remove('open');
        if (id === 'login-modal') pendingAction = null;
    }
    function requireLogin(action) {
        if (currentUser) { action(); return; }
        pendingAction = action;
        showModal('login-modal');
    }
    function showAlert(title, msg) {
        $('alert-title').textContent = title;
        $('alert-msg').textContent = msg;
        showModal('alert-modal');
    }

    function urgentLink() {
        const who = currentUser ? `\n\n👤 *Nombre:* ${currentUser.name}\n📞 *Teléfono:* ${currentUser.phone}` : '';
        return waLink(`🚨 *URGENCIA - ${C.name}* 🚨\n\nHola, necesito atención *urgente* con mi pedido. Por favor, contácteme lo antes posible.${who}`);
    }

    function renderNav() {
        const area = $('client-nav-area');
        if (area) {
            if (currentUser) {
                const n = orders.filter(o => o.customer.phone === currentUser.phone).length;
                area.innerHTML = `
                    <button onclick="SHELY.openOrders()" class="px-3 py-2 bg-soft text-brand rounded-xl text-xs font-bold hover:scale-105 transition-all flex items-center gap-1.5"><i class="fa-solid fa-box-archive"></i> <span class="hidden sm:inline">Mis pedidos</span> (${n})</button>
                    <span class="hidden md:inline text-xs text-slate-500">Hola, <strong>${esc(currentUser.name.split(' ')[0])}</strong></span>
                    <button onclick="SHELY.logout()" class="text-xs text-slate-400 hover:text-brand p-2" title="Cerrar sesión"><i class="fa-solid fa-right-from-bracket"></i></button>`;
            } else {
                area.innerHTML = `<button onclick="SHELY.openLogin()" class="btn-brand px-4 py-2 rounded-xl text-xs font-semibold"><i class="fa-solid fa-user mr-1"></i> Iniciar sesión</button>`;
            }
        }
        if ($('fab-urgent')) {
            $('fab-urgent').href = urgentLink();
            $('fab-wa').href = waLink(`Hola ${C.name}, me gustaría recibir información sobre sus productos y pedidos. 🌸`);
        }
    }

    function updateCounter() {
        const el = $('cart-counter');
        if (el) el.textContent = cart.reduce((a, i) => a + i.qty, 0);
    }

    function renderFilters() {
        const box = $('category-filters');
        if (!box) return;
        box.innerHTML = ['Todos', ...C.categories].map(c => `<button data-cat="${esc(c)}" class="cat-btn px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:scale-105 border">${esc(c)}</button>`).join('');
        box.onclick = e => {
            const b = e.target.closest('[data-cat]');
            if (b) { currentCat = b.dataset.cat; applyFilters(); }
        };
    }

    function applyFilters() {
        const q = ($('search-input')?.value || '').trim().toLowerCase();
        const list = products.filter(p => !p.hidden &&
            (currentCat === 'Todos' || p.category === currentCat) &&
            (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)));
        document.querySelectorAll('.cat-btn').forEach(b => {
            const on = b.dataset.cat === currentCat;
            b.className = 'cat-btn px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:scale-105 border ' +
                (on ? 'btn-brand border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:bg-soft');
        });
        renderCatalog(list);
    }

    function renderCatalog(list) {
        const grid = $('product-grid');
        if (!grid) return;
        if (!list.length) {
            grid.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400"><i class="fa-solid fa-box-open text-4xl mb-2"></i><p>No hay productos disponibles.</p></div>`;
            return;
        }
        grid.innerHTML = list.map((p, i) => {
            const agotado = p.status === 'Agotado';
            return `
            <article class="fade-in bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm lift flex flex-col cursor-pointer group" style="animation-delay:${i * 70}ms" onclick="SHELY.openDetail(${p.id})">
                <div class="relative h-60 overflow-hidden bg-soft flex items-center justify-center">
                    <i class="fa-solid ${C.icon} text-6xl text-brand opacity-30 absolute"></i>
                    <img src="${esc(p.image)}" alt="${esc(p.name)}" class="relative w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" onerror="this.remove()">
                    <span class="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-brand shadow-sm">${esc(p.category)}</span>
                    <span class="absolute top-4 right-4 ${agotado ? 'bg-rose-500' : 'bg-emerald-500'} text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">${esc(p.status)}</span>
                </div>
                <div class="p-6 flex flex-col flex-grow justify-between gap-4">
                    <div>
                        <h3 class="font-bold text-slate-900 text-lg mb-1">${esc(p.name)}</h3>
                        <p class="text-xs text-slate-500 line-clamp-2">${esc(p.description)}</p>
                    </div>
                    <div class="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div>
                            <span class="text-xs text-slate-400 block font-medium">Precio</span>
                            <span class="text-xl font-bold text-slate-900">${money(p.price)}</span>
                        </div>
                        <span class="text-xs font-semibold text-brand group-hover:underline flex items-center gap-1">Ver detalles <i class="fa-solid fa-arrow-right"></i></span>
                    </div>
                </div>
            </article>`;
        }).join('');
    }

    function openDetail(id) {
        const p = products.find(x => x.id === id);
        if (!p) return;
        const agotado = p.status === 'Agotado';
        const img = $('detail-img');
        img.src = p.image;
        img.onerror = () => img.remove();
        $('detail-cat').textContent = p.category;
        $('detail-name').textContent = p.name;
        $('detail-desc').textContent = p.description;
        $('detail-price').textContent = money(p.price);
        $('detail-status').innerHTML = `<span class="inline-block ${agotado ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'} px-3 py-1 rounded-full text-xs font-bold">${esc(p.status)}</span>`;
        const btn = $('detail-add');
        btn.disabled = agotado;
        btn.className = agotado
            ? 'w-full py-3 rounded-xl bg-slate-300 text-slate-500 font-semibold text-sm cursor-not-allowed'
            : 'w-full py-3 rounded-xl btn-brand font-semibold text-sm flex items-center justify-center gap-2';
        btn.innerHTML = agotado ? 'Producto agotado' : '<i class="fa-solid fa-bag-shopping"></i> Agregar al carrito';
        btn.onclick = () => requireLogin(() => { addToCart(p.id); closeModal('detail-modal'); });
        showModal('detail-modal');
    }

    function addToCart(id) {
        const p = products.find(x => x.id === id);
        if (!p) return;
        const item = cart.find(i => i.id === id);
        if (item) item.qty++;
        else cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
        save();
        openCart();
    }

    function openCart() {
        requireLogin(() => {
            $('cust-name').value = currentUser.name;
            $('cust-phone').value = currentUser.phone;
            renderCart();
            showModal('cart-modal');
        });
    }

    function renderCart() {
        const box = $('cart-items');
        if (!cart.length) {
            box.innerHTML = `<p class="text-center text-slate-400 text-sm py-4">Tu carrito está vacío.</p>`;
            $('cart-total').textContent = money(0);
            return;
        }
        box.innerHTML = cart.map(i => `
            <div class="fade-in flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div><h5 class="font-bold text-sm text-slate-900">${esc(i.name)}</h5><span class="text-xs text-slate-500">${money(i.price)} × ${i.qty}</span></div>
                <div class="flex items-center gap-3">
                    <span class="font-bold text-sm">${money(i.price * i.qty)}</span>
                    <button onclick="SHELY.removeFromCart(${i.id})" class="text-rose-400 hover:text-rose-600 p-1"><i class="fa-solid fa-trash text-xs"></i></button>
                </div>
            </div>`).join('');
        $('cart-total').textContent = money(cart.reduce((a, i) => a + i.price * i.qty, 0));
    }

    function removeFromCart(id) {
        cart = cart.filter(i => i.id !== id);
        save();
        renderCart();
    }

    function createOrder(extra) {
        const now = new Date();
        return {
            folio: `${C.prefix}-${Math.floor(1000 + Math.random() * 9000)}`,
            businessId: C.id,
            business: C.name,
            ...extra,
            status: 'Pendiente',
            timestamp: now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
            dateCreated: now.toISOString().split('T')[0]
        };
    }

    function submitCart(e) {
        e.preventDefault();
        if (!cart.length) { alert('Agrega productos a tu carrito.'); return; }
        const total = cart.reduce((a, i) => a + i.price * i.qty, 0);
        const anticipo = total / 2;
        const order = createOrder({
            type: 'Pedido',
            customer: {
                name: currentUser.name,
                phone: currentUser.phone,
                address: $('cust-address').value.trim(),
                date: $('cust-date').value,
                time: $('cust-time').value,
                note: $('cust-note').value.trim() || 'Sin dedicatoria'
            },
            items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
            total,
            anticipo
        });
        orders.unshift(order);
        cart = [];
        save();
        closeModal('cart-modal');

        const items = order.items.map(i => `   • ${i.qty}x ${i.name} (${money(i.price * i.qty)})`).join('\n');
        const text = `${C.emoji} *NUEVO PEDIDO - ${C.name}* ${C.emoji}\n\n*Folio:* ${order.folio}\n*Cliente:* ${order.customer.name}\n*Teléfono:* ${order.customer.phone}\n*Dirección:* ${order.customer.address}\n*Entrega:* ${order.customer.date} a las ${order.customer.time} hrs\n*Dedicatoria:* "${order.customer.note}"\n\n*Productos:*\n${items}\n\n*Total:* ${money(total)} | *Anticipo (50%):* ${money(anticipo)}`;

        showAlert(`¡Orden ${order.folio} registrada!`, `Tu pedido ya está en el sistema. Recuerda enviar tu anticipo de ${money(anticipo)}. Se abrirá WhatsApp para confirmarlo.`);
        setTimeout(() => window.open(waLink(text), '_blank'), 1500);
    }

    function openCustom() {
        requireLogin(() => showModal('custom-modal'));
    }

    function submitCustom(e) {
        e.preventDefault();
        const v = id => $(id).value.trim();
        const details = {
            tipo: v('custom-type'),
            tamano: v('custom-size'),
            presupuesto: v('custom-budget'),
            referencia: v('custom-ref'),
            descripcion: v('custom-desc')
        };
        const order = createOrder({
            type: 'Personalizado',
            custom: true,
            customer: {
                name: currentUser.name,
                phone: currentUser.phone,
                address: v('custom-address'),
                date: v('custom-date'),
                time: v('custom-time'),
                note: details.descripcion
            },
            details,
            items: [{ name: `Pedido personalizado (${details.tipo})`, qty: 1, price: 0 }],
            total: 0,
            anticipo: 0
        });
        orders.unshift(order);
        save();
        e.target.reset();
        closeModal('custom-modal');

        const text = `${C.emoji} *PEDIDO PERSONALIZADO - ${C.name}* ${C.emoji}\n\n*Folio:* ${order.folio}\n*Cliente:* ${order.customer.name}\n*Teléfono:* ${order.customer.phone}\n*Tipo de evento:* ${details.tipo}\n*Tamaño / personas:* ${details.tamano || 'Por definir'}\n*Fecha:* ${order.customer.date}${order.customer.time ? ' a las ' + order.customer.time + ' hrs' : ''}\n*Dirección:* ${order.customer.address}\n*Presupuesto aprox.:* ${details.presupuesto ? money(details.presupuesto) : 'Por definir'}\n*Referencia:* ${details.referencia || 'Sin imagen'}\n\n*Idea:*\n${details.descripcion}`;

        showAlert(`¡Solicitud ${order.folio} enviada!`, 'Recibimos tu idea. Te enviaremos una cotización por WhatsApp; el anticipo del 50% se solicita al aprobar el diseño.');
        setTimeout(() => window.open(waLink(text), '_blank'), 1500);
    }

    function openOrders() {
        const list = $('orders-list');
        const mine = orders.filter(o => currentUser && o.customer.phone === currentUser.phone);
        if (!mine.length) {
            list.innerHTML = `<div class="text-center py-10 text-slate-400"><i class="fa-solid fa-basket-shopping text-4xl mb-3"></i><p class="text-sm">Aún no tienes pedidos.</p></div>`;
        } else {
            const badge = { Pendiente: 'bg-amber-100 text-amber-700', Confirmado: 'bg-blue-100 text-blue-700', Entregado: 'bg-emerald-100 text-emerald-700' };
            list.innerHTML = mine.map(o => `
                <div class="fade-in bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                    <div class="flex justify-between items-center gap-2">
                        <div><span class="font-bold text-slate-900 text-sm">${esc(o.folio)}</span> <span class="text-[10px] uppercase font-bold text-brand">${esc(o.type || 'Pedido')}</span></div>
                        <span class="${badge[o.status] || badge.Pendiente} px-2.5 py-0.5 rounded-full text-xs font-bold">${esc(o.status)}</span>
                    </div>
                    <p class="text-xs text-slate-600"><strong>Entrega:</strong> ${esc(o.customer.date)} ${o.customer.time ? 'a las ' + esc(o.customer.time) + ' hrs' : ''}</p>
                    <p class="text-xs text-slate-600"><strong>Detalle:</strong> ${esc(o.items.map(i => `${i.qty}x ${i.name}`).join(', '))}</p>
                    <div class="flex justify-between pt-2 border-t border-slate-200 text-xs font-bold">
                        <span>${o.custom ? 'Total: Por cotizar' : 'Total: ' + money(o.total)}</span>
                        ${o.custom ? '' : `<span class="text-brand">Anticipo: ${money(o.anticipo)}</span>`}
                    </div>
                </div>`).join('');
        }
        showModal('orders-modal');
    }

    function openLogin() { showModal('login-modal'); }

    function logout() {
        currentUser = null;
        pendingAction = null;
        save();
    }

    function bind() {
        $('login-form').addEventListener('submit', e => {
            e.preventDefault();
            currentUser = {
                name: $('login-name').value.trim(),
                phone: $('login-phone').value.trim(),
                email: $('login-email').value.trim()
            };
            save();
            closeModal('login-modal');
            if (pendingAction) {
                const action = pendingAction;
                pendingAction = null;
                action();
            }
        });
        $('checkout-form').addEventListener('submit', submitCart);
        $('custom-form').addEventListener('submit', submitCustom);
        document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); }));
    }

    function revealOnScroll() {
        const io = new IntersectionObserver(entries => entries.forEach(en => {
            if (en.isIntersecting) { en.target.classList.add('show'); io.unobserve(en.target); }
        }), { threshold: .15 });
        document.querySelectorAll('.reveal').forEach(el => io.observe(el));
    }

    document.body.insertAdjacentHTML('beforeend', MODALS);
    bind();
    renderFilters();
    applyFilters();
    save();
    revealOnScroll();

    window.SHELY = {
        openLogin, openOrders, openDetail, openCart, openCustom, logout,
        closeModal, applyFilters, removeFromCart
    };
})();
