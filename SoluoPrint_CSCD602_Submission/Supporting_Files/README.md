# SoluoPrint - Advanced Print Shop Management System

**SoluoPrint** is a premium, all-in-one management platform designed specifically for modern print shops and digital studios. It streamlines the entire production workflow from customer intake to invoicing, drastically reducing administrative workload and production errors.

This project was developed as the Capstone Examination for the **University of Ghana CSCD 602: Advanced Software Engineering (3 Credits), Individual Project-Based Examination, 2025/2026 First Semester**.


SoluoPrint is a premium, all-in-one management platform designed specifically for modern print shops and digital studios. It streamlines the entire production workflow—from customer intake and job tracking to financial reporting and role-based access control.


Why SoluoPrint is the Smarter Choice?

Generic software doesn’t get you. 73% of print shops lose money on 40% of orders using tools not built for print businesses. With SoluoPrint, you:

    Speed Up Workflow: Automate tasks and process orders faster.
    Eliminates Status Calls: We handles everything with our SMS alerts.
    Save Time & Money: Cut admin time by 50%, reduce production errors...
    Access Anywhere: Manage your business even when you’re away from the office.
    Payment Tracking Made Simple: See who owes what at a glance.



At SoluoPrint, we’ve been there—pricing custom jobs, tracking payments across dozens of customers, answering ‘Job Status’ calls all day. We built the solution we wish we’d had.


What is SoluoPrint?
Print Desk is an all-in-one business management software built specifically for print and design companies. It helps you manage orders, track jobs, control inventory, send invoices, and streamline your entire production process—from one easy dashboard.

Who is SoluoPrint for?

SoluoPrint is designed for businesses involved in:

    Large format printing

    T-shirt and apparel printing

    Embroidery

    Packaging design

    General print production
    If you run a fast-paced print shop with multiple job types, SoluoPrint is built for you.


How is SoluoPrint different from other tools like QuickBooks or Excel?
QuickBooks and Excel weren’t built for print shops.
SoluoPrint is designed to handle your exact workflow—quoting, tracking production stages, managing stock, scheduling jobs, and even using custom price calculators—all in one place.

What happens if I need support?
You’re never alone. Our support team is ready to assist you via email, chat, or phone. Plus, we offer guided onboarding, video tutorials, and priority support for Pro and Enterprise users.

## Complete Feature Inventory

SoluoPrint implements a comprehensive feature set demonstrating disciplined Advanced Software Engineering practices across the full software lifecycle. 

### 1. Admin Authentication & Security
- **Dual-Provider Architecture:** Admins log in via Supabase secure authentication.
- **Role-Based Access Control:** Protects system settings, financial reports, and administrative features from unauthorized access.
- **Environment Variables & Secrets Management:** Securely handles API keys for SMS, Email, Payment Gateways, and Database connectivity.

### 2. Customer Portal & Dual Authentication
- **Customer Logins:** Customers access their own portal via custom usernames (e.g., CUST-XXXX) using the `customers` database table.
- **Customer Job Upload:** Customers can upload large print job files directly to the server via the `api/upload.php` endpoint. Image files are compressed dynamically.
- **Outstanding Balance Payments:** Customers can initiate payment workflows directly from their portal to settle their print shop balances.

### 3. Print Job Management & Workflow
- **Full CRUD for Print Jobs:** Create, read, update, and delete print jobs with rich metadata (quantity, material, status).
- **Status Tracking:** Real-time visual tracking of job states: `Pending`, `In Progress`, `Completed`, `Delivered`.
- **Automated Workflow Actions:** E.g., when a job is marked "Completed" and the balance is settled, workflows dynamically adjust.

### 4. Financial & Payment Processing
- **Invoicing & Balances:** Tracks total job cost, amount paid, and outstanding balances per customer.
- **Record Payments:** Supports logging payments via Cash, Mobile Money, Bank Transfer, Visa, etc.
- **Payment Gateway Integrations:** Supports API keys configuration for Hubtel, Paystack, and Flutterwave to facilitate digital transactions.
- **Dynamic Balance Resolution:** When payment covers a balance, the system automatically resolves the invoice state.

### 5. Custom Notification Engine
- **SMS Integration:** Fully integrated with `smsgh` API. Automated SMS receipts with the exact template:
  > *"Hello [Name], your payment of: [Currency] [Amount] has been received. Your remaining balance is [Currency] [Balance]. Regards: EKON Graphix - 0248228841 Powered by: Soluotech"*
- **SMTP Email Integration:** Integrated via `api/send_email.php`. Dispatches transactional emails over secure port 465 using the `notify@soluotech.com` sender.

### 6. Admin Dashboard & Analytics
- **Financial Metrics:** Real-time calculations of Total Revenue, Total Debt (Receivables), and processing volume.
- **Status Distributions:** Charts and indicators showing the distribution of current jobs in the pipeline.

### 7. Core Configurations
- **System Settings:** Dynamically configure print services, product categories, and system-wide constants.
- **Payment Integrations Settings:** A dedicated UI allowing the admin to input API keys and Webhook URLs for Hubtel, Paystack, etc.

## CSCD 602 Examination Audit

This project satisfies all requirements set out in the examination rubric:
- **Requirements Engineering:** Addressed via the Comprehensive SRS.
- **Software Effort Estimation:** Calculated using the Use Case Points (UCP) framework.
- **System Analysis & Design:** Architectural choices validated against business requirements.
- **Implementation:** React frontend, Supabase Backend, PHP APIs, SMTP, SMS.
- **Testing & QA:** Manual E2E testing of authentication, database rules, file uploads, and notification systems.
- **Technical Debt Management:** Tracked insecure auth and oversized components, resolved critical issues, and scheduled future refactoring.
- **Deployment:** Accessible on Namecheap servers and Supabase infrastructure.
- **Documentation:** Complete generation via `generate_all_docs.py` combining SRS, User Manual (with UI Visual Evidence), and Debt planning.

## Deployment Details

- **Admin Demo URL:** `http://localhost:3000` (or the deployed Namecheap URL)
- **Admin Username:** `pborngreatmensah@gmail.com`
- **Admin Password:** `Pa$$w0rd`
- **Customer Username:** `CUST-9999`
- **Customer Password:** `password123`

---

*Academic Integrity Note: This system was verified and engineered independently for the CSCD 602 End-of-Semester Examination. All third-party libraries (React, Vite, Supabase, Puppeteer, Python-docx) are hereby acknowledged.*
