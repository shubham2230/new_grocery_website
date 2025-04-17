// Seller Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    initDashboard();
    
    // Add event listeners for tab navigation
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (link.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const tabId = link.getAttribute('href');
                showTab(tabId);
            }
        });
    });
});

// Show the selected tab and update active state
function showTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.dashboard-tab').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Show the selected tab
    document.querySelector(tabId).style.display = 'block';
    
    // Update active state in sidebar
    document.querySelectorAll('.sidebar-nav li').forEach(item => {
        item.classList.remove('active');
    });
    
    document.querySelector(`.sidebar-nav a[href="${tabId}"]`).parentElement.classList.add('active');
    
    // Load data for the selected tab
    if (tabId === '#dashboard') {
        loadDashboardSummary();
    } else if (tabId === '#products') {
        loadProducts();
    } else if (tabId === '#orders') {
        loadOrders();
    } else if (tabId === '#analytics') {
        loadAnalytics();
    }
}

// Initialize dashboard
async function initDashboard() {
    try {
        // Load dashboard summary by default
        loadDashboardSummary();
        
        // Load categories for product forms
        await loadCategories();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showAlert('error', 'Error loading dashboard data');
    }
}

// Load dashboard summary
async function loadDashboardSummary() {
    try {
        showLoader('dashboard-summary');
        
        const response = await fetch('/api/seller/dashboard');
        
        if (!response.ok) {
            throw new Error('Failed to load dashboard data');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Update dashboard stats
            document.getElementById('total-products').textContent = data.summary.productsCount;
            document.getElementById('low-stock').textContent = data.summary.lowStockCount;
            document.getElementById('out-of-stock').textContent = data.summary.outOfStockCount;
            document.getElementById('total-orders').textContent = data.summary.ordersCount;
            document.getElementById('total-revenue').textContent = `$${data.summary.totalRevenue.toFixed(2)}`;
            
            // Render recent orders
            renderRecentOrders(data.summary.recentOrders);
            
            // Render top products
            renderTopProducts(data.summary.topProducts);
            
            // Render product categories chart
            renderCategoryChart(data.summary.productsByCategory);
        } else {
            showAlert('error', data.message || 'Failed to load dashboard data');
        }
    } catch (error) {
        console.error('Error loading dashboard summary:', error);
        showAlert('error', 'Error loading dashboard data');
    } finally {
        hideLoader('dashboard-summary');
    }
}

// Load products
async function loadProducts() {
    try {
        showLoader('products-table');
        
        const response = await fetch('/api/seller/products');
        
        if (!response.ok) {
            throw new Error('Failed to load products');
        }
        
        const data = await response.json();
        
        if (data.success) {
            renderProductsTable(data.products);
        } else {
            showAlert('error', data.message || 'Failed to load products');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showAlert('error', 'Error loading products');
    } finally {
        hideLoader('products-table');
    }
}

// Render products table
function renderProductsTable(products) {
    const tableBody = document.querySelector('#products-table tbody');
    tableBody.innerHTML = '';
    
    if (products.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">No products found</td>
            </tr>
        `;
        return;
    }
    
    products.forEach(product => {
        const row = document.createElement('tr');
        
        // Determine stock status
        let stockStatus = 'Active';
        let statusClass = 'bg-success';
        
        if (product.stock === 0) {
            stockStatus = 'Out of Stock';
            statusClass = 'bg-danger';
        } else if (product.stock < 10) {
            stockStatus = 'Low Stock';
            statusClass = 'bg-warning';
        }
        
        row.innerHTML = `
            <td>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="selectedProducts" value="${product.id}">
                </div>
            </td>
            <td>
                <img src="${product.image_url || 'images/product-placeholder.jpg'}" alt="${product.name}" class="product-thumbnail">
            </td>
            <td>${product.name}</td>
            <td>${product.category_name || 'Uncategorized'}</td>
            <td>$${parseFloat(product.price).toFixed(2)}</td>
            <td>${product.stock}</td>
            <td><span class="badge ${statusClass}">${stockStatus}</span></td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary edit-product" data-id="${product.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-product" data-id="${product.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary view-product" data-id="${product.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners for product actions
    addProductActionListeners();
}

// Add event listeners for product actions
function addProductActionListeners() {
    // Edit product buttons
    document.querySelectorAll('.edit-product').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            openEditProductModal(productId);
        });
    });
    
    // Delete product buttons
    document.querySelectorAll('.delete-product').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            confirmDeleteProduct(productId);
        });
    });
    
    // View product buttons
    document.querySelectorAll('.view-product').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            viewProductDetails(productId);
        });
    });
}

// Load categories for product forms
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        
        if (!response.ok) {
            throw new Error('Failed to load categories');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Populate category dropdowns
            const categories = data.categories;
            const categorySelects = document.querySelectorAll('.category-select');
            
            categorySelects.forEach(select => {
                select.innerHTML = '<option value="">Select Category</option>';
                
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    select.appendChild(option);
                });
            });
            
            // Populate category list in category tab
            renderCategoryList(categories);
        } else {
            showAlert('error', data.message || 'Failed to load categories');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        showAlert('error', 'Error loading categories');
    }
}

