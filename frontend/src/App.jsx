import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Programs from './pages/Programs.jsx';
import Pricing from './pages/Pricing.jsx';
import Schedule from './pages/Schedule.jsx';
import Gallery from './pages/Gallery.jsx';
import Contact from './pages/Contact.jsx';
import BookTrial from './pages/BookTrial.jsx';
import QuickCheckin from './pages/QuickCheckin.jsx';
import BookingFlow from './pages/BookingFlow.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Calendar from './pages/Calendar.jsx';
import GuestBookingLookup from './pages/GuestBookingLookup.jsx';
import PromotionsManagement from './pages/admin/PromotionsManagement.jsx';
import TaxManagement from './pages/admin/TaxManagement.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import MemberHealthDeclaration from './pages/MemberHealthDeclaration.jsx';
import InvoiceView from './pages/InvoiceView.jsx';
import HelpCenter from './pages/HelpCenter.jsx';
import ManualView from './pages/ManualView.jsx';
import { RequireAuth, RequireAdmin, RequireTrainer, RequirePermission, RequireShift } from './components/ProtectedRoutes.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { BranchProvider } from './context/BranchContext.jsx';
import { BrandProvider } from './context/BrandContext.jsx';
import { ShiftProvider } from './context/ShiftContext.jsx';
import { Toaster } from 'react-hot-toast';
import api from './api/api.js';
import { getToken, setAuth } from './utils/auth.js';

import ParentDashboard from './pages/parent/ParentDashboard.jsx';
import MyChildren from './pages/parent/MyChildren.jsx';
import BookClasses from './pages/parent/BookClasses.jsx';
import PaymentHistory from './pages/parent/PaymentHistory.jsx';
import Membership from './pages/parent/Membership.jsx';
import Attendance from './pages/parent/Attendance.jsx';
import MyBookings from './pages/parent/MyBookings.jsx';
import MyCoupons from './pages/parent/MyCoupons.jsx';
import MyReviews from './pages/parent/MyReviews.jsx';
import Profile from './pages/parent/Profile.jsx';

import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import WalkingBooking from './pages/admin/WalkingBooking.jsx';
import ClassesManagement from './pages/admin/ClassesManagement.jsx';
import PricingManagement from './pages/admin/PricingManagement.jsx';
import BookingManagement from './pages/admin/BookingManagement.jsx';
import UsersManagement from './pages/admin/UsersManagement.jsx';
import Reports from './pages/admin/Reports.jsx';
import TrainersManagement from './pages/admin/TrainersManagement.jsx';
import TrainerPayroll from './pages/admin/TrainerPayroll.jsx';
import VendorsManagement from './pages/admin/VendorsManagement.jsx';
import VendorSales from './pages/admin/VendorSales.jsx';
import VoucherManagement from './pages/admin/VoucherManagement.jsx';
import VoucherPrint from './pages/admin/VoucherPrint.jsx';
import AttendanceManagement from './pages/admin/AttendanceManagement.jsx';
import MembershipManagement from './pages/admin/MembershipManagement.jsx';
import SessionsManagement from './pages/admin/SessionsManagement.jsx';
import TrialsManagement from './pages/admin/TrialsManagement.jsx';
import PaymentsManagement from './pages/admin/PaymentsManagement.jsx';
import LocationManagement from './pages/admin/LocationManagement.jsx';
import SpecialtiesManagement from './pages/admin/SpecialtiesManagement.jsx';
import CategoryManagement from './pages/admin/CategoryManagement.jsx';
import RoleMaster from './pages/admin/RoleMaster.jsx';
import LeadsManagement from './pages/admin/LeadsManagement.jsx';
import CorporateBooking from './pages/admin/CorporateBooking.jsx';
import SystemSettings from './pages/admin/SystemSettings.jsx';
import ExtensionPanel from './pages/admin/ExtensionPanel.jsx';
import ExpensesManagement from './pages/admin/ExpensesManagement.jsx';
import AbortedBookings from './pages/admin/AbortedBookings.jsx';
import ProfitLoss from './pages/admin/ProfitLoss.jsx';
import SalesDashboard from './pages/admin/SalesDashboard.jsx';
import UATManagement from './pages/admin/UATManagement.jsx';
import TrainerDashboard from './pages/trainer/TrainerDashboard.jsx';
import ReviewsManagement from './pages/admin/ReviewsManagement.jsx';
import ShiftManagement from './pages/admin/ShiftManagement.jsx';
import CMSManagement from './pages/admin/CMSManagement.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';

