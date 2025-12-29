# ✅ PHASE 4: DETAILED PAGE-BY-PAGE CLEANUP CHECKLIST

**How to use this:**
1. Go through each page section below
2. Open that page file in VS Code
3. Execute each specific task
4. Check off when complete
5. Test the page locally
6. Move to next page

**Before starting:** `bun run dev` in one terminal so you can test changes live

---

# 📱 PUBLIC PAGES (Customer-Facing)

## 1. HOMEPAGE (`src/app/page.tsx`)

**Purpose:** First impression, clear value prop, drive to browse/register

### Tasks:

- [ ] **1.1 - Remove any "Coming Soon" or "Beta" badges**
  - Search file for: `coming`, `beta`, `launch`, `alpha`
  - Delete or hide these elements
  - Command: `grep -n "coming\|beta\|launch" src/app/page.tsx`

- [ ] **1.2 - Verify hero section exists and looks clean**
  - Hero should have: headline, subheading, 2 CTA buttons
  - Make sure NO placeholder text like "Your headline here"
  - Search for: `TODO`, `FIXME`, `placeholder`, `temp`, `xxx`
  - Delete or replace any found

- [ ] **1.3 - Update copy to be professional**
  - Headline: "Luxury Collectibles Marketplace" or similar
  - Subheading: 1-line value prop (authenticity, investment, community)
  - CTA buttons: "Browse Collection" and "Register Now"
  - Make sure no sales-y or cheesy language

- [ ] **1.4 - Feature showcase section (3-4 features)**
  - Should highlight: Authenticated items, Expert verification, Investment tracking
  - Remove any "coming soon" features
  - Limit to what actually exists in product

- [ ] **1.5 - Clean up styling**
  - Check Tailwind classes are correct
  - No broken responsive layout on mobile
  - Test: Resize browser, check mobile view looks good
  - Command: Open DevTools → Toggle device toolbar (Ctrl+Shift+M)

- [ ] **1.6 - Check all links work**
  - "Browse Collection" → `/shop` (should load products)
  - "Register Now" → `/register` (should load form)
  - Any footer links → test they navigate
  - Command: Click each link, verify page loads

- [ ] **1.7 - Remove any sections with incomplete content**
  - If you have a "Latest Products" section but no products: hide it
  - If you have testimonials section but no testimonials: hide it
  - Use: `{/* Hide for now */}` to comment out incomplete sections

- [ ] **1.8 - Final visual check**
  - Test locally: http://localhost:3000
  - Should look professional, no errors in console
  - Should be mobile-friendly
  - Screenshot for reference

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

## 2. PRODUCT CATALOG (`src/app/shop/page.tsx` and `/category/[slug]/page.tsx`)

**Purpose:** Browse and filter products cleanly

### Shop Page Tasks:

- [ ] **2.1 - Verify products load**
  - Navigate to http://localhost:3000/shop
  - Should show 5+ products from database
  - If blank: check database has products, check query is correct
  - Command: Check browser console for errors

- [ ] **2.2 - Check product grid layout**
  - Products should display in 2-4 column grid (responsive)
  - Each card shows: image, title, price, category badge
  - No broken images (should show ImageKit CDN images)
  - Test mobile: should be 1 column

- [ ] **2.3 - Verify filters work (if implemented)**
  - Filter by category: click "Fine Art" → shows only fine art
  - Filter by price: select price range → filters correctly
  - If filters are broken: hide them for now
  - Command: Disable broken filters:
    ```tsx
    {/* Filter section - disable if broken */}
    {/* <FilterPanel /> */}
    ```

- [ ] **2.4 - Verify sorting works (if implemented)**
  - Sort by "Price: Low to High" → products reorder
  - Sort by "Newest" → shows newest first
  - If broken: disable it
  - Command: Set default to no sorting if not ready

- [ ] **2.5 - Remove placeholder products**
  - If you have "Sample Product 1", "Test Item", etc: delete from database
  - Keep only real products for launch
  - Command: 
    ```sql
    DELETE FROM "Product" WHERE title LIKE '%test%' OR title LIKE '%sample%';
    ```

- [ ] **2.6 - Check loading states**
  - Page should load in <2 seconds
  - Show loading spinner while fetching
  - No "undefined" or error states visible
  - Command: Check Network tab in DevTools (F12 → Network)

- [ ] **2.7 - Verify pagination OR limit display**
  - Option A: Show only first 20 products, add "Load More" button
  - Option B: Paginate with page numbers
  - Option C: Infinite scroll
  - Make sure not showing ALL products at once
  - Command: Add limit to query: `take: 20`

- [ ] **2.8 - Final check**
  - Browse shop page, click on products
  - Each product should link to detail page
  - Back button should return to shop
  - No console errors

**Category Page Tasks:**

- [ ] **2.9 - Verify category pages work**
  - Navigate to http://localhost:3000/category/fine-art
  - Should show only products in that category
  - Page title should be category name
  - If category pages broken: disable them and show all in /shop

- [ ] **2.10 - Check category navigation**
  - Categories accessible from shop or homepage
  - Clicking category filters correctly
  - If broken: just show flat list in /shop

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

## 3. PRODUCT DETAIL (`src/app/product/[slug]/page.tsx`)

**Purpose:** Show complete product info, enable purchase

### Tasks:

- [ ] **3.1 - Click on a product from shop**
  - Should load detail page: http://localhost:3000/product/[slug]
  - Page should not be blank or 404
  - Command: Test clicking 3 different products

- [ ] **3.2 - Verify product info displays**
  - Title, description, price all visible
  - Category badge shown
  - Condition/authentication info shown
  - If any section says "Coming Soon": hide it or remove
  - Command: Search for "coming", "TODO", fix or delete

- [ ] **3.3 - Check product image**
  - Should display main product image
  - Image should load from ImageKit CDN (fast)
  - Should be high-quality, not blurry
  - If image broken: show placeholder image
  - Command: Check image URL in source code

- [ ] **3.4 - Verify price is visible and correct**
  - Price should display prominently in USD format: $1,234.56
  - Should not show "Free" or "$0"
  - If price shows as null: display "Contact for price" or remove product
  - Command: Check product data in database

- [ ] **3.5 - Check "Add to Cart" button**
  - Button should be visible and clickable
  - Clicking should add to cart (cart count increases)
  - Should show confirmation message: "Added to cart"
  - Command: Click button, check cart updates

