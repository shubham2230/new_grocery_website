/**
 * FreshMart - Cart JavaScript
 * Handles displaying and managing cart items
 */

// Store cart data
let cart = [];

// Initialize the cart
document.addEventListener('DOMContentLoaded', () => {
    console.log('Cart page loaded - initializing cart');
    
    // Load cart from localStorage
    loadCart();
    
    // Initialize notification close button
    const notification = document.getElementById('notification');
    const notificationCloseBtn = document.querySelector('#notification-close');
    if (notificationCloseBtn) {
        notificationCloseBtn.addEventListener('click', () => {
            notification.classList.remove('show');
        });
    }
});

/**
 * Load cart data from localStorage
 */
function loadCart() {
    const cartContainer = document.getElementById('cart-container');
    
    if (!cartContainer) {
        console.error('Cart container not found');
        return;
    }
    
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
            
            if (cart.length > 0) {
                // Display cart items
                renderCart();
                
                // Update cart icon count
                updateCartIcon();
            } else {
                displayEmptyCart();
            }
        } catch (error) {
            console.error('Error parsing cart data:', error);
            displayEmptyCart();
        }
    } else {
        displayEmptyCart();
    }
}

/**
 * Display empty cart message
 */
function displayEmptyCart() {
    const cartContainer = document.getElementById('cart-container');
    
    cartContainer.innerHTML = `
        <div class="cart-empty">
            <i class="fas fa-shopping-cart"></i>
            <h3>Your cart is empty</h3>
            <p>Looks like you haven't added any products to your cart yet.</p>
            <a href="/index.html" class="btn btn-primary mt-3">Continue Shopping</a>
        </div>
    `;
}

/**
 * Render cart items and summary
 */
function renderCart() {
    const cartContainer = document.getElementById('cart-container');
    
    // Calculate cart totals
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping = subtotal > 50 ? 0 : 5.99;
    const total = subtotal + shipping;
    
    cartContainer.innerHTML = `
        <div class="row">
            <div class="col-lg-8">
                <table class="cart-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Price</th>
                            <th>Quantity</th>
                            <th>Total</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="cart-items">
                        ${cart.map(item => `
                            <tr data-id="${item.id}">
                                <td>
                                    <div class="cart-product">
                                        <img src="${item.image}" alt="${item.name}" onerror="this.src='/images/logo.png'">
                                        <div class="cart-product-info">
                                            <h3>${item.name}</h3>
                                            <div class="stock-info">
                                                <small>${item.quantity >= item.stock ? '<span class="text-danger">Max stock reached</span>' : `Available: ${item.stock}`}</small>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td>$${parseFloat(item.price).toFixed(2)}</td>
                                <td>
                                    <div class="cart-quantity">
                                        <button class="quantity-btn decrease-qty" data-id="${item.id}">-</button>
                                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="${item.stock || 99}" data-id="${item.id}">
                                        <button class="quantity-btn increase-qty" data-id="${item.id}" ${item.quantity >= item.stock ? 'disabled' : ''}>+</button>
                                    </div>
                                </td>
                                <td>$${(item.price * item.quantity).toFixed(2)}</td>
                                <td>
                                    <button class="remove-item" data-id="${item.id}">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="col-lg-4">
                <div class="cart-summary">
                    <h3>Order Summary</h3>
                    <div class="summary-item">
                        <span>Subtotal</span>
                        <span>$${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="summary-item">
                        <span>Shipping</span>
                        <span>${shipping === 0 ? 'Free' : '$' + shipping.toFixed(2)}</span>
                    </div>
                    <div class="summary-total">
                        <span>Total</span>
                        <span>$${total.toFixed(2)}</span>
                    </div>
                    <button class="checkout-btn" id="checkout-btn">
                        Proceed to Checkout
                    </button>
                    <a href="/index.html" class="continue-shopping">
                        <i class="fas fa-arrow-left"></i> Continue Shopping
                    </a>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners for cart actions
    attachCartEventListeners();
}

/**
 * Attach event listeners to cart elements
 */
function attachCartEventListeners() {
    // Decrease quantity buttons
    const decreaseButtons = document.querySelectorAll('.decrease-qty');
    decreaseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            updateItemQuantity(id, 'decrease');
        });
    });
    
    // Increase quantity buttons
    const increaseButtons = document.querySelectorAll('.increase-qty');
    increaseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            updateItemQuantity(id, 'increase');
        });
    });
    
    // Quantity input changes
    const quantityInputs = document.querySelectorAll('.quantity-input');
    quantityInputs.forEach(input => {
        // Add input event to validate in real-time as user types
        input.addEventListener('input', function() {
            const id = parseInt(this.dataset.id);
            const itemIndex = cart.findIndex(item => item.id === id);
            
            if (itemIndex === -1) return;
            
            const item = cart[itemIndex];
            const maxStock = item.stock || 99;
            let newQuantity = parseInt(this.value);
            
            // If user types a value higher than stock, immediately cap it
            if (!isNaN(newQuantity) && newQuantity > maxStock) {
                this.value = maxStock;
            }
        });
        
        // Keep the change event for when focus leaves the input
        input.addEventListener('change', function() {
            const id = parseInt(this.dataset.id);
            const itemIndex = cart.findIndex(item => item.id === id);
            
            if (itemIndex === -1) return;
            
            const item = cart[itemIndex];
            const maxStock = item.stock || 99;
            let newQuantity = parseInt(this.value);
            
            if (isNaN(newQuantity) || newQuantity < 1) {
                // Reset to minimum if invalid
                newQuantity = 1;
                this.value = 1;
            } else if (newQuantity > maxStock) {
                // Cap at maximum stock
                newQuantity = maxStock;
                this.value = maxStock;
                showNotification(`Quantity limited to available stock (${maxStock})`, 'warning');
            }
            
            updateItemQuantity(id, 'set', newQuantity);
        });
    });
    
    // Remove item buttons
    const removeButtons = document.querySelectorAll('.remove-item');
    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            removeCartItem(id);
        });
    });
    
    // Checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', proceedToCheckout);
    }
}

