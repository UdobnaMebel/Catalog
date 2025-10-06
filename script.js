document.addEventListener('DOMContentLoaded', async () => {
    const productsRootPath = 'products';
    const mainContent = document.querySelector('main');
    const catalogContainer = document.getElementById('catalog-container');

    mainContent.classList.add('is-visible');

    const navigateWithTransition = (url) => {
        mainContent.classList.remove('is-visible');
        mainContent.classList.add('is-leaving');
        setTimeout(() => { window.location.href = url; }, 400); 
    };

    const fetchProductSummary = async (categoryFolder, productFolder) => {
        const productPath = `${productsRootPath}/${categoryFolder}/${productFolder}`;
        try {
            // Делаем всего 2 запроса вместо десятков
            const nameRes = await fetch(`${productPath}/name.txt`);
            const priceRes = await fetch(`${productPath}/price.txt`);
            const oldPriceRes = await fetch(`${productPath}/old_price.txt`);
            
            const name = await nameRes.text();
            const price = await priceRes.text();
            const oldPrice = oldPriceRes.ok ? await oldPriceRes.text() : null;

            return {
                name: name.trim(),
                price: parseFloat(price) || 0,
                oldPrice: oldPrice ? parseFloat(oldPrice) : null,
            };
        } catch (error) {
            console.error(`Ошибка при загрузке данных для ${productPath}`, error);
            return null; // Возвращаем null в случае ошибки
        }
    };

    const renderCatalog = (categories) => {
        catalogContainer.innerHTML = '';
        categories.forEach(async category => {
            const categoryElement = document.createElement('section');
            categoryElement.className = 'category-section';

            let productsHTML = `<div class="loader"></div>`;
            categoryElement.innerHTML = `
                <div class="category-header">
                    <div class="category-title">
                        <h2>${category.categoryName}</h2>
                        <span class="product-count">(${category.products.length})</span>
                    </div>
                    <div class="category-toggle-icon"></div>
                </div>
                <div class="product-grid">${productsHTML}</div>
            `;
            catalogContainer.appendChild(categoryElement);

            // Параллельно загружаем name.txt и price.txt для всех товаров в категории
            const summaryPromises = category.products.map(p => fetchProductSummary(category.folder, p.folder));
            const summaries = await Promise.all(summaryPromises);

            productsHTML = '';
            category.products.forEach((p, index) => {
                const summary = summaries[index];
                if (!summary) return; // Пропускаем, если данные не загрузились

                const productId = `${category.folder}-${p.folder}`;
                const coverImage = `${productsRootPath}/${category.folder}/${p.folder}/${p.images[0]}`;
                
                let priceHTML = summary.price > 0 ? `${summary.price.toLocaleString('ru-RU')}&nbsp;₽` : 'Цена по запросу';
                const oldPriceHTML = summary.oldPrice ? `<span class="old-price">${summary.oldPrice.toLocaleString('ru-RU')}&nbsp;₽</span>` : '';

                productsHTML += `
                    <a href="product.html?id=${productId}" class="product-card">
                        <img src="${coverImage}" alt="${summary.name}" class="product-card-image" loading="lazy">
                        <div class="product-card-content">
                            <h3>${summary.name}</h3>
                            <div class="product-card-price">${priceHTML}${oldPriceHTML}</div>
                        </div>
                    </a>
                `;
            });
            
            const grid = categoryElement.querySelector('.product-grid');
            grid.innerHTML = productsHTML;

            grid.querySelectorAll('.product-card').forEach(card => {
                card.addEventListener('click', (event) => {
                    event.preventDefault();
                    navigateWithTransition(card.href);
                });
            });

            categoryElement.querySelector('.category-header').addEventListener('click', () => {
                categoryElement.querySelector('.category-header').classList.toggle('collapsed');
                grid.classList.toggle('collapsed');
            });
        });
    };

    try {
        const response = await fetch(`${productsRootPath}/catalog-index.json`);
        const indexData = await response.json();
        renderCatalog(indexData.categories);
    } catch (error) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА: Не удалось загрузить 'products/catalog-index.json'", error);
        catalogContainer.innerHTML = `<p style="text-align: center; color: var(--accent-yellow);">Не удалось загрузить каталог.</p>`;
    }
});