- [ ] **3.6 - Remove incomplete sections**
  - If "Related Products" section exists but is empty: hide it
    ```tsx
    {/* Related products - disabled for now */}
    {/* <RelatedProducts /> */}
    ```
  - If "Customer Reviews" section incomplete: hide it
  - If "Offer/Bid" section not ready: hide it
  - Command: Search for incomplete sections and comment out

- [ ] **3.7 - Verify provenance/authentication info**
  - If product has provenance data: display clearly
  - If no provenance section built: it's OK, skip for now
  - If section exists but empty: hide it

- [ ] **3.8 - Check mobile layout**
  - DevTools → Toggle device toolbar (Ctrl+Shift+M)
  - Image, title, price, buttons should stack vertically
  - All text readable
  - Add to cart button easy to tap

- [ ] **3.9 - Test breadcrumb navigation (if exists)**
  - Breadcrumb should show: Home > Products > Category > Product Title
  - Clicking breadcrumbs should navigate back
  - If breadcrumbs broken: hide them for now

- [ ] **3.10 - Final check**
  - No console errors (F12 → Console)
  - Page loads in <2 seconds
  - All interactive elements work
  - Mobile looks good

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

## 4. SHOPPING CART (`src/app/cart/page.tsx`)

**Purpose:** Review items before checkout, adjust quantities

### Tasks:

- [ ] **4.1 - Add item to cart from product page**
  - Go to any product detail page
  - Click "Add to Cart"
  - Navigate to http://localhost:3000/cart
  - Item should appear in cart

- [ ] **4.2 - Verify cart displays items correctly**
  - Each item shows: product name, price, quantity
  - Product image shown
  - Subtotal calculated: quantity × price
  - Cart total calculated: sum of all items
  - Command: Math check in your head

- [ ] **4.3 - Test quantity adjustment**
  - Click "+" button next to item: quantity increases
  - Click "-" button: quantity decreases
  - Total updates when quantity changes
  - Minimum quantity is 1
  - Command: Add item, increase to 3, decrease to 1, check total

- [ ] **4.4 - Test remove item**
  - Click "Remove" or "Delete" button
  - Item disappears from cart
  - Cart total updates
  - If cart now empty: show "Cart is empty" message
  - Command: Remove all items, cart should say empty

- [ ] **4.5 - Verify empty cart state**
  - If cart is empty, show message and link back to shop
  - Don't show blank page or errors
  - Message: "Your cart is empty. Continue shopping."

- [ ] **4.6 - Check "Proceed to Checkout" button**
  - Button visible and enabled when cart has items
  - Button disabled when cart is empty
  - Clicking button navigates to `/checkout`
  - Command: Add item, button should be clickable

- [ ] **4.7 - Verify cart persistence**
  - Add item to cart
  - Refresh page (F5)
  - Item should still be in cart (using localStorage or session)
  - Command: Add item, refresh, check it's still there

- [ ] **4.8 - Check pricing details section**
  - Should show: Subtotal, Shipping (if applicable), Tax (if applicable), Total
  - Numbers should be correct
  - Format should be currency: $1,234.56

- [ ] **4.9 - Mobile responsive check**
  - DevTools → Toggle device toolbar
  - Items stack vertically
  - Quantity buttons easy to tap
  - Checkout button full width

- [ ] **4.10 - Remove any rough edges**
  - No "Coming Soon" badges
  - No placeholder text
  - No empty sections
  - Delete if not ready: "Recommended products", "Gift message"

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

## 5. CHECKOUT (`src/app/checkout/page.tsx`)

**Purpose:** Collect payment, complete purchase

### Tasks:

- [ ] **5.1 - Navigate to checkout**
  - From cart, click "Proceed to Checkout"
  - Should load http://localhost:3000/checkout
  - No blank page or errors

- [ ] **5.2 - Verify customer info form**
  - Form should have fields: name, email, address, city, state, zip
  - Fields should be labeled clearly
  - Form should validate: name required, valid email, address required
  - Command: Try submitting empty form, should show error

- [ ] **5.3 - Verify order summary displays**
  - Show items being purchased (name, quantity, price)
  - Show subtotal, tax (if applicable), shipping (if applicable), total
  - Total should match cart total
  - Command: Cross-check with cart page

- [ ] **5.4 - Test Stripe payment form**
  - Stripe payment form should be embedded
  - Should have fields: card number, expiry, CVC
  - Form should look professional, not broken

- [ ] **5.5 - Test with Stripe test card**
  - Card number: `4242 4242 4242 4242`
  - Expiry: any future date (e.g., `12/25`)
  - CVC: any 3 digits (e.g., `123`)
  - Fill form and submit
  - Command: Complete full payment flow

- [ ] **5.6 - Verify payment processes**
  - After clicking "Pay Now", payment should process
  - Show loading state while processing (spinner, disabled button)
  - After success: redirect to order confirmation page
  - Command: Watch for redirect to `/checkout/success` or order page

- [ ] **5.7 - Check order confirmation page**
  - After payment, show confirmation
  - Display: order number, customer name, order total, items
  - Show message: "Thank you for your order"
  - Provide link back to home or shop
  - Command: Should have received order confirmation

- [ ] **5.8 - Verify no payment errors**
  - Open DevTools console (F12 → Console)
  - Should have NO errors after payment
  - Check Stripe payment in Stripe dashboard (test mode)
  - Command: Look for failed payments

- [ ] **5.9 - Test form validation**
  - Try submitting with missing fields
  - Should show error for each missing field
  - Should NOT submit incomplete form
  - Command: Try clearing required fields

- [ ] **5.10 - Mobile responsive**
  - DevTools → device mode
  - Form fields stack vertically
  - Stripe form readable
  - Submit button full width and easy to tap

- [ ] **5.11 - Remove any rough edges**
  - No "Coming Soon" badges
  - No placeholder text in form labels
  - No error messages for successful flow
  - Clean, professional appearance

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

## 6. AUTHENTICATION - REGISTER (`src/app/register/page.tsx`)

**Purpose:** New user sign up

### Tasks:

- [ ] **6.1 - Navigate to register page**
  - Go to http://localhost:3000/register
  - Page should load, show registration form

- [ ] **6.2 - Verify form fields**
  - Should have: Name, Email, Password, Confirm Password
  - All fields labeled clearly
  - No placeholder confusion
  - Command: Check form inputs exist

