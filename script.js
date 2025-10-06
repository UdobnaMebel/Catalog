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
            const nameRes = await fetch(`${productPath}/name.txt`);
            const priceRes = await fetch(`${productPath}/price.txt`);
            const oldPriceRes = await fetch(`${productPath}/old_price.txt`);
            
            const name = await nameRes.text();
            const price = await priceRes.text();
            const oldPrice = oldPriceRes.ok ? await oldPriceRes.text() : null;

            // Ищем только первую картинку
            let coverImage = 'https://via.placeholder.com/300?text=No+Image';
            for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'PNG']) {
                const imgPath = `${productPath}/image1.${ext}`;
                const res = await fetch(imgPath, { method: 'HEAD' });
                if (res.ok) {
                    coverImage = imgPath;
                    break;
                }
            }

            return {
                id: `${categoryFolder}-${productFolder}`,
                name: name.trim(),
                price: parseFloat(price) || 0,
                oldPrice: oldPrice ? parseFloat(oldPrice) : null,
                coverImage: coverImage
            };
        } catch (error) {
            console.error(`Ошибка при загрузке данных для ${productPath}`, error);
            return null;
        }
    };

    const renderCatalog = (categories) => {
        catalogContainer.innerHTML = '';
        categories.forEach(async category => {
            const categoryElement = document.createElement('section');
            categoryElement.className = 'category-section';

            let productsHTML = `<div class="loader"></div>`; // Показываем загрузчик для каждой категории

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

            const productPromises = category.products.map(pFolder => fetchProductSummary(category.folder, pFolder));
            const products = (await Promise.all(productPromises)).filter(p => p !== null);

            productsHTML = '';
            products.forEach(p => {
                let priceHTML = p.price > 0 ? `${p.price.toLocaleString('ru-RU')}&nbsp;₽` : 'Цена по запросу';
                const oldPriceHTML = p.oldPrice ? `<span class="old-price">${p.oldPrice.toLocaleString('ru-RU')}&nbsp;₽</span>` : '';

                productsHTML += `
                    <a href="product.html?id=${p.id}" class="product-card">
                        <img src="${p.coverImage}" alt="${p.name}" class="product-card-image">
                        <div class="product-card-content">
                            <h3>${p.name}</h3>
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