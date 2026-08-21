window.orderViaWhatsapp = (phoneNumber, agentName) => {
            if (!currentProduct) {
                alert('Please select a product first.');
                return;
            }            
            
            // Prevent ordering out-of-stock items - double check
            if (!currentProduct.is_active || currentProduct.soldOut) {
                alert('❌ This product is out of stock and cannot be ordered. Please try another product.');
                return;
            }
            
            const message = `*NEW ORDER - DarlingTee Phones*%0A%0A` +
                `*Product:* ${encodeURIComponent(currentProduct.name)}%0A` +
                `*Description:* ${encodeURIComponent(currentProduct.description || 'N/A')}%0A` +
                `*Price:* ${encodeURIComponent(formatPrice(currentProduct.price))}%0A` +
                `*Image:* ${encodeURIComponent(currentProduct.image || 'N/A')}%0A` +
                `*Agent:* ${encodeURIComponent(agentName)}%0A%0A` +
                `Hello, I want to order this product. Please confirm availability and proceed with payment details.`;

            const whatsappLink = `https://wa.me/2349131654821?text=${message}`;
            window.open(whatsappLink, '_blank');
            closeOrderModal();
        }
