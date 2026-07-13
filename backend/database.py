import sqlite3
import os
from datetime import datetime, timedelta
import random
import bcrypt

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "omnisense.db")
if os.environ.get("VERCEL"):
    tmp_db = "/tmp/omnisense.db"
    if not os.path.exists(tmp_db):
        import shutil
        if os.path.exists(DB_PATH):
            try:
                shutil.copy(DB_PATH, tmp_db)
            except Exception as e:
                print(f"[DATABASE] Error copying database to /tmp: {e}")
    DB_PATH = tmp_db

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Bcrypt Password Hashing
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(stored_password: str, provided_password: str) -> bool:
    try:
        return bcrypt.checkpw(provided_password.encode('utf-8'), stored_password.encode('utf-8'))
    except Exception:
        return False

def init_db(force: bool = False):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if database is already initialized
    if not force:
        try:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Users'")
            if cursor.fetchone():
                conn.close()
                return
        except Exception:
            pass
            
    # Drop tables to force fresh migration
    cursor.execute("DROP TABLE IF EXISTS Users")
    cursor.execute("DROP TABLE IF EXISTS Roles")
    cursor.execute("DROP TABLE IF EXISTS Permissions")
    cursor.execute("DROP TABLE IF EXISTS role_permissions")
    cursor.execute("DROP TABLE IF EXISTS Branches")
    cursor.execute("DROP TABLE IF EXISTS Departments")
    cursor.execute("DROP TABLE IF EXISTS audit_logs")
    cursor.execute("DROP TABLE IF EXISTS LoginHistory")
    cursor.execute("DROP TABLE IF EXISTS Notifications")
    cursor.execute("DROP TABLE IF EXISTS budgets")
    cursor.execute("DROP TABLE IF EXISTS savings_goals")
    cursor.execute("DROP TABLE IF EXISTS customers")
    cursor.execute("DROP TABLE IF EXISTS transactions")
    cursor.execute("DROP TABLE IF EXISTS loan_applications")
    cursor.execute("DROP TABLE IF EXISTS support_tickets")
    cursor.execute("DROP TABLE IF EXISTS analysis_history")
    cursor.execute("DROP TABLE IF EXISTS agent_memory")
    cursor.execute("DROP TABLE IF EXISTS document_vault")
    
    # 1. Create Branches Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Branches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT
    )
    """)
    
    # 2. Create Departments Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        branch_id TEXT,
        FOREIGN KEY (branch_id) REFERENCES Branches(id) ON DELETE CASCADE
    )
    """)
    
    # 3. Create Roles Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT
    )
    """)
    
    # 4. Create Permissions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT
    )
    """)
    
    # 5. Create Role Permissions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER,
        permission_id INTEGER,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES Roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES Permissions(id) ON DELETE CASCADE
    )
    """)
    
    # 6. Create Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT NOT NULL,
        branch_id TEXT,
        department TEXT,
        status TEXT DEFAULT 'Active',
        profile_picture TEXT,
        last_login TEXT,
        is_verified INTEGER DEFAULT 0,
        verification_token TEXT,
        reset_token TEXT,
        reset_expires TEXT,
        remember_token TEXT,
        token_version INTEGER DEFAULT 1,
        phone_number TEXT,
        mfa_secret TEXT,
        login_ip TEXT,
        failed_attempts INTEGER DEFAULT 0,
        locked_until TEXT,
        FOREIGN KEY (branch_id) REFERENCES Branches(id)
    )
    """)
    
    # 7. Create Customers Table (highly normalized with KYC and relationship data)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        income REAL DEFAULT 0,
        savings REAL DEFAULT 0,
        expenses REAL DEFAULT 0,
        credit_score INTEGER DEFAULT 600,
        debt REAL DEFAULT 0,
        branch_id TEXT,
        pan_number TEXT,
        aadhaar_number TEXT,
        gstin TEXT,
        directors_json TEXT,
        companies_json TEXT,
        shared_phone TEXT,
        shared_address TEXT,
        assets_json TEXT,
        liabilities_json TEXT,
        credit_bureau_score INTEGER,
        employment_status TEXT,
        business_revenue REAL,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
    """)
    
    # 8. Create Transactions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        amount REAL NOT NULL,
        type TEXT NOT NULL, -- 'credit', 'debit'
        category TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        is_suspicious INTEGER DEFAULT 0,
        description TEXT,
        branch_id TEXT,
        ip_address TEXT,
        location_coords TEXT,
        device_id TEXT,
        receiver_account TEXT,
        aml_flag INTEGER DEFAULT 0,
        pep_screening_status TEXT DEFAULT 'clean',
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
    """)

    # 9. Create Loan Applications Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS loan_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        amount REAL NOT NULL,
        term_months INTEGER NOT NULL,
        purpose TEXT NOT NULL,
        status TEXT DEFAULT 'pending', -- stages: 'application', 'doc_verification', 'kyc', 'risk', 'fraud', 'credit', 'manager_review', 'regional_review', 'approved', 'disbursed', 'monitoring', 'closure', 'restructured'
        created_at TEXT NOT NULL,
        assigned_officer_id INTEGER,
        digital_signature_hash TEXT,
        repayment_history_json TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
    """)

    # 10. Create Support Tickets Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS support_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
    """)

    # 11. Create Audit Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        status TEXT NOT NULL
    )
    """)
    
    # 12. Create Login History Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS LoginHistory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        ip_address TEXT,
        browser TEXT,
        status TEXT NOT NULL,
        failure_reason TEXT,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL
    )
    """)
    
    # 13. Create Notifications Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS Notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        type TEXT,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
    """)
    
    # 14. Create Analysis History Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS analysis_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        corporate_id TEXT NOT NULL,
        corporate_name TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        tier TEXT NOT NULL,
        default_probability REAL NOT NULL,
        anomaly_detected INTEGER NOT NULL,
        agent_logs TEXT,
        shap_contributions TEXT
    )
    """)
    
    # 15. Create Budgets Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS budgets (
        user_id INTEGER PRIMARY KEY,
        allocated REAL NOT NULL,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
    """)
    
    # 16. Create Savings Goals Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS savings_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        target REAL NOT NULL,
        current REAL DEFAULT 0,
        deadline TEXT,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
    """)
    
    # 17. Create Agent Memory Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS agent_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        session_id TEXT,
        memory_type TEXT,
        context_key TEXT,
        context_value TEXT,
        updated_at TEXT,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
    """)
    
    # 18. Create Document Vault Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS document_vault (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        filename TEXT NOT NULL,
        file_type TEXT,
        file_size INTEGER,
        ocr_raw_text TEXT,
        extracted_entities_json TEXT,
        verification_status TEXT DEFAULT 'Pending',
        compliance_score REAL DEFAULT 100.0,
        anomalies_found_json TEXT,
        uploaded_at TEXT,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    )
    """)
    
    conn.commit()
    
    # Seed Branches
    branches_data = [
        ("Mumbai-North", "Mumbai North Branch", "Mumbai, Maharashtra"),
        ("Delhi-Central", "Delhi Central Branch", "Connaught Place, New Delhi"),
        ("Bangalore-East", "Bangalore East Branch", "Indiranagar, Bengaluru"),
    ]
    cursor.executemany("INSERT INTO Branches (id, name, location) VALUES (?, ?, ?)", branches_data)
    
    # Seed Departments
    departments_data = [
        ("Retail Lending", "Mumbai-North"),
        ("Fraud & Compliance", "Mumbai-North"),
        ("Corporate Finance", "Mumbai-North"),
        ("IT Operations", "Mumbai-North"),
        ("Customer Support", "Mumbai-North"),
        ("Executive Management", "Mumbai-North"),
    ]
    cursor.executemany("INSERT INTO Departments (name, branch_id) VALUES (?, ?)", departments_data)
    
    # Seed Roles
    roles_data = [
        ("Super Admin", "Full platform access and database controls"),
        ("Bank Administrator", "General administrative and monitoring controls"),
        ("Branch Manager", "Manages local branch performance, approvals, and performance metrics"),
        ("Financial Analyst", "Runs reports, forecast models, and revenue projections"),
        ("Credit Analyst", "Performs detailed risk review, loan stress-testing and rating analysis"),
        ("Fraud Analyst", "Monitors suspicious activities, AML flags, and freezes accounts"),
        ("Compliance Officer", "Responsible for PEP checks, SAR logs, and KYC compliance"),
        ("Loan Officer", "Reviews loan applications, verifies documents and schedules restructurings"),
        ("Recovery Officer", "Coordinates collection cycles and restructuring default mitigation"),
        ("Executive Management", "Access to executive summaries, portfolio trends, and macros scenario simulations"),
        ("Customer Support", "Manages ticketing systems and resets customer passwords"),
        ("Customer", "General banking user checking balances and transaction reports"),
    ]
    cursor.executemany("INSERT INTO Roles (name, description) VALUES (?, ?)", roles_data)
    
    # Seed Permissions
    permissions_data = [
        ("full_access", "Access to system settings and database"),
        ("view_audit_logs", "View administrative audit logs"),
        ("run_analysis", "Initiate tri-agent credit scans"),
        ("restructure_loan", "Configure interest rate reduction and emi restructuring"),
        ("view_loans", "Retrieve general lending database list"),
        ("apply_loan", "Submit customer loan requests"),
        ("view_support_tickets", "View open and closed support ticket queues"),
        ("create_support_ticket", "Submit issue tickets"),
        ("view_suspicious_transactions", "Access fraud analyst alert boards"),
        ("view_system_health", "Query server status and active socket connection pools"),
        ("manage_users", "Change roles, suspend/activate accounts"),
        ("manage_branches", "Create and delete branches and departments"),
    ]
    cursor.executemany("INSERT INTO Permissions (name, description) VALUES (?, ?)", permissions_data)
    conn.commit()
    
    cursor.execute("SELECT id, name FROM Roles")
    roles_map = {row["name"]: row["id"] for row in cursor.fetchall()}
    
    cursor.execute("SELECT id, name FROM Permissions")
    perms_map = {row["name"]: row["id"] for row in cursor.fetchall()}
    
    def map_perm(role_name, perm_name):
        cursor.execute("INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)", 
                       (roles_map[role_name], perms_map[perm_name]))
                       
    # Map Super Admin
    map_perm("Super Admin", "full_access")
    map_perm("Super Admin", "view_system_health")
    map_perm("Super Admin", "manage_users")
    map_perm("Super Admin", "manage_branches")
    map_perm("Super Admin", "view_audit_logs")
    
    # Map Bank Admin
    for p in ["view_audit_logs", "run_analysis", "restructure_loan", "view_loans", "view_support_tickets", "view_suspicious_transactions", "view_system_health"]:
        map_perm("Bank Administrator", p)
        
    # Map Branch Manager
    for p in ["run_analysis", "restructure_loan", "view_loans", "view_support_tickets", "view_suspicious_transactions"]:
        map_perm("Branch Manager", p)
        
    # Map Financial Analyst
    for p in ["run_analysis", "view_loans"]:
        map_perm("Financial Analyst", p)
        
    # Map Credit Analyst
    for p in ["run_analysis", "view_loans"]:
        map_perm("Credit Analyst", p)
        
    # Map Fraud Analyst
    for p in ["view_suspicious_transactions"]:
        map_perm("Fraud Analyst", p)
        
    # Map Compliance Officer
    for p in ["view_suspicious_transactions", "view_audit_logs"]:
        map_perm("Compliance Officer", p)
        
    # Map Loan Officer
    for p in ["restructure_loan", "view_loans"]:
        map_perm("Loan Officer", p)

    # Map Recovery Officer
    for p in ["restructure_loan", "view_loans"]:
        map_perm("Recovery Officer", p)
        
    # Map Executive Management
    for p in ["view_loans", "view_system_health", "view_audit_logs"]:
        map_perm("Executive Management", p)
        
    # Map Customer Support
    for p in ["view_support_tickets"]:
        map_perm("Customer Support", p)
        
    # Map Customer
    for p in ["view_loans", "apply_loan", "view_support_tickets", "create_support_ticket"]:
        map_perm("Customer", p)
        
    conn.commit()
    
    # Seed preloaded Users
    default_users = [
        ("admin@omnisense.com", "Super Admin", "Super Admin", "Mumbai-North", "IT Operations", "https://api.dicebear.com/7.x/bottts/svg?seed=admin"),
        ("bankadmin@omnisense.com", "Bank Administrator", "Bank Admin", "Mumbai-North", "IT Operations", "https://api.dicebear.com/7.x/bottts/svg?seed=bankadmin"),
        ("branchmgr@omnisense.com", "Branch Manager", "Branch Manager", "Mumbai-North", "Retail Lending", "https://api.dicebear.com/7.x/bottts/svg?seed=branchmgr"),
        ("finanalyst@omnisense.com", "Financial Analyst", "Financial Analyst", "Mumbai-North", "Corporate Finance", "https://api.dicebear.com/7.x/bottts/svg?seed=finanalyst"),
        ("fraudanalyst@omnisense.com", "Fraud Analyst", "Fraud Analyst", "Mumbai-North", "Fraud & Compliance", "https://api.dicebear.com/7.x/bottts/svg?seed=fraudanalyst"),
        ("loanofficer@omnisense.com", "Loan Officer", "Loan Officer", "Mumbai-North", "Retail Lending", "https://api.dicebear.com/7.x/bottts/svg?seed=loanofficer"),
        ("support@omnisense.com", "Customer Support", "Customer Support", "Mumbai-North", "Customer Support", "https://api.dicebear.com/7.x/bottts/svg?seed=support"),
        ("customer@omnisense.com", "Customer", "Madhu Meeta", "Mumbai-North", "Retail Lending", "https://api.dicebear.com/7.x/bottts/svg?seed=customer"),
        ("creditanalyst@omnisense.com", "Credit Analyst", "Credit Analyst", "Mumbai-North", "Corporate Finance", "https://api.dicebear.com/7.x/bottts/svg?seed=creditanalyst"),
        ("recoveryofficer@omnisense.com", "Recovery Officer", "Recovery Officer", "Mumbai-North", "Retail Lending", "https://api.dicebear.com/7.x/bottts/svg?seed=recovery"),
        ("regionalmgr@omnisense.com", "Regional Manager", "Regional Manager", "Mumbai-North", "Retail Lending", "https://api.dicebear.com/7.x/bottts/svg?seed=regional"),
        ("complianceofficer@omnisense.com", "Compliance Officer", "Compliance Officer", "Mumbai-North", "Fraud & Compliance", "https://api.dicebear.com/7.x/bottts/svg?seed=compliance"),
        ("executive@omnisense.com", "Executive Management", "Executive Management", "Mumbai-North", "Executive Management", "https://api.dicebear.com/7.x/bottts/svg?seed=executive")
    ]
    
    passwords = {
        "admin@omnisense.com": "admin123",
        "bankadmin@omnisense.com": "bankadmin123",
        "branchmgr@omnisense.com": "branchmgr123",
        "finanalyst@omnisense.com": "finanalyst123",
        "fraudanalyst@omnisense.com": "fraudanalyst123",
        "loanofficer@omnisense.com": "loanofficer123",
        "support@omnisense.com": "support123",
        "customer@omnisense.com": "customer123",
        "creditanalyst@omnisense.com": "creditanalyst123",
        "recoveryofficer@omnisense.com": "recoveryofficer123",
        "regionalmgr@omnisense.com": "regionalmgr123",
        "complianceofficer@omnisense.com": "complianceofficer123",
        "executive@omnisense.com": "executive123"
    }

    import json
    for email, role, name, branch_id, department, profile_picture in default_users:
        hashed = hash_password(passwords[email])
        cursor.execute(
            """
            INSERT INTO Users 
            (email, password, role, name, branch_id, department, status, profile_picture, last_login, is_verified, phone_number, mfa_secret) 
            VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, ?, 1, ?, 'MFASECRET123')
            """,
            (email, hashed, role, name, branch_id, department, profile_picture, datetime.utcnow().isoformat(), "+919876543210")
        )
        user_id = cursor.lastrowid
        
        # Seed Customer details
        if role == "Customer":
            directors = [{"name": "Madhu Meeta", "din": "01234567"}, {"name": "Balaji Prasad", "din": "07654321"}]
            companies = [{"name": "Balaji Components Ltd", "cin": "L27100MH1999PLC123456"}]
            assets = [
                {"type": "Industrial Factory Facility", "valuation": 45000000.0, "ltv": 0.65},
                {"type": "Finished Component Stockpile", "valuation": 15000000.0, "ltv": 0.40}
            ]
            liabilities = [
                {"type": "Working Capital Term Loan", "outstanding": 25000000.0, "bank": "IDBI Bank"},
                {"type": "Logistics Equipment Lease", "outstanding": 5000000.0, "bank": "HDFC Bank"}
            ]
            cursor.execute(
                """
                INSERT INTO customers 
                (user_id, income, savings, expenses, credit_score, debt, branch_id, pan_number, aadhaar_number, gstin, directors_json, companies_json, shared_phone, shared_address, assets_json, liabilities_json, credit_bureau_score, employment_status, business_revenue) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id, 
                    12000000.0, # Annual Business Income
                    5000000.0, 
                    4500000.0, 
                    780, 
                    30000000.0, 
                    branch_id,
                    "ABCDE1234F",
                    "123456789012",
                    "27AAACB1234F1Z5",
                    json.dumps(directors),
                    json.dumps(companies),
                    "+919876543210", # Matches shared phone indicators in fraud connections
                    "Plot 42, MIDC Industrial Area, Thane, Mumbai",
                    json.dumps(assets),
                    json.dumps(liabilities),
                    780,
                    "Self-Employed / Business",
                    85000000.0 # Annual Business Revenue
                )
            )
            cust_id = cursor.lastrowid
            cursor.execute("INSERT INTO budgets (user_id, allocated) VALUES (?, ?)", (user_id, 500000.0))
            goals_data = [
                (user_id, "Operations Down Payment", 10000000.0, 4000000.0, "2026-12-31"),
                (user_id, "Reserve Capital Buffer", 5000000.0, 2500000.0, "2027-06-30")
            ]
            cursor.executemany("INSERT INTO savings_goals (user_id, title, target, current, deadline) VALUES (?, ?, ?, ?, ?)", goals_data)
            
            notifications_data = [
                (user_id, "Suspicious Transaction Alert", "A high-value wire of ₹9,50,000.00 was flagged for AML review.", 0, datetime.utcnow().isoformat(), "warning"),
                (user_id, "Welcome to Omni Sense", "Your tiered credit intelligence account is fully active.", 1, datetime.utcnow().isoformat(), "info")
            ]
            cursor.executemany("INSERT INTO Notifications (user_id, title, message, is_read, created_at, type) VALUES (?, ?, ?, ?, ?, ?)", notifications_data)
            
    conn.commit()
    
    # Prepopulate seed data for Transactions, Loan applications, Support tickets if empty
    cursor.execute("SELECT count(*) FROM transactions")
    if cursor.fetchone()[0] == 0:
        cursor.execute("SELECT id FROM Users WHERE email = 'customer@omnisense.com'")
        cust_row = cursor.fetchone()
        cust_user_id = cust_row["id"] if cust_row else 8
        
        # Generate transactions
        categories = ["Salary Deposit", "Logistics Fuel", "Raw Materials", "Utility Bills", "Receivables Clearing", "Equipment Lease", "Software SaaS", "Travel & Lodging", "Marketing Ads", "Legal Fees"]
        descriptions = {
            "Salary Deposit": "Monthly payroll deposit from corporate account",
            "Logistics Fuel": "Fleet logistics fuel replenishment card #",
            "Raw Materials": "Purchased copper scrap/metal batch cargo",
            "Utility Bills": "Settled grid electrical consumption balance",
            "Receivables Clearing": "Cleared outstanding client invoice receivables",
            "Equipment Lease": "Forklift and forklift lease settlement",
            "Software SaaS": "Omni-Sense SaaS platform tier subscription",
            "Travel & Lodging": "Regional sales team flight reservation",
            "Marketing Ads": "Ad campaign budget billing cycle",
            "Legal Fees": "Advisory retainer fees for restructuring"
        }
        base_time = datetime(2026, 7, 12, 10, 0, 0)
        transactions_data = []
        for i in range(1, 56):
            cat = random.choice(categories)
            is_credit = cat in ["Salary Deposit", "Receivables Clearing"]
            type_str = "credit" if is_credit else "debit"
            amount = float(random.randint(1500, 75000)) if not is_credit else float(random.randint(120000, 350000))
            is_susp = 1 if (type_str == "debit" and amount > 60000 and random.random() < 0.15) else 0
            desc = descriptions[cat] + f" Ref-{12000+i}"
            if is_susp:
                desc = f"FLAGGED: Suspicious wire transaction to offshore entity Ref-{12000+i}"
            timestamp = (base_time - timedelta(hours=i * 2)).isoformat() + "Z"
            # Add security parameters to transactions
            transactions_data.append((
                cust_user_id, amount, type_str, cat, timestamp, is_susp, desc, "Mumbai-North",
                f"192.168.1.{10+i}", "19.0760,72.8777", f"DEV-987{i}", f"ACC-55443322{i}",
                is_susp, "PEP screened (clean)" if not is_susp else "AML Suspicion Triggered"
            ))

        cursor.executemany(
            """
            INSERT INTO transactions 
            (user_id, amount, type, category, timestamp, is_suspicious, description, branch_id, ip_address, location_coords, device_id, receiver_account, aml_flag, pep_screening_status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            transactions_data
        )
 
    cursor.execute("SELECT count(*) FROM loan_applications")
    if cursor.fetchone()[0] == 0:
        cursor.execute("SELECT id FROM customers WHERE user_id = (SELECT id FROM Users WHERE email = 'customer@omnisense.com')")
        cust_row = cursor.fetchone()
        cust_id = cust_row["id"] if cust_row else 1
        loan_apps = []
        purposes = ["Home Loan Expansion", "Working Capital Refinancing", "Bridge Loan", "Machinery Procurement", "Inventory Stockpile", "Export Pre-shipment Finance"]
        statuses = ["application", "doc_verification", "kyc", "risk", "fraud", "credit", "manager_review", "regional_review", "approved", "disbursed", "monitoring", "closure", "restructured"]
        names = ["Madhu Meeta", "Balaji Components", "Rohan Sharma", "Vikas Verma", "Deepa Nair", "Amit Patel", "Suresh Gupta", "Priyah Rao", "Ananya Sen", "Karan Malhotra"]
        repayment_history = [{"month": "2026-01", "emi": 850000.0, "status": "paid"}, {"month": "2026-02", "emi": 850000.0, "status": "paid"}, {"month": "2026-03", "emi": 850000.0, "status": "late"}]
        for i in range(1, 23):
            purpose = random.choice(purposes)
            status = random.choice(statuses)
            amount = float(random.randint(1000000, 50000000))
            term = random.choice([12, 24, 36, 48, 60, 120])
            created = (datetime.utcnow() - timedelta(days=i)).isoformat() + "Z"
            cust_name = "Madhu Meeta" if i == 1 else random.choice(names)
            loan_apps.append((
                cust_id if cust_name == "Madhu Meeta" else 1, 
                cust_name, 
                amount, 
                term, 
                purpose, 
                status, 
                created,
                6, # Assigned loan officer (loanofficer)
                f"SIG-HASH-XYZ-987{i}",
                json.dumps(repayment_history)
            ))
            
        cursor.executemany(
            """
            INSERT INTO loan_applications 
            (customer_id, customer_name, amount, term_months, purpose, status, created_at, assigned_officer_id, digital_signature_hash, repayment_history_json) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            loan_apps
        )

    cursor.execute("SELECT count(*) FROM support_tickets")
    if cursor.fetchone()[0] == 0:
        cursor.execute("SELECT id FROM customers WHERE user_id = (SELECT id FROM Users WHERE email = 'customer@omnisense.com')")
        cust_row = cursor.fetchone()
        cust_id = cust_row["id"] if cust_row else 1
        
        tickets = [
            (cust_id, "Madhu Meeta", "Mobile Banking Lockout", "Cannot login after entering OTP three times.", "open", "2026-07-12T08:30:00Z"),
            (cust_id, "Madhu Meeta", "Amortization Query", "Requesting soft copy of restructuring amortization plan.", "resolved", "2026-07-11T14:00:00Z")
        ]
        cursor.executemany(
            "INSERT INTO support_tickets (customer_id, customer_name, subject, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            tickets
        )
        
    cursor.execute("SELECT count(*) FROM audit_logs")
    if cursor.fetchone()[0] == 0:
        audit_data = []
        users_list = ["admin@omnisense.com", "loanofficer@omnisense.com", "finanalyst@omnisense.com", "fraudanalyst@omnisense.com", "customer@omnisense.com"]
        actions = [
            ("login", "Successful session login", "success"),
            ("apply_loan", "Submitted loan application #", "success"),
            ("update_loan_status", "Approved application #", "success"),
            ("view_audit_logs", "Accessed security system logs", "success"),
            ("export_data", "Exported tactical ledger to CSV", "success"),
            ("run_analysis", "Triggered Tri-Agent diagnostic scan", "success"),
            ("update_budget", "Modified customer budget cap", "success"),
            ("database_backup", "Triggered database backup snapshot", "success")
        ]
        base_time = datetime.utcnow()
        for i in range(1, 36):
            user = random.choice(users_list)
            action, detail_base, status = random.choice(actions)
            details = detail_base + str(random.randint(100, 999))
            ip = f"192.168.1.{random.randint(10, 254)}"
            timestamp = (base_time - timedelta(minutes=i * 35)).isoformat()
            audit_data.append((timestamp, user, action, details, ip, status))
            
        cursor.executemany(
            "INSERT INTO audit_logs (timestamp, username, action, details, ip_address, status) VALUES (?, ?, ?, ?, ?, ?)",
            audit_data
        )
        
    conn.commit()
    conn.close()
    print("[DATABASE] Database enterprise initialized successfully.")

def log_audit(username: str, action: str, details: str = None, ip_address: str = None, status: str = "success"):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO audit_logs (timestamp, username, action, details, ip_address, status) VALUES (?, ?, ?, ?, ?, ?)",
        (datetime.utcnow().isoformat(), username, action, details, ip_address, status)
    )
    conn.commit()
    conn.close()

def save_analysis(corporate_id: str, corporate_name: str, tier: str, default_probability: float, anomaly_detected: bool, agent_logs: list, shap_contributions: list):
    import json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO analysis_history 
        (corporate_id, corporate_name, timestamp, tier, default_probability, anomaly_detected, agent_logs, shap_contributions) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            corporate_id, 
            corporate_name, 
            datetime.utcnow().isoformat(), 
            tier, 
            default_probability, 
            1 if anomaly_detected else 0,
            json.dumps(agent_logs),
            json.dumps(shap_contributions)
        )
    )
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db(force=True)
