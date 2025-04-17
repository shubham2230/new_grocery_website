/**
 * FreshMart - Products JavaScript
 * Handles fetching and displaying products from the database
 */

// Global variables for cart functionality
let cart = [];
let currentScrollPosition = 0;
let productsPerGroup = 3; // Number of products visible at once
let currentProductsData = []; // Store the fetched products data

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded - initializing product display');
    
    // Load all products on page load
    loadAllProducts();
    
    // Set up navigation buttons
    const prevButton = document.getElementById('prevBtn');
    const nextButton = document.getElementById('nextBtn');
    
    if (prevButton && nextButton) {
        prevButton.addEventListener('click', () => scrollProducts('prev'));
        nextButton.addEventListener('click', () => scrollProducts('next'));
    }

    // Add click event listener to category items if they exist
    const categoryItems = document.querySelectorAll('.category-item');
    if (categoryItems.length > 0) {
        categoryItems.forEach(item => {
            item.addEventListener('click', function() {
                const categoryId = this.dataset.categoryId;
                if (categoryId) {
                    // Highlight active category
                    highlightActiveCategory(categoryId);
                    // Always load all products, not just from this category
                    loadAllProducts();
                }
            });
        });
    }

    // Initialize scroll dots
    const scrollDots = document.querySelectorAll('.scroll-dot');
    if (scrollDots.length > 0) {
        scrollDots.forEach(dot => {
            dot.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                currentScrollPosition = index;
                updateProductsScroll();
                updateScrollDotActive();
            });
        });
    }

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
 * Load all categories and fetch their products
 */
async function loadCategoriesWithProducts() {
    const productsTitle = document.querySelector('#products h2');
    if (productsTitle) {
        productsTitle.textContent = 'Browse Our Products';
    }
    
    try {
        // Display initial message
        const productsContainer = document.getElementById('featured-products');
        if (productsContainer) {
            productsContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading products...</div>';
        }
        
        // Load the categories if needed
        await loadCategories();
        
    } catch (error) {
        console.error('Error loading categories with products:', error);
    }
}

/**
 * Load categories from the API
 */
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }
        
        const data = await response.json();
        console.log('Categories loaded:', data.categories?.length || 0);
        
        return data.categories;
    } catch (error) {
        console.error('Error loading categories:', error);
        return [];
    }
}

/**
 * Fetch all products from the API
 */
async function loadAllProducts() {
    const productsContainer = document.getElementById('featured-products');
    
    if (!productsContainer) {
        console.error('Product container not found: #featured-products');
        return;
    }
    
    try {
        // Show loading spinner
        productsContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading products...</div>';
        
        console.log('Fetching all products from API...');
        // Fetch all products from the API
        const response = await fetch('/api/products/all');
        console.log('API response status:', response.status);
        
        if (!response.ok) {
            // Try the regular products endpoint if the /all endpoint fails
            console.log('Trying alternative API endpoint...');
            const altResponse = await fetch('/api/products');
            
            if (!altResponse.ok) {
                throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
            }
            
            const altData = await altResponse.json();
            console.log('Alternative API data:', altData);
            
            if (altData.success && altData.products && altData.products.length > 0) {
                console.log(`Loaded ${altData.products.length} products from database (alternative endpoint)`);
                currentProductsData = altData.products;
                renderProducts(currentProductsData, productsContainer);
                updateScrollDots(currentProductsData.length);
                return;
            }
        }
        
        const data = await response.json();
        console.log('API data:', data);
        
        if (data.success && data.products && data.products.length > 0) {
            console.log(`Loaded ${data.products.length} products from database`);
            currentProductsData = data.products;
            renderProducts(currentProductsData, productsContainer);
            updateScrollDots(currentProductsData.length);
        } else {
            // No products returned from API, try loading sample products
            console.error('No products found in database');
            loadSampleProducts();
        }
    } catch (error) {
        console.error('Error loading products:', error);
        // Load sample products as fallback
        loadSampleProducts();
    }
}

/**
 * Fetch featured products from the API (keeping this for backwards compatibility)
 */
async function loadFeaturedProducts() {
    loadAllProducts();
}

/**
 * Load sample products for testing
 */