- [ ] **6.3 - Test successful registration**
  - Fill in: name, NEW email (not used before), password, confirm password
  - Click "Register" or "Sign Up"
  - Should create account
  - Should redirect to login or auto-login to dashboard
  - Command: Test with unique email each time

- [ ] **6.4 - Test validation errors**
  - Try submitting with missing fields: should error
  - Try mismatched passwords: should error
  - Try invalid email format: should error
  - Command: Test each validation

- [ ] **6.5 - Test duplicate email**
  - Register with an email you already used
  - Should show error: "Email already registered"
  - Should NOT create duplicate account
  - Command: Try registering twice with same email

- [ ] **6.6 - Check password requirements**
  - If you have password rules (8+ chars, etc), test them
  - Should enforce and show message
  - Or keep simple for MVP (no special rules)

- [ ] **6.7 - After successful registration**
  - Should redirect to login or dashboard
  - Should NOT show raw error codes
  - Should show success message or dashboard

- [ ] **6.8 - Remove any rough edges**
  - No "Coming Soon" sections
  - No incomplete fields (verify role/type selection if exists)
  - If social login not ready: remove/hide buttons
  - Clean appearance

- [ ] **6.9 - Mobile responsive**
  - DevTools → device mode
  - Form fields stack vertically
  - Submit button full width
  - All text readable

- [ ] **6.10 - Test that you can login after registering**
  - After registration, test login with same credentials
  - Command: Complete registration, then test login

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

## 7. AUTHENTICATION - LOGIN (`src/app/login/page.tsx`)

**Purpose:** Existing users sign in

### Tasks:

- [ ] **7.1 - Navigate to login page**
  - Go to http://localhost:3000/login
  - Page should load, show login form

- [ ] **7.2 - Verify form fields**
  - Should have: Email, Password, "Remember me" (optional)
  - All labeled clearly
  - No placeholder confusion

- [ ] **7.3 - Test successful login**
  - Use registered account (email, password)
  - Click "Login" or "Sign In"
  - Should authenticate
  - Should redirect to dashboard or home
  - Command: Test with real account

- [ ] **7.4 - Test failed login**
  - Try wrong password: should error
  - Error message: "Invalid email or password"
  - Should NOT reveal which field is wrong (security)
  - Command: Test with wrong password

- [ ] **7.5 - Test non-existent email**
  - Try email that's not registered
  - Should show same error: "Invalid email or password"
  - Should NOT say "Email not found" (security)
  - Command: Try random email

- [ ] **7.6 - Check session persistence**
  - After login, refresh page (F5)
  - Should stay logged in
  - Session should persist
  - Command: Login, refresh, check you're still logged in

- [ ] **7.7 - Verify "forgot password" (if exists)**
  - If forgot password link exists: should work
  - If not implemented: hide/remove for now
  - For now, you can manually reset via database if needed

- [ ] **7.8 - Remove any rough edges**
  - No "Coming Soon" sections
  - No incomplete features
  - Clean, professional appearance
  - Professional error messages

- [ ] **7.9 - Mobile responsive**
  - DevTools → device mode
  - Form fields stack vertically
  - Submit button full width
  - All text readable

- [ ] **7.10 - Test logout works**
  - After login, navigate to account
  - Click logout button
  - Should clear session
  - Should redirect to login or home
  - Command: Test logout flow

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

## 8. ACCOUNT / PROFILE (`src/app/account/page.tsx`)

**Purpose:** User dashboard, order history

### Tasks:

- [ ] **8.1 - Navigate to account page**
  - Must be logged in first
  - Go to http://localhost:3000/account
  - Should load user dashboard

- [ ] **8.2 - Verify authentication protection**
  - If NOT logged in, trying to access `/account` should redirect to login
  - If logged in, should display account page
  - Command: Logout, try accessing /account, should redirect to login

- [ ] **8.3 - Display user profile info**
  - Show: name, email, member since date
  - Should be read-only (for MVP, no editing yet)
  - If edit profile exists but incomplete: hide it
  - Command: Check user info displays correctly

- [ ] **8.4 - Display order history**
  - List all previous orders
  - Each order shows: order number, date, items, total, status
  - Most recent first
  - Command: Complete a test order, check it appears here

- [ ] **8.5 - Test order detail navigation**
  - Click on order number to see details
  - Should show full order info: items, shipping address, total
  - Should NOT be broken or blank
  - Command: Click an order, verify detail page loads

- [ ] **8.6 - Remove incomplete sections**
  - If "Wishlist" exists but broken: hide it
  - If "Saved addresses" incomplete: hide it
  - If "Payment methods" incomplete: hide it
  - Only show what's fully functional
  - Command: Comment out incomplete sections

- [ ] **8.7 - Verify logout button**
  - Logout button visible and accessible
  - Clicking logout clears session
  - Redirects to login or home
  - Command: Test logout from account page

- [ ] **8.8 - Check for rough edges**
  - No "Coming Soon" badges
  - No placeholder content
  - No "TBD" or incomplete info
  - Professional appearance

- [ ] **8.9 - Mobile responsive**
  - DevTools → device mode
  - Order list stacks vertically
  - All text readable
  - Buttons easy to tap

- [ ] **8.10 - Navigation from account**
  - Should have link back to home or shop
  - Should be able to navigate site from account page
  - Top navigation should work

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

## 9. STATIC PAGES (About, Contact, FAQ, Shipping)

**Purpose:** Information pages, no complex interactions

### About Page (`/about`)

- [ ] **9.1 - Navigate to about page**
  - Go to http://localhost:3000/about
  - Page should load, not 404

- [ ] **9.2 - Write clean about copy**
  - 2-3 paragraphs about Kollect-It
  - Key points: authenticity, expertise, community
  - Professional tone, no sales-y language
  - Command: Read it aloud, does it sound good?

- [ ] **9.3 - Add mission statement (optional)**
  - 1-2 sentences about your mission
  - Keep it genuine, not marketing fluff

- [ ] **9.4 - Remove any rough edges**
  - No placeholder text like "Lorem ipsum"
  - No "Coming Soon" sections
  - No incomplete info

### Contact Page (`/contact`)

- [ ] **9.5 - Navigate to contact page**
  - Go to http://localhost:3000/contact
  - Page should load

- [ ] **9.6 - Option A: Contact form**
  - If you have contact form: verify it works
  - Should have: Name, Email, Message
  - Submitting should work (email or database)
  - **For now:** Can just store in database, no email needed

