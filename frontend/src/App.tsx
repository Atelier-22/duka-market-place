import { Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { PublicLayout } from './components/layout/PublicLayout';
import { CustomerLayout } from './components/layout/CustomerLayout';
import { ShopperLayout } from './components/layout/ShopperLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

import { LandingPage } from './pages/public/LandingPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { BecomeShopperPage } from './pages/public/BecomeShopperPage';
import { AboutPage } from './pages/public/AboutPage';
import { FaqPage } from './pages/public/FaqPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';

import { CustomerDashboardPage } from './pages/customer/CustomerDashboardPage';
import { CreateRequestPage } from './pages/customer/CreateRequestPage';
import { MyRequestsPage } from './pages/customer/MyRequestsPage';
import { RequestDetailsPage } from './pages/customer/RequestDetailsPage';
import { ActiveOrderPage } from './pages/customer/ActiveOrderPage';
import { OrdersListPage } from './pages/customer/OrderHistoryPage';
import { PaymentsPage } from './pages/customer/PaymentsPage';
import { CustomerProfilePage } from './pages/customer/CustomerProfilePage';

import { ShopperDashboardPage } from './pages/shopper/ShopperDashboardPage';
import { AvailableRequestsPage } from './pages/shopper/AvailableRequestsPage';
import { ShopperOrdersPage } from './pages/shopper/ShopperOrdersPage';
import { ShoppingWorkflowPage } from './pages/shopper/ShoppingWorkflowPage';
import { ShopperEarningsPage } from './pages/shopper/ShopperEarningsPage';
import { ShopperVerificationPage } from './pages/shopper/ShopperVerificationPage';
import { ShopperProfilePage } from './pages/shopper/ShopperProfilePage';

import { OrderMessagesPage } from './pages/shared/OrderMessagesPage';
import { SettingsPage } from './pages/shared/SettingsPage';
import { ChatListPage } from './pages/shared/ChatListPage';

import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminCustomerDetailPage } from './pages/admin/AdminCustomerDetailPage';
import { AdminShopperDetailPage } from './pages/admin/AdminShopperDetailPage';
import { AdminOrderDetailPage } from './pages/admin/AdminOrderDetailPage';
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import { AdminShoppersPage } from './pages/admin/AdminShoppersPage';
import { AdminVerificationsPage } from './pages/admin/AdminVerificationsPage';
import { AdminRequestsPage } from './pages/admin/AdminRequestsPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminDisputesPage } from './pages/admin/AdminDisputesPage';
import { AdminFeesPage } from './pages/admin/AdminFeesPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminFinancePage } from './pages/admin/AdminFinancePage';
import { AdminOpsPage } from './pages/admin/AdminOpsPage';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Public marketing site */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/become-a-shopper" element={<BecomeShopperPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/help" element={<FaqPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Customer app */}
        <Route element={<ProtectedRoute allow={['customer']} />}>
          <Route element={<CustomerLayout />}>
            <Route path="/app" element={<CustomerDashboardPage />} />
            <Route path="/app/requests/new" element={<CreateRequestPage />} />
            <Route path="/app/requests" element={<MyRequestsPage />} />
            <Route path="/app/requests/:id" element={<RequestDetailsPage />} />
            <Route path="/app/orders" element={<OrdersListPage />} />
            <Route path="/app/orders/:id" element={<ActiveOrderPage />} />
            <Route path="/app/orders/:id/messages" element={<OrderMessagesPage />} />
            <Route path="/app/payments" element={<PaymentsPage />} />
            <Route path="/app/profile" element={<CustomerProfilePage />} />
            <Route path="/app/messages" element={<ChatListPage />} />
            <Route path="/app/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Shopper app */}
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
            <Route path="/shopper/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Admin panel */}
        <Route element={<ProtectedRoute allow={['admin']} />}>
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
            <Route path="/admin/fees" element={<AdminFeesPage />} />
            {/* The same SettingsPage the customer and shopper dashboards use —
                an admin is a person with an account like anyone else. */}
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<LandingPage />} />
      </Routes>
    </ToastProvider>
  );
}
