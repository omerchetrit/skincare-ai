/**
 * Velo Page Code — paste this into the page code panel in Wix Editor.
 * This is the ONLY code you need in Wix. It handles cart integration.
 */
import { cart } from 'wix-stores-frontend';

$w.onReady(() => {
  // Listen for "addToCart" events from the Custom Element
  $w('#skincareWidget').on('addToCart', async (event) => {
    const { productIds } = event.detail;
    if (!productIds || !productIds.length) return;

    try {
      const products = productIds.map((id) => ({ productId: id, quantity: 1 }));
      await cart.addProducts(products);
      console.log('Added to cart:', productIds);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  });
});
