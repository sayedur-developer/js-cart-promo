// Product Module
const ProductManager = {
  async getProducts() {
    try {
      const response = await fetch("products.json");
      return await response.json();
    } catch (error) {
      console.error("Error loading products:", error);
      return [];
    }
  },

  async renderProducts() {
    const products = await this.getProducts();
    const container = document.getElementById("product-list");

    container.innerHTML = products
      .map(
        (product) => `
          <div class="col-md-4 col-lg-3">
              <div class="product-card">
                  <img src="${product.image}" alt="${product.name}">
                  <h3>${product.name}</h3>
                  <p class="text-muted">${product.description}</p>
                  <div class="d-flex justify-content-between align-items-center">
                      <span class="product-price">৳${(
                        product.price / 100
                      ).toFixed(2)}</span>
                      <button onclick="CartManager.addToCart(${product.id})" 
                          class="btn btn-primary">
                          <i class="bi bi-cart-plus"></i> Add
                      </button>
                  </div>
              </div>
          </div>
      `
      )
      .join("");
  },
};

// Cart Module
const CartManager = {
  validPromoCodes: {
    ostad10: 10,
    ostad5: 5,
  },

  appliedPromo: null,
  discountAmount: 0,

  getCart() {
    return JSON.parse(localStorage.getItem("cart")) || [];
  },

  saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
    this.updateUI();
  },

  addToCart(productId) {
    const cart = this.getCart();
    const existing = cart.find((item) => item.id === productId);

    if (existing) {
      existing.quantity++;
    } else {
      cart.push({ id: productId, quantity: 1 });
    }

    this.saveCart(cart);
    Swal.fire({
      icon: "success",
      title: "Item Added!",
      text: "Product has been added to your cart",
      timer: 1500,
      showConfirmButton: false,
    });
  },

  removeItem(productId) {
    const cart = this.getCart().filter((item) => item.id !== productId);
    this.saveCart(cart);
  },

  updateQuantity(productId, newQty) {
    if (newQty < 1) return this.removeItem(productId);

    const cart = this.getCart().map((item) =>
      item.id === productId ? { ...item, quantity: newQty } : item
    );
    this.saveCart(cart);
  },

  clearCart() {
    localStorage.removeItem("cart");
    this.appliedPromo = null;
    this.discountAmount = 0;
    this.updateUI();
  },

  applyPromoCode() {
    const promoCode = document.getElementById("promo-code").value.trim();
    const messageEl = document.getElementById("promo-message");

    if (this.appliedPromo) {
      messageEl.innerHTML =
        '<span class="text-error">A promo code is already applied</span>';
      return;
    }

    if (this.validPromoCodes.hasOwnProperty(promoCode)) {
      this.appliedPromo = promoCode;
      this.discountAmount = this.validPromoCodes[promoCode];
      messageEl.innerHTML = `<span class="text-discount">${this.discountAmount}% discount applied!</span>`;
      this.updateUI();
    } else {
      messageEl.innerHTML =
        '<span class="text-error">Invalid promo code</span>';
      setTimeout(() => (messageEl.innerHTML = ""), 2000);
    }
  },

  calculateTotals(subtotal) {
    const discount = this.appliedPromo
      ? (subtotal * this.discountAmount) / 100
      : 0;

    return {
      subtotal: subtotal,
      discount: discount,
      total: subtotal - discount,
    };
  },

  async updateUI() {
    const cart = this.getCart();
    const products = await ProductManager.getProducts();
    const hasItems = cart.length > 0;

    // Update button states
    const checkoutBtn = document.getElementById("checkout-btn");
    const clearBtn = document.getElementById("clear-cart");
    if (checkoutBtn) checkoutBtn.disabled = !hasItems;
    if (clearBtn) clearBtn.disabled = !hasItems;

    // Update cart count
    document
      .querySelectorAll("#cart-count")
      .forEach(
        (el) =>
          (el.textContent = cart.reduce((sum, item) => sum + item.quantity, 0))
      );

    // Update cart drawer
    const drawerContent = document.getElementById("drawer-content");
    if (drawerContent) {
      drawerContent.innerHTML = cart.length
        ? cart
            .map((item) => {
              const product = products.find((p) => p.id === item.id);
              return `
                  <div class="cart-item">
                      <div>
                          <h6>${product.name}</h6>
                          <small>${item.quantity} × ৳${(
                product.price / 100
              ).toFixed(2)}</small>
                      </div>
                      <div>৳${((product.price * item.quantity) / 100).toFixed(
                        2
                      )}</div>
                  </div>
              `;
            })
            .join("")
        : '<p class="text-muted p-3">Your cart is empty</p>';
    }

    // Update cart page
    if (window.location.pathname.endsWith("cart.html")) {
      const rawTotal =
        cart.reduce((sum, item) => {
          const product = products.find((p) => p.id === item.id);
          return sum + product.price * item.quantity;
        }, 0) / 100;

      const totals = this.calculateTotals(rawTotal);

      document.getElementById("cart-subtotal").textContent =
        totals.subtotal.toFixed(2);
      document.getElementById("cart-discount").textContent =
        totals.discount.toFixed(2);
      document.getElementById("cart-total").textContent =
        totals.total.toFixed(2);

      document.getElementById("cart-items").innerHTML =
        cart
          .map((item) => {
            const product = products.find((p) => p.id === item.id);
            return `
                  <div class="cart-item">
                      <div>
                          <h5>${product.name}</h5>
                          <p class="text-muted">৳${(
                            product.price / 100
                          ).toFixed(2)} each</p>
                      </div>
                      <div class="quantity-controls">
                          <button class="btn btn-outline-secondary" 
                              onclick="CartManager.updateQuantity(${
                                product.id
                              }, ${item.quantity - 1})">−</button>
                          <span class="px-3">${item.quantity}</span>
                          <button class="btn btn-outline-secondary" 
                              onclick="CartManager.updateQuantity(${
                                product.id
                              }, ${item.quantity + 1})">+</button>
                          <button class="btn btn-remove ms-2" 
                              onclick="CartManager.removeItem(${product.id})">
                              <i class="bi bi-trash"></i>
                          </button>
                      </div>
                  </div>
              `;
          })
          .join("") || '<p class="text-muted p-3">Your cart is empty</p>';
    }
  },

  handleCheckout() {
    if (this.getCart().length === 0) return;

    const totals = this.calculateTotals(
      parseFloat(document.getElementById("cart-subtotal").textContent)
    );

    Swal.fire({
      title: "Order Successful!",
      html: `<div class="text-success">
                  <i class="bi bi-check-circle-fill display-4"></i>
                  <h3 class="mt-3">Thank you for shopping!</h3>
                  <p>Total Paid: ৳${totals.total.toFixed(2)}</p>
                </div>`,
      showConfirmButton: false,
      timer: 2000,
    }).then(() => {
      this.clearCart();
      window.location.href = "index.html";
    });
  },

  handleClearCart() {
    if (this.getCart().length === 0) {
      Swal.fire({
        icon: "info",
        title: "Cart is Empty",
        text: "There are no items to remove",
        confirmButtonText: "OK",
      });
      return;
    }

    Swal.fire({
      title: "Clear Cart?",
      text: "This will remove all items from your cart",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, clear it!",
    }).then((result) => {
      if (result.isConfirmed) {
        this.clearCart();
        Swal.fire("Cleared!", "Your cart is now empty", "success");
      }
    });
  },
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.endsWith("cart.html")) {
    CartManager.updateUI();
    document
      .getElementById("checkout-btn")
      .addEventListener("click", () => CartManager.handleCheckout());
    document
      .getElementById("clear-cart")
      .addEventListener("click", () => CartManager.handleClearCart());
  } else {
    ProductManager.renderProducts();
    CartManager.updateUI();
  }
});