function loadSampleProducts() {
    const productsContainer = document.getElementById('featured-products');
    
    if (!productsContainer) return;
    
    // Sample product data with images that should exist in most websites
    const sampleProducts = [
        {
            id: 1,
            name: 'Fresh Organic Apples',
            price: 3.99,
            stock: 25,
            image_url: '/images/logo.png',
            category_name: 'Fruits'
        },
        {
            id: 2,
            name: 'Farm Fresh Eggs',
            price: 4.49,
            stock: 18,
            image_url: '/images/logo.png',
            category_name: 'Dairy'
        },
        {
            id: 3,
            name: 'Organic Milk',
            price: 2.99,
            stock: 7,
            image_url: '/images/logo.png',
            category_name: 'Dairy'
        },
        {
            id: 4,
            name: 'Whole Grain Bread',
            price: 3.49,
            stock: 8,
            image_url: '/images/logo.png',
            category_name: 'Bakery'
        },
        {
            id: 5,
            name: 'Fresh Tomatoes',
            price: 2.99,
            stock: 15,
            image_url: '/images/logo.png',
            category_name: 'Vegetables'
        },
        {
            id: 6,
            name: 'Organic Bananas',
            price: 1.99,
            stock: 30,
            image_url: '/images/logo.png',
            category_name: 'Fruits'
        }
    ];
    
    currentProductsData = sampleProducts;
    renderProducts(sampleProducts, productsContainer);
    updateScrollDots(sampleProducts.length);
}

/**
 * Fetch products by category from the API
 */