- [ ] **9.7 - Option B: Contact info**
  - If no form, just display: email address, support hours
  - Make it easy to contact you
  - Simple and clean

- [ ] **9.8 - Remove any rough edges**
  - Form fields clear and labeled
  - Submit button obvious
  - No placeholder confusion

### FAQ Page (`/faq`)

- [ ] **9.9 - Navigate to FAQ page**
  - Go to http://localhost:3000/faq
  - Page should load

- [ ] **9.10 - Add 5-10 relevant FAQs**
  - Q: "How does authentication work?"
  - Q: "Is shipping included?"
  - Q: "What if I receive a damaged item?"
  - Q: "How long does checkout take?"
  - Q: "Can I return items?"
  - Add 5-10 relevant to your marketplace
  - Keep answers concise

- [ ] **9.11 - If you built expandable FAQ**
  - Click question, answer expands (accordion)
  - Click again, answer collapses
  - Test each one works
  - If accordion broken: show all Q&As at once

### Shipping & Returns (`/shipping-returns`)

- [ ] **9.12 - Navigate to page**
  - Go to http://localhost:3000/shipping-returns
  - Page should load

- [ ] **9.13 - Add clear shipping policy**
  - How long to ship: "2-5 business days"
  - Shipping cost: "$20 domestic, $50 international"
  - Insurance: "Automatically included"
  - Tracking: "Provided with every order"

- [ ] **9.14 - Add clear returns policy**
  - Return window: "30 days"
  - Condition requirements: "Unused, in original packaging"
  - Restocking fee: "Yes/No"
  - Refund timeline: "5-10 business days"

- [ ] **9.15 - Make policies clear and scannable**
  - Use headers for different sections
  - Use bullet points
  - Easy to find important info
  - Professional legal tone (or hire a lawyer to write it)

**Static Pages Summary:**

- [ ] **9.16 - Check all static pages navigation**
  - About, Contact, FAQ, Shipping should all be accessible
  - Typically from footer navigation
  - Test: Click each one from footer, verify it loads

- [ ] **9.17 - Remove any rough edges**
  - No placeholder text anywhere
  - No "Coming Soon" badges
  - No incomplete sections
  - Professional appearance

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

# ⚙️ ADMIN PAGES (Internal Operations)

## 10. ADMIN DASHBOARD (`/admin/dashboard`)

**Purpose:** Admin oversight, key metrics

### Tasks:

- [ ] **10.1 - Admin access**
  - Must be logged in AND have admin role
  - Try accessing as regular user: should get 403 error
  - Try accessing as admin: should load dashboard
  - Command: Test both user types

- [ ] **10.2 - Navigate to admin dashboard**
  - Log in as admin user
  - Go to http://localhost:3000/admin/dashboard
  - Page should load, no 404

- [ ] **10.3 - Verify key metrics display**
  - Total products count
  - Total orders count
  - Total revenue
  - Total users
  - Command: Check numbers are correct vs database

- [ ] **10.4 - Check recent orders widget**
  - Show last 5-10 orders
  - Display: order number, customer, amount, date
  - Click order should navigate to order detail
  - Command: Complete test order, check it appears

- [ ] **10.5 - Check recent products widget**
  - Show last 5-10 products created
  - Display: product name, seller, date, status
  - Command: Create test product, check it appears

- [ ] **10.6 - If you built charts**
  - Charts should load without errors
  - Charts should display real data, not empty
  - If charts are broken: disable them for now
    ```tsx
    {/* Charts - disabled for now */}
    {/* <RevenueChart /> */}
    ```

- [ ] **10.7 - Check navigation to admin sections**
  - Sidebar/menu should have links to:
    - Products
    - Orders
    - Categories
    - Users (optional)
  - Clicking each should navigate
  - Command: Test each navigation link

- [ ] **10.8 - Verify admin can navigate away**
  - From dashboard, should be able to go to any admin page
  - From any admin page, should be able to go back to dashboard
  - Should NOT be stuck on one page

- [ ] **10.9 - Remove any rough edges**
  - No "Coming Soon" sections
  - No broken charts with errors
  - No placeholder metrics showing "0" or "N/A"
  - Professional appearance

- [ ] **10.10 - Mobile (optional)**
  - Dashboard should collapse navigation on mobile
  - Metrics should be readable
  - But if it breaks on mobile: that's OK for now (MVP can be desktop-only)

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

## 11. PRODUCT APPROVAL QUEUE (`/admin/products/queue`)

**Purpose:** Review pending products, approve/reject

### Tasks:

- [ ] **11.1 - Admin access only**
  - Regular users should NOT access this
  - Should 403 if not admin
  - Should load if admin

- [ ] **11.2 - Navigate to queue**
  - Go to http://localhost:3000/admin/products/queue
  - Page should load

- [ ] **11.3 - Verify pending products display**
  - List all products with status "PENDING"
  - Each product shows: title, seller, date submitted, category
  - Product images show (ImageKit CDN)
  - Command: Create test product with status PENDING

- [ ] **11.4 - Test approve button**
  - Click "Approve" on a product
  - Product should move from pending to live
  - Product should disappear from queue
  - Product should appear in shop
  - Command: Approve a test product, check it appears in /shop

- [ ] **11.5 - Test reject button**
  - Click "Reject" on a product
  - Should show form/modal for rejection reason
  - Enter reason: "Image quality too low"
  - Product should be rejected
  - Seller should be notified (or you manually email them)
  - Command: Reject a test product

- [ ] **11.6 - Verify approved products are hidden from queue**
  - After approving, product should not appear in queue
  - If you refresh page, product still gone from queue
  - Command: After approving, refresh page, product should be gone

- [ ] **11.7 - Verify rejected products are archived**
  - After rejecting, product should not appear in queue
  - Rejected products should be in separate view or database marked "rejected"
  - Command: Check database or "Rejected products" view

- [ ] **11.8 - If queue is empty**
  - When no pending products, show message: "No pending products"
  - Don't show blank page
  - Show link to view approved products

- [ ] **11.9 - Remove any rough edges**
  - No "Coming Soon" features
  - Approve/reject buttons obvious and clickable
  - Professional appearance

- [ ] **11.10 - Test this workflow completely**
  - 1. Create product as seller
  - 2. Check it appears in pending queue as admin
  - 3. Approve it
  - 4. Check it appears in shop
  - 5. Verify it's gone from queue
  - Command: Complete full workflow

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

