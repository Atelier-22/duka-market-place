import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { PublicLayout } from './components/layout/PublicLayout';
import { CustomerLayout } from './components/layout/CustomerLayout';
import { ShopperLayout } from './components/layout/ShopperLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { SellerLayout } from './components/layout/SellerLayout';
import { MarketLayout } from './components/layout/MarketLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Canonical } from './components/seo/Canonical';
import { ScrollRestoration } from './components/ui/ScrollRestoration';
import { BrandTransitionProvider } from './components/ui/BrandTransition';
import { SkeletonAppShell } from './components/ui/Skeleton';

import { LandingPage } from './pages/public/LandingPage';
import { NotFoundPage } from './pages/public/NotFoundPage';

const HowItWorksPage = lazy(() => import('./pages/public/HowItWorksPage').then((m) => ({ default: m.HowItWorksPage })));
const BecomeShopperPage = lazy(() => import('./pages/public/BecomeShopperPage').then((m) => ({ default: m.BecomeShopperPage })));
const AboutPage = lazy(() => import('./pages/public/AboutPage').then((m) => ({ default: m.AboutPage })));
const FaqPage = lazy(() => import('./pages/public/FaqPage').then((m) => ({ default: m.FaqPage })));
const AuthPage = lazy(() => import('./pages/public/AuthPage').then((m) => ({ default: m.AuthPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/public/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })));
const TermsPage = lazy(() => import('./pages/public/TermsPage').then((m) => ({ default: m.TermsPage })));
const RefundPolicyPage = lazy(() => import('./pages/public/RefundPolicyPage').then((m) => ({ default: m.RefundPolicyPage })));
const CookiePolicyPage = lazy(() => import('./pages/public/CookiePolicyPage').then((m) => ({ default: m.CookiePolicyPage })));

const CustomerDashboardPage = lazy(() => import('./pages/customer/CustomerDashboardPage').then((m) => ({ default: m.CustomerDashboardPage })));
const CreateRequestPage = lazy(() => import('./pages/customer/CreateRequestPage').then((m) => ({ default: m.CreateRequestPage })));
const RequestDetailsPage = lazy(() => import('./pages/customer/RequestDetailsPage').then((m) => ({ default: m.RequestDetailsPage })));
const ActiveOrderPage = lazy(() => import('./pages/customer/ActiveOrderPage').then((m) => ({ default: m.ActiveOrderPage })));
const OrdersListPage = lazy(() => import('./pages/customer/OrderHistoryPage').then((m) => ({ default: m.OrdersListPage })));
const PaymentsPage = lazy(() => import('./pages/customer/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));

const ShopperDashboardPage = lazy(() => import('./pages/shopper/ShopperDashboardPage').then((m) => ({ default: m.ShopperDashboardPage })));
const AvailableRequestsPage = lazy(() => import('./pages/shopper/AvailableRequestsPage').then((m) => ({ default: m.AvailableRequestsPage })));
const ShopperOrdersPage = lazy(() => import('./pages/shopper/ShopperOrdersPage').then((m) => ({ default: m.ShopperOrdersPage })));
const ShoppingWorkflowPage = lazy(() => import('./pages/shopper/ShoppingWorkflowPage').then((m) => ({ default: m.ShoppingWorkflowPage })));
const ShopperEarningsPage = lazy(() => import('./pages/shopper/ShopperEarningsPage').then((m) => ({ default: m.ShopperEarningsPage })));
const ShopperVerificationPage = lazy(() => import('./pages/shopper/ShopperVerificationPage').then((m) => ({ default: m.ShopperVerificationPage })));
const ShopperProfilePage = lazy(() => import('./pages/shopper/ShopperProfilePage').then((m) => ({ default: m.ShopperProfilePage })));

const OrderMessagesPage = lazy(() => import('./pages/shared/OrderMessagesPage').then((m) => ({ default: m.OrderMessagesPage })));
const SettingsPage = lazy(() => import('./pages/shared/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const ChatListPage = lazy(() => import('./pages/shared/ChatListPage').then((m) => ({ default: m.ChatListPage })));

const AdminOverviewPage = lazy(() => import('./pages/admin/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage })));
const AdminCustomerDetailPage = lazy(() => import('./pages/admin/AdminCustomerDetailPage').then((m) => ({ default: m.AdminCustomerDetailPage })));
const AdminShopperDetailPage = lazy(() => import('./pages/admin/AdminShopperDetailPage').then((m) => ({ default: m.AdminShopperDetailPage })));
const AdminOrderDetailPage = lazy(() => import('./pages/admin/AdminOrderDetailPage').then((m) => ({ default: m.AdminOrderDetailPage })));
const AdminCustomersPage = lazy(() => import('./pages/admin/AdminCustomersPage').then((m) => ({ default: m.AdminCustomersPage })));
const AdminShoppersPage = lazy(() => import('./pages/admin/AdminShoppersPage').then((m) => ({ default: m.AdminShoppersPage })));
const AdminVerificationsPage = lazy(() => import('./pages/admin/AdminVerificationsPage').then((m) => ({ default: m.AdminVerificationsPage })));
const AdminRequestsPage = lazy(() => import('./pages/admin/AdminRequestsPage').then((m) => ({ default: m.AdminRequestsPage })));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })));
const AdminDisputesPage = lazy(() => import('./pages/admin/AdminDisputesPage').then((m) => ({ default: m.AdminDisputesPage })));
const AdminFeesPage = lazy(() => import('./pages/admin/AdminFeesPage').then((m) => ({ default: m.AdminFeesPage })));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })));
const AdminFinancePage = lazy(() => import('./pages/admin/AdminFinancePage').then((m) => ({ default: m.AdminFinancePage })));
const AdminOpsPage = lazy(() => import('./pages/admin/AdminOpsPage').then((m) => ({ default: m.AdminOpsPage })));
const AdminStaffPage = lazy(() => import('./pages/admin/AdminStaffPage').then((m) => ({ default: m.AdminStaffPage })));
const AdminGodViewPage = lazy(() => import('./pages/admin/AdminGodViewPage').then((m) => ({ default: m.AdminGodViewPage })));