async function loadProductsByCategory(categoryId) {
    const productsContainer = document.getElementById('featured-products');
    const productsTitle = document.querySelector('#products h2');
    
    if (!productsContainer) return;
    
    try {
        // Show loading spinner
        productsContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading products...</div>';
        
        // Highlight active category
        const categoryItems = document.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            if (item.dataset.categoryId === categoryId) {
                item.classList.add('active');
                // Update products section title to show current category
                if (productsTitle) {
                    const categoryName = item.querySelector('h3').textContent;
                    productsTitle.textContent = categoryName;
                }
            } else {
                item.classList.remove('active');
            }
        });
        
        // Fetch products by category from the API
        const response = await fetch(`/api/products/category/${categoryId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }
        
        const data = await response.json();
        console.log(`Loaded ${data.products?.length || 0} products for category ${categoryId}`);
        
        if (data.success && data.products && data.products.length > 0) {
            currentProductsData = data.products;
            renderProducts(currentProductsData, productsContainer);
            updateScrollDots(currentProductsData.length);
            
            // Scroll to products section
            document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
        } else {
            productsContainer.innerHTML = '<div class="no-products"><i class="fas fa-exclamation-circle"></i> No products available in this category at the moment.</div>';
        }
    } catch (error) {
        console.error('Error loading products:', error);
        productsContainer.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Failed to load products. Please try again later.</div>';
    }
}

/**
 * Render products in the container
 */
function renderProducts(products, container) {
    // Clear the container
    container.innerHTML = '';
    
    // Check if we have products to display
    if (!products || products.length === 0) {
        container.innerHTML = '<div class="no-products"><i class="fas fa-exclamation-circle"></i> No products are currently available.</div>';
        return;
    }
    
    // Create product cards with category info
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        // Determine stock status class
        const stockStatusClass = product.stock < 10 ? 'low-stock' : '';
        
        productCard.innerHTML = `
            <div class="product-category-tag">${product.category_name || 'Uncategorized'}</div>
            <img src="${product.image_url || '/images/logo.png'}" alt="${product.name}" onerror="this.src='/images/logo.png'">
            <h3>${product.name}</h3>
            <div class="price">$${parseFloat(product.price).toFixed(2)}</div>
            <div class="product-actions">
                <button class="add-to-cart" data-product-id="${product.id}">
                    <i class="fas fa-shopping-cart"></i> Add to Cart
                </button>
                <div class="product-stock ${stockStatusClass}">
                    ${product.stock < 10 ? 'Only ' + product.stock + ' left!' : 'In Stock'}
                </div>
            </div>
        `;
        
        // Add event listener to Add to Cart button
        const addToCartBtn = productCard.querySelector('.add-to-cart');
        addToCartBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addToCart(product);
        });
        
        // Add event listener to product card for details view
        productCard.addEventListener('click', () => {
            window.location.href = `/product.html?id=${product.id}`;
        });
        
        container.appendChild(productCard);
    });
    
    // Add styles to the container to show products in a grid
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
    container.style.gap = '20px';
    
    // Reset scroll position when rendering new products
    currentScrollPosition = 0;
    updateProductsScroll();
    updateScrollDotActive();
}

/**
 * Add product to cart
 */
function addToCart(product) {
    // Load the latest cart data from localStorage to ensure we have the most current quantities
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (e) {
            console.error('Error parsing cart data:', e);
        }
    }
    
    // Check if product already exists in cart
    const existingProduct = cart.find(item => item.id === product.id);
    
    // Get available stock
    const availableStock = product.stock || 0;
    
    if (existingProduct) {
        // Only increase quantity if it doesn't exceed available stock
        if (existingProduct.quantity < availableStock) {
            existingProduct.quantity += 1;
            showNotification(`${product.name} added to cart`);
        } else {
            showNotification(`Sorry, only ${availableStock} items available in stock`, 'warning');
            return;
        }
    } else {
        // Add new product to cart with stock information
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image_url || '/images/logo.png',
            quantity: 1,
            stock: availableStock
        });
        showNotification(`${product.name} added to cart`);
    }
    
    // Save cart to local storage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update cart icon
    updateCartIcon();
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
    notification.className = 'notification';
    
    // Add type-specific styles
    if (type === 'warning') {
        notification.classList.add('warning');
        if (notificationIcon) {
            notificationIcon.className = 'fas fa-exclamation-circle';
        }
    } else {
        notification.classList.add('success');
        if (notificationIcon) {
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
 * Handle scrolling through product groups
 */
function scrollProducts(direction) {
    const maxGroups = Math.ceil(currentProductsData.length / productsPerGroup);
    
    if (direction === 'next' && currentScrollPosition < maxGroups - 1) {
        currentScrollPosition++;
    } else if (direction === 'prev' && currentScrollPosition > 0) {
        currentScrollPosition--;
    }
    
    updateProductsScroll();
    updateScrollDotActive();
}

/**
 * Update products scroll position
 */
function updateProductsScroll() {
    const productsWrapper = document.querySelector('.products-wrapper');
    if (!productsWrapper) return;
    
    const containerWidth = productsWrapper.clientWidth;
    productsWrapper.scrollLeft = containerWidth * currentScrollPosition;
}

/**
 * Update scroll indicator based on number of products
 */
function updateScrollDots(numProducts) {
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (!scrollIndicator) return;
    
    // Clear existing indicators
    scrollIndicator.innerHTML = '';
    
    const numGroups = Math.ceil(numProducts / productsPerGroup);
    
    // Create indicators
    for (let i = 0; i < numGroups; i++) {
        const dot = document.createElement('span');
        dot.className = i === 0 ? 'scroll-dot active' : 'scroll-dot';
        dot.dataset.index = i;
        
        // Add click event to jump to specific group
        dot.addEventListener('click', () => {
            currentScrollPosition = i;
            updateProductsScroll();
            updateScrollDotActive();
        });
        
        scrollIndicator.appendChild(dot);
    }
}

/**
 * Update active scroll dot
 */
function updateScrollDotActive() {
    const dots = document.querySelectorAll('.scroll-dot');
    
    dots.forEach((dot, index) => {
        if (index === currentScrollPosition) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// Load cart from local storage on page load
window.addEventListener('load', () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
            updateCartIcon();
        } catch (e) {
            console.error('Error loading cart from local storage', e);
            localStorage.removeItem('cart');
        }
    }
});

// Handle window resize to adjust visible products per group
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    
    if (width < 768) {
        productsPerGroup = 1;
    } else if (width < 992) {
        productsPerGroup = 2;
    } else {
        productsPerGroup = 3;
    }
    
    // Update scroll indicators when screen size changes
    if (currentProductsData.length > 0) {
        updateScrollDots(currentProductsData.length);
        updateProductsScroll();
    }
});

/**
 * Highlight the active category without changing products
 */
function highlightActiveCategory(categoryId) {
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
        if (item.dataset.categoryId === categoryId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
} 