## 12. PRODUCT MANAGEMENT (`/admin/categories`, product CRUD)

**Purpose:** Manage product categories and data

### Tasks:

- [ ] **12.1 - Admin access only**
  - Should 403 if not admin
  - Should load if admin

- [ ] **12.2 - Navigate to categories**
  - Go to http://localhost:3000/admin/categories
  - Page should load

- [ ] **12.3 - Verify categories display**
  - List all categories: Antique Books, Fine Art, Collectibles, Militaria
  - Each shows: name, description, product count
  - Command: Check against database

- [ ] **12.4 - If you can create categories**
  - Click "Add Category"
  - Form should appear
  - Fill in: name, description
  - Save should add to database
  - Command: Try creating a test category

- [ ] **12.5 - If you can edit categories**
  - Click "Edit" on a category
  - Should load edit form
  - Make changes, save
  - Changes should persist
  - Command: Try editing category name

- [ ] **12.6 - If you can delete categories**
  - Click "Delete" on a category
  - Should show confirmation
  - Deleting should remove from database
  - If category has products: should prevent deletion or cascade
  - Command: Try deleting a test category

- [ ] **12.7 - If any section is incomplete**
  - Hide it for now
  - Keep only what's functional
    ```tsx
    {/* Category creation - disabled for now */}
    {/* <CreateCategory /> */}
    ```

- [ ] **12.8 - Product analytics (if exists)**
  - Show which products are in each category
  - Count of products per category
  - If this section is broken: hide it

- [ ] **12.9 - Verify no errors**
  - No console errors on category page
  - Buttons are clickable
  - Forms validate properly

- [ ] **12.10 - Remove any rough edges**
  - No "Coming Soon" badges
  - All buttons functional or hidden
  - Professional appearance

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

## 13. ORDERS MANAGEMENT (`/admin/orders`)

**Purpose:** View and manage customer orders

### Tasks:

- [ ] **13.1 - Admin access only**
  - Should 403 if not admin
  - Should load if admin

- [ ] **13.2 - Navigate to orders**
  - Go to http://localhost:3000/admin/orders
  - Page should load

- [ ] **13.3 - Verify orders list**
  - Show all orders
  - Each shows: order number, customer name, total amount, date, status
  - Command: Complete a test order, check it appears

- [ ] **13.4 - Test order detail view**
  - Click on an order
  - Should load detail page: `/admin/orders/[id]`
  - Show full order info: items, shipping address, total, payment info
  - Command: Click on order, verify detail page

- [ ] **13.5 - Verify order status**
  - Order should show status: Pending, Completed, Shipped, etc.
  - Status should be accurate
  - Command: Check database for status values

- [ ] **13.6 - If you can update order status**
  - Dropdown or button to change status
  - Mark as "Shipped", "Completed", etc.
  - Status should update and persist
  - Command: Try changing order status

- [ ] **13.7 - If you can see shipping info**
  - Show tracking number (if available)
  - Show shipping address
  - Show expected delivery date
  - If incomplete: hide for now

- [ ] **13.8 - Filtering/searching (optional)**
  - Can filter by status (Pending, Completed, etc.)
  - Can search by order number or customer name
  - If broken: disable for now, just show all orders

- [ ] **13.9 - Remove any rough edges**
  - No "Coming Soon" sections
  - All displayed information is accurate
  - Status values make sense

- [ ] **13.10 - Pagination (if many orders)**
  - Show 20 orders per page
  - Add pagination controls
  - Or "Load More" button
  - Command: If you have 50+ orders, test pagination

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

## 14. ADMIN SETTINGS (`/admin/settings`)

**Purpose:** Configure admin options (optional for MVP)

### Tasks:

- [ ] **14.1 - Navigate to settings**
  - Go to http://localhost:3000/admin/settings
  - If page doesn't exist or 404: **skip this section**
  - If page exists, continue

- [ ] **14.2 - Check what settings exist**
  - Shipping settings? Email settings? General config?
  - Each setting should be functional
  - If setting doesn't work: disable it

- [ ] **14.3 - Remove incomplete settings**
  - If any settings show "Coming Soon": hide them
  - Keep only what's fully functional
  - For MVP, settings can be minimal

- [ ] **14.4 - If settings broken**
  - Hide entire settings page or entire sections
  - It's OK to skip settings for MVP
  - Can be added in future phases

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

# 🔒 FEATURES TO EXPLICITLY DISABLE

## 15. DISABLE EMAIL NOTIFICATIONS (Keep Code, Turn Off)

**Where email is called:**

- [ ] **15.1 - Find email service calls**
  - Search codebase: `grep -r "sendEmail\|sendOrderConfirmation\|sendApproval" src/`
  - Note all files that call email functions

- [ ] **15.2 - Disable email on product approval**
  - File: `src/app/api/admin/products/approve/route.ts`
  - Find: `await sendProductApproved(productId);`
  - Replace with:
    ```typescript
    // Email disabled for Phase 4
    // TODO: Enable when Google Workspace configured
    // await sendProductApproved(productId);
    console.log('Product approval email disabled (would send to:', product.seller.email, ')');
    ```

- [ ] **15.3 - Disable email on order completion**
  - File: `src/app/api/checkout/create-order/route.ts`
  - Find: `await sendOrderConfirmation(orderId);`
  - Replace with:
    ```typescript
    // Email disabled for Phase 4
    // TODO: Enable when Google Workspace configured
    // await sendOrderConfirmation(orderId);
    console.log('Order confirmation email disabled (would send to:', order.user.email, ')');
    ```

- [ ] **15.4 - Verify no email endpoints are exposed**
  - Routes like `/api/email/send` should return 503 "Not implemented"
  - Or hide from navigation
  - Command: Try calling email endpoint, should not work or show message

- [ ] **15.5 - Add env var toggle (optional)**
  - Add to `.env.local`:
    ```env
    NEXT_PUBLIC_EMAILS_ENABLED=false
    ```
  - Wrap email calls:
    ```typescript
    if (process.env.NEXT_PUBLIC_EMAILS_ENABLED === 'true') {
      await sendEmail(...);
    }
    ```

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

## 16. DISABLE ADVANCED ANALYTICS (Hide from UI, Keep Code)

**If you built advanced analytics:**

