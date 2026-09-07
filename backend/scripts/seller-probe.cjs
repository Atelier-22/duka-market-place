#!/usr/bin/env node

require('dotenv/config');
const path = require('path');
const { Pool } = require('pg');

const API = process.env.PROBE_API ?? 'http://localhost:4000/api';
const S = String(Date.now()).slice(-9);
const P = 'SellerProbe123!';
const who = (tag, prefix) => ({ phone: `${prefix}${S.slice(0, 6)}`, email: `sp-${tag}-${S}@example.test`, name: `Probe ${tag}` });
const SELLER_A = who('sella', '0733');
const SELLER_B = who('sellb', '0744');
const CUSTOMER = who('cust', '0700');
const SHOPPER = who('shop', '0711');

const results = [];
function check(label, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
}

async function call(method, p, { token, body } = {}) {
  const res = await fetch(API + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}

async function register(w, role) {
  const r = await call('POST', '/auth/register', { body: { role, fullName: w.name, phone: w.phone, email: w.email, password: P } });
  if (r.status !== 201) throw new Error(`register ${role} failed: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

async function upload(token, bytes, type, name, folder = 'products') {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type }), name);
  const res = await fetch(`${API}/uploads?folder=${folder}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7355a1d0000000049454e44ae426082', 'hex');

(async () => {
  const url = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString: url, ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: false } });

  const sellerA = await register(SELLER_A, 'seller');
  const sellerB = await register(SELLER_B, 'seller');
  const customer = await register(CUSTOMER, 'customer');
  const shopper = await register(SHOPPER, 'shopper');
  check('seller registration works through the shared auth', sellerA.user.role === 'seller' && !!sellerA.accessToken);

  const meA = await call('GET', '/seller/me', { token: sellerA.accessToken });
  check('seller/me returns a profile and no store yet', meA.status === 200 && meA.body.profile && meA.body.store === null);

  const custSellerArea = await call('GET', '/seller/me', { token: customer.accessToken });
  const shopSellerArea = await call('GET', '/seller/dashboard', { token: shopper.accessToken });
  check('a customer cannot enter the seller area', custSellerArea.status === 403);
  check('a shopper cannot enter the seller area', shopSellerArea.status === 403);
  const anon = await call('GET', '/seller/products');
  check('unauthenticated seller endpoints are 401', anon.status === 401);

  const noStoreProduct = await call('POST', '/seller/products', { token: sellerA.accessToken, body: { name: 'Early', category: 'phones', priceUgx: 1000 } });
  check('products cannot be created before the store exists', noStoreProduct.status === 409);

  const storeA = await call('POST', '/seller/store', { token: sellerA.accessToken, body: { name: `TechHub ${S}`, category: 'electronics', city: 'Kampala', tagline: 'Phones and accessories', deliveryFeeUgx: 4000 } });
  check('store creation works and gets a slug', storeA.status === 201 && /^techhub-/.test(storeA.body.store.slug), storeA.body?.store?.slug);
  const storeB = await call('POST', '/seller/store', { token: sellerB.accessToken, body: { name: `Fashion Corner ${S}`, category: 'fashion', city: 'Kampala' } });
  const dupStore = await call('POST', '/seller/store', { token: sellerA.accessToken, body: { name: 'Second', category: 'fashion', city: 'Kampala' } });
  check('a seller cannot create a second store', dupStore.status === 409);

  const img = await upload(sellerA.accessToken, PNG, 'image/png', 'phone.png');
  check('product image uploads through the shared upload system', img.status === 201, JSON.stringify(img.body).slice(0, 60));

  const badPrice = await call('POST', '/seller/products', { token: sellerA.accessToken, body: { name: 'Bad', category: 'phones', priceUgx: -5, stockQuantity: 3 } });
  check('negative prices are rejected server-side', badPrice.status === 400);
  const badStock = await call('POST', '/seller/products', { token: sellerA.accessToken, body: { name: 'Bad', category: 'phones', priceUgx: 5000, stockQuantity: -1 } });
  check('negative stock is rejected server-side', badStock.status === 400);
  const badSale = await call('POST', '/seller/products', { token: sellerA.accessToken, body: { name: 'Bad', category: 'phones', priceUgx: 5000, salePriceUgx: 6000 } });
  check('a sale price above the list price is rejected', badSale.status === 400);

  const productA = await call('POST', '/seller/products', {
    token: sellerA.accessToken,
    body: {
      name: 'Samsung Galaxy S24', category: 'phones', brand: 'Samsung', priceUgx: 3200000, salePriceUgx: 2990000,
      stockQuantity: 5, lowStockThreshold: 3, description: 'Brand new, sealed, one year warranty from the store.',
      images: [img.body.url], specifications: [{ label: 'Storage', value: '256GB' }],
      variations: [{ name: 'Colour', value: 'Black', stockQuantity: 3 }, { name: 'Colour', value: 'Violet', stockQuantity: 2, priceDeltaUgx: 50000 }],
    },
  });
  check('product with images, specs and variations is created as a draft', productA.status === 201 && productA.body.product.status === 'draft' && Number(productA.body.product.stock_quantity) === 5, JSON.stringify(productA.body).slice(0, 80));
  const pid = productA.body.product.id;

  const hiddenDraft = await call('GET', `/marketplace/products/${pid}`);
  check('drafts are not visible on the marketplace', hiddenDraft.status === 404);

  const editByB = await call('PATCH', `/seller/products/${pid}`, { token: sellerB.accessToken, body: { priceUgx: 1000 } });
  check('seller B cannot edit seller A\'s product', editByB.status === 404);
  const publishByB = await call('POST', `/seller/products/${pid}/publish`, { token: sellerB.accessToken });
  check('seller B cannot publish seller A\'s product', publishByB.status === 404);
  const stockByB = await call('POST', '/seller/inventory/adjust', { token: sellerB.accessToken, body: { productId: pid, delta: 100 } });
  check('seller B cannot adjust seller A\'s inventory', stockByB.status === 404);
  const storeByB = await call('PATCH', '/seller/store', { token: sellerB.accessToken, body: { name: 'Hijack' } });
  const storeAAfter = await call('GET', '/seller/me', { token: sellerA.accessToken });
  check('seller B editing "their" store only touches their own', storeByB.status === 200 && storeAAfter.body.store.name === `TechHub ${S}`);

  const publish = await call('POST', `/seller/products/${pid}/publish`, { token: sellerA.accessToken });
  check('publishing works with a photo and description', publish.status === 200 && publish.body.product.status === 'published', JSON.stringify(publish.body).slice(0, 80));

  const pub = await call('GET', `/marketplace/products/${pid}`);
  check('published product is public with seller attached', pub.status === 200 && pub.body.product.store.slug === storeA.body.store.slug && pub.body.product.store.name === `TechHub ${S}`);
  check('public product shows the sale price and discount', pub.body.product.priceUgx === 2990000 && pub.body.product.discountPercent > 0);
  check('public product carries variations with their own prices', pub.body.product.variations.length === 2 && pub.body.product.variations[1].priceUgx === 3040000);
  check('public product does not expose private seller fields', !JSON.stringify(pub.body).includes('reserved_quantity') && !JSON.stringify(pub.body).includes(SELLER_A.phone));

  const list = await call('GET', `/marketplace/products?q=samsung`);
  check('marketplace search finds the product', list.status === 200 && list.body.products.some((p) => p.id === pid));
  const search = await call('GET', `/marketplace/search?q=techhub`);
  check('search finds the store too', search.status === 200 && search.body.stores.some((s) => s.slug === storeA.body.store.slug));
  const storePublic = await call('GET', `/marketplace/stores/${storeA.body.store.slug}`);
  check('public storefront lists the product', storePublic.status === 200 && storePublic.body.products.length === 1 && storePublic.body.store.product_count === 1);

  const followSelf = await call('POST', `/marketplace/stores/${storeA.body.store.slug}/follow`, { token: sellerA.accessToken });
  check('a seller cannot follow their own store', followSelf.status === 400);
  const followed = await call('POST', `/marketplace/stores/${storeA.body.store.slug}/follow`, { token: customer.accessToken });
  check('customer follows the store and the count updates', followed.status === 200 && followed.body.followerCount === 1);
  const following = await call('GET', '/marketplace/following', { token: customer.accessToken });
  check('the following list shows the store', following.body.stores.some((s) => s.slug === storeA.body.store.slug));
  const followersA = await call('GET', '/seller/followers', { token: sellerA.accessToken });
  check('seller sees their follower', followersA.body.followers.length === 1 && followersA.body.total === 1);

  const product2 = await call('POST', '/seller/products', { token: sellerA.accessToken, body: { name: 'USB-C Charger 25W', category: 'electronics', priceUgx: 45000, stockQuantity: 10, description: 'Fast charger with cable included in the box.', images: [img.body.url] } });
  const publish2 = await call('POST', `/seller/products/${product2.body.product.id}/publish`, { token: sellerA.accessToken });
  check('publishing notifies followers', publish2.body.followersNotified === 1, `${publish2.body?.followersNotified} notified`);
  const custNotifs = await call('GET', '/notifications', { token: customer.accessToken });
  check('the follower received the new product notification', custNotifs.body.notifications.some((n) => n.link === `/product/${product2.body.product.id}`));

  const addr = await call('POST', '/addresses', { token: customer.accessToken, body: { line1: 'Plot 4, Kira Road', city: 'Kampala', isDefault: true } });
  const tooMany = await call('POST', '/marketplace/orders', { token: customer.accessToken, body: { items: [{ productId: pid, quantity: 10 }], addressId: addr.body.address.id } });
  check('ordering more than stock is refused', tooMany.status === 409, JSON.stringify(tooMany.body));
  const sellerBuys = await call('POST', '/marketplace/orders', { token: sellerA.accessToken, body: { items: [{ productId: pid, quantity: 1 }], addressId: addr.body.address.id } });
  check('a seller account cannot buy', sellerBuys.status === 403);
  const wrongAddr = await call('POST', '/marketplace/orders', { token: shopper.accessToken, body: { items: [{ productId: pid, quantity: 1 }], addressId: addr.body.address.id } });
  check('checkout refuses an address that belongs to someone else', wrongAddr.status === 400);

  const violet = pub.body.product.variations.find((v) => v.value === 'Violet');
  const order = await call('POST', '/marketplace/orders', {
    token: customer.accessToken,
    body: { items: [{ productId: pid, variationId: violet.id, quantity: 2 }, { productId: product2.body.product.id, quantity: 3 }], addressId: addr.body.address.id, notes: 'Call when you arrive' },
  });
  check('checkout creates an order priced server-side', order.status === 201 && order.body.orders.length === 1 && Number(order.body.orders[0].subtotal_ugx) === 2 * 3040000 + 3 * 45000 && Number(order.body.orders[0].delivery_fee_ugx) === 4000, JSON.stringify(order.body).slice(0, 100));
  const orderId = order.body.orders[0].id;

  const afterReserve = await call('GET', `/marketplace/products/${pid}`);
  check('stock is reserved after checkout', afterReserve.body.product.available === 3 && afterReserve.body.product.variations.find((v) => v.value === 'Violet').available === 0);

  const sellerNotifs = await call('GET', '/notifications', { token: sellerA.accessToken });
  check('the seller was notified of the new order', sellerNotifs.body.notifications.some((n) => n.link === `/seller/orders/${orderId}`));
  check('the seller was warned about low stock on the phone', sellerNotifs.body.notifications.some((n) => /Low stock/.test(n.title)));

  const seenByB = await call('GET', `/seller/orders/${orderId}`, { token: sellerB.accessToken });
  check('seller B cannot see seller A\'s order', seenByB.status === 404);
  const seenByShopper = await call('GET', `/marketplace/orders/${orderId}`, { token: shopper.accessToken });
  check('another customer cannot see this purchase', seenByShopper.status === 404);
  const advanceByB = await call('POST', `/seller/orders/${orderId}/status`, { token: sellerB.accessToken, body: { status: 'confirmed' } });
  check('seller B cannot move seller A\'s order', advanceByB.status === 404);
  const custAdvance = await call('POST', `/seller/orders/${orderId}/status`, { token: customer.accessToken, body: { status: 'completed' } });
  check('a customer cannot use the seller order endpoint', custAdvance.status === 403);

  const detailA = await call('GET', `/seller/orders/${orderId}`, { token: sellerA.accessToken });
  check('seller A sees the order with items and customer summary', detailA.status === 200 && detailA.body.items.length === 2 && detailA.body.customer.ordersWithStore === 1);
  const skipAhead = await call('POST', `/seller/orders/${orderId}/status`, { token: sellerA.accessToken, body: { status: 'ready' } });
  check('an order cannot skip from pending to ready', skipAhead.status === 409);
  const confirmed = await call('POST', `/seller/orders/${orderId}/status`, { token: sellerA.accessToken, body: { status: 'confirmed' } });
  check('seller confirms the order', confirmed.status === 200 && confirmed.body.order.status === 'confirmed');
  const lateCancel = await call('POST', `/marketplace/orders/${orderId}/cancel`, { token: customer.accessToken, body: {} });
  check('customer cannot cancel after confirmation', lateCancel.status === 409);
  await call('POST', `/seller/orders/${orderId}/status`, { token: sellerA.accessToken, body: { status: 'preparing' } });
  const completed = await call('POST', `/seller/orders/${orderId}/status`, { token: sellerA.accessToken, body: { status: 'completed' } });
  check('order reaches completed', completed.status === 200 && completed.body.order.status === 'completed' && completed.body.order.payment_status === 'paid');

  const afterCommit = await call('GET', `/marketplace/products/${pid}`);
  check('completing commits the stock and counts the sale', afterCommit.body.product.available === 3 && afterCommit.body.product.salesCount === 2);
  const inv = await call('GET', '/seller/inventory', { token: sellerA.accessToken });
  const phoneRow = inv.body.items.find((i) => i.id === pid);
  check('inventory shows the committed stock with no reservation left', Number(phoneRow.stock_quantity) === 3 && Number(phoneRow.reserved_quantity) === 0);
  const history = await call('GET', `/seller/products/${pid}/inventory`, { token: sellerA.accessToken });
  check('inventory history records reserve and commit', history.body.events.some((e) => e.reason === 'order_reserved') && history.body.events.some((e) => e.reason === 'order_committed'));

  const custPurchases = await call('GET', '/marketplace/orders/mine', { token: customer.accessToken });
  check('customer sees the purchase in their list', custPurchases.body.orders.some((o) => o.id === orderId && o.status === 'completed'));
  const custStatusNotif = await call('GET', '/notifications', { token: customer.accessToken });
  check('customer was notified as the order progressed', custStatusNotif.body.notifications.some((n) => n.link === `/app/purchases/${orderId}`));

  const reviewByShopper = await call('POST', `/marketplace/orders/${orderId}/review`, { token: shopper.accessToken, body: { storeStars: 1 } });
  check('someone who did not buy cannot review', reviewByShopper.status === 404 || reviewByShopper.status === 403);
  const review = await call('POST', `/marketplace/orders/${orderId}/review`, { token: customer.accessToken, body: { storeStars: 5, storeComment: 'Fast and honest.', products: [{ productId: pid, stars: 4, comment: 'Great phone' }] } });
  check('buyer reviews the store and the product', review.status === 201, JSON.stringify(review.body).slice(0, 120));
  const storeAfterReview = await call('GET', `/marketplace/stores/${storeA.body.store.slug}`);
  check('store rating reflects the review', Number(storeAfterReview.body.store.rating_avg) === 5 && storeAfterReview.body.store.rating_count === 1 && storeAfterReview.body.reviews.length === 1);
  const productAfterReview = await call('GET', `/marketplace/products/${pid}`);
  check('product rating is separate from the store rating', productAfterReview.body.product.ratingAvg === 4 && productAfterReview.body.product.reviews.length === 1);
  const sellerReviews = await call('GET', '/seller/reviews', { token: sellerA.accessToken });
  const replied = await call('POST', `/seller/reviews/${sellerReviews.body.storeReviews[0]?.id ?? 'a0000000-0000-4000-8000-000000000000'}/reply`, { token: sellerA.accessToken, body: { reply: 'Thank you!' } });
  check('seller can reply to a store review', replied.status === 200 && replied.body.review.reply === 'Thank you!');

  const customers = await call('GET', '/seller/customers', { token: sellerA.accessToken });
  check('seller customers view shows the buyer with spend', customers.body.customers.length === 1 && Number(customers.body.customers[0].total_spent_ugx) > 0 && customers.body.customers[0].follows === true);
  const dash = await call('GET', '/seller/dashboard', { token: sellerA.accessToken });
  check('dashboard reflects real revenue and counts', dash.status === 200 && Number(dash.body.orders.revenue_ugx) === Number(completed.body.order.total_ugx) && dash.body.stock.published === 2 && dash.body.followers.total === 1);
  const analytics = await call('GET', '/seller/analytics?range=7d', { token: sellerA.accessToken });
  check('analytics totals match the order', analytics.status === 200 && analytics.body.totals.orders === 1 && analytics.body.totals.revenueUgx === Number(completed.body.order.total_ugx) && analytics.body.topProducts.length === 2);
  const forecast = await call('GET', '/seller/forecast', { token: sellerA.accessToken });
  check('forecast is honest about its method and computes a restock', forecast.status === 200 && /No external model/.test(forecast.body.method) && forecast.body.products.some((p) => p.id === pid && p.dailyRate > 0));

  const promo = await call('POST', '/seller/promotions', { token: sellerA.accessToken, body: { name: 'Weekend deal', kind: 'percentage', value: 10, productIds: [product2.body.product.id, 'a0000000-0000-4000-8000-000000000000'] } });
  check('promotion is created and only keeps owned products', promo.status === 201 && promo.body.promotion.product_ids.length === 1);
  const promoPrice = await call('GET', `/marketplace/products/${product2.body.product.id}`);
  check('promotion lowers the public price', promoPrice.body.product.priceUgx === 40500 && promoPrice.body.product.promotionName === 'Weekend deal');
  const promoByB = await call('DELETE', `/seller/promotions/${promo.body.promotion.id}`, { token: sellerB.accessToken });
  check('seller B cannot delete seller A\'s promotion', promoByB.status === 404);

  const settings = await call('PATCH', '/seller/settings', { token: sellerA.accessToken, body: { autoConfirmOrders: true, payoutPhone: '0700000001', notifyFollowers: false } });
  check('seller settings persist', settings.status === 200 && settings.body.settings.auto_confirm_orders === true && settings.body.settings.payout_phone === '0700000001');
  const massAssign = await call('PATCH', '/seller/settings', { token: sellerA.accessToken, body: { user_id: sellerB.user.id, role: 'admin' } });
  const meAfter = await call('GET', '/auth/me', { token: sellerA.accessToken });
  check('extra fields on settings are ignored', massAssign.status === 200 && meAfter.body.user.role === 'seller');

  const verForm = new FormData();
  verForm.append('businessName', 'TechHub Electronics Ltd');
  verForm.append('document', new Blob([PNG], { type: 'image/png' }), 'certificate.png');
  const ver = await fetch(`${API}/seller/verification`, { method: 'POST', headers: { Authorization: `Bearer ${sellerA.accessToken}` }, body: verForm });
  const verBody = await ver.json();
  check('verification submission is accepted and pending', ver.status === 201 && verBody.verification.status === 'pending');
  const verDocPublic = await fetch(`http://localhost:4000/uploads/seller-verification/anything.png`);
  check('verification documents are not served from the public uploads route', verDocPublic.status === 404);

  const sellerAdmin = await call('GET', '/admin/sellers', { token: sellerA.accessToken });
  check('a seller cannot reach admin seller endpoints', sellerAdmin.status === 403);

  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [shopper.user.id]);
  const adminLogin = await call('POST', '/auth/login', { body: { identifier: SHOPPER.phone, password: P } });
  const admin = adminLogin.body.accessToken;
  const stats = await call('GET', '/admin/sellers/stats', { token: admin });
  check('admin seller stats count the new sellers', stats.status === 200 && stats.body.sellers.total >= 2 && stats.body.products.published >= 2 && stats.body.orders.completed >= 1, JSON.stringify(stats.body.sellers));
  const dashboard = await call('GET', '/admin/dashboard', { token: admin });
  check('admin overview includes the seller count', dashboard.status === 200 && dashboard.body.sellers >= 2 && dashboard.body.pendingSellerVerifications >= 1);
  const sellersList = await call('GET', `/admin/sellers?q=techhub`, { token: admin });
  check('admin can search sellers by store name', sellersList.body.sellers.some((s) => s.id === sellerA.user.id));
  const sellerDetail = await call('GET', `/admin/sellers/${sellerA.user.id}`, { token: admin });
  check('admin seller detail shows store, products, orders, verification', sellerDetail.status === 200 && sellerDetail.body.store && sellerDetail.body.products.length === 2 && sellerDetail.body.orders.length === 1 && sellerDetail.body.verifications.length === 1);
  const queue = await call('GET', '/admin/sellers/verifications', { token: admin });
  const verId = queue.body.verifications.find((v) => v.seller_id === sellerA.user.id)?.id;
  const doc = await fetch(`${API}/admin/sellers/verifications/${verId}/document`, { headers: { Authorization: `Bearer ${admin}` } });
  check('admin can view the verification document privately', doc.status === 200 && doc.headers.get('content-type') === 'image/png');
  const approve = await call('POST', `/admin/sellers/verifications/${verId}/decision`, { token: admin, body: { approve: true } });
  const verifiedStore = await call('GET', `/marketplace/stores/${storeA.body.store.slug}`);
  check('approving verification marks the store verified publicly and deletes the document', approve.status === 200 && approve.body.documentDeleted && verifiedStore.body.store.is_verified === true);

  const flag = await call('POST', `/admin/sellers/products/${product2.body.product.id}/flag`, { token: admin, body: { reason: 'Photo does not match the item' } });
  const flaggedPublic = await call('GET', `/marketplace/products/${product2.body.product.id}`);
  check('flagging a product hides it from the marketplace', flag.status === 200 && flaggedPublic.status === 404);
  const republish = await call('POST', `/seller/products/${product2.body.product.id}/publish`, { token: sellerA.accessToken });
  check('a flagged product cannot be republished by the seller', republish.status === 409);
  await call('POST', `/admin/sellers/products/${product2.body.product.id}/unflag`, { token: admin });
  const unpublish = await call('POST', `/admin/sellers/products/${pid}/unpublish`, { token: admin, body: { reason: 'Needs a clearer description' } });
  const unpublished = await call('GET', `/marketplace/products/${pid}`);
  check('admin unpublish removes the product from the marketplace', unpublish.status === 200 && unpublished.status === 404);

  const suspend = await call('POST', `/admin/sellers/${sellerB.user.id}/suspend`, { token: admin, body: { reason: 'Probe suspension' } });
  const suspendedWrite = await call('POST', '/seller/products', { token: sellerB.accessToken, body: { name: 'Blocked', category: 'fashion', priceUgx: 5000 } });
  const statsAfter = await call('GET', '/admin/sellers/stats', { token: admin });
  check('suspending a seller blocks their writes and changes the active count', suspend.status === 200 && suspendedWrite.status === 403 && statsAfter.body.sellers.suspended >= 1);
  const reactivate = await call('POST', `/admin/sellers/${sellerB.user.id}/reactivate`, { token: admin });
  check('reactivation works', reactivate.status === 200);

  const enroll = await call('POST', '/seller/enroll', { token: customer.accessToken });
  check('an existing customer can open a linked seller account', enroll.status === 201 && enroll.body.user.role === 'seller' && enroll.body.linkedAccounts.some((a) => a.id === customer.user.id));
  const enrolledMe = await call('GET', '/auth/me', { token: enroll.body.accessToken });
  check('the new seller session sees the customer account as linked', enrolledMe.body.linkedAccounts.some((a) => a.role === 'customer'));

  const sitemap = await fetch('http://localhost:4000/sitemap-marketplace.xml');
  const xml = await sitemap.text();
  check('marketplace sitemap lists the store', sitemap.status === 200 && xml.includes(`/store/${storeA.body.store.slug}`));

  await pool.end();
  console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
  console.log(`CLEANUP: node ${path.relative(process.cwd(), path.join(__dirname, 'purge-test-data.cjs'))} --apply`);
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error('RUN FAILED', e); process.exit(1); });