/**
 * Update cart item quantity
 */
function updateItemQuantity(id, action, value = null) {
    // Find the item in the cart
    const itemIndex = cart.findIndex(item => item.id === id);
    
    if (itemIndex === -1) return;
    
    const item = cart[itemIndex];
    const maxStock = item.stock || 999; // Default to a high value if stock info is missing
    let newQuantity = item.quantity;
    
    switch (action) {
        case 'increase':
            newQuantity = item.quantity + 1;
            break;
        case 'decrease':
            if (item.quantity > 1) {
                newQuantity = item.quantity - 1;
            }
            break;
        case 'set':
            newQuantity = value;
            break;
    }
    
    // Check if new quantity exceeds stock
    if (newQuantity > maxStock) {
        showNotification(`Sorry, only ${maxStock} items available in stock`, 'warning');
        newQuantity = maxStock; // Limit to available stock
    }
    
    // Update quantity
    item.quantity = newQuantity;
    
    // Update cart in localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Re-render the cart
    renderCart();
    
    // Update cart icon
    updateCartIcon();
    
    // Show notification if successful (not for decrease or setting to max stock)
    if (!(action === 'increase' && newQuantity === maxStock) && 
        !(action === 'set' && newQuantity === maxStock)) {
        showNotification('Cart updated');
    }
}

/**
 * Remove item from cart
 */
function removeCartItem(id) {
    // Remove item from cart
    cart = cart.filter(item => item.id !== id);
    
    // Update cart in localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // If cart is now empty, show empty cart message
    if (cart.length === 0) {
        displayEmptyCart();
    } else {
        // Re-render the cart
        renderCart();
    }
    
    // Update cart icon
    updateCartIcon();
    
    // Show notification
    showNotification('Item removed from cart');
}

/**
 * Update cart icon with count
 */
function updateCartIcon() {
    const cartIcon = document.querySelector('.cart-icon');
    if (!cartIcon) return;
    
    let cartItemCount = document.querySelector('.cart-item-count');
    
    // Calculate total quantity
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    
    if (totalItems > 0) {
        if (cartItemCount) {
            cartItemCount.textContent = totalItems;
        } else {
            const span = document.createElement('span');
            span.className = 'cart-item-count';
            span.textContent = totalItems;
            cartIcon.appendChild(span);
        }
    } else if (cartItemCount) {
        cartItemCount.remove();
    }
}

/**
 * Show notification message
 */
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    const notificationIcon = notification.querySelector('i:first-child');
    
    if (!notification || !notificationMessage) return;
    
    // Set message
    notificationMessage.textContent = message;
    
    // Set notification type
    notification.className = 'notification'; // Reset classes
    notification.classList.add(type); // Add type class
    
    // Update icon based on type
    if (notificationIcon) {
        if (type === 'warning') {
            notificationIcon.className = 'fas fa-exclamation-circle';
        } else {
            notificationIcon.className = 'fas fa-check-circle';
        }
    }
    
    // Show notification
    notification.classList.add('show');
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

/**
 * Proceed to checkout
 */
function proceedToCheckout() {
    // For now, just show a notification
    showNotification('Checkout functionality will be implemented soon');
    
    // In a real application, you would redirect to a checkout page
    // window.location.href = '/checkout.html';
} 