- [ ] **16.1 - Find analytics components**
  - Search: `grep -r "analytics\|Analytics\|charts\|Charts" src/app`
  - Find dashboard analytics sections

- [ ] **16.2 - Hide from admin dashboard**
  - File: `src/app/admin/dashboard/page.tsx`
  - Find: `<AdvancedCharts />` or similar
  - Replace with comment:
    ```tsx
    {/* Advanced analytics disabled for Phase 4 */}
    {/* <AdvancedCharts /> */}
    ```

- [ ] **16.3 - Keep basic metrics visible**
  - Product count: still show
  - Order count: still show
  - Revenue total: still show
  - Just hide fancy charts

- [ ] **16.4 - Hide analytics routes (optional)**
  - If you have `/admin/analytics` or `/api/admin/analytics`
  - Update to return stub response:
    ```typescript
    export async function GET(req: Request) {
      return NextResponse.json({
        status: 'disabled',
        message: 'Advanced analytics disabled for Phase 4'
      });
    }
    ```

- [ ] **16.5 - Remove from admin navigation**
  - If sidebar has "Analytics" link
  - Remove it from navigation
  - Command: Hide menu item

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

## 17. DISABLE IMAGE SYNC FROM GOOGLE DRIVE

**If you built Google Drive image sync:**

- [ ] **17.1 - Disable the sync endpoint**
  - File: `src/app/api/products/sync-from-google-drive/route.ts`
  - Replace with stub:
    ```typescript
    export async function GET(req: Request) {
      return NextResponse.json({
        status: 'disabled',
        message: 'Google Drive sync disabled. Use manual image upload in admin panel.'
      }, { status: 501 });
    }
    ```

- [ ] **17.2 - Remove from admin UI**
  - If admin has "Sync from Drive" button
  - Remove or hide it
  - Command: Hide button from admin product page

- [ ] **17.3 - Keep manual image upload**
  - Single image upload in product creation: KEEP
  - This should work and be the only way to add images

- [ ] **17.4 - Verify manual upload works**
  - When creating product, can upload 1-5 images
  - Images should upload to ImageKit CDN
  - Command: Create test product, upload image, verify it appears

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

## 18. REMOVE/HIDE INCOMPLETE FEATURES

**Check for incomplete sections:**

- [ ] **18.1 - Search for placeholders**
  - Command: `grep -r "Coming Soon\|TODO\|FIXME\|WIP\|coming\|coming soon" src/app src/lib --include="*.tsx" --include="*.ts"`
  - Delete or hide each one

- [ ] **18.2 - Remove newsletter signup**
  - If you have newsletter popup/section: delete it
  - Don't keep it disabled, just remove
  - You don't want newsletter for Phase 4

- [ ] **18.3 - Remove blog/resources**
  - If you have blog section: remove it
  - If you have resources section: remove it
  - Keep only core marketplace

- [ ] **18.4 - Remove wishlists (if incomplete)**
  - If wishlist feature exists but broken: hide it
  - Search for wishlist components, comment out

- [ ] **18.5 - Remove product reviews (if incomplete)**
  - If review section exists but no reviews: hide it
  - Command: Comment out review components

- [ ] **18.6 - Check navigation sidebar**
  - Should only show active, working pages
  - Remove links to incomplete features
  - Command: Check admin sidebar, hide incomplete items

- [ ] **18.7 - Remove placeholder images**
  - Search for placeholder image URLs
  - Replace with real images or remove
  - Command: `grep -r "placeholder\|lorem\|dummy" src/`

- [ ] **18.8 - Final cleanup sweep**
  - Go through entire codebase
  - Delete comments that say "TODO", "fix this", "revisit"
  - Clean up git history if needed
  - Command: Commit cleanup changes

**Status:** ☐ Not started | ☐ In progress | ☐ Complete

---

# 🧪 TESTING & VALIDATION

## 19. END-TO-END WORKFLOW TESTING

**Complete full user journeys:**

### Workflow 1: New Customer Journey (1 hour)

- [ ] **19.1 - Clear browser cache**
  - Open DevTools (F12)
  - Go to Application → Clear storage
  - Refresh page (Ctrl+Shift+R)

- [ ] **19.2 - Start as anonymous user**
  - Homepage should load clean
  - Should NOT be logged in
  - Command: Check no user menu or auth required

- [ ] **19.3 - Browse products**
  - Click "Browse Collection" or go to `/shop`
  - Should show 5+ products
  - Click on a product
  - Product detail should load
  - Command: Check product info complete

- [ ] **19.4 - Register new account**
  - Click "Register" or account icon
  - Fill in: name, unique email, password
  - Click register
  - Should create account
  - Command: Use unique email each test

- [ ] **19.5 - Add to cart**
  - On product detail page, click "Add to Cart"
  - Cart icon should update (show count)
  - Click cart icon
  - Product should be in cart
  - Command: Verify cart has item

- [ ] **19.6 - Complete checkout**
  - Click "Proceed to Checkout"
  - Fill in shipping info
  - Use Stripe test card: 4242 4242 4242 4242
  - Click "Pay Now"
  - Command: Should redirect to confirmation

- [ ] **19.7 - Verify order appears**
  - After payment, check order confirmation
  - Should have order number
  - Go to account page
  - Order should appear in history
  - Command: Verify order visible

- [ ] **19.8 - Check admin sees order**
  - Logout
  - Login as admin
  - Go to `/admin/orders`
  - Order should appear
  - Command: Verify admin can see it

**Status:** ☐ Complete

### Workflow 2: Seller Product Upload (45 mins)

- [ ] **19.9 - Create seller account**
  - Register new account or use existing
  - Seller role might be auto-assigned or manual

- [ ] **19.10 - Access seller/create product**
  - Navigate to product creation
  - Might be `/admin/products/create` or `/sell/create`
  - Command: Find where sellers create products

- [ ] **19.11 - Fill in product info**
  - Title: "Vintage Book - First Edition"
  - Description: detailed info
  - Price: "$150"
  - Category: select one
  - Condition: "Excellent"
  - Command: Fill all required fields

- [ ] **19.12 - Upload product image**
  - Click "Upload image"
  - Choose image file
  - Image should upload to ImageKit
  - Command: Verify upload succeeds

- [ ] **19.13 - Submit for approval**
  - Click "Submit for Approval"
  - Product should move to pending
  - Confirmation message should show
  - Command: Verify success message

