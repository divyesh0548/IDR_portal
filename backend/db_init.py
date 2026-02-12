"""
Database initialization script for Plaza Portal.
Creates the 'plaza_web' database using credentials from .env file.
Supports both PostgreSQL and MySQL.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def create_postgresql_database():
    """Create PostgreSQL database."""
    try:
        import psycopg2
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    except ImportError:
        print("Error: psycopg2 is not installed. Install it using: pip install psycopg2-binary")
        sys.exit(1)
    
    # Get database credentials from .env
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', '')
    db_name = os.getenv('DB_NAME', 'IDR')
    
    if not db_password:
        print("Warning: DB_PASSWORD not set in .env file")
    
    try:
        # Connect to PostgreSQL server (without specifying database)
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (db_name,)
        )
        exists = cursor.fetchone()
        
        if exists:
            print(f"Database '{db_name}' already exists.")
        else:
            # Create database
            cursor.execute(f'CREATE DATABASE "{db_name}"')
            print(f"Database '{db_name}' created successfully!")
        
        cursor.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"Error creating PostgreSQL database: {e}")
        sys.exit(1)


def get_db_connection():
    """Get database connection to plaza_web database with IST timezone."""
    try:
        import psycopg2
    except ImportError:
        print("Error: psycopg2 is not installed. Install it using: pip install psycopg2-binary")
        sys.exit(1)
    
    # Get database credentials from .env
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', '')
    db_name = os.getenv('DB_NAME', 'plaza_web')
    
    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password,
            database=db_name
        )
        # Set timezone to IST for this connection
        cursor = conn.cursor()
        cursor.execute("SET timezone = 'Asia/Kolkata'")
        cursor.close()
        return conn
    except psycopg2.Error as e:
        print(f"Error connecting to database: {e}")
        sys.exit(1)


def create_users_table():
    """Create users table with specified columns."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            )
        """)
        exists = cursor.fetchone()[0]
        
        if exists:
            print("Table 'users' already exists.")
            # Check if 'plaza_name' column exists and add it if it doesn't
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'users' 
                    AND column_name = 'plaza_name'
                )
            """)
            plaza_name_exists = cursor.fetchone()[0]
            
            if not plaza_name_exists:
                cursor.execute("ALTER TABLE users ADD COLUMN plaza_name VARCHAR(255)")
                print("Added column 'plaza_name' to users table.")
            
            conn.commit()
        else:
            # Create users table with IST timezone for created_at
            # Using TIMESTAMP WITHOUT TIME ZONE to store IST time directly
            cursor.execute("""
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    designation VARCHAR(255),
                    email_id VARCHAR(255) NOT NULL UNIQUE,
                    mob_no VARCHAR(20),
                    user_code VARCHAR(50),
                    role VARCHAR(50) NOT NULL,
                    temp_login BOOLEAN DEFAULT TRUE,
                    password VARCHAR(255) NOT NULL,
                    login_email_sent BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
                    plaza_name VARCHAR(255)
                )
            """)
            conn.commit()
            print("Table 'users' created successfully!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        conn.rollback()
        print(f"Error creating/altering users table: {e}")
        cursor.close()
        conn.close()
        sys.exit(1)


def create_idr_master_table():
    """Create IDR requests table with specified columns."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'idr_master'
            )
        """)
        exists = cursor.fetchone()[0]
        
        if exists:
            print("Table 'idr_master' already exists.")
            # Check if columns exist and add/remove them as needed
            
            # Check for 'email_sent' column
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'idr_master' 
                    AND column_name = 'email_sent'
                )
            """)
            email_sent_exists = cursor.fetchone()[0]
            
            if not email_sent_exists:
                cursor.execute("ALTER TABLE idr_master ADD COLUMN email_sent VARCHAR(50)")
                print("Added column 'email_sent' to idr_master table.")
            
            # Check for 'quarter' column and remove it if exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'idr_master' 
                    AND column_name = 'quarter'
                )
            """)
            quarter_exists = cursor.fetchone()[0]
            
            if quarter_exists:
                cursor.execute("ALTER TABLE idr_master DROP COLUMN quarter")
                print("Removed column 'quarter' from idr_master table.")
            
            # Check for 'from_date' column
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'idr_master' 
                    AND column_name = 'from_date'
                )
            """)
            from_date_exists = cursor.fetchone()[0]
            
            if not from_date_exists:
                cursor.execute("ALTER TABLE idr_master ADD COLUMN from_date DATE")
                print("Added column 'from_date' to idr_master table.")
            
            # Check for 'to_date' column
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'idr_master' 
                    AND column_name = 'to_date'
                )
            """)
            to_date_exists = cursor.fetchone()[0]
            
            if not to_date_exists:
                cursor.execute("ALTER TABLE idr_master ADD COLUMN to_date DATE")
                print("Added column 'to_date' to idr_master table.")
            
            # Check for 'document_url' column and remove it if exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'idr_master' 
                    AND column_name = 'document_url'
                )
            """)
            document_url_exists = cursor.fetchone()[0]
            
            if document_url_exists:
                cursor.execute("ALTER TABLE idr_master DROP COLUMN document_url")
                print("Removed column 'document_url' from idr_master table.")
            
            # Check for 'scope_name' column
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'idr_master' 
                    AND column_name = 'scope_name'
                )
            """)
            scope_name_exists = cursor.fetchone()[0]
            
            if not scope_name_exists:
                cursor.execute("ALTER TABLE idr_master ADD COLUMN scope_name VARCHAR(255)")
                print("Added column 'scope_name' to idr_master table.")
            
            # Check for 'status' column and rename it to 'done' if exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'idr_master' 
                    AND column_name = 'status'
                )
            """)
            status_exists = cursor.fetchone()[0]
            
            if status_exists:
                cursor.execute("ALTER TABLE idr_master RENAME COLUMN status TO done")
                print("Renamed column 'status' to 'done' in idr_master table.")
            
            # Check for 'done' column (in case status was already renamed or doesn't exist)
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'idr_master' 
                    AND column_name = 'done'
                )
            """)
            done_exists = cursor.fetchone()[0]
            
            if not done_exists and not status_exists:
                cursor.execute("ALTER TABLE idr_master ADD COLUMN done VARCHAR(50)")
                print("Added column 'done' to idr_master table.")
            
            # Check for 'reminder_email_datetime' column
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'idr_master' 
                    AND column_name = 'reminder_email_datetime'
                )
            """)
            reminder_email_datetime_exists = cursor.fetchone()[0]
            
            if not reminder_email_datetime_exists:
                cursor.execute("ALTER TABLE idr_master ADD COLUMN reminder_email_datetime TIMESTAMP WITHOUT TIME ZONE")
                print("Added column 'reminder_email_datetime' to idr_master table.")
            
            # Check for 'req_id' column
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'idr_master' 
                    AND column_name = 'req_id'
                )
            """)
            req_id_exists = cursor.fetchone()[0]
            
            if not req_id_exists:
                cursor.execute("ALTER TABLE idr_master ADD COLUMN req_id VARCHAR(255)")
                print("Added column 'req_id' to idr_master table.")
            
            conn.commit()
        else:
            # Create idr_master table with all nullable columns
            # Using TIMESTAMP WITHOUT TIME ZONE for datetime columns with IST timezone
            cursor.execute("""
                CREATE TABLE idr_master (
                    id SERIAL PRIMARY KEY,
                    plaza_name VARCHAR(255),
                    request_datetime TIMESTAMP WITHOUT TIME ZONE,
                    due_date DATE,
                    from_date DATE,
                    to_date DATE,
                    done VARCHAR(50),
                    email_sent VARCHAR(50),
                    scope_name VARCHAR(255),
                    reminder_email_datetime TIMESTAMP WITHOUT TIME ZONE,
                    req_id VARCHAR(255)
                )
            """)
            conn.commit()
            print("Table 'idr_master' created successfully!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        conn.rollback()
        print(f"Error creating/altering idr_master table: {e}")
        cursor.close()
        conn.close()
        sys.exit(1)


def create_scope_table():
    """Create scope table with specified columns."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'scope'
            )
        """)
        exists = cursor.fetchone()[0]
        
        if exists:
            print("Table 'scope' already exists.")
        else:
            # Create scope table with string columns
            cursor.execute("""
                CREATE TABLE scope (
                    id SERIAL PRIMARY KEY,
                    scope_name VARCHAR(255),
                    required_documents VARCHAR(255)
                )
            """)
            conn.commit()
            print("Table 'scope' created successfully!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        conn.rollback()
        print(f"Error creating scope table: {e}")
        cursor.close()
        conn.close()
        sys.exit(1)


def create_document_master_table():
    """Create document_master table with specified columns."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'document_master'
            )
        """)
        exists = cursor.fetchone()[0]
        
        if exists:
            print("Table 'document_master' already exists.")
            # Check for columns and add them if they don't exist
            # Check for 'req_id' column
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'document_master' 
                    AND column_name = 'req_id'
                )
            """)
            req_id_exists = cursor.fetchone()[0]
            
            if not req_id_exists:
                cursor.execute("ALTER TABLE document_master ADD COLUMN req_id VARCHAR(255)")
                print("Added column 'req_id' to document_master table.")
            
            # Check for 'document_type' column
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'document_master' 
                    AND column_name = 'document_type'
                )
            """)
            document_type_exists = cursor.fetchone()[0]
            
            if not document_type_exists:
                cursor.execute("ALTER TABLE document_master ADD COLUMN document_type VARCHAR(255)")
                print("Added column 'document_type' to document_master table.")
            
            # Check for 'document_url' column
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'document_master' 
                    AND column_name = 'document_url'
                )
            """)
            document_url_exists = cursor.fetchone()[0]
            
            if not document_url_exists:
                cursor.execute("ALTER TABLE document_master ADD COLUMN document_url VARCHAR(255)")
                print("Added column 'document_url' to document_master table.")
            
            # Check for 'modified_time' column
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'document_master' 
                    AND column_name = 'modified_time'
                )
            """)
            modified_time_exists = cursor.fetchone()[0]
            
            if not modified_time_exists:
                cursor.execute("ALTER TABLE document_master ADD COLUMN modified_time TIMESTAMP WITHOUT TIME ZONE")
                print("Added column 'modified_time' to document_master table.")
            
            # Check for 'year' column
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'document_master' 
                    AND column_name = 'year'
                )
            """)
            year_exists = cursor.fetchone()[0]
            
            if not year_exists:
                cursor.execute("ALTER TABLE document_master ADD COLUMN year VARCHAR(255)")
                print("Added column 'year' to document_master table.")
            
            # Check for 'month' column
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'document_master' 
                    AND column_name = 'month'
                )
            """)
            month_exists = cursor.fetchone()[0]
            
            if not month_exists:
                cursor.execute("ALTER TABLE document_master ADD COLUMN month VARCHAR(255)")
                print("Added column 'month' to document_master table.")
            
            # Check for 'is_rejected' column
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'document_master' 
                    AND column_name = 'is_rejected'
                )
            """)
            is_rejected_exists = cursor.fetchone()[0]
            
            if not is_rejected_exists:
                cursor.execute("ALTER TABLE document_master ADD COLUMN is_rejected BOOLEAN DEFAULT FALSE")
                print("Added column 'is_rejected' to document_master table.")
            
            # Check for 'reason' column
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'document_master' 
                    AND column_name = 'reason'
                )
            """)
            reason_exists = cursor.fetchone()[0]
            
            if not reason_exists:
                cursor.execute("ALTER TABLE document_master ADD COLUMN reason VARCHAR(255)")
                print("Added column 'reason' to document_master table.")
            
            conn.commit()
        else:
            # Create document_master table with specified columns
            # Using TIMESTAMP WITHOUT TIME ZONE for modified_time with IST timezone
            cursor.execute("""
                CREATE TABLE document_master (
                    id SERIAL PRIMARY KEY,
                    req_id VARCHAR(255),
                    document_type VARCHAR(255),
                    document_url VARCHAR(255),
                    modified_time TIMESTAMP WITHOUT TIME ZONE,
                    year VARCHAR(255),
                    month VARCHAR(255),
                    is_rejected BOOLEAN DEFAULT FALSE,
                    reason VARCHAR(255)
                )
            """)
            conn.commit()
            print("Table 'document_master' created successfully!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        conn.rollback()
        print(f"Error creating/altering document_master table: {e}")
        cursor.close()
        conn.close()
        sys.exit(1)


def add_user(name, email_id, password, role, designation=None, mob_no=None, user_code=None, temp_login=None):

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Validate required fields
        if not name or not email_id or not password or not role:
            raise ValueError("Name, email_id, password, and role are required fields")
        
        # Check if email already exists
        cursor.execute("SELECT id FROM users WHERE email_id = %s", (email_id,))
        if cursor.fetchone():
            raise ValueError(f"User with email '{email_id}' already exists")
        
        # Insert new user with IST timezone for created_at (password stored as plain text)
        cursor.execute("""
            INSERT INTO users (name, designation, email_id, mob_no, user_code, role, password, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, (NOW() AT TIME ZONE 'Asia/Kolkata'))
            RETURNING id
        """, (name, designation, email_id, mob_no, user_code, role, password))
        
        user_id = cursor.fetchone()[0]
        conn.commit()
        
        print(f"User '{name}' (ID: {user_id}) added successfully!")
        cursor.close()
        conn.close()
        
        return user_id
        
    except ValueError as e:
        conn.rollback()
        print(f"Validation error: {e}")
        cursor.close()
        conn.close()
        return None
    except Exception as e:
        conn.rollback()
        print(f"Error adding user: {e}")
        cursor.close()
        conn.close()
        return None


def main():
    """Main function to create database based on DB_TYPE."""
    db_type = os.getenv('DB_TYPE', 'postgresql').lower()
    
    if db_type == 'postgresql' or db_type == 'postgres':
        # create_postgresql_database()
        create_users_table()
        create_idr_master_table()
        create_scope_table()
        create_document_master_table()
    else:
        print(f"Error: Unsupported database type '{db_type}'. Supported types: postgresql")
        sys.exit(1)


if __name__ == '__main__':
    main()