const SellPage = lazy(() => import('./pages/public/SellPage').then((m) => ({ default: m.SellPage })));
const MarketplacePage = lazy(() => import('./pages/market/MarketplacePage').then((m) => ({ default: m.MarketplacePage })));
const StorePage = lazy(() => import('./pages/market/StorePage').then((m) => ({ default: m.StorePage })));
const ProductPage = lazy(() => import('./pages/market/ProductPage').then((m) => ({ default: m.ProductPage })));
const CartPage = lazy(() => import('./pages/market/CartPage').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./pages/market/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const PurchasesPage = lazy(() => import('./pages/customer/PurchasesPage').then((m) => ({ default: m.PurchasesPage })));
const PurchaseDetailPage = lazy(() => import('./pages/customer/PurchaseDetailPage').then((m) => ({ default: m.PurchaseDetailPage })));
const FollowingPage = lazy(() => import('./pages/customer/FollowingPage').then((m) => ({ default: m.FollowingPage })));

const SellerDashboardPage = lazy(() => import('./pages/seller/SellerDashboardPage').then((m) => ({ default: m.SellerDashboardPage })));
const SellerProductsPage = lazy(() => import('./pages/seller/SellerProductsPage').then((m) => ({ default: m.SellerProductsPage })));
const SellerProductFormPage = lazy(() => import('./pages/seller/SellerProductFormPage').then((m) => ({ default: m.SellerProductFormPage })));
const SellerOrdersPage = lazy(() => import('./pages/seller/SellerOrdersPage').then((m) => ({ default: m.SellerOrdersPage })));
const SellerOrderDetailPage = lazy(() => import('./pages/seller/SellerOrderDetailPage').then((m) => ({ default: m.SellerOrderDetailPage })));
const SellerInventoryPage = lazy(() => import('./pages/seller/SellerInventoryPage').then((m) => ({ default: m.SellerInventoryPage })));
const SellerCustomersPage = lazy(() => import('./pages/seller/SellerCustomersPage').then((m) => ({ default: m.SellerCustomersPage })));
const SellerStorePage = lazy(() => import('./pages/seller/SellerStorePage').then((m) => ({ default: m.SellerStorePage })));
const SellerReviewsPage = lazy(() => import('./pages/seller/SellerReviewsPage').then((m) => ({ default: m.SellerReviewsPage })));
const SellerFollowersPage = lazy(() => import('./pages/seller/SellerFollowersPage').then((m) => ({ default: m.SellerFollowersPage })));
const SellerAnalyticsPage = lazy(() => import('./pages/seller/SellerAnalyticsPage').then((m) => ({ default: m.SellerAnalyticsPage })));
const SellerForecastPage = lazy(() => import('./pages/seller/SellerForecastPage').then((m) => ({ default: m.SellerForecastPage })));
const SellerPromotionsPage = lazy(() => import('./pages/seller/SellerPromotionsPage').then((m) => ({ default: m.SellerPromotionsPage })));
const SellerPaymentsPage = lazy(() => import('./pages/seller/SellerPaymentsPage').then((m) => ({ default: m.SellerPaymentsPage })));

const AdminSellersPage = lazy(() => import('./pages/admin/AdminSellersPage').then((m) => ({ default: m.AdminSellersPage })));
const AdminSellerDetailPage = lazy(() => import('./pages/admin/AdminSellerDetailPage').then((m) => ({ default: m.AdminSellerDetailPage })));
const AdminSellerProductsPage = lazy(() => import('./pages/admin/AdminSellerProductsPage').then((m) => ({ default: m.AdminSellerProductsPage })));

export default function App() {
  return (
    <ToastProvider>
      <BrandTransitionProvider>
      <ScrollRestoration />
      <Canonical />
      <Suspense fallback={<SkeletonAppShell />}>
      <Routes>

        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/become-a-shopper" element={<BecomeShopperPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/help" element={<FaqPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/refunds" element={<RefundPolicyPage />} />
          <Route path="/cookies" element={<CookiePolicyPage />} />
          <Route path="/sell" element={<SellPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<MarketLayout />}>
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/store/:slug" element={<StorePage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
        </Route>

        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="signup" />} />

        <Route element={<ProtectedRoute allow={['customer']} />}>
          <Route element={<CustomerLayout />}>
            <Route path="/app" element={<CustomerDashboardPage />} />
            <Route path="/app/requests/new" element={<CreateRequestPage />} />
            <Route path="/app/requests" element={<Navigate to="/app/orders?view=requests" replace />} />
            <Route path="/app/account" element={<Navigate to="/app/settings" replace />} />
            <Route path="/app/requests/:id" element={<RequestDetailsPage />} />
            <Route path="/app/orders" element={<OrdersListPage />} />
            <Route path="/app/orders/:id" element={<ActiveOrderPage />} />
            <Route path="/app/orders/:id/messages" element={<OrderMessagesPage />} />
            <Route path="/app/payments" element={<PaymentsPage />} />
            <Route path="/app/profile" element={<Navigate to="/app/settings/personal" replace />} />
            <Route path="/app/messages" element={<ChatListPage />} />
            <Route path="/app/settings/:section?" element={<SettingsPage />} />
            <Route path="/app/purchases" element={<PurchasesPage />} />
            <Route path="/app/purchases/:id" element={<PurchaseDetailPage />} />
            <Route path="/app/following" element={<FollowingPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allow={['shopper']} />}>
          <Route element={<ShopperLayout />}>
            <Route path="/shopper" element={<ShopperDashboardPage />} />
            <Route path="/shopper/available" element={<AvailableRequestsPage />} />
            <Route path="/shopper/orders" element={<ShopperOrdersPage />} />
            <Route path="/shopper/orders/:id" element={<ShoppingWorkflowPage />} />
            <Route path="/shopper/orders/:id/messages" element={<OrderMessagesPage />} />
            <Route path="/shopper/earnings" element={<ShopperEarningsPage />} />
            <Route path="/shopper/verification" element={<ShopperVerificationPage />} />
            <Route path="/shopper/profile" element={<ShopperProfilePage />} />
            <Route path="/shopper/messages" element={<ChatListPage />} />
            <Route path="/shopper/settings/:section?" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allow={['seller']} />}>
          <Route element={<SellerLayout />}>
            <Route path="/seller" element={<SellerDashboardPage />} />
            <Route path="/seller/products" element={<SellerProductsPage />} />
            <Route path="/seller/products/new" element={<SellerProductFormPage />} />
            <Route path="/seller/products/:id/edit" element={<SellerProductFormPage />} />
            <Route path="/seller/orders" element={<SellerOrdersPage />} />
            <Route path="/seller/orders/:id" element={<SellerOrderDetailPage />} />
            <Route path="/seller/inventory" element={<SellerInventoryPage />} />
            <Route path="/seller/customers" element={<SellerCustomersPage />} />
            <Route path="/seller/store" element={<SellerStorePage />} />
            <Route path="/seller/reviews" element={<SellerReviewsPage />} />
            <Route path="/seller/followers" element={<SellerFollowersPage />} />
            <Route path="/seller/analytics" element={<SellerAnalyticsPage />} />
            <Route path="/seller/forecast" element={<SellerForecastPage />} />
            <Route path="/seller/promotions" element={<SellerPromotionsPage />} />
            <Route path="/seller/payments" element={<SellerPaymentsPage />} />
            <Route path="/seller/messages" element={<Navigate to="/seller/orders" replace />} />
            <Route path="/seller/settings/:section?" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allow={['admin', 'super_admin']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminOverviewPage />} />
            <Route path="/admin/customers" element={<AdminCustomersPage />} />
            <Route path="/admin/customers/:id" element={<AdminCustomerDetailPage />} />
            <Route path="/admin/shoppers" element={<AdminShoppersPage />} />
            <Route path="/admin/shoppers/:id" element={<AdminShopperDetailPage />} />
            <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
            <Route path="/admin/requests" element={<AdminRequestsPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
            <Route path="/admin/disputes" element={<AdminDisputesPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/admin/finance" element={<AdminFinancePage />} />
            <Route path="/admin/operations" element={<AdminOpsPage />} />
            <Route path="/admin/staff" element={<AdminStaffPage />} />
            <Route path="/admin/god-view" element={<AdminGodViewPage />} />
            <Route path="/admin/fees" element={<AdminFeesPage />} />
            <Route path="/admin/sellers" element={<AdminSellersPage />} />
            <Route path="/admin/sellers/:id" element={<AdminSellerDetailPage />} />
            <Route path="/admin/seller-products" element={<AdminSellerProductsPage />} />
            <Route path="/admin/settings/:section?" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
      </Suspense>
      </BrandTransitionProvider>
    </ToastProvider>
  );
}