- [ ] **19.14 - Check approval queue as admin**
  - Logout, login as admin
  - Go to `/admin/products/queue`
  - Product should appear in pending list
  - Command: Verify product in queue

- [ ] **19.15 - Approve product**
  - Click "Approve"
  - Product should move to live shop
  - Command: Product should disappear from queue

- [ ] **19.16 - Verify product in shop**
  - Go to `/shop` or browse
  - Product should appear
  - Click on it
  - Should show product details
  - Should have image, price, etc.
  - Command: Complete workflow verified

**Status:** ☐ Complete

### Workflow 3: Admin Dashboard (30 mins)

- [ ] **19.17 - Login as admin**
  - Use admin account
  - Navigate to `/admin/dashboard`
  - Command: Dashboard should load

- [ ] **19.18 - Verify dashboard metrics**
  - Product count should match database
  - Order count should match database
  - Revenue should match total orders
  - Command: Cross-check numbers

- [ ] **19.19 - Navigate all admin pages**
  - Click Products link: `/admin/products/queue` loads
  - Click Orders link: `/admin/orders` loads
  - Click Categories link: `/admin/categories` loads
  - Click Settings link: `/admin/settings` loads (if exists)
  - Command: All pages should load

- [ ] **19.20 - No console errors**
  - Open DevTools console (F12)
  - Navigate through admin
  - Should have NO red errors
  - Command: Check console is clean

**Status:** ☐ Complete

---

## 20. DEVICE & BROWSER TESTING

**Test on different devices:**

- [ ] **20.1 - Desktop Chrome**
  - Full user flow
  - All pages should work
  - No layout issues

- [ ] **20.2 - Mobile (DevTools simulator)**
  - DevTools → Toggle device toolbar (Ctrl+Shift+M)
  - Test: iPhone 12, iPhone SE, Android
  - All pages should be readable
  - Buttons should be tappable
  - Command: Test full workflow on mobile

- [ ] **20.3 - Tablet (iPad simulator)**
  - DevTools → Toggle device toolbar
  - Select iPad
  - Layout should adapt
  - Command: Browse shop on tablet

- [ ] **20.4 - Different browsers (if time)**
  - Firefox: test key pages
  - Safari: test key pages
  - Edge: test key pages
  - Or just test Chrome thoroughly

- [ ] **20.5 - Mobile network (if time)**
  - DevTools → Network tab
  - Slow 3G: test checkout flow
  - Should still work, just slower
  - Command: Test payment on slow network

**Status:** ☐ Complete

---

## 21. CONSOLE ERROR CHECK

**Zero console errors:**

- [ ] **21.1 - Open DevTools console**
  - Press F12
  - Click "Console" tab
  - Refresh page (Ctrl+R)

- [ ] **21.2 - Homepage**
  - Navigate to `/`
  - Console should be CLEAN (no red errors)
  - Warnings OK, errors NOT OK
  - Command: Check console

- [ ] **21.3 - Shop page**
  - Go to `/shop`
  - Console should be CLEAN
  - Command: No errors

- [ ] **21.4 - Product detail**
  - Go to product page
  - Console should be CLEAN
  - Command: No errors