// Render category list
function renderCategoryList(categories) {
    const categoryList = document.querySelector('.category-list');
    
    if (!categoryList) return;
    
    categoryList.innerHTML = '';
    
    categories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item d-flex justify-content-between align-items-center mb-2';
        categoryItem.innerHTML = `
            <span>${category.name}</span>
            <span class="badge bg-primary rounded-pill">${category.count || 0}</span>
        `;
        
        categoryList.appendChild(categoryItem);
    });
}

// Add new product form submission
document.getElementById('addProductForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(this);
        
        // Add featured checkbox value
        const featuredCheckbox = document.getElementById('productFeatured');
        formData.set('featured', featuredCheckbox.checked);
        
        const response = await fetch('/api/seller/products', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addProductModal'));
            modal.hide();
            
            // Reset form
            this.reset();
            
            // Reload products
            loadProducts();
            
            // Show success message
            showAlert('success', 'Product added successfully');
        } else {
            showAlert('error', data.message || 'Failed to add product');
        }
    } catch (error) {
        console.error('Error adding product:', error);
        showAlert('error', 'Error adding product');
    }
});

// Open edit product modal
async function openEditProductModal(productId) {
    try {
        showLoader('editProductModal');
        
        const response = await fetch(`/api/seller/products/${productId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load product details');
        }
        
        const data = await response.json();
        
        if (data.success) {
            const product = data.product;
            
            // Populate form fields
            document.getElementById('editProductId').value = product.id;
            document.getElementById('editProductName').value = product.name;
            document.getElementById('editProductCategory').value = product.category_id;
            document.getElementById('editProductPrice').value = product.price;
            document.getElementById('editProductStock').value = product.stock;
            document.getElementById('editProductDescription').value = product.description;
            document.getElementById('editProductFeatured').checked = product.featured;
            
            // Show current image if exists
            const currentImageContainer = document.querySelector('.current-image');
            if (product.image_url) {
                currentImageContainer.innerHTML = `
                    <img src="${product.image_url}" alt="Current Product Image" style="max-height: 100px;">
                `;
                currentImageContainer.style.display = 'block';
            } else {
                currentImageContainer.style.display = 'none';
            }
            
            // Open modal
            const modal = new bootstrap.Modal(document.getElementById('editProductModal'));
            modal.show();
        } else {
            showAlert('error', data.message || 'Failed to load product details');
        }
    } catch (error) {
        console.error('Error loading product details:', error);
        showAlert('error', 'Error loading product details');
    } finally {
        hideLoader('editProductModal');
    }
}

// Edit product form submission
document.getElementById('editProductForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(this);
        const productId = document.getElementById('editProductId').value;
        
        // Add featured checkbox value
        const featuredCheckbox = document.getElementById('editProductFeatured');
        formData.set('featured', featuredCheckbox.checked);
        
        const response = await fetch(`/api/seller/products/${productId}`, {
            method: 'PUT',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editProductModal'));
            modal.hide();
            
            // Reload products
            loadProducts();
            
            // Show success message
            showAlert('success', 'Product updated successfully');
        } else {
            showAlert('error', data.message || 'Failed to update product');
        }
    } catch (error) {
        console.error('Error updating product:', error);
        showAlert('error', 'Error updating product');
    }
});

// Confirm delete product
function confirmDeleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        deleteProduct(productId);
    }
}

// Delete product
async function deleteProduct(productId) {
    try {
        const response = await fetch(`/api/seller/products/${productId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Reload products
            loadProducts();
            
            // Show success message
            showAlert('success', 'Product deleted successfully');
        } else {
            showAlert('error', data.message || 'Failed to delete product');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showAlert('error', 'Error deleting product');
    }
}

// View product details
async function viewProductDetails(productId) {
    // Implement product view functionality
    console.log('View product:', productId);
}

// Load orders
async function loadOrders(page = 1) {
    try {
        showLoader('orders-table');
        
        const response = await fetch(`/api/seller/orders?page=${page}`);
        
        if (!response.ok) {
            throw new Error('Failed to load orders');
        }
        
        const data = await response.json();
        
        if (data.success) {
            renderOrdersTable(data.orders);
            renderPagination(data.pagination, 'orders-pagination', loadOrders);
        } else {
            showAlert('error', data.message || 'Failed to load orders');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showAlert('error', 'Error loading orders');
    } finally {
        hideLoader('orders-table');
    }
}

// Render orders table
function renderOrdersTable(orders) {
    const tableBody = document.querySelector('#orders-table tbody');
    tableBody.innerHTML = '';
    
    if (orders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No orders found</td>
            </tr>
        `;
        return;
    }
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        
        // Format date
        const orderDate = new Date(order.created_at);
        const formattedDate = orderDate.toLocaleDateString() + ' ' + orderDate.toLocaleTimeString();
        
        // Determine order status
        let statusClass = 'bg-info';
        switch (order.status) {
            case 'completed':
                statusClass = 'bg-success';
                break;
            case 'cancelled':
                statusClass = 'bg-danger';
                break;
            case 'processing':
                statusClass = 'bg-primary';
                break;
            default:
                statusClass = 'bg-info';
        }
        
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${formattedDate}</td>
            <td>${order.first_name} ${order.last_name}</td>
            <td>$${parseFloat(order.total_amount).toFixed(2)}</td>
            <td><span class="badge ${statusClass}">${order.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary view-order" data-id="${order.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners for order actions
    document.querySelectorAll('.view-order').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-id');
            viewOrderDetails(orderId);
        });
    });
}

// View order details
async function viewOrderDetails(orderId) {
    try {
        showLoader('order-details');
        
        const response = await fetch(`/api/seller/orders/${orderId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load order details');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Implement order details view
            console.log('Order details:', data);
        } else {
            showAlert('error', data.message || 'Failed to load order details');
        }
    } catch (error) {
        console.error('Error loading order details:', error);
        showAlert('error', 'Error loading order details');
    } finally {
        hideLoader('order-details');
    }
}

// Load analytics
async function loadAnalytics() {
    try {
        showLoader('analytics');
        
        const response = await fetch('/api/seller/analytics/revenue');
        
        if (!response.ok) {
            throw new Error('Failed to load analytics data');
        }
        
        const data = await response.json();
        
        if (data.success) {
            renderRevenueChart(data.analytics);
        } else {
            showAlert('error', data.message || 'Failed to load analytics data');
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
        showAlert('error', 'Error loading analytics data');
    } finally {
        hideLoader('analytics');
    }
}

// Render recent orders
function renderRecentOrders(orders) {
    const recentOrdersList = document.getElementById('recent-orders-list');
    recentOrdersList.innerHTML = '';
    
    if (orders.length === 0) {
        recentOrdersList.innerHTML = '<p class="text-center">No recent orders</p>';
        return;
    }
    
    orders.forEach(order => {
        const orderDate = new Date(order.created_at);
        const formattedDate = orderDate.toLocaleDateString();
        
        const listItem = document.createElement('div');
        listItem.className = 'list-group-item';
        listItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">Order #${order.id}</h6>
                <small>${formattedDate}</small>
            </div>
            <p class="mb-1">${order.first_name} ${order.last_name}</p>
            <div class="d-flex justify-content-between align-items-center">
                <small>$${parseFloat(order.total_amount).toFixed(2)}</small>
                <span class="badge bg-info">${order.status}</span>
            </div>
        `;
        
        recentOrdersList.appendChild(listItem);
    });
}

// Render top products
function renderTopProducts(products) {
    const topProductsList = document.getElementById('top-products-list');
    topProductsList.innerHTML = '';
    
    if (products.length === 0) {
        topProductsList.innerHTML = '<p class="text-center">No products sold yet</p>';
        return;
    }
    
    products.forEach(product => {
        const listItem = document.createElement('div');
        listItem.className = 'list-group-item';
        listItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${product.name}</h6>
                <small>${product.total_sold} sold</small>
            </div>
            <p class="mb-1">$${parseFloat(product.price).toFixed(2)}</p>
            <small>Revenue: $${parseFloat(product.total_revenue).toFixed(2)}</small>
        `;
        
        topProductsList.appendChild(listItem);
    });
}

// Helper function to render pagination
function renderPagination(pagination, containerId, callback) {
    const paginationContainer = document.getElementById(containerId);
    paginationContainer.innerHTML = '';
    
    if (pagination.total <= pagination.limit) {
        return;
    }
    
    const paginationUl = document.createElement('ul');
    paginationUl.className = 'pagination pagination-sm mb-0';
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${pagination.page === 1 ? 'disabled' : ''}`;
    
    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#';
    prevLink.textContent = 'Previous';
    
    if (pagination.page > 1) {
        prevLink.addEventListener('click', e => {
            e.preventDefault();
            callback(pagination.page - 1);
        });
    }
    
    prevLi.appendChild(prevLink);
    paginationUl.appendChild(prevLi);
    
    // Page numbers
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.pages, pagination.page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${pagination.page === i ? 'active' : ''}`;
        
        const pageLink = document.createElement('a');
        pageLink.className = 'page-link';
        pageLink.href = '#';
        pageLink.textContent = i;
        
        pageLink.addEventListener('click', e => {
            e.preventDefault();
            callback(i);
        });
        
        pageLi.appendChild(pageLink);
        paginationUl.appendChild(pageLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`;
    
    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.textContent = 'Next';
    
    if (pagination.page < pagination.pages) {
        nextLink.addEventListener('click', e => {
            e.preventDefault();
            callback(pagination.page + 1);
        });
    }
    
    nextLi.appendChild(nextLink);
    paginationUl.appendChild(nextLi);
    
    paginationContainer.appendChild(paginationUl);
}

// Helper functions for UI
function showLoader(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.add('loading');
    }
}

function hideLoader(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.remove('loading');
    }
}

function showAlert(type, message) {
    const alertContainer = document.getElementById('alert-container');
    
    if (!alertContainer) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`;
    alert.role = 'alert';
    
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
    }, 5000);
} 