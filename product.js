document.addEventListener('DOMContentLoaded', async () => {
    const productsRootPath = 'products';
    const productDetailContainer = document.getElementById('product-detail-container');
    const mainContent = document.querySelector('main');

    mainContent.classList.add('is-visible');

    const navigateWithTransition = (url) => {
        mainContent.classList.remove('is-visible');
        mainContent.classList.add('is-leaving');
        setTimeout(() => { window.location.href = url; }, 400);
    };

    const backLink = document.querySelector('.back-link');
    if (backLink) {
        backLink.addEventListener('click', (event) => {
            event.preventDefault();
            navigateWithTransition(backLink.href);
        });
    }

    let globalButtonLink = '';
    try {
        const linkResponse = await fetch(`${productsRootPath}/link.txt`);
        if (linkResponse.ok) {
            globalButtonLink = (await linkResponse.text()).trim();
        }
    } catch (error) {
        console.error("Не удалось загрузить products/link.txt.", error);
    }
    
    const getProductDetails = async (categoryFolder, productFolder) => {
        const productPath = `${productsRootPath}/${categoryFolder}/${productFolder}`;
        
        const nameRes = await fetch(`${productPath}/name.txt`);
        const priceRes = await fetch(`${productPath}/price.txt`);
        const oldPriceRes = await fetch(`${productPath}/old_price.txt`);
        const descriptionRes = await fetch(`${productPath}/description.txt`);

        const name = nameRes.ok ? await nameRes.text() : "Название не найдено";
        const price = priceRes.ok ? await priceRes.text() : "0";
        const oldPrice = oldPriceRes.ok ? await oldPriceRes.text() : null;
        const description = descriptionRes.ok ? await descriptionRes.text() : "Описание отсутствует.";

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
            if (!foundImage && images.length > 0) break;
        }
        if (images.length === 0) images.push('https://via.placeholder.com/800x600?text=No+Image');

        return {
            name: name.trim(),
            price: parseFloat(price) || 0,
            oldPrice: oldPrice ? parseFloat(oldPrice) : null,
            description: description.trim(),
            images: images
        };
    };


    const renderProduct = (product) => {
        document.title = product.name;
        const priceHTML = product.price > 0 ? `${product.price.toLocaleString('ru-RU')}&nbsp;₽` : 'Цена по запросу';
        const oldPriceHTML = product.oldPrice ? `<span class="old-price">${product.oldPrice.toLocaleString('ru-RU')}&nbsp;₽</span>` : '';
        const imagesHTML = product.images.map(img => `<img src="${img}" class="slider-image" alt="${product.name}">`).join('');
        const sliderButtonsHTML = product.images.length > 1 ? `<button class="slider-btn prev">&lt;</button><button class="slider-btn next">&gt;</button>` : '';
        
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
        
        if (product.images.length > 1) setupSlider();
        else if (product.images.length === 1) {
            const firstImage = document.querySelector('.slider-image');
            if (firstImage) {
                 if (firstImage.complete) { document.querySelector('.slider-container').style.height = `${firstImage.offsetHeight}px`; }
                 else { firstImage.onload = () => { document.querySelector('.slider-container').style.height = `${firstImage.offsetHeight}px`; }; }
            }
        }
    };
    
    const setupSlider = () => {
        const container = document.querySelector('.slider-container');
        const wrapper = document.querySelector('.slider-wrapper');
        const slides = document.querySelectorAll('.slider-image');
        const totalSlides = slides.length;
        let currentIndex = 0;
        const updateSliderHeight = () => { if (slides[currentIndex]) container.style.height = `${slides[currentIndex].offsetHeight}px`; };
        const updateSliderPosition = () => { wrapper.style.transform = `translateX(-${currentIndex * 100}%)`; };
        const firstImage = slides[0];
        if (firstImage) { if (firstImage.complete) updateSliderHeight(); else firstImage.onload = updateSliderHeight; }
        document.querySelector('.next')?.addEventListener('click', () => { currentIndex = (currentIndex + 1) % totalSlides; updateSliderPosition(); updateSliderHeight(); });
        document.querySelector('.prev')?.addEventListener('click', () => { currentIndex = (currentIndex - 1 + totalSlides) % totalSlides; updateSliderPosition(); updateSliderHeight(); });
        let touchstartX = 0;
        wrapper.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, {passive: true});
        wrapper.addEventListener('touchend', e => {
            const touchendX = e.changedTouches[0].screenX;
            if (touchendX < touchstartX - 50) currentIndex = (currentIndex + 1) % totalSlides;
            else if (touchendX > touchstartX + 50) currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
            else return;
            updateSliderPosition(); updateSliderHeight();
        });
    };

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        if (!productId) throw new Error('ID товара не найден в URL');
        
        const [categoryFolder, productFolder] = productId.split('-');
        if (!categoryFolder || !productFolder) throw new Error('Некорректный ID товара');

        const product = await getProductDetails(categoryFolder, productFolder);
        renderProduct(product);
    } catch(error) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА: Не удалось загрузить данные о товаре.", error);
        productDetailContainer.innerHTML = '<h2>Ошибка загрузки</h2><p>Не удалось загрузить данные о товаре.</p>';
    }
});