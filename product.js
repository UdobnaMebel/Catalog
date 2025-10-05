document.addEventListener('DOMContentLoaded', async () => {
    const productsRootPath = 'products';
    const productDetailContainer = document.getElementById('product-detail-container');
    const overlay = document.querySelector('.page-transition-overlay');

    // --- ЛОГИКА АНИМАЦИИ ПЕРЕХОДОВ (НОВЫЙ МЕТОД) ---
    if (overlay) {
        overlay.classList.add('is-hidden');
    }

    const navigateWithTransition = (url) => {
        if (overlay) {
            overlay.classList.remove('is-hidden');
        }
        setTimeout(() => {
            window.location.href = url;
        }, 400);
    };

    const backLink = document.querySelector('.back-link');
    if (backLink) {
        backLink.addEventListener('click', (event) => {
            event.preventDefault();
            const url = backLink.href;
            navigateWithTransition(url);
        });
    }

    // --- КОД ЗАГРУЗКИ ТОВАРА ---
    let globalButtonLink = '';
    try {
        const linkResponse = await fetch(`${productsRootPath}/link.txt`);
        if (linkResponse.ok) {
            globalButtonLink = (await linkResponse.text()).trim();
        } else {
            throw new Error('products/link.txt not found');
        }
    } catch (error) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА: Не удалось загрузить обязательный файл products/link.txt. Кнопка заказа не будет работать.", error);
    }

    // --- ВОЗВРАЩАЕМ ЛОГИКУ КЭШИРОВАНИЯ ---
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
                if (images.length === 0) images.push('https://via.placeholder.com/800x600?text=No+Image');

                allProducts.push({
                    id: `${categoryFolder.trim()}-${i}`,
                    category: categoryName.trim(),
                    name: name.trim(),
                    price: parseFloat(price) || 0,
                    oldPrice: oldPrice ? parseFloat(oldPrice) : null,
                    description: description.trim(),
                    images: images,
                });
                i++;
            }
        }
        
        sessionStorage.setItem('allProductsData', JSON.stringify(allProducts));
        return allProducts;
    };

    const renderProduct = (product) => {
        document.title = product.name;

        const priceHTML = product.price > 0 ? `${product.price.toLocaleString('ru-RU')}&nbsp;₽` : 'Цена по запросу';
        const oldPriceHTML = product.oldPrice ? `<span class="old-price">${product.oldPrice.toLocaleString('ru-RU')}&nbsp;₽</span>` : '';
        const imagesHTML = product.images.map(img => `<img src="${img}" class="slider-image" alt="${product.name}">`).join('');
        const sliderButtonsHTML = product.images.length > 1 ? `
            <button class="slider-btn prev">&lt;</button>
            <button class="slider-btn next">&gt;</button>
        ` : '';
        
        productDetailContainer.innerHTML = `
            <div class="product-detail">
                <div class="slider-container">
                    <div class="slider-wrapper">${imagesHTML}</div>
                    ${sliderButtonsHTML}
                </div>
                <div class="product-info">
                    <h2>${product.name}</h2>
                    <div class="price">${priceHTML}${oldPriceHTML}</div>
                    <div class="description">
                        <h3>Описание</h3>
                        <div>${product.description}</div>
                    </div>
                    <a href="${globalButtonLink}" target="_blank" class="whatsapp-button">Написать для заказа</a>
                </div>
            </div>
        `;
        
        if (product.images.length > 1) {
            setupSlider();
        } else if (product.images.length === 1) {
            const firstImage = document.querySelector('.slider-image');
            if (firstImage) {
                 if (firstImage.complete) {
                    document.querySelector('.slider-container').style.height = `${firstImage.offsetHeight}px`;
                 } else {
                    firstImage.onload = () => {
                        document.querySelector('.slider-container').style.height = `${firstImage.offsetHeight}px`;
                    };
                 }
            }
        }
    };
    
    const setupSlider = () => {
        const container = document.querySelector('.slider-container');
        const wrapper = document.querySelector('.slider-wrapper');
        const slides = document.querySelectorAll('.slider-image');
        const totalSlides = slides.length;
        let currentIndex = 0;

        const updateSliderHeight = () => {
            if (slides[currentIndex]) {
                container.style.height = `${slides[currentIndex].offsetHeight}px`;
            }
        };

        const updateSliderPosition = () => {
            wrapper.style.transform = `translateX(-${currentIndex * 100}%)`;
        };

        const firstImage = slides[0];
        if (firstImage) {
            if (firstImage.complete) {
                updateSliderHeight();
            } else {
                firstImage.onload = () => {
                    updateSliderHeight();
                };
            }
        }

        document.querySelector('.next')?.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % totalSlides;
            updateSliderPosition();
            updateSliderHeight();
        });

        document.querySelector('.prev')?.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
            updateSliderPosition();
            updateSliderHeight();
        });
        
        let touchstartX = 0;
        wrapper.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, {passive: true});
        wrapper.addEventListener('touchend', e => {
            const touchendX = e.changedTouches[0].screenX;
            if (touchendX < touchstartX - 50) {
                currentIndex = (currentIndex + 1) % totalSlides;
            } else if (touchendX > touchstartX + 50) {
                currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
            } else {
                return;
            }
            updateSliderPosition();
            updateSliderHeight();
        });
    };

    const allProducts = await getProductData();
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const product = allProducts.find(p => p.id === productId);

    if (product) {
        renderProduct(product);
    } else {
        productDetailContainer.innerHTML = '<h2>Товар не найден</h2><p><a href="index.html">Вернуться в каталог</a></p>';
    }
});