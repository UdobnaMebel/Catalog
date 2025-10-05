document.addEventListener('DOMContentLoaded', async () => {
    const productsRootPath = 'products';
    const catalogContainer = document.getElementById('catalog-container');
    const mainContent = document.querySelector('main');

    // --- ЛОГИКА АНИМАЦИИ ПЕРЕХОДОВ ---
    // 1. Плавное появление контента при загрузке страницы
    mainContent.classList.add('is-visible');

    // 2. Функция для навигации с анимацией затухания
    const navigateWithTransition = (url) => {
        mainContent.classList.remove('is-visible'); // Убираем видимость
        mainContent.classList.add('is-leaving');  // Добавляем класс для анимации затухания
        setTimeout(() => {
            window.location.href = url; // Переходим на новую страницу после анимации
        }, 400); // Задержка должна совпадать со временем анимации в CSS (transition: opacity 0.4s)
    };

    const getProductData = async () => {
        const cachedData = sessionStorage.getItem('allProductsData');
        if (cachedData) {
            return JSON.parse(cachedData);
        }

        const allProducts = [];
        const categoriesResponse = await fetch(`${productsRootPath}/categories.txt`);
        const categoriesText = await categoriesResponse.text();
        const categoryFolders = categoriesText.split('\n').filter(folder => folder.trim() !== '');

        for (const categoryFolder of categoryFolders) {
            const categoryPath = `${productsRootPath}/${categoryFolder.trim()}`;
            const categoryName = await (await fetch(`${categoryPath}/category_name.txt`)).text();

            let i = 1;
            while (true) {
                const productPath = `${categoryPath}/${i}`;
                const nameRes = await fetch(`${productPath}/name.txt`);
                if (!nameRes.ok) break;

                const name = await nameRes.text();
                const price = await (await fetch(`${productPath}/price.txt`)).text();
                const oldPriceRes = await fetch(`${productPath}/old_price.txt`);
                const oldPrice = oldPriceRes.ok ? await oldPriceRes.text() : null;
                const description = await (await fetch(`${productPath}/description.txt`)).text();

                const images = [];
                 for (let j = 1; j < 15; j++) {
                    let foundImage = false;
                    for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'PNG']) {
                        const imgPath = `${productPath}/image${j}.${ext}`;
                        const res = await fetch(imgPath, { method: 'HEAD' });
                        if (res.ok) {
                            images.push(imgPath);
                            foundImage = true;
                            break; 
                        }
                    }
                    if (!foundImage && j > 1) { /* break; */ }
                }
                if (images.length === 0) images.push('https://via.placeholder.com/300?text=No+Image');

                allProducts.push({
                    id: `${categoryFolder.trim()}-${i}`,
                    category: categoryName.trim(),
                    name: name.trim(),
                    price: parseFloat(price) || 0,
                    oldPrice: oldPrice ? parseFloat(oldPrice) : null,
                    description: description.trim(),
                    images: images
                });
                i++;
            }
        }
        
        sessionStorage.setItem('allProductsData', JSON.stringify(allProducts));
        return allProducts;
    };

    const renderCatalog = (products) => {
        const productsByCategory = products.reduce((acc, p) => {
            (acc[p.category] = acc[p.category] || []).push(p);
            return acc;
        }, {});

        catalogContainer.innerHTML = '';
        for (const category in productsByCategory) {
            const categoryProducts = productsByCategory[category];
            let productsHTML = '';

            categoryProducts.forEach(p => {
                let priceHTML = p.price > 0 ? `${p.price.toLocaleString('ru-RU')}&nbsp;₽` : 'Цена по запросу';
                const oldPriceHTML = p.oldPrice ? `<span class="old-price">${p.oldPrice.toLocaleString('ru-RU')}&nbsp;₽</span>` : '';

                productsHTML += `
                    <a href="product.html?id=${p.id}" class="product-card">
                        <img src="${p.images[0]}" alt="${p.name}" class="product-card-image">
                        <div class="product-card-content">
                            <h3>${p.name}</h3>
                            <div class="product-card-price">${priceHTML}${oldPriceHTML}</div>
                        </div>
                    </a>
                `;
            });

            catalogContainer.innerHTML += `
                <section class="category-section">
                    <div class="category-header">
                        <div class="category-title">
                            <h2>${category}</h2>
                            <span class="product-count">(${categoryProducts.length})</span>
                        </div>
                        <div class="category-toggle-icon"></div>
                    </div>
                    <div class="product-grid">${productsHTML}</div>
                </section>
            `;
        }

        // --- ИЗМЕНЕНИЕ ЗДЕСЬ: Добавляем обработчики кликов после отрисовки ---
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (event) => {
                event.preventDefault(); // Отменяем стандартный переход по ссылке
                const url = card.href;
                navigateWithTransition(url); // Запускаем нашу функцию перехода с анимацией
            });
        });

        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
                header.nextElementSibling.classList.toggle('collapsed');
            });
        });
    };

    const allProducts = await getProductData();
    renderCatalog(allProducts);
});