export default function App() {
  return (
    <SettingsProvider>
      <SocketProvider>
        <AuthProvider>
          <BrandProvider>
            <BranchProvider>
              <ShiftProvider>
                <Toaster />
                <Routes>
                  {/* ... existing routes ... */}
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/programs" element={<Programs />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/book-trial" element={<BookTrial />} />
                <Route path="/quick-checkin" element={<QuickCheckin />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/book" element={<BookingFlow />} />
                <Route path="/lookup" element={<GuestBookingLookup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/health-declaration" element={<MemberHealthDeclaration />} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/manuals/:type" element={<ManualView />} />
                <Route path="/invoice/:id" element={<RequireAuth><InvoiceView /></RequireAuth>} />
                <Route path="/invoice/booking/:bookingId" element={<RequireAuth><InvoiceView /></RequireAuth>} />
                <Route path="/print/voucher/:id" element={<RequireAuth><VoucherPrint /></RequireAuth>} />

                <Route element={<RequireAuth />}>
                  <Route path="/dashboard" element={<ParentDashboard />} />
                  <Route path="/dashboard/children" element={<MyChildren />} />
                  <Route path="/dashboard/book" element={<BookClasses />} />
                  <Route path="/dashboard/bookings" element={<MyBookings />} />
                  <Route path="/dashboard/payments" element={<PaymentHistory />} />
                  <Route path="/dashboard/membership" element={<Membership />} />
                  <Route path="/dashboard/attendance" element={<Attendance />} />
                  <Route path="/dashboard/coupons" element={<MyCoupons />} />
                  <Route path="/dashboard/reviews" element={<MyReviews />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/calendar" element={<Calendar />} />
                </Route>

                <Route element={<RequireTrainer />}>
                  <Route path="/trainer/dashboard" element={<TrainerDashboard />} />
                </Route>

                <Route element={<RequireAdmin />}>
                  <Route path="/:roleSlug" element={<AdminDashboard />} />
                  
                  <Route element={<RequireShift />}>
                    <Route path="/:roleSlug/walking-booking" element={<WalkingBooking />} />

                  <Route element={<RequirePermission permission="reports:view" />}>
                    <Route path="/:roleSlug/aborted-bookings" element={<AbortedBookings />} />
                  </Route>

                  <Route element={<RequirePermission permission="classes:view" />}>
                    <Route path="/:roleSlug/classes" element={<ClassesManagement />} />
                  </Route>

                  <Route element={<RequirePermission permission="sessions:view" />}>
                    <Route path="/:roleSlug/sessions" element={<SessionsManagement />} />
                  </Route>

                  <Route element={<RequirePermission permission="pricing:view" />}>
                    <Route path="/:roleSlug/pricing" element={<PricingManagement />} />
                  </Route>

                  <Route element={<RequirePermission permission="bookings:view" />}>
                    <Route path="/:roleSlug/bookings" element={<BookingManagement />} />
                    <Route path="/:roleSlug/corporate-booking" element={<CorporateBooking />} />
                  </Route>

                  <Route element={<RequirePermission permission="users:view" />}>
                    <Route path="/:roleSlug/users" element={<UsersManagement />} />
                  </Route>

                  <Route element={<RequirePermission permission="reports:view" />}>
                    <Route path="/:roleSlug/reports" element={<Reports />} />
                    <Route path="/:roleSlug/reviews" element={<ReviewsManagement />} />
                    <Route path="/:roleSlug/shifts" element={<ShiftManagement />} />
                  </Route>

                  <Route element={<RequirePermission permission="profit_loss:view" />}>
                    <Route path="/:roleSlug/profit-loss" element={<ProfitLoss />} />
                    <Route path="/:roleSlug/sales-dashboard" element={<SalesDashboard />} />
                  </Route>

                  <Route element={<RequirePermission permission="trainers:view" />}>
                    <Route path="/:roleSlug/trainers" element={<TrainersManagement />} />
                    <Route path="/:roleSlug/trainers/payroll" element={<TrainerPayroll />} />
                  </Route>

                  <Route element={<RequirePermission permission="vendors:view" />}>
                    <Route path="/:roleSlug/vendors" element={<VendorsManagement />} />
                  </Route>
                  <Route element={<RequirePermission permission="reports:view" />}>
                    <Route path="/:roleSlug/vendors/sales" element={<VendorSales />} />
                  </Route>

                  <Route element={<RequirePermission permission="attendance:view" />}>
                    <Route path="/:roleSlug/attendance" element={<AttendanceManagement />} />
                  </Route>

                  <Route element={<RequirePermission permission="memberships:view" />}>
                    <Route path="/:roleSlug/memberships" element={<MembershipManagement />} />
                  </Route>

                  <Route element={<RequirePermission permission="trials:view" />}>
                    <Route path="/:roleSlug/trials" element={<TrialsManagement />} />
                    <Route path="/:roleSlug/leads" element={<LeadsManagement />} />
                  </Route>

                  <Route element={<RequirePermission permission="payments:view" />}>
                    <Route path="/:roleSlug/payments" element={<PaymentsManagement />} />
                  </Route>

                  <Route element={<RequirePermission permission="locations:view" />}>
                    <Route path="/:roleSlug/locations" element={<LocationManagement />} />
                  </Route>

                  <Route element={<RequirePermission permission="specialties:view" />}>
                    <Route path="/:roleSlug/specialties" element={<SpecialtiesManagement />} />
                    <Route path="/:roleSlug/categories" element={<CategoryManagement />} />
                  </Route>

                  <Route element={<RequirePermission permission="roles:view" />}>
                    <Route path="/:roleSlug/roles" element={<RoleMaster />} />
                  </Route>

                  <Route element={<RequirePermission permission="promotions:view" />}>
                    <Route path="/:roleSlug/promotions" element={<PromotionsManagement />} />
                  </Route>

                  <Route element={<RequirePermission permission="settings:view" />}>
                    <Route path="/:roleSlug/settings" element={<SystemSettings />} />
                    <Route path="/:roleSlug/taxes" element={<TaxManagement />} />
                    <Route path="/:roleSlug/vouchers" element={<VoucherManagement />} />
                    <Route path="/:roleSlug/cms" element={<CMSManagement />} />
                  </Route>

                  <Route path="/:roleSlug/extensions" element={<ExtensionPanel />} />
                  
                    <Route element={<RequirePermission permission="expenses:view" />}>
                      <Route path="/:roleSlug/expenses" element={<ExpensesManagement />} />
                    </Route>
                    
                    <Route path="/:roleSlug/uat" element={<UATManagement />} />
                  </Route>
                </Route>
              </Routes>
              </ShiftProvider>
            </BranchProvider>
          </BrandProvider>
        </AuthProvider>
      </SocketProvider>
    </SettingsProvider>
  );
}