- [ ] **21.5 - Checkout**
  - Go through full checkout
  - Console should be CLEAN
  - Stripe might show some warnings (that's OK)
  - Command: No red errors

- [ ] **21.6 - Admin pages**
  - Admin dashboard, orders, products
  - Console should be CLEAN
  - Command: No errors

- [ ] **21.7 - Fix any errors found**
  - If red errors found, note them
  - Fix each one before moving to deploy
  - Command: Commit error fixes

**Status:** ☐ Complete

---

## 22. PERFORMANCE CHECK

**Basic performance validation:**

- [ ] **22.1 - Page load times**
  - DevTools → Network tab
  - Homepage should load in <2s
  - Shop should load in <2s
  - Product detail <2s
  - Checkout <2s
  - Command: Check each page load time

- [ ] **22.2 - Image optimization**
  - Images should be optimized (ImageKit CDN)
  - Images should not be > 500KB
  - Should load quickly
  - Command: Check Network tab, look at image sizes

- [ ] **22.3 - Stripe loads quickly**
  - Stripe payment form should appear in <1s
  - Should not make checkout slow
  - Command: Monitor Network tab during checkout

- [ ] **22.4 - Database queries**
  - Shop page shouldn't make >5 database queries
  - Product detail shouldn't make >3 queries
  - Command: Check your database logs or Next.js dev terminal

- [ ] **22.5 - If anything is slow**
  - Stripe form slow: probably Stripe's issue, OK for MVP
  - Shop slow: might need to paginate products
  - Database slow: might need to cache, but OK for MVP traffic
  - Don't optimize yet, just note issues

**Status:** ☐ Complete

---

# 📦 DEPLOYMENT PREPARATION

## 23. DATABASE CLEANUP

**Final database check:**

- [ ] **23.1 - Remove test data**
  - Delete any test products: "Test Product", "Sample", etc.
  - Delete any test orders
  - Keep only real data
  - Command:
    ```sql
    DELETE FROM "Product" WHERE title LIKE '%test%' OR title LIKE '%sample%';
    ```

- [ ] **23.2 - Verify admin user exists**
  - Should have at least one user with role = 'ADMIN'
  - Admin email and password should be secure
  - Command: 
    ```sql
    SELECT email, role FROM "User" WHERE role = 'ADMIN';
    ```

- [ ] **23.3 - Verify categories exist**
  - Should have 4 product categories
  - Antique Books, Fine Art, Collectibles, Militaria
  - Command:
    ```sql
    SELECT name FROM "Category";
    ```

- [ ] **23.4 - Check for orphaned data**
  - No orders without customers
  - No products without categories
  - No orphaned images
  - Clean up if found

**Status:** ☐ Complete

---

## 24. ENVIRONMENT VARIABLES

**Final .env setup:**

- [ ] **24.1 - Verify .env.local complete**
  - All required vars populated
  - No placeholder values like "YOUR_KEY_HERE"
  - Stripe keys, database URL, NextAuth secret all set
  - Command: `cat .env.local` (don't paste in chat)

- [ ] **24.2 - Verify .env is NOT committed**
  - `.env.local` should NOT be in git
  - Should be in `.gitignore`
  - Command: `git status` (should not show .env.local)

- [ ] **24.3 - Update .env.example**
  - File: `.env.example`
  - Should have all var names, no actual values
  - Example:
    ```env
    DATABASE_URL=postgresql://user:password@host/db
    STRIPE_SECRET_KEY=sk_live_...
    ```
  - Command: Verify .env.example looks good

- [ ] **24.4 - Set EMAILS_ENABLED to false (for now)**
  - In `.env.local`:
    ```env
    NEXT_PUBLIC_EMAILS_ENABLED=false
    ```
  - Command: Verify this line exists

- [ ] **24.5 - For production**
  - When deploying to Vercel:
    - Set all env vars in Vercel dashboard
    - DATABASE_URL, STRIPE keys, etc.
    - NOT committing .env.local
  - Command: Make note to set in Vercel after push

**Status:** ☐ Complete

---

## 25. FINAL BUILD & COMMIT

**Get ready to deploy:**

- [ ] **25.1 - Clean build locally**
  - Command:
    ```powershell
    rm -r .next node_modules
    bun install --frozen-lockfile
    bun run build
    ```
  - Should succeed with: ✓ Compiled successfully

- [ ] **25.2 - No build warnings**
  - Build should complete
  - Warnings about unused code: OK to ignore
  - Errors: NOT OK, must fix before deploy

- [ ] **25.3 - Start dev server**
  - Command: `bun run dev`
  - Should start without errors
  - Should be accessible at http://localhost:3000

- [ ] **25.4 - Git status check**
  - Command: `git status`
  - Should show files you changed/added
  - .env.local should NOT be shown (in .gitignore)
  - Should be CLEAN (no uncommitted changes)

- [ ] **25.5 - Git add & commit**
  - Command:
    ```powershell
    git add .
    git commit -m "Phase 4: Polish & launch - disable email/analytics, cleanup pages"
    ```

- [ ] **25.6 - Git push**
  - Command: `git push origin main`
  - Should push to GitHub
  - Should NOT have conflicts

- [ ] **25.7 - Verify git history**
  - Command: `git log --oneline` (last 5 commits)
  - Should see your commit message
  - Should show clean history

**Status:** ☐ Complete

---

## 26. FINAL CHECKLIST BEFORE DEPLOYMENT

**One last review:**

- [ ] ✅ All public pages clean and functional
- [ ] ✅ All admin pages working
- [ ] ✅ End-to-end workflows tested (customer, seller, admin)
- [ ] ✅ No console errors on any page
- [ ] ✅ Mobile responsive (checked on device simulator)
- [ ] ✅ Database cleaned of test data
- [ ] ✅ Admin user exists and can access dashboard
- [ ] ✅ Product approval workflow works
- [ ] ✅ Shopping/checkout workflow works
- [ ] ✅ Authentication works (register, login, logout)
- [ ] ✅ All links functional and not 404
- [ ] ✅ Images load quickly (ImageKit CDN)
- [ ] ✅ Stripe payment processes successfully
- [ ] ✅ Email notifications disabled (logged as TODO)
- [ ] ✅ Advanced analytics hidden
- [ ] ✅ Image sync from Drive disabled
- [ ] ✅ No "Coming Soon" badges visible
- [ ] ✅ Newsletter removed
- [ ] ✅ Blog/resources removed (if incomplete)
- [ ] ✅ .env.local populated with all keys
- [ ] ✅ .env.local NOT committed to git
- [ ] ✅ .env.example updated (no secrets)
- [ ] ✅ Final build succeeds: `bun run build` ✓
- [ ] ✅ Dev server starts: `bun run dev` ✓
- [ ] ✅ Git history clean and pushed
- [ ] ✅ Ready to deploy to Vercel

**Status:** ☐ All complete, ready to deploy

---

# 🚀 DEPLOY TO VERCEL

**Once everything above is done:**

- [ ] **26.1 - Vercel auto-deploys**
  - Push to GitHub: `git push origin main`
  - Vercel should automatically deploy
  - Check Vercel dashboard for build status

- [ ] **26.2 - Set environment variables in Vercel**
  - Vercel dashboard → Settings → Environment Variables
  - Add all vars from .env.local (except don't duplicate secret keys)
  - Save

- [ ] **26.3 - Wait for deployment**
  - Should take 3-5 minutes
  - Check Vercel dashboard for completion

- [ ] **26.4 - Test production URL**
  - Visit your production URL: https://your-domain.vercel.app
  - Homepage should load
  - Click through key pages
  - Test one full workflow

- [ ] **26.5 - Check production build successful**
  - Vercel dashboard should show ✓
  - No errors or warnings
  - URL accessible

**Status:** ☐ Live on Vercel!

---

# 📊 CLEANUP COMPLETION SUMMARY

**Track your progress:**

| Section | Total Items | Completed | Status |
|---------|-------------|-----------|--------|
| 1. Homepage | 8 | | ☐ |
| 2. Product Catalog | 10 | | ☐ |
| 3. Product Detail | 10 | | ☐ |
| 4. Shopping Cart | 10 | | ☐ |
| 5. Checkout | 11 | | ☐ |
| 6. Register | 10 | | ☐ |
| 7. Login | 10 | | ☐ |
| 8. Account | 10 | | ☐ |
| 9. Static Pages | 17 | | ☐ |
| 10. Admin Dashboard | 10 | | ☐ |
| 11. Approval Queue | 10 | | ☐ |
| 12. Product Management | 10 | | ☐ |
| 13. Orders | 10 | | ☐ |
| 14. Admin Settings | 4 | | ☐ |
| 15. Disable Email | 5 | | ☐ |
| 16. Disable Analytics | 5 | | ☐ |
| 17. Disable Image Sync | 4 | | ☐ |
| 18. Remove Incomplete | 8 | | ☐ |
| 19. E2E Testing | 20 | | ☐ |
| 20. Device Testing | 5 | | ☐ |
| 21. Console Errors | 7 | | ☐ |
| 22. Performance | 5 | | ☐ |
| 23. Database Cleanup | 4 | | ☐ |
| 24. Environment Vars | 5 | | ☐ |
| 25. Build & Commit | 7 | | ☐ |
| 26. Pre-Deploy | 26 | | ☐ |
| **TOTAL** | **242** | | |

**Estimated completion time: 1-2 weeks part-time (20-30 hours)**

---

**Ready to start? Begin with Section 1 (Homepage) and work through systematically. Check off each item as you complete it.**

**Print this document or keep it open in a second window while you work!**
